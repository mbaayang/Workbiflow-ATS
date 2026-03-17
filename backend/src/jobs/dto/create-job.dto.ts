import { Type } from 'class-transformer';
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
	@IsString()
	@IsNotEmpty()
	title: string;

	@IsString()
	@IsNotEmpty()
	department: string;

	@IsEnum(JobContractType)
	contractType: JobContractType;

	@IsString()
	@IsNotEmpty()
	location: string;

	@IsDateString()
	desiredStartDate: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	salaryMin?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	salaryMax?: number;

	@IsString()
	@IsNotEmpty()
	description: string;

	@ValidateNested()
	@Type(() => JobCriteriaDto)
	criteria: JobCriteriaDto;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PrescreenQuestionDto)
	prescreenQuestions: PrescreenQuestionDto[];

	@IsOptional()
	@IsEnum(JobStatus)
	status?: JobStatus;

	@IsOptional()
	@IsString()
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
		message:
			'companySlug must contain only lowercase letters, numbers and hyphens',
	})
	companySlug?: string;
}
