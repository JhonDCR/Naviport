# Naviport — Plataforma Móvil y Backend

Bienvenido al repositorio oficial de **Naviport**, un sistema multiplataforma desarrollado como proyecto para la materia de **Aplicaciones Móviles**.

---

## 👥 Equipo de Desarrollo

| Rol | Miembro(s) | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Frontend Dev 1** | Integrante 1 | Maquetación Figma, navegación, vistas core Ionic/Angular |
| **Frontend Dev 2** | Integrante 2 | Vistas complementarias, consumo de APIs REST, Capacitor |
| **Backend Dev** | Integrante 3 | API NestJS, esquemas Mongoose (MongoDB), caché Redis, Docker |

---

## 🛠️ Stack Tecnológico

- **Frontend Móvil**: [Ionic Framework](https://ionicframework.com/) (v9+) + [Angular](https://angular.dev/) (v22+) + [Capacitor](https://capacitorjs.com/) (v8+)
- **Backend API**: [NestJS](https://nestjs.com/) (Node.js framework progresivo)
- **Base de Datos**: [MongoDB](https://www.mongodb.com/) (NoSQL transaccional con Mongoose)
- **Caché / Fast Store**: [Redis](https://redis.io/) (Almacenamiento clave-valor en memoria)
- **Contenedores**: [Docker](https://www.docker.com/) & Docker Compose
- **Control de Versiones & CI/CD**: Git, GitHub Actions

---

## 📁 Estructura del Repositorio

```text
Naviport/
├── .github/                  # Flujos de CI/CD (GitHub Actions) y plantillas
│   ├── workflows/
│   │   ├── ci-develop.yml    # CI automático en PRs/push a develop
│   │   └── cd-main.yml       # Release & Quality Gate a main
│   └── pull_request_template.md
├── docs/                     # Documentación técnica
│   ├── API_CONTRACT.md       # Convenciones de API y comunicación
│   └── DESIGN_SYSTEM.md      # Mapeo de diseño Figma a Ionic
├── backend_navi/             # Proyecto Backend NestJS
├── frontend_navi/            # Proyecto Frontend Ionic/Angular
├── docker-compose.yml        # Orquestación de MongoDB, Redis y Mongo Express
├── .agents                   # Reglas esenciales para agentes de IA
├── AGENTS.md                 # Guía maestra y reglas de desarrollo para agentes IA
├── ARCHITECTURE.md           # Arquitectura de software y flujo de datos
├── CONTRIBUTING.md           # Guía de ramas, commits y revisiones
└── .env.example              # Variables de entorno de ejemplo
```

---

## 🚀 Inicio Rápido (Quickstart)

### 1. Requisitos Previos
- [Node.js](https://nodejs.org/) (v20 o v22 LTS recomendado)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución
- [Ionic CLI](https://ionicframework.com/docs/intro/cli) global (`npm install -g @ionic/cli`)
- [Git](https://git-scm.com/)

### 2. Clonar el repositorio y preparar ramas
```bash
git clone https://github.com/JhonDCR/Naviport.git
cd Naviport
git checkout develop
```

### 3. Levantar la Infraestructura (MongoDB + Redis)
Para no lidiar con instalaciones manuales de bases de datos:
```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar contenedores en segundo plano
docker compose up -d
```
Servicios disponibles tras levantar:
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`
- **Mongo Express (GUI web)**: `http://localhost:8081` (Usuario: `admin`, Password: `admin`)

### 4. Ejecutar el Backend (NestJS)
```bash
cd backend_navi
npm install
npm run start:dev
```
La API estará disponible en `http://localhost:3000` (y Swagger en `http://localhost:3000/api/docs`).

### 5. Ejecutar el Frontend Móvil (Ionic + Angular)
```bash
cd frontend_navi
npm install
ionic serve
```
La aplicación abrirá en `http://localhost:8100` con recarga en vivo.

---

## 🌿 Flujo de Trabajo Git (GitFlow)

1. **`main`**: Solo código estable para entrega/evaluación.
2. **`develop`**: Rama activa de integración del equipo.
3. **Sub-ramas de desarrollo**: Se crean a partir de `develop`:
   - `feature/front/<nombre>`
   - `feature/back/<nombre>`
   - `fix/front/<nombre>`
   - `fix/back/<nombre>`
4. **Pull Requests**: Siempre contra `develop`. Una vez verificado el release, se hace merge de `develop` a `main`.

Consulta [`CONTRIBUTING.md`](./CONTRIBUTING.md) para más detalles.

---

## 🤖 Desarrollo Asistido por Agentes de IA

Este proyecto está optimizado para trabajar con agentes de IA (Cursor, Copilot, Antigravity, Claude Code).
- Consulta [`AGENTS.md`](./AGENTS.md) y [`.agents`](./.agents) para conocer las pautas de estilo, tipado, patrones arquitectónicos y validaciones requeridas.
