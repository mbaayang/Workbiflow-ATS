import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsDateString,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	Min,
	ValidateNested,
} from 'class-validator';
import {
	JobContractType,
	JobQuestionType,
	JobStatus,
} from '../entities/job.entity';

class SkillDto {
	@IsString()
	@IsNotEmpty()
	name: string;
}

class LanguageDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	level: string;
}

class JobCriteriaDto {
	@IsString()
	@IsNotEmpty()
	educationLevel: string;

	@Type(() => Number)
	@IsInt()
	@Min(0)
	experienceYears: number;

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => SkillDto)
	skills: SkillDto[];

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => LanguageDto)
	languages: LanguageDto[];
}

class PrescreenQuestionDto {
	@IsString()
	@IsNotEmpty()
	label: string;

	@IsEnum(JobQuestionType)
	type: JobQuestionType;

	@IsBoolean()
	required: boolean;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	options?: string[];

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	min?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	max?: number;
}

export class CreateJobDto {
	@ApiProperty({ description: 'Title of the job', example: 'Software Engineer' })
	@IsString()
	@IsNotEmpty()
	title: string;

	@ApiProperty({ description: 'Department of the job', example: 'Engineering' })
	@IsString()
	@IsNotEmpty()
	department: string;

	@ApiProperty({ description: 'Contract type of the job', example: 'CDD' })
	@IsEnum(JobContractType)
	contractType: JobContractType;

	@ApiProperty({ description: 'Location of the job', example: 'Paris, France' })
	@IsString()
	@IsNotEmpty()
	location: string;

	@ApiProperty({ description: 'Desired start date of the job', example: '2023-10-01' })
	@IsDateString()
	desiredStartDate: string;

	@ApiProperty({ description: 'Minimum salary for the job', example: 40000 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	salaryMin?: number;

	@ApiProperty({ description: 'Maximum salary for the job', example: 60000 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	salaryMax?: number;

	@ApiProperty({ description: 'Description of the job', example: 'We are looking for a skilled software engineer...' })
	@IsString()
	@IsNotEmpty()
	description: string;

	@ApiProperty({ description: 'Criteria for the job', type: JobCriteriaDto })
	@ValidateNested()
	@Type(() => JobCriteriaDto)
	criteria: JobCriteriaDto;

	@ApiProperty({ description: 'Pre-screening questions for the job', type: [PrescreenQuestionDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PrescreenQuestionDto)
	prescreenQuestions: PrescreenQuestionDto[];

	@ApiProperty({ description: 'Status of the job', example: 'draft' })
	@IsOptional()
	@IsEnum(JobStatus)
	status?: JobStatus;

	@ApiProperty({ description: 'Company slug for the job', example: 'peak-performance' })
	@IsOptional()
	@IsString()
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
		message:
			'companySlug must contain only lowercase letters, numbers and hyphens',
	})
	companySlug?: string;
}
