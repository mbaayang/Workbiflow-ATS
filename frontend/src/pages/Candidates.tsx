
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import ApplicationDetail from '../components/ApplicationDetail'
import type { ApplicationItem, ApplicationStatus } from '../types/ApplicationType'
import type { JobItem } from '../types/JobType'

const PAGE_SIZE = 5

interface PaginatedApplicationsResponse {
	items: ApplicationItem[]
	total: number
	limit: number
	offset: number
	hasMore: boolean
}

type StatusFilter = 'all' | ApplicationStatus

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
	{ value: 'all', label: 'Tous' },
	{ value: 'pending', label: 'Reçu' },
	{ value: 'reviewing', label: 'Présélection' },
	{ value: 'interview', label: 'Entretien' },
	{ value: 'test', label: 'Test' },
	{ value: 'accepted', label: 'Accepté' },
	{ value: 'rejected', label: 'Refusé' },
	{ value: 'offer', label: 'Offre' },
]

export default function Candidates() {
	const { jobId = '' } = useParams()

	const [job, setJob] = useState<JobItem | null>(null)
	const [applications, setApplications] = useState<ApplicationItem[]>([])
	const [selectedApplication, setSelectedApplication] = useState<ApplicationItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [offset, setOffset] = useState(0)
	const [total, setTotal] = useState(0)
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

	const parsedJobId = Number(jobId)

	const loadPage = async (nextOffset: number) => {
		if (!parsedJobId || Number.isNaN(parsedJobId)) {
			setError('Offre invalide.')
			setLoading(false)
			return
		}

		setLoading(true)
		setError('')
		try {
			const [jobResponse, applicationsResponse] = await Promise.all([
				axios.get(`/api/jobs/${parsedJobId}`),
				axios.get('/api/applications', {
					params: {
						jobId: parsedJobId,
						...(statusFilter !== 'all' ? { status: statusFilter } : {}),
						limit: PAGE_SIZE,
						offset: nextOffset,
					},
				}),
			])

			const jobPayload = jobResponse?.data?.data ?? jobResponse?.data
			const applicationsPayload =
				applicationsResponse?.data?.data ?? applicationsResponse?.data

			setJob(jobPayload ?? null)

			if (Array.isArray(applicationsPayload)) {
				setApplications(applicationsPayload)
				setTotal(applicationsPayload.length)
				setOffset(nextOffset)
				return
			}

			const paginated = applicationsPayload as PaginatedApplicationsResponse
			setApplications(Array.isArray(paginated.items) ? paginated.items : [])
			setTotal(paginated.total ?? 0)
			setOffset(paginated.offset ?? nextOffset)
		} catch {
			setError('Impossible de charger les candidatures pour cette offre.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void loadPage(0)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [parsedJobId, statusFilter])

	const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])
	const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
	const hasPrevious = offset > 0
	const hasNext = offset + PAGE_SIZE < total

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
			<div className="mx-auto w-full max-w-6xl space-y-5">
				<header className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-2xl font-bold text-slate-800 md:text-3xl">Candidatures</h1>
							<p className="mt-1 text-sm text-slate-600">
								{job ? `${job.title} • ${job.department}` : 'Chargement de l’offre...'}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Link
								to="/jobs"
								className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								Retour aux offres
							</Link>
							<Link
								to={`/jobs/${jobId}/pipeline`}
								className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
							>
								Voir pipeline
							</Link>
						</div>
					</div>
				</header>

				{error && (
					<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
				)}

				<section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
					<div className="mb-4 flex flex-wrap items-center gap-2">
						{statusFilterOptions.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setStatusFilter(option.value)}
								className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
									statusFilter === option.value
										? 'bg-indigo-600 text-white'
										: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
								}`}
							>
								{option.label}
							</button>
						))}
					</div>

					<div className="mb-4 flex items-center justify-between">
						<p className="text-sm text-slate-600">Total: {total} candidature(s)</p>
						<p className="text-sm text-slate-600">Page {currentPage} / {totalPages}</p>
					</div>

					{loading ? (
						<div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
							Chargement des candidatures...
						</div>
					) : applications.length === 0 ? (
						<div className="rounded-xl bg-slate-50 p-8 text-center text-slate-600">
							Aucune candidature pour cette offre.
						</div>
					) : (
						<div className="space-y-3">
							{applications.map((application) => (
								<article
									key={application.id}
									className="rounded-xl border border-slate-200 bg-slate-50 p-4"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<h2 className="text-base font-semibold text-slate-800">
												{application.firstName} {application.lastName}
											</h2>
											<p className="mt-1 text-sm text-slate-600">{application.email}</p>
											<p className="mt-1 text-xs text-slate-500">
												Ville: {application.city || '-'} • Déposé le{' '}
												{application.createdAt
													? new Date(application.createdAt).toLocaleDateString('fr-FR')
													: '-'}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
												{application.status}
											</span>
											<button
												type="button"
												onClick={() => setSelectedApplication(application)}
												className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
											>
												Voir détails
											</button>
										</div>
									</div>
								</article>
							))}
						</div>
					)}

					<div className="mt-5 flex justify-end gap-2">
						<button
							type="button"
							disabled={!hasPrevious || loading}
							onClick={() => void loadPage(Math.max(0, offset - PAGE_SIZE))}
							className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Précédent
						</button>
						<button
							type="button"
							disabled={!hasNext || loading}
							onClick={() => void loadPage(offset + PAGE_SIZE)}
							className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Suivant
						</button>
					</div>
				</section>

				<ApplicationDetail
					isOpen={Boolean(selectedApplication)}
					application={selectedApplication}
					jobTitle={job?.title}
					onClose={() => setSelectedApplication(null)}
				/>
			</div>
		</main>
	)
}
