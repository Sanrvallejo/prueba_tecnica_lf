# Sistema RAG multimodal

## Requisitos

- Docker con Docker Compose.
- **Memoria para Docker: al menos 8 GB.** Unstructured carga modelos de detección de layout y de tablas (unos 1,3 GB en reposo) y necesita memoria libre adicional para procesar cada documento; Ollama necesita la suya para el LLM y los embeddings.
- **Espacio en disco: unos 40 GB.** La imagen de Unstructured ocupa unos 32 GB y los modelos de Ollama unos 2,3 GB. La primera descarga puede tardar bastante; se puede hacer por adelantado con `docker compose pull`.

### Asignar memoria a Docker en Windows (WSL 2)

Docker Desktop con WSL 2 usa por defecto una parte de la RAM del equipo. Para ampliarla, crea o edita el archivo `%UserProfile%\.wslconfig`:

```ini
[wsl2]
memory=8GB
```

Luego reinicia WSL desde PowerShell y vuelve a abrir Docker Desktop:

```powershell
wsl --shutdown
```

Para comprobar la memoria disponible: `docker info --format "{{.MemTotal}}"`.
