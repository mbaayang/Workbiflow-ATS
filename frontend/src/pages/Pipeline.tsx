import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import KanbanBoard from '../components/KanbanBoard'
import ApplicationDetail from '../components/ApplicationDetail'
import type { KanbanStage } from '../components/KanbanBoard'
import type { ApplicationItem } from '../types/ApplicationType'
import type { JobItem } from '../types/JobType'

type StageId =
	| 'received'
	| 'screening'
	| 'interview'
	| 'test'
	| 'decision'
	| 'offer'

const pipelineStages: KanbanStage[] = [
	{
		id: 'received',
		title: 'Reçu',
		description: 'Demande soumise',
		emailLabel: 'Accusé de réception',
		accentClass: 'bg-sky-100 text-sky-700',
	},
	{
		id: 'screening',
		title: 'Sélection présélection',
		description: 'Note examinée, CV lu',
		emailLabel: 'Présélection en cours',
		accentClass: 'bg-indigo-100 text-indigo-700',
	},
	{
		id: 'interview',
		title: 'Entretien',
		description: 'Rencontre prévue',
		emailLabel: 'Invitation entretien',
		accentClass: 'bg-violet-100 text-violet-700',
	},
	{
		id: 'test',
		title: 'Test',
		description: 'Évaluation des compétences',
		emailLabel: 'Invitation test',
		accentClass: 'bg-amber-100 text-amber-700',
	},
	{
		id: 'decision',
		title: 'Décision',
		description: 'Embauché / Refusé',
		emailLabel: 'Décision recrutement',
		accentClass: 'bg-rose-100 text-rose-700',
	},
	{
		id: 'offer',
		title: 'Offre',
		description: 'Contrat envoyé',
		emailLabel: 'Envoi du contrat',
		accentClass: 'bg-emerald-100 text-emerald-700',
	},
]

const stageIndexMap = pipelineStages.reduce<Record<string, number>>((acc, stage, index) => {
	acc[stage.id] = index
	return acc
}, {})

const statusToStage: Record<ApplicationItem['status'], StageId> = {
	pending: 'received',
	reviewing: 'screening',
	interview: 'interview',
	test: 'test',
	accepted: 'decision',
	rejected: 'decision',
	offer: 'offer',
}

type PersistedStageId = Exclude<StageId, 'decision'>

const stageToStatusMap: Record<PersistedStageId, ApplicationItem['status']> = {
	received: 'pending',
	screening: 'reviewing',
	interview: 'interview',
	test: 'test',
	offer: 'offer',
}

export default function Pipeline() {
	const { jobId: routeJobId = '' } = useParams()

	const [jobs, setJobs] = useState<JobItem[]>([])
	const [applications, setApplications] = useState<ApplicationItem[]>([])
	const [stageByApplicationId, setStageByApplicationId] = useState<Record<string, StageId>>({})
	const [decisionStatusByApplicationId, setDecisionStatusByApplicationId] = useState<
		Record<string, 'accepted' | 'rejected' | undefined>
	>({})
	const [selectedApplication, setSelectedApplication] = useState<ApplicationItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [feedback, setFeedback] = useState('')

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true)
			setError('')

			try {
				const [jobsResponse, applicationsResponse] = await Promise.all([
					axios.get('/api/jobs'),
					axios.get('/api/applications'),
				])

				const jobsPayload = jobsResponse?.data?.data ?? jobsResponse?.data ?? []
				const applicationsPayload = applicationsResponse?.data?.data ?? applicationsResponse?.data ?? []

				const jobsList = Array.isArray(jobsPayload) ? (jobsPayload as JobItem[]) : []
				const applicationsList = Array.isArray(applicationsPayload)
					? (applicationsPayload as ApplicationItem[])
					: []

				setJobs(jobsList)
				setApplications(applicationsList)

				const initialStageMap = applicationsList.reduce<Record<string, StageId>>((acc, app) => {
					acc[app.id] = statusToStage[app.status] ?? 'received'
					return acc
				}, {})

				const initialDecisionMap = applicationsList.reduce<
					Record<string, 'accepted' | 'rejected' | undefined>
				>((acc, app) => {
					if (app.status === 'accepted' || app.status === 'rejected') {
						acc[app.id] = app.status
					}
					return acc
				}, {})

				setStageByApplicationId(initialStageMap)
				setDecisionStatusByApplicationId(initialDecisionMap)
			} catch {
				setError('Impossible de charger le pipeline pour le moment.')
			} finally {
				setLoading(false)
			}
		}

		void fetchData()
	}, [])

	const selectedJobId = routeJobId ? Number(routeJobId) : null

	const selectedJob = useMemo(() => {
		if (!selectedJobId) return null
		return jobs.find((job) => job.id === selectedJobId) ?? null
	}, [jobs, selectedJobId])

	const filteredApplications = useMemo(() => {
		if (!selectedJobId) return applications
		return applications.filter((application) => application.jobId === selectedJobId)
	}, [applications, selectedJobId])

	const groupedApplications = useMemo(() => {
		const buckets: Record<string, ApplicationItem[]> = pipelineStages.reduce((acc, stage) => {
			acc[stage.id] = []
			return acc
		}, {} as Record<string, ApplicationItem[]>)

		for (const application of filteredApplications) {
			const stageId = stageByApplicationId[application.id] ?? 'received'
			buckets[stageId].push(application)
		}

		for (const stage of pipelineStages) {
			buckets[stage.id].sort((a, b) => {
				const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return dateB - dateA
			})
		}

		return buckets
	}, [filteredApplications, stageByApplicationId])

	const moveCardToStage = async (applicationId: string, toStageId: string) => {
		const currentStageId = stageByApplicationId[applicationId] ?? 'received'
		if (currentStageId === toStageId) {
			return
		}

		const currentIndex = stageIndexMap[currentStageId]
		const targetIndex = stageIndexMap[toStageId]

		if (targetIndex !== currentIndex + 1) {
			setFeedback('Déplacement autorisé uniquement vers l’étape suivante.')
			return
		}

		if (toStageId === 'offer' && decisionStatusByApplicationId[applicationId] !== 'accepted') {
			setFeedback('Pour passer à Offre, la candidature doit être marquée “Accepté” dans Décision.')
			return
		}

		if (toStageId === 'decision') {
			setStageByApplicationId((prev) => ({
				...prev,
				[applicationId]: 'decision',
			}))
			setFeedback('Étape Décision atteinte. Choisis “Accepté” ou “Refusé” pour notifier le candidat.')
			return
		}

		const statusToPersist = stageToStatusMap[toStageId as PersistedStageId]
		if (!statusToPersist) {
			setFeedback('Étape inconnue, impossible de sauvegarder la candidature.')
			return
		}

		setStageByApplicationId((prev) => ({
			...prev,
			[applicationId]: toStageId as StageId,
		}))

		setApplications((prev) =>
			prev.map((application) =>
				application.id === applicationId
					? { ...application, status: statusToPersist }
					: application,
			),
		)

		try {
			await axios.patch(`/api/applications/${applicationId}`, { status: statusToPersist })
		} catch {
			setStageByApplicationId((prev) => ({
				...prev,
				[applicationId]: currentStageId,
			}))

			const previousStatus =
				currentStageId === 'decision'
					? decisionStatusByApplicationId[applicationId] || 'accepted'
					: stageToStatusMap[currentStageId as PersistedStageId]
			setApplications((prev) =>
				prev.map((application) =>
					application.id === applicationId
						? { ...application, status: previousStatus }
						: application,
				),
			)

			setFeedback('Échec de la mise à jour en base. Le déplacement a été annulé.')
			return
		}

		const targetStage = pipelineStages.find((stage) => stage.id === toStageId)
		setFeedback(
			`Candidature déplacée vers « ${targetStage?.title} ». Template email déclenché: ${targetStage?.emailLabel}.`,
		)
	}

	const handleDecisionSelection = async (
		applicationId: string,
		decision: 'accepted' | 'rejected',
	) => {
		setDecisionStatusByApplicationId((prev) => ({
			...prev,
			[applicationId]: decision,
		}))

		setApplications((prev) =>
			prev.map((application) =>
				application.id === applicationId ? { ...application, status: decision } : application,
			),
		)

		try {
			await axios.patch(`/api/applications/${applicationId}`, { status: decision })
			setFeedback(
				`Décision enregistrée: ${decision === 'accepted' ? 'Accepté' : 'Refusé'}. Email candidat envoyé.`,
			)
		} catch {
			setFeedback('Échec de l’enregistrement de la décision. Réessaie.')
		}
	}

	if (loading) {
		return (
			<main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
				<div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
					Chargement du pipeline...
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
			<div className="mx-auto w-full max-w-[1600px] space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 text-sm text-slate-600">
						<Link
							to="/jobs"
							className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
						>
							Retour aux offres
						</Link>
						<span className="hidden md:inline">•</span>
						<span>{filteredApplications.length} candidature(s)</span>
					</div>
				</div>

				{error && (
					<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
				)}
				{feedback && (
					<p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">{feedback}</p>
				)}

				<KanbanBoard
					stages={pipelineStages}
					groupedApplications={groupedApplications}
					onMoveCard={moveCardToStage}
					onOpenDetails={(application) => setSelectedApplication(application)}
					onSelectDecision={handleDecisionSelection}
					decisionStatusByApplicationId={decisionStatusByApplicationId}
					activeJobTitle={selectedJob?.title}
				/>

				<ApplicationDetail
					isOpen={Boolean(selectedApplication)}
					application={selectedApplication}
					jobTitle={selectedJob?.title}
					onClose={() => setSelectedApplication(null)}
				/>
			</div>
		</main>
	)
}
