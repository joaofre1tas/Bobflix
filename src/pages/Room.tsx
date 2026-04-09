import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '@/stores/useRoomStore'
import { useAuth } from '@/lib/AuthProvider'
import { supabase } from '@/lib/supabaseClient'
import RoomHeader from '@/components/room/RoomHeader'
import YouTubePlayer from '@/components/room/YouTubePlayer'
import ChatSidebar from '@/components/room/ChatSidebar'
import FloatingReactions from '@/components/room/FloatingReactions'
import PlayerNotifications from '@/components/room/PlayerNotifications'
import RoomEntryDialog from '@/components/room/RoomEntryDialog'
import { MessageSquare, LogIn as LogInIcon, UserCircle } from 'lucide-react'

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [store] = useRoomStore()
  const { profile, user, loading: authLoading } = useAuth()
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showGuestDialog, setShowGuestDialog] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [guestName, setGuestName] = useState('')

  // Sync auth profile to store
  useEffect(() => {
    if (profile && !isGuest) {
      store.setCurrentUser(profile.id, profile.display_name, profile.avatar_url)
    }
  }, [profile, isGuest])

  useEffect(() => {
    if (authLoading) return
    if (!roomId) return
    if (store.roomId === roomId) { setChecking(false); return }

    // If logged in, proceed normally
    if (user && profile) {
      const checkRoom = async () => {
        const { data } = await supabase.from('rooms').select('is_private').eq('id', roomId).single()
        setIsPrivate(data?.is_private ?? false)
        if (data?.is_private) {
          setShowPasswordDialog(true)
        } else {
          store.joinRoom(roomId)
        }
        setChecking(false)
      }
      checkRoom()
      return
    }

    // Not logged in: show guest option
    setShowGuestDialog(true)
    setChecking(false)
  }, [roomId, user, profile, store.roomId, authLoading])

  useEffect(() => {
    return () => { store.leaveRoom() }
  }, [store.leaveRoom])

  const handlePasswordSubmit = useCallback(async (_: string, password?: string) => {
    if (!roomId) return
    const { data } = await supabase.rpc('verify_room_password', { p_room_id: roomId, p_password: password ?? '' })
    if (!data) { setPasswordError(true); return }
    setPasswordError(false)
    store.joinRoom(roomId)
    setShowPasswordDialog(false)
  }, [roomId, store])

  const handleGuestEnter = () => {
    if (!guestName.trim() || !roomId) return
    const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`
    store.setCurrentUser(guestId, guestName.trim(), null)
    setIsGuest(true)
    setShowGuestDialog(false)
    store.joinRoom(roomId)
  }

  if (checking || authLoading) {
    return <div className="flex-1 flex items-center justify-center text-text-secondary">Carregando sala...</div>
  }

  // Guest entry dialog
  if (showGuestDialog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-surface rounded-[20px] shadow-elevation p-8 w-full max-w-md mx-4 space-y-6 animate-fade-in-up">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-bobflix-50 text-bobflix-500 flex items-center justify-center mx-auto">
              <UserCircle size={28} />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Entrar na sala {roomId}</h2>
            <p className="text-sm text-text-secondary">Escolha como quer entrar</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/login', { state: { from: `/sala/${roomId}` } })}
              className="w-full rounded-full bg-bobflix-500 hover:bg-bobflix-400 text-white font-medium py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              <LogInIcon size={16} /> Fazer login
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-surface-alt" />
              <span className="text-xs text-text-secondary">ou entre como convidado</span>
              <div className="flex-1 h-px bg-surface-alt" />
            </div>

            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Seu apelido..."
              className="w-full rounded-xl border-2 border-surface-alt bg-surface-alt px-4 py-3 text-sm focus:bg-surface focus:border-bobflix-500 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleGuestEnter()}
            />
            <button
              onClick={handleGuestEnter}
              disabled={!guestName.trim()}
              className="w-full rounded-full border-2 border-surface-alt text-text-primary hover:bg-surface-alt disabled:text-text-secondary disabled:cursor-not-allowed font-medium py-3 transition-colors text-sm"
            >
              Entrar como convidado (sem histórico)
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showPasswordDialog) {
    return (
      <RoomEntryDialog
        roomId={roomId ?? ''}
        isPrivate={true}
        onSubmit={handlePasswordSubmit}
        onCancel={() => navigate('/')}
        passwordError={passwordError}
        hideNickname
      />
    )
  }

  if (!store.roomId) {
    return <div className="flex-1 flex items-center justify-center text-text-secondary">Carregando sala...</div>
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden animate-fade-in">
      <RoomHeader roomId={store.roomId} />
      <div className="flex-1 p-4 lg:p-6 flex flex-col lg:flex-row gap-6 h-[calc(100vh-76px)] overflow-hidden">
        <div className={`flex-1 flex flex-col relative rounded-[20px] overflow-hidden bg-black shadow-subtle ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
          <YouTubePlayer />
          <FloatingReactions />
          <PlayerNotifications />
        </div>
        <div className={`w-full lg:w-[320px] xl:w-[380px] bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 flex flex-col overflow-hidden transition-all duration-300 ${!showMobileChat ? 'hidden lg:flex' : 'flex flex-1 lg:flex-none'}`}>
          <ChatSidebar />
        </div>
        <button
          onClick={() => setShowMobileChat(!showMobileChat)}
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-bobflix-500 text-white p-4 rounded-full shadow-elevation flex items-center justify-center"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
  )
}
