import type { ApplicationItem } from '../types/ApplicationType'

export interface KanbanStage {
	id: string
	title: string
	description: string
	emailLabel: string
	accentClass: string
}

interface KanbanBoardProps {
	stages: KanbanStage[]
	groupedApplications: Record<string, ApplicationItem[]>
	onMoveCard: (applicationId: string, toStageId: string) => void
	onOpenDetails: (application: ApplicationItem) => void
	onSelectDecision: (applicationId: string, decision: 'accepted' | 'rejected') => void
	decisionStatusByApplicationId: Record<string, 'accepted' | 'rejected' | undefined>
	activeJobTitle?: string
}

export default function KanbanBoard({
	stages,
	groupedApplications,
	onMoveCard,
	onOpenDetails,
	onSelectDecision,
	decisionStatusByApplicationId,
	activeJobTitle,
}: KanbanBoardProps) {
	const getInitials = (firstName: string, lastName: string) => {
		const first = firstName?.trim()?.[0] ?? ''
		const last = lastName?.trim()?.[0] ?? ''
		return `${first}${last}`.toUpperCase() || '??'
	}

	const onDragStart = (event: React.DragEvent<HTMLElement>, applicationId: string) => {
		event.dataTransfer.setData('text/application-id', applicationId)
		event.dataTransfer.effectAllowed = 'move'
	}

	const onDrop = (event: React.DragEvent<HTMLElement>, targetStageId: string) => {
		event.preventDefault()
		const applicationId = event.dataTransfer.getData('text/application-id')
		if (!applicationId) {
			return
		}
		onMoveCard(applicationId, targetStageId)
	}

	return (
		<section className="space-y-4">
			<div className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
				<h1 className="text-2xl font-bold text-slate-800 md:text-3xl">Pipeline recrutement</h1>
				<p className="mt-2 text-sm text-slate-600 md:text-base">
					Glisse-dépose chaque candidature vers l’étape suivante pour faire avancer le process.
				</p>
				{activeJobTitle && (
					<p className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
						Offre active: {activeJobTitle}
					</p>
				)}
			</div>

			<div className="overflow-x-auto pb-2">
				<div className="grid min-w-[1320px] grid-cols-6 gap-4">
					{stages.map((stage) => {
						const cards = groupedApplications[stage.id] ?? []

						return (
							<section
								key={stage.id}
								onDragOver={(event) => event.preventDefault()}
								onDrop={(event) => onDrop(event, stage.id)}
								className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
							>
								<header className="mb-3 border-b border-slate-100 pb-3">
									<div className="flex items-start justify-between gap-2">
										<div>
											<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
												{stage.title}
											</h2>
											<p className="mt-1 text-xs text-slate-500">{stage.description}</p>
										</div>
										<span
											className={`rounded-full px-2 py-1 text-xs font-semibold ${stage.accentClass}`}
										>
											{cards.length}
										</span>
									</div>
								</header>

								<div className="space-y-3">
									{cards.map((application) => (
										<article
											key={application.id}
											draggable
											onDragStart={(event) => onDragStart(event, application.id)}
											className="cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-indigo-300 hover:bg-white active:cursor-grabbing"
										>
											<div className="flex items-start gap-3">
												<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
													{getInitials(application.firstName, application.lastName)}
												</div>
												<div className="min-w-0">
													<h3 className="truncate text-sm font-semibold text-slate-800">
														{application.firstName} {application.lastName}
													</h3>
													<p className="truncate text-xs text-slate-500">{application.email}</p>
												</div>
											</div>

											<div className="mt-3 space-y-1 text-xs text-slate-600">
												<p>Ville: {application.city || '-'}</p>
												<p>
													Déposé le:{' '}
													{application.createdAt
														? new Date(application.createdAt).toLocaleDateString('fr-FR')
														: '-'}
												</p>
												{application.cvPath && (
													<a
														href={`http://localhost:3000/${application.cvPath}`}
														target="_blank"
														rel="noreferrer"
														className="inline-flex items-center text-indigo-600 hover:underline"
													>
														Voir CV
													</a>
												)}
												<button
													type="button"
													onClick={(event) => {
														event.stopPropagation()
														onOpenDetails(application)
													}}
													className="inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
												>
													Voir détail
												</button>

												{stage.id === 'decision' && (
													<div className="mt-2 flex flex-wrap gap-2">
														<button
															type="button"
															onClick={(event) => {
																event.stopPropagation()
																onSelectDecision(application.id, 'accepted')
															}}
															className={`rounded-md px-2 py-1 text-xs font-medium ${
																decisionStatusByApplicationId[application.id] === 'accepted'
																	? 'bg-emerald-600 text-white'
																	: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
															}`}
														>
															Accepté
														</button>
														<button
															type="button"
															onClick={(event) => {
																event.stopPropagation()
																onSelectDecision(application.id, 'rejected')
															}}
															className={`rounded-md px-2 py-1 text-xs font-medium ${
																decisionStatusByApplicationId[application.id] === 'rejected'
																	? 'bg-rose-600 text-white'
																	: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
															}`}
														>
															Refusé
														</button>
													</div>
												)}
											</div>
										</article>
									))}
									{cards.length === 0 && (
										<div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
											Aucune candidature
										</div>
									)}
								</div>
							</section>
						)
					})}
				</div>
			</div>
		</section>
	)
}
