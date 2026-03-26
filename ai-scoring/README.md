# AI Scoring Service (Python)

Service externe de notation IA des candidatures.

## Setup

```bash
cd ai-scoring
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API

- `GET /health`
- `POST /score`

Exemple minimal de payload `POST /score`:

```json
{
  "candidate": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "consentAccepted": true,
    "cvPath": "uploads/applications/cv/jane.pdf",
    "coverLetterPath": null,
    "cvFileAbsolutePath": "/abs/path/to/backend/public/uploads/applications/cv/jane.pdf",
    "prescreenAnswers": [
      { "label": "Autorisation de travail", "type": "yes_no", "answer": "oui" }
    ]
  },
  "job": {
    "title": "Frontend Engineer",
    "description": "React TypeScript testing",
    "requiredExperienceYears": 2,
    "requiredEducationLevel": "Licence",
    "requiredSkills": ["React", "TypeScript"],
    "prescreenQuestions": [
      { "label": "Autorisation de travail", "type": "yes_no", "required": true }
    ]
  }
}
```

## Backend integration

Le backend Nest appelle ce service via `AI_SCORING_URL` (voir `backend/.env.example`).
