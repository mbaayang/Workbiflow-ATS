import { Type } from 'class-transformer'
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateInterviewDto {
	@Type(() => Number)
	@IsInt()
	jobId: number

	@IsUUID()
	applicationId: string

	@IsOptional()
	@IsString()
	candidateName?: string

	@IsOptional()
	@IsEmail()
	candidateEmail?: string

	@IsDateString()
	date: string

	@IsString()
	time: string

	@Type(() => Number)
	@IsInt()
	@Min(15)
	@Max(480)
	durationMinutes: number

	@IsString()
	interviewer: string

	@IsEnum(['video', 'onsite'])
	meetingType: 'video' | 'onsite'

	@IsString()
	locationOrLink: string

	@IsOptional()
	@IsString()
	notes?: string
}
