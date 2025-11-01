'use client'

import React from 'react'
import { ImpactSimulator } from '@/components/ImpactSimulator'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ImpactSimulatorPage() {
  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-cliff-white/10 bg-pure-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-cliff-white hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard'a Dön
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gradient-minimal">Asteroid Çarpma Simülatörü</h1>
              <p className="text-sm text-cliff-light-gray">Gerçek zamanlı etki analizi ve görselleştirme</p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ImpactSimulator />
      </main>
    </div>
  )
}

