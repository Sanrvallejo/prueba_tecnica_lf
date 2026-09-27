# 0012. Bounding boxes normalizados

## Estado

Aceptada

## Contexto

Unstructured entrega las coordenadas de cada elemento como cuatro puntos en el sistema de la página (píxeles o puntos, según el modo de extracción), junto con el ancho y alto de esa página. Un chunk agrupa varios elementos, y sus coordenadas se usan para asociar imágenes al chunk más cercano y podrían usarse para resaltar la zona en el frontend.

## Decisión

Cada chunk guarda un único rectángulo `{x1, y1, x2, y2}` que envuelve a todos sus elementos, normalizado entre 0 y 1 dividiendo por el ancho y alto de la página. La normalización se calcula durante el chunking.

## Consecuencias

- Las coordenadas son interpretables sin guardar el tamaño de la página ni conocer el modo de extracción.
- Comparar posiciones entre chunks e imágenes de la misma página es directo.
- Se pierde la forma exacta de cada elemento dentro del chunk; solo se conoce su envolvente.
