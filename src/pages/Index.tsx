import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '@/stores/useRoomStore'
import { LogIn, Sparkles } from 'lucide-react'
import logoImg from '@/assets/doaskdp-03f16.png'

export default function Index() {
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [store] = useRoomStore()
  const navigate = useNavigate()

  const handleCreateRoom = () => {
    if (!nickname.trim()) return
    store.setCurrentUser(nickname.trim())
    const code = `BF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    navigate(`/sala/${code}`)
  }

  const handleJoinRoom = () => {
    if (!nickname.trim() || !roomCode.trim()) return
    store.setCurrentUser(nickname.trim())
    navigate(`/sala/${roomCode.toUpperCase()}`)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-2xl text-center space-y-12">
        {/* Logo Section */}
        <div className="space-y-6 flex flex-col items-center">
          <img src={logoImg} alt="Bobflix" className="h-16 md:h-20 object-contain" />
          <p className="text-text-secondary text-lg">
            Assista vídeos em perfeita sincronia com o seu amor 💙
          </p>
        </div>

        {/* User Setup */}
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-text-secondary mb-2 ml-2 text-center">
            Como você quer ser chamado?
          </label>
          <input
            type="text"
            placeholder="Seu apelido..."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-2xl border-2 border-surface-alt bg-surface-alt px-5 py-4 text-lg focus:bg-surface focus:border-bobflix-500 focus:ring-0 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Create Card */}
          <div className="bg-surface p-8 rounded-[24px] shadow-subtle border border-surface-alt/50 flex flex-col justify-between hover:shadow-elevation transition-shadow duration-300">
            <div className="text-left space-y-2 mb-8">
              <div className="w-12 h-12 rounded-full bg-bobflix-100 text-bobflix-500 flex items-center justify-center mb-4">
                <Sparkles size={24} />
              </div>
              <h2 className="text-2xl font-semibold">Criar Sala</h2>
              <p className="text-text-secondary text-sm">
                Crie um ambiente privado e convide quem você ama para assistir.
              </p>
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={!nickname.trim()}
              className="w-full rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:bg-surface-alt disabled:text-text-secondary disabled:cursor-not-allowed text-white font-medium py-3.5 transition-colors"
            >
              Criar nova sala
            </button>
          </div>

          {/* Join Card */}
          <div className="bg-surface p-8 rounded-[24px] shadow-subtle border border-surface-alt/50 flex flex-col justify-between hover:shadow-elevation transition-shadow duration-300">
            <div className="text-left space-y-2 mb-8">
              <div className="w-12 h-12 rounded-full bg-surface-alt text-text-primary flex items-center justify-center mb-4">
                <LogIn size={24} />
              </div>
              <h2 className="text-2xl font-semibold">Entrar em Sala</h2>
              <p className="text-text-secondary text-sm">
                Já tem um código? Entre em uma sala existente.
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
                disabled={!nickname.trim() || !roomCode.trim()}
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
