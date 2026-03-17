import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';

export enum JobContractType {
	CDI = 'CDI',
	CDD = 'CDD',
	STAGE = 'stage',
	FREELANCE = 'freelance',
}

export enum JobStatus {
	DRAFT = 'draft',
	PUBLISHED = 'published',
	CLOSED = 'closed',
	ARCHIVED = 'archived',
}

export enum JobQuestionType {
	YES_NO = 'yes_no',
	TEXT = 'text',
	MULTIPLE_CHOICE = 'multiple_choice',
	NUMBER = 'number',
}

export interface JobSkill {
	name: string;
}

export interface JobLanguage {
	name: string;
	level: string;
}

export interface JobCriteria {
	educationLevel: string;
	experienceYears: number;
	skills: JobSkill[];
	languages: JobLanguage[];
}

export interface JobPrescreenQuestion {
	label: string;
	type: JobQuestionType;
	required: boolean;
	options?: string[];
	min?: number;
	max?: number;
}

@Entity({ name: 'jobs' })
export class Job {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 150 })
	title: string;

	@Column({ type: 'varchar', length: 120 })
	department: string;

	@Column({
		type: 'enum',
		enum: JobContractType,
	})
	contractType: JobContractType;

	@Column({ type: 'varchar', length: 160 })
	location: string;

	@Column({ type: 'date' })
	desiredStartDate: string;

	@Column({ type: 'integer', nullable: true })
	salaryMin: number | null;

	@Column({ type: 'integer', nullable: true })
	salaryMax: number | null;

	@Column({ type: 'text' })
	description: string;

	@Column({ type: 'jsonb' })
	criteria: JobCriteria;

	@Column({ type: 'jsonb', default: [] })
	prescreenQuestions: JobPrescreenQuestion[];

	@Column({
		type: 'enum',
		enum: JobStatus,
		default: JobStatus.DRAFT,
	})
	status: JobStatus;

	@Column({ type: 'varchar', length: 120, default: 'workbiflow' })
	companySlug: string;

	@Column({ type: 'varchar', length: 255, nullable: true, unique: true })
	publicApplyUrl: string | null;

	@Column({ type: 'timestamptz', nullable: true })
	publishedAt: Date | null;

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'timestamptz' })
	updatedAt: Date;
}
