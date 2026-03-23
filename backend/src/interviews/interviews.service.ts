import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateInterviewDto } from './dto/create-interview.dto'
import { UpdateInterviewDto } from './dto/update-interview.dto'
import { Interview } from './entities/interview.entity'
import { Application } from '../applications/entities/application.entity'
import { MailService } from '../@common/mail/mail.service'

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name)

  private formatInterviewDate(date: string): string {
    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(parsedDate)
  }

  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly mailService: MailService,
  ) {}

  async create(createInterviewDto: CreateInterviewDto) {
    const candidateApplication = await this.applicationRepository.findOne({
      where: { id: createInterviewDto.applicationId },
    })

    if (!candidateApplication) {
      throw new NotFoundException('Candidature introuvable pour planifier un entretien')
    }

    if (candidateApplication.jobId !== Number(createInterviewDto.jobId)) {
      throw new BadRequestException('Cette candidature ne correspond pas à l’offre sélectionnée')
    }

    if (candidateApplication.status !== 'interview') {
      throw new BadRequestException(
        'La candidature doit être au statut entretien avant la planification',
      )
    }

    const interview = this.interviewRepository.create({
      ...createInterviewDto,
      jobId: Number(createInterviewDto.jobId),
      candidateName:
        createInterviewDto.candidateName ||
        `${candidateApplication.firstName} ${candidateApplication.lastName}`,
      candidateEmail: createInterviewDto.candidateEmail || candidateApplication.email,
    })

    const savedInterview = await this.interviewRepository.save(interview)

    try {
      const { subject, body } = this.mailService.advancedToInterview(
        candidateApplication.firstName,
        {
          interviewDate: this.formatInterviewDate(savedInterview.date),
          interviewTime: savedInterview.time,
          interviewDuration: `${savedInterview.durationMinutes} minutes`,
          interviewer: savedInterview.interviewer,
          meetingTypeLabel: savedInterview.meetingType === 'video' ? 'Visioconférence' : 'Présentiel',
          locationOrLink: savedInterview.locationOrLink,
          interviewNotes: savedInterview.notes?.trim() || 'Aucune information complémentaire',
        },
      )
      await this.mailService.sendMail({
        to: candidateApplication.email,
        subject,
        body,
        isHtml: true,
      })
    } catch (error) {
      this.logger.warn(
        `Entretien ${savedInterview.id} créé, mais email invitation non envoyé: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      )
    }

    return savedInterview
  }

  async findAll(filters?: {
    jobId?: number
    applicationId?: string
    date?: string
    limit?: number
    offset?: number
  }) {
    const query = this.interviewRepository.createQueryBuilder('interview')

    if (filters?.jobId) {
      query.andWhere('interview.jobId = :jobId', { jobId: filters.jobId })
    }

    if (filters?.applicationId) {
      query.andWhere('interview.applicationId = :applicationId', {
        applicationId: filters.applicationId,
      })
    }

    if (filters?.date) {
      query.andWhere('interview.date = :date', { date: filters.date })
    }

    query.orderBy('interview.date', 'ASC').addOrderBy('interview.time', 'ASC')

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
    const interview = await this.interviewRepository.findOne({ where: { id } })
    if (!interview) {
      throw new NotFoundException('Entretien introuvable')
    }
    return interview
  }

  async update(id: string, updateInterviewDto: UpdateInterviewDto) {
    const interview = await this.findOne(id)

    Object.assign(interview, {
      ...updateInterviewDto,
      ...(typeof updateInterviewDto.jobId === 'number' ? { jobId: updateInterviewDto.jobId } : {}),
    })

    return await this.interviewRepository.save(interview)
  }

  async remove(id: string) {
    const interview = await this.findOne(id)
    await this.interviewRepository.remove(interview)
    return { message: 'Entretien supprimé avec succès' }
  }
}
