import type { ApplicationItem, PrescreenAnswer } from '../types/ApplicationType'

interface ApplicationDetailProps {
	isOpen: boolean
	application: ApplicationItem | null
	jobTitle?: string
	onClose: () => void
}

const answerTypeLabel: Record<PrescreenAnswer['type'], string> = {
	yes_no: 'Oui / Non',
	text: 'Texte libre',
	multiple_choice: 'Choix multiple',
	number: 'Numérique',
}

export default function ApplicationDetail({
	isOpen,
	application,
	jobTitle,
	onClose,
}: ApplicationDetailProps) {
	if (!isOpen || !application) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
			<div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
				<header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
					<div>
						<h2 className="text-lg font-semibold text-slate-800 md:text-xl">
							Détail candidature
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							{application.firstName} {application.lastName}
							{jobTitle ? ` • ${jobTitle}` : ''}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
					>
						Fermer
					</button>
				</header>

				<div className="max-h-[calc(90vh-80px)] space-y-5 overflow-y-auto p-5">
					<section className="rounded-xl bg-slate-50 p-4">
						<h3 className="mb-2 text-sm font-semibold text-slate-800">Informations candidat</h3>
						<div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
							<p><span className="font-medium">Email:</span> {application.email}</p>
							<p><span className="font-medium">Téléphone:</span> {application.phone || '-'}</p>
							<p><span className="font-medium">Ville:</span> {application.city || '-'}</p>
							<p>
								<span className="font-medium">Date de dépôt:</span>{' '}
								{application.createdAt
									? new Date(application.createdAt).toLocaleString('fr-FR')
									: '-'}
							</p>
							<p><span className="font-medium">Consentement RGPD:</span> {application.consentAccepted ? 'Oui' : 'Non'}</p>
							<p><span className="font-medium">Statut:</span> {application.status}</p>
						</div>
					</section>

					<section className="rounded-xl bg-slate-50 p-4">
						<h3 className="mb-2 text-sm font-semibold text-slate-800">Documents</h3>
						<div className="space-y-2 text-sm">
							{application.cvPath ? (
								<a
									href={`http://localhost:3000/${application.cvPath}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex text-indigo-600 hover:underline"
								>
									Voir le CV
								</a>
							) : (
								<p className="text-slate-600">CV non fourni</p>
							)}
							{application.coverLetterPath ? (
								<a
									href={`http://localhost:3000/${application.coverLetterPath}`}
									target="_blank"
									rel="noreferrer"
									className="block text-indigo-600 hover:underline"
								>
									Voir la lettre de motivation
								</a>
							) : (
								<p className="text-slate-600">Lettre de motivation non fournie</p>
							)}
						</div>
					</section>

					<section className="rounded-xl bg-slate-50 p-4">
						<h3 className="mb-2 text-sm font-semibold text-slate-800">Réponses de présélection</h3>
						{application.prescreenAnswers && application.prescreenAnswers.length > 0 ? (
							<ul className="space-y-3 text-sm text-slate-700">
								{application.prescreenAnswers.map((answer, index) => (
									<li key={`${application.id}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
										<p className="font-medium text-slate-800">{index + 1}. {answer.label}</p>
										<p className="mt-1 text-xs text-slate-500">Type: {answerTypeLabel[answer.type]}</p>
										<p className="mt-1 text-sm text-slate-700">Réponse: {answer.answer || '-'}</p>
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-slate-600">Aucune réponse de présélection.</p>
						)}
					</section>
				</div>
			</div>
		</div>
	)
}
