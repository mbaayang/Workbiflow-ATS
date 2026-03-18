import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import KanbanBoard from '../components/KanbanBoard'
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
	accepted: 'offer',
	rejected: 'decision',
}

export default function Pipeline() {
	const { jobId: routeJobId = '' } = useParams()

	const [jobs, setJobs] = useState<JobItem[]>([])
	const [applications, setApplications] = useState<ApplicationItem[]>([])
	const [stageByApplicationId, setStageByApplicationId] = useState<Record<string, StageId>>({})
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

				setStageByApplicationId(initialStageMap)
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

	const moveCardToStage = (applicationId: string, toStageId: string) => {
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

		setStageByApplicationId((prev) => ({
			...prev,
			[applicationId]: toStageId as StageId,
		}))

		const targetStage = pipelineStages.find((stage) => stage.id === toStageId)
		setFeedback(
			`Candidature déplacée vers « ${targetStage?.title} ». Template email déclenché: ${targetStage?.emailLabel}.`,
		)
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
					activeJobTitle={selectedJob?.title}
				/>
			</div>
		</main>
	)
}
