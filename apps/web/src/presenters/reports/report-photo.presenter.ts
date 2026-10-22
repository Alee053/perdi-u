import type { ReportPhotoLoader, ReportPhotoResource } from '../../models/reports/photo.js'
import { Store } from '../store.js'

export class ReportPhotoPresenter extends Store<{ source?: string; failed: boolean }> {
  private generation = 0
  private controller?: AbortController
  private resource?: ReportPhotoResource
  constructor(private readonly loader: ReportPhotoLoader) {
    super({ failed: false })
  }
  show = async (source: string, privatePhoto: boolean) => {
    this.stop()
    if (!privatePhoto) return this.setState({ source, failed: false })
    const generation = this.generation
    this.controller = new AbortController()
    try {
      const resource = await this.loader.load(source, this.controller.signal)
      if (generation !== this.generation) return resource.release()
      this.resource = resource
      this.setState({ source: resource.source, failed: false })
    } catch {
      if (generation === this.generation) this.setState({ failed: true })
    }
  }
  stop = () => {
    this.generation++
    this.controller?.abort()
    this.resource?.release()
    this.resource = undefined
    this.setState({ failed: false })
  }
}
