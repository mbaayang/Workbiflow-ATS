import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InterviewsService } from './interviews.service'
import { InterviewsController } from './interviews.controller'
import { Interview } from './entities/interview.entity'
import { Application } from '../applications/entities/application.entity'
import { MailModule } from '../@common/mail/mail.module'

@Module({
  imports: [TypeOrmModule.forFeature([Interview, Application]), MailModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}
