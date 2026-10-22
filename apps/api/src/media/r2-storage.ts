import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import type { ReportMediaStorage } from '@perdiu/catalog'
import type { R2Config } from '../config.js'

/** Private Cloudflare R2 adapter using its S3-compatible API. */
export class R2ReportMediaStorage implements ReportMediaStorage {
  private readonly client: S3Client

  constructor(private readonly config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    })
  }

  async put(key: string, contentType: string, bytes: Uint8Array) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    )
  }

  async get(key: string) {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }),
    )
    return response.Body ? new Uint8Array(await response.Body.transformToByteArray()) : undefined
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucketName, Key: key }))
  }

  close() {
    this.client.destroy()
  }
}
