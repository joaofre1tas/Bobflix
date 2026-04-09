import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, Send, Heart } from 'lucide-react'
import type { Profile } from '@/lib/AuthProvider'

interface Msg {
  id: string
  from_user: string
  to_user: string
  text: string
  created_at: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

export default function Messages() {
  const { id: partnerId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || !partnerId) return

    const load = async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', partnerId).single()
      if (prof) setPartner({ id: prof.id, display_name: prof.display_name, avatar_url: prof.avatar_url })

      const { data: msgs } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(from_user.eq.${user.id},to_user.eq.${partnerId}),and(from_user.eq.${partnerId},to_user.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(200)
      if (msgs) setMessages(msgs)

      // Mark as read
      await supabase.from('private_messages').update({ read: true })
        .eq('from_user', partnerId).eq('to_user', user.id).eq('read', false)

      setLoading(false)
    }
    load()

    // Realtime subscription
    const channel = supabase.channel(`dm:${[user.id, partnerId].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        (payload) => {
          const m = payload.new as Msg
          const isPair =
            (m.from_user === user.id && m.to_user === partnerId) ||
            (m.from_user === partnerId && m.to_user === user.id)
          if (!isPair) return
          if (m.from_user === user.id) return
          setMessages((prev) => [...prev, m])
          supabase.from('private_messages').update({ read: true }).eq('id', m.id).then()
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, partnerId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || !partnerId) return
    const text = input.trim()
    setInput('')
    const optimistic: Msg = {
      id: crypto.randomUUID(),
      from_user: user.id,
      to_user: partnerId,
      text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    await supabase.from('private_messages').insert({ from_user: user.id, to_user: partnerId, text })
  }

  let lastDate = ''

  return (
    <div className="flex-1 flex flex-col h-screen animate-fade-in">
      {/* Header */}
      <header className="h-[72px] px-6 bg-surface border-b border-surface-alt flex items-center gap-4 shrink-0">
        <Link to={`/parceiro/${partnerId}`} className="text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-bobflix-50 flex items-center justify-center">
            {partner?.avatar_url ? (
              <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-bobflix-500">{partner?.display_name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">{partner?.display_name}</p>
            <p className="text-xs text-text-secondary">Chat privado</p>
          </div>
        </div>
        <Heart size={18} className="text-bobflix-500 fill-bobflix-500" />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-bobflix-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary space-y-3">
            <Heart size={40} className="text-bobflix-300" />
            <p className="text-sm">Comece uma conversa com {partner?.display_name}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const dateKey = formatDateSeparator(msg.created_at)
            let showDate = false
            if (dateKey !== lastDate) {
              lastDate = dateKey
              showDate = true
            }
            const isMe = msg.from_user === user?.id
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center py-3">
                    <span className="text-[11px] text-text-secondary bg-surface-alt px-3 py-1 rounded-full">{dateKey}</span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isMe
                      ? 'bg-bobflix-500 text-white rounded-br-sm'
                      : 'bg-surface-alt text-text-primary rounded-bl-sm'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-text-secondary'}`}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-surface border-t border-surface-alt shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva algo..."
            className="flex-1 rounded-full bg-surface-alt border-none px-5 py-3 text-sm focus:ring-2 focus:ring-bobflix-500 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-11 h-11 rounded-full bg-bobflix-500 disabled:bg-surface-alt disabled:text-text-secondary text-white flex items-center justify-center transition-colors"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
