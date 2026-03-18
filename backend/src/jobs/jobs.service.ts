import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  Job,
  JobPrescreenQuestion,
  JobQuestionType,
  JobStatus,
} from './entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    private readonly configService: ConfigService,
  ) {}

  async create(createJobDto: CreateJobDto) {
    this.validateSalaryRange(createJobDto.salaryMin, createJobDto.salaryMax);
    this.validatePrescreenQuestions(createJobDto.prescreenQuestions);

    const companySlug = this.resolveCompanySlug(createJobDto.companySlug);
    const status = createJobDto.status ?? JobStatus.DRAFT;

    const job = this.jobsRepository.create({
      ...createJobDto,
      companySlug,
      status,
      salaryMin: createJobDto.salaryMin ?? null,
      salaryMax: createJobDto.salaryMax ?? null,
      publicApplyUrl: null,
      publishedAt: status === JobStatus.PUBLISHED ? new Date() : null,
    });

    const savedJob = await this.jobsRepository.save(job);
    return this.ensurePublicApplyUrl(savedJob);
  }

  async findAll(status?: JobStatus) {
    const where = status ? { status } : {};

    return this.jobsRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const job = await this.jobsRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Job #${id} not found`);
    }

    return job;
  }

  async findPublicJob(companySlug: string, id: number) {
    const normalizedSlug = this.normalizeSlug(companySlug);
    const job = await this.jobsRepository.findOne({
      where: {
        id,
        companySlug: normalizedSlug,
        status: JobStatus.PUBLISHED,
      },
    });

    if (!job) {
      throw new NotFoundException(
        `Published job #${id} for ${normalizedSlug} not found`,
      );
    }

    return job;
  }

  async update(id: number, updateJobDto: UpdateJobDto) {
    const existingJob = await this.findOne(id);

    this.validateSalaryRange(updateJobDto.salaryMin, updateJobDto.salaryMax);

    if (updateJobDto.prescreenQuestions) {
      this.validatePrescreenQuestions(updateJobDto.prescreenQuestions);
    }

    const companySlug = this.resolveCompanySlug(
      updateJobDto.companySlug,
      existingJob.companySlug,
    );
    const nextStatus = updateJobDto.status ?? existingJob.status;

    const mergedJob = this.jobsRepository.merge(existingJob, {
      ...updateJobDto,
      companySlug,
      status: nextStatus,
      publishedAt:
        nextStatus === JobStatus.PUBLISHED
          ? existingJob.publishedAt ?? new Date()
          : existingJob.publishedAt,
    });

    const savedJob = await this.jobsRepository.save(mergedJob);
    return this.ensurePublicApplyUrl(savedJob);
  }

  async remove(id: number) {
    const job = await this.findOne(id);
    await this.jobsRepository.remove(job);

    return {
      deleted: true,
      id,
    };
  }

  private async ensurePublicApplyUrl(job: Job) {
    if (job.status !== JobStatus.PUBLISHED) {
      return job;
    }

    const publicApplyUrl = this.buildPublicApplyUrl(job.companySlug, job.id);

    if (job.publicApplyUrl === publicApplyUrl) {
      return job;
    }

    job.publicApplyUrl = publicApplyUrl;
    return this.jobsRepository.save(job);
  }

  private buildPublicApplyUrl(companySlug: string, jobId: number) {
    const baseUrl = '/jobs';

    return `${baseUrl}/${companySlug}/${jobId}`;
  }

  private resolveCompanySlug(companySlug?: string, fallback?: string) {
    const defaultCompanySlug = this.configService.get<string>(
      'DEFAULT_COMPANY_SLUG',
      'peak-performance',
    );

    return this.normalizeSlug(companySlug || fallback || defaultCompanySlug);
  }

  private normalizeSlug(value: string) {
    const normalizedValue = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalizedValue || 'peak-performance';
  }

  private validateSalaryRange(salaryMin?: number, salaryMax?: number) {
    if (
      typeof salaryMin === 'number' &&
      typeof salaryMax === 'number' &&
      salaryMin > salaryMax
    ) {
      throw new BadRequestException(
        'salaryMin must be less than or equal to salaryMax',
      );
    }
  }

  private validatePrescreenQuestions(questions: JobPrescreenQuestion[]) {
    questions.forEach((question, index) => {
      if (
        question.type === JobQuestionType.MULTIPLE_CHOICE &&
        (!question.options || question.options.length === 0)
      ) {
        throw new BadRequestException(
          `prescreenQuestions[${index}].options is required for multiple_choice questions`,
        );
      }

      if (
        question.type === JobQuestionType.NUMBER &&
        typeof question.min === 'number' &&
        typeof question.max === 'number' &&
        question.min > question.max
      ) {
        throw new BadRequestException(
          `prescreenQuestions[${index}].min must be less than or equal to max`,
        );
      }
    });
  }
}
