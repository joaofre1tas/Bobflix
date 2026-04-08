import { createStore } from './main'

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
  setVideoUrl: (url: string) => void
  sendMessage: (text: string) => void
  sendReaction: (emoji: string) => void
  syncPlayback: (status: PlaybackState['status'], time: number, isLocal: boolean) => void
  addNotification: (text: string) => void
  // Mock methods for simulation
  _simulateRemoteAction: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export const useRoomStore = createStore<RoomState>((set, get) => ({
  currentUser: null,
  roomId: null,
  participants: [],
  messages: [],
  videoUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Default Lofi Girl
  playback: { status: 'unstarted', time: 0, updatedBy: '' },
  reactions: [],
  notifications: [],

  setCurrentUser: (nickname) => {
    set((state) => ({
      currentUser: { id: generateId(), nickname },
    }))
  },

  joinRoom: (roomId) => {
    const user = get().currentUser
    if (!user) return

    set(() => ({
      roomId,
      participants: [{ id: user.id, nickname: user.nickname, state: 'ready' }],
      messages: [],
      reactions: [],
      notifications: [],
    }))

    // Start simulation when joining
    get()._simulateRemoteAction()
  },

  setVideoUrl: (url) => {
    set(() => ({
      videoUrl: url,
      playback: { status: 'unstarted', time: 0, updatedBy: get().currentUser?.id || '' },
    }))
    get().addNotification(`${get().currentUser?.nickname} alterou o vídeo`)
  },

  sendMessage: (text) => {
    const user = get().currentUser
    if (!user) return
    const newMsg: Message = {
      id: generateId(),
      senderId: user.id,
      senderName: user.nickname,
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    set((state) => ({ messages: [...state.messages, newMsg] }))
  },

  sendReaction: (emoji) => {
    const user = get().currentUser
    if (!user) return
    const reaction: Reaction = {
      id: generateId(),
      emoji,
      userId: user.id,
      xOffset: Math.random() * 40 - 20,
    }
    set((state) => ({ reactions: [...state.reactions, reaction] }))

    // Auto remove reaction after animation
    setTimeout(() => {
      set((state) => ({ reactions: state.reactions.filter((r) => r.id !== reaction.id) }))
    }, 2000)
  },

  syncPlayback: (status, time, isLocal) => {
    const user = get().currentUser
    if (!user) return

    const currentState = get().playback
    // Prevent redundant syncs
    if (currentState.status === status && Math.abs(currentState.time - time) < 2) return

    set(() => ({
      playback: { status, time, updatedBy: isLocal ? user.id : 'remote' },
    }))

    if (isLocal) {
      if (status === 'playing') get().addNotification(`${user.nickname} deu play`)
      if (status === 'paused') get().addNotification(`${user.nickname} pausou`)
    }
  },

  addNotification: (text) => {
    const id = generateId()
    set((state) => ({ notifications: [...state.notifications, { id, text }] }))
    setTimeout(() => {
      set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }))
    }, 3000)
  },

  // --- MOCK SIMULATION TO MAKE APP FEEL ALIVE ---
  _simulateRemoteAction: () => {
    let mockInterval: any

    const mockUsers = [
      { id: 'u1', nickname: 'Ana', state: 'ready' as const },
      { id: 'u2', nickname: 'João', state: 'ready' as const },
    ]

    setTimeout(() => {
      // Ana joins
      set((state) => ({ participants: [...state.participants, mockUsers[0]] }))
      get().addNotification('Ana entrou na sala')

      setTimeout(() => {
        // Ana says hi
        const msg: Message = {
          id: generateId(),
          senderId: 'u1',
          senderName: 'Ana',
          text: 'Oie! Cheguei 🍿',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }
        set((state) => ({ messages: [...state.messages, msg] }))
      }, 3000)

      setTimeout(() => {
        // João joins
        set((state) => ({ participants: [...state.participants, mockUsers[1]] }))
        get().addNotification('João entrou na sala')
      }, 8000)

      // Random remote reactions
      mockInterval = setInterval(() => {
        if (Math.random() > 0.7) {
          const emojis = ['👍', '❤️', '😂', '😮']
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
          const reaction: Reaction = {
            id: generateId(),
            emoji: randomEmoji,
            userId: mockUsers[0].id,
            xOffset: Math.random() * 40 - 20,
          }
          set((state) => ({ reactions: [...state.reactions, reaction] }))
          setTimeout(() => {
            set((state) => ({ reactions: state.reactions.filter((r) => r.id !== reaction.id) }))
          }, 2000)
        }
      }, 5000)
    }, 2000)

    // Cleanup not fully implemented for brevity, but interval runs in background
  },
}))
