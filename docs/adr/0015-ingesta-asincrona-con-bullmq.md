# 0015. Ingesta asíncrona con BullMQ

## Estado

Aceptada

## Contexto

Procesar un PDF (extracción `hi_res`, chunking, embeddings e indexación) tarda de segundos a minutos, demasiado para responder dentro de la petición HTTP. El frontend debe saber cuándo cada documento está listo para usarse como contexto, sin websockets, mediante polling.

## Decisión

La ingesta se hace con una cola de BullMQ (`ingestion`) sobre Redis, usando `@nestjs/bullmq`:

- `POST /documents` guarda el PDF en un archivo temporal, encola el trabajo con `jobId` igual al `documentId` (UUID) y responde `202` con el `jobId`.
- `GET /jobs/:id` expone el estado del trabajo, mapeado desde BullMQ: `pending` (en espera), `processing` (activo), `completed` y `failed`, junto con el progreso, la etapa y, si falló, un mensaje de error legible. Responde `404` si no existe.
- El worker (`IngestionProcessor`) reporta el progreso por etapas: extracción (0–20 %), chunking (20–30 %), embeddings (30–90 %, avanzando con cada lote) e indexación (90–100 %). En un trabajo fallido, la etapa indica dónde falló y el mensaje la nombra (por ejemplo, "Falló la extracción del PDF con Unstructured: …").
- El PDF temporal se borra al terminar, tanto si el trabajo termina bien como si falla. Si falla, también se borran las imágenes ya guardadas.
- Cada trabajo tiene un solo intento: reintentar una extracción `hi_res` cuesta minutos. Los reintentos por operación (lotes de embeddings, upsert) se agregarán en el paso de resiliencia.
- Los trabajos completados y fallidos no se eliminan automáticamente, porque son el registro de documentos: `GET /documents` lista todos los trabajos con su estado, sin otra base de datos.
- El worker vive en el mismo proceso que la API y procesa un documento a la vez: el trabajo intensivo de CPU ocurre en el contenedor de Unstructured, y el worker solo coordina operaciones de espera (HTTP, embeddings, Qdrant). Puede separarse en su propio contenedor si hiciera falta escalar.

## Problemas encontrados en pruebas

- **`ioredis` ya no viene incluido.** BullMQ 6 volvió opcional su cliente de Redis; sin él, la API no arrancaba y cada intento de conexión fallaba en bucle hasta agotar la memoria del proceso. Solución: se agrega `ioredis` como dependencia explícita.
- **Nombres de archivo con tildes.** Multer entrega el nombre original en latin1; se reinterpreta como UTF-8, que es lo que envían los navegadores. Clientes que envían el nombre con otra codificación (como `curl` en Git Bash sobre Windows) lo verán alterado.

## Consecuencias

- La subida responde de inmediato y el frontend consulta el estado con polling.
- Como Redis es efímero ([0004](0004-solo-ollama-persiste-en-volumen.md)), al recrearlo se pierde el registro de documentos, igual que los vectores de Qdrant.
- Subir dos veces el mismo documento lo indexa dos veces; no hay deduplicación.
