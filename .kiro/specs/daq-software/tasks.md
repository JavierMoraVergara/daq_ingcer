# Plan de Implementación: DAQ Software

## Descripción General

Plan de implementación incremental del software DAQ de escritorio Windows (React + Tauri 2.x + Rust).
Cada tarea construye sobre la anterior, finalizando con la integración completa de todos los módulos.
El stack es: React 18 + TypeScript + Vite 5 (frontend), Tauri 2.x (shell IPC),
Rust con tokio-modbus (backend Modbus TCP), Tailwind CSS + Recharts + Zustand (UI),
persistencia en JSON + CSV locales, y cross-compilación Ubuntu → Windows (x86_64-pc-windows-gnu).

---

## Tareas

- [x] 1. Scaffolding del proyecto y configuración del entorno
  - Inicializar proyecto Tauri 2 con React + TypeScript + Vite 5 en `daq_ingcer/` usando `npm create tauri-app`
  - Instalar y configurar Tailwind CSS 3.x con PostCSS y Autoprefixer en el frontend
  - Instalar dependencias frontend: `recharts`, `zustand`, `@tauri-apps/api`, `@tauri-apps/plugin-dialog`
  - Configurar `src-tauri/Cargo.toml` con dependencias: `tokio-modbus`, `tokio`, `serde`, `serde_json`, `csv`, `chrono`, `tauri`
  - Agregar target de cross-compilación Windows en el toolchain Rust: `x86_64-pc-windows-gnu`
  - Configurar `tauri.conf.json`: identificador de app, nombre, permisos de `app-data-dir`, `dialog`
  - Verificar que `npm run tauri dev` levanta la app en Ubuntu sin errores
  - _Requisitos: 12.1, 12.2_

- [x] 2. Tipos y estructuras de datos (Rust y TypeScript)
  - [x] 2.1 Crear módulo `src-tauri/src/types/` con los archivos `instrumento.rs`, `esquema.rs`, `ensayo.rs`, `lectura.rs`
    - Definir struct `Instrumento` con campos: `id`, `tipo` (enum `ADAM4118`/`JANITZA_UMG509`), `nombre`, `direccion_ip`, `puerto`, `slave_id`, `timeout_ms`, `reintentos`
    - Definir structs `Esquema`, `RegistroEnsayo`, `EstadoEnsayo` (enum), `AliasMap`, `LecturaInstante`, `ValorCanal`
    - Derivar `Serialize`, `Deserialize`, `Clone`, `Debug` en todos los tipos
    - Exponer los tipos desde `types/mod.rs`
    - _Requisitos: 1.3, 2.3, 3.1, 4.9_

  - [x] 2.2 Crear tipos TypeScript espejo en `src/types/`
    - Crear `instrumento.ts`, `esquema.ts`, `ensayo.ts`, `lectura.ts` con interfaces que reflejan exactamente los tipos Rust
    - Exportar todos los tipos desde `src/types/index.ts`
    - _Requisitos: 1.3, 2.3, 3.1, 4.9_

- [x] 3. Capa de persistencia (Rust)
  - [x] 3.1 Implementar `persistence/json_store.rs`
    - Función `leer_json<T>` que lee un archivo JSON y lo deserializa con `serde_json`, retorna error descriptivo si el JSON es corrupto sin sobreescribir el archivo
    - Función `escribir_atomico<T>` que serializa a JSON con indentado, escribe en `.tmp`, y renombra al path final (escritura atómica)
    - Funciones específicas: `leer_instrumentos`, `escribir_instrumentos`, `leer_esquemas`, `escribir_esquemas`, `leer_registro_ensayos`, `escribir_registro_ensayos`
    - Crear `AppDataDir/datos/` y `AppDataDir/datos/ensayos/` si no existen al inicializar
    - _Requisitos: 7.1, 7.2, 7.3, 7.5_

  - [ ]\* 3.2 Escribir tests unitarios para `json_store.rs`
    - Test de round-trip: serializar `Instrumento` / `Esquema` / `RegistroEnsayo` y deserializar, verificar equivalencia
    - Test de escritura atómica: verificar que el archivo `.tmp` no queda en disco tras rename exitoso
    - **Propiedad 8: Round-trip de serialización JSON**
    - **Valida: Requisitos 7.2, 8.1, 8.4, 8.5**

  - [x] 3.3 Implementar `persistence/csv_writer.rs`
    - Struct `CsvWriter` con `BufWriter<File>` como writer interno
    - Función `nueva(ruta, cabeceras)` que crea el archivo CSV y escribe las cabeceras solo si el archivo está vacío
    - Función `escribir_fila(lectura: &LecturaInstante)` que formatea cada campo (4 decimales, NULL como cadena vacía) y llama `flush()` inmediato después de cada fila
    - Función `generar_cabeceras(esquema, aliases)` que produce el orden determinístico: `id`, `fecha_hora`, columnas ADAM (ascendente por instrumento y canal), columnas JTZA (ascendente por instrumento y variable)
    - Manejar error de disco lleno: emitir error descriptivo sin perder datos ya escritos
    - _Requisitos: 3.4, 3.5, 4.8, 6.5, 7.4, 7.7, 8.2_

  - [ ]\* 3.4 Escribir tests unitarios para `csv_writer.rs`
    - Test de `generar_cabeceras` con esquemas conocidos (ADAM + Janitza), verificar orden determinístico
    - Test de idempotencia: llamar `generar_cabeceras` dos veces con el mismo esquema produce el mismo resultado
    - Test de escritura con NULL: fila con `valor: None` produce campo vacío en CSV
    - **Propiedad 12: Cabeceras CSV determinísticas**
    - **Valida: Requisitos 3.5, 8.2**

  - [x] 3.5 Implementar `persistence/recovery.rs`
    - Función `verificar_ensayos_colgados(json_store)` que al iniciarse la app lee `registro_ensayos.json`, detecta ensayos con `estado = ejecutando`, y los actualiza a `estado = error` con `fecha_hora_fin = now()`
    - No modificar ensayos en estado `creado`, `finalizado`, o `error`
    - _Requisitos: 6.1, 6.2, 6.3_

  - [ ]\* 3.6 Escribir test unitario para `recovery.rs`
    - Test con registro que contiene 1 ensayo `ejecutando`, 1 `finalizado`, 1 `creado`: verificar que solo el `ejecutando` cambia a `error`
    - **Propiedad 4: Recuperación de estado ante crash**
    - **Valida: Requisitos 6.1, 6.2**

- [ ] 4. Checkpoint — Persistencia
  - Verificar que `cargo test` pasa todos los tests del módulo `persistence`
  - Verificar que los archivos JSON se crean correctamente en el directorio `datos/`
  - Verificar que el patrón de escritura atómica funciona (sin archivos `.tmp` huérfanos)
  - Preguntar al usuario si hay dudas antes de continuar

- [x] 5. Comunicación Modbus (Rust)
  - [x] 5.1 Implementar `modbus/client.rs`
    - Struct `ModbusTcpClient` que encapsula `tokio_modbus::client::tcp::connect_slave`
    - Función `conectar(ip, puerto, slave_id, timeout_ms)` que establece la conexión TCP
    - Función `leer_holding_registers(addr, count)` que lee N registros y aplica timeout usando `tokio::time::timeout`
    - _Requisitos: 1.4, 4.4, 4.5, 4.6_

  - [x] 5.2 Implementar `modbus/adam.rs`
    - Función `leer_adam(client, canales, reintentos, timeout)` que itera sobre los canales solicitados
    - Para cada canal: leer registro `canal - 1` como uint16 con hasta `reintentos` intentos, esperando 100 ms entre intentos
    - Conversión: `(raw as f64 / 65535.0) * 500.0 - 100.0` para obtener temperatura en °C
    - Si agota reintentos: retornar `None` (NULL) para ese canal
    - _Requisitos: 4.4, 4.6, 4.7_

  - [ ]\* 5.3 Escribir tests unitarios para `adam.rs`
    - Test con valores conocidos: raw=0 → -100.0°C, raw=65535 → 400.0°C, raw=32767 → ~149.99°C
    - Test de propiedad: para cualquier raw en [0, 65535], resultado está en [-100.0, 400.0]
    - **Propiedad 10: Conversión ADAM4118 produce temperatura en rango físico válido**
    - **Valida: Requisito 4.4**

  - [x] 5.4 Implementar `modbus/janitza.rs`
    - Función `leer_janitza(client, variables, reintentos, timeout)` que itera sobre las variables solicitadas
    - Para cada variable: obtener dirección base desde tabla de mapeo (`JanitzaVar::registro_inicio()`), leer 2 registros holding consecutivos
    - Conversión IEEE 754 big-endian: `bytes = [(regs[0]>>8), (regs[0]&0xFF), (regs[1]>>8), (regs[1]&0xFF)]`, interpretar como `f32::from_be_bytes`
    - Si agota reintentos: retornar `None` (NULL) para esa variable
    - _Requisitos: 4.5, 4.6, 4.7_

  - [ ]\* 5.5 Escribir tests unitarios para `janitza.rs`
    - Test de conversión con valor conocido: float f32 = 220.5 → empaquetado como [regs[0], regs[1]] → conversión inversa = 220.5
    - Test de round-trip: empaquetar un f32 arbitrario como dos u16 big-endian y desempaquetar, verificar igualdad con precisión f32::EPSILON
    - **Propiedad 11: Conversión Janitza IEEE 754 big-endian es invertible**
    - **Valida: Requisito 4.5**

- [x] 6. Polling Loop (Rust)
  - [x] 6.1 Implementar `polling/scheduler.rs`
    - Función `calcular_deadline(t0: Instant, ciclo: u64, intervalo_seg: u64) -> Instant` que calcula `t0 + ciclo * intervalo` como tiempo absoluto
    - Función `sleep_hasta_deadline(deadline: Instant)` usando `tokio::time::sleep_until`
    - Garantizar que el desfase acumulado no supera 100 ms por ciclo (tolerancia de temporización)
    - _Requisitos: 4.1, 4.2_

  - [x] 6.2 Implementar `polling/loop.rs`
    - Función async `polling_loop(config: PollingConfig, app_handle: AppHandle, csv_writer: CsvWriter, stop_rx: oneshot::Receiver<()>)`
    - Al iniciar: registrar `t0 = Instant::now()`, inicializar `fila_id = 1`
    - En cada ciclo: calcular deadline, leer todos los instrumentos del esquema (ADAM y Janitza en paralelo con `tokio::join!`), escribir fila CSV con flush inmediato, emitir evento Tauri `nueva_lectura` con `LecturaInstante` completo
    - Manejo de reintentos por instrumento: delegar a `adam.rs` y `janitza.rs` con los parámetros del instrumento
    - Si todos los instrumentos fallan en un ciclo: emitir evento `error_todos_instrumentos` hacia UI
    - Al recibir señal de parada en `stop_rx`: completar el ciclo en curso y terminar limpiamente
    - Dormir hasta el próximo deadline usando `scheduler::sleep_hasta_deadline`
    - _Requisitos: 4.1, 4.2, 4.3, 4.6, 4.7, 4.8, 4.9, 4.10, 5.1_

- [x] 7. Tauri Commands (Rust)
  - [x] 7.1 Implementar `commands/instrumentos.rs`
    - Command `listar_instrumentos`: lee `instrumentos.json` y retorna `Vec<Instrumento>`
    - Command `crear_instrumento(payload)`: asigna ID autoincremental (max(ids)+1), valida campos requeridos (tipo, nombre, IP, puerto 1–65535, slave_id 1–247, timeout_ms > 0, reintentos >= 0), persiste con `json_store`, retorna `Instrumento`
    - Command `actualizar_instrumento(id, payload)`: actualiza los parámetros del instrumento existente, retorna `Instrumento` actualizado
    - Command `probar_conexion(ip, puerto, slave_id, timeout_ms)`: intenta conexión Modbus TCP y retorna `bool`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 7.2 Implementar `commands/esquemas.rs`
    - Command `listar_esquemas`: retorna `Vec<Esquema>` de `esquemas.json`
    - Command `crear_esquema(payload)`: asigna ID autoincremental, valida que tiene al menos un instrumento, registra `fecha_hora_crea`, `vigente = true`, persiste con `json_store`, retorna `Esquema`
    - Command `actualizar_esquema(id, payload)`: modifica esquema existente, retorna `Esquema`
    - Command `deshabilitar_esquema(id)`: verifica si hay ensayo `ejecutando` con ese `esquema_id` (si existe, retorna error descriptivo para que el frontend muestre confirmación), establece `vigente = false` sin eliminar el objeto, persiste
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 7.3 Implementar `commands/ensayos.rs`
    - Command `listar_ensayos`: retorna `Vec<RegistroEnsayo>` de `registro_ensayos.json`
    - Command `crear_ensayo(payload)`: valida `intervalo_segundos` en [10, 600], valida que el `esquema_id` existe y tiene `vigente = true`, genera nombre de archivo CSV con formato `ENS_YYYYMMDD_HHmmss_<nombre>.csv`, crea el CSV con cabeceras usando `generar_cabeceras`, registra ensayo con `estado = creado`, retorna `RegistroEnsayo`
    - Command `finalizar_ensayo(id)`: verifica `estado == ejecutando`, envía señal de parada al `PollingLoop`, actualiza `estado = finalizado` con `fecha_hora_fin`, retorna `RegistroEnsayo`
    - Command `cargar_datos_ensayo(id)`: lee y parsea el CSV del ensayo, retorna `DatosEnsayo` (encabezados + filas)
    - Command `exportar_csv(id, destino)`: copia el archivo CSV al path de destino; si el archivo CSV no existe, retorna error descriptivo sin crash
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 5.2, 5.3, 5.4, 5.5, 11.4, 11.5_

  - [x] 7.4 Implementar `commands/adquisicion.rs`
    - Command `iniciar_adquisicion(app, state, ensayo_id)`: verifica `estado == creado`, abre el `CsvWriter` con el archivo CSV del ensayo, hace spawn del `polling_loop` como `tokio::task`, guarda el canal de parada en `AppState`, actualiza `estado = ejecutando` en `registro_ensayos.json`, retorna `Ok(())`
    - Command `detener_adquisicion(state, ensayo_id)`: envía señal de parada al `PollingLoop` vía `oneshot::Sender`, espera terminación, retorna `Ok(())`
    - Si se intenta iniciar un ensayo con estado distinto de `creado`: retornar error descriptivo
    - _Requisitos: 4.3, 5.1, 5.4_

  - [x] 7.5 Registrar todos los commands en `main.rs`
    - Definir `AppState` con `Mutex<Option<PollingHandle>>` para el handle del polling loop activo
    - Llamar `verificar_ensayos_colgados()` al iniciar la app, antes de registrar los commands
    - Registrar todos los commands en `.invoke_handler(tauri::generate_handler![...])`
    - Configurar el `resolver_dir_datos` usando `app.path().app_data_dir()` para Windows
    - _Requisitos: 4.3, 6.1, 12.4_

- [ ] 8. Checkpoint — Backend completo
  - Verificar que `cargo build` compila sin errores ni warnings
  - Verificar que `cargo test` pasa todos los tests unitarios de los módulos `modbus` y `persistence`
  - Probar manualmente los commands desde la consola Tauri (crear instrumento, crear esquema, crear ensayo)
  - Preguntar al usuario si hay dudas antes de continuar con el frontend

- [x] 9. Frontend — Infraestructura (lib, hooks, stores)
  - [x] 9.1 Implementar `src/lib/tauriCommands.ts`
    - Wrappers tipados sobre `invoke()` para todos los commands Rust: `listarInstrumentos`, `crearInstrumento`, `actualizarInstrumento`, `probarConexion`, `listarEsquemas`, `crearEsquema`, `actualizarEsquema`, `deshabilitarEsquema`, `listarEnsayos`, `crearEnsayo`, `finalizarEnsayo`, `iniciarAdquisicion`, `detenerAdquisicion`, `cargarDatosEnsayo`, `exportarCsv`
    - Usar tipos importados de `src/types/index.ts`
    - _Requisitos: 1.4, 1.5, 1.6, 2.7, 3.1, 4.1, 5.1, 11.4_

  - [x] 9.2 Implementar `src/lib/estadisticas.ts`
    - Función `calcularEstadisticas(valores: (number | null)[])` que retorna `Estadisticas` con: promedio, mediana, moda, desviacion_std, minimo, maximo
    - Excluir los `null` del cálculo; si todos son `null`, retornar todos los campos como `null`
    - Mediana correcta para arrays pares e impares
    - Desviación estándar poblacional
    - _Requisitos: 10.1, 10.2, 10.3_

  - [ ]\* 9.3 Escribir tests unitarios para `estadisticas.ts` con Vitest
    - Test con valores [1, 2, 3, null, 4, 5]: verificar promedio, mediana, moda, std, min, max
    - Test con todos null: verificar que todos los campos son `null`
    - Test con un solo valor no-null: verificar que std = 0, min = max = promedio
    - **Propiedad 7: Estadísticas excluyen NULL**
    - **Valida: Requisitos 10.2, 10.3**

  - [x] 9.4 Implementar `src/lib/csvParser.ts`
    - Función `parsearCsvEnsayo(texto: string)` que parsea el CSV completo de un ensayo
    - Primera fila como cabeceras; campos vacíos interpretados como `null`
    - Retorna `{ cabeceras: string[], lecturas: LecturaInstante[] }`
    - _Requisitos: 8.3, 11.2_

  - [ ]\* 9.5 Escribir tests unitarios para `csvParser.ts` con Vitest
    - Test con CSV bien formado incluyendo campos vacíos (NULL): verificar que los campos vacíos se parsean como `null`
    - Test de round-trip conceptual: escribir filas de `LecturaInstante` en formato CSV y parsear, verificar que los datos son equivalentes
    - **Propiedad 9: Round-trip de datos CSV**
    - **Valida: Requisito 8.3**

  - [x] 9.6 Implementar `src/hooks/useNuevaLectura.ts`
    - Hook que suscribe al evento Tauri `nueva_lectura` usando `listen<LecturaInstante>`
    - Usa `callbackRef` para evitar recrear la suscripción en cada render
    - Desuscribe al desmontar el componente con `unlisten()`
    - _Requisitos: 4.9, 9.1_

  - [x] 9.7 Implementar `src/hooks/useEstadisticas.ts`
    - Hook que recibe `lecturas: LecturaInstante[]` y retorna `Map<columna, Estadisticas>`
    - Recalcula estadísticas cuando cambia el array de lecturas (useMemo)
    - _Requisitos: 10.1, 10.2, 10.3_

  - [x] 9.8 Implementar `src/hooks/useCargaEnsayo.ts`
    - Hook que invoca `tauriCmd.cargarDatosEnsayo(id)` y retorna `{ lecturas, cabeceras, loading, error }`
    - _Requisitos: 11.2, 11.5_

  - [x] 9.9 Implementar stores Zustand
    - `src/store/useEsquemasStore.ts`: estado `esquemas: Esquema[]`, acciones `cargarEsquemas()`, `crearEsquema()`, `deshabilitarEsquema()`
    - `src/store/useEnsayoStore.ts`: estado `ensayoActivo: RegistroEnsayo | null`, `lecturas: LecturaInstante[]` (buffer ventana deslizante de 200 puntos), acciones `iniciarAdquisicion()`, `detenerAdquisicion()`, `agregarLectura()`
    - `src/store/useUiStore.ts`: estado `vistaActual`, `modalAbierto`, `ensayoSeleccionado`, acciones para navegar entre vistas
    - _Requisitos: 9.1, 9.2, 9.5_

- [x] 10. Frontend — Componentes shared y de esquemas
  - [x] 10.1 Implementar componentes `src/components/shared/`
    - `StatusBadge.tsx`: badge de color según `EstadoEnsayo` (`creado`→gris, `ejecutando`→verde, `finalizado`→azul, `error`→rojo)
    - `IntervaloPicker.tsx`: selector con opciones predefinidas (10s, 30s, 60s, 120s, 300s, 600s) + campo numérico personalizado; valida que el valor esté en [10, 600] y muestra el rango si está fuera de rango
    - `ConfirmModal.tsx`: modal genérico de confirmación con título, mensaje, botones Cancelar/Confirmar
    - _Requisitos: 3.8, 6.3, 8.3_

  - [x] 10.2 Implementar componentes `src/components/esquemas/`
    - `EsquemaCard.tsx`: tarjeta que muestra nombre, cantidad de instrumentos ADAM/Janitza, versión, estado de vigencia; botones "Crear Ensayo", "Editar", "Deshabilitar"
    - `SelectorInstrumentos.tsx`: lista de instrumentos disponibles con checkbox por instrumento y selección de canales; para ADAM muestra checkboxes de canales 1–8; para Janitza muestra checkboxes de las 19 variables; incluye botón "Probar conexión" por instrumento
    - `CrearEsquemaModal.tsx`: modal en pasos (datos básicos → agregar instrumentos y canales → confirmar); invoca `tauriCmd.crearEsquema()` o `actualizarEsquema()`; muestra resultado de "Probar conexión" inline
    - _Requisitos: 1.4, 2.1, 2.3, 2.4, 2.5, 2.9_

- [x] 11. Frontend — Componentes de ensayo y gráficos
  - [x] 11.1 Implementar componentes `src/components/ensayo/`
    - `AliasEditor.tsx`: tabla editable con columna izquierda (nombre de columna generado del esquema) y columna derecha (input de texto libre para alias); valida que el alias no contenga caracteres inválidos para nombre de columna CSV
    - `CrearEnsayoModal.tsx`: modal que recibe el esquema seleccionado; campos nombre, descripción, `IntervaloPicker`, `AliasEditor`; valida intervalo antes de enviar; invoca `tauriCmd.crearEnsayo()`
    - `PanelInstantaneo.tsx`: panel que muestra los valores del ciclo más reciente: nombre del canal (alias si definido), valor numérico con unidad, indicación visual roja para NULL; se actualiza via `useNuevaLectura`
    - `PanelEstadisticas.tsx`: tabla con filas (promedio, mediana, moda, desviación std, mín, máx) y columnas por canal; usa `useEstadisticas`; muestra `—` para campos `null`
    - `ControlEnsayo.tsx`: botones "Iniciar", "Detener" y cronómetro con tiempo transcurrido desde inicio (actualizado cada segundo con `setInterval`); deshabilita "Iniciar" si el estado no es `creado`; muestra alerta prominente si llega evento `error_todos_instrumentos`
    - _Requisitos: 3.3, 5.4, 5.5, 9.1, 9.4, 9.5, 10.1, 10.2_

  - [x] 11.2 Implementar componentes `src/components/graficos/`
    - `CotasControl.tsx`: panel con checkboxes para habilitar/deshabilitar cotas (promedio, mediana, mínimo, máximo, desviación std); pasa `CotasConfig` al gráfico padre
    - `GraficoTemperatura.tsx`: `LineChart` de Recharts con ventana deslizante de 200 puntos; una línea por columna ADAM activa; `ReferenceLine` horizontal por cada cota habilitada en `CotasConfig`; ajuste automático del eje Y (min/max con margen 10%) cuando `escalaAuto = true`; permite rango manual mediante `rangoY` prop; selector de escala auto/manual
    - `GraficoElectrico.tsx`: similar a `GraficoTemperatura` pero para columnas Janitza; selector de variable activa (pestañas V1/V2/V3, C1/C2/C3, P1/P2/P3, etc.)
    - _Requisitos: 9.2, 9.3, 9.6, 10.4, 10.5_

- [x] 12. Frontend — Vistas principales y router
  - [x] 12.1 Implementar `src/App.tsx` con layout y navegación lateral
    - Sidebar fijo con secciones: "Esquemas", "Ensayos", "En curso" (solo visible si hay ensayo activo), "Configuración"
    - Router basado en `useUiStore` (sin React Router, navegación por estado)
    - Renderizado condicional de `EsquemasView`, `EnsayoView`, `RevisarEnsayoView`
    - Llamar a `cargarEsquemas()` y `listarEnsayos()` al montar la app
    - _Requisitos: 2.9, 9.4, 11.1_

  - [x] 12.2 Implementar `src/views/EsquemasView.tsx`
    - Listar esquemas con `vigente = true` usando `useEsquemasStore`
    - Renderizar una `EsquemaCard` por esquema
    - Botón "Nuevo Esquema" que abre `CrearEsquemaModal`
    - Al clic en "Deshabilitar": si hay ensayo `ejecutando` con ese esquema, mostrar `ConfirmModal` con advertencia antes de proceder
    - Al clic en "Crear Ensayo": abrir `CrearEnsayoModal` con el esquema preseleccionado
    - _Requisitos: 2.7, 2.8, 2.9_

  - [x] 12.3 Implementar `src/views/EnsayoView.tsx`
    - Vista del ensayo en curso: cronómetro, `PanelInstantaneo`, `PanelEstadisticas`, `GraficoTemperatura`, `GraficoElectrico`, `CotasControl`, `ControlEnsayo`
    - Suscribirse a `useNuevaLectura` y agregar cada lectura al buffer del `useEnsayoStore`
    - Mostrar alerta prominente al recibir evento `error_todos_instrumentos`
    - Pasar el buffer de 200 lecturas a los gráficos
    - _Requisitos: 4.10, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.4, 10.5_

  - [x] 12.4 Implementar `src/views/RevisarEnsayoView.tsx`
    - Tabla de ensayos con columnas: ID, nombre, fecha/hora inicio, duración calculada, estado (con `StatusBadge`)
    - Al seleccionar un ensayo: cargar datos con `useCargaEnsayo`, mostrar `GraficoTemperatura`, `GraficoElectrico`, `PanelEstadisticas`, `CotasControl` con los datos históricos completos
    - Si el ensayo tiene `estado = error`: mostrar indicador visual diferenciado y mensaje "Ensayo finalizado de forma anormal — datos parciales disponibles"
    - Si el archivo CSV no se encuentra: mostrar mensaje de error descriptivo sin crash
    - Botón "Exportar CSV" que invoca `tauriCmd.exportarCsv()` con diálogo de guardado nativo de Tauri
    - _Requisitos: 6.3, 6.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 13. Checkpoint — Frontend completo
  - Verificar que `npm run build` compila sin errores de TypeScript
  - Navegar por todas las vistas y verificar que los datos fluyen correctamente
  - Crear un instrumento, un esquema y un ensayo de prueba
  - Iniciar adquisición con instrumentos simulados (o reales si disponibles)
  - Preguntar al usuario si hay dudas antes de continuar con tests y build

- [ ] 14. Tests de propiedad y tests de integración
  - [ ] 14.1 Escribir test de propiedad Rust: equiespaciado temporal
    - Usar `proptest` o implementación manual con `tokio::test`: para N ciclos con intervalo arbitrario en [10, 600]s, verificar que los timestamps de las filas CSV están equiespaciados con tolerancia ±100ms
    - **Propiedad 1: Equiespaciado temporal**
    - **Valida: Requisitos 4.1, 4.2**

  - [ ]\* 14.2 Escribir test de propiedad Rust: NULL coherente ante fallo de instrumento
    - Simular instrumento que agota todos sus reintentos; verificar que la fila CSV tiene campo vacío para ese instrumento y que el loop continúa sin interrupción
    - **Propiedad 2: NULL coherente ante fallo de instrumento**
    - **Valida: Requisitos 4.6, 4.7**

  - [ ]\* 14.3 Escribir test de propiedad TypeScript (Vitest): round-trip JSON
    - Para instancias arbitrarias de `Instrumento`, `Esquema`, `RegistroEnsayo`: serializar a JSON string y parsear, verificar equivalencia profunda
    - **Propiedad 8: Round-trip de serialización JSON**
    - **Valida: Requisitos 8.1, 8.4, 8.5**

  - [ ]\* 14.4 Escribir test de integración Rust: flujo completo crear→iniciar→ciclos→finalizar
    - Crear esquema y ensayo en memoria, simular 3 ciclos de polling con instrumentos mock, verificar que el CSV contiene 3 filas con timestamps equiespaciados y valores correctos, finalizar y verificar `estado = finalizado` en `registro_ensayos.json`
    - **Valida: Requisitos 3.4, 3.5, 4.1, 4.8, 5.2, 5.3**

  - [ ]\* 14.5 Verificar Propiedad 3 (flush inmediato)
    - Test unitario que escribe una fila con `CsvWriter`, mata el writer sin llamar `close()`, y verifica que el archivo en disco contiene la fila escrita
    - **Propiedad 3: Flush inmediato garantiza persistencia por ciclo**
    - **Valida: Requisitos 4.8, 6.5, 7.4**

  - [ ]\* 14.6 Verificar Propiedad 5 (esquema deshabilitado no se elimina físicamente)
    - Test unitario: crear esquema, deshabilitar, leer `esquemas.json`, verificar que el objeto sigue presente con `vigente = false`
    - **Propiedad 5: Esquema deshabilitado nunca se elimina físicamente**
    - **Valida: Requisitos 2.7, 2.9**

  - [ ]\* 14.7 Verificar Propiedad 13 (IDs autoincrementales únicos y crecientes)
    - Test: crear 5 instrumentos en secuencia, verificar que los IDs son [1, 2, 3, 4, 5] sin gaps ni repeticiones
    - **Propiedad 13: IDs autoincrementales son únicos y crecientes**
    - **Valida: Requisitos 1.2, 2.2**

  - [ ]\* 14.8 Verificar Propiedad 6 (aliases persistentes por ensayo round-trip)
    - Test: crear ensayo con mapa de aliases, serializar `RegistroEnsayo`, deserializar, verificar que el mapa de aliases es idéntico
    - **Propiedad 6: Aliases persistentes por ensayo**
    - **Valida: Requisitos 3.7, 8.4**

- [ ] 15. Build, cross-compilación y empaquetado
  - [ ] 15.1 Configurar cross-compilación Ubuntu → Windows en `src-tauri/Cargo.toml`
    - Verificar que `rustup target add x86_64-pc-windows-gnu` está configurado en el entorno
    - Agregar sección `.cargo/config.toml` con linker `x86_64-w64-mingw32-gcc` para el target Windows
    - Verificar que `sudo apt install mingw-w64` provee el linker necesario
    - _Requisitos: 12.1_

  - [ ] 15.2 Configurar `tauri.conf.json` para el instalador Windows
    - Configurar `bundle.targets` con `["nsis", "msi"]`
    - Configurar inclusión de WebView2 runtime en el instalador (o descarga automática durante instalación)
    - Configurar identificador de bundle, nombre visible en Windows y versión
    - _Requisitos: 12.2, 12.3_

  - [ ] 15.3 Ejecutar build de producción para Windows
    - Correr `cargo tauri build --target x86_64-pc-windows-gnu` desde Ubuntu
    - Verificar que el instalador `.exe` (NSIS) se genera sin errores en `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/`
    - Verificar que el ejecutable resultante no tiene dependencias externas de runtime
    - _Requisitos: 12.1, 12.2, 12.4, 12.5_

  - [ ] 15.4 Crear `README.md` en `daq_ingcer/` con instrucciones de desarrollo y build
    - Sección: prerrequisitos (Node.js, Rust, cargo-tauri, mingw-w64)
    - Sección: desarrollo local (`npm install`, `npm run tauri dev`)
    - Sección: cross-compilación a Windows (`cargo tauri build --target x86_64-pc-windows-gnu`)
    - Sección: estructura de archivos de datos en runtime (`AppData/Roaming/<app>/datos/`)
    - _Requisitos: 12.1, 12.4_

- [ ] 16. Checkpoint final — Verificación completa
  - Ejecutar `cargo test` y verificar que todos los tests Rust pasan
  - Ejecutar `npx vitest --run` y verificar que todos los tests TypeScript pasan
  - Ejecutar `npm run build` y verificar que el frontend compila sin errores de TypeScript ni ESLint
  - Verificar que el build Windows se genera correctamente con `cargo tauri build --target x86_64-pc-windows-gnu`
  - Preguntar al usuario si hay dudas o ajustes finales antes de cerrar

---

## Notas

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para acelerar el MVP
- Cada tarea referencia los requisitos específicos que implementa para trazabilidad
- Los checkpoints en las tareas 4, 8, 13 y 16 son puntos de pausa para validar el avance
- Las propiedades de corrección (Propiedades 1–13 del diseño) están distribuidas como sub-tareas opcionales a lo largo del plan
- El orden de las tareas respeta las dependencias: tipos → persistencia → Modbus → polling → commands → frontend infra → componentes → vistas → tests → build
