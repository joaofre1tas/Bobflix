import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Copy, Check, Play, LogOut, User } from 'lucide-react'
import { useRoomStore } from '@/stores/useRoomStore'
import { useAuth } from '@/lib/AuthProvider'
import logoImg from '@/assets/doaskdp-03f16.png'

export default function RoomHeader({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false)
  const [store] = useRoomStore()
  const { profile } = useAuth()
  const [urlInput, setUrlInput] = useState('')
  const navigate = useNavigate()

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

  const handleLeave = () => {
    store.leaveRoom()
    navigate('/')
  }

  return (
    <header className="h-[76px] px-6 bg-surface border-b border-surface-alt flex items-center justify-between gap-4 z-10">
      <button onClick={handleLeave} className="hidden sm:flex items-center shrink-0 hover:opacity-70 transition-opacity">
        <img src={logoImg} alt="Bobflix" className="h-10 object-contain" />
      </button>

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

      <div className="shrink-0 flex items-center gap-2">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Sala</span>
          <span className="font-semibold text-text-primary leading-tight">{roomId}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-full bg-surface-alt hover:bg-surface-alt/70 px-4 py-2.5 text-sm font-medium transition-colors border border-transparent"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-text-secondary" />}
          <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Código'}</span>
        </button>

        <Link
          to="/perfil"
          className="w-9 h-9 rounded-full overflow-hidden bg-bobflix-50 flex items-center justify-center border border-surface-alt hover:ring-2 hover:ring-bobflix-100 transition-all"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={14} className="text-bobflix-500" />
          )}
        </Link>

        <button
          onClick={handleLeave}
          className="flex items-center gap-2 rounded-full hover:bg-red-50 text-text-secondary hover:text-red-500 px-3 py-2.5 text-sm font-medium transition-colors"
          title="Sair da sala"
        >
          <LogOut size={16} />
          <span className="hidden lg:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
