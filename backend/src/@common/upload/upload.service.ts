import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { FileUploadConfig } from './file-upload-config.interface';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {}

  getDefaultUploadConfig(): FileUploadConfig {
    return {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: [
        '.pdf',
        '.png',
        '.jpg',
        '.jpeg',
        '.svg',
        '.docx',
        '.doc',
        '.xls',
        '.xlsx',
        '.txt',
        '.csv',
      ],
      storageDestination: () => {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
      },
      filenameGenerator: (file) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
        return `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
      },
      fileFilter: (req, file, callback) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedTypes = [
          '.pdf',
          '.png',
          '.jpg',
          '.jpeg',
          '.svg',
          '.docx',
          '.doc',
          '.xls',
          '.xlsx',
          '.txt',
          '.csv',
        ];

        if (allowedTypes.includes(ext)) {
          callback(null, true);
        } else {
          const errorMessage = `Invalid file type: ${ext}`;
          this.logger.error(errorMessage);
          callback(new Error(errorMessage));
        }
      },
    };
  }

  generateCdnUrl(filePath: string): string {
    const rawBaseUrl = this.configService.get<string>('CDN_BASE_URL') || 'http://localhost:3000';
    const cdnBaseUrl = rawBaseUrl.replace(/\/public\/?$/, '').replace(/\/$/, '');
    const relativePath = path.relative(
      path.join(process.cwd(), 'public'),
      filePath,
    );
    return `${cdnBaseUrl}/${relativePath.replace(/\\/g, '/')}`;
  }

  async uploadSingleFile(
    file: Express.Multer.File,
    options: Partial<FileUploadConfig> = {},
  ) {
    const config = { ...this.getDefaultUploadConfig(), ...options };

    if (file.size > config.maxFileSize) {
      throw new BadRequestException(
        `File "${file.originalname}" exceeds the maximum allowed size of ${
          config.maxFileSize / (1024 * 1024)
        }MB.`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();

    if (!config.allowedFileTypes.includes(ext)) {
      throw new BadRequestException(`Invalid file type: ${ext}`);
    }
    const destination = config.storageDestination();
    const filename = config.filenameGenerator(file);
    const fullPath = path.join(destination, filename);

    try {
      fs.writeFileSync(fullPath, file.buffer);

      const cdnUrl = this.generateCdnUrl(fullPath);

      return {
        filename,
        cdnUrl,
      };
    } catch (error) {
      this.logger.error('File upload failed', error);
      throw new BadRequestException('File upload failed');
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    options: Partial<FileUploadConfig> = {},
  ) {
    return Promise.all(
      files.map((file) => this.uploadSingleFile(file, options)),
    );
  }
}
