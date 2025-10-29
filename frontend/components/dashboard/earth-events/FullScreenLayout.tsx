'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
import { gsap } from 'gsap'
import dynamic from 'next/dynamic'

// Dynamic imports for performance
const View3D = dynamic(() => import('./View3D'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-black flex items-center justify-center">
      <div className="text-white/70">3D View Loading...</div>
    </div>
  )
})

const View2D = dynamic(() => import('./View2D'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-black flex items-center justify-center">
      <div className="text-white/70">2D Map Loading...</div>
    </div>
  )
})

const TransitionController = dynamic(() => import('./TransitionController'))

export default function FullScreenLayout() {
  const { viewMode, transitionProgress, setTransitionProgress, setViewMode } = useEarthEventsStore()
  
  // Refs for GSAP animations
  const view3DRef = useRef<HTMLDivElement>(null)
  const view2DRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  // GSAP Timeline for 3D→2D transition
  const performTransition = useCallback((to3D: boolean = false) => {
    if (!view3DRef.current || !view2DRef.current) return

    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    // Set transitioning state
    setViewMode('transitioning')
    setTransitionProgress(0)

    // Create GSAP timeline
    const tl = gsap.timeline({
      onUpdate: () => {
        // Update progress in store
        setTransitionProgress(tl.progress())
      },
      onComplete: () => {
        // Set final view mode
        setViewMode(to3D ? '3D' : '2D')
        setTransitionProgress(1)
      }
    })

    if (to3D) {
      // Cinematic overlay intro
      tl.set(overlayRef.current, { opacity: 0, display: 'block', pointerEvents: 'none' })
      tl.set([ringRef.current, glowRef.current], { opacity: 0, scale: 0.6 })
      tl.to(overlayRef.current, { opacity: 1, duration: 0.15, ease: 'power1.out' }, 0)
      tl.to(glowRef.current, { opacity: 0.5, scale: 1.6, duration: 0.6, ease: 'power2.out' }, 0)
      tl.fromTo(ringRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 3.0, duration: 0.8, ease: 'expo.out' }, 0.05)

      // 2D → 3D transition
      tl.set(view2DRef.current, { opacity: 1, scale: 1, rotationY: 0 })
      tl.set(view3DRef.current, { opacity: 0, scale: 1.2, rotationY: -180 })
      
      // Phase 1: Fade out 2D map with rotation
      tl.to(view2DRef.current, {
        opacity: 0,
        scale: 0.8,
        rotationY: 90,
        duration: 1,
        ease: "power2.inOut"
      })
      
      // Phase 2: Rotate and scale in 3D view
      tl.to(view3DRef.current, {
        opacity: 1,
        scale: 1,
        rotationY: 0,
        duration: 1.2,
        ease: "power2.out"
      }, "-=0.5")
      
      // Phase 3: Final polish with slight bounce
      tl.to(view3DRef.current, {
        scale: 1.05,
        duration: 0.2,
        ease: "power2.out"
      })
      tl.to(view3DRef.current, {
        scale: 1,
        duration: 0.3,
        ease: "bounce.out"
      })
      tl.to([ringRef.current, glowRef.current], { opacity: 0, duration: 0.3, ease: 'power2.in' }, "-=0.2")
      tl.set(overlayRef.current, { opacity: 0, display: 'none' })
      
    } else {
      // 3D → 2D transition (Google Earth style)
      tl.set(overlayRef.current, { opacity: 0, display: 'block', pointerEvents: 'none' })
      tl.set([ringRef.current, glowRef.current], { opacity: 0, scale: 0.6 })
      tl.to(overlayRef.current, { opacity: 1, duration: 0.15, ease: 'power1.out' }, 0)
      tl.to(glowRef.current, { opacity: 0.5, scale: 1.6, duration: 0.6, ease: 'power2.out' }, 0)
      tl.fromTo(ringRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 3.0, duration: 0.8, ease: 'expo.out' }, 0.05)
      tl.set(view3DRef.current, { opacity: 1, scale: 1, rotationY: 0 })
      tl.set(view2DRef.current, { opacity: 0, scale: 1.2, rotationY: 180 })
      
      // Phase 1: Zoom out and rotate 3D view
      tl.to(view3DRef.current, {
        scale: 0.7,
        rotationY: -45,
        duration: 0.8,
        ease: "power2.in"
      })
      
      // Phase 2: Flatten and fade 3D (simulating sphere → flat map)
      tl.to(view3DRef.current, {
        opacity: 0.3,
        scaleY: 0.6, // Flatten vertically
        rotationY: -90,
        duration: 0.8,
        ease: "power2.inOut"
      }, "-=0.2")
      
      // Phase 3: Fade in 2D map with proper projection
      tl.to(view2DRef.current, {
        opacity: 0.5,
        scale: 1.1,
        rotationY: 90,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.4")
      
      // Phase 4: Complete 2D map reveal
      tl.to(view3DRef.current, { opacity: 0, duration: 0.4 })
      tl.to(view2DRef.current, {
        opacity: 1,
        scale: 1,
        rotationY: 0,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.2")
      
      // Phase 5: Final 2D map polish
      tl.to(view2DRef.current, {
        scale: 0.98,
        duration: 0.15,
        ease: "power2.out"
      })
      tl.to(view2DRef.current, {
        scale: 1,
        duration: 0.25,
        ease: "back.out(1.2)"
      })
      tl.to([ringRef.current, glowRef.current], { opacity: 0, duration: 0.3, ease: 'power2.in' }, "-=0.2")
      tl.set(overlayRef.current, { opacity: 0, display: 'none' })
    }

    timelineRef.current = tl
  }, [setTransitionProgress, setViewMode])

  // Listen for view mode changes and trigger transitions
  useEffect(() => {
    // Track previous view mode
    let previousViewMode = viewMode

    const unsubscribe = useEarthEventsStore.subscribe((state) => {
      const currentViewMode = state.viewMode
      
      if (currentViewMode !== 'transitioning' &&
          previousViewMode !== currentViewMode &&
          previousViewMode !== 'transitioning') {
        
        // Auto-trigger transition animation
        if ((currentViewMode === '2D' && previousViewMode === '3D') ||
            (currentViewMode === '3D' && previousViewMode === '2D')) {
          // Delay to allow store update
          setTimeout(() => {
            performTransition(currentViewMode === '3D')
          }, 50)
        }
      }
      
      previousViewMode = currentViewMode
    })

    return unsubscribe
  }, [performTransition])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill()
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
      {/* Background starfield for space feeling */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-black to-black" />
      
      {/* 3D View Container: yalnızca 3D veya transitioning modunda mount edilir */}
      {(viewMode === '3D' || viewMode === 'transitioning') && (
        <div
          ref={view3DRef}
          className="absolute inset-0 transform-gpu"
          style={{
            perspective: '1000px',
            transformStyle: 'preserve-3d',
            opacity: viewMode === '3D' ? 1 : 1,
            pointerEvents: viewMode === '3D' ? 'auto' : 'none',
            zIndex: 10
          }}
        >
          <View3D />
        </div>
      )}
      
      {/* 2D View Container: yalnızca 2D veya transitioning modunda mount edilir */}
      {(viewMode === '2D' || viewMode === 'transitioning') && (
        <div
          ref={view2DRef}
          className="absolute inset-0 transform-gpu"
          style={{
            perspective: '1000px',
            transformStyle: 'preserve-3d',
            opacity: viewMode === '2D' ? 1 : 1,
            pointerEvents: viewMode === '2D' ? 'auto' : 'none',
            zIndex: 10
          }}
        >
          <View2D />
        </div>
      )}

      {/* Cinematic transition overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-40"
        style={{ mixBlendMode: 'screen', display: 'none', opacity: 0 }}
      >
        <div
          ref={glowRef}
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(closest-side, rgba(16,185,129,0.22), rgba(59,130,246,0.18) 40%, transparent 70%)',
            filter: 'blur(12px)'
          }}
        />
        <div
          ref={ringRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 240,
            height: 240,
            border: '2px solid rgba(59,130,246,.85)',
            boxShadow:
              '0 0 40px rgba(16,185,129,.55), inset 0 0 20px rgba(59,130,246,.55)'
          }}
        />
      </div>

      {/* Progress card kaldırıldı; sinematik overlay kullanılacak */}

      {/* Control panels kaldırıldı */}

      {/* Transition Controller - Always visible */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <TransitionController />
      </div>

      {/* Emergency fallback for unsupported features */}
      {typeof window !== 'undefined' && !window.WebGLRenderingContext && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[100]">
          <div className="text-center text-white p-8">
            <h3 className="text-xl font-bold mb-4">WebGL Not Supported</h3>
            <p className="text-white/70 mb-4">
              Your browser doesn't support 3D graphics. Showing 2D map only.
            </p>
            <button
              onClick={() => setViewMode('2D')}
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              Continue with 2D Map
            </button>
          </div>
        </div>
      )}
    </div>
  )
}