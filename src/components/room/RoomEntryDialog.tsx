import { useState } from 'react'
import { Lock } from 'lucide-react'

interface Props {
  roomId: string
  isPrivate: boolean
  onSubmit: (nickname: string, password?: string) => void
  onCancel: () => void
  passwordError?: boolean
  hideNickname?: boolean
}

export default function RoomEntryDialog({ roomId, isPrivate, onSubmit, onCancel, passwordError, hideNickname }: Props) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isPrivate && !password) return
    onSubmit('', isPrivate ? password : undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-[20px] shadow-elevation p-8 w-full max-w-md mx-4 space-y-6 animate-fade-in-up"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-bobflix-50 text-bobflix-500 flex items-center justify-center mx-auto">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Sala {roomId}</h2>
          <p className="text-sm text-text-secondary">
            Esta sala é protegida por senha. Digite a senha para entrar.
          </p>
        </div>

        <div className="space-y-3">
          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">Senha da sala</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                autoFocus
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm focus:bg-surface outline-none transition-all ${
                  passwordError
                    ? 'border-red-400 bg-red-50 focus:border-red-500'
                    : 'border-surface-alt bg-surface-alt focus:border-bobflix-500'
                }`}
              />
              {passwordError && (
                <p className="text-xs text-red-500 mt-1 ml-1">Senha incorreta. Tente novamente.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border-2 border-surface-alt text-text-secondary hover:bg-surface-alt py-3 text-sm font-medium transition-colors"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={isPrivate && !password}
            className="flex-1 rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:bg-surface-alt disabled:text-text-secondary text-white py-3 text-sm font-medium transition-colors"
          >
            Entrar
          </button>
        </div>
      </form>
    </div>
  )
}
