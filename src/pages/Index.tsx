import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useRoomStore } from '@/stores/useRoomStore'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import { LogIn, Sparkles, Lock, User, Heart, Play, LogOut, Link2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import logoImg from '@/assets/doaskdp-03f16.png'

export default function Index() {
  const [roomCode, setRoomCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [store] = useRoomStore()
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [hasPartner, setHasPartner] = useState(false)
  const [inviteCreating, setInviteCreating] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  useEffect(() => {
    if (profile) {
      store.setCurrentUser(profile.id, profile.display_name, profile.avatar_url)
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    const loadPartner = async () => {
      const { data } = await supabase.from('partnerships')
        .select('user_a, user_b')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .limit(1)
        .maybeSingle()
      if (data) {
        setHasPartner(true)
        const partnerId = data.user_a === user.id ? data.user_b : data.user_a
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', partnerId).maybeSingle()
        if (prof) setPartnerName(prof.display_name)
      } else {
        setHasPartner(false)
        setPartnerName(null)
      }
    }
    loadPartner()
  }, [user])

  const handleCreateRoom = async () => {
    const code = `BF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    await store.createRoom(code, showPassword ? password : undefined)
    navigate(`/sala/${code}`)
  }

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return
    navigate(`/sala/${roomCode.toUpperCase()}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleCreateInviteLink = async () => {
    if (!user) return
    setInviteCreating(true)
    setInviteLink(null)
    const { data, error } = await supabase.from('partnership_invites').insert({ inviter_id: user.id }).select('token').single()
    setInviteCreating(false)
    if (error) {
      toast.error('Não foi possível criar o convite. Tente de novo.')
      return
    }
    if (data?.token) {
      setInviteLink(`${window.location.origin}/convite/${data.token}`)
      toast.success('Convite criado — envie o link para quem você ama.')
    }
  }

  const copyInvite = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedInvite(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopiedInvite(false), 2000)
    } catch {
      toast.error('Não deu para copiar. Copie manualmente.')
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6 animate-fade-in min-h-screen py-10 md:py-14">
      <div className="w-full max-w-3xl space-y-10">
        <div className="text-center space-y-5">
          <img src={logoImg} alt="Bobflix" className="h-14 md:h-16 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold text-text-primary tracking-tight">
              {greeting()}, {profile?.display_name || 'você'}{' '}
              <Heart size={32} className="inline text-bobflix-500 fill-bobflix-500 -mt-1" />
            </h1>
            <p className="text-text-secondary text-base max-w-md mx-auto">
              Escolha o que fazer agora — criar uma sala nova ou entrar numa que já existe.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/perfil"
            className="group flex items-center gap-2.5 rounded-full bg-surface border border-surface-alt pl-1.5 pr-5 py-1.5 hover:shadow-elevation transition-all"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-bobflix-50 flex items-center justify-center ring-2 ring-bobflix-100 group-hover:ring-bobflix-300 transition-all">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={15} className="text-bobflix-500" />
              )}
            </div>
            <span className="text-sm font-medium text-text-primary">{profile?.display_name || 'Meu perfil'}</span>
          </Link>

          {hasPartner && (
            <Link
              to="/meu-amor"
              className="group flex items-center gap-2 rounded-full bg-bobflix-50 border border-bobflix-100 px-5 py-2.5 hover:bg-bobflix-100 hover:shadow-subtle transition-all text-sm font-medium text-bobflix-700"
            >
              <Heart size={14} className="fill-bobflix-500 text-bobflix-500 group-hover:scale-110 transition-transform" />
              {partnerName ? `Meu amor, ${partnerName}` : 'Meu amor'}
            </Link>
          )}

          {!hasPartner && user && (
            <button
              type="button"
              onClick={handleCreateInviteLink}
              disabled={inviteCreating}
              className="group flex items-center gap-2 rounded-full bg-bobflix-50 border border-bobflix-100 px-5 py-2.5 hover:bg-bobflix-100 hover:shadow-subtle transition-all text-sm font-medium text-bobflix-700 disabled:opacity-60"
            >
              <Link2 size={14} className="text-bobflix-500 group-hover:scale-110 transition-transform" />
              {inviteCreating ? 'Criando...' : 'Criar convite'}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full bg-surface border border-surface-alt px-4 py-2.5 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-text-secondary text-sm font-medium transition-all"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>

        {!hasPartner && user && inviteLink && (
          <div className="w-full max-w-xl mx-auto flex flex-col gap-2 -mt-4">
            <p className="text-xs text-text-secondary text-center">Envie este link para quem você quer convidar:</p>
            <div className="flex gap-2 items-stretch">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 text-xs rounded-xl bg-surface border border-surface-alt px-3 py-2.5 text-text-primary truncate"
              />
              <button
                type="button"
                onClick={copyInvite}
                className="shrink-0 rounded-xl border border-surface-alt px-3 flex items-center justify-center hover:bg-surface-alt transition-colors"
                title="Copiar link"
              >
                {copiedInvite ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface p-8 rounded-[24px] shadow-subtle border border-surface-alt/50 flex flex-col hover:shadow-elevation transition-all duration-300">
            <div className="text-left space-y-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bobflix-500 to-bobflix-400 text-white flex items-center justify-center shadow-lg">
                <Sparkles size={26} />
              </div>
              <h2 className="text-2xl font-semibold text-text-primary">Criar Sala</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Crie um espaço só de vocês e compartilhe o código com quem ama.
              </p>
            </div>
            <div className="space-y-3 mt-auto">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`w-full flex items-center justify-center gap-2 rounded-full border-2 py-2.5 text-sm font-medium transition-all ${
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
                  className="w-full rounded-full border-2 border-surface-alt bg-surface-alt px-5 py-3 text-center focus:bg-surface focus:border-bobflix-500 outline-none transition-all animate-fade-in"
                />
              )}
              <button
                onClick={handleCreateRoom}
                disabled={showPassword && !password.trim()}
                className="w-full rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:bg-surface-alt disabled:text-text-secondary disabled:cursor-not-allowed text-white font-medium py-3.5 transition-all hover:shadow-lg hover:shadow-bobflix-500/20 flex items-center justify-center gap-2"
              >
                <Play size={16} /> Criar nova sala
              </button>
            </div>
          </div>

          <div className="bg-surface p-8 rounded-[24px] shadow-subtle border border-surface-alt/50 flex flex-col hover:shadow-elevation transition-all duration-300">
            <div className="text-left space-y-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-text-primary text-white flex items-center justify-center shadow-lg">
                <LogIn size={26} />
              </div>
              <h2 className="text-2xl font-semibold text-text-primary">Entrar em Sala</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Alguém te mandou um código? Cole aqui e entre na sessão.
              </p>
            </div>
            <div className="space-y-3 mt-auto">
              <input
                type="text"
                placeholder="Ex: BF-X7K2"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full rounded-full border-2 border-surface-alt bg-surface-alt px-5 py-3 text-center uppercase tracking-widest text-lg focus:bg-surface focus:border-text-primary outline-none transition-all placeholder:normal-case placeholder:tracking-normal placeholder:text-sm"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="w-full rounded-full bg-text-primary hover:bg-black disabled:bg-surface-alt disabled:text-text-secondary disabled:cursor-not-allowed text-white font-medium py-3.5 transition-all hover:shadow-lg flex items-center justify-center gap-2"
              >
                <LogIn size={16} /> Entrar na sala
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
