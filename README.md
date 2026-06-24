# DAQ Ingcer

Software de escritorio para adquisición y visualización de datos de instrumentos de medición industriales (ADAM 4118 y Janitza UMG509-PRO) mediante Modbus TCP/IP.

## Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS + Recharts + Zustand
- **Backend**: Tauri 2 (Rust) con tokio-modbus
- **Persistencia**: JSON + CSV locales
- **Target**: Windows 10/11 (cross-compilado desde Ubuntu)

## Prerrequisitos

- Node.js 20+
- Rust (stable, 1.70+)
- cargo-tauri (`cargo install tauri-cli --version "^2"`)
- mingw-w64 (para cross-compilación a Windows)
- Dependencias GTK: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

## Desarrollo Local

```bash
npm install
npm run tauri dev
```

## Desarrollo con Docker

```bash
docker compose up --build
```

## Cross-compilación a Windows

```bash
rustup target add x86_64-pc-windows-gnu
cargo tauri build --target x86_64-pc-windows-gnu
```

El instalador `.exe` se genera en `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/`.

## Estructura de Datos en Runtime

Los datos se almacenan en `AppData\Roaming\com.ingcer.daq\datos\`:

```
datos/
├── instrumentos.json
├── esquemas.json
├── registro_ensayos.json
└── ensayos/
    ├── ENS_20240101_120000_ensayo1.csv
    └── ...
```

## Tests

```bash
# Frontend
npm run test

# Backend (Rust)
cd src-tauri && cargo test
```
