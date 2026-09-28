# Architecture Decision Records

Cada decisión de arquitectura se registra en su propio archivo `NNNN-titulo.md` usando el formato de Michael Nygard (ver [plantilla](template.md)).

| # | Decisión | Estado |
|---|----------|--------|
| [0001](0001-registrar-decisiones-con-adr.md) | Registrar decisiones con ADR | Aceptada |
| [0002](0002-contenerizacion-con-docker-compose.md) | Contenerización con Docker Compose | Aceptada |
| [0003](0003-arquitectura-en-capas.md) | Arquitectura en capas con módulos de NestJS | Aceptada |
| [0004](0004-solo-ollama-persiste-en-volumen.md) | Solo Ollama persiste en volumen | Aceptada |
| [0005](0005-proveedores-de-llm-intercambiables.md) | Proveedores de LLM intercambiables | Aceptada |
| [0006](0006-registro-de-modelos-en-llmservice.md) | Registro de modelos en LlmService | Aceptada |
| [0007](0007-embeddings-fijos-al-arranque.md) | Embeddings fijos al arranque y separados del LLM | Aceptada |
| [0008](0008-catalogo-de-modelos-de-embeddings.md) | Catálogo de modelos de embeddings | Aceptada |
| [0009](0009-disponibilidad-de-embeddings-con-isready.md) | Disponibilidad de embeddings con isReady | Aceptada |
| [0010](0010-qdrant-como-base-vectorial.md) | Qdrant como base vectorial detrás de una interfaz | Aceptada |
| [0011](0011-creacion-perezosa-de-la-coleccion.md) | Creación perezosa de la colección y verificación con isReady | Aceptada |
| [0012](0012-bounding-boxes-normalizados.md) | Bounding boxes normalizados | Aceptada |
| [0013](0013-extraccion-con-unstructured.md) | Extracción de PDF con Unstructured en hi_res | Aceptada |
| [0014](0014-chunking-por-layout.md) | Chunking por layout propio | Aceptada |
| [0015](0015-ingesta-asincrona-con-bullmq.md) | Ingesta asíncrona con BullMQ | Aceptada |
| [0016](0016-imagenes-en-disco-con-volumen.md) | Imágenes en disco servidas como estáticos, con volumen | Aceptada |
| [0017](0017-verificacion-de-salud.md) | Verificación de salud con GET /health | Aceptada |
| [0018](0018-busqueda-semantica-con-umbral.md) | Búsqueda semántica con umbral mínimo | Aceptada |
| [0019](0019-chat-sin-estado.md) | Chat sin estado con historial del frontend | Aceptada |
| [0020](0020-prompt-defensivo.md) | Prompt defensivo con marca NO_INFO y citas | Aceptada |
| [0021](0021-respuesta-con-fuentes-citadas.md) | Respuesta con fuentes citadas e imágenes deduplicadas | Aceptada |
