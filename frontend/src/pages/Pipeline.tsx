import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import KanbanBoard from '../components/KanbanBoard'
import ApplicationDetail from '../components/ApplicationDetail'
import type { KanbanStage } from '../components/KanbanBoard'
import type { ApplicationItem } from '../types/ApplicationType'
import type { InterviewEvent } from '../types/InterviewType'
import type { JobItem } from '../types/JobType'

type StageId =
	| 'received'
	| 'screening'
	| 'interview'
	| 'test'
	| 'decision'
	| 'offer'

const PAGE_SIZE = 40

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

const stageToStatusesQuery: Record<StageId, ApplicationItem['status'][]> = {
	received: ['pending'],
	screening: ['reviewing'],
	interview: ['interview'],
	test: ['test'],
	decision: ['accepted', 'rejected'],
	offer: ['offer'],
}

const createEmptyStageApplications = (): Record<StageId, ApplicationItem[]> => ({
	received: [],
	screening: [],
	interview: [],
	test: [],
	decision: [],
	offer: [],
})

const createEmptyStageMeta = (): Record<StageId, { total: number; hasMore: boolean; loading: boolean }> => ({
	received: { total: 0, hasMore: false, loading: false },
	screening: { total: 0, hasMore: false, loading: false },
	interview: { total: 0, hasMore: false, loading: false },
	test: { total: 0, hasMore: false, loading: false },
	decision: { total: 0, hasMore: false, loading: false },
	offer: { total: 0, hasMore: false, loading: false },
})

const stageIds: StageId[] = ['received', 'screening', 'interview', 'test', 'decision', 'offer']

interface PaginatedApplicationsResponse {
	items: ApplicationItem[]
	total: number
	limit: number
	offset: number
	hasMore: boolean
}

export default function Pipeline() {
	const { jobId: routeJobId = '' } = useParams()
	const navigate = useNavigate()

	const [jobs, setJobs] = useState<JobItem[]>([])
	const [applicationsByStage, setApplicationsByStage] =
		useState<Record<StageId, ApplicationItem[]>>(createEmptyStageApplications())
	const [stageMeta, setStageMeta] =
		useState<Record<StageId, { total: number; hasMore: boolean; loading: boolean }>>(createEmptyStageMeta())
	const [stageByApplicationId, setStageByApplicationId] = useState<Record<string, StageId>>({})
	const [interviewPlannedByApplicationId, setInterviewPlannedByApplicationId] =
		useState<Record<string, boolean>>({})
	const [decisionStatusByApplicationId, setDecisionStatusByApplicationId] = useState<
		Record<string, 'accepted' | 'rejected' | undefined>
	>({})
	const [selectedApplication, setSelectedApplication] = useState<ApplicationItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [feedback, setFeedback] = useState('')

	const selectedJobId = routeJobId ? Number(routeJobId) : null

	const fetchStagePage = async (
		stageId: StageId,
		offset: number,
		jobId?: number,
	): Promise<PaginatedApplicationsResponse> => {
		const statuses = stageToStatusesQuery[stageId]
		const response = await axios.get('/api/applications', {
			params: {
				statuses: statuses.join(','),
				limit: PAGE_SIZE,
				offset,
				...(jobId ? { jobId } : {}),
			},
		})

		const payload = response?.data?.data ?? response?.data
		if (Array.isArray(payload)) {
			return {
				items: payload as ApplicationItem[],
				total: payload.length,
				limit: PAGE_SIZE,
				offset,
				hasMore: false,
			}
		}

		return payload as PaginatedApplicationsResponse
	}

	const hydrateDecisionAndStageMaps = (applications: ApplicationItem[]) => {
		setStageByApplicationId((prev) => {
			const next = { ...prev }
			for (const app of applications) {
				next[app.id] = statusToStage[app.status] ?? 'received'
			}
			return next
		})

		setDecisionStatusByApplicationId((prev) => {
			const next = { ...prev }
			for (const app of applications) {
				if (app.status === 'accepted' || app.status === 'rejected') {
					next[app.id] = app.status
				}
			}
			return next
		})
	}

	const fetchInterviewPlanningStatus = async (jobId?: number): Promise<Record<string, boolean>> => {
		const response = await axios.get('/api/interviews', {
			params: {
				...(jobId ? { jobId } : {}),
			},
		})

		const payload = response?.data?.data ?? response?.data
		const interviews = Array.isArray(payload)
			? (payload as InterviewEvent[])
			: ((payload?.items ?? []) as InterviewEvent[])

		return interviews.reduce<Record<string, boolean>>((acc, interview) => {
			if (interview.applicationId) {
				acc[interview.applicationId] = true
			}
			return acc
		}, {})
	}

	useEffect(() => {
		const fetchJobs = async () => {
			try {
				const jobsResponse = await axios.get('/api/jobs')
				const jobsPayload = jobsResponse?.data?.data ?? jobsResponse?.data ?? []
				setJobs(Array.isArray(jobsPayload) ? (jobsPayload as JobItem[]) : [])
			} catch {
				setError('Impossible de charger la liste des offres.')
			}
		}

		void fetchJobs()
	}, [])

	useEffect(() => {
		const fetchInitialPipeline = async () => {
			setLoading(true)
			setError('')
			setStageByApplicationId({})
			setInterviewPlannedByApplicationId({})
			setDecisionStatusByApplicationId({})
			setApplicationsByStage(createEmptyStageApplications())
			setStageMeta(createEmptyStageMeta())

			try {
				const [results, interviewPlanningMap] = await Promise.all([
					Promise.all(stageIds.map((stageId) => fetchStagePage(stageId, 0, selectedJobId ?? undefined))),
					fetchInterviewPlanningStatus(selectedJobId ?? undefined),
				])

				const nextApplications = createEmptyStageApplications()
				const nextMeta = createEmptyStageMeta()

				for (let i = 0; i < stageIds.length; i += 1) {
					const stageId = stageIds[i]
					const page = results[i]
					nextApplications[stageId] = page.items
					nextMeta[stageId] = {
						total: page.total,
						hasMore: page.hasMore,
						loading: false,
					}
				}

				setApplicationsByStage(nextApplications)
				setStageMeta(nextMeta)
				setInterviewPlannedByApplicationId(interviewPlanningMap)
				hydrateDecisionAndStageMaps(results.flatMap((page) => page.items))
			} catch {
				setError('Impossible de charger le pipeline pour le moment.')
			} finally {
				setLoading(false)
			}
		}

		void fetchInitialPipeline()
	}, [selectedJobId])

	const selectedJob = useMemo(() => {
		if (!selectedJobId) return null
		return jobs.find((job) => job.id === selectedJobId) ?? null
	}, [jobs, selectedJobId])

	const groupedApplications = useMemo(() => {
		const buckets: Record<string, ApplicationItem[]> = {
			received: [...applicationsByStage.received],
			screening: [...applicationsByStage.screening],
			interview: [...applicationsByStage.interview],
			test: [...applicationsByStage.test],
			decision: [...applicationsByStage.decision],
			offer: [...applicationsByStage.offer],
		}

		for (const stage of pipelineStages) {
			buckets[stage.id].sort((a, b) => {
				const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return dateB - dateA
			})
		}

		return buckets
	}, [applicationsByStage])

	const totalLoadedApplications = useMemo(
		() => stageIds.reduce((total, stageId) => total + (applicationsByStage[stageId]?.length ?? 0), 0),
		[applicationsByStage],
	)

	const loadMoreStage = async (stageId: StageId) => {
		const currentItems = applicationsByStage[stageId] ?? []
		setStageMeta((prev) => ({
			...prev,
			[stageId]: {
				...prev[stageId],
				loading: true,
			},
		}))

		try {
			const page = await fetchStagePage(stageId, currentItems.length, selectedJobId ?? undefined)
			setApplicationsByStage((prev) => {
				const existingIds = new Set(prev[stageId].map((item) => item.id))
				const newItems = page.items.filter((item) => !existingIds.has(item.id))
				return {
					...prev,
					[stageId]: [...prev[stageId], ...newItems],
				}
			})
			setStageMeta((prev) => ({
				...prev,
				[stageId]: {
					total: page.total,
					hasMore: page.hasMore,
					loading: false,
				},
			}))
			hydrateDecisionAndStageMaps(page.items)
		} catch {
			setStageMeta((prev) => ({
				...prev,
				[stageId]: {
					...prev[stageId],
					loading: false,
				},
			}))
			setFeedback('Échec du chargement supplémentaire pour cette colonne.')
		}
	}

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
			let movedToDecision: ApplicationItem | null = null
			setApplicationsByStage((prev) => {
				const sourceItems = prev[currentStageId].filter((item) => {
					if (item.id === applicationId) {
						movedToDecision = item
						return false
					}
					return true
				})

				if (!movedToDecision) {
					return prev
				}

				return {
					...prev,
					[currentStageId]: sourceItems,
					decision: [movedToDecision, ...prev.decision],
				}
			})

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

		const sourceApplication = applicationsByStage[currentStageId].find(
			(application) => application.id === applicationId,
		)

		setStageByApplicationId((prev) => ({
			...prev,
			[applicationId]: toStageId as StageId,
		}))

		let movedApplication: ApplicationItem | null = null
		setApplicationsByStage((prev) => {
			const sourceItems = prev[currentStageId].filter((application) => {
				if (application.id === applicationId) {
					movedApplication = { ...application, status: statusToPersist }
					return false
				}
				return true
			})

			if (!movedApplication) {
				return prev
			}

			return {
				...prev,
				[currentStageId]: sourceItems,
				[toStageId]: [movedApplication, ...prev[toStageId as StageId]],
			}
		})

		try {
			await axios.patch(`/api/applications/${applicationId}`, { status: statusToPersist })
		} catch {
			setStageByApplicationId((prev) => ({
				...prev,
				[applicationId]: currentStageId,
			}))

			const rollbackStatus =
				currentStageId === 'decision'
					? decisionStatusByApplicationId[applicationId] || 'accepted'
					: stageToStatusMap[currentStageId as PersistedStageId]

			setApplicationsByStage((prev) => {
				const targetItems = prev[toStageId as StageId].filter((app) => app.id !== applicationId)
				const existingInSource = prev[currentStageId].some((app) => app.id === applicationId)
				const restored = movedApplication
					? { ...movedApplication, status: rollbackStatus }
					: null

				return {
					...prev,
					[toStageId as StageId]: targetItems,
					[currentStageId]:
						restored && !existingInSource
							? [restored, ...prev[currentStageId]]
							: prev[currentStageId],
				}
			})

			setFeedback('Échec de la mise à jour en base. Le déplacement a été annulé.')
			return
		}

		const targetStage = pipelineStages.find((stage) => stage.id === toStageId)

		if (toStageId === 'interview') {
			setFeedback(
				`Candidature déplacée vers « ${targetStage?.title} ». Planifie l’entretien pour déclencher l’email d’invitation.`,
			)

			const shouldPlanNow = window.confirm(
				'Cette candidature est maintenant à l’étape Entretien. Voulez-vous planifier un entretien maintenant ?',
			)

			if (shouldPlanNow) {
				const redirectJobId = selectedJobId ?? sourceApplication?.jobId
				if (redirectJobId) {
					navigate(`/jobs/${redirectJobId}/interviews?candidateId=${applicationId}`)
				} else {
					navigate(`/interviews?candidateId=${applicationId}`)
				}
			}

			return
		}

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

		setApplicationsByStage((prev) => ({
			...prev,
			decision: prev.decision.map((application) =>
				application.id === applicationId ? { ...application, status: decision } : application,
			),
		}))

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
						<span>{totalLoadedApplications} candidature(s) affichée(s)</span>
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
					stageMeta={stageMeta}
					onMoveCard={moveCardToStage}
					onOpenDetails={(application) => setSelectedApplication(application)}
					onOpenInterviewPlanner={(application) => {
						const redirectJobId = selectedJobId ?? application.jobId
						if (redirectJobId) {
							navigate(`/jobs/${redirectJobId}/interviews?candidateId=${application.id}`)
							return
						}
						navigate(`/interviews?candidateId=${application.id}`)
					}}
					onSelectDecision={handleDecisionSelection}
					decisionStatusByApplicationId={decisionStatusByApplicationId}
					interviewPlannedByApplicationId={interviewPlannedByApplicationId}
					onLoadMoreStage={(stageId) => void loadMoreStage(stageId as StageId)}
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
