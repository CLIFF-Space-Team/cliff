"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/config/api'

export default function NotificationsBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<string[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const url = `${API_BASE_URL}/api/v1/asteroids/events`
    try {
      const es = new EventSource(url)
      esRef.current = es
      es.onmessage = (evt) => {
        try {
          const data = evt.data
          // Basit filtre: kritik/yüksek içeriyorsa say
          if (typeof data === 'string' && /critical|high/i.test(data)) {
            setCount((c) => c + 1)
          }
          setEvents((prev) => [data, ...prev].slice(0, 20))
        } catch (_e) { /* noop */ }
      }
      es.onerror = () => {
        es.close()
      }
    } catch (_e) { /* noop */ }
    return () => { esRef.current?.close() }
  }, [])

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="relative" onClick={() => setOpen((o) => !o)}>
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] px-1 rounded bg-red-500 text-white">
            {count}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-almost-black border border-cliff-light-gray/20 rounded-md p-2 z-10 max-h-64 overflow-y-auto">
          {events.length === 0 && (
            <div className="text-xs text-cliff-light-gray/70 p-2">Bildirim yok</div>
          )}
          {events.map((e, idx) => (
            <div key={idx} className="text-[11px] text-cliff-light-gray/90 border-b border-cliff-light-gray/10 last:border-0 py-1">
              {e}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


