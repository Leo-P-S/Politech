# Politech - IA & WebScraping Dashboard 🗳️🤖

Politech es una plataforma de análisis político y seguimiento mediático de candidatos electorales. Utiliza técnicas avanzadas de **Web Scraping** y procesamiento de lenguaje natural con **IA (Google Gemini)** para recolectar, estructurar, resumir y clasificar noticias en tiempo real, facilitando el análisis de categorías, sentimientos y sesgo informativo de los candidatos.

---

## 🚀 Arquitectura del Proyecto

El sistema adopta una arquitectura desacoplada estructurada en tres capas principales:

1. **Capa de Presentación (Frontend):** 
   - SPA interactiva construida en **React**, **Vite** y **Tailwind CSS**.
   - Permite acceso y registro a **Electores** (con historial de búsquedas recientes y suscripción a alertas de candidatos) y **Administradores** (con control de scraping, cron y logs).
   - **Módulo de Gestión de Noticias:** Permite a los administradores visualizar todas las noticias de un candidato y eliminar artículos de forma individual en tiempo real mediante un modal interactivo.
   - Gráficos interactivos integrados con **Chart.js** para visualizar el volumen de noticias, categorías y análisis de sentimientos.
   - Consola integrada conectada vía **Server-Sent Events (SSE)** que muestra el estado de recolección del worker en vivo (con soporte ampliado para logs de IA y control de errores).

2. **Capa de Servicio (Backend REST API):**
   - API construida sobre **Node.js** y **Express**.
   - Rutas principales bajo `/api/candidatos` (con alias `/api/candidates` para compatibilidad retroactiva) y `/api/elector`.
   - Control de sesiones seguro mediante JWT con expiración a los 30 minutos de inactividad.

3. **Pipeline de Automatización (Worker & Cron):**
   - **Scraper:** Motor de scraping multicanal que extrae y limpia texto de portales RSS, GDELT API e históricamente desde NewsAPI.
   - **IA Service (Optimizado):** Envía las noticias en **lotes de 5 artículos con un delay de seguridad de 4 segundos** entre lotes para mitigar errores de *Rate Limits* (Error 429) de la API gratuita de Gemini. Los prompts están fuertemente contextualizados en la coyuntura política y legal del **Perú**.
   - **CronManager:** Tarea agendada en segundo plano para procesar automáticamente de forma semanal las nuevas noticias recolectadas.

---

## ⚙️ Requisitos Previos

* **Node.js** v20.x o superior.
* **MongoDB** corriendo en local (puerto 27017) o acceso a **MongoDB Atlas**.
* **Docker Desktop** (opcional, para base de datos aislada).

---

## 🔧 Instalación y Arranque Rápido

Sigue estos pasos para arrancar el proyecto en desarrollo:

### 1. Clonar el repositorio e instalar dependencias

```bash
# Instalar dependencias del Backend
cd backend
npm install

# Instalar dependencias del Frontend
cd ../frontend
npm install
```

### 2. Configurar variables de entorno (`.env`)

Crea un archivo llamado `.env` dentro de la carpeta `/backend` y define lo siguiente:
```env
MONGO_URI=mongodb://127.0.0.1:27017/politech
GEMINI_API_KEY=dummy_key_for_testing
MOCK_MODE=true
JWT_SECRET=tu_secreto_super_seguro_jwt
```
> **Nota sobre Modo Simulador (Mock):** Si `MOCK_MODE=true`, la IA y el Scraper devolverán respuestas simuladas locales sin necesidad de llamadas reales o una API Key de Gemini válida. Para usar la IA real, pon `MOCK_MODE=false` e ingresa tu API Key obtenida en Google AI Studio.

*(Nota: Si deseas utilizar la base de datos local y no tienes MongoDB en tu máquina, puedes encender la base de datos levantando el contenedor de Docker: `docker compose up -d` en la raíz del proyecto).*

### 3. Levantar la aplicación en modo desarrollo

Abre dos pestañas independientes en tu terminal:

* **Terminal 1 (Backend - Puerto 3000):**
  ```bash
  cd backend
  npm run dev
  ```

* **Terminal 2 (Frontend - Puerto 5173 con Hot-Reload):**
  ```bash
  cd frontend
  npm run dev
  ```

Abre tu navegador e ingresa a: **[http://localhost:5173](http://localhost:5173)**.

---

## 🧪 Pruebas y Cobertura de Código

El backend cuenta con una cobertura de pruebas unitarias y de integración de **85.45%** que aseguran la tolerancia a fallos de los motores externos y el comportamiento de la API REST.

Para correr la suite de pruebas locales:
```bash
cd backend
npm test
```

Para generar un reporte detallado de cobertura en consola:
```bash
npx jest --coverage --coverageReporters=text
```

---

## 🛠️ Pipeline de CI/CD (GitHub Actions)

El proyecto cuenta con un flujo automatizado de CI/CD definido en `.github/workflows/ci.yml` que corre en cada push o pull request hacia la rama `main`:

1. **Linter y Calidad de Código:** Corre análisis estático con ESLint enfocándose en seguridad mediante `eslint-plugin-security`.
2. **Testing:** Ejecuta todas las pruebas unitarias en entornos aislados.
3. **Smoke Test:** Tras desplegarse automáticamente en la nube (Render), ejecuta pruebas de humo de conectividad (`/health`) para asegurar que el sistema está en línea antes de migrar los cambios a Producción.
