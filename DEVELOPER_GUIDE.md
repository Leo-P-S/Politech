# Politech - Developer Guide & Bitácora de Integración

Este documento sirve como bitácora y guía técnica de los avances realizados en la arquitectura, integración de base de datos, pipeline de IA, frontend moderno, autenticación y seguridad en el proyecto Politech.

---

## 1. Arquitectura Unificada y Modelo de Base de Datos

* **Consolidación de Modelos:**
  * Toda la estructura de candidatos se maneja en el modelo [Candidato.js](file:///home/o1101ol/Repositorios/Politech/backend/models/Candidato.js) en el backend.
  * Almacena datos estáticos (`nombre`, `partidoPolitico`, `antecedentesJudiciales`), propuestas de gobierno (`propuestas`), historial de noticias (`historial_noticias` de tipo `noticiaSchema`) y la síntesis inteligente (`resumenIA`).
  * **Modelo de Administradores:** Implementamos [Admin.js](file:///home/o1101ol/Repositorios/Politech/backend/models/Admin.js) para los administradores que gestionan el scraping y procesamiento de IA, con contraseñas encriptadas de forma unidireccional vía **Bcrypt**.

* **Unificación de Rutas API:**
  * Todas las rutas se administran desde [routes/candidato.routes.js](file:///home/o1101ol/Repositorios/Politech/backend/routes/candidato.routes.js).
  * **Rutas Públicas Nuevas:** 
    * `GET /api/candidatos/search?q=...` para el autocompletado en el buscador tolerante a errores tipográficos.
    * `GET /api/candidatos/:id` para obtener el perfil estructurado del candidato.
  * **Compatibilidad Heredada (Alias):** Mapeamos `/api/candidates` al mismo router. Esto permite que el panel de administración antiguo (`dashboard.html`) funcione al 100% sin tener que reescribir sus llamadas fetch.

---

## 2. Flujo del Pipeline y Seguridad (Scraping ➔ IA)

El procesamiento está dividido para evitar tiempos de espera largos:

```mermaid
graph TD
    A[Panel Admin: Iniciar Scraping Manual] -->|Guarda Noticias en Estado Crudo| B[(MongoDB)]
    B -->|Espera que el usuario presione el botón o ejecute el Cron| C[Procesamiento de IA Manual/Automático]
    C -->|Gemini Genera Resumen y Análisis| D[Noticias Procesadas por IA (resumenIA)]
```

### Seguridad y Autenticación del Administrador (RNF04, RNF10)
- **Token JWT:** Implementamos el middleware [auth.middleware.js](file:///home/o1101ol/Repositorios/Politech/backend/middlewares/auth.middleware.js) que intercepta peticiones a `/api/trigger` y `/api/ai/process`, requiriendo una cabecera `Authorization: Bearer <token>` válida.
- **Sesión de 30 Minutos:** El token JWT expira automáticamente a los 30 minutos de inactividad.

---

## 3. Frontend Moderno (React + Vite + Tailwind v4)

Hemos migrado y estructurado la capa de presentación a una **Single Page Application (SPA)** en `/frontend`.

* **Estructura de Carpetas:**
  * `frontend/src/components/`: Componentes modulares y reutilizables (`HeroSearch.jsx`, `ProfileHeader.jsx`, `AISummaryCard.jsx`, `DataTabs.jsx`).
  * `frontend/src/pages/`: Vistas de página completa (`Home.jsx` y `CandidateProfile.jsx`).
  * `frontend/src/App.jsx`: Enrutador principal mediante React Router.

* **Integración de Datos:**
  * Usamos **TanStack Query** (React Query) para realizar la obtención de datos de manera asíncrona de forma rápida, reduciendo la asimetría y mostrando los resultados en menos de 2 segundos (`RNF06`).
  * La interfaz adopta el estilo **Institucional Moderno / Swiss Design** para transmitir máxima transparencia, confianza y neutralidad.

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
   * El panel heredado (Legacy Dashboard) sigue disponible en: **[http://localhost:3001/dashboard](http://localhost:3001/dashboard)**

---

## 5. Estrategia de Cobertura de Tests (≥85%)

Ejecutamos tests unitarios y de integración 100% mockeados en el backend:
```bash
cd backend
npm test
```
- **Pruebas de Express Protegidas:** Mantenemos un bypass del middleware de JWT para que la suite de integración `app.test.js` valide la funcionalidad de los controladores de forma aislada sin fallos de autenticación.
- **Mocks en Mongoose:** Los esquemas de test en Jest heredan las funciones `.pre` y `.set` requeridas por el hashing de contraseñas de `bcryptjs`.
- **Lint de Seguridad:** `npm run lint` ejecuta análisis estático buscando patrones de código inseguros.
