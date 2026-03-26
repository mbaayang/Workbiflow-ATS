export type ApplicationStatus =
	| 'pending'
	| 'reviewing'
	| 'interview'
	| 'test'
	| 'accepted'
	| 'rejected'
	| 'offer'

export interface PrescreenAnswer {
	label: string
	type: 'yes_no' | 'text' | 'multiple_choice' | 'number'
	answer: string
}

export interface Criteria {
	score: number
	max: number
	details: string
}

export interface AIScoreBreakdown {
	keywords: Criteria
	experience: Criteria
	education: Criteria
	prescreen: Criteria
	completeness: Criteria
	coherence: Criteria
}

export interface AIScoreUnavailable {
	status: 'unavailable'
	reason?: string
	at?: string
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
	aiScore?: number | null
	aiScoreBreakdown?: AIScoreBreakdown | AIScoreUnavailable
	aiRecommendation?: 'strong_match' | 'good_match' | 'average_match' | 'not_recommended' | null
}
