import { useState } from "react";
import type { TipoInstrumento, TipoTermocupla } from "../../types";
import { tauriCmd, type ProbarConexionResult } from "../../lib/tauriCommands";
import adamImg from "../../assets/images/adam.png";
import janitzaImg from "../../assets/images/janitza.png";
import metaltexImg from "../../assets/images/md62.png";

const ADAM_CANALES = [1, 2, 3, 4, 5, 6, 7, 8];

export interface InstrumentoConfig {
  tipo: TipoInstrumento;
  nombre: string;
  direccion_ip: string;
  puerto: number;
  slave_id: number;
  canales: (number | string)[];
  tipo_termocupla: TipoTermocupla | null;
}

interface SelectorInstrumentosProps {
  instrumentos: InstrumentoConfig[];
  onChange: (instrumentos: InstrumentoConfig[]) => void;
}

export function SelectorInstrumentos({
  instrumentos,
  onChange,
}: SelectorInstrumentosProps) {
  const [testResults, setTestResults] = useState<
    Record<number, ProbarConexionResult | null>
  >({});
  // Valor de SV a escribir por instrumento Metaltex (por índice)
  const [svInputs, setSvInputs] = useState<Record<number, string>>({});
  const [svStatus, setSvStatus] = useState<Record<number, string>>({});

  const esMetaltex = (tipo: TipoInstrumento) => tipo === "METALTEX_MC62";

  const escribirSv = async (index: number) => {
    const inst = instrumentos[index];
    const valor = parseFloat(svInputs[index] ?? "");
    if (Number.isNaN(valor)) {
      setSvStatus({ ...svStatus, [index]: "Valor inválido" });
      return;
    }
    setSvStatus({ ...svStatus, [index]: "Enviando..." });
    try {
      await tauriCmd.escribirSvMetaltex(
        inst.direccion_ip,
        inst.puerto,
        inst.slave_id,
        2000,
        valor,
      );
      setSvStatus({ ...svStatus, [index]: `SV = ${valor} °C enviado ✓` });
    } catch (e) {
      setSvStatus({ ...svStatus, [index]: `Error: ${String(e)}` });
    }
  };

  const addInstrumento = (tipo: TipoInstrumento) => {
    const nuevo: InstrumentoConfig = {
      tipo,
      nombre: "",
      direccion_ip: "",
      puerto: 502,
      slave_id: 1,
      canales: [],
      tipo_termocupla: tipo === "ADAM4118" ? "T" : null,
    };
    onChange([...instrumentos, nuevo]);
  };

  const updateInstrumento = (
    index: number,
    updates: Partial<InstrumentoConfig>,
  ) => {
    const copy = [...instrumentos];
    copy[index] = { ...copy[index], ...updates };
    onChange(copy);
  };

  const removeInstrumento = (index: number) => {
    onChange(instrumentos.filter((_, i) => i !== index));
  };

  const toggleCanal = (index: number, canal: number | string) => {
    const inst = instrumentos[index];
    const canales = inst.canales.includes(canal)
      ? inst.canales.filter((c) => c !== canal)
      : [...inst.canales, canal];
    updateInstrumento(index, { canales });
  };

  const probarConexion = async (index: number) => {
    const inst = instrumentos[index];
    try {
      // Registro de prueba según el equipo:
      // - UMG503: 1012 (V1), no tiene registro 0
      // - Metaltex MC62: 64 (PV)
      // - Resto (ADAM, UMG509): registro 0
      const registroPrueba =
        inst.tipo === "JANITZA_UMG503"
          ? 1012
          : inst.tipo === "METALTEX_MC62"
            ? 64
            : 0;
      const result = await tauriCmd.probarConexion(
        inst.direccion_ip,
        inst.puerto,
        inst.slave_id,
        2000,
        registroPrueba,
      );
      setTestResults({ ...testResults, [index]: result });
    } catch {
      setTestResults({
        ...testResults,
        [index]: { gateway_ok: false, esclavo_ok: false },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addInstrumento("ADAM4118")}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          + ADAM4118
        </button>
        <button
          type="button"
          onClick={() => addInstrumento("JANITZA_UMG509")}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + Janitza UMG509
        </button>
        <button
          type="button"
          onClick={() => addInstrumento("JANITZA_UMG503")}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + Janitza UMG503
        </button>
        <button
          type="button"
          onClick={() => addInstrumento("METALTEX_MC62")}
          className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          + Metaltex MC62
        </button>
      </div>

      {instrumentos.map((inst, idx) => (
        <div key={idx} className="border border-gray-200 rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={
                  inst.tipo === "ADAM4118"
                    ? adamImg
                    : inst.tipo === "METALTEX_MC62"
                      ? metaltexImg
                      : janitzaImg
                }
                alt={inst.tipo}
                className="h-12 w-auto object-contain rounded border border-gray-200 p-1 bg-white"
              />
              <span className="text-sm font-medium text-gray-700">
                {inst.tipo === "ADAM4118"
                  ? "ADAM4118"
                  : inst.tipo === "JANITZA_UMG503"
                    ? "Janitza UMG503"
                    : inst.tipo === "METALTEX_MC62"
                      ? "Metaltex MC62"
                      : "Janitza UMG509"}{" "}
                #{idx + 1}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeInstrumento(idx)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Eliminar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Nombre"
              value={inst.nombre}
              onChange={(e) =>
                updateInstrumento(idx, { nombre: e.target.value })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              placeholder="IP (ej: 192.168.1.10)"
              value={inst.direccion_ip}
              onChange={(e) =>
                updateInstrumento(idx, { direccion_ip: e.target.value })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Puerto"
              value={inst.puerto}
              onChange={(e) =>
                updateInstrumento(idx, { puerto: Number(e.target.value) })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Slave ID"
              value={inst.slave_id}
              onChange={(e) =>
                updateInstrumento(idx, { slave_id: Number(e.target.value) })
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Canales:</p>
            {inst.tipo === "ADAM4118" ? (
              <div className="grid grid-cols-4 gap-2">
                {ADAM_CANALES.map((canal) => (
                  <label
                    key={canal}
                    className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={inst.canales.includes(canal)}
                      onChange={() => toggleCanal(idx, canal)}
                      className="rounded"
                    />
                    Canal {canal}
                  </label>
                ))}
              </div>
            ) : esMetaltex(inst.tipo) ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "pv", label: "PV (lectura)" },
                  { key: "sv", label: "SV (consigna)" },
                ].map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={inst.canales.includes(c.key)}
                      onChange={() => toggleCanal(idx, c.key)}
                      className="rounded"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Voltaje</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["v1", "v2", "v3"].map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inst.canales.includes(v)}
                          onChange={() => toggleCanal(idx, v)}
                          className="rounded"
                        />
                        {v.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Corriente</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["c1", "c2", "c3"].map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inst.canales.includes(v)}
                          onChange={() => toggleCanal(idx, v)}
                          className="rounded"
                        />
                        {v.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Potencia</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["p1", "p2", "p3"].map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inst.canales.includes(v)}
                          onChange={() => toggleCanal(idx, v)}
                          className="rounded"
                        />
                        {v.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
                {inst.tipo !== "JANITZA_UMG503" && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Energía</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["e1", "e2", "e3"].map((v) => (
                        <label
                          key={v}
                          className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={inst.canales.includes(v)}
                            onChange={() => toggleCanal(idx, v)}
                            className="rounded"
                          />
                          {v.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Factor de Potencia
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {["fp1", "fp2", "fp3"].map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inst.canales.includes(v)}
                          onChange={() => toggleCanal(idx, v)}
                          className="rounded"
                        />
                        {v.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Otros</p>
                  <div className="grid grid-cols-4 gap-2">
                    {["f", "thd1", "thd2", "thd3"].map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-2 text-sm px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={inst.canales.includes(v)}
                          onChange={() => toggleCanal(idx, v)}
                          className="rounded"
                        />
                        {v.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {inst.tipo === "ADAM4118" && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Tipo Termocupla:
              </p>
              <select
                value={inst.tipo_termocupla || "T"}
                onChange={(e) =>
                  updateInstrumento(idx, {
                    tipo_termocupla: e.target.value as TipoTermocupla,
                  })
                }
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="J">Tipo J (0~760°C)</option>
                <option value="K">Tipo K (0~1370°C)</option>
                <option value="T">Tipo T (-100~400°C)</option>
                <option value="E">Tipo E (0~1000°C)</option>
                <option value="R">Tipo R (500~1750°C)</option>
                <option value="S">Tipo S (500~1750°C)</option>
                <option value="B">Tipo B (500~1800°C)</option>
                <option value="N">Tipo N (-200~1300°C)</option>
              </select>
            </div>
          )}

          {esMetaltex(inst.tipo) && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Cambiar Set Value (SV):
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Temp. °C"
                  value={svInputs[idx] ?? ""}
                  onChange={(e) =>
                    setSvInputs({ ...svInputs, [idx]: e.target.value })
                  }
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-28"
                />
                <button
                  type="button"
                  onClick={() => escribirSv(idx)}
                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Enviar SV
                </button>
                {svStatus[idx] && (
                  <span className="text-xs text-gray-600">{svStatus[idx]}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => probarConexion(idx)}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Probar Conexión
            </button>
            {testResults[idx] !== undefined && testResults[idx] !== null && (
              <div className="flex flex-col gap-0.5 text-xs">
                <span
                  className={
                    testResults[idx]!.gateway_ok
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {testResults[idx]!.gateway_ok ? "✓" : "✗"} Gateway
                </span>
                <span
                  className={
                    testResults[idx]!.esclavo_ok
                      ? "text-green-600"
                      : testResults[idx]!.gateway_ok
                        ? "text-orange-500"
                        : "text-gray-400"
                  }
                >
                  {testResults[idx]!.esclavo_ok ? "✓" : "✗"} Esclavo
                  {!testResults[idx]!.esclavo_ok &&
                    testResults[idx]!.gateway_ok &&
                    " (sin respuesta)"}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
