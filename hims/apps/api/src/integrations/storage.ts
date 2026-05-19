import * as Minio from 'minio';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME ?? '',
  api_key: env.CLOUDINARY_API_KEY ?? '',
  api_secret: env.CLOUDINARY_API_SECRET ?? '',
});

const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: Number(env.MINIO_PORT),
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

async function ensureMinioBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(env.MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(env.MINIO_BUCKET, 'us-east-1');
      logger.info('MinIO bucket created', { bucket: env.MINIO_BUCKET });
    }
  } catch (err) {
    logger.error('MinIO bucket init failed', { error: String(err) });
  }
}

if (env.STORAGE_ADAPTER === 'minio') {
  void ensureMinioBucket();
}

class StorageService {
  async upload(buffer: Buffer, path: string, mimeType: string): Promise<string> {
    let finalBuffer = buffer;
    if (mimeType.startsWith('image/') && mimeType !== 'image/gif') {
      finalBuffer = await sharp(buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      mimeType = 'image/jpeg';
    }

    switch (env.STORAGE_ADAPTER) {
      case 'cloudinary':
        return this._uploadCloudinary(finalBuffer, path);
      case 'minio':
        return this._uploadMinio(finalBuffer, path, mimeType);
      default:
        return this._uploadMinio(finalBuffer, path, mimeType);
    }
  }

  async delete(path: string): Promise<void> {
    if (env.STORAGE_ADAPTER === 'cloudinary') {
      await cloudinary.uploader.destroy(path);
    } else {
      await minioClient.removeObject(env.MINIO_BUCKET, path);
    }
  }

  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    if (env.STORAGE_ADAPTER === 'cloudinary') {
      return cloudinary.url(path, { sign_url: true, expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds });
    }
    return minioClient.presignedGetObject(env.MINIO_BUCKET, path, expiresInSeconds);
  }

  private async _uploadCloudinary(buffer: Buffer, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: path, resource_type: 'auto' },
        (error, result) => {
          if (error) { reject(error); return; }
          resolve(result?.secure_url ?? '');
        }
      );
      stream.end(buffer);
    });
  }

  private async _uploadMinio(buffer: Buffer, path: string, mimeType: string): Promise<string> {
    await minioClient.putObject(env.MINIO_BUCKET, path, buffer, buffer.length, { 'Content-Type': mimeType });
    return `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET}/${path}`;
  }
}

export const storageService = new StorageService();
