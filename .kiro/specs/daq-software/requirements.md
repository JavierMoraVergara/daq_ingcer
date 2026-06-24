# Documento de Requisitos: DAQ Software

## Introducción

Este documento especifica los requisitos formales del software DAQ (Data Acquisition), una aplicación de escritorio para Windows construida con React + Tauri. El sistema permite adquirir, visualizar y persistir datos de instrumentos industriales (ADAM 4118 y Janitza UMG509-PRO) mediante el protocolo Modbus TCP/IP. Los requisitos han sido derivados del documento de diseño técnico aprobado.

---

## Glosario

- **DAQ_App**: La aplicación de escritorio DAQ Software en su conjunto.
- **PollingLoop**: El módulo Rust (tokio::task) responsable de la adquisición periódica de datos.
- **ModbusClient**: El módulo Rust que gestiona la comunicación Modbus TCP/IP con los instrumentos.
- **CsvWriter**: El módulo Rust que escribe y persiste los datos de un ensayo en un archivo CSV.
- **JsonStore**: El módulo Rust que lee y escribe los archivos JSON de configuración y registro.
- **RecoveryManager**: El módulo Rust que detecta y resuelve ensayos incompletos al iniciar la app.
- **Esquema**: Configuración reutilizable que define qué instrumentos y canales se adquieren.
- **Ensayo**: Ejecución concreta de adquisición de datos basada en un Esquema.
- **Instrumento**: Dispositivo de medición (ADAM 4118 o Janitza UMG509-PRO) con configuración Modbus.
- **ADAM4118**: Módulo de adquisición de temperatura Advantech con 8 canales analógicos.
- **Janitza_UMG509**: Analizador de redes eléctricas Janitza UMG509-PRO.
- **LecturaInstante**: Estructura de datos que representa un ciclo completo de adquisición (timestamp + valores de todos los canales del esquema).
- **Alias**: Etiqueta descriptiva asignada por el usuario a una columna del CSV (p. ej., `ADAM1_1` → `temp_motor`).
- **Ciclo**: Un intervalo de adquisición completo desde el inicio hasta el siguiente deadline equiespaciado.
- **NULL**: Valor ausente en el CSV (campo vacío) cuando un instrumento no respondió dentro del Ciclo.
- **Estado_Ensayo**: Enumerado de estados de un Ensayo: `creado`, `ejecutando`, `finalizado`, `error`.
- **Cota**: Línea horizontal de referencia en un gráfico que representa un valor estadístico calculado.
- **AppDataDir**: Directorio `AppData\Roaming\<app_name>\datos` de Windows, path con permisos de escritura sin privilegios de administrador.

---

## Requisitos

### Requisito 1: Gestión de Instrumentos

**User Story:** Como técnico de laboratorio, quiero registrar y configurar los instrumentos de medición disponibles, para poder reutilizarlos en múltiples esquemas de adquisición.

#### Criterios de Aceptación

1. THE DAQ_App SHALL almacenar la lista de instrumentos en el archivo `instrumentos.json` dentro de AppDataDir.
2. WHEN un usuario crea un instrumento, THE JsonStore SHALL asignar un identificador entero autoincremental único al instrumento.
3. WHEN un usuario crea un instrumento, THE DAQ_App SHALL requerir: tipo (`ADAM4118` o `Janitza_UMG509`), nombre descriptivo, dirección IPv4, puerto Modbus TCP, Modbus Unit ID (1–247), timeout en milisegundos y número de reintentos.
4. WHEN un usuario solicita probar la conexión con un instrumento, THE ModbusClient SHALL intentar establecer una conexión Modbus TCP con los parámetros ingresados y retornar `true` si hay respuesta o `false` en caso contrario.
5. THE DAQ_App SHALL permitir listar todos los instrumentos registrados.
6. THE DAQ_App SHALL permitir editar los parámetros de un instrumento existente.

---

### Requisito 2: Gestión de Esquemas de Adquisición

**User Story:** Como técnico de laboratorio, quiero crear y gestionar esquemas de adquisición que definan qué instrumentos y canales se monitorizan, para reutilizar configuraciones en distintos ensayos.

#### Criterios de Aceptación

1. THE DAQ_App SHALL almacenar todos los esquemas en el archivo `esquemas.json` dentro de AppDataDir.
2. WHEN un usuario crea un esquema, THE JsonStore SHALL asignar un identificador entero autoincremental único al esquema.
3. WHEN un usuario crea un esquema, THE DAQ_App SHALL requerir: nombre, descripción, al menos un instrumento asociado, y los canales seleccionados para cada instrumento.
4. WHEN un usuario agrega un instrumento ADAM4118 a un esquema, THE DAQ_App SHALL permitir seleccionar uno o más canales del rango 1 a 8.
5. WHEN un usuario agrega un instrumento Janitza_UMG509 a un esquema, THE DAQ_App SHALL permitir seleccionar una o más variables del conjunto: `v1`, `v2`, `v3`, `c1`, `c2`, `c3`, `p1`, `p2`, `p3`, `f`, `e1`, `e2`, `e3`, `fp1`, `fp2`, `fp3`, `thd1`, `thd2`, `thd3`.
6. WHEN un esquema es creado, THE JsonStore SHALL registrar la fecha y hora de creación en formato `DDMMYYYY_HHmmss` y fijar `vigente = true`.
7. WHEN un usuario solicita deshabilitar un esquema, THE JsonStore SHALL establecer `vigente = false` en el registro del esquema sin eliminar el objeto del archivo `esquemas.json`.
8. IF un usuario intenta deshabilitar un esquema que tiene un ensayo con estado `ejecutando`, THEN THE DAQ_App SHALL mostrar una advertencia de confirmación antes de proceder.
9. THE DAQ_App SHALL mostrar únicamente los esquemas con `vigente = true` en la vista de selección de esquemas activos.

---

### Requisito 3: Creación de Ensayos

**User Story:** Como técnico de laboratorio, quiero crear ensayos basados en un esquema activo y configurar parámetros de adquisición, para organizar cada toma de datos de forma independiente.

#### Criterios de Aceptación

1. WHEN un usuario crea un ensayo, THE DAQ_App SHALL requerir: nombre, descripción, referencia a un esquema con `vigente = true`, e intervalo de adquisición entre 10 y 600 segundos (inclusive).
2. WHEN un usuario no especifica el intervalo, THE DAQ_App SHALL aplicar un intervalo por defecto de 30 segundos.
3. WHEN un usuario crea un ensayo, THE DAQ_App SHALL permitir asignar un alias de texto libre a cada columna de datos generada por el esquema.
4. WHEN un ensayo es creado, THE CsvWriter SHALL generar el archivo CSV con cabeceras en el directorio `AppDataDir/ensayos/` usando el formato de nombre `ENS_YYYYMMDD_HHmmss_<nombre>.csv`.
5. WHEN un ensayo es creado, THE CsvWriter SHALL escribir como primera fila del CSV las cabeceras: `id`, `fecha_hora`, seguidas de las columnas de datos con el formato `ADAM{N}_{canal}_{alias}` para ADAM4118 y `JTZA{N}_{variable}_{alias}` para Janitza_UMG509.
6. WHEN un ensayo es creado, THE JsonStore SHALL registrar el ensayo en `registro_ensayos.json` con `estado = creado` y el nombre del archivo CSV generado.
7. WHEN un ensayo es creado, THE JsonStore SHALL persistir el mapa de aliases en el campo `aliases` del registro del ensayo dentro de `registro_ensayos.json`.
8. IF el intervalo de adquisición es menor que 10 segundos o mayor que 600 segundos, THEN THE DAQ_App SHALL rechazar la creación del ensayo y mostrar el rango válido al usuario.

---

### Requisito 4: Adquisición de Datos (Polling Loop)

**User Story:** Como técnico de laboratorio, quiero que el sistema adquiera datos de los instrumentos en intervalos regulares y precisos, para obtener series temporales confiables y equiespaciadas.

#### Criterios de Aceptación

1. WHEN el usuario inicia la adquisición, THE PollingLoop SHALL comenzar los ciclos usando un tiempo base absoluto `t0`, calculando cada deadline como `t0 + i × intervalo` para evitar la acumulación de desfase.
2. WHILE un ensayo está en estado `ejecutando`, THE PollingLoop SHALL completar cada Ciclo dentro del intervalo configurado con una tolerancia máxima de 100 ms.
3. WHEN el PollingLoop inicia la adquisición, THE JsonStore SHALL actualizar el estado del ensayo a `ejecutando`.
4. WHEN el PollingLoop lee un canal ADAM4118, THE ModbusClient SHALL leer el registro Modbus holding `canal - 1` (canal 1 → registro 0, canal 8 → registro 7) como valor uint16 y aplicar la fórmula de conversión `(raw / 65535.0) × 500.0 - 100.0` para obtener la temperatura en °C.
5. WHEN el PollingLoop lee una variable Janitza_UMG509, THE ModbusClient SHALL leer 2 registros holding consecutivos a partir de la dirección base de la variable, interpretar los bytes en orden big-endian (`[high_byte_reg0, low_byte_reg0, high_byte_reg1, low_byte_reg1]`) y convertirlos a `float32` IEEE 754 para obtener el valor físico.
6. WHEN una lectura Modbus falla, THE ModbusClient SHALL reintentar hasta el número de reintentos configurado para el instrumento, esperando 100 ms entre intentos.
7. IF todos los reintentos de una lectura se agotan sin respuesta, THEN THE PollingLoop SHALL registrar el valor del canal como NULL para ese Ciclo y continuar con el siguiente instrumento.
8. WHEN el PollingLoop completa un Ciclo, THE CsvWriter SHALL escribir la fila de datos (id, timestamp ISO 8601, valores o campo vacío para NULL) y ejecutar `flush` inmediato al sistema de archivos.
9. WHEN el PollingLoop completa un Ciclo, THE PollingLoop SHALL emitir el evento Tauri `nueva_lectura` con la estructura `LecturaInstante` completa del ciclo hacia la capa de presentación.
10. IF todos los instrumentos del esquema fallan en un mismo Ciclo, THEN THE DAQ_App SHALL emitir una alerta prominente en la UI sin detener el ensayo.

---

### Requisito 5: Finalización y Control del Ensayo

**User Story:** Como técnico de laboratorio, quiero controlar el ciclo de vida de un ensayo (iniciar, detener, finalizar), para cerrar correctamente la adquisición y conservar los datos.

#### Criterios de Aceptación

1. WHEN el usuario solicita detener la adquisición, THE PollingLoop SHALL completar el Ciclo en curso y luego detenerse de forma limpia.
2. WHEN el ensayo finaliza de forma normal, THE JsonStore SHALL actualizar el estado del ensayo a `finalizado` y registrar la `fecha_hora_fin` en `registro_ensayos.json`.
3. WHEN el ensayo finaliza de forma normal, THE DAQ_App SHALL mantener el archivo CSV cerrado y consistente en disco.
4. IF el usuario intenta iniciar la adquisición sobre un ensayo con estado distinto de `creado`, THEN THE DAQ_App SHALL rechazar la operación y notificar al usuario.
5. IF el usuario intenta finalizar un ensayo con estado distinto de `ejecutando`, THEN THE DAQ_App SHALL rechazar la operación y notificar al usuario.

---

### Requisito 6: Recuperación ante Corte Eléctrico o Fallo

**User Story:** Como técnico de laboratorio, quiero que el sistema recupere el estado correcto tras un apagado abrupto, para no perder los datos ya registrados y conocer el estado real de cada ensayo.

#### Criterios de Aceptación

1. WHEN la DAQ_App se inicia, THE RecoveryManager SHALL leer `registro_ensayos.json` y detectar todos los ensayos con estado `ejecutando`.
2. WHEN el RecoveryManager detecta un ensayo con estado `ejecutando` al iniciar la app, THE JsonStore SHALL actualizar el estado de ese ensayo a `error` y registrar la `fecha_hora_fin` con el timestamp actual.
3. WHEN un ensayo queda en estado `error`, THE DAQ_App SHALL mostrar el ensayo en la UI con un indicador visual diferenciado (badge de error).
4. WHEN un ensayo queda en estado `error`, THE DAQ_App SHALL permitir al usuario abrir y revisar el CSV parcial del ensayo.
5. WHILE el PollingLoop está en ejecución, THE CsvWriter SHALL realizar un `flush` inmediato al sistema de archivos después de escribir cada fila, de modo que un corte eléctrico cause pérdida de a lo sumo el Ciclo en curso.

---

### Requisito 7: Persistencia de Datos (JSON y CSV)

**User Story:** Como técnico de laboratorio, quiero que todos los datos y configuraciones se guarden de forma confiable en archivos locales, para garantizar trazabilidad y acceso sin conexión a internet.

#### Criterios de Aceptación

1. THE DAQ_App SHALL crear el directorio `AppDataDir/datos/` en la primera ejecución si no existe.
2. THE JsonStore SHALL utilizar el patrón write-to-temp + rename atómico al escribir cualquier archivo JSON, escribiendo primero en un archivo `.tmp` y luego renombrando al path final.
3. THE JsonStore SHALL almacenar `instrumentos.json`, `esquemas.json` y `registro_ensayos.json` en formato JSON con indentado legible.
4. THE CsvWriter SHALL almacenar los archivos de cada ensayo en el subdirectorio `AppDataDir/datos/ensayos/` con el nombre `ENS_YYYYMMDD_HHmmss_<nombre>.csv`.
5. WHEN el DAQ_App lee un archivo JSON y detecta contenido corrupto o no parseable, THE DAQ_App SHALL mostrar un mensaje de error al usuario sin sobreescribir el archivo existente.
6. IF el disco está lleno al intentar escribir una fila CSV, THEN THE DAQ_App SHALL notificar al usuario, pausar la adquisición y conservar los datos ya guardados sin pérdida.
7. THE CsvWriter SHALL escribir los valores numéricos con precisión de 4 decimales y los valores NULL como campo vacío (cadena vacía).

---

### Requisito 8: Parseo y Serialización de Datos

**User Story:** Como desarrollador, quiero que los datos se serialicen y deserialicen correctamente entre formatos (JSON, CSV, estructuras Rust/TypeScript), para garantizar integridad en toda la cadena de persistencia.

#### Criterios de Aceptación

1. WHEN el JsonStore serializa una estructura de datos, THE JsonStore SHALL producir JSON válido que pueda ser deserializado a la misma estructura sin pérdida de información.
2. WHEN el CsvWriter genera las cabeceras de un CSV, THE CsvWriter SHALL producir un orden de columnas determinístico: primero `id` y `fecha_hora`, luego las columnas ADAM en orden ascendente de instrumento y canal, y finalmente las columnas Janitza en orden ascendente de instrumento y variable.
3. WHEN el frontend parsea un archivo CSV de ensayo histórico, THE csvParser SHALL reconstruir el conjunto de `LecturaInstante` incluyendo los campos vacíos interpretados como NULL.
4. FOR ALL archivos `registro_ensayos.json` válidos, serializar y luego deserializar SHALL producir un objeto equivalente (propiedad round-trip).
5. FOR ALL archivos `esquemas.json` válidos, serializar y luego deserializar SHALL producir un objeto equivalente (propiedad round-trip).

---

### Requisito 9: Visualización en Tiempo Real

**User Story:** Como técnico durante un ensayo en curso, quiero ver los valores instantáneos y los gráficos actualizados en tiempo real, para monitorear el proceso sin necesidad de revisar archivos.

#### Criterios de Aceptación

1. WHEN el PollingLoop emite el evento `nueva_lectura`, THE DAQ_App SHALL actualizar el panel de valores instantáneos con los datos del Ciclo más reciente dentro de 500 ms desde la emisión del evento.
2. WHEN el PollingLoop emite el evento `nueva_lectura`, THE GraficoTemperatura SHALL añadir el nuevo punto a la curva visible y ajustar automáticamente el eje Y al rango min/max con un margen del 10% si la escala automática está habilitada.
3. WHEN el PollingLoop emite el evento `nueva_lectura`, THE GraficoElectrico SHALL actualizar la curva de la variable eléctrica actualmente seleccionada.
4. THE DAQ_App SHALL mostrar en el panel de valores instantáneos: nombre del canal (alias si está definido), valor numérico con unidad de medida, e indicación visual para valores NULL.
5. WHILE un ensayo está ejecutando, THE DAQ_App SHALL mostrar un cronómetro con el tiempo transcurrido desde el inicio del ensayo, actualizado cada segundo.
6. THE GraficoTemperatura SHALL mantener una ventana deslizante de al menos 200 puntos para asegurar fluidez visual.

---

### Requisito 10: Estadísticas y Cotas en Gráficos

**User Story:** Como técnico de laboratorio, quiero visualizar estadísticas calculadas sobre los datos adquiridos y marcar cotas en los gráficos, para identificar rápidamente tendencias y valores atípicos.

#### Criterios de Aceptación

1. THE DAQ_App SHALL calcular las siguientes estadísticas por columna: promedio, mediana, moda, desviación estándar, valor mínimo y valor máximo.
2. WHEN se calculan estadísticas, THE DAQ_App SHALL excluir los valores NULL del cálculo, utilizando únicamente los valores numéricos disponibles.
3. IF todos los valores de una columna son NULL, THEN THE DAQ_App SHALL mostrar todas las estadísticas de esa columna como `null` o sin valor.
4. WHEN el usuario habilita una cota en el gráfico, THE GraficoTemperatura SHALL trazar una línea horizontal de referencia en el valor estadístico correspondiente (promedio, mediana, mínimo, máximo o desviación estándar).
5. THE DAQ_App SHALL permitir al usuario ajustar manualmente la escala del eje Y de los gráficos, independientemente del ajuste automático.

---

### Requisito 11: Revisión de Ensayos Históricos

**User Story:** Como técnico de laboratorio, quiero revisar los datos, gráficos y estadísticas de ensayos ya finalizados, para analizar resultados después de una sesión de adquisición.

#### Criterios de Aceptación

1. THE DAQ_App SHALL listar todos los ensayos registrados en `registro_ensayos.json` con: identificador, nombre, fecha/hora de inicio, duración y estado.
2. WHEN el usuario selecciona un ensayo histórico, THE DAQ_App SHALL leer y parsear el archivo CSV correspondiente y mostrar los gráficos y estadísticas calculados sobre la totalidad de los datos.
3. WHEN el usuario selecciona un ensayo histórico, THE DAQ_App SHALL mostrar los gráficos con las mismas capacidades de cotas y ajuste de escala disponibles durante un ensayo en curso.
4. WHEN el usuario solicita exportar los datos de un ensayo, THE DAQ_App SHALL copiar el archivo CSV del ensayo al path de destino elegido por el usuario mediante el diálogo de guardado del sistema operativo.
5. IF el archivo CSV de un ensayo histórico no se encuentra en el path registrado, THEN THE DAQ_App SHALL mostrar un mensaje de error descriptivo sin provocar un crash de la aplicación.
6. WHEN el usuario abre un ensayo con estado `error`, THE DAQ_App SHALL indicar claramente que el ensayo finalizó de forma anormal y mostrar los datos parciales disponibles en el CSV.

---

### Requisito 12: Portabilidad y Distribución

**User Story:** Como administrador de sistemas, quiero que la aplicación se instale en Windows 10/11 sin dependencias externas y se compile desde Ubuntu, para simplificar el despliegue en los equipos del laboratorio.

#### Criterios de Aceptación

1. THE DAQ_App SHALL compilarse para la plataforma `x86_64-pc-windows-gnu` desde un entorno Ubuntu mediante el toolchain `cargo tauri build`.
2. THE DAQ_App SHALL distribuirse como un instalador `.exe` (NSIS o MSI) que no requiere la instalación previa de ningún runtime externo.
3. WHERE el sistema Windows de destino no tiene WebView2 instalado, THE DAQ_App SHALL incluir el runtime WebView2 en el instalador o descargarlo automáticamente durante la instalación.
4. WHEN la DAQ_App se ejecuta en Windows 10 u 11, THE DAQ_App SHALL resolver el directorio de datos usando `AppData\Roaming\<app_name>\datos` sin requerir privilegios de administrador para escritura.
5. THE DAQ_App SHALL ejecutarse correctamente en Windows 10 (versión 1903 o superior) y Windows 11.
