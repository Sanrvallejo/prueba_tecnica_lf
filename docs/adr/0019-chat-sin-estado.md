# 0019. Chat sin estado con historial del frontend

## Estado

Aceptada

## Contexto

El chat debe mantener el hilo de la conversación (historial), sin websockets, y todo su contexto debe caber en la ventana de 4096 tokens del LLM ([0018](0018-busqueda-semantica-con-umbral.md)). Guardar las conversaciones en el backend exigiría identificarlas y almacenarlas, y Redis es efímero ([0004](0004-solo-ollama-persiste-en-volumen.md)).

## Decisión

`POST /chat` no guarda estado: el frontend envía en cada petición el mensaje, el modelo (opcional) y el historial de la conversación.

- El cuerpo se valida con `class-validator` y `class-transformer`, mediante un `ValidationPipe` global que rechaza propiedades desconocidas (`whitelist` y `forbidNonWhitelisted`). Cualquier error responde `400`.
- `message` es obligatorio, no puede estar vacío ni superar 1000 caracteres.
- `history` admite como máximo 50 mensajes y solo los roles `user` y `assistant`: el cliente no puede inyectar mensajes de sistema.
- Al LLM solo llegan los últimos 6 mensajes del historial (3 turnos), descartando los más antiguos hasta no superar 2400 caracteres, unos 600 tokens de la ventana.
- La búsqueda usa el respaldo de [0018](0018-busqueda-semantica-con-umbral.md): primero la pregunta actual y, si nada supera el umbral, la pregunta anterior del usuario más la actual.

## Consecuencias

- El backend escala sin estado y cualquier instancia puede responder cualquier petición.
- El historial viaja completo en cada petición y el cliente podría alterarlo; como solo afecta a su propia conversación y no puede introducir mensajes de sistema, es aceptable.
- Al recargar la página, la conversación se pierde salvo que el frontend la guarde.
