import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import logoImg from '@/assets/doaskdp-03f16.png'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectAfterAuth = searchParams.get('redirect') || '/'

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const path = redirectAfterAuth.startsWith('/') ? redirectAfterAuth : '/'
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}${path}`,
      },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      if (data.session) {
        navigate(path, { replace: true })
        return
      }
      setSuccess(true)
    }
  }

  const handleGoogle = async () => {
    const path = redirectAfterAuth.startsWith('/') ? redirectAfterAuth : '/'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${path}` },
    })
  }

  if (success) {
    const inviteHint =
      redirectAfterAuth !== '/' && redirectAfterAuth.startsWith('/convite/')
        ? `${window.location.origin}${redirectAfterAuth}`
        : null
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md text-center space-y-6">
          <img src={logoImg} alt="Bobflix" className="h-14 mx-auto" />
          <div className="bg-bobflix-50 rounded-[20px] p-8 space-y-3">
            <h2 className="text-xl font-semibold text-bobflix-900">Verifique seu e-mail!</h2>
            <p className="text-sm text-text-secondary">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link para ativar sua conta.
            </p>
            {inviteHint && (
              <p className="text-xs text-text-secondary pt-2 border-t border-bobflix-200/80">
                Depois de confirmar, abra de novo o convite:{' '}
                <span className="text-bobflix-700 break-all font-medium">{inviteHint}</span>
              </p>
            )}
          </div>
          <button
            onClick={() =>
              navigate(
                inviteHint ? `/login?redirect=${encodeURIComponent(redirectAfterAuth)}` : '/login',
              )
            }
            className="text-bobflix-500 hover:text-bobflix-400 text-sm font-medium"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <Link to="/" className="inline-block">
            <img src={logoImg} alt="Bobflix" className="h-14 mx-auto" />
          </Link>
          <p className="text-text-secondary">Crie sua conta para assistir junto</p>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-full border-2 border-surface-alt bg-surface hover:bg-surface-alt py-3.5 text-sm font-medium transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z" fill="#EA4335"/></svg>
          Criar conta com Google
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-surface-alt" />
          <span className="text-xs text-text-secondary uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-surface-alt" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
              className="w-full rounded-xl border-2 border-surface-alt bg-surface-alt pl-11 pr-4 py-3.5 text-sm focus:bg-surface focus:border-bobflix-500 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              required
              className="w-full rounded-xl border-2 border-surface-alt bg-surface-alt pl-11 pr-4 py-3.5 text-sm focus:bg-surface focus:border-bobflix-500 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha (min. 6 caracteres)"
              required
              minLength={6}
              className="w-full rounded-xl border-2 border-surface-alt bg-surface-alt pl-11 pr-11 py-3.5 text-sm focus:bg-surface focus:border-bobflix-500 outline-none transition-all"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-bobflix-500 hover:bg-bobflix-400 disabled:opacity-50 text-white font-medium py-3.5 transition-colors"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          Já tem conta?{' '}
          <Link
            to={searchParams.get('redirect') ? `/login?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : '/login'}
            className="text-bobflix-500 hover:text-bobflix-400 font-medium"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
