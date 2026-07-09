# Politech - Developer Guide & Bitácora de Integración

Este documento sirve como bitácora y guía técnica de los avances realizados en la arquitectura, integración de base de datos, pipeline de IA, frontend moderno, autenticación y seguridad en el proyecto Politech.

---

## 1. Arquitectura Unificada y Modelo de Base de Datos

* **Consolidación de Modelos:**
  * Toda la estructura de candidatos se maneja en el modelo [Candidato.js](file:///home/o1101ol/Repositorios/Politech/backend/models/Candidato.js) en el backend.
  * Almacena datos estáticos (`nombre`, `partidoPolitico`, `antecedentesJudiciales`), propuestas de gobierno (`propuestas`), historial de noticias (`historial_noticias` de tipo `noticiaSchema`) y la síntesis inteligente (`resumenIA`).
  * **Modelo de Administradores:** Implementamos [Admin.js](file:///home/o1101ol/Repositorios/Politech/backend/models/Admin.js) para los administradores con contraseñas encriptadas vía **Bcrypt**.
  * **Modelo de Electores:** Implementamos [Elector.js](file:///home/o1101ol/Repositorios/Politech/backend/models/Elector.js) para almacenar los electores, su historial de búsquedas recientes (`recentSearches`) e identificadores de candidatos suscritos para recibir alertas (`alertSubscriptions`).

* **Unificación de Rutas API:**
  * Todas las rutas se administran desde [routes/candidato.routes.js](file:///home/o1101ol/Repositorios/Politech/backend/routes/candidato.routes.js) e [routes/elector.routes.js](file:///home/o1101ol/Repositorios/Politech/backend/routes/elector.routes.js).
  * **Rutas Públicas/Electores Nuevas:** 
    * `GET /api/candidatos/search?q=...` para el autocompletado del buscador.
    * `GET /api/candidatos/:id` para obtener el perfil estructurado.
    * `GET /api/elector/searches` y `POST /api/elector/searches` para búsquedas recientes.
    * `POST /api/elector/alerts/subscribe` y `GET /api/elector/alerts` para suscripción y visualización de alertas.
  * **Rutas de Administración:**
    * `DELETE /api/candidatos/:candidateId/news/:newsId` para eliminar una noticia de un candidato de forma individual.

---

## 2. Flujo del Pipeline y Seguridad (Scraping ➔ IA)

El procesamiento está modularizado e implementa lotes y control de flujo de la siguiente manera:

```mermaid
graph TD
    A[Panel Admin: Iniciar Scraping Manual] -->|Guarda Noticias en Estado Crudo| B[(MongoDB)]
    B -->|Espera que el usuario presione el botón o ejecute el Cron| C[Procesamiento de IA Manual/Automático]
    C -->|Gemini Genera Resumen y Análisis por Lotes| D[Noticias Procesadas por IA (resumenIA)]
```

### Optimización de Lotes (Batching) y Rate Limiting
- **Procesamiento en Lotes:** El servicio de IA procesa las noticias en lotes de **5 en 5** usando `aiService.processAllArticles` para no sobrecargar el payload enviado al API de Gemini.
- **Delay de Seguridad:** Se implementó una pausa forzada de **4 segundos** (usando `setTimeout` promisificado) entre solicitudes de lote para evitar el bloqueo por Rate Limits (Error 429) de la cuota gratuita de Gemini.
- **Contexto Perú:** El prompt fue actualizado con instrucciones estrictas que sitúan al modelo en la coyuntura del periodismo y la política peruanas, forzando un retorno en formato JSON estructurado con `sentimiento`, `sesgo_politico` y `categoria`.

### Seguridad y Autenticación (RNF04, RNF10)
- **Token JWT:** El middleware `auth.middleware.js` protege las rutas sensibles de administración, verificando el rol `admin` y aplicando expiración automática a los 30 minutos de inactividad.

---

## 3. Frontend Moderno (React + Vite + Tailwind v4)

Hemos migrado y estructurado la capa de presentación a una **Single Page Application (SPA)** en `/frontend`.

* **Novedades en Vistas y Componentes:**
  * **[DataTabs.jsx](file:///home/o1101ol/Repositorios/Politech/frontend/src/components/DataTabs.jsx):** Ahora expone visualmente insignias coloridas de **Sentimiento** (verde para positivo, rojo para negativo, gris para neutral) y **Sesgo Político** (amarillo) junto a cada noticia verificada del candidato.
  * **[AdminDashboard.jsx](file:///home/o1101ol/Repositorios/Politech/frontend/src/pages/AdminDashboard.jsx) (Gestión de Noticias):** Añadimos un ícono de ojo en la lista de candidatos que despliega un modal. Este modal consulta en tiempo real las noticias asociadas, permitiendo que el administrador lea el titular, la clasificación y elimine elementos individuales de la base de datos al instante.
  * **Corrección de Logs en Vivo (SSE):** Ampliamos el listado `SAFE_KEYWORDS` en el transportador del logger (`backend/worker/logger.js`) para que logs críticos del pipeline de IA y los errores no sean filtrados y se muestren en tiempo real en la consola de logs.

---

## 4. Instrucciones para Desarrollo Local

### Configuración del Entorno (`.env`)
En el directorio `backend/` debes configurar las variables de entorno en tu archivo `.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/politech
GEMINI_API_KEY=dummy_key_for_testing
MOCK_MODE=true
JWT_SECRET=tu_secreto_super_seguro_jwt
```

### Ejecutar la Aplicación en Modo de Desarrollo

1. **Terminal 1 - Backend (Puerto 3000):**
   ```bash
   cd backend
   npm run dev
   ```
   
2. **Terminal 2 - Frontend (Vite Dev Server - Puerto 5173 con Hot-Reload):**
   ```bash
   cd frontend
   npm run dev
   ```
   * Accede a la SPA de desarrollo en: **[http://localhost:5173](http://localhost:5173)**
   * El archivo `vite.config.mjs` cuenta con un proxy que redirige las llamadas `/api` al puerto 3000 de forma transparente.

3. **Terminal 2 (Alternativa) - Ejecución de Producción Compilada (Puerto 3001):**
   ```bash
   cd frontend
   npm run build
   npm start
   ```
   * Accede al frontend integrado en: **[http://localhost:3001](http://localhost:3001)**

---

## 5. Estrategia de Cobertura de Tests (≥85%)

Ejecutamos tests unitarios y de integración 100% mockeados en el backend:
```bash
cd backend
npm test
```
* **Mapeo por Índices en Tests:** Los tests de `cronManager` mockean la respuesta asíncrona de la IA. El sistema implementa un fallback por índice que permite a las suites pasar perfectamente aun si los objetos mockeados no contienen propiedades como URLs o títulos.
* **Cobertura de Front & Back:** Ambas suites (`frontend` y `backend`) corren de forma independiente asegurando la integridad del CI/CD antes de desplegar en producción.
