# Aura Student Life OS

Application web full-stack pour centraliser la vie etudiante : organisation des cours, objectifs, planning, finances personnelles, sport, habitudes, lectures, notes, langues et assistant IA.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6db33f?logo=springboot)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)

## Apercu

Aura Student Life OS est une application portfolio construite avec un frontend React/Vite et une API Spring Boot. L'objectif est de regrouper dans une seule interface les outils utiles au quotidien d'un etudiant : suivi budgetaire, taches d'etude, objectifs, planning, sport, notes et assistant IA.

## Fonctionnalites

| Module | Description |
| --- | --- |
| Dashboard | Vue generale des indicateurs personnels et financiers |
| Authentification | Inscription, connexion, verification email et reset password |
| Finance | Transactions, categories, statistiques, exports Excel et PDF |
| Etudes | Taches, progression par matiere et timer Pomodoro |
| Objectifs | Suivi d'objectifs avec progression |
| Planning | Evenements et organisation du calendrier |
| Sport & sante | Profil sportif, entrainements et suivi d'activite |
| Assistant IA | Chat integre connecte a l'API backend |
| Modules optionnels | Notes, langues, lectures et habitudes activables depuis la sidebar |

## Stack technique

- Frontend : React 18, Vite, React Router, Axios, Recharts, Lucide React
- Backend : Spring Boot 3.5, Spring Security, JWT, Spring Data JPA, Bean Validation
- Base de donnees : PostgreSQL 16
- Documentation API : SpringDoc OpenAPI / Swagger UI
- Exports : Apache POI pour Excel, iText7 pour PDF
- DevOps local : Docker Compose pour PostgreSQL

## Structure du projet

```text
aura-student-life-os/
├── backend/
│   ├── src/main/java/com/financetracker/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── entity/
│   │   ├── exception/
│   │   ├── export/
│   │   ├── repository/
│   │   ├── security/
│   │   └── service/
│   ├── src/main/resources/
│   ├── src/test/
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── docker-compose.yml
```

## Prerequis

- Java 17+
- Node.js 18+
- npm
- Docker et Docker Compose

## Installation

Clone du projet :

```bash
git clone https://github.com/malekghabi1607/aura-student-life-os.git
cd aura-student-life-os
```

Creation des fichiers d'environnement :

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Variables principales cote backend :

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | URL JDBC PostgreSQL |
| `DATABASE_USERNAME` | Utilisateur PostgreSQL |
| `DATABASE_PASSWORD` | Mot de passe PostgreSQL |
| `JWT_SECRET` | Cle secrete JWT, 32 caracteres minimum recommandes |
| `GEMINI_API_KEY` | Cle API Gemini pour l'assistant IA |
| `RESEND_API_KEY` | Cle Resend pour les emails |

## Demarrage local

Terminal 1, base de donnees :

```bash
docker-compose up -d
```

Terminal 2, backend :

```bash
cd backend
./mvnw spring-boot:run
```

Terminal 3, frontend :

```bash
cd frontend
npm install
npm run dev
```

Services disponibles :

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API REST | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/api-docs |
| PostgreSQL | localhost:5432 |

Compte de demo local :

```text
Email: demo@finance.app
Password: demo123
```

## Commandes utiles

Backend :

```bash
cd backend
./mvnw test
./mvnw package -DskipTests
java -jar target/finance-tracker-api-1.0.0.jar
```

Frontend :

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

Base de donnees :

```bash
docker-compose up -d
docker-compose down
docker-compose down -v
```

## API principale

| Domaine | Endpoints |
| --- | --- |
| Auth | `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Finance | `/api/transactions`, `/api/categories`, `/api/statistics/dashboard` |
| Exports | `/api/statistics/export/excel`, `/api/statistics/export/pdf` |
| Etudes | `/api/study/tasks` |
| Planning | `/api/planning` |
| Objectifs | `/api/goals` |
| Sport | `/api/fitness/workouts` |
| IA | `/api/ai/chat` |

## Securite et publication

Les fichiers `.env`, `node_modules`, `dist`, `target` et autres artefacts locaux sont ignores par Git. Les secrets doivent rester dans les fichiers `.env` locaux ou dans les variables d'environnement de la plateforme de deploiement.

Avant un deploiement public, remplacer les valeurs par defaut de developpement, notamment `JWT_SECRET`, `DATABASE_PASSWORD`, `GEMINI_API_KEY` et `RESEND_API_KEY`.

## Auteur

Malek Ghabi

## Licence

MIT
