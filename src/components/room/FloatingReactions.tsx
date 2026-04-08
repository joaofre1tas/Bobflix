import { useRoomStore } from '@/stores/useRoomStore'

export default function FloatingReactions() {
  const [store] = useRoomStore()

  return (
    <div className="absolute inset-x-0 bottom-24 h-40 pointer-events-none overflow-hidden z-20 flex justify-center">
      {store.reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-0 text-4xl animate-float-emoji"
          style={{ transform: `translateX(${r.xOffset}px)` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  )
}
