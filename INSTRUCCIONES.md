# Instrucciones de Instalación y Ejecución — DAQ Ingcer

## Descripción

Software de escritorio para adquisición de datos de instrumentos ADAM 4118 (temperatura) y Janitza UMG509-PRO (variables eléctricas) vía Modbus TCP/IP. Interfaz React + Tauri, ejecutable como `.exe` en Windows.

---

## 1. Prerrequisitos del Sistema

### Ubuntu (desarrollo)

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Rust (1.88+)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Dependencias del sistema para Tauri
sudo apt install -y \
  pkg-config \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# CLI de Tauri
cargo install tauri-cli --version "^2" --locked

# Cross-compilación a Windows
sudo apt install -y mingw-w64 nsis
rustup target add x86_64-pc-windows-gnu
```

### Docker (alternativa con contenedores — solo para frontend)

```bash
# Solo UI sin Tauri
docker compose up
# Abrir http://localhost:1420
```

Nota: Tauri requiere ventana nativa, por lo que el desarrollo completo se hace local con `npm run tauri dev`.

---

## 2. Instalación del Proyecto

```bash
cd daq_ingcer

# Instalar dependencias de Node.js
npm install

# Verificar que Rust compila
cd src-tauri
cargo check
cd ..
```

---

## 3. Ejecución en Desarrollo

### Opción A: Local (recomendado)

```bash
cd daq_ingcer
npm run tauri dev
```

Esto levanta:

- Servidor Vite en `http://localhost:1420` (hot-reload del frontend)
- Backend Rust con Tauri (se recompila al detectar cambios en `src-tauri/src/`)
- La ventana de escritorio se abre automáticamente

### Opción B: Con Docker (contenedor)

```bash
cd daq_ingcer
docker compose up --build
```

Nota: El modo Docker requiere acceso al display del host para mostrar la ventana GTK. Configurar `DISPLAY` en el `docker-compose.yml` y usar `network_mode: host`.

---

## 4. Estructura del Proyecto

```
daq_ingcer/
├── src/                    # Frontend React + TypeScript
│   ├── components/         # Componentes UI (esquemas, ensayo, gráficos)
│   ├── hooks/              # Custom hooks (useNuevaLectura, useEstadisticas)
│   ├── lib/                # Lógica pura (tauriCommands, estadisticas, csvParser)
│   ├── store/              # Estado global Zustand
│   ├── types/              # Tipos TypeScript
│   └── views/              # Vistas principales
├── src-tauri/              # Backend Rust (Tauri)
│   └── src/
│       ├── commands/       # IPC commands (instrumentos, esquemas, ensayos, adquisicion)
│       ├── modbus/         # Comunicación Modbus TCP (ADAM, Janitza)
│       ├── persistence/    # JSON store atómico, CSV writer, recovery
│       ├── polling/        # Loop de adquisición equiespaciado
│       └── types/          # Structs Rust
├── Dockerfile              # Imagen de desarrollo
├── docker-compose.yml      # Orquestación contenedor
└── package.json            # Dependencias frontend
```

---

## 5. Build para Producción (Windows .exe)

### Desde Ubuntu:

```bash
cd daq_ingcer

# Build completo para Windows
cargo tauri build --target x86_64-pc-windows-gnu
```

El instalador se genera en:

```
src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/DAQ Ingcer_0.1.0_x64-setup.exe
```

### Instalar en Windows:

1. Copiar el `.exe` generado al equipo Windows
2. Ejecutar el instalador (no requiere permisos de administrador)
3. El software se instala y crea acceso directo en el escritorio
4. Los datos se guardan en `%APPDATA%\com.ingcer.daq\datos\`

---

## 6. Uso del Software

### Flujo principal:

1. **Crear instrumentos**: Registrar los ADAM 4118 y Janitza con IP, puerto, slave ID
2. **Crear esquema**: Seleccionar instrumentos y canales a monitorear
3. **Crear ensayo**: Basado en un esquema, configurar intervalo y aliases
4. **Ejecutar adquisición**: El sistema lee los instrumentos en intervalos equiespaciados
5. **Visualizar**: Gráficos en tiempo real + valores instantáneos + estadísticas
6. **Finalizar y exportar**: Detener el ensayo y descargar CSV

### Archivos de datos:

| Archivo                 | Contenido                                    |
| ----------------------- | -------------------------------------------- |
| `instrumentos.json`     | Lista de instrumentos registrados            |
| `esquemas.json`         | Configuraciones de adquisición reutilizables |
| `registro_ensayos.json` | Metadatos de todos los ensayos               |
| `ensayos/ENS_*.csv`     | Datos crudos de cada ensayo                  |

---

## 7. Comandos Útiles

```bash
# Desarrollo frontend (solo UI sin Tauri)
npm run dev

# Build frontend (sin Tauri)
npm run build

# Tests TypeScript
npm run test

# Tests Rust
cd src-tauri && cargo test

# Verificar TypeScript sin compilar
npx tsc --noEmit

# Build Rust solo (sin frontend)
cd src-tauri && cargo build

# Limpiar builds
cd src-tauri && cargo clean
rm -rf dist node_modules
```

---

## 8. Solución de Problemas

### Error: "webkit2gtk-4.1 not found"

```bash
sudo apt install libwebkit2gtk-4.1-dev
```

### Error: "linker x86_64-w64-mingw32-gcc not found"

```bash
sudo apt install mingw-w64
```

### La app no muestra ventana con Docker

Asegurarse de que `DISPLAY` está configurado y `network_mode: host` está activo en `docker-compose.yml`.

### Ensayos quedan en estado "ejecutando" tras un crash

El software detecta automáticamente ensayos colgados al reiniciar y los marca como "error". Los datos parciales del CSV siguen disponibles.

### Error "JSON corrupto"

Los archivos JSON nunca se sobreescriben directamente. Si aparece este error, el archivo puede haberse dañado manualmente. Verificar la integridad del archivo y corregir la estructura JSON.

---

## 9. Protocolo Modbus — Referencia rápida

### ADAM 4118 (Temperatura)

- Puerto TCP: 502 (por defecto)
- Registros: Canal 1 → 0, Canal 2 → 1, ..., Canal 8 → 7
- Tipo: uint16 (0–65535)
- Fórmula: `°C = (raw / 65535) × 500 - 100`

### Janitza UMG509-PRO (Eléctrico)

- Puerto TCP: 502 (por defecto)
- Cada variable = 2 registros (float32 IEEE 754 big-endian)
- Voltaje L1: reg 19000, L2: 19002, L3: 19004
- Corriente L1: reg 19012, L2: 19014, L3: 19016
- Potencia L1: reg 19020, L2: 19022, L3: 19024
- Frecuencia: reg 19050
- Energía L1: 19054, L2: 19056, L3: 19058
- Factor potencia: 19044, 19046, 19048
- THD: 19110, 19112, 19114
