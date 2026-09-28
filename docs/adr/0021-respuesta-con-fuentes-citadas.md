# 0021. Respuesta con fuentes citadas e imágenes deduplicadas

## Estado

Aceptada

## Contexto

La respuesta del chat debe incluir el texto, las fuentes (documento y página) y las imágenes relacionadas. Se recuperan hasta 3 fragmentos ([0018](0018-busqueda-semantica-con-umbral.md)), pero no todos tienen por qué haberse usado en la respuesta, y una misma imagen puede estar asociada a varios fragmentos ([0014](0014-chunking-por-layout.md)).

## Decisión

`POST /chat` responde `{ answer, sources, images }`:

- `answer`: el texto del LLM, conservando sus citas `[n]` para que el frontend pueda mostrarlas.
- Se extraen las citas válidas de la respuesta (`[1]`, `[2]` o `[1, 3]`, con números entre 1 y la cantidad de fragmentos) y solo se usan los fragmentos citados. Si la respuesta no trae ninguna cita válida, se usan todos los recuperados.
- `sources`: `documentId`, `documentName` y `page` de esos fragmentos, una vez por cada par documento y página, en orden de relevancia.
- `images`: las URLs de las imágenes de esos fragmentos, cada una una sola vez, en orden de relevancia.
- Si la respuesta es `NO_INFO` o no hubo contexto relevante, `sources` e `images` van vacíos ([0020](0020-prompt-defensivo.md)).

## Consecuencias

- Cuando el modelo cita, el usuario ve solo las fuentes e imágenes que respaldan la respuesta: con `gpt-4o-mini`, la pregunta sobre el corte láser devolvió una fuente y solo la figura correspondiente.
- Cuando el modelo no cita, como suele pasar con llama3.2, se muestran todas las fuentes e imágenes recuperadas, incluidas algunas no relacionadas: en "¿Qué es un framework?" llegaron la imagen del almacén y el diagrama de clases.
- Las citas se confían al modelo: una cita a un fragmento que no respalda la frase no se detecta.
