import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useRoomStore } from '@/stores/useRoomStore'
import { useAuth } from '@/lib/AuthProvider'
import { LogIn, Sparkles, Lock, User, History } from 'lucide-react'
import logoImg from '@/assets/doaskdp-03f16.png'

export default function Index() {
  const [roomCode, setRoomCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [store] = useRoomStore()
  const { profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (profile) {
      store.setCurrentUser(profile.id, profile.display_name, profile.avatar_url)
    }
  }, [profile])

  const handleCreateRoom = async () => {
    const code = `BF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    await store.createRoom(code, showPassword ? password : undefined)
    navigate(`/sala/${code}`)
  }

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return
    navigate(`/sala/${roomCode.toUpperCase()}`)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-2xl text-center space-y-10">
        <div className="space-y-6 flex flex-col items-center">
          <img src={logoImg} alt="Bobflix" className="h-16 md:h-20 object-contain" />
          <p className="text-text-secondary text-lg">
            Assista videos em perfeita sincronia com o seu amor
          </p>
        </div>

        {/* User info bar */}
        <div className="flex items-center justify-center gap-3">
          <Link to="/perfil" className="flex items-center gap-2.5 rounded-full bg-surface border border-surface-alt px-4 py-2.5 hover:shadow-subtle transition-all">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-bobflix-50 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={14} className="text-bobflix-500" />
              )}
            </div>
            <span className="text-sm font-medium text-text-primary">{profile?.display_name || 'Meu perfil'}</span>
          </Link>
          <Link to="/historico" className="flex items-center gap-2 rounded-full bg-surface border border-surface-alt px-4 py-2.5 hover:shadow-subtle transition-all text-sm font-medium text-text-secondary">
            <History size={14} />
            Historico
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="bg-surface p-8 rounded-[24px] shadow-subtle border border-surface-alt/50 flex flex-col justify-between hover:shadow-elevation transition-shadow duration-300">
            <div className="text-left space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-bobflix-100 text-bobflix-500 flex items-center justify-center mb-4">
                <Sparkles size={24} />
              </div>
              <h2 className="text-2xl font-semibold">Criar Sala</h2>
              <p className="text-text-secondary text-sm">
                Crie um ambiente privado e convide quem voce ama para assistir.
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`w-full flex items-center justify-center gap-2 rounded-full border-2 py-2.5 text-sm font-medium transition-colors ${
                  showPassword ? 'border-bobflix-500 bg-bobflix-50 text-bobflix-700' : 'border-surface-alt text-text-secondary hover:bg-surface-alt'
                }`}
              >
                <Lock size={14} />
                {showPassword ? 'Sala com senha' : 'Adicionar senha (opcional)'}
              </button>
              {showPassword && (
                <input
                  type="password"
                  placeholder="Defina uma senha..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-full border-2 border-surface-alt bg-surface-alt px-5 py-3 text-center focus:bg-surface focus:border-bobflix-500 outline-none transition-all"
                />
              )}
              <button
                onClick={handleCreateRoom}
                disabled={showPassword && !password.trim()}
                className="w-full rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:bg-surface-alt disabled:text-text-secondary disabled:cursor-not-allowed text-white font-medium py-3.5 transition-colors"
              >
                Criar nova sala
              </button>
            </div>
          </div>

          <div className="bg-surface p-8 rounded-[24px] shadow-subtle border border-surface-alt/50 flex flex-col justify-between hover:shadow-elevation transition-shadow duration-300">
            <div className="text-left space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-surface-alt text-text-primary flex items-center justify-center mb-4">
                <LogIn size={24} />
              </div>
              <h2 className="text-2xl font-semibold">Entrar em Sala</h2>
              <p className="text-text-secondary text-sm">
                Ja tem um codigo? Entre em uma sala existente.
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ex: BF-X7K2"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full rounded-full border-2 border-surface-alt bg-surface-alt px-5 py-3 text-center uppercase tracking-widest focus:bg-surface focus:border-text-primary outline-none transition-all placeholder:normal-case placeholder:tracking-normal"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="w-full rounded-full bg-text-primary hover:bg-black disabled:bg-surface-alt disabled:text-text-secondary disabled:cursor-not-allowed text-white font-medium py-3.5 transition-colors"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
