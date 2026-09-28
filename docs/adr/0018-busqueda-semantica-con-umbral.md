# 0018. Búsqueda semántica con umbral mínimo

## Estado

Aceptada

## Contexto

Cada pregunta del chat necesita los chunks más relevantes de los documentos indexados. Una pregunta que no tiene nada que ver con ellos no debería llegar al LLM: gasta tokens y tiempo, y aumenta el riesgo de una respuesta inventada. Además, el contexto enviado al LLM debe caber en su ventana junto con el prompt de sistema, el historial y la respuesta.

## Decisión

`RetrievalService.retrieve(query)` genera el embedding de la consulta (con el prefijo `search_query: ` de `nomic-embed-text`), busca los `TOP_K = 3` chunks más similares y conserva solo los que superan el umbral `minScore` del modelo de embeddings, definido en su catálogo ([0008](0008-catalogo-de-modelos-de-embeddings.md)). El filtro se aplica resultado por resultado: un chunk poco relevante no entra al contexto aunque otro sí supere el umbral. Siempre se registra en el log el mejor puntaje, lo supere o no, para poder revisar la calibración. Si ningún chunk supera el umbral, el resultado es vacío y el chat responde un mensaje genérico sin llamar al LLM.

### Ventana de contexto y tope

La ventana de contexto de Ollama se fija en 4096 tokens con `OLLAMA_CONTEXT_LENGTH` en el compose. Según su documentación, es el valor por defecto en equipos con menos de 24 GB de VRAM, pero fijarlo evita que cambie con la versión o el hardware. Si el prompt supera la ventana, Ollama descarta el principio, que es donde está el prompt de sistema. Por eso el texto de los chunks recuperados se limita a `MAX_CONTEXT_CHARS = 6000`: se suman en orden de relevancia y el que excede el tope se recorta, aunque sea una tabla grande. El reparto aproximado de la ventana es:

| Parte | Tokens aprox. |
|-------|---------------|
| Prompt de sistema | 400 |
| Historial (con tope propio en el chat) | 600 |
| Pregunta | 100 |
| Contexto recuperado (6000 caracteres a unos 3,2 caracteres por token) | 1900 |
| Reserva para la respuesta | 1000 |

`TOP_K`, la ventana y la memoria están ligados: recuperar más chunks exige una ventana mayor, y una ventana mayor aumenta la memoria que Ollama reserva por modelo cargado. En un Docker con poca memoria eso compite con Unstructured, que ya ocupa unos 1,3 GB en reposo ([0013](0013-extraccion-con-unstructured.md)). Subir `TOP_K` implica revisar a la vez `MAX_CONTEXT_CHARS`, `OLLAMA_CONTEXT_LENGTH` y la memoria asignada a Docker.

### Preguntas de seguimiento

`retrieve()` recibe un solo texto; qué texto enviar lo decide el chat. Primero busca con la pregunta actual y, solo si ningún resultado supera el umbral, reintenta con la pregunta anterior del usuario más la actual. Así los seguimientos elípticos ("¿Y el de double?") funcionan sin que un cambio de tema quede contaminado por la pregunta anterior.

### Calibración del umbral

El umbral se calibró con dos PDF reales, indexados cada uno por separado: una guía de colecciones en Java (4 páginas) y un artículo técnico sobre un material de cáscara de chontaduro (10 páginas a dos columnas). Para cada documento se formularon preguntas cuya respuesta está en el documento (grupo A) y preguntas cuya respuesta no está (grupo B): tres fuera de tema y siete del mismo tema no cubiertas. Se registró el mejor puntaje de cada pregunta, la página del mejor chunk y si el chunk con la respuesta quedaba entre los 3 recuperados. Los documentos y las preguntas no se versionan. Los puntajes finales, tras las correcciones de chunking de [0014](0014-chunking-por-layout.md), son:

| | Guía de Java | Artículo |
|---|---|---|
| A (10 y 14 preguntas): mínimo · mediana · máximo | 0.626 · 0.771 · 0.845 | 0.638 · 0.729 · 0.815 |
| B fuera de tema | 0.593 · 0.599 · 0.607 | 0.567 · 0.626 · 0.638 |
| B mismo tema | 0.598 – 0.733 | 0.687 – 0.780 |

Las distribuciones se solapan en ambos documentos, incluso con preguntas fuera de tema ("¿Cómo se prepara un arroz con pollo?" obtuvo 0.638, más que dos preguntas válidas). Ante un solapamiento se eligió un valor bajo, porque un umbral alto rechaza preguntas válidas sin corrección posible, mientras que el prompt defensivo del chat es una segunda barrera.

**Umbral de `nomic-embed-text`: 0.61.** El margen es estrecho: la pregunta válida con menor mejor puntaje obtuvo 0.626, y en "¿Qué máquina se usó para el ensayo de tracción?" el chunk con la respuesta (INSTRON 5582) quedó 2.º con **0.616**: con 0.62 se descartaba y con 0.61 entra. Bajar a 0.60 no recupera más preguntas válidas y deja pasar "¿Cómo preparo un café espresso?" (0.607). El valor es propio de `nomic-embed-text`: otro modelo distribuye los puntajes de otra forma. El umbral de `text-embedding-3-small` (0.3) es provisional y no está calibrado.

## Consecuencias

- Con 0.61 se aceptan las 24 preguntas válidas; se rechazan 4 de las 6 preguntas fuera de tema, pero solo 1 de las 17 del mismo tema. El umbral filtra lo claramente ajeno; el prompt defensivo es la barrera principal frente a preguntas cercanas al tema que el documento no responde.
- Con documentos de un solo tema, `nomic-embed-text` da similitudes altas a cualquier pregunta del mismo dominio, lo que limita cuánto puede discriminar un umbral.
- El umbral debe recalibrarse si cambia el modelo de embeddings, el chunking o el tipo de documentos. El procedimiento es el descrito arriba: grupos A y B por documento, mejor puntaje por pregunta y umbral en el hueco o, si hay solapamiento, algo por debajo de la pregunta válida más baja.
- En preguntas de seguimiento de la calibración ("¿Y el de double?", 0.642; "¿Y la de la probeta C?", 0.675) la pregunta sola superó el umbral, sin necesitar el respaldo.
