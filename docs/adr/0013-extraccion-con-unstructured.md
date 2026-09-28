# 0013. Extracción de PDF con Unstructured en hi_res

## Estado

Aceptada

## Contexto

El chunking por layout necesita elementos tipados (título, párrafo, tabla, imagen, encabezado, pie), con sus coordenadas, la estructura de las tablas y las imágenes extraídas. Todo debe correr en contenedores y sin escribir un servicio en otro lenguaje.

## Decisión

Se usa la API de Unstructured en su propio contenedor (imagen oficial `unstructured-api`), llamada desde `UnstructuredClient` en `POST /general/v0/general` con:

- `strategy=hi_res`, necesaria para inferir la estructura de las tablas y extraer imágenes.
- `coordinates=true`, `pdf_infer_table_structure=true` (tablas en `text_as_html`) y `extract_image_block_types=["Image"]` (imágenes en base64).
- `languages=spa,eng` para el OCR; la imagen incluye los paquetes de Tesseract de ambos idiomas.
- Un timeout de 20 minutos (`UNSTRUCTURED_TIMEOUT_MS`), porque `hi_res` en CPU puede tardar varios minutos en documentos largos y el `fetch` de Node corta a los 5 minutos si no llegan las cabeceras. Se configura con un `Agent` de `undici`, que se agrega como dependencia.

Solo se aceptan PDF de hasta 20 MB: la extracción de coordenadas e imágenes es más fiable en PDF, y el límite acota el tiempo de procesamiento. Se valida la extensión, el tipo MIME y la firma del archivo (`%PDF-`); un archivo que no es PDF responde `400` y uno que supera el tamaño, `413`.

Alternativas consideradas: PyMuPDF o pdfplumber (requieren un servicio Python propio); MuPDF para JavaScript (liviano, pero la extracción y la estructura son más manuales); pdf-parse o pdfjs (no dan imágenes ni coordenadas de forma sencilla).

## Consecuencias

- La imagen es muy pesada: ocupa unos 32 GB en disco y la primera descarga tardó unos 40 minutos.
- `hi_res` es lento: un PDF de una página con título, tabla e imagen tardó unos 24 segundos en CPU.
- Las coordenadas llegan en píxeles de la página renderizada (`PixelSpace`), por lo que se normalizan (ver [0012](0012-bounding-boxes-normalizados.md)).
- La inferencia de estructura de tablas no siempre es fiable: en las pruebas, el HTML de una tabla simple perdió filas mientras que su texto plano estaba completo.

## Actualización (2026-09-27)

**Problema encontrado en pruebas:** al procesar un segundo documento, Unstructured respondió `503 Server is under heavy load`. Por defecto rechaza peticiones si hay menos de 2048 MB libres, y con la memoria por defecto de Docker Desktop (3,7 GB en el equipo de pruebas) sus modelos cargados ya ocupan 1,3 GB.

**Solución:** se fija `UNSTRUCTURED_MEMORY_FREE_MINIMUM_MB=512` en el compose y el README recomienda asignar al menos 8 GB a Docker, con la configuración de `.wslconfig` para Windows. Con poca memoria, un documento grande podría hacer que el sistema termine el contenedor en lugar de rechazar la petición. El 503 de Unstructured se tratará como un error reintentable en el paso de resiliencia.
