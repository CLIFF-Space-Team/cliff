// CLIFF 3D Solar System - Test Setup
// Comprehensive browser API mocks for Three.js and WebGL testing

import { vi, expect } from 'vitest'
import { TextEncoder, TextDecoder } from 'util'

// ==============================================================================
// GLOBAL BROWSER API MOCKS
// ==============================================================================

// Text encoding/decoding - Fix TypeScript compatibility
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as any
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as any
}

// Performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  navigation: {},
  timing: {}
} as any

// Animation frame APIs
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(callback, 16) // 60fps simulation
  return 1
})

global.cancelAnimationFrame = vi.fn()

// Resize Observer
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Intersection Observer
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}))

// ==============================================================================
// WEBGL AND CANVAS MOCKS
// ==============================================================================

// WebGL Context Mock
const createWebGLContextMock = () => ({
  // Context properties
  canvas: null,
  drawingBufferWidth: 1024,
  drawingBufferHeight: 768,
  
  // Extensions
  getExtension: vi.fn((name: string) => {
    if (name === 'WEBGL_debug_renderer_info') return { UNMASKED_RENDERER_WEBGL: 37446 }
    if (name === 'OES_texture_float') return {}
    if (name === 'OES_texture_half_float') return {}
    if (name === 'WEBGL_depth_texture') return {}
    if (name === 'EXT_texture_filter_anisotropic') return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 34047 }
    return null
  }),
  getSupportedExtensions: vi.fn(() => [
    'WEBGL_debug_renderer_info',
    'OES_texture_float',
    'OES_texture_half_float',
    'WEBGL_depth_texture',
    'EXT_texture_filter_anisotropic'
  ]),
  
  // Parameters
  getParameter: vi.fn((param: number) => {
    switch (param) {
      case 7936: return 'WebKit WebGL'  // RENDERER
      case 7937: return 'WebGL 1.0'     // VERSION
      case 37446: return 'Mock Renderer' // UNMASKED_RENDERER_WEBGL
      case 3379: return 16384           // MAX_TEXTURE_SIZE
      case 34921: return 16             // MAX_CUBE_MAP_TEXTURE_SIZE
      case 35661: return 32             // MAX_VERTEX_TEXTURE_IMAGE_UNITS
      case 34930: return 16             // MAX_TEXTURE_IMAGE_UNITS
      case 3386: return [4096, 4096]    // MAX_VIEWPORT_DIMS
      default: return 0
    }
  }),
  
  // Shaders
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  deleteShader: vi.fn(),
  
  // Programs
  createProgram: vi.fn(() => ({})),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(() => true),
  getProgramInfoLog: vi.fn(() => ''),
  useProgram: vi.fn(),
  deleteProgram: vi.fn(),
  
  // Attributes and Uniforms
  getAttribLocation: vi.fn(() => 0),
  getUniformLocation: vi.fn(() => ({})),
  enableVertexAttribArray: vi.fn(),
  disableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniform1i: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  
  // Buffers
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  deleteBuffer: vi.fn(),
  
  // Textures
  createTexture: vi.fn(() => ({})),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  generateMipmap: vi.fn(),
  activeTexture: vi.fn(),
  deleteTexture: vi.fn(),
  
  // Framebuffers
  createFramebuffer: vi.fn(() => ({})),
  bindFramebuffer: vi.fn(),
  framebufferTexture2D: vi.fn(),
  createRenderbuffer: vi.fn(() => ({})),
  bindRenderbuffer: vi.fn(),
  renderbufferStorage: vi.fn(),
  framebufferRenderbuffer: vi.fn(),
  checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
  deleteFramebuffer: vi.fn(),
  deleteRenderbuffer: vi.fn(),
  
  // Drawing
  viewport: vi.fn(),
  scissor: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  clearDepth: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  depthFunc: vi.fn(),
  depthMask: vi.fn(),
  colorMask: vi.fn(),
  cullFace: vi.fn(),
  frontFace: vi.fn(),
  blendFunc: vi.fn(),
  blendEquation: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  
  // Constants
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  TRIANGLES: 4,
  UNSIGNED_SHORT: 5123,
  FLOAT: 5126,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  TEXTURE_2D: 3553,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  LINEAR: 9729,
  CLAMP_TO_EDGE: 33071,
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  DEPTH_TEST: 2929
})

// Canvas Element Mock
const createCanvasMock = () => ({
  width: 1024,
  height: 768,
  clientWidth: 1024,
  clientHeight: 768,
  
  getContext: vi.fn((contextType: string) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return createWebGLContextMock()
    }
    if (contextType === '2d') {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        fillText: vi.fn(),
        strokeText: vi.fn()
      }
    }
    return null
  }),
  
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    right: 1024,
    bottom: 768,
    width: 1024,
    height: 768,
    x: 0,
    y: 0,
    toJSON: vi.fn()
  })),
  
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  toBlob: vi.fn((callback?: BlobCallback | null) => {
    callback && callback(new Blob())
  }),
  
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  style: {}
})

// Override HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(function(this: HTMLCanvasElement, contextType: string) {
    return createCanvasMock().getContext(contextType)
  }),
  writable: true
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => createCanvasMock().getBoundingClientRect()),
  writable: true
})

// ==============================================================================
// IMAGE AND MEDIA MOCKS
// ==============================================================================

// Image Mock
global.Image = class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src: string = ''
  width: number = 512
  height: number = 512
  naturalWidth: number = 512
  naturalHeight: number = 512
  complete: boolean = false
  
  constructor() {
    // Simulate successful image load
    setTimeout(() => {
      this.complete = true
      if (this.onload) {
        this.onload()
      }
    }, 10)
  }
} as any

// HTMLImageElement
global.HTMLImageElement = global.Image as any

// ==============================================================================
// EVENT SYSTEM MOCKS
// ==============================================================================

// EventTarget for TimeSimulationController
const createEventEmitter = () => {
  const listeners: { [key: string]: Function[] } = {}
  
  return {
    on: vi.fn((event: string, callback: Function) => {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(callback)
    }),
    
    off: vi.fn((event: string, callback?: Function) => {
      if (!listeners[event]) return
      if (callback) {
        const index = listeners[event].indexOf(callback)
        if (index > -1) {
          listeners[event].splice(index, 1)
        }
      } else {
        listeners[event] = []
      }
    }),
    
    emit: vi.fn((event: string, ...args: any[]) => {
      if (listeners[event]) {
        listeners[event].forEach(callback => callback(...args))
      }
    }),
    
    addEventListener: vi.fn((event: string, callback: Function) => {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(callback)
    }),
    
    removeEventListener: vi.fn((event: string, callback?: Function) => {
      if (!listeners[event]) return
      if (callback) {
        const index = listeners[event].indexOf(callback)
        if (index > -1) {
          listeners[event].splice(index, 1)
        }
      } else {
        listeners[event] = []
      }
    }),
    
    dispatchEvent: vi.fn((event: Event) => {
      const eventListeners = listeners[event.type] || []
      eventListeners.forEach(callback => callback(event))
      return true
    })
  }
}

// ==============================================================================
// WINDOW AND DOCUMENT MOCKS
// ==============================================================================

// Window properties
Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
  writable: true
})

Object.defineProperty(window, 'innerWidth', {
  value: 1024,
  writable: true
})

Object.defineProperty(window, 'innerHeight', {
  value: 768,
  writable: true
})

// Location mock
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
})

// Document.createElement override
const originalCreateElement = document.createElement.bind(document)
document.createElement = vi.fn((tagName: string) => {
  if (tagName.toLowerCase() === 'canvas') {
    return createCanvasMock() as any
  }
  return originalCreateElement(tagName)
}) as any

// ==============================================================================
// ZUSTAND STORE MOCK UTILITIES
// ==============================================================================

export const createMockStore = <T>(initialState: T) => {
  let state = initialState
  const listeners = new Set<(state: T) => void>()
  
  return {
    getState: () => state,
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => {
      const updates = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...updates }
      listeners.forEach(listener => listener(state))
    },
    subscribe: (listener: (state: T) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    destroy: () => {
      listeners.clear()
    }
  }
}

// ==============================================================================
// TEST UTILITIES
// ==============================================================================

export const testUtils = {
  createEventEmitter,
  createWebGLContextMock,
  createCanvasMock,
  createMockStore,
  
  // Time simulation utilities
  mockTimeSimulation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    setTimeScale: vi.fn(),
    jumpToDate: vi.fn(),
    getState: vi.fn(() => ({
      isPlaying: false,
      timeScale: 1,
      currentTime: Date.now(),
      targetTime: Date.now()
    })),
    dispose: vi.fn(),
    ...createEventEmitter()
  }),
  
  // Three.js utilities
  mockThreeScene: () => ({
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    children: [],
    traverse: vi.fn(),
    getObjectByName: vi.fn()
  }),
  
  // Performance monitoring
  mockPerformanceMonitor: () => ({
    startFrame: vi.fn(),
    endFrame: vi.fn(),
    getMetrics: vi.fn(() => ({
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 100,
      drawCalls: 10
    }))
  })
}

// Console override for cleaner test output
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

console.warn = vi.fn((...args: any[]) => {
  const message = args.join(' ')
  // Suppress Three.js warnings in tests
  if (message.includes('THREE.') || message.includes('WebGL')) {
    return
  }
  originalConsoleWarn(...args)
})

console.error = vi.fn((...args: any[]) => {
  const message = args.join(' ')
  // Suppress Three.js errors in tests
  if (message.includes('THREE.') || message.includes('WebGL')) {
    return
  }
  originalConsoleError(...args)
})

console.log('🧪 CLIFF Test Setup initialized - minimal version')
console.log('✅ Browser API mocks ready')