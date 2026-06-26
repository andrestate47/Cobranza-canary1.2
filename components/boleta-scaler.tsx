"use client"

import React, { useRef, useState, useEffect } from "react"

interface BoletaScalerProps {
  children: React.ReactNode
}

export default function BoletaScaler({ children }: BoletaScalerProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [wrapperHeight, setWrapperHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    const updateScale = () => {
      if (outerRef.current && contentRef.current) {
        const availableWidth = outerRef.current.clientWidth
        const contentWidth = 800 
        
        if (availableWidth < contentWidth && availableWidth > 0) {
          const newScale = availableWidth / contentWidth
          setScale(newScale)
          setWrapperHeight(contentRef.current.offsetHeight * newScale)
        } else {
          setScale(1)
          setWrapperHeight(contentRef.current.offsetHeight)
        }
      }
    }

    updateScale()
    
    const timeout1 = setTimeout(updateScale, 100)
    const timeout2 = setTimeout(updateScale, 500)
    
    window.addEventListener('resize', updateScale)
    
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
    <div ref={outerRef} className="w-full flex justify-center my-4">
      <div 
        className="relative overflow-hidden"
        style={{ 
          width: scale < 1 ? '100%' : '800px',
          height: wrapperHeight !== 'auto' ? `${wrapperHeight}px` : 'auto', 
          minHeight: '100px' 
        }}
      >
        <div 
          ref={contentRef}
          className="absolute top-0 left-0 w-[800px]"
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
