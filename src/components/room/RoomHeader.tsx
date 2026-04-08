import { useState } from 'react'
import { Copy, Check, Play } from 'lucide-react'
import { useRoomStore } from '@/stores/useRoomStore'
import logoImg from '@/assets/doaskdp-03f16.png'

export default function RoomHeader({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false)
  const [store] = useRoomStore()
  const [urlInput, setUrlInput] = useState('')

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (urlInput.trim()) {
      store.setVideoUrl(urlInput.trim())
      setUrlInput('')
    }
  }

  return (
    <header className="h-[76px] px-6 bg-surface border-b border-surface-alt flex items-center justify-between gap-4 z-10">
      {/* Logo */}
      <div className="hidden sm:flex items-center shrink-0">
        <img src={logoImg} alt="Bobflix" className="h-10 object-contain" />
      </div>

      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} className="flex-1 max-w-2xl mx-auto flex items-center gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Cole o link do YouTube aqui..."
          className="flex-1 rounded-full bg-surface-alt border border-transparent px-5 py-2.5 text-sm focus:bg-white focus:border-bobflix-500 focus:ring-4 focus:ring-bobflix-100 outline-none transition-all placeholder:text-text-secondary/70"
        />
        <button
          type="submit"
          disabled={!urlInput.trim()}
          className="shrink-0 rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:bg-surface-alt disabled:text-text-secondary text-white px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Play size={14} />
          <span className="hidden sm:inline">Carregar</span>
        </button>
      </form>

      {/* Room Badge */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Sala
          </span>
          <span className="font-semibold text-text-primary leading-tight">{roomId}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-full bg-surface-alt hover:bg-surface-alt/70 px-4 py-2.5 text-sm font-medium transition-colors border border-transparent"
        >
          {copied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} className="text-text-secondary" />
          )}
          <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Código'}</span>
        </button>
      </div>
    </header>
  )
}
