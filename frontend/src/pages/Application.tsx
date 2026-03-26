import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import type { JobItem, JobPrescreenQuestion } from "../types/JobType";

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
}

type AnswersMap = Record<number, string>;

const maxFileSize = 5 * 1024 * 1024;
const acceptedCvTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const questionTypeLabel: Record<JobPrescreenQuestion["type"], string> = {
  yes_no: "Oui / Non",
  text: "Texte libre",
  multiple_choice: "Choix multiple",
  number: "Numérique",
};

export default function Application() {
  const { companySlug = "", id = "" } = useParams();

  const [job, setJob] = useState<JobItem | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState("");

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
  });
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      setLoadingJob(true);
      setJobError("");
      try {
        const response = await axios.get(`/api/jobs/${companySlug}/${id}`);
        const payload = response?.data?.data ?? response?.data;
        setJob(payload ?? null);
      } catch {
        setJobError("Cette offre est introuvable ou n’est plus disponible.");
      } finally {
        setLoadingJob(false);
      }
    };

    if (companySlug && id) {
      void fetchJob();
    }
  }, [companySlug, id]);

  const requiredQuestions = useMemo(
    () => (job?.prescreenQuestions ?? []).filter((q) => q.required),
    [job?.prescreenQuestions],
  );

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  const updateAnswer = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleCvChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSubmitError("");

    if (!file) {
      setCvFile(null);
      return;
    }

    if (!acceptedCvTypes.includes(file.type)) {
      setSubmitError("Le CV doit être un fichier PDF, DOC ou DOCX.");
      event.target.value = "";
      setCvFile(null);
      return;
    }

    if (file.size > maxFileSize) {
      setSubmitError("Le CV dépasse la taille maximale de 5 Mo.");
      event.target.value = "";
      setCvFile(null);
      return;
    }

    setCvFile(file);
  };

  const handleCoverLetterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSubmitError("");

    if (!file) {
      setCoverLetterFile(null);
      return;
    }

    if (file.size > maxFileSize) {
      setSubmitError(
        "La lettre de motivation dépasse la taille maximale de 5 Mo.",
      );
      event.target.value = "";
      setCoverLetterFile(null);
      return;
    }

    setCoverLetterFile(file);
  };

  const validateForm = () => {
    if (
      !personalInfo.firstName ||
      !personalInfo.lastName ||
      !personalInfo.email
    ) {
      return "Veuillez compléter les informations personnelles obligatoires.";
    }

    if (!cvFile) {
      return "Le CV est obligatoire.";
    }

    const missingRequiredQuestion = requiredQuestions.find((question) => {
      const questionIndex = (job?.prescreenQuestions ?? []).indexOf(question);
      return !String(answers[questionIndex] ?? "").trim() && question.required;
    });

    if (missingRequiredQuestion) {
      return "Veuillez répondre à toutes les questions de présélection obligatoires.";
    }

    if (!consentAccepted) {
      return "Le consentement RGPD est obligatoire avant l’envoi.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    if (!job) {
      setSubmitError("Offre introuvable.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("jobId", String(job.id));
      formData.append("companySlug", job.companySlug);
      formData.append("firstName", personalInfo.firstName);
      formData.append("lastName", personalInfo.lastName);
      formData.append("email", personalInfo.email);
      formData.append("phone", personalInfo.phone);
      formData.append("city", personalInfo.city);
      formData.append("consentAccepted", String(consentAccepted));
      formData.append("cv", cvFile as Blob);

      if (coverLetterFile) {
        formData.append("coverLetter", coverLetterFile);
      }

      const structuredAnswers = (job.prescreenQuestions ?? []).map(
        (question, index) => ({
          label: question.label,
          type: question.type,
          answer: answers[index] ?? "",
        }),
      );
      formData.append("prescreenAnswers", JSON.stringify(structuredAnswers));

      await axios.post("/api/applications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmitMessage("Votre candidature a été envoyée avec succès.");
      setPersonalInfo({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
      });
      setAnswers({});
      setCvFile(null);
      setCoverLetterFile(null);
      setConsentAccepted(false);
    } catch {
      setSubmitError("Échec de l’envoi de la candidature. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
          Chargement de l’offre...
        </div>
      </main>
    );
  }

  if (jobError || !job) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">
            Offre indisponible
          </h1>
          <p className="mt-2 text-slate-600">
            {jobError || "Cette offre n’est plus accessible."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
            {job.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            {job.department} • {job.location} •{" "}
            {(job.contractType ?? "-").toUpperCase()}
          </p>
          <div
            className="prose prose-sm mt-4 max-w-none rounded-xl bg-slate-50 p-4 text-slate-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
            dangerouslySetInnerHTML={{ __html: job.description || "" }}
          />

          <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-2 text-base font-semibold text-slate-800">Critères du poste</h2>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Niveau d’études:</span>{" "}
                {job.criteria?.educationLevel || "-"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Années d’expérience minimum:</span>{" "}
                {job.criteria?.experienceYears ?? "-"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Compétences:</span>{" "}
                {job.criteria?.skills && job.criteria.skills.length > 0
                  ? job.criteria.skills.map((skill) => skill.name).join(", ")
                  : "-"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Langues:</span>{" "}
                {job.criteria?.languages && job.criteria.languages.length > 0
                  ? job.criteria.languages
                      .map((language) => `${language.name} (${language.level})`)
                      .join(", ")
                  : "-"}
              </p>
            </div>
          </section>
        </section>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl bg-white p-5 shadow-sm md:p-6"
        >
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                value={personalInfo.firstName}
                onChange={(e) =>
                  updatePersonalInfo("firstName", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Prénom *"
                required
              />
              <input
                value={personalInfo.lastName}
                onChange={(e) => updatePersonalInfo("lastName", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Nom *"
                required
              />
              <input
                type="email"
                value={personalInfo.email}
                onChange={(e) => updatePersonalInfo("email", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Adresse e-mail *"
                required
              />
              <input
                value={personalInfo.phone}
                onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Numéro de téléphone"
              />
              <input
                value={personalInfo.city}
                onChange={(e) => updatePersonalInfo("city", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring md:col-span-2"
                placeholder="Ville / lieu de résidence"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">
              Pièces jointes
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  CV (PDF ou DOC, max 5 Mo) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCvChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
                {cvFile && (
                  <p className="mt-1 text-xs text-slate-500">{cvFile.name}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Lettre de motivation (facultatif)
                </label>
                <input
                  type="file"
                  onChange={handleCoverLetterChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {coverLetterFile && (
                  <p className="mt-1 text-xs text-slate-500">
                    {coverLetterFile.name}
                  </p>
                )}
              </div>
            </div>
          </section>

          {(job.prescreenQuestions ?? []).length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-800">
                Questions de présélection
              </h2>
              <div className="space-y-4">
                {(job.prescreenQuestions ?? []).map((question, index) => {
                  const answer = answers[index] ?? "";
                  return (
                    <div
                      key={`${question.label}-${index}`}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <label className="mb-2 block text-sm font-medium text-slate-800">
                        {index + 1}. {question.label}{" "}
                        {question.required && (
                          <span className="text-red-600">*</span>
                        )}
                      </label>
                      <p className="mb-2 text-xs text-slate-500">
                        Type: {questionTypeLabel[question.type]}
                      </p>

                      {question.type === "yes_no" && (
                        <div className="flex gap-4">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name={`question-${index}`}
                              checked={answer === "oui"}
                              onChange={() => updateAnswer(index, "oui")}
                            />
                            Oui
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name={`question-${index}`}
                              checked={answer === "non"}
                              onChange={() => updateAnswer(index, "non")}
                            />
                            Non
                          </label>
                        </div>
                      )}

                      {question.type === "text" && (
                        <textarea
                          value={answer}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                          placeholder="Votre réponse"
                        />
                      )}

                      {question.type === "multiple_choice" && (
                        <select
                          value={answer}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                        >
                          <option value="">Choisir une option</option>
                          {(question.options ?? []).map(
                            (option, optionIndex) => (
                              <option
                                key={`${option}-${optionIndex}`}
                                value={option}
                              >
                                {option}
                              </option>
                            ),
                          )}
                        </select>
                      )}

                      {question.type === "number" && (
                        <input
                          type="number"
                          min={question.min}
                          max={question.max}
                          value={answer}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                          placeholder="Votre réponse numérique"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-xl bg-slate-50 p-4">
            <label className="inline-flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                required
              />
              <span>
                Je consens au traitement de mes données personnelles
                conformément à la politique de protection des données (RGPD). *
              </span>
            </label>
          </section>

          {submitMessage && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {submitMessage}
            </p>
          )}
          {submitError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Envoi..." : "Envoyer ma candidature"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
