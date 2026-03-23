import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { ApplicationItem } from '../types/ApplicationType'
import type { JobItem } from '../types/JobType'
import type { InterviewEvent, InterviewMeetingType } from '../types/InterviewType'

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const toDateKey = (value: Date) => {
	const year = value.getFullYear()
	const month = String(value.getMonth() + 1).padStart(2, '0')
	const day = String(value.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const startOfCalendarGrid = (monthDate: Date) => {
	const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
	const dayIndex = (firstDay.getDay() + 6) % 7
	firstDay.setDate(firstDay.getDate() - dayIndex)
	return firstDay
}

const generateMonthCells = (monthDate: Date) => {
	const start = startOfCalendarGrid(monthDate)
	return Array.from({ length: 42 }, (_, index) => {
		const day = new Date(start)
		day.setDate(start.getDate() + index)
		return day
	})
}

const formatMonthLabel = (value: Date) =>
	value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

const todayKey = toDateKey(new Date())

export default function Interviews() {
	const { jobId: routeJobId = '' } = useParams()
	const [searchParams] = useSearchParams()
	const preselectedCandidateId = searchParams.get('candidateId') ?? ''
	const parsedJobId = routeJobId ? Number(routeJobId) : null

	const [jobs, setJobs] = useState<JobItem[]>([])
	const [applications, setApplications] = useState<ApplicationItem[]>([])
	const [events, setEvents] = useState<InterviewEvent[]>([])
	const [currentMonth, setCurrentMonth] = useState(new Date())
	const [selectedDate, setSelectedDate] = useState(todayKey)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')

	const [candidateId, setCandidateId] = useState('')
	const [date, setDate] = useState(todayKey)
	const [time, setTime] = useState('09:00')
	const [durationMinutes, setDurationMinutes] = useState(45)
	const [interviewer, setInterviewer] = useState('')
	const [meetingType, setMeetingType] = useState<InterviewMeetingType>('video')
	const [locationOrLink, setLocationOrLink] = useState('')
	const [notes, setNotes] = useState('')

	useEffect(() => {
		const loadJobsAndApplications = async () => {
			setLoading(true)
			setError('')
			try {
				const [jobsResponse, applicationsResponse] = await Promise.all([
					axios.get('/api/jobs'),
					axios.get('/api/applications', {
						params: {
							status: 'interview',
						},
					}),
				])
				const jobsPayload = jobsResponse?.data?.data ?? jobsResponse?.data ?? []
				const applicationsPayload = applicationsResponse?.data?.data ?? applicationsResponse?.data ?? []

				setJobs(Array.isArray(jobsPayload) ? (jobsPayload as JobItem[]) : [])
				setApplications(
					Array.isArray(applicationsPayload) ? (applicationsPayload as ApplicationItem[]) : [],
				)
			} catch {
				setError('Impossible de charger les données d’entretien.')
			} finally {
				setLoading(false)
			}
		}

		void loadJobsAndApplications()
	}, [])

	const activeJobId = useMemo(() => {
		if (parsedJobId && !Number.isNaN(parsedJobId)) return parsedJobId
		return jobs[0]?.id ?? null
	}, [parsedJobId, jobs])

	const activeJob = useMemo(
		() => jobs.find((job) => job.id === activeJobId) ?? null,
		[jobs, activeJobId],
	)

	useEffect(() => {
		const loadInterviews = async () => {
			if (!activeJobId) {
				setEvents([])
				return
			}

			try {
				const interviewsResponse = await axios.get('/api/interviews', {
					params: { jobId: activeJobId },
				})
				const interviewsPayload = interviewsResponse?.data?.data ?? interviewsResponse?.data ?? []
				setEvents(Array.isArray(interviewsPayload) ? (interviewsPayload as InterviewEvent[]) : [])
			} catch {
				setError('Impossible de charger les entretiens planifiés pour cette offre.')
			}
		}

		void loadInterviews()
	}, [activeJobId])

	const candidatesForJob = useMemo(() => {
		if (!activeJobId) return []
		return applications
			.filter(
				(application) => application.jobId === activeJobId && application.status === 'interview',
			)
			.sort((a, b) => {
				const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return bDate - aDate
			})
	}, [applications, activeJobId])

	useEffect(() => {
		if (candidatesForJob.length === 0) {
			setCandidateId('')
			return
		}

		if (preselectedCandidateId) {
			const match = candidatesForJob.find((candidate) => candidate.id === preselectedCandidateId)
			if (match) {
				setCandidateId(match.id)
				return
			}
		}

		const currentStillValid = candidatesForJob.some((candidate) => candidate.id === candidateId)
		if (!currentStillValid) {
			setCandidateId(candidatesForJob[0].id)
		}
	}, [candidateId, candidatesForJob, preselectedCandidateId])

	const monthCells = useMemo(() => generateMonthCells(currentMonth), [currentMonth])

	const filteredEvents = useMemo(() => {
		if (!activeJobId) return []
		return events.filter((event) => event.jobId === activeJobId)
	}, [events, activeJobId])

	const eventsByDate = useMemo(() => {
		return filteredEvents.reduce<Record<string, InterviewEvent[]>>((acc, event) => {
			if (!acc[event.date]) acc[event.date] = []
			acc[event.date].push(event)
			return acc
		}, {})
	}, [filteredEvents])

	const selectedDayEvents = useMemo(
		() => (eventsByDate[selectedDate] ?? []).sort((a, b) => a.time.localeCompare(b.time)),
		[eventsByDate, selectedDate],
	)

	const resetForm = () => {
		setDate(selectedDate)
		setTime('09:00')
		setDurationMinutes(45)
		setInterviewer('')
		setMeetingType('video')
		setLocationOrLink('')
		setNotes('')
	}

	const scheduleInterview = async () => {
		setMessage('')
		setError('')

		if (!activeJobId) {
			setError('Aucune offre active pour planifier un entretien.')
			return
		}

		if (candidatesForJob.length === 0) {
			setError('Aucun candidat au statut entretien pour cette offre.')
			return
		}

		if (!candidateId || !date || !time || !interviewer.trim() || !locationOrLink.trim()) {
			setError('Veuillez renseigner tous les champs obligatoires.')
			return
		}

		const candidate = candidatesForJob.find((item) => item.id === candidateId)
		if (!candidate) {
			setError('Candidat introuvable pour cette offre.')
			return
		}

		try {
			const response = await axios.post('/api/interviews', {
				jobId: activeJobId,
				applicationId: candidate.id,
				candidateName: `${candidate.firstName} ${candidate.lastName}`,
				candidateEmail: candidate.email,
				date,
				time,
				durationMinutes,
				interviewer: interviewer.trim(),
				meetingType,
				locationOrLink: locationOrLink.trim(),
				notes: notes.trim() || undefined,
			})

			const createdInterview = (response?.data?.data ?? response?.data) as InterviewEvent
			setEvents((prev) => [createdInterview, ...prev])
			setSelectedDate(date)
			setMessage('Entretien planifié avec succès. Invitation email envoyée au candidat.')
			resetForm()
		} catch {
			setError('La planification a échoué. Vérifie les informations et réessaie.')
		}
	}

	if (loading) {
		return (
			<main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
				<div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
					Chargement du calendrier des entretiens...
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
			<div className="mx-auto w-full max-w-7xl space-y-5">
				<header className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
								Planification des entretiens
							</h1>
							<p className="mt-1 text-sm text-slate-600 md:text-base">
								Organise les rendez-vous candidats avec date, heure, interviewer et lieu.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Link
								to="/jobs"
								className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								Retour aux offres
							</Link>
							{activeJobId && (
								<Link
									to={`/jobs/${activeJobId}/pipeline`}
									className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
								>
									Pipeline
								</Link>
							)}
						</div>
					</div>

					{activeJob && (
						<p className="mt-3 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
							Offre active: {activeJob.title}
						</p>
					)}
				</header>

				{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
				{message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

				<div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
					<section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
						<div className="mb-4 flex items-center justify-between gap-2">
							<button
								type="button"
								onClick={() =>
									setCurrentMonth(
										(prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
									)
								}
								className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
							>
								Mois précédent
							</button>
							<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 md:text-base">
								{formatMonthLabel(currentMonth)}
							</h2>
							<button
								type="button"
								onClick={() =>
									setCurrentMonth(
										(prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
									)
								}
								className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
							>
								Mois suivant
							</button>
						</div>

						<div className="grid grid-cols-7 gap-2">
							{weekDays.map((name) => (
								<div
									key={name}
									className="rounded-lg bg-slate-100 px-2 py-2 text-center text-xs font-semibold text-slate-600"
								>
									{name}
								</div>
							))}

							{monthCells.map((day) => {
								const dayKey = toDateKey(day)
								const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
								const isSelected = dayKey === selectedDate
								const dayEvents = eventsByDate[dayKey] ?? []

								return (
									<button
										key={dayKey}
										type="button"
										onClick={() => {
											setSelectedDate(dayKey)
											setDate(dayKey)
										}}
										className={`min-h-[108px] rounded-xl border p-2 text-left transition ${
											isSelected
												? 'border-indigo-300 bg-indigo-50'
												: 'border-slate-200 bg-white hover:border-slate-300'
										}`}
									>
										<p
											className={`text-xs font-semibold ${
												isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
											}`}
										>
											{day.getDate()}
											{dayKey === todayKey && (
												<span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700">
													Aujourd’hui
												</span>
											)}
										</p>

										<div className="mt-2 space-y-1">
											{dayEvents.slice(0, 2).map((event) => (
												<div
													key={event.id}
													className="rounded-md bg-sky-100 px-2 py-1 text-[10px] font-medium text-sky-800"
												>
													{event.time} • {event.candidateName}
												</div>
											))}
											{dayEvents.length > 2 && (
												<p className="text-[10px] text-slate-500">+{dayEvents.length - 2} autres</p>
											)}
										</div>
									</button>
								)
							})}
						</div>
					</section>

					<aside className="space-y-5">
						<section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
							<h3 className="text-base font-semibold text-slate-800">Planifier un entretien</h3>
							<div className="mt-4 space-y-3">
								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">Candidat</label>
									<select
										value={candidateId}
										onChange={(event) => setCandidateId(event.target.value)}
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
									>
										<option value="">Choisir un candidat</option>
										{candidatesForJob.map((candidate) => (
											<option key={candidate.id} value={candidate.id}>
												{candidate.firstName} {candidate.lastName} • {candidate.email}
											</option>
										))}
									</select>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
										<input
											type="date"
											value={date}
											onChange={(event) => setDate(event.target.value)}
											className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
										/>
									</div>
									<div>
										<label className="mb-1 block text-xs font-medium text-slate-600">Heure</label>
										<input
											type="time"
											value={time}
											onChange={(event) => setTime(event.target.value)}
											className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="mb-1 block text-xs font-medium text-slate-600">Durée (min)</label>
										<input
											type="number"
											min={15}
											step={15}
											value={durationMinutes}
											onChange={(event) => setDurationMinutes(Number(event.target.value))}
											className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
										/>
									</div>
									<div>
										<label className="mb-1 block text-xs font-medium text-slate-600">Mode</label>
										<select
											value={meetingType}
											onChange={(event) => setMeetingType(event.target.value as InterviewMeetingType)}
											className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
										>
											<option value="video">Visio</option>
											<option value="onsite">Présentiel</option>
										</select>
									</div>
								</div>

								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">Interviewer</label>
									<input
										type="text"
										value={interviewer}
										onChange={(event) => setInterviewer(event.target.value)}
										placeholder="Nom du recruteur"
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
									/>
								</div>

								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">
										{meetingType === 'video' ? 'Lien visio' : 'Lieu'}
									</label>
									<input
										type="text"
										value={locationOrLink}
										onChange={(event) => setLocationOrLink(event.target.value)}
										placeholder={meetingType === 'video' ? 'https://meet...' : 'Adresse de rendez-vous'}
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
									/>
								</div>

								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
									<textarea
										value={notes}
										onChange={(event) => setNotes(event.target.value)}
										rows={3}
										placeholder="Informations utiles pour l’entretien"
										className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
									/>
								</div>

								<button
									type="button"
									onClick={scheduleInterview}
									className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
								>
									Planifier l’entretien
								</button>
							</div>
						</section>

						<section className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
							<h3 className="text-base font-semibold text-slate-800">
								Entretiens du {new Date(selectedDate).toLocaleDateString('fr-FR')}
							</h3>
							<div className="mt-3 space-y-2">
								{selectedDayEvents.length === 0 ? (
									<p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
										Aucun entretien prévu pour ce jour.
									</p>
								) : (
									selectedDayEvents.map((event) => (
										<article key={event.id} className="rounded-lg border border-slate-200 p-3">
											<p className="text-sm font-semibold text-slate-800">
												{event.time} • {event.candidateName}
											</p>
											<p className="mt-1 text-xs text-slate-600">
												Interviewer: {event.interviewer} • Durée: {event.durationMinutes} min
											</p>
											<p className="mt-1 text-xs text-slate-600">
												{event.meetingType === 'video' ? 'Lien' : 'Lieu'}: {event.locationOrLink}
											</p>
										</article>
									))
								)}
							</div>
						</section>
					</aside>
				</div>
			</div>
		</main>
	)
}
