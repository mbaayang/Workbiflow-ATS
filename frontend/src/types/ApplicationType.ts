export type ApplicationStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected'

export interface PrescreenAnswer {
	label: string
	type: 'yes_no' | 'text' | 'multiple_choice' | 'number'
	answer: string
}

export interface ApplicationItem {
	id: string
	jobId: number
	companySlug: string
	firstName: string
	lastName: string
	email: string
	phone?: string | null
	city?: string | null
	consentAccepted: boolean
	cvPath?: string | null
	coverLetterPath?: string | null
	prescreenAnswers?: PrescreenAnswer[]
	status: ApplicationStatus
	createdAt?: string
	updatedAt?: string
}
