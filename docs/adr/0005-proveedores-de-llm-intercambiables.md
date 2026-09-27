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
