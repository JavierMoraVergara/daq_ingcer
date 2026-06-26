import { useState } from "react";
import { useEsquemasStore } from "../store/useEsquemasStore";
import { useEnsayoStore } from "../store/useEnsayoStore";
import { useUiStore } from "../store/useUiStore";
import { EsquemaCard } from "../components/esquemas/EsquemaCard";
import { CrearEsquemaModal } from "../components/esquemas/CrearEsquemaModal";
import { EditarEsquemaModal } from "../components/esquemas/EditarEsquemaModal";
import { CrearEnsayoModal } from "../components/ensayo/CrearEnsayoModal";
import { ConfirmModal } from "../components/shared/ConfirmModal";
import type { Esquema } from "../types";

export function EsquemasView() {
  const esquemas = useEsquemasStore((s) => s.esquemas);
  const deshabilitarEsquema = useEsquemasStore((s) => s.deshabilitarEsquema);
  const ensayos = useEnsayoStore((s) => s.ensayos);
  const modalAbierto = useUiStore((s) => s.modalAbierto);
  const abrirModal = useUiStore((s) => s.abrirModal);
  const cerrarModal = useUiStore((s) => s.cerrarModal);

  const [esquemaParaEnsayo, setEsquemaParaEnsayo] = useState<Esquema | null>(
    null,
  );
  const [esquemaParaDeshabilitar, setEsquemaParaDeshabilitar] =
    useState<Esquema | null>(null);
  const [esquemaParaEditar, setEsquemaParaEditar] = useState<Esquema | null>(
    null,
  );

  const esquemasFiltrados = esquemas.filter((e) => e.vigente);

  const handleCrearEnsayo = (esquema: Esquema) => {
    setEsquemaParaEnsayo(esquema);
    abrirModal("crearEnsayo");
  };

  const handleEditar = (esquema: Esquema) => {
    setEsquemaParaEditar(esquema);
    abrirModal("editarEsquema");
  };

  const handleDeshabilitar = (esquema: Esquema) => {
    const ensayoActivo = ensayos.find(
      (e) => e.esquema_id === esquema.id && e.estado === "ejecutando",
    );
    if (ensayoActivo) {
      setEsquemaParaDeshabilitar(esquema);
      abrirModal("confirmarDeshabilitar");
    } else {
      deshabilitarEsquema(esquema.id);
    }
  };

  const confirmarDeshabilitar = async () => {
    if (esquemaParaDeshabilitar) {
      await deshabilitarEsquema(esquemaParaDeshabilitar.id);
      setEsquemaParaDeshabilitar(null);
      cerrarModal();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Esquemas</h1>
        <button
          type="button"
          onClick={() => abrirModal("crearEsquema")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Nuevo Esquema
        </button>
      </div>

      {esquemasFiltrados.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No hay esquemas vigentes. Cree uno nuevo para comenzar.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {esquemasFiltrados.map((esquema) => (
            <EsquemaCard
              key={esquema.id}
              esquema={esquema}
              onCrearEnsayo={handleCrearEnsayo}
              onEditar={() => handleEditar(esquema)}
              onDeshabilitar={handleDeshabilitar}
            />
          ))}
        </div>
      )}

      {modalAbierto === "crearEsquema" && <CrearEsquemaModal />}
      {modalAbierto === "editarEsquema" && esquemaParaEditar && (
        <EditarEsquemaModal
          esquema={esquemaParaEditar}
          onClose={() => {
            setEsquemaParaEditar(null);
            cerrarModal();
          }}
        />
      )}
      {modalAbierto === "crearEnsayo" && esquemaParaEnsayo && (
        <CrearEnsayoModal esquema={esquemaParaEnsayo} />
      )}
      {modalAbierto === "confirmarDeshabilitar" && esquemaParaDeshabilitar && (
        <ConfirmModal
          title="Deshabilitar esquema"
          message={`El esquema "${esquemaParaDeshabilitar.nombre}" tiene un ensayo en ejecución. ¿Desea deshabilitarlo de todas formas?`}
          onConfirm={confirmarDeshabilitar}
          onCancel={() => {
            setEsquemaParaDeshabilitar(null);
            cerrarModal();
          }}
        />
      )}
    </div>
  );
}
