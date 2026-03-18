import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MailTemplateService {
  private readonly templatesDir = path.join(
    process.cwd(),
    'src/@common/mail/templates',
  );

  public getTemplate(
    templateName: string,
    replacements: Record<string, string>,
  ): string {
    const layoutPath = path.join(this.templatesDir, 'layout.html');
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    const year = new Date().getFullYear().toString();

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName}.html not found`);
    }
    if (!fs.existsSync(layoutPath)) {
      throw new Error(`Layout template layout.html not found`);
    }

    let layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    let templateContent = fs.readFileSync(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      templateContent = templateContent.replace(placeholder, value);
    }
    layoutContent = layoutContent.replace('{{content}}', templateContent);
    layoutContent = layoutContent.replace('{{year}}', year);

    return layoutContent;
  }

  applicationSubmitted(firstName: string): {
    subject: string;
    body: string;
  } {
    const subject = 'Votre candidature a été reçue';
    const body = this.getTemplate('application-submitted', { firstName });
    return { subject, body };
  }
}
