import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ImageService {
  async processProductImage(filePath: string): Promise<string> {
    const outputPath = filePath.replace(
      /\.(jpeg|jpg|png|webp)$/i,
      '-processed.webp',
    );

    await sharp(filePath)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(outputPath);

    // Hapus file original, pakai yang processed
    fs.unlinkSync(filePath);

    return outputPath;
  }

  deleteImage(filePath: string): void {
    const fullPath = path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
