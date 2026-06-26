"use client"

import React, { useRef, useState, useEffect } from "react"

interface BoletaScalerProps {
  children: React.ReactNode
}

// Calculate a safe initial zoom based on window width (avoids flash of unstyled content)
function getInitialZoom(): number {
  if (typeof window === 'undefined') return 0.4
  // Estimate: window width minus ~80px for modal padding/margins
  const estimated = (window.innerWidth - 80) / 800
  return Math.min(1, Math.max(0.25, estimated))
}

export default function BoletaScaler({ children }: BoletaScalerProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(getInitialZoom)

  useEffect(() => {
    const updateZoom = () => {
      if (outerRef.current) {
        const availableWidth = outerRef.current.clientWidth
        if (availableWidth > 0 && availableWidth < 800) {
          setZoomLevel(availableWidth / 800)
        } else if (availableWidth >= 800) {
          setZoomLevel(1)
        }
      }
    }

    // Double RAF ensures the modal has fully laid out before we measure
    requestAnimationFrame(() => {
      requestAnimationFrame(updateZoom)
    })

    const t1 = setTimeout(updateZoom, 200)
    const t2 = setTimeout(updateZoom, 600)

    window.addEventListener('resize', updateZoom)

    let observer: ResizeObserver | null = null
    if (outerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateZoom)
      observer.observe(outerRef.current)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', updateZoom)
      if (observer) observer.disconnect()
    }
  }, [])

  return (
    <div ref={outerRef} className="w-full overflow-hidden my-2">
      <div
        style={{
          zoom: zoomLevel,
          width: '800px',
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  )
}
