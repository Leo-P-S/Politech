# Contrato de API — Módulo IA & Web Scraping

**Base URL (Dev):** `https://politech-backend-dev.onrender.com`  
**Base URL (Local):** `http://localhost:3000`

> Este módulo es responsabilidad del equipo de **IA y Web Scraping**. Si tienes dudas sobre estos endpoints, consulta con ese equipo antes de hacer cambios en `backend/`.

---

## Autenticación

Actualmente **no hay autenticación** en estos endpoints. Es intencional para integración interna durante desarrollo. El equipo de **seguridad/backend general** debe añadir el middleware de autenticación al integrar con el frontend de usuarios.

---

## Endpoints

### `GET /health`
Verifica que el servidor está en pie. Usado por el CI/CD en el smoke-test.

**Response `200`:**
```json
{ "status": "healthy" }
```

---

### `GET /api/candidates`
Devuelve todos los candidatos registrados con su historial de noticias completo.

**Response `200`:** Array de objetos `Candidate` (ver Esquema de Datos al final de este archivo).

---

### `POST /api/candidates`
Registra un nuevo candidato en la base de datos.

**Request Body:**
```json
{ "nombre": "Pedro Castillo" }
```

**Response `201`:** El objeto `Candidate` recién creado.  
**Response `400`:** Si el nombre ya existe o falta el campo.

---

### `DELETE /api/candidates/:id`
Elimina un candidato y todo su historial de noticias.

**Response `200`:** `{ "message": "Candidato eliminado exitosamente" }`

---

### `DELETE /api/candidates/:candidateId/news/:newsId`
Elimina una noticia específica del historial de un candidato.

**Response `200`:** El candidato actualizado sin la noticia eliminada.

---

### `POST /api/trigger`
**Endpoint principal.** Lanza el pipeline de Web Scraping en **segundo plano** para un candidato. La respuesta llega de inmediato y el scraping corre en paralelo.

Para monitorear el progreso en tiempo real, conectarse a `GET /api/logs/stream`.

**Request Body:**

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `candidateId` | `string` | Si | ID de MongoDB del candidato |
| `startDate` | `string` | Si | Fecha inicio `YYYY-MM-DD` |
| `endDate` | `string` | Si | Fecha fin `YYYY-MM-DD` |
| `useRSS` | `boolean` | No | Activar fuente RSS (noticias recientes) |
| `useGdelt` | `boolean` | No | Activar fuente GDELT (noticias históricas) |
| `useNewsApi` | `boolean` | No | Activar fuente NewsAPI (hasta 1 mes atrás) |
| `maxArticles` | `number` | No | Límite total de artículos. Default: `50` |
| `mockMode` | `boolean` | No | Si `true`, no hace peticiones reales (para testing) |

**Response `200`:**
```json
{
  "status": "started",
  "message": "Scraping iniciado para Keiko Fujimori en modo REAL."
}
```

---

### `POST /api/ai/process`
Lanza el procesamiento de IA (Gemini) sobre todas las noticias pendientes (`procesado_por_ia: false`). Proceso **asíncrono**.

**Response `200`:**
```json
{
  "status": "started",
  "message": "Procesamiento de Inteligencia Artificial iniciado para noticias pendientes."
}
```

---

### `GET /api/config/ai-schedule`
Obtiene el horario del cron automático de IA.

**Response `200`:** `{ "day": 0, "hour": 3 }` (day: 0=Domingo...6=Sabado, hour: 0-23)

---

### `POST /api/config/ai-schedule`
Actualiza el horario del cron automático de IA.

**Request Body:** `{ "day": 1, "hour": 2 }`

---

### `GET /api/logs/stream`
**Server-Sent Events (SSE).** Emite en tiempo real los logs del pipeline.

**Cómo consumirlo desde JavaScript:**
```javascript
const evtSource = new EventSource('http://localhost:3000/api/logs/stream');
evtSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(`[${log.level}] ${log.message}`);
};
```

**Formato de cada mensaje SSE:**
```json
{
  "level": "info",
  "message": "GDELT: Chunk exitoso, 12 articulos recibidos.",
  "service": "worker-pipeline",
  "timestamp": "2026-06-17 16:32:22"
}
```

---

## Esquema de Datos

### `Candidate` — Coleccion MongoDB: `candidates`

```
{
  _id:                string        // ObjectId de MongoDB
  nombre:             string        // Nombre unico del candidato
  partido:            string|null   // Partido politico (campo reservado, puede ser null)
  createdAt:          Date
  updatedAt:          Date
  historial_noticias: Noticia[]
}
```

### `Noticia` (subdocumento embebido en Candidate)

```
{
  _id:              string        // ObjectId del subdocumento
  titular:          string        // Titulo de la noticia
  fecha:            string        // "YYYY-MM-DD"
  medio_prensa:     string        // Nombre de la fuente periodistica
  enlace_origen:    string        // URL original del articulo (unico por candidato)
  contenido_crudo:  string|null   // Texto plano extraido por el scraper. Input de la IA.
  procesado_por_ia: boolean       // false = pendiente | true = analisis_ia disponible
  analisis_ia:      AnalisisIA|null
}
```

### `AnalisisIA` (generado por Gemini, campo mixto)

```
{
  resumen_noticia:  string    // Resumen objetivo en 3 oraciones o menos
  categoria:        string    // "Corrupcion" | "Campana" | "Propuesta" | "Economico" | ...
  sentimiento:      string    // "Positivo" | "Negativo" | "Neutral"
  sesgo_politico:   string    // "Critico" | "Favorable" | "Informativo" | ...
  entidades_clave:  string[]  // Personas, organizaciones y lugares mencionados
}
```

IMPORTANTE: `analisis_ia` es null hasta que se invoque `POST /api/ai/process`.
Siempre valida `procesado_por_ia === true` antes de leer sus campos.
