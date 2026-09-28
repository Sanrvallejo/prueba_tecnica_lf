# 0017. Verificación de salud con GET /health

## Estado

Aceptada

## Contexto

La API arranca sin esperar a sus dependencias ([0008](0008-catalogo-de-modelos-de-embeddings.md), [0011](0011-creacion-perezosa-de-la-coleccion.md)). En el primer arranque, Ollama puede estar descargando el modelo de embeddings y Unstructured cargando sus modelos; subir un documento en ese momento haría fallar la ingesta.

## Decisión

`HealthService` comprueba en paralelo, con un límite de 3 segundos cada una, las cuatro dependencias de la ingesta:

- Embeddings: `EmbeddingsService.isReady()` (el modelo aparece en el proveedor, ver [0009](0009-disponibilidad-de-embeddings-con-isready.md)).
- Qdrant: `VectorStore.isReady()`.
- Unstructured: su endpoint `/healthcheck`.
- Redis: una consulta liviana a la cola (`getJobCounts`), ya que BullMQ 6 no expone directamente el cliente de Redis.

`GET /health` devuelve el estado de cada una y `ready`; responde `503` si alguna no está lista. `POST /documents` usa un guard con la misma comprobación y responde `503` con el mismo detalle. Al ser un guard, corre antes que el interceptor de subida y el archivo no llega a guardarse.

## Consecuencias

- El frontend puede deshabilitar la subida mientras `GET /health` no responda `200`.
- Cada subida hace cuatro comprobaciones de red; es un costo menor frente al tiempo de ingesta.
- La verificación no incluye al LLM: la disponibilidad del modelo de chat se resuelve en el módulo de chat.
