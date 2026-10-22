import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { randomUUID } from 'node:crypto'
import { ReportMediaError, type ReportMediaService } from '@perdiu/catalog'
import { AuthGuard, CurrentUser } from '../auth/guard.js'
import type { AuthenticatedUser } from '../auth/access-token.js'
import { detectImageContent, MAX_MEDIA_BYTES } from './content.js'

export const REPORT_MEDIA_SERVICE = 'REPORT_MEDIA_SERVICE'

function rethrowMediaError(error: unknown): never {
  if (error instanceof ReportMediaError) {
    if (error.reason === 'invalid' || error.reason === 'limit')
      throw new BadRequestException('Elige hasta tres fotos JPG o PNG de máximo 5 MB.')
    if (error.reason === 'not_found') throw new NotFoundException('La foto no está disponible.')
  }
  throw new ServiceUnavailableException('No se pudo procesar la foto. Intenta nuevamente.')
}

@Controller('media')
export class MediaController {
  constructor(@Inject(REPORT_MEDIA_SERVICE) private readonly media: ReportMediaService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MEDIA_BYTES, files: 1 } }))
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: { buffer: Buffer; size: number },
  ) {
    if (!file || !file.size || file.size > MAX_MEDIA_BYTES)
      throw new BadRequestException('Elige una foto JPG o PNG de máximo 5 MB.')
    const contentType = detectImageContent(file.buffer)
    if (!contentType)
      throw new BadRequestException('El contenido de la foto debe ser una imagen JPG o PNG.')
    try {
      return { id: await this.media.upload(user.id, randomUUID(), contentType, file.buffer) }
    } catch (error) {
      rethrowMediaError(error)
    }
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async read(@Param('id') id: string) {
    try {
      const image = await this.media.read(id)
      return new StreamableFile(Buffer.from(image.bytes), {
        type: image.contentType,
        disposition: 'inline',
      })
    } catch (error) {
      rethrowMediaError(error)
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    try {
      await this.media.remove(user.id, id)
    } catch (error) {
      rethrowMediaError(error)
    }
  }
}
