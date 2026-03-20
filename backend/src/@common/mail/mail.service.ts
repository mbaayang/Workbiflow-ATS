import { Injectable } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import { SendGridClient } from './config/sendgrid-client';
import { MailTemplateService } from './mail-template.service';

interface MailOptions {
  to: string | string[];
  subject: string;
  body: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
  isHtml?: boolean;
}

@Injectable()
export class MailService {
  private readonly defaultSenderEmail = process.env.SENDGRID_SENDER || '';
  private readonly defaultSenderName =
    process.env.MAIL_FROM_NAME || 'Workbiflow ATS';

  constructor(
    private readonly sendGridClient: SendGridClient,
    private readonly mailTemplateService: MailTemplateService,
  ) {}

  async sendMail(options: MailOptions): Promise<void> {
    const sender =
      options.from || `${this.defaultSenderName} <${this.defaultSenderEmail}>`;
    const mailData: MailDataRequired = {
      to: options.to,
      from: sender,
      subject: options.subject,
      headers: {
        'X-Action-1': `<${process.env.MAIL_FROM_NAME}>`,
      },
      content: [
        {
          type: options.isHtml ? 'text/html' : 'text/plain',
          value: options.body,
        },
      ],
      ...(options.cc ? { cc: options.cc } : {}),
      ...(options.bcc ? { bcc: options.bcc } : {}),
      ...(options.attachments ? { attachments: options.attachments } : {}),
    };
    await this.sendGridClient.send(mailData);
  }

  applicationSubmitted(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'Votre candidature a été reçue';
    const body = this.mailTemplateService.getTemplate('application-submitted', { firstName });
    return { subject, body };
  }

  advancedToScreening(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'Votre candidature a été sélectionnée';
    const body = this.mailTemplateService.getTemplate('advanced-to-screening', { firstName });
    return { subject, body };
  }

  advancedToInterview(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'Invitation à un entretien';
    const body = this.mailTemplateService.getTemplate('advanced-to-interview', { firstName });
    return { subject, body };
  }

  advancedToTest(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'Test de compétences';
    const body = this.mailTemplateService.getTemplate('advanced-to-test', { firstName });
    return { subject, body };
  }

  decisionAccepted(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'Bonne nouvelle - Candidature acceptée';
    const body = this.mailTemplateService.getTemplate('decision-accepted', { firstName });
    return { subject, body };
  }

  decisionRejected(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'À propos de votre candidature';
    const body = this.mailTemplateService.getTemplate('decision-rejected', { firstName });
    return { subject, body };
  }

  advancedToOffer(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'Votre contrat de travail';
    const body = this.mailTemplateService.getTemplate('advanced-to-offer', { firstName });
    return { subject, body };
  }
}
