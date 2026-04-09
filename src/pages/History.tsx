import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Heart, Film } from 'lucide-react'
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

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `Ha ${diffDays} dias`
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function History() {
  const { user } = useAuth()
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

  return (
    <div className="flex-1 flex flex-col items-center p-6 animate-fade-in">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <img src={logoImg} alt="Bobflix" className="h-8" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Nosso Historico</h1>
          <p className="text-text-secondary text-sm flex items-center justify-center gap-1.5">
            Tudo que voces assistiram juntos <Heart size={14} className="text-bobflix-500" />
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-bobflix-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-bobflix-50 flex items-center justify-center mx-auto">
              <Film size={32} className="text-bobflix-300" />
            </div>
            <p className="text-text-secondary">Nenhum video assistido ainda.</p>
            <p className="text-sm text-text-secondary">Crie uma sala e comece a assistir com alguem especial!</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-bobflix-100" />

            <div className="space-y-6">
              {entries.map((entry) => {
                const videoId = extractVideoId(entry.video_url)
                const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null

                return (
                  <div key={entry.id} className="relative flex gap-4 pl-12">
                    {/* Timeline dot */}
                    <div className="absolute left-[18px] top-3 w-3 h-3 rounded-full bg-bobflix-500 border-2 border-surface ring-4 ring-bobflix-50" />

                    <div className="flex-1 bg-surface rounded-[16px] shadow-subtle border border-surface-alt/50 overflow-hidden hover:shadow-elevation transition-shadow">
                      {thumb && (
                        <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={thumb} alt="" className="w-full h-40 object-cover" />
                        </a>
                      )}
                      <div className="p-4 space-y-2">
                        <h3 className="font-medium text-text-primary text-sm leading-snug">
                          {entry.video_title || entry.video_url}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-secondary">{formatDate(entry.watched_at)}</span>
                          {entry.partner_name && (
                            <span className="flex items-center gap-1.5 text-xs text-bobflix-700 bg-bobflix-50 px-2.5 py-1 rounded-full">
                              {entry.partner_avatar && (
                                <img src={entry.partner_avatar} alt="" className="w-4 h-4 rounded-full" />
                              )}
                              com {entry.partner_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
