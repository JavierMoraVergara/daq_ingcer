# DAQ Ingcer

**Versión 1.2.0**

Software de escritorio para adquisición y visualización de datos de instrumentos de medición industriales mediante Modbus TCP/IP.

## Instrumentos Soportados

| Instrumento            | Tipo                       | Variables                    | Lectura                                             | Escritura          |
| ---------------------- | -------------------------- | ---------------------------- | --------------------------------------------------- | ------------------ |
| **ADAM 4118**          | Temperatura (termocuplas)  | 8 canales                    | Holding registers (0x03)                            | —                  |
| **Janitza UMG509-PRO** | Analizador de red          | V, C, P, F, FP, THD, Energía | Holding registers (0x03), float IEEE-754 big-endian | —                  |
| **Janitza UMG503**     | Analizador de red          | V, C, P, F, FP, THD          | Holding registers (0x03), float con byte/word swap  | —                  |
| **Metaltex MC62**      | Controlador de temperatura | PV, SV                       | Holding registers (0x03)                            | Set Value vía 0x06 |

Notas por instrumento:

- **ADAM 4118**: valor crudo uint16 (0–65535) escalado al rango de la termocupla seleccionada (J/K/T/E/R/S/B/N). Canal desconectado (raw ≥ 65500) → NULL.
- **UMG509 vs UMG503**: comparten las mismas variables pero distinto mapa de registros. El UMG503 transmite los floats con los 4 bytes en orden inverso (byte + word swap) y no expone energía.
- **Metaltex MC62**: PV (valor actual) y SV (consigna) como `20000 + (temp × 10)`. El SV se puede ajustar en vivo durante el ensayo (función Modbus 0x06 al registro 0). El equipo no confirma la escritura (timeout esperado) pero sí la ejecuta.

## Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS + Recharts + Zustand
- **Backend**: Tauri 2 (Rust) con tokio-modbus
- **Persistencia**: JSON + CSV locales (separador `;`)
- **Target**: Windows 10/11 (cross-compilado desde Ubuntu)

## Prerrequisitos

- Node.js 20+
- Rust (stable, 1.88+)
- cargo-tauri (`cargo install tauri-cli --version "^2" --locked`)
- Dependencias GTK: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev pkg-config libssl-dev`
- Para cross-compilación: `mingw-w64`, `nsis`, `rustup target add x86_64-pc-windows-gnu`

## Desarrollo Local

```bash
npm install
npm run tauri dev
```

## Build para Windows (.exe)

```bash
# Prerrequisitos (solo la primera vez)
sudo apt install mingw-w64 nsis
rustup target add x86_64-pc-windows-gnu

# Generar instalador
cargo tauri build --target x86_64-pc-windows-gnu
```

El instalador se genera en:

```
src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/DAQ Ingcer_1.2.0_x64-setup.exe
```

## Estructura de Datos en Runtime

Los datos se almacenan en:

- **Linux**: `~/.local/share/com.ingcer.daq/datos/`
- **Windows**: `%APPDATA%\com.ingcer.daq\datos\`

```
datos/
├── instrumentos.json       # Instrumentos registrados
├── esquemas.json           # Configuraciones de adquisición
├── registro_ensayos.json   # Metadatos de ensayos
├── contadores.json         # IDs autoincrementales persistentes
└── ensayos/
    ├── ENS_20260706_120000_ensayo1.csv
    └── ...
```

## Tests

```bash
# Frontend
npm run test

# Backend (Rust)
cd src-tauri && cargo test
```

## Notas

- El CSV usa `;` como separador de campos (compatible con Excel en configuración regional español)
- Los IDs nunca se reinician aunque se borren entidades
- Los valores de energía (Wh) se registran con tara (primer valor = 0)
- Canales ADAM desconectados (raw ≥ 65500) se registran como NULL
- **Resolución del CSV**: temperatura (ADAM, MC62) con 1 decimal; variables eléctricas (Janitza) con 4 decimales para corrientes en el orden de los miliamperes
- Durante la captura en vivo, el gráfico muestra el total de datos y crece automáticamente; el usuario puede acotar el rango con el control de cotas y volver al total con "Resetear"
- La prueba de conexión diferencia entre alcance al gateway y respuesta del esclavo; el registro consultado se adapta al instrumento (ADAM/UMG509: reg 0, UMG503: reg 1012, MC62: reg 64)

## Historial de Versiones

- **1.2.0**: Soporte para Janitza UMG503 y controlador Metaltex MC62 (con ajuste de Set Value en vivo). Prueba de conexión diferenciada gateway/esclavo. Resolución de CSV por tipo de variable. Mejora del control de cotas durante la captura.
- **0.1.x**: Versión inicial con ADAM 4118 y Janitza UMG509-PRO.
