import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import JobEdit from '../components/JobEdit'
import type {
	ContractType,
	JobItem,
	QuestionType,
	JobPrescreenQuestion,
	JobStatus,
	JobLanguage,
	JobSkill,
} from '../types/JobType'

const statusLabel: Record<JobStatus, string> = {
	draft: 'Brouillon',
	published: 'Publiée',
	closed: 'Clôturée',
	archived: 'Archivée',
}

const questionTypeLabel: Record<QuestionType, string> = {
	yes_no: 'Oui / Non',
	text: 'Texte libre',
	multiple_choice: 'Choix multiple',
	number: 'Réponse numérique',
}

const statusBadge: Record<JobStatus, string> = {
	draft: 'bg-slate-100 text-slate-700',
	published: 'bg-emerald-100 text-emerald-700',
	closed: 'bg-amber-100 text-amber-700',
	archived: 'bg-violet-100 text-violet-700',
}

export default function Jobs() {
	const [jobs, setJobs] = useState<JobItem[]>([])
	const [applicationCounts, setApplicationCounts] = useState<Record<number, number>>({})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [detailJobId, setDetailJobId] = useState<number | null>(null)
	const [editingJob, setEditingJob] = useState<JobItem | null>(null)
	const [savingEdit, setSavingEdit] = useState(false)

	const loadJobs = async () => {
		setLoading(true)
		setError('')
		try {
			const [jobsResponse, applicationsResponse] = await Promise.all([
				axios.get('/api/jobs'),
				axios.get('/api/applications'),
			])
			const jobsPayload = jobsResponse?.data?.data ?? jobsResponse?.data ?? []
			const applicationsPayload = applicationsResponse?.data?.data ?? applicationsResponse?.data ?? []

			const jobsList = Array.isArray(jobsPayload) ? jobsPayload : []
			setJobs(jobsList)

			const counts = (Array.isArray(applicationsPayload) ? applicationsPayload : []).reduce(
				(acc: Record<number, number>, application: { jobId?: number }) => {
					const jobId = Number(application.jobId)
					if (!Number.isNaN(jobId)) {
						acc[jobId] = (acc[jobId] ?? 0) + 1
					}
					return acc
				},
				{},
			)
			setApplicationCounts(counts)
		} catch {
			setError('Impossible de charger les offres pour le moment.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void loadJobs()
	}, [])

	const startEdit = (job: JobItem) => {
		setMessage('')
		setEditingJob(job)
	}

	const cancelEdit = () => {
		setEditingJob(null)
	}

	const saveEdit = async (
		id: number,
		payload: {
			title: string
			department: string
			contractType: ContractType
			location: string
			desiredStartDate: string
			status: JobStatus
		},
	) => {
		setMessage('')
		setError('')
		setSavingEdit(true)

		try {
			await axios.patch(`/api/jobs/${id}`, payload)
			setMessage('Offre modifiée avec succès.')
			setEditingJob(null)
			await loadJobs()
		} catch {
			setError('La modification a échoué. Réessaie.')
		} finally {
			setSavingEdit(false)
		}
	}

	const deleteJob = async (id: number) => {
		const confirmed = window.confirm(
			'Supprimer cette offre ? Cette action est irréversible.',
		)

		if (!confirmed) {
			return
		}

		setMessage('')
		setError('')

		try {
			await axios.delete(`/api/jobs/${id}`)
			setMessage('Offre supprimée avec succès.')
			setJobs((prev) => prev.filter((job) => job.id !== id))
		} catch {
			setError('Suppression impossible pour le moment.')
		}
	}

	const sortedJobs = useMemo(
		() => [...jobs].sort((a, b) => (b.id || 0) - (a.id || 0)),
		[jobs],
	)

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
			<div className="mx-auto w-full max-w-6xl">
				<header className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
					<div>
						<h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
							Offres d’emploi
						</h1>
						<p className="mt-1 text-sm text-slate-500 md:text-base">
							Gérer les offres créées, les modifier, voir les détails ou les supprimer.
						</p>
					</div>

					<Link
						to="/jobs/new"
						className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
					>
						Créer une offre
					</Link>
				</header>

				{message && (
					<p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
						{message}
					</p>
				)}
				{error && (
					<p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
						{error}
					</p>
				)}

				{loading ? (
					<div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
						Chargement des offres...
					</div>
				) : sortedJobs.length === 0 ? (
					<div className="rounded-2xl bg-white p-8 text-center shadow-sm">
						<p className="text-slate-700">Aucune offre créée pour le moment.</p>
						<p className="mt-1 text-sm text-slate-500">
							Commence par créer une première offre.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{sortedJobs.map((job) => {
							const showDetails = detailJobId === job.id

							return (
								<article
									key={job.id}
									className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
								>
									<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
										<div className="min-w-0">
											<h2 className="truncate text-lg font-semibold text-slate-800 md:text-xl">
												{job.title}
											</h2>
											<p className="mt-1 text-sm text-slate-600">
												{job.department} • {job.location}
											</p>
											<div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
												<span
													className={`rounded-full px-2.5 py-1 font-medium ${statusBadge[job.status]}`}
												>
													{statusLabel[job.status]}
												</span>
												<span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
													{job.contractType.toUpperCase()}
												</span>
												<span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
													Début: {job.desiredStartDate}
												</span>
												<Link
													to={`/jobs/${job.id}/candidates`}
													className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-200"
												>
													{applicationCounts[job.id] ?? 0} candidature(s)
												</Link>
											</div>
										</div>

										<div className="flex flex-wrap gap-2 md:justify-end">
											<Link
												to={`/jobs/${job.id}/interviews`}
												className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
											>
												Interviews
											</Link>
											<Link
												to={`/jobs/${job.id}/pipeline`}
												className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
											>
												Pipeline
											</Link>
											<button
												type="button"
												onClick={() =>
													setDetailJobId((prev) => (prev === job.id ? null : job.id))
												}
												className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
											>
												{showDetails ? 'Masquer détails' : 'Voir détails'}
											</button>
											<button
												type="button"
												onClick={() => startEdit(job)}
												className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
											>
												Modifier
											</button>
											<button
												type="button"
												onClick={() => deleteJob(job.id)}
												className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
											>
												Supprimer
											</button>
										</div>
									</div>

									{showDetails && (
										<div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
											<p>
												<span className="font-medium text-slate-900">ID:</span> #{job.id}
											</p>
											<p>
												<span className="font-medium text-slate-900">Entreprise:</span>{' '}
												{job.companySlug}
											</p>
											<p>
												<span className="font-medium text-slate-900">Salaire:</span>{' '}
												{job.salaryMin ?? '-'} – {job.salaryMax ?? '-'}
											</p>
											<p>
												<span className="font-medium text-slate-900">Créée le:</span>{' '}
												{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '-'}
											</p>
											<p>
												<span className="font-medium text-slate-900">Candidatures:</span>{' '}
												{applicationCounts[job.id] ?? 0}
											</p>
											<p className="md:col-span-2 break-all">
												<span className="font-medium text-slate-900">URL publique:</span>{' '}
												{job.publicApplyUrl ? (
													<a href={job.publicApplyUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
														{job.publicApplyUrl}
													</a>
												) : (
													'-'
												)}
											</p>
											<div className="md:col-span-2">
												<p className="mb-1 font-medium text-slate-900">Description:</p>
												<div
													className="prose prose-sm max-w-none rounded-lg bg-white p-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
													dangerouslySetInnerHTML={{ __html: job.description || '-' }}
												/>
											</div>

											<div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-3">
												<p className="mb-2 font-medium text-slate-900">Critères obligatoires</p>
												<div className="space-y-1 text-sm text-slate-700">
													<p>
														<span className="font-medium text-slate-900">Niveau d’études:</span>{' '}
														{job.criteria?.educationLevel || '-'}
													</p>
													<p>
														<span className="font-medium text-slate-900">Années d’expérience:</span>{' '}
														{job.criteria?.experienceYears ?? '-'}
													</p>
													<p>
														<span className="font-medium text-slate-900">Compétences:</span>{' '}
														{job.criteria?.skills && job.criteria.skills.length > 0
															? job.criteria.skills.map((skill: JobSkill) => skill.name).join(', ')
															: '-'}
													</p>
													<p>
														<span className="font-medium text-slate-900">Langues:</span>{' '}
														{job.criteria?.languages && job.criteria.languages.length > 0
															? job.criteria.languages
																	.map((language: JobLanguage) => `${language.name} (${language.level})`)
																	.join(', ')
															: '-'}
													</p>
												</div>
											</div>

											<div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-3">
												<p className="mb-2 font-medium text-slate-900">Questions de présélection</p>
												{job.prescreenQuestions && job.prescreenQuestions.length > 0 ? (
													<ul className="space-y-2 text-sm text-slate-700">
														{job.prescreenQuestions.map((question: JobPrescreenQuestion, index: number) => (
															<li key={`${job.id}-${index}`} className="rounded-md border border-slate-100 bg-slate-50 p-2">
																<p className="font-medium text-slate-900">{index + 1}. {question.label}</p>
																<p className="mt-1 text-xs text-slate-600">
																	Type: {questionTypeLabel[question.type]} • Obligatoire: {question.required ? 'Oui' : 'Non'}
																</p>
																{question.type === 'multiple_choice' && question.options && question.options.length > 0 && (
																	<p className="mt-1 text-xs text-slate-600">
																		Options: {question.options.join(', ')}
																	</p>
																)}
																{question.type === 'number' && (
																	<p className="mt-1 text-xs text-slate-600">
																		Valeurs: min {question.min ?? '-'} / max {question.max ?? '-'}
																	</p>
																)}
															</li>
														))}
													</ul>
												) : (
													<p className="text-sm text-slate-600">Aucune question de présélection.</p>
												)}
											</div>
										</div>
									)}
								</article>
							)
						})}
					</div>
				)}
			</div>

			<JobEdit
				isOpen={Boolean(editingJob)}
				job={editingJob}
				isSubmitting={savingEdit}
				onClose={cancelEdit}
				onSave={saveEdit}
			/>
		</main>
	)
}
