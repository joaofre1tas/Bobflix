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
import { MessageSquare } from 'lucide-react'

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [store] = useRoomStore()
  const { profile } = useAuth()
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [checking, setChecking] = useState(true)

  // Sync auth profile to store
  useEffect(() => {
    if (profile) {
      store.setCurrentUser(profile.id, profile.display_name, profile.avatar_url)
    }
  }, [profile])

  useEffect(() => {
    if (!roomId || !profile) return
    if (store.roomId === roomId) {
      setChecking(false)
      return
    }

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
  }, [roomId, profile, store.roomId])

  useEffect(() => {
    return () => { store.leaveRoom() }
  }, [store.leaveRoom])

  const handlePasswordSubmit = useCallback(async (_nickname: string, password?: string) => {
    if (!roomId) return
    const { data } = await supabase.rpc('verify_room_password', { p_room_id: roomId, p_password: password ?? '' })
    if (!data) {
      setPasswordError(true)
      return
    }
    setPasswordError(false)
    store.joinRoom(roomId)
    setShowPasswordDialog(false)
  }, [roomId, store])

  if (checking) {
    return <div className="flex-1 flex items-center justify-center text-text-secondary">Carregando sala...</div>
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
