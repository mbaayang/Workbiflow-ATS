import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApplicationsService } from './applications.service'
import { ApplicationsController } from './applications.controller'
import { Application } from './entities/application.entity'
import { UploadModule } from '../@common/upload/upload.module'
import { MailModule } from '../@common/mail/mail.module'

@Module({
	imports: [TypeOrmModule.forFeature([Application]), UploadModule, MailModule],
	controllers: [ApplicationsController],
	providers: [ApplicationsService],
})
export class ApplicationsModule {}
