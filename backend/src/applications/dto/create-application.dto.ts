import { IsString, IsEmail, IsBoolean, IsNumber, IsOptional, IsArray } from 'class-validator'

export interface PrescreenAnswerDto {
	label: string
	type: 'yes_no' | 'text' | 'multiple_choice' | 'number'
	answer: string
}

export class CreateApplicationDto {
	@IsNumber()
	jobId: number

	@IsString()
	companySlug: string

	@IsString()
	firstName: string

	@IsString()
	lastName: string

	@IsEmail()
	email: string

	@IsOptional()
	@IsString()
	phone?: string

	@IsOptional()
	@IsString()
	city?: string

	@IsBoolean()
	consentAccepted: boolean

	@IsOptional()
	@IsArray()
	prescreenAnswers?: PrescreenAnswerDto[]

	// Files will be handled separately by multer
	cv?: Express.Multer.File
	coverLetter?: Express.Multer.File
}
