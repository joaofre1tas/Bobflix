import { useState } from 'react'
import { useRoomStore } from '@/stores/useRoomStore'
import { Plus, Trash2, Play, ListMusic } from 'lucide-react'

export default function VideoQueue() {
  const [store] = useRoomStore()
  const [url, setUrl] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    store.addToQueue(url.trim())
    setUrl('')
  }

  return (
    <div className="border-t border-surface-alt">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <ListMusic size={14} />
          Fila de vídeos ({store.queue.length})
        </span>
        <span className="text-xs">{expanded ? 'Fechar' : 'Abrir'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link do YouTube..."
              className="flex-1 rounded-full bg-surface-alt border-none px-4 py-2 text-xs focus:ring-2 focus:ring-bobflix-500 outline-none"
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="shrink-0 w-8 h-8 rounded-full bg-bobflix-500 disabled:bg-surface-alt disabled:text-text-secondary text-white flex items-center justify-center transition-colors"
            >
              <Plus size={14} />
            </button>
          </form>

          {store.queue.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-2">Nenhum vídeo na fila</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {store.queue.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-alt text-xs">
                  <span className="text-text-secondary font-medium w-5 shrink-0">{i + 1}.</span>
                  <span className="flex-1 truncate text-text-primary">
                    {item.videoTitle || item.videoUrl}
                  </span>
                  <button
                    onClick={() => store.removeFromQueue(item.id)}
                    className="shrink-0 text-text-secondary hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {store.queue.length > 0 && (
            <button
              onClick={() => store.playNext()}
              className="w-full flex items-center justify-center gap-1.5 rounded-full bg-bobflix-50 text-bobflix-700 hover:bg-bobflix-100 py-2 text-xs font-medium transition-colors"
            >
              <Play size={12} />
              Tocar próximo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
