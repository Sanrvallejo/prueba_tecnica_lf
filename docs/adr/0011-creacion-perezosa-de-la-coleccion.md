# 0011. Creación perezosa de la colección y verificación con isReady

## Estado

Aceptada

## Contexto

Docker Compose arranca Qdrant antes que la API, pero no espera a que esté listo. Crear la colección al arrancar haría depender el arranque de la API de Qdrant, igual que se evitó con los embeddings (ver [0008](0008-catalogo-de-modelos-de-embeddings.md)).

## Decisión

La colección se crea la primera vez que se insertan puntos (`upsert`):

- La promesa de creación se comparte, de modo que ingestas simultáneas en el mismo proceso no la crean dos veces; si falla, se descarta y se reintenta en la siguiente inserción.
- Si Qdrant responde que la colección ya existe (409, por ejemplo por otra ingesta en paralelo), se trata como éxito.
- Tras crearla, se comprueba que su dimensión coincida con la del modelo de embeddings; si no, se lanza un error indicando que hay que eliminar la colección y reindexar.
- Mientras la colección no exista, `search` devuelve una lista vacía: sin documentos, retrieval no supera el umbral y el chat responde que no tiene información.

`VectorStore` expone `isReady(): Promise<boolean>`, que comprueba que Qdrant responde. Lo usará el futuro endpoint `GET /health`.

## Consecuencias

- La API arranca aunque Qdrant no esté disponible.
- Un error de conexión con Qdrant aparece en la primera ingesta o búsqueda, no al arrancar.
- No hace falta un método para contar documentos: la ausencia de resultados cubre el caso sin documentos.
