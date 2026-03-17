export type JobStatus = 'draft' | 'published' | 'closed' | 'archived'
export type ContractType = 'CDI' | 'CDD' | 'stage' | 'freelance'
export type QuestionType = 'yes_no' | 'text' | 'multiple_choice' | 'number'

export interface JobSkill {
	name: string
}

export interface JobLanguage {
	name: string
	level: string
}

export interface JobCriteria {
	educationLevel?: string
	experienceYears?: number
	skills?: JobSkill[]
	languages?: JobLanguage[]
}

export interface JobPrescreenQuestion {
	label: string
	type: QuestionType
	required: boolean
	options?: string[]
	min?: number
	max?: number
}

export interface JobItem {
	id: number
	title: string
	department: string
	contractType: ContractType
	location: string
	desiredStartDate: string
	salaryMin?: number | null
	salaryMax?: number | null
	description: string
	criteria?: JobCriteria
	prescreenQuestions?: JobPrescreenQuestion[]
	status: JobStatus
	companySlug: string
	publicApplyUrl?: string | null
	createdAt?: string
}
