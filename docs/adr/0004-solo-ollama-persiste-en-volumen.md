# 0004. Solo Ollama persiste en volumen

## Estado

Aceptada

## Contexto

El proyecto es un entorno de desarrollo y demostración. Los modelos de Ollama pesan varios GB y descargarlos en cada arranque es lento. Los datos de Qdrant (vectores) y Redis (cola de trabajos) son reproducibles volviendo a subir los documentos.

## Decisión

Solo Ollama usa un volumen con nombre (`ollama_models`). Qdrant y Redis son efímeros: sus datos se pierden al eliminar los contenedores.

## Consecuencias

- Los modelos se descargan una sola vez.
- Cada `docker compose down` deja el sistema sin documentos indexados ni trabajos, lo que simplifica las demostraciones desde cero.

## Actualización (2026-09-27)

Las imágenes extraídas de los documentos también persisten, en el volumen `api_images`, como excepción a esta política. Ver [0016](0016-imagenes-en-disco-con-volumen.md).
