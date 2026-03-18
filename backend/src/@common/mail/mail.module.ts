import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailTemplateService } from './mail-template.service';
import { SendGridClient } from './config/sendgrid-client';

@Module({
  providers: [MailService, SendGridClient, MailTemplateService],
  exports: [MailService, MailTemplateService],
})
export class MailModule {}
