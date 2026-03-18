import { Injectable, Logger } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import * as SendGridImport from '@sendgrid/mail';

@Injectable()
export class SendGridClient {
  private readonly logger = new Logger(SendGridClient.name);
  // account for CJS/ESM default export differences
  private client: any = (SendGridImport as any).default || SendGridImport;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY || '';
    if (!apiKey) {
      this.logger.warn('No SENDGRID_API_KEY provided; emails will fail if attempted.');
    }
    if (typeof this.client.setApiKey === 'function') {
      this.client.setApiKey(apiKey);
    } else {
      this.logger.error('SendGrid client does not expose setApiKey. Please check @sendgrid/mail package version.');
    }
  }

  async send(mail: MailDataRequired): Promise<void> {
    try {
      if (typeof this.client.send !== 'function') {
        throw new Error('SendGrid client does not expose send()');
      }
      await this.client.send(mail);
    } catch (error) {
      this.logger.error('SendGrid send failed', error as any);
      throw error;
    }
  }
}
