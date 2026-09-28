# 0016. Imágenes en disco servidas como estáticos, con volumen

## Estado

Aceptada

## Contexto

La respuesta del chat debe incluir las imágenes asociadas a los chunks recuperados. Unstructured las entrega en base64. Guardarlas así en el payload de Qdrant haría pesados los puntos y las respuestas del chat, y el frontend tendría que decodificarlas.

## Decisión

`ImageStorageService` guarda en disco solo las imágenes asociadas a algún chunk, en `storage/images/<documentId>/p<página>-<n>.<ext>`, con la extensión según su tipo MIME (Unstructured las devuelve en JPEG). El payload de cada chunk guarda sus URLs relativas (`/images/<documentId>/<archivo>`).

La API las sirve como archivos estáticos con `useStaticAssets` de Express, que ya incluye `@nestjs/platform-express`, sin dependencias nuevas. Si la ingesta de un documento falla, sus imágenes se borran.

La carpeta se monta en el volumen `api_images`. Es una excepción a la política de datos efímeros ([0004](0004-solo-ollama-persiste-en-volumen.md)): la API se reconstruye con frecuencia durante el desarrollo y Qdrant no, así que sin volumen los chunks indexados apuntarían a imágenes que ya no existen.

## Consecuencias

- El payload y la respuesta del chat solo llevan URLs; el navegador descarga y cachea las imágenes.
- Las imágenes sobreviven a las reconstrucciones de la API. Si se recrea el contenedor de Qdrant (por ejemplo con `docker compose down`), sus datos se pierden y quedan imágenes huérfanas en `api_images` hasta que se borre ese volumen (`docker compose down -v`, que también borra los modelos de Ollama).
- Las imágenes son públicas para quien conozca la URL, aceptable en un entorno de demostración; el `documentId` es un UUID difícil de adivinar.
