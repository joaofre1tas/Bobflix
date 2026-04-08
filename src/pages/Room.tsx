import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '@/stores/useRoomStore'
import RoomHeader from '@/components/room/RoomHeader'
import YouTubePlayer from '@/components/room/YouTubePlayer'
import ChatSidebar from '@/components/room/ChatSidebar'
import FloatingReactions from '@/components/room/FloatingReactions'
import PlayerNotifications from '@/components/room/PlayerNotifications'
import { MessageSquare } from 'lucide-react'

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [store] = useRoomStore()
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Initialization check
  useEffect(() => {
    if (!store.currentUser) {
      // Small prompt if user bypassed the home screen
      const name = prompt('Bem-vindo! Qual o seu apelido?')
      if (name) {
        store.setCurrentUser(name)
        if (roomId) store.joinRoom(roomId)
      } else {
        navigate('/')
      }
    } else if (roomId && store.roomId !== roomId) {
      store.joinRoom(roomId)
    }
  }, [roomId, store.currentUser, navigate, store.roomId, store.setCurrentUser, store.joinRoom])

  if (!store.currentUser || !store.roomId) {
    return <div className="flex-1 flex items-center justify-center">Carregando sala...</div>
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden animate-fade-in">
      <RoomHeader roomId={store.roomId} />

      <div className="flex-1 p-4 lg:p-6 flex flex-col lg:flex-row gap-6 h-[calc(100vh-76px)] overflow-hidden">
        {/* Left Column: Player Area */}
        <div
          className={`flex-1 flex flex-col relative rounded-[20px] overflow-hidden bg-black shadow-subtle ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}
        >
          <YouTubePlayer />
          <FloatingReactions />
          <PlayerNotifications />
        </div>

        {/* Right Column: Sidebar */}
        <div
          className={`w-full lg:w-[320px] xl:w-[380px] bg-surface rounded-[20px] shadow-subtle border border-surface-alt/50 flex flex-col overflow-hidden transition-all duration-300 ${!showMobileChat ? 'hidden lg:flex' : 'flex flex-1 lg:flex-none'}`}
        >
          <ChatSidebar />
        </div>

        {/* Mobile Toggle Button */}
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
