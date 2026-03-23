export type InterviewMeetingType = 'onsite' | 'video'

export interface InterviewEvent {
	id: string
	jobId: number
	applicationId: string
	candidateName: string
	candidateEmail: string
	date: string
	time: string
	durationMinutes: number
	interviewer: string
	meetingType: InterviewMeetingType
	locationOrLink: string
	notes?: string
	createdAt: string
	updatedAt?: string
}
