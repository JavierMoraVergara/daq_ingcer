### Especificación de Requisitos de Software (ERS / SRS)

### Definiciones:

    Esquema: conjunto de canales de diversos instrumentos, en el mvp de este software solo tomaremos 2 tipos de instrumentos: Adam 4118 y janitza UMG509-PRO
    Ensayo: toma de datos desde los intrumentos segun un esquema ya definido

### Descripcion del software:

Software de escritorio con interfaz creada en react + tauri para visualizar y trabajar los datos de instrumentos de medición, este debe quedar funcionando en escritorio instalado desde un .exe, para windows aunque el desarrollo se hará en ubuntu. El software debe ser capaz de comunicarse a distintos instrumentos usando el protocolo de comunicacion serial modbus tcp/ip. el software debe ser capaz de crear archivos locales con la informacion de los esquemas y de los ensayos, la idea es que valla creando archivos independientes por cada ensayo.

### Requisitos Funcionales:

-El usuario debe poder crear un esquema de adquisicion de datos y elegir cuantos y cuales canales de temperaturas de los ADAM y que variables de los equipos Janitzas y cuantos janitzas, ademas de los valores de la configuracion modbus para cada instrumento
-El usuario debe poder crear un ensayo en base a un esquema ya definido
-El usuario debe poder añadir alias a los campos predefinidos por el esquema, por ejuemplo ADAM1_CANAL1 (temp_motor)
-El usuario debe poder elejir el intervalo de adquisicion de datos antes de dar inicio al ensayo de 10s a 600s y por defecto cada 30s
-El usuario puede poner fin al ensayo en cualquier momento y abortar la captura de datos
-El software ademas de adquirir datos debe mostrar los datos de temperatura y valiables electricas en tiempo real de forma clara
-El software debe mostrar un grafico para mostrar la curva de temperatura en tiempo real
-El software debe mostrar un grafico por variable electrica dependiendo del esquema
-El usuario puede declarar cotas en el grafico para visualizar valores estadisticos (promedio, mediana, moda, desviacion estandar, valor minimo, valor maximo)
-El usuario puede descargar la data al terminar un ensayo en un formato amigable con herramientas de ofimatica ej: .csv
-El usuario puede cargar un ensayo ya terminado para revisar los datos, graficos y descargar datos en .csv si lo desea
-El software debe adaptar el grafico a la escala
-El usuario puede cambiar las escalas de los graficos para tener mas control visual
-El usuario puede borrar esquemas pero este solo debe desabilitarse cambiando su parametro vigencia a "False"

### Requisitos No Funcionales:

-El sistema utilizará almacenamiento documental basado en archivos. La información de instrumentos, esquemas y metadatos de ensayos se almacenará en archivos JSON. Cada ensayo generará un archivo independiente de datos con estructura definida por el esquema utilizado.
-Cada ensayo se almacenará en un archivo independiente cuyo nombre estará compuesto por fecha, hora y nombre del ensayo.
-El software creara una archivo .csv con la fecha y hora de creacion y el nombre para cada ensayo segun el esquema seleccionado ej: 22062026_16_08_00_ensayoPruebas
-El software debe registrar en instantes temporales equiespaciados según el intervalo configurado. El tiempo de adquisición no debe acumular desfase entre ciclos consecutivos.
-Si no se consigue un datos el sistema debe volver a consultar hasta obtenerlo, de no obtener el dato antes que se cumpla el tiempo el sistema debe subir la informacion de ese canal como NULL
-Portabilidad: Debe compilarse desde Ubuntu pero ejecutarse en Windows 10/11 sin dependencias externas.
-el software debe ser capaz de finalizar el ensayo y guardar el progreso si es que hay un corte de electricidad
-el software debe guardar la informacion de los ensayos realizados en el archivo registro_ensayos

### arhivo instrumentos.json

ejemplo:
{
"id": 1,
"tipo": "ADAM4118",
"nombre": "ADAM_TEMP_01",
"direccion_ip": "192.168.1.10",
"puerto": 502,
"slave_id": 1,
"timeout_ms": 1000,
"reintentos": 3
}

### archivo de registro_ensayos.json (Metadata)

ejemplo
{
"id": 1,
"nombre": "juan perez",
"fecha_hora_inicio": "23062026_124400",
"fecha_hora_fin": "24062026_124400",
"esquema_id": 1,
"intervalo_segundos": 30,
"estado": enum ['Creado', 'ejecutando', 'finalizado', 'error']
}

### archivo esquemas.json:

ejemplo:
{
"id": 1,
"nombre": "juan perez",
"version": 1.0,
"vigente": True,
"fecha_hora_crea": ""23062026_124400"",
"usuario_crea": "",
"descripcion": ,
"cant_adam": ,
"canales_adam": {},
"cant_janitzas": ,
"canales_janitzas": {},
}

ej de parametro canales_adam si son 2 adam:
{  
'canales_1': [1,2,3,4,5,6,7,8],
'canales_2': [1,2,3,4]
}

ej de parametro canales_janitza si son 2 janitzas:
{
canales_1: ['v1','v2','v3', 'c1', 'c2', 'c3', 'p1', 'p2', 'p3', 'f', 'e1', 'e2', 'e3', 'fp1', 'fp2', 'fp3', 'thd1', 'thd2', 'thd3' ],
canales_2: ['v1', 'c1', 'p1', 'f', 'e1']
}

## archivo ensayo.csv ejemplo 1

id
fecha_hora
ADAM1_1_alias
ADAM1_2_alias
ADAM1_5_alias
ADAM1_8_alias
JTZA1_V1_alias
JTZA1_A1_alias
JTZA1_P1_alias

## archivo ensayo.csv ejemplo 2

id
fecha_hora
ADAM1_1_alias
ADAM2_1_alias
ADAM3_1_alias
ADAM4_1_alias
JTZA1_V1_alias
JTZA2_V1_alias
JTZA3_V1_alias

## archivo ensayo.csv ejemplo 3

id
fecha_hora
ADAM1_1_alias
ADAM1_2_alias
ADAM2_1_alias
ADAM2_2_alias
JTZA1_V1_alias
JTZA1_V2_alias
JTZA2_V1_alias
JTZA2_V2_alias
JTZA1_C1_alias
JTZA1_C2_alias
JTZA2_C1_alias
JTZA2_C2_alias
JTZA1_P1_alias
JTZA1_P2_alias
JTZA2_P1_alias
JTZA2_P2_alias

### Carpeta de datos

datos/
├── instrumentos.json
├── esquemas.json
├── ensayos.json
└── ensayos/
////├── ENS_20260623_103000_MotorA.csv
////├── ENS_20260623_153000_MotorB.csv
////└── ENS_20260624_090000_PruebaCarga.csv

### DIRECCION MODBUS DE CADA CANAL POR INSTRUMENTO

    ADAM 4118:
        CANAL 1: 0
        CANAL 2: 1
        CANAL 3: 2
        CANAL 4: 3
        CANAL 5: 4
        CANAL 6: 5
        CANAL 7: 6
        CANAL 8: 7
        *tipo de dato modbus: Escala valor Modbus (0 a 65535 / -100 a 400°C) al rango de temperatura configurado


    JANITZA UMG509-PRO:
        VOLTAJE_1: 19000, (V)
        VOLTAJE_2: 19002, (V)
        VOLTAJE_3: 19004, (V)
        CORRIENTE_1: 19012, (A)
        CORRIENTE_2: 19014, (A)
        CORRIENTE_3: 19016, (A)
        POTENCIA_1: 19020, (W)
        POTENCIA_2: 19022,(W)
        POTENCIA_3: 19024, (W)
        FRECUENCIA: 19050, (Hz) (ESTE APLICA PARA TODAS LAS FASES)
        ENERGIA_1: 19054, (Wh)
        ENERGIA_2: 19056, (Wh)
        ENERGIA_3: 19058, (Wh)
        FACTOR_DE_POTENCIA 1: 19044, (sin unidad de medida)
        FACTOR_DE_POTENCIA 2: 19046, (sin unidad de medida)
        FACTOR_DE_POTENCIA 3: 19048, (sin unidad de medida)
        THD_1: 19110, (sin unidad de medida)
        THD_2: 19112, (sin unidad de medida)
        THD_3: 19114, (sin unidad de medida)
        *tipo de dato modbus:Lee 2 registros Modbus y los convierte a float IEEE 754 big-endian.
