# 0003. Arquitectura en capas con módulos de NestJS

## Estado

Aceptada

## Contexto

El backend combina responsabilidades distintas (exponer HTTP, orquestar la lógica del RAG e integrarse con servicios externos) que deben poder evolucionar y reemplazarse por separado.

## Decisión

Se usa una arquitectura en capas apoyada en los módulos de NestJS. Cada funcionalidad es un módulo con su controlador (capa HTTP), su servicio (lógica) y sus providers (integraciones externas). Las integraciones que deben poder cambiarse se definen con interfaces (como lo exige el reto) y, cuando las elige NestJS al arrancar, se inyectan mediante tokens. Los módulos que solo prestan servicio a otros (por ejemplo, la base vectorial) no tienen controlador.

## Consecuencias

- Cada capa se puede probar de forma aislada sustituyendo sus dependencias por mocks.
- Cambiar un proveedor externo afecta solo a su implementación, no a quien la consume.
- Implica más archivos y algo de código repetitivo que una estructura plana.
