// src/components/TouchControl.tsx
'use client'

import { useEffect } from 'react'

export function TouchControl() {
  useEffect(() => {
    // ピンチズームを防ぐ
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // タッチイベントのデフォルトの動作を防ぐ
    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // ダブルタップによるズームを防ぐ
    let lastTouchEnd = 0
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouchEnd < 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }

    // イベントリスナーの追加
    document.addEventListener('touchmove', preventZoom, { passive: false })
    document.addEventListener('touchstart', preventDefaultTouch, { passive: false })
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })

    // クリーンアップ
    return () => {
      document.removeEventListener('touchmove', preventZoom)
      document.removeEventListener('touchstart', preventDefaultTouch)
      document.removeEventListener('touchend', preventDoubleTapZoom)
    }
  }, [])

  return null
}