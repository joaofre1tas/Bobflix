import { useState, useRef, useEffect, useCallback } from 'react'
import { useRoomStore } from '@/stores/useRoomStore'
import { Send, Smile } from 'lucide-react'
import VideoQueue from './VideoQueue'

export default function ChatSidebar() {
  const [store] = useRoomStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastTypingRef = useRef(0)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      store.sendMessage(input.trim())
      setInput('')
    }
  }

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    const now = Date.now()
    if (now - lastTypingRef.current > 1000) {
      lastTypingRef.current = now
      store.sendTyping()
    }
  }, [store.sendTyping])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.messages])

  return (
    <div className="flex flex-col h-full">
      {/* Participants */}
      <div className="p-4 border-b border-surface-alt flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
        {store.participants.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1 min-w-[60px]" title={p.nickname}>
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-bobflix-100 text-bobflix-700 font-semibold flex items-center justify-center border border-white">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  p.nickname.substring(0, 2).toUpperCase()
                )}
              </div>
              {p.state === 'buffering' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-400 rounded-full border-2 border-surface animate-pulse" />
              )}
              {p.state === 'ready' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-surface" />
              )}
            </div>
            <span className="text-xs text-text-secondary truncate w-full text-center">{p.nickname}</span>
          </div>
        ))}
      </div>

      <VideoQueue />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {store.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-50 space-y-2">
            <Smile size={32} />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          store.messages.map((msg) => {
            const isMe = msg.senderId === store.currentUser?.id
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium text-text-primary">{msg.senderName}</span>
                  <span className="text-[10px] text-text-secondary">{msg.time}</span>
                </div>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                  isMe ? 'bg-bobflix-500 text-white rounded-br-sm' : 'bg-surface-alt text-text-primary rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-surface border-t border-surface-alt space-y-2 shrink-0">
        {/* Typing indicator */}
        {store.typingUsers.length > 0 && (
          <p className="text-xs text-bobflix-500 pl-2 animate-fade-in">
            {store.typingUsers.join(', ')} {store.typingUsers.length === 1 ? 'está' : 'estão'} digitando...
          </p>
        )}

        <div className="flex gap-2">
          {['👍', '❤️', '😂', '😮'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => store.sendReaction(emoji)}
              className="w-10 h-10 rounded-full bg-surface-alt hover:bg-bobflix-100 flex items-center justify-center text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Digite algo..."
            className="w-full rounded-full bg-surface-alt border-none pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-bobflix-500 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1 w-10 h-10 rounded-full bg-bobflix-500 disabled:bg-surface-alt disabled:text-text-secondary text-white flex items-center justify-center transition-colors"
          >
            <Send size={16} className={input.trim() ? 'ml-0.5' : ''} />
          </button>
        </form>
      </div>
    </div>
  )
}
