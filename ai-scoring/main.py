from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field
from pypdf import PdfReader
from docx import Document


app = FastAPI(title="AI Scoring Service", version="1.0.0")

STOPWORDS = {
    "de", "la", "le", "les", "des", "du", "un", "une", "et", "ou", "dans", "pour",
    "avec", "sur", "par", "the", "and", "or", "for", "with", "to", "in", "of", "a", "an",
}

EDUCATION_RANK: Dict[str, int] = {
    "unknown": 0,
    "baccalaureat": 1,
    "licence": 2,
    "master": 3,
    "doctorat": 4,
}

WEIGHTS = {
    "keywords": 25,
    "experience": 20,
    "education": 15,
    "prescreen": 25,
    "completeness": 10,
    "coherence": 5,
}


class CandidatePrescreenAnswer(BaseModel):
    label: str
    type: Literal["yes_no", "text", "multiple_choice", "number"]
    answer: str


class CandidatePayload(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    consentAccepted: Optional[bool] = None
    cvPath: Optional[str] = None
    coverLetterPath: Optional[str] = None
    prescreenAnswers: List[CandidatePrescreenAnswer] = Field(default_factory=list)
    cvFileAbsolutePath: Optional[str] = None


class JobPrescreenQuestion(BaseModel):
    label: str
    type: Literal["yes_no", "text", "multiple_choice", "number"]
    required: bool = False
    options: Optional[List[str]] = None
    min: Optional[float] = None
    max: Optional[float] = None


class JobPayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requiredExperienceYears: Optional[float] = None
    requiredEducationLevel: Optional[str] = None
    requiredSkills: List[str] = Field(default_factory=list)
    prescreenQuestions: List[JobPrescreenQuestion] = Field(default_factory=list)


class ScoreRequest(BaseModel):
    candidate: CandidatePayload
    job: JobPayload


def clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max_value, max(min_value, value))


def round2(value: float) -> float:
    return round(value + 1e-9, 2)


def normalize_text(value: str) -> str:
    value = value.lower()
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def compact_spaced_characters(value: str) -> str:
    """Fix PDF extraction artifacts like 'C O N T A C T' and '2 0 2 4'."""

    def _compact_letters(match: re.Match[str]) -> str:
        return re.sub(r"\s+", "", match.group(0))

    def _compact_digits(match: re.Match[str]) -> str:
        return re.sub(r"\s+", "", match.group(0))

    compacted = re.sub(r"\b(?:[A-Za-zÀ-ÿ]\s+){2,}[A-Za-zÀ-ÿ]\b", _compact_letters, value)
    compacted = re.sub(r"\b(?:\d\s+){3,}\d\b", _compact_digits, compacted)
    compacted = re.sub(r"\s+", " ", compacted).strip()
    return compacted


def tokenize(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [
        token
        for token in normalize_text(value).split(" ")
        if len(token) > 2 and token not in STOPWORDS
    ]


def parse_education_level(value: Optional[str]) -> str:
    if not value:
        return "unknown"
    n = normalize_text(value)
    if "doctorat" in n or "phd" in n:
        return "doctorat"
    if "master" in n or "bac 5" in n or "mba" in n:
        return "master"
    if "licence" in n or "bachelor" in n or "bac 3" in n:
        return "licence"
    if "baccalaureat" in n or re.search(r"\bbac\b", n):
        return "baccalaureat"
    return "unknown"


def read_cv_text(absolute_path: Optional[str]) -> str:
    if not absolute_path:
        return ""

    path = Path(absolute_path)
    candidate_paths = [path]

    # Fallbacks when backend cwd/path differs across environments.
    candidate_paths.append(Path.cwd() / "backend" / "public" / "uploads" / "applications" / "cv" / path.name)
    candidate_paths.append(Path.cwd().parent / "backend" / "public" / "uploads" / "applications" / "cv" / path.name)

    resolved_path: Optional[Path] = None
    for candidate_path in candidate_paths:
        if candidate_path.exists() and candidate_path.is_file():
            resolved_path = candidate_path
            break

    if resolved_path is None:
        return ""

    ext = resolved_path.suffix.lower()

    try:
        if ext == ".pdf":
            reader = PdfReader(str(resolved_path))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages_text).strip()

        if ext == ".docx":
            doc = Document(str(resolved_path))
            return "\n".join([p.text for p in doc.paragraphs if p.text]).strip()

        if ext == ".txt":
            return resolved_path.read_text(encoding="utf-8", errors="ignore").strip()
    except Exception:
        return ""

    return ""


def infer_experience_years(cv_text: str) -> Optional[float]:
    if not cv_text:
        return None

    normalized_cv_text = normalize_text(cv_text)
    values: List[float] = []
    patterns = [
        re.compile(r"(\d{1,2})\+?\s*(?:ans?|annees?|years?)(?:\s+d[' ]experience)?", re.IGNORECASE),
        re.compile(r"(?:experience|exp)\s*[:\-]?\s*(\d{1,2})\s*(?:ans?|annees?|years?)", re.IGNORECASE),
        re.compile(r"(\d{1,2})\+?\s*(?:yrs?)", re.IGNORECASE),
    ]

    for pattern in patterns:
        for match in pattern.finditer(normalized_cv_text):
            try:
                parsed = float(match.group(1))
                if 0 <= parsed <= 60:
                    values.append(parsed)
            except ValueError:
                continue

    return max(values) if values else None


def infer_timeline(cv_text: str) -> List[Dict[str, str]]:
    if not cv_text:
        return []

    normalized = normalize_text(cv_text)
    year_range_regex = re.compile(
        r"(19\d{2}|20\d{2})\s*(?:-|to|a|au|jusqu a)?\s*(19\d{2}|20\d{2}|present|current)",
        re.IGNORECASE,
    )

    timeline: List[Dict[str, str]] = []
    for match in year_range_regex.finditer(normalized):
        start_year = int(match.group(1))
        end_token = match.group(2).lower()
        end_year = datetime.utcnow().year if end_token in {"present", "current"} else int(end_token)

        if start_year > end_year:
            continue

        timeline.append({
            "startDate": f"{start_year}-01-01",
            "endDate": f"{end_year}-12-31",
        })

    dedup: Dict[str, Dict[str, str]] = {}
    for item in timeline:
        dedup[f"{item['startDate']}-{item['endDate']}"] = item
    return list(dedup.values())


def infer_experience_from_timeline(timeline: List[Dict[str, str]]) -> Optional[float]:
    if not timeline:
        return None

    total_months = 0.0
    for item in timeline:
        try:
            start = datetime.fromisoformat(item["startDate"])
            end = datetime.fromisoformat(item["endDate"])
        except Exception:
            continue

        if end <= start:
            continue

        total_months += (end - start).days / 30.44

    if total_months <= 0:
        return None

    return round2(clamp(total_months / 12.0, 0, 60))


def score_keywords(candidate_cv_text: str, job: JobPayload) -> Dict[str, Any]:
    job_tokens = set(tokenize(job.title) + tokenize(job.description) + [t for s in job.requiredSkills for t in tokenize(s)])
    cv_tokens = set(tokenize(candidate_cv_text))

    if not job_tokens or not cv_tokens:
        return {"score": 0.0, "details": "Texte CV ou description poste absent."}

    matches = sum(1 for token in job_tokens if token in cv_tokens)
    ratio = clamp(matches / len(job_tokens), 0, 1)

    return {
        "score": round2(WEIGHTS["keywords"] * ratio),
        "details": f"{matches}/{len(job_tokens)} mots-cles du poste retrouves dans le CV.",
    }


def score_experience(inferred_years: Optional[float], required_years: Optional[float]) -> Dict[str, Any]:
    candidate_years = clamp(float(inferred_years or 0), 0, 60)
    required = clamp(float(required_years or 0), 0, 40)

    if required <= 0:
        return {
            "score": WEIGHTS["experience"] if candidate_years > 0 else round2(WEIGHTS["experience"] * 0.5),
            "details": "Aucun seuil minimum requis defini sur le poste.",
        }

    ratio = clamp(candidate_years / required, 0, 1)
    return {
        "score": round2(WEIGHTS["experience"] * ratio),
        "details": f"{candidate_years} an(s) detectes pour {required} an(s) requis.",
    }


def score_education(inferred_level: str, required_level: Optional[str]) -> Dict[str, Any]:
    candidate_level = parse_education_level(inferred_level)
    required = parse_education_level(required_level)

    candidate_rank = EDUCATION_RANK[candidate_level]
    required_rank = EDUCATION_RANK[required]

    if candidate_rank == 0:
        return {"score": 0.0, "details": "Niveau d etudes candidat non renseigne."}

    if required_rank == 0:
        ratio = clamp(candidate_rank / EDUCATION_RANK["doctorat"], 0, 1)
        return {
            "score": round2(WEIGHTS["education"] * ratio),
            "details": "Seuil de diplome non defini sur le poste.",
        }

    ratio = clamp(candidate_rank / required_rank, 0, 1)
    return {
        "score": round2(WEIGHTS["education"] * ratio),
        "details": f"Niveau candidat {candidate_level} vs requis {required}.",
    }


def evaluate_rule(answer_value: str, question: JobPrescreenQuestion) -> bool:
    answer = normalize_text(answer_value or "")

    if question.type == "yes_no":
        return answer in {"yes", "oui", "true", "1"}

    if question.type == "multiple_choice" and question.options:
        options = {normalize_text(option) for option in question.options}
        return answer in options

    if question.type == "number":
        try:
            number = float(answer_value)
        except (ValueError, TypeError):
            return False

        if question.min is not None and number < question.min:
            return False
        if question.max is not None and number > question.max:
            return False
        return True

    return len(answer) > 0


def score_prescreen(candidate: CandidatePayload, questions: List[JobPrescreenQuestion]) -> Dict[str, Any]:
    answer_map = {normalize_text(item.label): item.answer for item in candidate.prescreenAnswers}

    if not questions:
        if not candidate.prescreenAnswers:
            return {"score": 0.0, "details": "Aucune reponse de prescreen disponible.", "failedBlocking": []}
        positive = sum(1 for item in candidate.prescreenAnswers if (item.answer or "").strip())
        ratio = clamp(positive / len(candidate.prescreenAnswers), 0, 1)
        return {
            "score": round2(WEIGHTS["prescreen"] * ratio),
            "details": f"Reponses renseignees: {positive}/{len(candidate.prescreenAnswers)}.",
            "failedBlocking": [],
        }

    blocking_failed: List[str] = []
    for q in [q for q in questions if q.required]:
        ok = evaluate_rule(answer_map.get(normalize_text(q.label), ""), q)
        if not ok:
            blocking_failed.append(q.label)

    if blocking_failed:
        return {
            "score": 0.0,
            "details": f"Echec critere(s) bloquant(s): {', '.join(blocking_failed)}.",
            "failedBlocking": blocking_failed,
        }

    weighted = [q for q in questions if not q.required]
    if not weighted:
        return {"score": float(WEIGHTS["prescreen"]), "details": "Tous les criteres bloquants sont valides.", "failedBlocking": []}

    good = 0
    for q in weighted:
        if evaluate_rule(answer_map.get(normalize_text(q.label), ""), q):
            good += 1

    ratio = clamp(good / len(weighted), 0, 1)
    return {
        "score": round2(WEIGHTS["prescreen"] * ratio),
        "details": f"Score ponderation prescreen: {round2(ratio * 100)}%.",
        "failedBlocking": [],
    }


def score_completeness(candidate: CandidatePayload) -> Dict[str, Any]:
    points = 0.0
    max_cv = 4.0
    max_cover = 2.0
    max_fields = 4.0

    if candidate.cvPath:
        points += max_cv
    if candidate.coverLetterPath:
        points += max_cover

    fields = [candidate.firstName, candidate.lastName, candidate.email, candidate.consentAccepted]
    completed = sum(1 for item in fields if bool(item))
    ratio = completed / len(fields) if fields else 1
    points += max_fields * ratio

    normalized = round2((points / (max_cv + max_cover + max_fields)) * WEIGHTS["completeness"])
    return {
        "score": normalized,
        "details": f"CV: {'oui' if candidate.cvPath else 'non'}, LM: {'oui' if candidate.coverLetterPath else 'non'}, champs: {completed}/{len(fields)}.",
    }


def score_coherence(timeline: List[Dict[str, str]]) -> Dict[str, Any]:
    if not timeline:
        return {"score": 0.0, "details": "Chronologie non disponible."}

    parsed: List[tuple[datetime, datetime]] = []
    for item in timeline:
        try:
            start = datetime.fromisoformat(item["startDate"])
            end = datetime.fromisoformat(item["endDate"])
        except Exception:
            continue
        parsed.append((start, end))

    if not parsed:
        return {"score": 0.0, "details": "Dates de parcours invalides."}

    parsed.sort(key=lambda value: value[0])
    penalties = 0

    for start, end in parsed:
        if start > end:
            penalties += 2

    for idx in range(1, len(parsed)):
        prev_end = parsed[idx - 1][1]
        current_start = parsed[idx][0]
        gap_months = (current_start - prev_end).days / 30.44

        if gap_months > 18:
            penalties += 1
        if gap_months < -2:
            penalties += 1

    ratio = clamp(1 - penalties * 0.2, 0, 1)
    return {
        "score": round2(WEIGHTS["coherence"] * ratio),
        "details": f"Penalites chronologie: {penalties}.",
    }


def recommendation_from_score(score: float) -> str:
    if score >= 80:
        return "strong_match"
    if score >= 65:
        return "good_match"
    if score >= 50:
        return "average_match"
    return "not_recommended"


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/score")
def score(request: ScoreRequest) -> Dict[str, Any]:
    cv_text_raw = read_cv_text(request.candidate.cvFileAbsolutePath)
    cv_text = compact_spaced_characters(cv_text_raw)
    cv_text_length = len(cv_text.strip())
    inferred_years = infer_experience_years(cv_text)
    inferred_education = parse_education_level(cv_text)
    inferred_timeline = infer_timeline(cv_text)
    if inferred_years is None:
        inferred_years = infer_experience_from_timeline(inferred_timeline)

    keyword_result = score_keywords(cv_text, request.job)
    experience_result = score_experience(inferred_years, request.job.requiredExperienceYears)
    education_result = score_education(inferred_education, request.job.requiredEducationLevel)
    prescreen_result = score_prescreen(request.candidate, request.job.prescreenQuestions)
    completeness_result = score_completeness(request.candidate)
    coherence_result = score_coherence(inferred_timeline)

    total_score = round2(
        keyword_result["score"]
        + experience_result["score"]
        + education_result["score"]
        + prescreen_result["score"]
        + completeness_result["score"]
        + coherence_result["score"]
    )

    return {
        "totalScore": total_score,
        "maxScore": 100,
        "recommendation": recommendation_from_score(total_score),
        "blockingCriteriaFailed": prescreen_result.get("failedBlocking", []),
        "debug": {
            "cvRawTextLength": len(cv_text_raw.strip()),
            "cvTextLength": cv_text_length,
            "timelineItems": len(inferred_timeline),
            "inferredExperienceYears": inferred_years,
            "inferredEducationLevel": inferred_education,
        },
        "breakdown": {
            "keywords": {"score": keyword_result["score"], "max": WEIGHTS["keywords"], "details": keyword_result["details"]},
            "experience": {"score": experience_result["score"], "max": WEIGHTS["experience"], "details": experience_result["details"]},
            "education": {"score": education_result["score"], "max": WEIGHTS["education"], "details": education_result["details"]},
            "prescreen": {"score": prescreen_result["score"], "max": WEIGHTS["prescreen"], "details": prescreen_result["details"]},
            "completeness": {"score": completeness_result["score"], "max": WEIGHTS["completeness"], "details": completeness_result["details"]},
            "coherence": {"score": coherence_result["score"], "max": WEIGHTS["coherence"], "details": coherence_result["details"]},
        },
    }
