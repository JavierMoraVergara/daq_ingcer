# Guía de Desarrollo — DAQ Ingcer

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                       │
│  src/views/          → Vistas principales                │
│  src/components/     → Componentes UI                    │
│  src/store/          → Estado global (Zustand)           │
│  src/hooks/          → Hooks personalizados              │
│  src/lib/            → Lógica pura + wrappers Tauri      │
│  src/types/          → Interfaces TypeScript             │
└───────────────────────────┬─────────────────────────────┘
                            │ invoke() / emit()
┌───────────────────────────┴─────────────────────────────┐
│                    BACKEND (Rust/Tauri)                   │
│  src/commands/       → IPC handlers (API del frontend)   │
│  src/modbus/         → Comunicación con instrumentos     │
│  src/polling/        → Loop de adquisición               │
│  src/persistence/    → Lectura/escritura JSON + CSV      │
│  src/types/          → Structs compartidos               │
└─────────────────────────────────────────────────────────┘
```

## Flujo de Datos

```
Instrumento (Modbus TCP)
    → modbus/client.rs (conexión TCP)
    → modbus/adam.rs o modbus/janitza.rs (lectura + conversión)
    → polling/polling_loop.rs (orquestación, tara, ciclos)
    → persistence/csv_writer.rs (escritura a disco)
    → Tauri emit "nueva_lectura" → Frontend (gráficos, panel)
```

---

## Cómo Agregar un Nuevo Instrumento

### Paso 1: Definir el tipo en Rust

**Archivo**: `src-tauri/src/types/instrumento.rs`

Agregar al enum `TipoInstrumento`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TipoInstrumento {
    Adam4118,
    #[serde(rename = "JANITZA_UMG509")]
    JanitzaUmg509,
    #[serde(rename = "MI_NUEVO_INSTRUMENTO")]  // ← AGREGAR
    MiNuevoInstrumento,
}
```

### Paso 2: Crear el módulo de lectura Modbus

**Crear archivo**: `src-tauri/src/modbus/mi_instrumento.rs`

Usar como referencia `adam.rs` o `janitza.rs`. El módulo debe:

1. Definir las direcciones de registros Modbus del instrumento
2. Implementar la función de conversión de datos crudos a valores físicos
3. Implementar la función de lectura con reintentos

```rust
use crate::modbus::client::ModbusTcpClient;
use std::time::Duration;
use tokio::time::sleep;

// Definir registros del instrumento
const REGISTRO_VARIABLE_1: u16 = 100;  // Dirección Modbus
const REGISTRO_VARIABLE_2: u16 = 102;

// Función de conversión
pub fn convertir_raw_a_valor(raw: u16) -> f64 {
    // Tu fórmula de conversión aquí
    raw as f64 * 0.1
}

// Función de lectura
pub async fn leer_mi_instrumento(
    client: &mut ModbusTcpClient,
    slave_id: u8,
    variables: &[u16],  // Registros a leer
    reintentos: u8,
    timeout_ms: u64,
) -> Vec<Option<f64>> {
    let mut resultados = Vec::with_capacity(variables.len());

    for &registro in variables {
        let mut valor: Option<f64> = None;

        for _intento in 0..=reintentos {
            match client
                .leer_holding_registers_slave(slave_id, registro, 1, timeout_ms)
                .await
            {
                Ok(regs) if !regs.is_empty() => {
                    valor = Some(convertir_raw_a_valor(regs[0]));
                    break;
                }
                _ => {
                    sleep(Duration::from_millis(100)).await;
                }
            }
        }

        resultados.push(valor);
    }

    resultados
}
```

### Paso 3: Registrar el módulo

**Archivo**: `src-tauri/src/modbus/mod.rs`

```rust
pub mod client;
pub mod adam;
pub mod janitza;
pub mod mi_instrumento;  // ← AGREGAR
```

### Paso 4: Integrar en el Polling Loop

**Archivo**: `src-tauri/src/polling/polling_loop.rs`

En la función `leer_todos_instrumentos`, agregar un bloque similar al de ADAM o Janitza pero para el nuevo instrumento. Seguir el mismo patrón:

1. Iterar sobre los instrumentos del esquema
2. Buscar la configuración del instrumento
3. Conectar y leer
4. Mapear resultados a `ValorCanal`

### Paso 5: Actualizar el esquema

**Archivo**: `src-tauri/src/types/esquema.rs`

Agregar campos para el nuevo instrumento:

```rust
pub cant_mi_instrumento: usize,
pub instrumentos_mi_instrumento: Vec<u32>,
pub canales_mi_instrumento: HashMap<String, Vec<String>>,
```

### Paso 6: Actualizar el frontend

**Archivos a modificar**:

1. `src/types/instrumento.ts` — Agregar al type `TipoInstrumento`
2. `src/types/esquema.ts` — Agregar campos del nuevo instrumento
3. `src/components/esquemas/SelectorInstrumentos.tsx` — Agregar botón + selector de canales
4. `src/components/esquemas/CrearEsquemaModal.tsx` — Incluir en la lógica de guardado
5. `src/components/graficos/GraficoElectrico.tsx` — Si tiene variables eléctricas, agregar tabs

### Paso 7: Actualizar cabeceras CSV

**Archivo**: `src-tauri/src/persistence/csv_writer.rs`

En `generar_cabeceras`, agregar la iteración para las columnas del nuevo instrumento.

---

## Referencia Rápida: Archivos Clave

| Propósito                   | Archivo                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| Tipo de instrumento (Rust)  | `src-tauri/src/types/instrumento.rs`                              |
| Lectura Modbus ADAM         | `src-tauri/src/modbus/adam.rs`                                    |
| Lectura Modbus Janitza      | `src-tauri/src/modbus/janitza.rs`                                 |
| Loop de adquisición         | `src-tauri/src/polling/polling_loop.rs`                           |
| Escritura CSV               | `src-tauri/src/persistence/csv_writer.rs`                         |
| Cabeceras CSV               | `src-tauri/src/persistence/csv_writer.rs` → `generar_cabeceras()` |
| Commands IPC                | `src-tauri/src/commands/*.rs`                                     |
| Tipos TypeScript            | `src/types/*.ts`                                                  |
| Selector de instrumentos UI | `src/components/esquemas/SelectorInstrumentos.tsx`                |
| Panel instantáneo           | `src/components/ensayo/PanelInstantaneo.tsx`                      |
| Gráficos                    | `src/components/graficos/*.tsx`                                   |
| Store de ensayos            | `src/store/useEnsayoStore.ts`                                     |
| Wrappers Tauri              | `src/lib/tauriCommands.ts`                                        |

---

## Protocolo Modbus — Referencia

### Tipos de dato comunes

| Tipo                          | Registros   | Conversión                                     |
| ----------------------------- | ----------- | ---------------------------------------------- |
| uint16                        | 1 registro  | Escalar con fórmula lineal                     |
| float32 (IEEE 754 big-endian) | 2 registros | `f32::from_be_bytes([h_hi, h_lo, l_hi, l_lo])` |
| int32 (signed)                | 2 registros | Concatenar y cast a i32                        |
| uint32                        | 2 registros | Concatenar como u32                            |

### Lectura con tokio-modbus

```rust
// Leer 1 registro (uint16)
let regs = client.leer_holding_registers_slave(slave_id, address, 1, timeout).await?;
let value = regs[0]; // u16

// Leer 2 registros (float32)
let regs = client.leer_holding_registers_slave(slave_id, address, 2, timeout).await?;
let bytes: [u8; 4] = [
    (regs[0] >> 8) as u8, (regs[0] & 0xFF) as u8,
    (regs[1] >> 8) as u8, (regs[1] & 0xFF) as u8,
];
let value = f32::from_be_bytes(bytes);
```

### Para investigar un instrumento nuevo

1. Consultar el manual Modbus del instrumento
2. Identificar: direcciones de registros, tipo de dato, unidades, slave ID por defecto
3. Verificar con un software como **Modbus Poll** o **pymodbus** antes de codificar

---

## Roadmap de Estudio

### Nivel 1: Entender el flujo actual

- [ ] Leer `src-tauri/src/modbus/adam.rs` completo (50 líneas)
- [ ] Leer `src-tauri/src/modbus/janitza.rs` completo (120 líneas)
- [ ] Leer `src-tauri/src/polling/polling_loop.rs` función `leer_todos_instrumentos`
- [ ] Entender cómo `csv_writer.rs` genera cabeceras y escribe filas

### Nivel 2: Modificar un instrumento existente

- [ ] Agregar una nueva variable a Janitza (si tu modelo la soporta)
- [ ] Cambiar la fórmula de conversión de un ADAM
- [ ] Agregar un nuevo tipo de termocupla

### Nivel 3: Agregar un instrumento nuevo

- [ ] Crear `src-tauri/src/modbus/mi_instrumento.rs`
- [ ] Registrarlo en `mod.rs`
- [ ] Agregar al `polling_loop.rs`
- [ ] Actualizar tipos Rust y TypeScript
- [ ] Actualizar la UI (selector + gráficos)
- [ ] Probar con el instrumento real

### Nivel 4: Funcionalidades avanzadas

- [ ] Agregar lectura en paralelo (tokio::join!) para múltiples instrumentos
- [ ] Implementar pool de conexiones Modbus
- [ ] Agregar soporte para Modbus RTU (serial) además de TCP
- [ ] Implementar alarmas configurables por canal

---

## Tips de Desarrollo

1. **Probar lecturas Modbus** antes de integrar — usa `cargo test` con un mock o conecta el instrumento real y haz una lectura simple

2. **El slave_id se pasa por lectura** — no por conexión. Esto permite leer múltiples slaves desde un solo gateway (MGate)

3. **Los canales desconectados** devuelven raw ≥ 65500 → se filtran como NULL

4. **La tara de energía** se aplica en el polling loop — el primer valor no-null se resta de todos los siguientes

5. **Hot-reload**: El frontend se actualiza automáticamente con `npm run tauri dev`. Los cambios en Rust requieren recompilación (Tauri lo hace automáticamente pero tarda ~15s)

6. **Compilación Windows**: Siempre desde Ubuntu con `cargo tauri build --target x86_64-pc-windows-gnu`. Se necesita `mingw-w64` y `nsis`
