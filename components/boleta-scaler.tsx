"use client"

import React, { useRef, useState, useEffect } from "react"

interface BoletaScalerProps {
  children: React.ReactNode
}

export default function BoletaScaler({ children }: BoletaScalerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [wrapperHeight, setWrapperHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.clientWidth
        // BoletaPago is designed to be 800px wide
        const contentWidth = 800 
        
        if (containerWidth < contentWidth && containerWidth > 0) {
          const newScale = containerWidth / contentWidth
          setScale(newScale)
          setWrapperHeight(contentRef.current.offsetHeight * newScale)
        } else {
          setScale(1)
          setWrapperHeight(contentRef.current.offsetHeight)
        }
      }
    }

    updateScale()
    
    // Check multiple times as fonts/images load
    const timeout1 = setTimeout(updateScale, 100)
    const timeout2 = setTimeout(updateScale, 500)
    
    window.addEventListener('resize', updateScale)
    
    // Also use a ResizeObserver on the content to catch height changes
    let observer: ResizeObserver | null = null
    if (contentRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScale)
      observer.observe(contentRef.current)
    }

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      window.removeEventListener('resize', updateScale)
      if (observer) observer.disconnect()
    }
  }, [children])

  return (
    <div 
      ref={containerRef} 
      className="w-full relative overflow-hidden my-4"
      style={{ height: wrapperHeight !== 'auto' ? `${wrapperHeight}px` : 'auto', minHeight: '100px' }}
    >
      <div 
        ref={contentRef}
        className="absolute top-0 left-1/2 w-[800px]"
        style={{ 
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center'
        }}
      >
        {children}
      </div>
    </div>
  )
}
