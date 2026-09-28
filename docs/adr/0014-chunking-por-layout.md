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

## Actualización (2026-09-28)

La calibración del umbral de retrieval ([0018](0018-busqueda-semantica-con-umbral.md)) se hizo con dos PDF reales: una guía de colecciones en Java (4 páginas, títulos con fondo de color, imágenes sin pie) y un artículo técnico sobre un material de cáscara de chontaduro (10 páginas, dos columnas, figuras con pie, tablas y ecuaciones). A partir de sus resultados se hicieron dos correcciones y se cerró el chunking: cualquier caso nuevo se registra como limitación conocida.

### Correcciones

1. **Texto repetido en la misma posición.** En el artículo, el encabezado "Material compuesto de cáscara de chontaduro / Facultad de Diseño Industrial" solo se clasificó como `Header` en 2 de las 10 páginas; en las demás vino como `NarrativeText` en la franja de 0.05 a 0.06 de altura, fuera del filtro del 5 %. Generaba un chunk propio y se colaba al inicio de otros siete, desviando preguntas genéricas ("¿El material se puede mojar?") hacia esos chunks. Ahora, antes de armar los chunks se descarta todo elemento de texto, sea cual sea su tipo, cuyo texto normalizado (minúsculas, espacios colapsados y dígitos reemplazados, para cubrir numeraciones) aparece en al menos min(3, páginas) páginas distintas, con un mínimo de 2, en posiciones a menos de 0.02 entre sí. Se compara la distancia en lugar de redondear a una cuadrícula, porque el redondeo puede separar dos posiciones casi iguales que caen a cada lado de un borde de celda.
2. **Chunks propios para las figuras.** Los pies de figura se detectan por su texto (`Figura N`, `Fig. N`, `Figure N`, `Gráfico/Gráfica N`, `Imagen N`), porque Unstructured los clasifica de forma inconsistente: en el artículo vinieron como `FigureCaption`, `NarrativeText` y `UncategorizedText`. Cada pie se empareja con la imagen más cercana de su página, de uno a uno y empezando por los pares más próximos. Cada imagen con pie genera un chunk propio cuyo texto es el pie seguido del texto de OCR de la imagen (sin repetir el pie si el OCR ya lo contiene), recortado a 500 caracteres; el pie sale del flujo de texto. Las imágenes con pie quedan exentas del filtro del 5 %. Una imagen sin pie pero con al menos 30 letras de OCR también genera su propio chunk: se cuentan solo letras porque el OCR de fotos produce sobre todo símbolos y etiquetas sueltas ("(A) (B) (E) (F)…").

Además:

- Toda imagen, tenga o no chunk propio, se asocia al chunk de texto más cercano de su página. En el artículo, la gráfica de la figura 4 dejó de recuperarse al pasar a su propio chunk, porque su pie y los números de los ejes no bastan para competir con el texto que la comenta; asociada también a ese texto, vuelve a aparecer.
- Una imagen sin pie cuyo borde superior está en el 15 % superior de la página se asocia también al último chunk de texto de la página anterior, porque suele ilustrar el texto que cierra esa página. En la guía de Java, el dibujo del almacén (arriba de la página 3) ilustra el párrafo que cierra la página 2.
- Una imagen puede quedar en varios chunks: se guarda una sola vez en disco (ver la actualización de [0016](0016-imagenes-en-disco-con-volumen.md)) y la respuesta del chat debe mostrar cada imagen una sola vez.

### Limitaciones conocidas

- **Orden de las columnas.** Unstructured entrega cada párrafo de una sola columna, pero en un orden que alterna columnas, y los chunks acumulan párrafos de ambas: "…fines decorativos." queda junto a "correctamente, ocasionando que la muestra se fragmente…", mitades de frases distintas; "GPa. A continuación…" queda en medio de la explicación del módulo de Young, separado del "0,11" que le corresponde; las conclusiones de la página 10 quedan mezcladas con referencias bibliográficas. Los chunks resultantes mezclan temas y sus rectángulos ocupan todo el ancho de la página.
- **Continuaciones de tablas.** Las filas G y H de la tabla 1 quedaron en otra página como tabla sin encabezados, y la celda "Sanduchado" pasó a encabezar el chunk siguiente como si fuera un título. Las filas G y H de la tabla 3 no se detectaron como tabla. La fila C de la tabla 5 quedó partida en cinco elementos sueltos ("C", "242.31", "1.40", "0.89", "0.87") dentro de otro chunk. Los títulos "Tabla N" quedan en un chunk distinto al de su tabla.
- **Subtítulos en cursiva.** "Fabricación de muestras", "Corte láser", "Ensayo de tracción.", "Muestras obtenidas" y "Cartas de Ashby" vinieron como `NarrativeText`, no como `Title`, así que no abren sección y los chunks quedan largos y con temas mezclados.
- **Ecuaciones.** Vienen como `Formula` y se tratan como texto; las fracciones se aplanan (`𝐸 = 𝜎 𝜖 = Δ𝑦 Δ𝑥`, `𝐸 = 1.78 (1.63 100⁄ )`) y usan letras matemáticas de Unicode (`𝐸 = 109 𝑀𝑃𝑎`).
- **Caracteres extra en títulos con fondo de color.** En la guía de Java, "¿QUÉ SON LAS COLECCIONES?" se extrajo como `P¿QUÉ SON LAS COLECCIONES?P` (también `PLISTASP` y `P¿QUÉ COLECCIONES VAMOS A VER EN ESTA GUÍA?P`). Esos caracteres están en la capa de texto del propio PDF, no son un error de extracción.
- **Contenido de las imágenes.** Una imagen solo se recupera por su pie, su OCR o el texto al que está asociada. El diagrama de clases de la guía de Java tiene OCR vacío y ningún texto dice qué clases implementan `List`, así que esa pregunta no trae el diagrama. El OCR de la carta de Ashby del artículo es casi todo ruido y su chunk no se recupera con "¿Dónde se ubica el material en la carta de Ashby?".
- **Respuestas que no llegan al contexto.** En el artículo, por las limitaciones anteriores, el chunk con la respuesta no está entre los 3 recuperados en estas preguntas: "¿Cuánta resina cargada tenía la muestra D?" (fila de la tabla 1); "¿Cuál fue la carga de la probeta B en el ensayo de tracción?" y "¿Cuál fue la carga de la probeta A…?" (la tabla 5 partida: el chunk recuperado solo tiene la fila C); "¿Qué se usó como matriz o aglutinante del material?" (el chunk con "resina de pino" mezcla dos columnas y entraba 2.º solo gracias al encabezado repetido; al quitarlo, sale del top 3); y "¿El material se puede mojar?", que recupera "capacidad impermeabilizante" de la página 10 pero no la frase explícita de la página 9.
