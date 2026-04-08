import { createStore } from './main'
import { supabase } from '@/lib/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type User = {
  id: string
  nickname: string
  state: 'buffering' | 'ready' | 'playing' | 'paused'
}

export type Message = {
  id: string
  senderId: string
  senderName: string
  text: string
  time: string
}

export type Reaction = {
  id: string
  emoji: string
  userId: string
  xOffset: number
}

export type Notification = {
  id: string
  text: string
}

export type PlaybackState = {
  status: 'playing' | 'paused' | 'buffering' | 'unstarted'
  time: number
  updatedBy: string
}

interface RoomState {
  currentUser: { id: string; nickname: string } | null
  roomId: string | null
  participants: User[]
  messages: Message[]
  videoUrl: string
  playback: PlaybackState
  reactions: Reaction[]
  notifications: Notification[]
  setCurrentUser: (nickname: string) => void
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  setVideoUrl: (url: string) => void
  sendMessage: (text: string) => void
  sendReaction: (emoji: string) => void
  syncPlayback: (status: PlaybackState['status'], time: number, isLocal: boolean) => void
  addNotification: (text: string) => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const DEFAULT_VIDEO = ''

let channel: RealtimeChannel | null = null

export const useRoomStore = createStore<RoomState>((set, get) => ({
  currentUser: null,
  roomId: null,
  participants: [],
  messages: [],
  videoUrl: DEFAULT_VIDEO,
  playback: { status: 'unstarted', time: 0, updatedBy: '' },
  reactions: [],
  notifications: [],

  setCurrentUser: (nickname) => {
    set(() => ({ currentUser: { id: generateId(), nickname } }))
  },

  joinRoom: async (roomId: string) => {
    const user = get().currentUser
    if (!user) return

    if (channel) {
      await supabase.removeChannel(channel)
      channel = null
    }

    // Ensure room exists
    await supabase.from('rooms').upsert(
      { id: roomId },
      { onConflict: 'id', ignoreDuplicates: true },
    )

    // Load room, messages and playback in parallel
    const [roomRes, msgsRes, pbRes] = await Promise.all([
      supabase.from('rooms').select('video_url').eq('id', roomId).single(),
      supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase.from('playback_state').select('*').eq('room_id', roomId).single(),
    ])

    const formattedMessages: Message[] = (msgsRes.data || []).map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      text: m.text,
      time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }))

    set(() => ({
      roomId,
      videoUrl: roomRes.data?.video_url || DEFAULT_VIDEO,
      messages: formattedMessages,
      playback: pbRes.data
        ? { status: pbRes.data.status, time: pbRes.data.time, updatedBy: pbRes.data.updated_by }
        : { status: 'unstarted' as const, time: 0, updatedBy: '' },
      participants: [],
      reactions: [],
      notifications: [],
    }))

    // --- Realtime subscriptions ---
    channel = supabase.channel(`room:${roomId}`)

    // Presence: participants
    channel.on('presence', { event: 'sync' }, () => {
      const ps = channel!.presenceState<{ user_id: string; nickname: string; state: string }>()
      const users: User[] = []
      for (const key of Object.keys(ps)) {
        for (const p of ps[key]) {
          users.push({ id: p.user_id, nickname: p.nickname, state: (p.state as User['state']) || 'ready' })
        }
      }
      set(() => ({ participants: users }))
    })

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      for (const p of newPresences as any[]) {
        if (p.user_id !== user.id) {
          get().addNotification(`${p.nickname} entrou na sala`)
        }
      }
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const p of leftPresences as any[]) {
        get().addNotification(`${p.nickname} saiu da sala`)
      }
    })

    // Postgres Changes: new messages
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const m = payload.new as any
        if (m.sender_id === get().currentUser?.id) return
        const msg: Message = {
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          text: m.text,
          time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }
        set((state) => ({ messages: [...state.messages, msg] }))
      },
    )

    // Broadcast: playback sync (faster than Postgres Changes)
    channel.on('broadcast', { event: 'playback' }, ({ payload }) => {
      if (payload.updatedBy === get().currentUser?.id) return
      set(() => ({ playback: { status: payload.status, time: payload.time, updatedBy: payload.updatedBy } }))
      if (payload.status === 'playing') get().addNotification('Alguém deu play')
      if (payload.status === 'paused') get().addNotification('Alguém pausou')
    })

    // Postgres Changes: room video URL
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        const r = payload.new as any
        if (r.video_url !== get().videoUrl) {
          set(() => ({ videoUrl: r.video_url }))
          get().addNotification('O vídeo foi alterado')
        }
      },
    )

    // Broadcast: ephemeral reactions
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload.userId === get().currentUser?.id) return
      const reaction: Reaction = { id: payload.id, emoji: payload.emoji, userId: payload.userId, xOffset: payload.xOffset }
      set((state) => ({ reactions: [...state.reactions, reaction] }))
      setTimeout(() => {
        set((state) => ({ reactions: state.reactions.filter((r) => r.id !== reaction.id) }))
      }, 2000)
    })

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel!.track({ user_id: user.id, nickname: user.nickname, state: 'ready' })
      }
    })
  },

  leaveRoom: () => {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
    set(() => ({
      roomId: null,
      participants: [],
      messages: [],
      reactions: [],
      notifications: [],
      playback: { status: 'unstarted' as const, time: 0, updatedBy: '' },
    }))
  },

  setVideoUrl: (url) => {
    const roomId = get().roomId
    if (!roomId) return
    set(() => ({
      videoUrl: url,
      playback: { status: 'unstarted' as const, time: 0, updatedBy: get().currentUser?.id || '' },
    }))
    supabase.from('rooms').update({ video_url: url }).eq('id', roomId).then()
    get().addNotification(`${get().currentUser?.nickname} alterou o vídeo`)
  },

  sendMessage: (text) => {
    const user = get().currentUser
    const roomId = get().roomId
    if (!user || !roomId) return

    const newMsg: Message = {
      id: generateId(),
      senderId: user.id,
      senderName: user.nickname,
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    set((state) => ({ messages: [...state.messages, newMsg] }))
    supabase.from('messages').insert({ room_id: roomId, sender_id: user.id, sender_name: user.nickname, text }).then()
  },

  sendReaction: (emoji) => {
    const user = get().currentUser
    if (!user) return
    const reaction: Reaction = { id: generateId(), emoji, userId: user.id, xOffset: Math.random() * 40 - 20 }
    set((state) => ({ reactions: [...state.reactions, reaction] }))
    setTimeout(() => {
      set((state) => ({ reactions: state.reactions.filter((r) => r.id !== reaction.id) }))
    }, 2000)
    channel?.send({ type: 'broadcast', event: 'reaction', payload: reaction })
  },

  syncPlayback: (status, time, isLocal) => {
    const user = get().currentUser
    const roomId = get().roomId
    if (!user || !roomId) return

    const currentState = get().playback
    if (currentState.status === status && Math.abs(currentState.time - time) < 1) return

    set(() => ({ playback: { status, time, updatedBy: isLocal ? user.id : 'remote' } }))

    if (isLocal) {
      if (status === 'playing') get().addNotification(`${user.nickname} deu play`)
      if (status === 'paused') get().addNotification(`${user.nickname} pausou`)
      // Broadcast for instant sync with other clients
      channel?.send({ type: 'broadcast', event: 'playback', payload: { status, time, updatedBy: user.id } })
      // Persist for late joiners
      supabase.from('playback_state').upsert({
        room_id: roomId,
        status,
        time,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }).then()
    }
  },

  addNotification: (text) => {
    const id = generateId()
    set((state) => ({ notifications: [...state.notifications, { id, text }] }))
    setTimeout(() => {
      set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }))
    }, 3000)
  },
}))
