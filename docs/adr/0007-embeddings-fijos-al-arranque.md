# 0007. Embeddings fijos al arranque y separados del LLM

## Estado

Aceptada

## Contexto

Cada modelo de embeddings define su propio espacio vectorial y su dimensión: indexar documentos con un modelo y consultar con otro produce resultados sin sentido. A diferencia del LLM, el modelo de embeddings no puede cambiar por petición. Además, no todos los proveedores de LLM ofrecen embeddings (por ejemplo, Anthropic).

## Decisión

El modelo de embeddings se elige una sola vez al arrancar con `EMBEDDING_BACKEND` (`ollama` por defecto, u `openai`) y el modelo correspondiente (`OLLAMA_EMBEDDING_MODEL` u `OPENAI_EMBEDDING_MODEL`).

Se define la interfaz `EmbeddingClient`, distinta de `LlmClient` porque son responsabilidades distintas. Separa `embedDocuments` (ingesta) de `embedQuery` (pregunta del chat), porque algunos modelos tratan distinto ambos casos. La implementa `OpenAICompatibleEmbeddingClient`, válida para Ollama y OpenAI. Un factory provider crea el cliente al arrancar y NestJS lo inyecta con el token `EMBEDDING_CLIENT`.

`EmbeddingsService` consume el token y envía los textos en lotes de 32, para equilibrar la velocidad con los límites de las APIs; el cliente hace una sola petición por lote.

## Consecuencias

- Cambiar de modelo de embeddings exige reindexar todos los documentos.
- El LLM puede cambiarse por petición sin afectar al índice.
- Un `EMBEDDING_BACKEND` desconocido, o `openai` sin `OPENAI_API_KEY`, impide que la API arranque.
