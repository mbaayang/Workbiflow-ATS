import { useRef, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import axios from "axios"
import { Link } from "react-router-dom"

type ContractType = "CDI" | "CDD" | "stage" | "freelance"
type JobStatus = "draft" | "published" | "closed" | "archived"
type QuestionType = "yes_no" | "text" | "multiple_choice" | "number"

interface Skill {
  name: string
}

interface LanguageItem {
  name: string
  level: string
}

interface PrescreenQuestion {
  label: string
  type: QuestionType
  required: boolean
  optionsRaw?: string // utilisé pour choix multiple (une option par ligne)
  min?: number
  max?: number
}

interface JobFormValues {
  title: string
  department: string
  contractType: ContractType
  location: string
  desiredStartDate: string
  salaryMin?: number
  salaryMax?: number
  description: string
  criteria: {
    educationLevel: string
    experienceYears: number
    skills: Skill[]
    languages: LanguageItem[]
  }
  prescreenQuestions: PrescreenQuestion[]
  status: JobStatus
}

const contractOptions: ContractType[] = ["CDI", "CDD", "stage", "freelance"]
const statusOptions: { label: string; value: JobStatus }[] = [
  { label: "Brouillon", value: "draft" },
  { label: "Publiée", value: "published" },
  { label: "Clôturée", value: "closed" },
  { label: "Archivée", value: "archived" },
]

export default function JobForm() {
  const [apiMessage, setApiMessage] = useState<string>("")
  const [apiError, setApiError] = useState<string>("")
  const editorRef = useRef<HTMLDivElement>(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    defaultValues: {
      title: "",
      department: "",
      contractType: "CDI",
      location: "",
      desiredStartDate: "",
      description: "",
      criteria: {
        educationLevel: "",
        experienceYears: 0,
        skills: [{ name: "" }],
        languages: [{ name: "", level: "" }],
      },
      prescreenQuestions: [],
      status: "draft",
    },
  })

  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({
    control,
    name: "criteria.skills",
  })

  const {
    fields: languageFields,
    append: appendLanguage,
    remove: removeLanguage,
  } = useFieldArray({
    control,
    name: "criteria.languages",
  })

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({
    control,
    name: "prescreenQuestions",
  })

  const watchedQuestions = watch("prescreenQuestions")

  const formatText = (command: "bold" | "italic" | "insertUnorderedList") => {
    document.execCommand(command)
    const html = editorRef.current?.innerHTML ?? ""
    setValue("description", html, { shouldValidate: true })
  }

  const onEditorInput = () => {
    const html = editorRef.current?.innerHTML ?? ""
    setValue("description", html, { shouldValidate: true })
  }

  const onSubmit = async (values: JobFormValues) => {
    setApiMessage("")
    setApiError("")

    const payload = {
      ...values,
      prescreenQuestions: values.prescreenQuestions.map((q) => ({
        ...q,
        options:
          q.type === "multiple_choice"
            ? (q.optionsRaw || "")
                .split("\n")
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
      })),
    }

    try {
      await axios.post("/api/jobs", payload)
      setApiMessage("Offre enregistrée avec succès.")
    } catch (error: any) {
      setApiError(
        error?.response?.data?.message ||
          "Échec de l’envoi. Vérifiez l’API /api/jobs."
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-lg md:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Création d’offre d’emploi</h1>
        <Link
          to="/jobs"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Retour à la liste
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Bloc 1: Infos principales */}
        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">
            Informations principales
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Intitulé du poste *
              </label>
              <input
                {...register("title", { required: "Champ requis" })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Ex: Développeur Full Stack"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Service *
              </label>
              <input
                {...register("department", { required: "Champ requis" })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Ex: IT"
              />
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.department.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Type de contrat *
              </label>
              <select
                {...register("contractType", { required: "Champ requis" })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
              >
                {contractOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Lieu de travail *
              </label>
              <input
                {...register("location", { required: "Champ requis" })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Ex: Dakar / Hybride"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date de début souhaitée *
              </label>
              <input
                type="date"
                {...register("desiredStartDate", { required: "Champ requis" })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
              />
            </div>
          </div>
        </section>

        {/* Bloc 2: Salaire */}
        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-1 text-lg font-semibold text-slate-700">
            Fourchette salariale (interne, facultatif)
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Laisser vide si non communiqué.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="number"
              {...register("salaryMin", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
              placeholder="Salaire min"
            />
            <input
              type="number"
              {...register("salaryMax", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
              placeholder="Salaire max"
            />
          </div>
        </section>

        {/* Bloc 3: Description enrichie */}
        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">
            Description du poste
          </h2>

          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => formatText("bold")}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              Gras
            </button>
            <button
              type="button"
              onClick={() => formatText("italic")}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              Italique
            </button>
            <button
              type="button"
              onClick={() => formatText("insertUnorderedList")}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            >
              Liste
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            onInput={onEditorInput}
            className="min-h-40 w-full rounded-lg border border-slate-300 p-3 outline-none ring-indigo-500 focus:ring"
            suppressContentEditableWarning
          />

          <input
            type="hidden"
            {...register("description", {
              required: "La description est requise",
            })}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </section>

        {/* Bloc 4: Critères obligatoires */}
        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">
            Critères obligatoires
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Niveau d’études *
              </label>
              <input
                {...register("criteria.educationLevel", {
                  required: "Champ requis",
                })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                placeholder="Ex: Bac+5"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Années d’expérience minimum *
              </label>
              <input
                type="number"
                min={0}
                {...register("criteria.experienceYears", {
                  required: "Champ requis",
                  valueAsNumber: true,
                })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-slate-700">Compétences</h3>
              <button
                type="button"
                onClick={() => appendSkill({ name: "" })}
                className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
              >
                + Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {skillFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`criteria.skills.${index}.name` as const, {
                      required: "Compétence requise",
                    })}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                    placeholder="Ex: React"
                  />
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="rounded-md border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    Suppr.
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-slate-700">Langues</h3>
              <button
                type="button"
                onClick={() => appendLanguage({ name: "", level: "" })}
                className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
              >
                + Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {languageFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  <input
                    {...register(`criteria.languages.${index}.name` as const, {
                      required: "Langue requise",
                    })}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring md:col-span-3"
                    placeholder="Ex: Français"
                  />
                  <input
                    {...register(`criteria.languages.${index}.level` as const, {
                      required: "Niveau requis",
                    })}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring md:col-span-1"
                    placeholder="Ex: C1"
                  />
                  <button
                    type="button"
                    onClick={() => removeLanguage(index)}
                    className="rounded-md border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50 md:col-span-1"
                  >
                    Suppr.
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bloc 5: Questions de présélection */}
        <section className="rounded-xl border border-slate-200 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">
              Questions de présélection
            </h2>
            <button
              type="button"
              onClick={() =>
                appendQuestion({
                  label: "",
                  type: "yes_no",
                  required: true,
                  optionsRaw: "",
                })
              }
              className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
            >
              + Ajouter une question
            </button>
          </div>

          <div className="space-y-4">
            {questionFields.map((field, index) => {
              const qType = watchedQuestions?.[index]?.type
              return (
                <div key={field.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                    <input
                      {...register(`prescreenQuestions.${index}.label` as const, {
                        required: "Libellé requis",
                      })}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring md:col-span-3"
                      placeholder="Intitulé de la question"
                    />

                    <select
                      {...register(`prescreenQuestions.${index}.type` as const)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring md:col-span-2"
                    >
                      <option value="yes_no">Oui / Non</option>
                      <option value="text">Texte libre</option>
                      <option value="multiple_choice">Choix multiple</option>
                      <option value="number">Réponse numérique</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="rounded-md border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50 md:col-span-1"
                    >
                      Suppr.
                    </button>
                  </div>

                  <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      {...register(`prescreenQuestions.${index}.required` as const)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Réponse obligatoire
                  </label>

                  {qType === "multiple_choice" && (
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Options (une par ligne)
                      </label>
                      <textarea
                        {...register(
                          `prescreenQuestions.${index}.optionsRaw` as const
                        )}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                        rows={4}
                        placeholder={"Option 1\nOption 2\nOption 3"}
                      />
                    </div>
                  )}

                  {qType === "number" && (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        type="number"
                        {...register(`prescreenQuestions.${index}.min` as const, {
                          valueAsNumber: true,
                        })}
                        className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                        placeholder="Valeur min"
                      />
                      <input
                        type="number"
                        {...register(`prescreenQuestions.${index}.max` as const, {
                          valueAsNumber: true,
                        })}
                        className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
                        placeholder="Valeur max"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Bloc 6: Statut */}
        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">
            Statut de l’offre
          </h2>
          <select
            {...register("status")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring md:w-80"
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Envoi..." : "Enregistrer l’offre"}
          </button>
        </div>

        {apiMessage && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {apiMessage}
          </p>
        )}
        {apiError && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{apiError}</p>
        )}
      </form>
    </div>
  )
}