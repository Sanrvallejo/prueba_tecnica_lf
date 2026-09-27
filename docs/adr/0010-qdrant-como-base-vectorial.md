# 0010. Qdrant como base vectorial detrás de una interfaz

## Estado

Aceptada

## Contexto

El RAG necesita guardar los embeddings de los chunks junto con los datos necesarios para citar fuentes y mostrar imágenes, y buscar por similitud. La base vectorial debe poder sustituirse, sobre todo por mocks en pruebas unitarias, más que por una expectativa real de cambiar de base de datos.

## Decisión

Se usa Qdrant, con el cliente oficial `@qdrant/js-client-rest`, detrás de la interfaz `VectorStore`, que NestJS inyecta con el token `VECTOR_STORE`. El módulo no tiene service ni controller propio: lo consumen documents (ingesta) y retrieval (búsqueda).

- Distancia Cosine, adecuada para embeddings de texto.
- La dimensión de la colección se toma de `EmbeddingsService`, que la obtiene del catálogo (ver [0008](0008-catalogo-de-modelos-de-embeddings.md)).
- Cada punto guarda en su payload el texto del chunk, `documentId`, `documentName`, página, bounding box (ver [0012](0012-bounding-boxes-normalizados.md)) e imágenes asociadas.
- `search` devuelve los k resultados más similares con su puntaje, sin umbral ni filtro: la búsqueda abarca todos los documentos y el umbral mínimo lo aplica retrieval. `documentId` se guarda de todas formas para poder filtrar o borrar por documento en el futuro.

Alternativas consideradas: ChromaDB, Weaviate y Milvus. Se eligió Qdrant por su imagen Docker simple, su panel web y su soporte nativo de vectores dispersos para una futura búsqueda híbrida.

## Consecuencias

- Retrieval y documents dependen solo de la interfaz y pueden probarse con un mock.
- Cambiar de base vectorial implica una nueva implementación de `VectorStore`.
- El umbral de relevancia no depende de la base vectorial.
