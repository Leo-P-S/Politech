# Politech - IA & WebScraping Dashboard 🗳️🤖

Politech es una plataforma de análisis político y seguimiento mediático de candidatos electorales. Utiliza técnicas avanzadas de **Web Scraping** y procesamiento de lenguaje natural con **IA (Google Gemini)** para recolectar, estructurar, resumir y clasificar noticias en tiempo real, facilitando el análisis de categorías, sentimientos y sesgo informativo de los candidatos.

---

## 🚀 Arquitectura del Proyecto

El sistema adopta una arquitectura desacoplada estructurada en tres capas principales:

1. **Capa de Presentación (Frontend):** 
   - SPA interactiva construida en HTML5, CSS3 premium (con diseño Glassmorphic oscuro) y Javascript nativo.
   - Gráficos interactivos integrados con **Chart.js** para visualizar el volumen de noticias, categorías y análisis de sentimientos.
   - Consola integrada conectada vía **Server-Sent Events (SSE)** que muestra el estado de recolección del worker en vivo.

2. **Capa de Servicio (Backend REST API):**
   - API construida sobre **Node.js** y **Express**.
   - Gestiona el CRUD de candidatos oficiales y la persistencia de noticias históricas en base de datos.
   - Rutas principales bajo `/api/candidatos` (con alias `/api/candidates` para compatibilidad retroactiva).

3. **Pipeline de Automatización (Worker & Cron):**
   - **Scraper:** Motor de scraping multicanal que extrae y limpia texto de portales RSS, GDELT API e historicamente desde NewsAPI.
   - **IA Service:** Modulo de análisis automatizado que agrupa y envía las noticias a **Google Gemini 1.5 Flash** para obtener un objeto estructurado con sentimientos, sesgo y entidades clave.
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
```
*(Nota: Si deseas utilizar la base de datos local y no tienes MongoDB en tu máquina, puedes encender la base de datos levantando el contenedor de Docker: `docker compose up -d` en la raíz del proyecto).*

### 3. Levantar la aplicación

Abre dos pestañas independientes en tu terminal:

* **Terminal 1 (Backend - Puerto 3000):**
  ```bash
  cd backend
  npm run dev
  ```

* **Terminal 2 (Frontend - Puerto 3001):**
  ```bash
  cd frontend
  npm start
  ```

Abre tu navegador e ingresa a: **[http://localhost:3001/dashboard](http://localhost:3001/dashboard)**.

---

## 🧪 Pruebas y Cobertura de Código

El backend cuenta con una cobertura de pruebas unitarias y de integración de **85.45%** que aseguran la tolerancia a fallos de los motores externos y el comportamiento del API REST.

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
