import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import { Camera, ArrowLeft, Check, LogOut } from 'lucide-react'
import logoImg from '@/assets/doaskdp-03f16.png'

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=love',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=happy',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=cute',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=star',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=heart',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=cool',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=sweet',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=chill',
]

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName, avatar_url: avatarUrl || null }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6 animate-fade-in">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <img src={logoImg} alt="Bobflix" className="h-8" />
        </div>

        <div className="bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 p-8 space-y-8">
          <h1 className="text-2xl font-semibold text-center">Meu Perfil</h1>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-bobflix-50 border-4 border-surface flex items-center justify-center shadow-elevation">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-bobflix-500">
                    {displayName ? displayName[0].toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-bobflix-500 text-white flex items-center justify-center shadow-lg hover:bg-bobflix-400 transition-colors"
              >
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </div>
            {uploading && <p className="text-xs text-text-secondary">Enviando foto...</p>}
          </div>

          {/* Avatares padrao */}
          <div className="space-y-2">
            <p className="text-xs text-text-secondary text-center">Ou escolha um avatar</p>
            <div className="flex flex-wrap justify-center gap-2">
              {DEFAULT_AVATARS.map((url) => (
                <button
                  key={url}
                  onClick={() => setAvatarUrl(url)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                    avatarUrl === url ? 'border-bobflix-500 ring-2 ring-bobflix-100' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Nome de exibicao</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border-2 border-surface-alt bg-surface-alt px-4 py-3 text-sm focus:bg-surface focus:border-bobflix-500 outline-none transition-all"
            />
          </div>

          {/* E-mail (readonly) */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">E-mail</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full rounded-xl border-2 border-surface-alt bg-surface-alt px-4 py-3 text-sm text-text-secondary cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="w-full rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:opacity-50 text-white font-medium py-3.5 transition-colors flex items-center justify-center gap-2"
          >
            {saved ? <><Check size={16} /> Salvo!</> : saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-text-secondary hover:text-red-500 text-sm font-medium transition-colors py-3"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
