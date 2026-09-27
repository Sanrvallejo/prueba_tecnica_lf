# 0009. Disponibilidad de embeddings con isReady

## Estado

Aceptada

## Contexto

La API arranca sin esperar al proveedor de embeddings (ver [0008](0008-catalogo-de-modelos-de-embeddings.md)). Con Ollama, el modelo puede tardar en descargarse tras el primer `docker compose up`, y subir un documento en ese momento haría fallar la ingesta.

## Decisión

`EmbeddingClient` expone `isReady(): Promise<boolean>`. En `OpenAICompatibleEmbeddingClient` se comprueba que el modelo configurado aparezca en la lista de modelos del proveedor (`GET /v1/models`), lo que funciona igual con Ollama y con OpenAI. Ollama lista los modelos con su etiqueta, así que también se acepta `modelo:latest`. Si el proveedor no responde, devuelve `false` en lugar de lanzar un error.

Se usará en un futuro endpoint `GET /health` para que el frontend deshabilite la subida de documentos hasta que el modelo esté disponible.

## Consecuencias

- El frontend puede reflejar el estado real del sistema en lugar de fallar al subir.
- Que el modelo aparezca en la lista no garantiza que la generación funcione, pero cubre el caso habitual de la descarga pendiente.
