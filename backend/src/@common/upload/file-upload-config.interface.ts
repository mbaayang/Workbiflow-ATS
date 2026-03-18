import { FileFilterCallback } from 'multer';
import { Request } from 'express';

export interface FileUploadConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  fileFilter?: (
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => void;
  storageDestination: () => string;
  filenameGenerator: (file: Express.Multer.File) => string;
}

export interface FileUploadResult {
  filename: string;
  cdnUrl: string;
}
