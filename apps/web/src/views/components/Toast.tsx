import { X } from 'lucide-react'
import type { Notice } from '../../presenters/app/notice.presenter'

export function Toast({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <div
      className={'toast' + (notice.error ? ' toast-error' : '')}
      role={notice.error ? 'alert' : 'status'}
    >
      {notice.message}
      <button onClick={onClose} aria-label="Cerrar aviso">
        <X size={14} />
      </button>
    </div>
  )
}
