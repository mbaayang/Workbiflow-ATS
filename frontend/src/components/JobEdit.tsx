import { useEffect, useState } from 'react'
import type { ContractType, JobItem, JobStatus } from '../types/JobType'

interface JobEditPayload {
	title: string
	department: string
	contractType: ContractType
	location: string
	desiredStartDate: string
	status: JobStatus
}

interface JobEditProps {
	isOpen: boolean
	job: JobItem | null
	isSubmitting: boolean
	onClose: () => void
	onSave: (id: number, payload: JobEditPayload) => Promise<void>
}

export default function JobEdit({
	isOpen,
	job,
	isSubmitting,
	onClose,
	onSave,
}: JobEditProps) {
	const [title, setTitle] = useState('')
	const [department, setDepartment] = useState('')
	const [contractType, setContractType] = useState<ContractType>('CDI')
	const [location, setLocation] = useState('')
	const [desiredStartDate, setDesiredStartDate] = useState('')
	const [status, setStatus] = useState<JobStatus>('draft')

	useEffect(() => {
		if (!job) {
			return
		}

		setTitle(job.title)
		setDepartment(job.department)
		setContractType(job.contractType)
		setLocation(job.location)
		setDesiredStartDate(job.desiredStartDate)
		setStatus(job.status)
	}, [job])

	if (!isOpen || !job) {
		return null
	}

	const handleSubmit = async () => {
		await onSave(job.id, {
			title,
			department,
			contractType,
			location,
			desiredStartDate,
			status,
		})
	}

	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 md:items-center">
			<div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
				<div className="border-b border-slate-200 px-5 py-4 md:px-6">
					<h2 className="text-lg font-semibold text-slate-800 md:text-xl">
						Modifier l’offre
					</h2>
					<p className="mt-1 text-sm text-slate-500">Mets à jour les informations principales.</p>
				</div>

				<div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2 md:px-6">
					<div className="md:col-span-2">
						<label className="mb-1 block text-sm font-medium text-slate-700">Intitulé</label>
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
							placeholder="Intitulé du poste"
						/>
					</div>

					<div>
						<label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
						<input
							value={department}
							onChange={(event) => setDepartment(event.target.value)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
							placeholder="Service"
						/>
					</div>

					<div>
						<label className="mb-1 block text-sm font-medium text-slate-700">Type de contrat</label>
						<select
							value={contractType}
							onChange={(event) => setContractType(event.target.value as ContractType)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
						>
							<option value="CDI">CDI</option>
							<option value="CDD">CDD</option>
							<option value="stage">Stage</option>
							<option value="freelance">Freelance</option>
						</select>
					</div>

					<div>
						<label className="mb-1 block text-sm font-medium text-slate-700">Lieu</label>
						<input
							value={location}
							onChange={(event) => setLocation(event.target.value)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
							placeholder="Lieu"
						/>
					</div>

					<div>
						<label className="mb-1 block text-sm font-medium text-slate-700">Date de début</label>
						<input
							type="date"
							value={desiredStartDate}
							onChange={(event) => setDesiredStartDate(event.target.value)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
						/>
					</div>

					<div className="md:col-span-2">
						<label className="mb-1 block text-sm font-medium text-slate-700">Statut</label>
						<select
							value={status}
							onChange={(event) => setStatus(event.target.value as JobStatus)}
							className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
						>
							<option value="draft">Brouillon</option>
							<option value="published">Publiée</option>
							<option value="closed">Clôturée</option>
							<option value="archived">Archivée</option>
						</select>
					</div>
				</div>

				<div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 md:flex-row md:justify-end md:px-6">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						disabled={isSubmitting}
					>
						Annuler
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
					</button>
				</div>
			</div>
		</div>
	)
}
