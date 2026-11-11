# NaviPort Tracking — Plataforma Logística OceanTrack

Plataforma integral basada en arquitectura NoSQL (**MongoDB + Redis**) para la gestión de flota naviera y rastreo en tiempo real de importaciones marítimas desde **China (Shanghai)** y **EE.UU. (Miami)** hacia **Ecuador (Guayaquil)**.

---

## 👥 Equipo de Desarrollo y Responsabilidades

| Rol | Miembro(s) | Alcance Principal |
| :--- | :--- | :--- |
| **Frontend Dev 1** | Integrante 1 | Maquetación Figma, navegación core, vistas de cliente (`Introduccion`, `Inicio`, `Seguimiento`), floating navbar y diseño adaptable |
| **Frontend Dev 2** | Integrante 2 | Vistas de operador (`Inicio Empleado`, `Scan Camara` con IA, `Detalle Pedido`, `Perfil`), servicios Capacitor (cámara, almacenamiento) y consumo de APIs |
| **Backend Dev** | Integrante 3 | API NestJS modular, esquemas Mongoose (8 colecciones), capa de caché/sesiones Redis (`kpi:resumen`, `alertas:activas`, `sesion:{id}`), Docker y Swagger |

---

## 🛠️ Stack Tecnológico

- **Frontend Móvil**: [Ionic Framework 9+](https://ionicframework.com/) + [Angular 22+](https://angular.dev/) + [Capacitor 8+](https://capacitorjs.com/)
- **Backend API**: [NestJS](https://nestjs.com/) (Node.js con TypeScript estricto)
- **Base de Datos NoSQL**: [MongoDB 7.0](https://www.mongodb.com/) (ODM Mongoose)
- **Caché y Fast Storage**: [Redis 7.2](https://redis.io/)
- **Infraestructura**: Docker & Docker Compose (MongoDB, Redis, Mongo Express)
- **Diseño**: Figma ([Ver archivo de diseño](https://www.figma.com/design/vu7SLGvtwRZf1CMBkQt0sA/NaviPort?node-id=33-1073))

---

## 📁 Estructura del Proyecto y Documentación

```text
Naviport/
├── .github/
│   ├── workflows/
│   │   ├── ci-develop.yml    # Validación automática en PRs a develop
│   │   └── cd-main.yml       # Release & Quality Gate a main
│   └── pull_request_template.md
├── docs/
│   ├── API_CONTRACT.md       # Endpoints REST, DTOs y claves de Redis
│   └── DESIGN_SYSTEM.md      # Tokens de Figma, colores, tipografía Poppins y pantallas
├── backend_navi/             # Backend NestJS
├── frontend_navi/            # Frontend Ionic/Angular
├── docker-compose.yml        # MongoDB + Redis + Mongo Express
├── .agents                   # Reglas esenciales para asistentes de IA
├── AGENTS.md                 # Guía maestra de arquitectura para agentes
├── ARCHITECTURE.md           # 8 esquemas MongoDB, Redis TTL, 4 roles de usuario
├── CONTRIBUTING.md           # Flujo de ramas develop/feature y Conventional Commits
└── .env.example              # Variables de entorno
```

---

## 🚀 Inicio Rápido (Quickstart)

### 1. Clonar y cambiar a rama `develop`
```bash
git clone https://github.com/JhonDCR/Naviport.git
cd Naviport
git checkout develop
```

### 2. Levantar Servicios con Docker (MongoDB + Redis + Mongo Express)
```bash
cp .env.example .env
docker compose up -d
```
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`
- **Mongo Express (GUI web)**: `http://localhost:8081` (User: `admin`, Password: `admin`)

### 3. Levantar Backend (NestJS)
```bash
cd backend_navi
npm install
npm run start:dev
```
- API REST: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api/docs`

### 4. Levantar Frontend Móvil (Ionic + Angular)
```bash
cd frontend_navi
npm install
ionic serve
```
- Vista web de la app: `http://localhost:8100`
