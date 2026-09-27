# 0008. Catálogo de modelos de embeddings

## Estado

Aceptada

## Contexto

La base vectorial necesita conocer la dimensión de los vectores para crear su colección. Además, algunos modelos esperan prefijos de tarea: `nomic-embed-text` fue entrenado con `search_document: ` para indexar y `search_query: ` para consultar, y sin ellos la calidad de la búsqueda baja. Obtener la dimensión consultando al proveedor al arrancar haría depender el arranque de que Ollama esté listo; detectar los prefijos por el nombre del modelo o con un flag es frágil.

## Decisión

Se mantiene un catálogo explícito (`embedding-models.catalog.ts`) donde cada modelo conocido declara su dimensión y sus prefijos:

| Modelo | Dimensión | Prefijo documento | Prefijo consulta |
|--------|-----------|-------------------|------------------|
| `nomic-embed-text` | 768 | `search_document: ` | `search_query: ` |
| `text-embedding-3-small` | 1536 | — | — |

El catálogo es la única fuente de la dimensión y el cliente aplica los prefijos según él. Si el modelo configurado no está en el catálogo, la API falla al arrancar indicando que hay que agregarlo con su dimensión y sus prefijos.

Como protección ante un catálogo mal escrito, el cliente compara la longitud del primer vector generado con la dimensión declarada y lanza un error claro si no coinciden.

## Consecuencias

- La API arranca sin depender de que el proveedor de embeddings esté disponible.
- Usar un modelo nuevo exige agregarlo al catálogo.
- Un error en el catálogo se detecta en la primera generación de embeddings, antes de insertar vectores con una dimensión incorrecta.
