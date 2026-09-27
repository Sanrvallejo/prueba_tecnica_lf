# 0002. Contenerización con Docker Compose

## Estado

Aceptada

## Contexto

El reto exige que todo el sistema esté contenerizado. El sistema depende de varios servicios: la API en NestJS, Redis para la cola de trabajos, Qdrant como base vectorial, Ollama para el LLM y los embeddings y, más adelante, Unstructured para la extracción de documentos.

## Decisión

Todos los servicios se levantan con un único `docker-compose.yml` en la raíz del repositorio. La API se construye con un Dockerfile multi-etapa (build y ejecución) sobre `node:24-alpine` y expone el puerto 4000. Un servicio auxiliar `ollama-init` descarga los modelos `llama3.2` y `nomic-embed-text` al arrancar.

## Consecuencias

- El entorno completo se levanta con `docker compose up`.
- Los servicios se comunican por nombre dentro de la red de Compose (por ejemplo `http://ollama:11434`).
- `ollama-init` espera un tiempo fijo antes de descargar los modelos; si Ollama tarda más en arrancar, hay que relanzarlo.
- La imagen de Unstructured es pesada; se agregará cuando se implemente el módulo de documentos.
