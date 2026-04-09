import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Heart, Film, Play, Calendar } from 'lucide-react'
import logoImg from '@/assets/doaskdp-03f16.png'

interface HistoryEntry {
  id: string
  video_url: string
  video_title: string
  watched_at: string
  partner_name: string | null
  partner_avatar: string | null
}

function extractVideoId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  return match ? match[1] : null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) return `Hoje às ${time}`
  if (diffDays === 1) return `Ontem às ${time}`
  if (diffDays < 7) return `Há ${diffDays} dias`
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDate(entries: HistoryEntry[]) {
  const groups: Record<string, HistoryEntry[]> = {}
  for (const entry of entries) {
    const d = new Date(entry.watched_at)
    const key = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  }
  return Object.entries(groups)
}

export default function History() {
  const { user, profile } = useAuth()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('watch_history')
        .select('id, video_url, video_title, watched_at, watched_with')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(50)

      if (!data) { setLoading(false); return }

      const partnerIds = [...new Set(data.map(d => d.watched_with).filter(Boolean))]
      let partnerMap: Record<string, { name: string; avatar: string | null }> = {}

      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', partnerIds)
        if (profiles) {
          for (const p of profiles) {
            partnerMap[p.id] = { name: p.display_name, avatar: p.avatar_url }
          }
        }
      }

      setEntries(data.map(d => ({
        id: d.id,
        video_url: d.video_url,
        video_title: d.video_title,
        watched_at: d.watched_at,
        partner_name: d.watched_with ? partnerMap[d.watched_with]?.name ?? null : null,
        partner_avatar: d.watched_with ? partnerMap[d.watched_with]?.avatar ?? null : null,
      })))
      setLoading(false)
    }
    load()
  }, [user])

  const grouped = groupByDate(entries)

  return (
    <div className="flex-1 flex flex-col items-center p-6 animate-fade-in min-h-screen">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <img src={logoImg} alt="Bobflix" className="h-8" />
        </div>

        {/* Hero */}
        <div className="text-center space-y-4 pb-4">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-bobflix-100 to-bobflix-50 flex items-center justify-center mx-auto shadow-subtle">
              <Heart size={36} className="text-bobflix-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface border-2 border-bobflix-100 flex items-center justify-center">
              <Play size={14} className="text-bobflix-500 ml-0.5" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Nosso Histórico</h1>
            <p className="text-text-secondary text-sm">
              Cada vídeo que vocês assistiram juntos, guardado aqui com carinho
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-3 border-bobflix-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 space-y-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-[20px] bg-bobflix-50 flex items-center justify-center mx-auto">
                <Film size={40} className="text-bobflix-300" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-text-primary">Nenhuma memória ainda</p>
              <p className="text-sm text-text-secondary max-w-xs mx-auto">
                Quando vocês assistirem um vídeo juntos, ele vai aparecer aqui como uma memória especial.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-bobflix-500 hover:bg-bobflix-400 text-white px-6 py-3 text-sm font-medium transition-all hover:shadow-lg hover:shadow-bobflix-500/20"
            >
              <Sparkle />
              Criar uma sala
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel} className="space-y-4">
                {/* Date header */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bobflix-50 flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-bobflix-500" />
                  </div>
                  <span className="text-sm font-medium text-bobflix-700">{dateLabel}</span>
                  <div className="flex-1 h-px bg-bobflix-50" />
                </div>

                {/* Entries for this date */}
                <div className="space-y-3 pl-4">
                  {items.map((entry) => {
                    const videoId = extractVideoId(entry.video_url)
                    const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null

                    return (
                      <a
                        key={entry.id}
                        href={entry.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-4 bg-surface rounded-[16px] shadow-subtle border border-surface-alt/50 overflow-hidden hover:shadow-elevation transition-all group"
                      >
                        {thumb && (
                          <div className="w-40 shrink-0 relative overflow-hidden">
                            <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                <Play size={18} className="text-text-primary ml-0.5" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex-1 py-4 pr-4 flex flex-col justify-center gap-2">
                          <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-2">
                            {entry.video_title || 'Vídeo do YouTube'}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-text-secondary">{formatDate(entry.watched_at)}</span>
                            {entry.partner_name && (
                              <span className="flex items-center gap-1.5 text-xs text-bobflix-700 bg-bobflix-50 px-2.5 py-1 rounded-full">
                                {entry.partner_avatar ? (
                                  <img src={entry.partner_avatar} alt="" className="w-4 h-4 rounded-full" />
                                ) : (
                                  <Heart size={10} className="text-bobflix-500" />
                                )}
                                com {entry.partner_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Sparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.272 1.278L21 12l-5.816 1.909a2 2 0 00-1.272 1.278L12 21l-1.912-5.813a2 2 0 00-1.272-1.278L3 12l5.816-1.909a2 2 0 001.272-1.278z" />
    </svg>
  )
}
