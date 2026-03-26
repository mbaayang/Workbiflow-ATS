import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as path from 'path'
import * as fs from 'fs'
import { UploadService } from '../@common/upload/upload.service'
import { MailService } from '../@common/mail/mail.service'
import { Application } from './entities/application.entity'
import { CreateApplicationDto } from './dto/create-application.dto'
import { UpdateApplicationDto } from './dto/update-application.dto'
import { Job } from '../jobs/entities/job.entity'

interface AiScoringApiResponse {
	totalScore: number
	recommendation: 'strong_match' | 'good_match' | 'average_match' | 'not_recommended'
	breakdown: Record<string, unknown>
	debug?: Record<string, unknown>
}
@Injectable()
export class ApplicationsService {
	private readonly logger = new Logger(ApplicationsService.name)
	private readonly publicDir = path.join(process.cwd(), 'public')

	constructor(
		@InjectRepository(Application)
		private readonly applicationRepository: Repository<Application>,
		@InjectRepository(Job)
		private readonly jobRepository: Repository<Job>,
		private readonly uploadService: UploadService,
		private readonly mailService: MailService,
	) {}

	private getApplicationStorageDestination(subfolder: 'cv' | 'cover-letters') {
		return () => {
			const targetDir = path.join(this.publicDir, 'uploads', 'applications', subfolder)
			if (!fs.existsSync(targetDir)) {
				fs.mkdirSync(targetDir, { recursive: true })
			}
			return targetDir
		}
	}

	private buildRelativeUploadPath(subfolder: 'cv' | 'cover-letters', filename: string) {
		return path.join('uploads', 'applications', subfolder, filename).replace(/\\/g, '/')
	}

	private async requestExternalAiScoring(payload: Record<string, unknown>): Promise<AiScoringApiResponse> {
		const aiScoringUrl = process.env.AI_SCORING_URL || 'http://127.0.0.1:8001/score'

		const response = await fetch(aiScoringUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})

		if (!response.ok) {
			const responseBody = await response.text()
			throw new Error(`AI scoring HTTP ${response.status}: ${responseBody}`)
		}

		return (await response.json()) as AiScoringApiResponse
	}

	private async markAiScoringUnavailable(
		application: Application,
		reason: string,
	): Promise<void> {
		application.aiScore = null
		application.aiRecommendation = null
		application.aiScoreBreakdown = {
			status: 'unavailable',
			reason,
			at: new Date().toISOString(),
		}

		await this.applicationRepository.save(application)
	}

	async create(createApplicationDto: CreateApplicationDto) {
		if (!createApplicationDto.jobId || !createApplicationDto.companySlug) {
			throw new BadRequestException('jobId et companySlug sont requis')
		}

		const cvUpload = createApplicationDto.cv
			? await this.uploadService.uploadSingleFile(createApplicationDto.cv, {
				allowedFileTypes: ['.pdf', '.doc', '.docx'],
				storageDestination: this.getApplicationStorageDestination('cv'),
			})
			: null

		const coverLetterUpload = createApplicationDto.coverLetter
			? await this.uploadService.uploadSingleFile(createApplicationDto.coverLetter, {
				allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
				storageDestination: this.getApplicationStorageDestination('cover-letters'),
			})
			: null

		const cvPath = cvUpload
			? this.buildRelativeUploadPath('cv', cvUpload.filename)
			: undefined
		const coverLetterPath = coverLetterUpload
			? this.buildRelativeUploadPath('cover-letters', coverLetterUpload.filename)
			: undefined
		const consentAccepted =
			createApplicationDto.consentAccepted === true ||
			String(createApplicationDto.consentAccepted).toLowerCase() === 'true'

		const applicationData: Partial<Application> = {
			jobId: Number(createApplicationDto.jobId),
			companySlug: createApplicationDto.companySlug,
			firstName: createApplicationDto.firstName,
			lastName: createApplicationDto.lastName,
			email: createApplicationDto.email,
			phone: createApplicationDto.phone,
			city: createApplicationDto.city,
			consentAccepted,
			cvPath,
			coverLetterPath,
			prescreenAnswers: createApplicationDto.prescreenAnswers || [],
			status: 'pending',
		}

		const application = this.applicationRepository.create(applicationData)
		const savedApplication = await this.applicationRepository.save(application)

		try {
			await this.scoreApplicationWithAI(savedApplication, createApplicationDto.jobId)
		} catch (error) {
			await this.markAiScoringUnavailable(
				savedApplication,
				error instanceof Error ? error.message : 'unknown error',
			)
			this.logger.warn(
				`Scoring IA pour candidature ${savedApplication.id} échoué: ${
					error instanceof Error ? error.message : 'unknown error'
				}`,
			)
		}

		try {
			const { subject, body } = this.mailService.applicationSubmitted(savedApplication.firstName)
			await this.mailService.sendMail({
				to: savedApplication.email,
				subject,
				body,
				isHtml: true,
			})
		} catch (error) {
			this.logger.warn(
				`Candidature ${savedApplication.id} créée, mais email de confirmation non envoyé: ${
					error instanceof Error ? error.message : 'unknown error'
				}`,
			)
		}

		return savedApplication
	}

	async findAll(filters?: {
		jobId?: number
		companySlug?: string
		status?: string
		statuses?: string[]
		limit?: number
		offset?: number
	}) {
		const query = this.applicationRepository.createQueryBuilder('app')

		if (filters?.jobId) {
			query.andWhere('app.jobId = :jobId', { jobId: filters.jobId })
		}

		if (filters?.companySlug) {
			query.andWhere('app.companySlug = :companySlug', { companySlug: filters.companySlug })
		}

		if (filters?.status) {
			query.andWhere('app.status = :status', { status: filters.status })
		}

		if (filters?.statuses && filters.statuses.length > 0) {
			query.andWhere('app.status IN (:...statuses)', { statuses: filters.statuses })
		}

		query.orderBy('app.createdAt', 'DESC')

		const hasPagination =
			typeof filters?.limit === 'number' || typeof filters?.offset === 'number'

		if (hasPagination) {
			const safeLimit = Math.min(Math.max(filters?.limit ?? 30, 1), 200)
			const safeOffset = Math.max(filters?.offset ?? 0, 0)

			query.take(safeLimit)
			query.skip(safeOffset)

			const [items, total] = await query.getManyAndCount()

			return {
				items,
				total,
				limit: safeLimit,
				offset: safeOffset,
				hasMore: safeOffset + items.length < total,
			}
		}

		return await query.getMany()
	}

	async findOne(id: string) {
		const application = await this.applicationRepository.findOne({ where: { id } })
		if (!application) {
			throw new BadRequestException('Candidature introuvable')
		}
		return application
	}

	async update(id: string, updateApplicationDto: UpdateApplicationDto) {
		const application = await this.findOne(id)
		const oldStatus = application.status

		if (updateApplicationDto.status) {
			application.status = updateApplicationDto.status
		}

		const updatedApplication = await this.applicationRepository.save(application)

		// Trigger email if status changed
		if (oldStatus !== updateApplicationDto.status) {
			try {
				await this.sendStatusTransitionEmail(updatedApplication)
			} catch (error) {
				this.logger.warn(
					`Candidature ${updatedApplication.id} mise à jour, mais email de transition non envoyé: ${
						error instanceof Error ? error.message : 'unknown error'
					}`,
				)
			}
		}

		return updatedApplication
	}

	private async scoreApplicationWithAI(
		application: Application,
		jobId: number,
	): Promise<void> {
		const job = await this.jobRepository.findOne({ where: { id: jobId } })
		if (!job) {
			this.logger.warn(`Job ${jobId} introuvable pour scoring IA candidature ${application.id}`)
			return
		}

		const cvAbsolutePath = application.cvPath ? path.join(this.publicDir, application.cvPath) : null

		const result = await this.requestExternalAiScoring({
			candidate: {
				firstName: application.firstName,
				lastName: application.lastName,
				email: application.email,
				consentAccepted: application.consentAccepted,
				cvPath: application.cvPath,
				coverLetterPath: application.coverLetterPath,
				prescreenAnswers: application.prescreenAnswers ?? [],
				cvFileAbsolutePath: cvAbsolutePath,
			},
			job: {
				title: job.title,
				description: job.description,
				requiredExperienceYears: job.criteria?.experienceYears,
				requiredEducationLevel: job.criteria?.educationLevel,
				requiredSkills: job.criteria?.skills?.map((s) => s.name) ?? [],
				prescreenQuestions: job.prescreenQuestions ?? [],
			},
		})

		application.aiScore = result.totalScore
		application.aiScoreBreakdown = {
			...result.breakdown,
			...(result.debug ? { _debug: result.debug } : {}),
		}
		application.aiRecommendation = result.recommendation

		await this.applicationRepository.save(application)
	}

	private async sendStatusTransitionEmail(application: Application) {
		let emailData: { subject: string; body: string } | null = null

		switch (application.status) {
			case 'reviewing':
				emailData = this.mailService.advancedToScreening(application.firstName)
				break
			case 'test':
				emailData = this.mailService.advancedToTest(application.firstName)
				break
			case 'accepted':
				emailData = this.mailService.decisionAccepted(application.firstName)
				break
			case 'rejected':
				emailData = this.mailService.decisionRejected(application.firstName)
				break
			case 'offer':
				emailData = this.mailService.advancedToOffer(application.firstName)
				break
		}

		if (!emailData) {
			return
		}

		await this.mailService.sendMail({
			to: application.email,
			subject: emailData.subject,
			body: emailData.body,
			isHtml: true,
		})
	}

	async remove(id: string) {
		const application = await this.findOne(id)

		// Delete files if they exist
		if (application.cvPath) {
			const cvFilePath = path.join(this.publicDir, application.cvPath)
			if (fs.existsSync(cvFilePath)) {
				fs.unlinkSync(cvFilePath)
			}
		}

		if (application.coverLetterPath) {
			const coverLetterFilePath = path.join(this.publicDir, application.coverLetterPath)
			if (fs.existsSync(coverLetterFilePath)) {
				fs.unlinkSync(coverLetterFilePath)
			}
		}

		await this.applicationRepository.remove(application)
		return { message: 'Candidature supprimée avec succès' }
	}
}
