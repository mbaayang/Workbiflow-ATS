# Workbiflow ATS

Plateforme ATS (Applicant Tracking System) avec:

- Backend API: NestJS + TypeORM + PostgreSQL
- Frontend: React + Vite + TypeScript
- Scoring IA: microservice Python (FastAPI)

Objectif: gérer les offres, candidatures, pipeline, entretiens, emails et score IA des profils.

## Sommaire

- Présentation rapide
- Architecture du projet
- Prérequis
- Installation pas à pas (débutant)
- Configuration `.env`
- Lancer le projet (3 services)
- Vérification rapide (smoke test)
- Parcours de test fonctionnel recommandé
- Commandes utiles
- Dépannage fréquent

## Présentation rapide

Fonctionnalités principales:

- Création et gestion d’offres d’emploi
- Page publique de candidature
- Upload CV / lettre de motivation
- Pipeline candidat (kanban)
- Planification des entretiens
- Notifications email candidat
- Scoring IA des candidatures (score total + détail par critère)

## Architecture du projet

```text
Workbiflow-ATS/
  backend/      # API NestJS (port 3000)
  frontend/     # App React/Vite (port 5173)
  ai-scoring/   # Service Python FastAPI (port 8001)
```

Flux simplifié candidature:

1. Le candidat soumet son formulaire via le frontend.
2. Le backend sauvegarde la candidature et les fichiers.
3. Le backend appelle `ai-scoring` pour calculer le score IA.
4. Le score est sauvegardé en base et affiché dans le frontend.
5. Si le service IA est indisponible, la candidature est quand même créée (fallback).

## Prérequis

Installe ces outils avant de commencer:

- Node.js 20+ (recommandé)
- npm 10+
- Python 3.11+ (3.13 fonctionne aussi)
- PostgreSQL 14+
- Git

Vérification rapide:

```bash
node -v
npm -v
python3 --version
psql --version
```

## Installation pas à pas (débutant)

Depuis la racine du projet:

1. Installer les dépendances backend

```bash
cd backend
npm install
```

2. Installer les dépendances frontend

```bash
cd ../frontend
npm install
```

3. Préparer le service Python IA

```bash
cd ../ai-scoring
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configuration `.env`

### Backend

Créer `backend/.env` à partir de `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

Variables importantes:

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `DB_SYNCHRONIZE=true` (pratique en local)
- `CDN_BASE_URL=http://localhost:3000`
- `AI_SCORING_URL=http://127.0.0.1:8001/score`
- `SENDGRID_*` pour les emails (optionnel pour dev, recommandé pour tests email)

### Base de données

Créer la DB PostgreSQL si besoin:

```sql
CREATE DATABASE workbiflow_ats_db;
```

## Lancer le projet (3 services)

Ouvrir 3 terminaux séparés.

### Terminal 1: backend

```bash
cd backend
npm run start:dev
```

Backend attendu sur: `http://localhost:3000`

### Terminal 2: frontend

```bash
cd frontend
npm run dev
```

Frontend attendu sur: `http://localhost:5173`

### Terminal 3: ai-scoring

```bash
cd ai-scoring
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Service IA attendu sur: `http://127.0.0.1:8001`

## Vérification rapide (smoke test)

1. Front ouvert: `http://localhost:5173`
2. Backend répond: `http://localhost:3000/api/jobs` (ou endpoint API équivalent)
3. IA répond: `http://127.0.0.1:8001/health` doit retourner `{"status":"ok"}`

## Parcours de test fonctionnel recommandé

1. Créer une offre dans l’interface.
2. Ouvrir l’URL publique de candidature de cette offre.
3. Soumettre une candidature avec un CV PDF ou DOCX texte (pas un scan image pour un test initial).
4. Vérifier dans la page candidats:
	- score IA affiché (`XX/100`) ou badge `IA indisponible`
5. Ouvrir le détail candidat:
	- breakdown par critère
	- ou message d’indisponibilité IA avec raison

## Commandes utiles

### Backend

```bash
cd backend
npm run start:dev
npm run build
npm run test
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
```

### AI Scoring Python

```bash
cd ai-scoring
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Dépannage fréquent

### 1) Le score IA reste à 0

Vérifier:

- Le service Python tourne bien.
- `AI_SCORING_URL` dans `backend/.env` est correct.
- Le CV contient du texte extractible (PDF texte et non scan image).
- Le backend est redémarré après modification des `.env`.

### 2) Badge `IA indisponible`

C’est un fallback normal: la candidature est sauvegardée même si le scoring a échoué.

Actions:

- vérifier les logs backend
- vérifier les logs `ai-scoring`
- tester `GET /health`

### 3) Erreur CORS / appel API frontend

- Vérifier que frontend et backend sont bien lancés.
- Vérifier la config proxy/frontend si vous l’avez personnalisée.

### 4) Erreur DB à l’init

- Vérifier les identifiants PostgreSQL dans `backend/.env`.
- Vérifier que la base existe.

## Notes importantes

- Le scoring IA est externalisé dans `ai-scoring/`.
- Le backend applique un fallback pour ne jamais bloquer la création d’une candidature en cas de panne IA.
- En local, privilégier des CV PDF textuels pour valider rapidement le pipeline IA.
