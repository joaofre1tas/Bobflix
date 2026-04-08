import { useEffect, useRef, useState } from 'react'
import { useRoomStore } from '@/stores/useRoomStore'

// Extend window for YT API
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
  const [store, setStore] = useRoomStore()
  const [isReady, setIsReady] = useState(false)

  // 1. Load YT API Script
  useEffect(() => {
    const loadYT = () => {
      if (window.YT && window.YT.Player) {
        initPlayer()
        return
      }
      window.onYouTubeIframeAPIReady = () => initPlayer()
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script')
        tag.id = 'yt-api-script'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }
    }
    loadYT()

    return () => {
      if (playerRef.current) playerRef.current.destroy()
    }
  }, []) // Empty dependency to load script once

  // 2. Initialize Player
  const initPlayer = () => {
    if (!containerRef.current) return
    const videoId = extractVideoId(store.videoUrl) || 'jfKfPfyJRdk' // default fallback

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => setIsReady(true),
        onStateChange: handlePlayerStateChange,
      },
    })
  }

  // 3. Handle Local Player Events (Sending to Store)
  const handlePlayerStateChange = (event: any) => {
    const state = event.data
    const time = event.target.getCurrentTime()

    // 1: playing, 2: paused, 3: buffering
    if (state === 1) setStore.syncPlayback('playing', time, true)
    if (state === 2) setStore.syncPlayback('paused', time, true)
    if (state === 3) setStore.syncPlayback('buffering', time, true)
  }

  // 4. Listen to Store Changes (Remote Events)
  useEffect(() => {
    if (!isReady || !playerRef.current) return

    const { status, time, updatedBy } = store.playback

    // Ignore updates made by us to avoid echo
    if (updatedBy === store.currentUser?.id) return

    const currentTime = playerRef.current.getCurrentTime() || 0
    const timeDiff = Math.abs(currentTime - time)

    // Sync state
    if (status === 'playing') {
      playerRef.current.playVideo()
      // Snap to sync if far behind/ahead
      if (timeDiff > 2) playerRef.current.seekTo(time, true)
    } else if (status === 'paused') {
      playerRef.current.pauseVideo()
      if (timeDiff > 1) playerRef.current.seekTo(time, true)
    }
  }, [store.playback, isReady])

  // 5. Handle URL changes
  useEffect(() => {
    if (isReady && playerRef.current) {
      const currentUrl = playerRef.current.getVideoUrl()
      const newId = extractVideoId(store.videoUrl)
      if (newId && !currentUrl.includes(newId)) {
        playerRef.current.loadVideoById(newId)
      }
    }
  }, [store.videoUrl, isReady])

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
