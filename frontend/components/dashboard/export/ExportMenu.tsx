"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { exportToCSV } from '@/lib/api/asteroids'

type Props = {
  filename?: string
  rows: any[]
}

export default function ExportMenu({ filename = 'neos', rows }: Props) {
  const onCSV = () => exportToCSV(`${filename}.csv`, rows)
  const onJSON = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.json`
    link.click()
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" className="text-xs" onClick={onCSV}>CSV</Button>
      <Button size="sm" variant="ghost" className="text-xs" onClick={onJSON}>JSON</Button>
    </div>
  )
}


