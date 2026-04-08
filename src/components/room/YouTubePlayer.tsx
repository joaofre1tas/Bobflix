import { useEffect, useRef, useState } from 'react'
import { useRoomStore } from '@/stores/useRoomStore'
import { Film } from 'lucide-react'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

function extractVideoId(url: string) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  )
  return match ? match[1] : null
}

export default function YouTubePlayer() {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [store] = useRoomStore()
  const [isReady, setIsReady] = useState(false)
  const [ytLoaded, setYtLoaded] = useState(false)

  const videoId = extractVideoId(store.videoUrl)

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtLoaded(true)
      return
    }
    window.onYouTubeIframeAPIReady = () => setYtLoaded(true)
    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script')
      tag.id = 'yt-api-script'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
    }
  }, [])

  useEffect(() => {
    if (!ytLoaded || !videoId || !containerRef.current) return
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
      setIsReady(false)
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => setIsReady(true),
        onStateChange: (event: any) => {
          const state = event.data
          const time = event.target.getCurrentTime()
          if (state === 1) store.syncPlayback('playing', time, true)
          if (state === 2) store.syncPlayback('paused', time, true)
          if (state === 3) store.syncPlayback('buffering', time, true)
        },
      },
    })

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
        setIsReady(false)
      }
    }
  }, [ytLoaded, videoId])

  useEffect(() => {
    if (!isReady || !playerRef.current) return
    const { status, time, updatedBy } = store.playback
    if (updatedBy === store.currentUser?.id) return

    const currentTime = playerRef.current.getCurrentTime() || 0
    const timeDiff = Math.abs(currentTime - time)

    if (status === 'playing') {
      playerRef.current.playVideo()
      if (timeDiff > 2) playerRef.current.seekTo(time, true)
    } else if (status === 'paused') {
      playerRef.current.pauseVideo()
      if (timeDiff > 1) playerRef.current.seekTo(time, true)
    }
  }, [store.playback, isReady])

  if (!videoId) {
    return (
      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 bg-black/5">
        <div className="w-16 h-16 rounded-full bg-bobflix-50 flex items-center justify-center">
          <Film size={32} className="text-bobflix-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-medium text-text-primary">Nenhum vídeo selecionado</p>
          <p className="text-sm text-text-secondary">Cole um link do YouTube no campo acima para começar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
