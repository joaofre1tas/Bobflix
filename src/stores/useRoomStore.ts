import { createStore } from './main'
import { supabase } from '@/lib/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type User = {
  id: string
  nickname: string
  avatarUrl?: string | null
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

export type QueueItem = {
  id: string
  videoUrl: string
  videoTitle: string
  position: number
  addedBy: string | null
  played: boolean
}

interface RoomState {
  currentUser: { id: string; nickname: string; avatarUrl?: string | null } | null
  roomId: string | null
  participants: User[]
  messages: Message[]
  videoUrl: string
  playback: PlaybackState
  reactions: Reaction[]
  notifications: Notification[]
  typingUsers: string[]
  queue: QueueItem[]
  setCurrentUser: (id: string, nickname: string, avatarUrl?: string | null) => void
  createRoom: (roomId: string, password?: string) => void
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  setVideoUrl: (url: string) => void
  sendMessage: (text: string) => void
  sendReaction: (emoji: string) => void
  syncPlayback: (status: PlaybackState['status'], time: number, isLocal: boolean) => void
  addNotification: (text: string) => void
  sendTyping: () => void
  addToQueue: (videoUrl: string, videoTitle?: string) => void
  removeFromQueue: (itemId: string) => void
  playNext: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

let channel: RealtimeChannel | null = null
let typingTimeouts: Record<string, ReturnType<typeof setTimeout>> = {}
let lastRecordedVideo = ''

export const useRoomStore = createStore<RoomState>((set, get) => ({
  currentUser: null,
  roomId: null,
  participants: [],
  messages: [],
  videoUrl: '',
  playback: { status: 'unstarted', time: 0, updatedBy: '' },
  reactions: [],
  notifications: [],
  typingUsers: [],
  queue: [],

  setCurrentUser: (id, nickname, avatarUrl) => {
    set(() => ({ currentUser: { id, nickname, avatarUrl } }))
  },

  createRoom: async (roomId: string, password?: string) => {
    await supabase.from('rooms').insert({
      id: roomId,
      video_url: '',
      is_private: !!password,
      password: password || null,
    })
    await get().joinRoom(roomId)
  },

  joinRoom: async (roomId: string) => {
    const user = get().currentUser
    if (!user) return

    if (channel) {
      await supabase.removeChannel(channel)
      channel = null
    }
    typingTimeouts = {}

    await supabase.from('rooms').upsert(
      { id: roomId, video_url: '' },
      { onConflict: 'id', ignoreDuplicates: true },
    )

    const [roomRes, msgsRes, pbRes, queueRes] = await Promise.all([
      supabase.from('rooms').select('video_url').eq('id', roomId).single(),
      supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(100),
      supabase.from('playback_state').select('*').eq('room_id', roomId).single(),
      supabase.from('room_queue').select('*').eq('room_id', roomId).eq('played', false).order('position', { ascending: true }),
    ])

    const formattedMessages: Message[] = (msgsRes.data || []).map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      text: m.text,
      time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }))

    const formattedQueue: QueueItem[] = (queueRes.data || []).map((q: any) => ({
      id: q.id,
      videoUrl: q.video_url,
      videoTitle: q.video_title,
      position: q.position,
      addedBy: q.added_by,
      played: q.played,
    }))

    set(() => ({
      roomId,
      videoUrl: roomRes.data?.video_url || '',
      messages: formattedMessages,
      playback: pbRes.data
        ? { status: pbRes.data.status, time: pbRes.data.time, updatedBy: pbRes.data.updated_by }
        : { status: 'unstarted' as const, time: 0, updatedBy: '' },
      participants: [],
      reactions: [],
      notifications: [],
      typingUsers: [],
      queue: formattedQueue,
    }))

    channel = supabase.channel(`room:${roomId}`)

    channel.on('presence', { event: 'sync' }, () => {
      const ps = channel!.presenceState<{ user_id: string; nickname: string; avatar_url?: string; state: string }>()
      const users: User[] = []
      for (const key of Object.keys(ps)) {
        for (const p of ps[key]) {
          users.push({ id: p.user_id, nickname: p.nickname, avatarUrl: p.avatar_url, state: (p.state as User['state']) || 'ready' })
        }
      }
      set(() => ({ participants: users }))
    })

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      for (const p of newPresences as any[]) {
        if (p.user_id !== user.id) get().addNotification(`${p.nickname} entrou na sala`)
      }
    })

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const p of leftPresences as any[]) {
        get().addNotification(`${p.nickname} saiu da sala`)
      }
    })

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const m = payload.new as any
        if (m.sender_id === get().currentUser?.id) return
        const msg: Message = {
          id: m.id, senderId: m.sender_id, senderName: m.sender_name, text: m.text,
          time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }
        set((state) => ({ messages: [...state.messages, msg] }))
      },
    )

    channel.on('broadcast', { event: 'playback' }, ({ payload }) => {
      if (payload.updatedBy === get().currentUser?.id) return
      set(() => ({ playback: { status: payload.status, time: payload.time, updatedBy: payload.updatedBy } }))
      if (payload.status === 'playing') get().addNotification('Alguém deu play')
      if (payload.status === 'paused') get().addNotification('Alguém pausou')
    })

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

    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload.userId === get().currentUser?.id) return
      const reaction: Reaction = { id: payload.id, emoji: payload.emoji, userId: payload.userId, xOffset: payload.xOffset }
      set((state) => ({ reactions: [...state.reactions, reaction] }))
      setTimeout(() => {
        set((state) => ({ reactions: state.reactions.filter((r) => r.id !== reaction.id) }))
      }, 2000)
    })

    // Typing indicator
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId === get().currentUser?.id) return
      const name = payload.nickname as string
      set((state) => ({
        typingUsers: state.typingUsers.includes(name) ? state.typingUsers : [...state.typingUsers, name],
      }))
      if (typingTimeouts[name]) clearTimeout(typingTimeouts[name])
      typingTimeouts[name] = setTimeout(() => {
        set((state) => ({ typingUsers: state.typingUsers.filter((n) => n !== name) }))
        delete typingTimeouts[name]
      }, 2500)
    })

    // Queue changes
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_queue', filter: `room_id=eq.${roomId}` },
      async () => {
        const { data } = await supabase.from('room_queue').select('*').eq('room_id', roomId).eq('played', false).order('position', { ascending: true })
        if (data) {
          set(() => ({
            queue: data.map((q: any) => ({
              id: q.id, videoUrl: q.video_url, videoTitle: q.video_title,
              position: q.position, addedBy: q.added_by, played: q.played,
            })),
          }))
        }
      },
    )

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel!.track({ user_id: user.id, nickname: user.nickname, avatar_url: user.avatarUrl || '', state: 'ready' })
      }
    })
  },

  leaveRoom: () => {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
    typingTimeouts = {}
    set(() => ({
      roomId: null,
      participants: [],
      messages: [],
      reactions: [],
      notifications: [],
      typingUsers: [],
      queue: [],
      playback: { status: 'unstarted' as const, time: 0, updatedBy: '' },
    }))
  },

  setVideoUrl: (url) => {
    const roomId = get().roomId
    if (!roomId) return
    lastRecordedVideo = ''
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
      id: generateId(), senderId: user.id, senderName: user.nickname, text,
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
      channel?.send({ type: 'broadcast', event: 'playback', payload: { status, time, updatedBy: user.id } })
      supabase.from('playback_state').upsert({
        room_id: roomId, status, time, updated_by: user.id, updated_at: new Date().toISOString(),
      }).then()

      // Record watch history on first play (skip for guests)
      const isGuest = user.id.startsWith('guest-')
      if (!isGuest && status === 'playing' && get().videoUrl && get().videoUrl !== lastRecordedVideo) {
        lastRecordedVideo = get().videoUrl
        const participants = get().participants.filter((p) => p.id !== user.id)
        const partner = participants.length > 0 ? participants[0] : null
        const videoUrl = get().videoUrl
        supabase.from('watch_history').insert({
          room_id: roomId,
          user_id: user.id,
          video_url: videoUrl,
          video_title: '',
          watched_with: partner?.id || null,
        }).then()
        if (partner) {
          supabase.from('watch_history').insert({
            room_id: roomId,
            user_id: partner.id,
            video_url: videoUrl,
            video_title: '',
            watched_with: user.id,
          }).then()
          // Auto-create partnership (ignore if already exists)
          const [a, b] = [user.id, partner.id].sort()
          supabase.from('partnerships').upsert(
            { user_a: a, user_b: b },
            { onConflict: 'user_a,user_b', ignoreDuplicates: true },
          ).then()
        }
      }
    }
  },

  addNotification: (text) => {
    const id = generateId()
    set((state) => ({ notifications: [...state.notifications, { id, text }] }))
    setTimeout(() => {
      set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }))
    }, 3000)
  },

  sendTyping: () => {
    const user = get().currentUser
    if (!user) return
    channel?.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, nickname: user.nickname } })
  },

  addToQueue: async (videoUrl, videoTitle) => {
    const roomId = get().roomId
    const user = get().currentUser
    if (!roomId) return
    const maxPos = get().queue.reduce((max, q) => Math.max(max, q.position), 0)
    await supabase.from('room_queue').insert({
      room_id: roomId,
      video_url: videoUrl,
      video_title: videoTitle || '',
      position: maxPos + 1,
      added_by: user?.id || null,
    })
  },

  removeFromQueue: async (itemId) => {
    await supabase.from('room_queue').delete().eq('id', itemId)
  },

  playNext: async () => {
    const queue = get().queue
    const roomId = get().roomId
    if (!roomId || queue.length === 0) return
    const next = queue[0]
    await supabase.from('room_queue').update({ played: true }).eq('id', next.id)
    get().setVideoUrl(next.videoUrl)
  },
}))
