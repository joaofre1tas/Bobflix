import { useRoomStore } from '@/stores/useRoomStore'

export default function PlayerNotifications() {
  const [store] = useRoomStore()

  return (
    <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none z-30">
      {store.notifications.map((n) => (
        <div
          key={n.id}
          className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium animate-fade-in-up shadow-lg border border-white/10"
        >
          {n.text}
        </div>
      ))}
    </div>
  )
}
