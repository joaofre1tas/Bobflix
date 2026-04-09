import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Heart, MessageCircle, Send, Play, Plus, Trash2, BookmarkPlus, Calendar, Film, Star, Unlink } from 'lucide-react'
import type { Profile } from '@/lib/AuthProvider'
import logoImg from '@/assets/doaskdp-03f16.png'

function extractVideoId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  return match ? match[1] : null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatRelative(iso: string) {
  const d = new Date(iso)
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `Há ${diffDays} dias`
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default function Partner() {
  const { user, profile: myProfile } = useAuth()
  const navigate = useNavigate()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [since, setSince] = useState<string | null>(null)
  const [partnershipId, setPartnershipId] = useState<string | null>(null)
  const [totalVideos, setTotalVideos] = useState(0)
  const [history, setHistory] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [wishlist, setWishlist] = useState<any[]>([])
  const [newWish, setNewWish] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      // Find the partnership
      const { data: pship } = await supabase.from('partnerships')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .limit(1)
        .single()

      if (!pship) {
        setLoading(false)
        return
      }

      setPartnershipId(pship.id)
      setSince(pship.since)
      const pid = pship.user_a === user.id ? pship.user_b : pship.user_a
      setPartnerId(pid)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', pid).single()
      if (prof) setPartner({ id: prof.id, display_name: prof.display_name, avatar_url: prof.avatar_url })

      // Wishlist
      const { data: wl } = await supabase.from('wishlist')
        .select('*').eq('partnership_id', pship.id).order('created_at', { ascending: false })
      if (wl) setWishlist(wl)

      // Watch history together
      const { data: hist } = await supabase.from('watch_history')
        .select('*').eq('user_id', user.id).eq('watched_with', pid)
        .order('watched_at', { ascending: false }).limit(20)
      if (hist) { setHistory(hist); setTotalVideos(hist.length) }

      // Love notes
      const { data: n } = await supabase.from('love_notes')
        .select('*')
        .or(`and(from_user.eq.${user.id},to_user.eq.${pid}),and(from_user.eq.${pid},to_user.eq.${user.id})`)
        .order('created_at', { ascending: false }).limit(20)
      if (n) setNotes(n)

      setLoading(false)
    }
    load()
  }, [user])

  const handleSendNote = async () => {
    if (!newNote.trim() || !user || !partnerId) return
    await supabase.from('love_notes').insert({ from_user: user.id, to_user: partnerId, text: newNote.trim() })
    setNotes([{ id: crypto.randomUUID(), from_user: user.id, to_user: partnerId, text: newNote.trim(), created_at: new Date().toISOString() }, ...notes])
    setNewNote('')
  }

  const handleAddWish = async () => {
    if (!newWish.trim() || !partnershipId || !user) return
    await supabase.from('wishlist').insert({ partnership_id: partnershipId, video_url: newWish.trim(), added_by: user.id })
    setWishlist([{ id: crypto.randomUUID(), video_url: newWish.trim(), video_title: '', added_by: user.id, watched: false, created_at: new Date().toISOString() }, ...wishlist])
    setNewWish('')
  }

  const handleRemoveWish = async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id)
    setWishlist(wishlist.filter(w => w.id !== id))
  }

  const handleUnlink = async () => {
    if (!partnershipId) return
    await supabase.from('partnerships').delete().eq('id', partnershipId)
    navigate('/')
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-3 border-bobflix-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!partner) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <Heart size={48} className="text-bobflix-300" />
        <h1 className="text-xl font-semibold text-text-primary">Nenhum vínculo ainda</h1>
        <p className="text-sm text-text-secondary text-center max-w-xs">Assista um vídeo com alguém especial para criar o vínculo automaticamente.</p>
        <Link to="/" className="text-bobflix-500 hover:text-bobflix-400 text-sm font-medium">Voltar para a home</Link>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6 animate-fade-in min-h-screen">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={18} /><span className="text-sm font-medium">Voltar</span>
          </Link>
          <img src={logoImg} alt="Bobflix" className="h-8" />
        </div>

        {/* Couple header */}
        <div className="bg-surface rounded-[24px] shadow-subtle border border-surface-alt/50 p-8 text-center space-y-5">
          <div className="flex items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-bobflix-50 border-4 border-surface shadow-lg flex items-center justify-center">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-bobflix-500">{myProfile?.display_name?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            <Heart size={28} className="text-bobflix-500 fill-bobflix-500 shrink-0" />
            <div className="w-20 h-20 rounded-full overflow-hidden bg-bobflix-50 border-4 border-surface shadow-lg flex items-center justify-center">
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-bobflix-500">{partner.display_name?.[0]?.toUpperCase()}</span>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{partner.display_name}</h1>
            {since && (
              <p className="text-sm text-text-secondary mt-1 flex items-center justify-center gap-1.5">
                <Calendar size={13} /> Juntos desde {formatDate(since)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-bobflix-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-bobflix-700">{totalVideos}</p>
              <p className="text-xs text-bobflix-700/70 mt-1">vídeos juntos</p>
            </div>
            <div className="bg-bobflix-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-bobflix-700">{Math.round(totalVideos * 12)}</p>
              <p className="text-xs text-bobflix-700/70 mt-1">minutos estimados</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to={`/mensagens/${partnerId}`}
              className="inline-flex items-center gap-2 rounded-full bg-bobflix-500 hover:bg-bobflix-400 text-white px-5 py-2.5 text-sm font-medium transition-all hover:shadow-lg hover:shadow-bobflix-500/20"
            >
              <MessageCircle size={15} /> Conversar
            </Link>
            <Link
              to="/retrospectiva"
              className="inline-flex items-center gap-2 rounded-full bg-bobflix-900 hover:bg-black text-white px-5 py-2.5 text-sm font-medium transition-all hover:shadow-lg"
            >
              <Star size={15} /> Retrospectiva
            </Link>
            <Link
              to="/historico"
              className="inline-flex items-center gap-2 rounded-full border-2 border-surface-alt text-text-secondary hover:bg-surface-alt px-5 py-2.5 text-sm font-medium transition-all"
            >
              <Film size={15} /> Histórico
            </Link>
          </div>
        </div>

        {/* Love notes */}
        <div className="bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart size={18} className="text-bobflix-500" /> Recados
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Deixe um recado carinhoso..."
              className="flex-1 rounded-full bg-surface-alt border-none px-4 py-2.5 text-sm focus:ring-2 focus:ring-bobflix-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
            />
            <button onClick={handleSendNote} disabled={!newNote.trim()} className="w-10 h-10 rounded-full bg-bobflix-500 disabled:bg-surface-alt text-white disabled:text-text-secondary flex items-center justify-center transition-colors">
              <Send size={14} />
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">Nenhum recado ainda. Deixe o primeiro!</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className={`px-4 py-3 rounded-2xl text-sm ${n.from_user === user?.id ? 'bg-bobflix-50 text-bobflix-900 ml-8' : 'bg-surface-alt text-text-primary mr-8'}`}>
                  <p>{n.text}</p>
                  <p className="text-[10px] text-text-secondary mt-1">{formatRelative(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wishlist */}
        <div className="bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookmarkPlus size={18} className="text-bobflix-500" /> Queremos assistir
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWish}
              onChange={(e) => setNewWish(e.target.value)}
              placeholder="Cole um link do YouTube..."
              className="flex-1 rounded-full bg-surface-alt border-none px-4 py-2.5 text-sm focus:ring-2 focus:ring-bobflix-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddWish()}
            />
            <button onClick={handleAddWish} disabled={!newWish.trim()} className="w-10 h-10 rounded-full bg-bobflix-500 disabled:bg-surface-alt text-white disabled:text-text-secondary flex items-center justify-center transition-colors">
              <Plus size={14} />
            </button>
          </div>
          {wishlist.filter(w => !w.watched).length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">Adicionem vídeos que querem assistir juntos!</p>
          ) : (
            <div className="space-y-2">
              {wishlist.filter(w => !w.watched).map((w) => {
                const vid = extractVideoId(w.video_url)
                const thumb = vid ? `https://img.youtube.com/vi/${vid}/default.jpg` : null
                return (
                  <div key={w.id} className="flex items-center gap-3 p-2 rounded-xl bg-surface-alt">
                    {thumb && <img src={thumb} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />}
                    <span className="flex-1 text-sm text-text-primary truncate">{w.video_title || w.video_url}</span>
                    <button onClick={() => handleRemoveWish(w.id)} className="text-text-secondary hover:text-red-500 transition-colors shrink-0"><Trash2 size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* History together */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Film size={18} className="text-bobflix-500" /> O que assistiram juntos
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">Nenhum vídeo assistido juntos ainda.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                const videoId = extractVideoId(entry.video_url)
                const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null
                return (
                  <a key={entry.id} href={entry.video_url} target="_blank" rel="noopener noreferrer" className="flex gap-4 bg-surface rounded-[16px] shadow-subtle border border-surface-alt/50 overflow-hidden hover:shadow-elevation transition-all group">
                    {thumb && (
                      <div className="w-36 shrink-0 relative overflow-hidden">
                        <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center"><Play size={16} className="text-text-primary ml-0.5" /></div>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 py-3 pr-4 flex flex-col justify-center gap-1">
                      <h3 className="font-medium text-text-primary text-sm leading-snug line-clamp-2">{entry.video_title || 'Vídeo do YouTube'}</h3>
                      <span className="text-xs text-text-secondary">{formatRelative(entry.watched_at)}</span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Unlink */}
        <div className="pt-4 border-t border-surface-alt">
          {!confirmUnlink ? (
            <button
              onClick={() => setConfirmUnlink(true)}
              className="w-full flex items-center justify-center gap-2 text-text-secondary hover:text-red-500 text-sm font-medium transition-colors py-3"
            >
              <Unlink size={14} /> Desfazer vínculo
            </button>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-red-500 font-medium">Tem certeza? O histórico será mantido, mas o vínculo será desfeito.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmUnlink(false)} className="rounded-full border-2 border-surface-alt text-text-secondary px-5 py-2 text-sm font-medium hover:bg-surface-alt transition-colors">Cancelar</button>
                <button onClick={handleUnlink} className="rounded-full bg-red-500 hover:bg-red-600 text-white px-5 py-2 text-sm font-medium transition-colors">Confirmar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
