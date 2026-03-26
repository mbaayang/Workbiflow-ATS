import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

interface PrescreenAnswer {
	label: string
	type: 'yes_no' | 'text' | 'multiple_choice' | 'number'
	answer: string
}

@Entity('applications')
export class Application {
	@PrimaryGeneratedColumn('uuid')
	id: string

	@Column({ type: 'integer' })
	jobId: number

	@Column({ type: 'varchar', length: 255 })
	companySlug: string

	@Column({ type: 'varchar', length: 255 })
	firstName: string

	@Column({ type: 'varchar', length: 255 })
	lastName: string

	@Column({ type: 'varchar', length: 255 })
	email: string

	@Column({ type: 'varchar', length: 20, nullable: true })
	phone: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	city: string

	@Column({ type: 'boolean', default: false })
	consentAccepted: boolean

	@Column({ type: 'text', nullable: true })
	cvPath: string

	@Column({ type: 'text', nullable: true })
	coverLetterPath: string

	@Column({ type: 'json', nullable: true })
	prescreenAnswers: PrescreenAnswer[]

	@Column({ type: 'varchar', length: 50, default: 'pending' })
	status: 'pending' | 'reviewing' | 'interview' | 'test' | 'accepted' | 'rejected' | 'offer'

	@Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
	aiScore: number | null

	@Column({ type: 'jsonb', nullable: true })
	aiScoreBreakdown: any

	@Column({ type: 'varchar', length: 50, nullable: true })
	aiRecommendation: 'strong_match' | 'good_match' | 'average_match' | 'not_recommended' | null

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date
}
