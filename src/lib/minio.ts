import { Client } from 'minio';

let client: Client | null = null;

function getMinioClient(): Client {
  if (!client) {
    client = new Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: Number(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  }
  return client;
}

const BUCKET = process.env.MINIO_BUCKET || 'minipos-ecoparrilla';

/**
 * Sube un archivo a MinIO y retorna la key (path en el bucket).
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const minio = getMinioClient();
  const key = `compras/${Date.now()}-${fileName}`;
  await minio.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return key;
}

/**
 * Genera una URL pre-firmada para acceder al archivo (válida 1 hora).
 */
export async function getFileUrl(key: string): Promise<string> {
  const minio = getMinioClient();
  return minio.presignedGetObject(BUCKET, key, 3600);
}
