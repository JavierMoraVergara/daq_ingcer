# DAQ Ingcer

Software de escritorio para adquisición y visualización de datos de instrumentos de medición industriales (ADAM 4118 y Janitza UMG509-PRO) mediante Modbus TCP/IP.

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
src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/DAQ Ingcer_0.1.0_x64-setup.exe
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
