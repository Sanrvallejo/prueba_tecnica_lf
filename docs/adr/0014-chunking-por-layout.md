# 0014. Chunking por layout propio

## Estado

Aceptada

## Contexto

La respuesta del chat debe citar documento y página y mostrar las imágenes relacionadas, así que cada chunk necesita conservar su página, sus coordenadas y las imágenes cercanas. Unstructured ofrece un chunking por título, pero al agrupar los elementos dificulta conservar las coordenadas necesarias para asociar imágenes.

## Decisión

Se piden a Unstructured los elementos sin agrupar (ver [0013](0013-extraccion-con-unstructured.md)) y el chunking se hace en `ChunkingService`:

- Se descartan los encabezados, pies y números de página (`Header`, `Footer`, `PageNumber`).
- Cada título abre un chunk nuevo y su texto va como prefijo de los chunks de su sección.
- Los chunks de texto se cortan al cambiar de página y al superar 1500 caracteres.
- Cada tabla es un chunk propio y completo. Para el LLM se guarda su HTML; para el embedding se usa su texto plano con el prefijo de sección, porque las etiquetas HTML añaden ruido.
- El bounding box del chunk es el rectángulo que envuelve sus elementos, normalizado (ver [0012](0012-bounding-boxes-normalizados.md)).
- Cada imagen se asocia al chunk de su misma página cuyo rectángulo esté a menor distancia (0 si se solapan). Si la página no tiene chunks, se asocia al último chunk de la página anterior y, si no hay ninguno antes, al primero posterior. Se descartan las imágenes que ocupan menos del 5 % de la página (logos, íconos).
- El texto enviado al embedding se recorta al máximo que admite el modelo (ver la actualización de [0008](0008-catalogo-de-modelos-de-embeddings.md)).

## Problemas encontrados en pruebas

Las reglas se probaron con la salida real de Unstructured sobre PDF generados para ello:

1. **HTML de tablas incompleto.** En una tabla simple, `text_as_html` perdió filas y agregó una celda espuria, mientras que el texto plano estaba completo. Solución: si el HTML contiene menos texto que el campo `text`, se usa el texto plano también para el LLM.
2. **Pies de página no clasificados.** Unstructured clasificó como `NarrativeText` un pie con la ruta del archivo y el número de página. Además de ensuciar los chunks, hacía que la imagen de una página sin texto se asociara a ese pie. Solución: además del filtro por tipo, se descartan los elementos de texto que están completamente dentro del 5 % superior o inferior de la página.
3. **Elementos más largos que el máximo.** Unstructured entregó un párrafo de unos 2700 caracteres como un solo elemento, y el corte por tamaño solo actuaba entre elementos. Solución: los elementos de más de 1500 caracteres se parten por límites de oración (y por caracteres si una sola oración supera el máximo). Las tablas quedan fuera de esta regla.

## Consecuencias

- Cada chunk conserva página, coordenadas e imágenes, lo que permite citar fuentes y mostrar imágenes en la respuesta.
- El filtro de márgenes puede descartar texto real pegado al borde de la página, algo poco habitual en documentos con márgenes.
- Las partes de un elemento dividido comparten el bounding box del elemento completo.
- Una tabla muy grande queda en un solo chunk y su embedding solo representa el inicio recortado.
