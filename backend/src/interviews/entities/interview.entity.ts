import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('interviews')
export class Interview {
	@PrimaryGeneratedColumn('uuid')
	id: string

	@Column({ type: 'integer' })
	jobId: number

	@Column({ type: 'uuid' })
	applicationId: string

	@Column({ type: 'varchar', length: 255 })
	candidateName: string

	@Column({ type: 'varchar', length: 255 })
	candidateEmail: string

	@Column({ type: 'date' })
	date: string

	@Column({ type: 'varchar', length: 5 })
	time: string

	@Column({ type: 'integer', default: 45 })
	durationMinutes: number

	@Column({ type: 'varchar', length: 255 })
	interviewer: string

	@Column({ type: 'varchar', length: 20 })
	meetingType: 'video' | 'onsite'

	@Column({ type: 'text' })
	locationOrLink: string

	@Column({ type: 'text', nullable: true })
	notes?: string

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date
}
