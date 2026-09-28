# 0006. Registro de modelos en LlmService

## Estado

Aceptada

## Contexto

El usuario elige el modelo desde el frontend en cada pregunta, por lo que la API debe saber qué modelos están disponibles y exponerlos. Algunos proveedores requieren credenciales que pueden no estar configuradas, y el sistema debe funcionar sin keys ni costo.

## Decisión

`LlmService` actúa como registro: al arrancar crea un `OpenAICompatibleClient` por cada modelo disponible y los guarda en un mapa con id `proveedor:modelo` (por ejemplo `ollama:llama3.2`).

- Ollama se registra siempre y es el modelo por defecto; su URL y modelo se leen de `OLLAMA_URL` y `OLLAMA_LLM_MODEL`.
- OpenAI se registra solo si están configurados `OPENAI_API_KEY` y `OPENAI_MODEL`.
- OpenRouter queda pendiente.

`GET /models` devuelve la lista de ids. El primero es Ollama, que el frontend usa como opción predeterminada. El servicio expone `generate(modelId, messages)`, de modo que quien lo consume nunca manipula los clientes directamente; un id no registrado responde `400 Bad Request`.

## Consecuencias

- El sistema funciona sin keys: basta con Ollama.
- El frontend solo ofrece modelos realmente configurados.
- Agregar un proveedor implica registrarlo en el constructor de `LlmService`.
- Que un modelo esté registrado no garantiza que responda (por ejemplo, si Ollama no ha descargado el modelo); el error aparece al usarlo.

## Actualización (2026-09-28)

En `POST /chat` el modelo es opcional: si no se indica, se usa `LlmService.defaultModel()`, el primer modelo registrado, que siempre es Ollama. Un id no registrado responde `400` antes de hacer la búsqueda semántica, para que el error no dependa de si hubo contexto relevante.
