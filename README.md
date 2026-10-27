# Datos SIRE WBS para React

Extracción del 23 de octubre de 2026 mediante la cuenta INCUV_DCBMI.

## Archivos

- tickets.json: 18 tickets únicos, nueve campos del listado, fechas originales y metadatos.
- perfil.json: perfil visible de la cuenta.
- tickets-originales.json y perfil-original.json: valores y etiquetas del DOM para trazabilidad.
- Tickets.jsx: componente React con búsqueda, filtro por estatus y descripciones desplegables.
- perfil.txt y detalle-7318.txt: capturas textuales de las vistas revisadas.

## Uso en React

Copia Tickets.jsx y tickets.json al mismo directorio de un proyecto React existente:

```jsx
import Tickets from './Tickets';
export default function App() { return <Tickets />; }
```

El componente muestra los datos como texto; no interpreta HTML. El perfil no se importa automáticamente. No se instaló ni compiló una aplicación React completa.

## Alcance

Los 18 tickets del listado fueron extraídos: 3 en Espera de Respuesta, 7 en Solicitud de Finalización y 8 Finalizados. Todos muestran prioridad Alta. El perfil reportó un usuario. La navegación ofrece Inicio, Atención a Clientes y Perfil del Usuario.

Es una copia estática, sin sincronización. No es una exportación completa de la base de datos ni incluye registros fuera de los permisos de esta cuenta. Los valores N/A se normalizan a null y se conservan en los archivos originales. Las fechas se guardan como texto sin inferir la zona horaria del servidor. Algunos párrafos aparecen concatenados tal como el texto del DOM.

El detalle revisado del ticket 7318 mostró Release, Comentarios Finales y pestañas Archivos Adjuntos y Auditoría. La sección de adjuntos permaneció en cargando. No se descargaron adjuntos ni se extrajo auditoría. No se revisaron individualmente los detalles de los otros 17 tickets.

El menú Reporte ofrece Documento PDF, Imagen de varias páginas, Hoja de cálculo y Microsoft Word; no se generaron esos reportes. No se identificó ni verificó una API. Para conexión en vivo se necesita confirmar el mecanismo de integración y autenticación con el administrador.

El paquete contiene datos internos de la cuenta, sin cookies ni contraseñas.

## Seguimiento recuperado — 26 de octubre de 2026

Se recuperaron 72 comentarios de los 18 tickets desde el panel Seguimiento Tickets que aparece debajo del listado al seleccionar una fila. Se recorrieron todas las páginas y se verificó que el número extraído coincidiera con el total reportado para cada ticket.

Cada ticket de tickets.json incluye ahora seguimiento (ordenado por consecutivo ascendente) y totalSeguimientos. Cada comentario contiene consecutivo, fechaTexto, fechaVisible, fechaISO, comentario completo, cortesia y personalEnAtencion. fechaISO procede del atributo de fecha expuesto por la propia interfaz; no se calculó una zona horaria.

seguimientos.json contiene únicamente los historiales. seguimientos-originales.json conserva los registros y el texto de las páginas como trazabilidad. Tickets.jsx muestra la conversación dentro del detalle desplegable. Los comentarios se renderizan como texto y conservan los saltos de párrafo.

Esta actualización incorpora seguimiento; los adjuntos continúan sin descargar. Se mantienen las limitaciones de copia estática y del alcance de la cuenta. El paquete no se conecta automáticamente al sistema original.

Nota de integridad: el ticket 4473 tiene dos comentarios distintos con consecutivo 2 en el sistema original, con fechas y textos diferentes. Se conservaron ambos; no se renumeraron. La clave de React combina consecutivo y fechaISO para mostrarlos correctamente. Se validaron los 72 registros por ticket, fecha, consecutivo y texto, además del total reportado en pantalla.

## Ejecutar localmente

La aplicación React fue preparada y compilada correctamente. Para volver a iniciarla, abre iniciar.cmd en esta carpeta, o ejecuta npm run dev -- --port 5173 --strictPort. Visita http://127.0.0.1:5173/. Si se copia el proyecto sin node_modules a otro equipo, ejecuta npm install primero. Se verificaron la carga del listado, la búsqueda por ticket y el despliegue de comentarios.

## Exportación con plantilla

El menú inicial y la consulta de DCBMI incluyen Exportar Excel. La exportación consolida los sistemas registrados en sistemas.json que ya tienen datos, con filtros por área, número de ticket, fecha de creación y fecha de respuesta. Todos los extremos son inclusivos. Solo DCBMI tiene información cargada actualmente.

Se genera una fila por ticket, con su última respuesta dentro del rango de fechas de respuesta. Al usar ese filtro, se excluyen los tickets que no tienen respuestas en el periodo. Sin ese filtro, se incluye cada ticket y su última respuesta disponible. Los finalizados van a Finalizados; cualquier otro estatus va a Nuevo sistema. Asunto utiliza la descripción detallada. Atendio en SIRE usa el último personal de atención distinto de Clientes entre las respuestas seleccionadas. Las fechas se exportan como valores numéricos de Excel con formato dd/mm/yyyy.

La plantilla está en server/plantilla.xlsx; el archivo original de Downloads no se modifica. Se conservan las hojas, encabezados, colores, tablas y validaciones. Las columnas Asunto y Respuesta se amplían y las alturas de las filas se ajustan para lectura. El concentrado se genera mediante el servicio local integrado en Vite y requiere ejecutar npm run dev; el HTML estático de dist por sí solo no incluye ese servicio.

Para registrar información de otro sistema, coloca un JSON con la misma estructura de tickets.json en datos/ y asigna en sistemas.json la ruta datos/archivo.json. El exportador consolida todos los archivos registrados. No comparte los tickets de DCBMI con otras áreas.

## Filtros de respuestas

La consulta y la exportación permiten incluir palabras (todas o alguna), excluir respuestas que contengan ciertos términos y seleccionar a la persona remitente. Los términos se separan con espacios o comas y no distinguen acentos ni mayúsculas. Se combinan con el rango de fechas sobre la misma respuesta, no sobre comentarios diferentes del ticket. Si hay filtros de seguimiento, solo se incluyen tickets con coincidencias. El Excel usa la última respuesta coincidente. Al abrir la exportación desde la consulta se conservan estos filtros y los rangos de fechas/números.

## Elegir respuesta de tickets finalizados

Antes de exportar, la sección Respuesta a exportar de los tickets finalizados permite desplegar cada ticket y seleccionar una de sus últimas cinco respuestas coincidentes con los filtros. Si hay menos de cinco, muestra las disponibles. La selección afecta al texto y la fecha exportados; los tickets de otros estatus conservan la última coincidencia automática. Por defecto se selecciona la más reciente. Cambiar filtros reinicia las selecciones para evitar exportar respuestas fuera de los criterios. El servidor valida nuevamente la selección antes de generar el Excel.

## Actualizar el Excel en Google Drive
En Exportar Excel, usa «Revisar cambios en la nube». El destino es el archivo .xlsm enlazado por el usuario. La copia de referencia consultada el 27/10/2026 solo permite revisar; no habilita escrituras.

Para conectar la página:
1. Habilita Google Drive API en un proyecto de Google Cloud.
2. Configura el consentimiento OAuth y agrega tu correo como usuario de prueba si corresponde.
3. Crea un cliente OAuth de tipo Aplicación web y autoriza el origen que aparece en la pantalla.
4. Pega el ID público en la página, o define VITE_GOOGLE_CLIENT_ID en .env.local y reinicia Vite. No se requiere client secret.
5. Conecta Google, compara con el archivo actual, revisa los valores y marca los tickets a aplicar. La escritura exige una confirmación explícita.

El acceso OAuth de Google Drive solo se mantiene en memoria. La aplicación usa el archivo de destino guardado en «Configurar nube» y conserva el formato .xlsm. Se vuelve a descargar el archivo antes de aplicar para comprobar cambios concurrentes y se verifica la descarga posterior. Evita editar el documento en paralelo durante la actualización: la comprobación de versión previa no constituye un bloqueo exclusivo de Drive.

La lectura y preparación local usan el runtime Python y Node incluido en Codex. Los valores se preparan con artifact-tool; la combinación del paquete Office conserva los componentes originales, incluidos VBA, estilos, relaciones y validaciones, y cambia solo las celdas aprobadas. La aplicación no ejecuta macros. Los tickets duplicados, las filas con fórmulas y los valores incompatibles se muestran como conflictos y no se actualizan.


La opción «Configurar nube» permite guardar el enlace del Excel y el ID público OAuth en el navegador. También está disponible desde la revisión en la nube. Cada cambio de configuración descarta la conexión y las diferencias anteriores. No se guardan tokens ni contraseñas.


## Destino actualizado: Google Sheets
El destino predeterminado es https://docs.google.com/spreadsheets/d/1Y6KA844McQe0M3bp0p7Ryx8piRj8OI-x31peK9pOBN0/edit . La aplicación detecta el formato nativo y utiliza Google Sheets API para leer celdas y validaciones y aplicar cambios confirmados mediante batchUpdate, sin reemplazar el documento con un archivo Office. Habilita Google Sheets API además de Google Drive API en el proyecto OAuth. La comprobación anterior a la escritura no constituye un bloqueo exclusivo; evita modificaciones simultáneas durante la actualización.

## Datos actualizados al iniciar sesión en SIRE
Al seleccionar un área, usa «Iniciar sesión y actualizar datos» con sus credenciales de SIRE. La aplicación recupera todas las páginas del listado y del seguimiento antes de abrir la sesión. Muestra el avance y permite cancelar. Las contraseñas se utilizan en memoria durante la conexión, no se escriben en los archivos del proyecto ni en el navegador de la aplicación.

La captura completa se guarda en server/cache-sire y se utiliza también para el Excel y la comparación de Google Sheets. Si se cancela o falla la recuperación, la captura anterior se conserva. «Ver última copia guardada» permite consultarla sin iniciar una nueva conexión. La recuperación usa Google Chrome instalado y la biblioteca Playwright del runtime de Codex; no descarga adjuntos.
