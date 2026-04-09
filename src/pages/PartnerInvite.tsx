import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthProvider'
import { Heart, LogIn, UserPlus, Loader2 } from 'lucide-react'
import logoImg from '@/assets/doaskdp-03f16.png'

type PeekResult = {
  found: boolean
  inviter_id?: string
  inviter_name?: string
  expires_at?: string
  valid?: boolean
}

export default function PartnerInvite() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [peek, setPeek] = useState<PeekResult | null>(null)
  const [loadingPeek, setLoadingPeek] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  const redirectPath = token ? `/convite/${token}` : '/'

  const loadPeek = useCallback(async () => {
    if (!token) {
      setPeek({ found: false })
      setLoadingPeek(false)
      return
    }
    setLoadingPeek(true)
    const { data, error } = await supabase.rpc('peek_partner_invite', { invite_token: token })
    setLoadingPeek(false)
    if (error || data == null) {
      setPeek({ found: false })
      return
    }
    setPeek(data as PeekResult)
  }, [token])

  useEffect(() => {
    loadPeek()
  }, [loadPeek])

  const accept = async () => {
    if (!token || !user) return
    setAccepting(true)
    setAcceptError(null)
    const { data, error } = await supabase.rpc('accept_partner_invite', { invite_token: token })
    setAccepting(false)
    if (error) {
      setAcceptError(error.message)
      return
    }
    const row = data as { ok?: boolean; error?: string }
    if (!row?.ok) {
      const key = row?.error || 'unknown'
      const messages: Record<string, string> = {
        not_authenticated: 'Faça login para aceitar.',
        invalid_token: 'Convite inválido.',
        already_used: 'Este convite já foi usado.',
        expired: 'Este convite expirou.',
        cannot_accept_own: 'Este link é seu — envie para a pessoa amada.',
        you_have_partnership: 'Você já tem um vínculo. Desfaça-o antes de aceitar outro convite.',
        inviter_has_partnership: 'Quem te convidou já formou outro vínculo.',
      }
      setAcceptError(messages[key] || 'Não foi possível aceitar o convite.')
      return
    }
    navigate('/meu-amor', { replace: true })
  }

  if (authLoading || loadingPeek) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-bobflix-500 animate-spin" />
      </div>
    )
  }

  if (!token || !peek?.found) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in">
        <img src={logoImg} alt="Bobflix" className="h-12" />
        <p className="text-text-secondary text-center max-w-sm">Este convite não existe ou o link está incorreto.</p>
        <Link to="/" className="text-bobflix-500 text-sm font-medium">Ir para a home</Link>
      </div>
    )
  }

  const inviter = peek.inviter_name || 'Alguém especial'
  const isValid = peek.valid === true
  const isOwnInvite = Boolean(user?.id && peek.inviter_id && user.id === peek.inviter_id)

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in min-h-screen">
      <div className="w-full max-w-md space-y-8 text-center">
        <img src={logoImg} alt="Bobflix" className="h-14 mx-auto" />
        <div className="bg-surface rounded-[24px] shadow-subtle border border-surface-alt/50 p-8 space-y-4">
          <Heart size={40} className="text-bobflix-500 fill-bobflix-500 mx-auto" />
          <h1 className="text-xl font-semibold text-text-primary">Convite no Bobflix</h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            <span className="font-medium text-text-primary">{inviter}</span> quer viver essa experiência com você — filme sincronizado, recados e muito mais.
          </p>
          {!isValid && (
            <p className="text-sm text-amber-600 font-medium">Este convite não está mais disponível.</p>
          )}
        </div>

        {user && isValid && isOwnInvite && (
          <div className="rounded-xl bg-surface-alt/80 border border-surface-alt px-4 py-3 text-sm text-text-secondary">
            Este é o seu link de convite. Envie para quem você quer chamar — a outra pessoa precisa abrir o link no aparelho dela.
          </div>
        )}

        {user && isValid && !isOwnInvite && (
          <div className="space-y-3">
            {acceptError && <p className="text-sm text-red-500">{acceptError}</p>}
            <button
              type="button"
              onClick={accept}
              disabled={accepting}
              className="w-full rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:opacity-50 text-white font-medium py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {accepting ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} className="fill-white" />}
              Aceitar e formar vínculo
            </button>
            <Link to="/" className="block text-sm text-text-secondary hover:text-text-primary">Voltar depois</Link>
          </div>
        )}

        {user && !isValid && (
          <Link to="/" className="inline-block text-bobflix-500 text-sm font-medium">Ir para a home</Link>
        )}

        {!user && isValid && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">Entre ou crie uma conta — depois você volta aqui automaticamente.</p>
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-bobflix-500 hover:bg-bobflix-400 text-white font-medium py-3.5 transition-colors"
            >
              <LogIn size={18} /> Já tenho conta
            </Link>
            <Link
              to={`/cadastro?redirect=${encodeURIComponent(redirectPath)}`}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-surface-alt bg-surface hover:bg-surface-alt text-text-primary font-medium py-3.5 transition-colors"
            >
              <UserPlus size={18} /> Criar conta
            </Link>
          </div>
        )}

        {!user && !isValid && (
          <div className="space-y-3">
            <Link to="/login" className="text-bobflix-500 text-sm font-medium">Fazer login</Link>
          </div>
        )}
      </div>
    </div>
  )
}
