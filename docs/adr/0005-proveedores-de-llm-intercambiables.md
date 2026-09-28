# 0005. Proveedores de LLM intercambiables

## Estado

Aceptada

## Contexto

El sistema debe poder responder con distintos proveedores de LLM (Ollama por ser gratuito, OpenAI y, más adelante, otros como OpenRouter). Ollama, OpenAI y OpenRouter exponen la misma API de Chat Completions de OpenAI; otros proveedores, como Anthropic directo, usan su propio protocolo.

## Decisión

Se define la interfaz `LlmClient` con un único método `generate(messages)`, donde cada mensaje lleva su rol (`system`, `user`, `assistant`). El rol es necesario para el prompt de sistema y el historial del chat.

Una sola implementación, `OpenAICompatibleClient`, cubre a todos los proveedores que hablan el protocolo de OpenAI usando el SDK oficial `openai`: solo cambian la URL base, la API key y el modelo. Un proveedor con otro protocolo sería otra implementación de la misma interfaz.

La interfaz no se inyecta con un token de NestJS, porque el cliente no se elige al arrancar: lo elige el usuario en cada petición (ver [0006](0006-registro-de-modelos-en-llmservice.md)).

## Consecuencias

- Agregar un proveedor compatible con OpenAI solo requiere su URL, key y modelo.
- Agregar un proveedor con otro protocolo requiere una nueva clase que implemente `LlmClient`, sin tocar a quien la consume.
- Ollama no valida la API key, pero el SDK exige una, así que se le pasa un valor fijo.

## Actualización (2026-09-28)

`OpenAICompatibleClient` fija un timeout de 120 s (`LLM_TIMEOUT_MS`) y 0 reintentos, en lugar de los 10 minutos y 2 reintentos por defecto del SDK: un modelo local en CPU puede tardar más de un minuto con el contexto completo, pero una espera mayor no es útil para el chat. Los reintentos se agregarán en el paso de resiliencia. Los errores del SDK se traducen a errores HTTP con un mensaje legible: tiempo agotado → 504; sin conexión con el proveedor o modelo no disponible → 503; cualquier otro error del proveedor → 502.

**Problemas encontrados en pruebas**, todos con Ollama en un equipo de 7,8 GB de RAM:

- Con Docker limitado a 3,7 GB (la mitad de la RAM, valor por defecto de WSL) y Unstructured en marcha, el sistema terminó el proceso de llama3.2 al cargarlo (`signal: killed`); Ollama respondió 500 y la API, 502. llama3.2 ocupa unos 2,6 GB y Unstructured entre 0,7 y 1,3 GB.
- Tras reiniciar WSL, la primera carga de llama3.2 tardó más de 2 minutos. La API cortó la petición a los 120 s (504) y, al cancelarse, Ollama abortó la carga, de modo que cada intento volvía a empezar. Ollama carga el modelo en la primera petición y lo descarga tras 5 minutos sin uso.
- Con Docker ampliado a 6 GB, Windows quedó con 0,5 GB libres y paginó a disco la memoria de la máquina virtual: el procesamiento del prompt bajó a unos 5 tokens por segundo y las respuestas superaron los 120 s (504). Se volvió a la configuración por defecto.

En un equipo de 8 GB, llama3.2 en CPU y Unstructured no conviven: hay que detener Unstructured para usar el chat con Ollama, o usar un proveedor remoto (por ejemplo, OpenAI) para el LLM. Queda pendiente decidir si mantener el modelo cargado (`OLLAMA_KEEP_ALIVE`) y precargarlo al arrancar.
