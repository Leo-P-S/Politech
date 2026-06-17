# Politech — Módulo IA & Web Scraping

Backend de recolección de noticias y análisis político mediante Inteligencia Artificial (Google Gemini). Forma parte del sistema Politech.

## Arquitectura del Módulo

```
backend/
├── app.js                  # Servidor Express + definición de endpoints REST
├── models/
│   ├── Candidate.js        # Schema MongoDB principal (candidatos + noticias)
│   └── Config.js           # Schema de configuración global (horario del cron)
├── worker/
│   ├── index.js            # Orquestador del pipeline (scraping → IA → BD)
│   ├── logger.js           # Logger centralizado (Winston + SSE emitter)
│   └── services/
│       ├── scraperService.js  # Descubrimiento de URLs (RSS, GDELT, NewsAPI)
│       ├── aiService.js       # Análisis de noticias con Google Gemini
│       └── dbService.js       # Persistencia con deduplicación automática
├── cron/
│   └── cronManager.js      # Programación automática del pipeline de IA
└── tests/                  # Tests unitarios e integración
```

## Requisitos

- Node.js >= 20
- MongoDB >= 6.0 (local o Atlas)

## Instalación

```bash
# Desde la raíz del repositorio
cd backend

# Instalar dependencias
npm install

# Copiar la plantilla de variables de entorno
cp .env.example .env
# Editar .env con tus API Keys reales
```

## Variables de Entorno

Ver [`backend/.env.example`](.env.example) para la lista completa. Las obligatorias son:

| Variable | Descripción |
|---|---|
| `MONGO_URI` | URI de conexión a MongoDB |
| `GEMINI_API_KEY` | API Key de Google AI Studio |
| `NEWS_API_KEY` | API Key de NewsAPI.org |

## Ejecución

```bash
# Iniciar MongoDB (con Docker)
docker-compose up -d

# Modo desarrollo (con hot-reload)
npm run dev

# Modo producción
npm start

# Correr tests
npm test
```

## API REST

Ver [`API_CONTRACT.md`](../API_CONTRACT.md) en la raíz del repositorio para la documentación completa de todos los endpoints, formatos de request/response y esquema de datos de MongoDB.

## Pipeline de Datos

El flujo de datos sigue este orden:

```
POST /api/trigger
      │
      ▼
[scraperService]  ─── RSS / GDELT / NewsAPI ──► URLs descubiertas
      │
      ▼
[scraperService]  ─── Extracción de texto (Readability) ──► contenido_crudo
      │
      ▼
[dbService]       ─── Deduplicación (URL + contenido) ──► guarda en MongoDB
      │
      ▼
POST /api/ai/process  (manual o via cron automático)
      │
      ▼
[aiService]       ─── Google Gemini API ──► analisis_ia (resumen, sentimiento, etc.)
      │
      ▼
[dbService]       ─── Actualiza noticias con analisis_ia en MongoDB
```

## CI/CD

El pipeline de CI/CD está definido en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. **Tests + ESLint** — Se ejecutan en cada PR hacia `main`
2. **Deploy Dev** — Auto-deploy a Render (dev) al mergear a `main`
3. **Smoke Test** — Verifica que `/health` responde en el servidor de dev
4. **Deploy Prod** — Deploy a producción solo si el smoke test pasa

### Secrets requeridos en GitHub

| Secret | Descripción |
|---|---|
| `RENDER_BACKEND_DEV` | Deploy hook URL de Render (entorno dev) |
| `RENDER_FRONTEND_DEV` | Deploy hook URL de Render frontend (entorno dev) |
| `RENDER_BACKEND_PROD` | Deploy hook URL de Render (entorno prod) |
| `RENDER_FRONTEND_PROD` | Deploy hook URL de Render frontend (entorno prod) |
