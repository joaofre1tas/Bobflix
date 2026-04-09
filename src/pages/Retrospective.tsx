import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Heart, Film, Clock, Calendar, Trophy, Star, Play } from 'lucide-react'
import logoImg from '@/assets/doaskdp-03f16.png'

interface Stats {
  totalVideos: number
  totalMinutes: number
  topMonth: string | null
  topMonthCount: number
  firstVideo: { url: string; date: string; title: string } | null
  topPartner: { id: string; name: string; avatar: string | null; count: number } | null
  streak: number
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function extractVideoId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  return match ? match[1] : null
}

function computeStreak(dates: string[]) {
  if (dates.length === 0) return 0
  const unique = [...new Set(dates.map(d => new Date(d).toDateString()))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  let maxStreak = 1, current = 1
  for (let i = 1; i < unique.length; i++) {
    const diff = (new Date(unique[i]).getTime() - new Date(unique[i - 1]).getTime()) / (1000 * 60 * 60 * 24)
    if (diff <= 1) { current++; maxStreak = Math.max(maxStreak, current) } else current = 1
  }
  return maxStreak
}

export default function Retrospective() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: history } = await supabase.from('watch_history')
        .select('video_url, video_title, watched_at, watched_with')
        .eq('user_id', user.id).order('watched_at', { ascending: true })

      if (!history || history.length === 0) {
        setStats({ totalVideos: 0, totalMinutes: 0, topMonth: null, topMonthCount: 0, firstVideo: null, topPartner: null, streak: 0 })
        setLoading(false); return
      }

      const totalVideos = history.length
      const totalMinutes = totalVideos * 12
      const monthCounts: Record<string, number> = {}
      for (const h of history) {
        const d = new Date(h.watched_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        monthCounts[key] = (monthCounts[key] || 0) + 1
      }
      const topMonthKey = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]
      const topMonth = topMonthKey ? MONTH_NAMES[parseInt(topMonthKey[0].split('-')[1])] : null
      const topMonthCount = topMonthKey ? topMonthKey[1] : 0
      const first = history[0]
      const firstVideo = first ? { url: first.video_url, date: first.watched_at, title: first.video_title } : null

      const partnerCounts: Record<string, number> = {}
      for (const h of history) { if (h.watched_with) partnerCounts[h.watched_with] = (partnerCounts[h.watched_with] || 0) + 1 }
      let topPartner: Stats['topPartner'] = null
      const topPartnerId = Object.entries(partnerCounts).sort((a, b) => b[1] - a[1])[0]
      if (topPartnerId) {
        const { data: prof } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', topPartnerId[0]).single()
        if (prof) topPartner = { id: prof.id, name: prof.display_name, avatar: prof.avatar_url, count: topPartnerId[1] }
      }

      setStats({ totalVideos, totalMinutes, topMonth, topMonthCount, firstVideo, topPartner, streak: computeStreak(history.map(h => h.watched_at)) })
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-3 border-bobflix-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!stats || stats.totalVideos === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <Film size={48} className="text-bobflix-300" />
        <h1 className="text-xl font-semibold">Ainda não há dados</h1>
        <p className="text-text-secondary text-sm text-center max-w-xs">Assista vídeos com alguém especial para desbloquear sua retrospectiva.</p>
        <Link to="/" className="text-bobflix-500 hover:text-bobflix-400 text-sm font-medium">Voltar para a home</Link>
      </div>
    )
  }

  const firstThumb = stats.firstVideo ? extractVideoId(stats.firstVideo.url) : null

  return (
    <div className="flex-1 flex flex-col items-center p-6 animate-fade-in min-h-screen">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/meu-amor" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} /><span className="text-sm font-medium">Voltar</span>
          </Link>
          <img src={logoImg} alt="Bobflix" className="h-8" />
        </div>

        {/* Title */}
        <div className="text-center space-y-3 pt-4">
          <div className="w-16 h-16 rounded-full bg-bobflix-50 flex items-center justify-center mx-auto">
            <Star size={32} className="text-bobflix-500" />
          </div>
          <p className="text-sm text-bobflix-500 font-medium uppercase tracking-widest">Sua retrospectiva</p>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            Vocês assistiram <span className="text-bobflix-500">{stats.totalVideos} vídeos</span> juntos
          </h1>
        </div>

        <div className="space-y-4">
          {/* Total time */}
          <div className="bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-bobflix-50 flex items-center justify-center shrink-0">
                <Clock size={24} className="text-bobflix-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-text-primary">{stats.totalMinutes} min</p>
                <p className="text-sm text-text-secondary">de vídeos assistidos juntos</p>
              </div>
            </div>
          </div>

          {/* Top month */}
          {stats.topMonth && (
            <div className="bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-bobflix-50 flex items-center justify-center shrink-0">
                  <Calendar size={24} className="text-bobflix-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary">{stats.topMonth}</p>
                  <p className="text-sm text-text-secondary">foi o mês mais intenso: {stats.topMonthCount} vídeos!</p>
                </div>
              </div>
            </div>
          )}

          {/* Streak */}
          {stats.streak > 1 && (
            <div className="bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-bobflix-50 flex items-center justify-center shrink-0">
                  <Trophy size={24} className="text-bobflix-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">{stats.streak} dias</p>
                  <p className="text-sm text-text-secondary">foi o recorde de vocês assistindo seguidos!</p>
                </div>
              </div>
            </div>
          )}

          {/* Top partner */}
          {stats.topPartner && (
            <div className="bg-bobflix-50 rounded-[20px] border border-bobflix-100 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-surface border-2 border-bobflix-200 flex items-center justify-center shrink-0">
                  {stats.topPartner.avatar ? (
                    <img src={stats.topPartner.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Heart size={20} className="text-bobflix-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-bobflix-700/70">Sua pessoa especial</p>
                  <p className="text-xl font-bold text-bobflix-900">{stats.topPartner.name}</p>
                  <p className="text-sm text-bobflix-700/70">{stats.topPartner.count} vídeos juntos</p>
                </div>
              </div>
            </div>
          )}

          {/* First video */}
          {stats.firstVideo && (
            <div className="bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 overflow-hidden">
              <div className="p-4 pb-2">
                <p className="text-xs text-bobflix-500 font-medium uppercase tracking-wider">Primeiro vídeo juntos</p>
                <p className="text-[11px] text-text-secondary mt-0.5">{new Date(stats.firstVideo.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {firstThumb && (
                <a href={stats.firstVideo.url} target="_blank" rel="noopener noreferrer" className="block relative group">
                  <img src={`https://img.youtube.com/vi/${firstThumb}/mqdefault.jpg`} alt="" className="w-full h-44 object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play size={22} className="text-text-primary ml-0.5" /></div>
                  </div>
                </a>
              )}
              <div className="p-4 pt-2">
                <p className="text-sm font-medium text-text-primary">{stats.firstVideo.title || 'Vídeo do YouTube'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-4 pt-4">
          <Heart size={24} className="text-bobflix-500 fill-bobflix-500 mx-auto" />
          <p className="text-sm text-text-secondary">Cada vídeo assistido junto é uma memória que vocês criaram.</p>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-bobflix-500 hover:bg-bobflix-400 text-white px-6 py-3 text-sm font-medium transition-all">
            Criar mais memórias
          </Link>
        </div>
      </div>
    </div>
  )
}
