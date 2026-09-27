# 0001. Registrar decisiones con ADR

## Estado

Aceptada

## Contexto

El sistema RAG se construye módulo a módulo y varias decisiones (proveedores de LLM, embeddings, base vectorial, chunking) condicionan a las siguientes. Sin un registro, el motivo de cada decisión se pierde y es difícil revisarla más adelante.

## Decisión

Cada decisión de arquitectura se registra en un ADR propio dentro de `docs/adr`, con el formato de Michael Nygard (Estado, Contexto, Decisión, Consecuencias), numerado de forma correlativa y escrito en español.

## Consecuencias

- El historial de decisiones queda versionado junto al código.
- Cambiar una decisión implica escribir un ADR nuevo que reemplace al anterior, en lugar de editarlo.
