import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { Application } from './entities/application.entity'
import { CreateApplicationDto } from './dto/create-application.dto'
import { UpdateApplicationDto } from './dto/update-application.dto'

@Injectable()
export class ApplicationsService {
	private readonly uploadsDir = path.join(process.cwd(), 'uploads')

	constructor(
		@InjectRepository(Application)
		private readonly applicationRepository: Repository<Application>,
	) {
		this.ensureUploadsDir()
	}

	private ensureUploadsDir() {
		if (!fs.existsSync(this.uploadsDir)) {
			fs.mkdirSync(this.uploadsDir, { recursive: true })
		}
	}

	private saveFile(file: Express.Multer.File | undefined, subfolder: string): string | null {
		if (!file) return null

		const subfolder_path = path.join(this.uploadsDir, subfolder)
		if (!fs.existsSync(subfolder_path)) {
			fs.mkdirSync(subfolder_path, { recursive: true })
		}

		const timestamp = Date.now()
		const filename = `${timestamp}-${file.originalname}`
		const filepath = path.join(subfolder_path, filename)

		fs.writeFileSync(filepath, file.buffer)
		return path.join(subfolder, filename)
	}

	async create(createApplicationDto: CreateApplicationDto) {
		if (!createApplicationDto.jobId || !createApplicationDto.companySlug) {
			throw new BadRequestException('jobId et companySlug sont requis')
		}

		const cvPath = this.saveFile(createApplicationDto.cv, 'cv')
		const coverLetterPath = this.saveFile(createApplicationDto.coverLetter, 'cover-letters')
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
			cvPath: cvPath ?? undefined,
			coverLetterPath: coverLetterPath ?? undefined,
			prescreenAnswers: createApplicationDto.prescreenAnswers || [],
			status: 'pending',
		}

		const application = this.applicationRepository.create(applicationData)

		return await this.applicationRepository.save(application)
	}

	async findAll(filters?: { jobId?: number; companySlug?: string; status?: string }) {
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

		query.orderBy('app.createdAt', 'DESC')

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

		if (updateApplicationDto.status) {
			application.status = updateApplicationDto.status
		}

		return await this.applicationRepository.save(application)
	}

	async remove(id: string) {
		const application = await this.findOne(id)

		// Delete files if they exist
		if (application.cvPath) {
			const cvFilePath = path.join(this.uploadsDir, application.cvPath)
			if (fs.existsSync(cvFilePath)) {
				fs.unlinkSync(cvFilePath)
			}
		}

		if (application.coverLetterPath) {
			const coverLetterFilePath = path.join(this.uploadsDir, application.coverLetterPath)
			if (fs.existsSync(coverLetterFilePath)) {
				fs.unlinkSync(coverLetterFilePath)
			}
		}

		await this.applicationRepository.remove(application)
		return { message: 'Candidature supprimée avec succès' }
	}
}
