import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseInterceptors,
	UploadedFiles,
	Query,
	ParseUUIDPipe,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { ApplicationsService } from './applications.service'
import { CreateApplicationDto } from './dto/create-application.dto'
import { UpdateApplicationDto } from './dto/update-application.dto'

@Controller('applications')
export class ApplicationsController {
	constructor(private readonly applicationsService: ApplicationsService) {}

	@Post()
	@UseInterceptors(
		FileFieldsInterceptor([
			{ name: 'cv', maxCount: 1 },
			{ name: 'coverLetter', maxCount: 1 },
		]),
	)
	async create(
		@Body() createApplicationDto: CreateApplicationDto,
		@UploadedFiles() files: { cv?: Express.Multer.File[]; coverLetter?: Express.Multer.File[] },
	) {
		const dtoWithFiles: CreateApplicationDto = {
			...createApplicationDto,
			cv: files?.cv?.[0],
			coverLetter: files?.coverLetter?.[0],
		}

		// Parse JSON string fields
		if (typeof dtoWithFiles.prescreenAnswers === 'string') {
			dtoWithFiles.prescreenAnswers = JSON.parse(dtoWithFiles.prescreenAnswers)
		}

		return await this.applicationsService.create(dtoWithFiles)
	}

	@Get()
	async findAll(
		@Query('jobId') jobId?: string,
		@Query('companySlug') companySlug?: string,
		@Query('status') status?: string,
		@Query('statuses') statuses?: string,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string,
	) {
		return await this.applicationsService.findAll({
			jobId: jobId ? parseInt(jobId, 10) : undefined,
			companySlug,
			status,
			statuses: statuses
				? statuses
						.split(',')
						.map((value) => value.trim())
						.filter(Boolean)
				: undefined,
			limit: limit ? parseInt(limit, 10) : undefined,
			offset: offset ? parseInt(offset, 10) : undefined,
		})
	}

	@Get(':id')
	async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
		return await this.applicationsService.findOne(id)
	}

	@Patch(':id')
	async update(
		@Param('id', new ParseUUIDPipe()) id: string,
		@Body() updateApplicationDto: UpdateApplicationDto,
	) {
		return await this.applicationsService.update(id, updateApplicationDto)
	}

	@Delete(':id')
	async remove(@Param('id', new ParseUUIDPipe()) id: string) {
		return await this.applicationsService.remove(id)
	}
}
