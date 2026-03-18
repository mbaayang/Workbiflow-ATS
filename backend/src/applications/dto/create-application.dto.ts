import { IsString, IsEmail, IsBoolean, IsNumber, IsOptional, IsArray, Allow } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export interface PrescreenAnswerDto {
	label: string
	type: 'yes_no' | 'text' | 'multiple_choice' | 'number'
	answer: string
}

export class CreateApplicationDto {
	@ApiProperty({ description: 'ID of the job being applied to', example: 123 })
	@Type(() => Number)
	@IsNumber()
	jobId: number

	@ApiProperty({ description: 'Slug of the company', example: 'peak-performance' })
	@IsString()
	companySlug: string

	@ApiProperty({ description: 'Applicant\'s first name', example: 'John' })
	@IsString()
	firstName: string

	@ApiProperty({ description: 'Applicant\'s last name', example: 'Doe' })
	@IsString()
	lastName: string

	@ApiProperty({ description: 'Applicant\'s email address', example: 'john.doe@example.com' })
	@IsEmail()
	email: string

	@ApiProperty({ description: 'Applicant\'s phone number', example: '+33 1 23 45 67 89' })
	@IsOptional()
	@IsString()
	phone?: string

	@ApiProperty({ description: 'Applicant\'s city', example: 'Paris' })
	@IsOptional()
	@IsString()
	city?: string

	@ApiProperty({ description: 'Whether the applicant has accepted the consent', example: true })
	@Transform(({ value }) => value === true || String(value).toLowerCase() === 'true')
	@IsBoolean()
	consentAccepted: boolean

	@ApiProperty({ description: 'Answers to the pre-screening questions', example: [{ label: 'Do you have experience with React?', type: 'yes_no', answer: 'Yes' }] })
	@IsOptional()
	@Transform(({ value }) => {
		if (typeof value !== 'string') return value
		try {
			return JSON.parse(value)
		} catch {
			return value
		}
	})
	@IsArray()
	prescreenAnswers?: PrescreenAnswerDto[]

	// Files will be handled separately by multer
	@ApiProperty({ description: 'Applicant\'s CV', example: 'cv.pdf' })
	@Allow()
	cv?: Express.Multer.File
	
	@ApiProperty({ description: 'Applicant\'s cover letter', example: 'cover-letter.pdf' })
	@IsOptional()
	@Allow()
	coverLetter?: Express.Multer.File
}
