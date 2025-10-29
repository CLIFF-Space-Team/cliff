'use client'

import React, { useState } from 'react'
import ModernChatInterface from '@/components/chat/ModernChatInterface'

export default function ChatDemoPage() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="min-h-screen bg-pure-black">
      <div className="container mx-auto p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🚀 CLIFF AI Chat Demo</h1>
          <p className="text-white/80 text-lg">Grok AI ile güçlendirilmiş markdown render testi</p>
          <p className="text-white/60 text-sm mt-2">
            Test için: "Dünya hakkında bilgi ver", "Mars görüntüsü oluştur", "Asteroid tehditlerini açıkla"
          </p>
        </div>

        <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h2 className="text-xl font-semibold text-white mb-4">📝 Markdown Özellikler Testi</h2>
          <p className="text-white/80 mb-4">
            Chat arayüzü artık aşağıdaki markdown özelliklerini destekliyor:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="text-white font-semibold mb-2">✅ Desteklenen Özellikler:</h3>
              <ul className="text-white/70 space-y-1">
                <li>• **Kalın yazı** ve *italik*</li>
                <li>• ### Başlıklar (H1-H6)</li>
                <li>• Numaralı ve bullet listeler</li>
                <li>• `Kod blokları` ve satır içi kod</li>
                <li>• Tablolar</li>
                <li>• Bağlantılar</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">🎨 Stil Özellikleri:</h3>
              <ul className="text-white/70 space-y-1">
                <li>• Pure Black tema uyumlu</li>
                <li>• Mobil responsive</li>
                <li>• Syntax highlighting hazır</li>
                <li>• Etkileşimli bileşenler</li>
                <li>• Smooth animasyonlar</li>
              </ul>
            </div>
          </div>
        </div>

        {isOpen && (
          <ModernChatInterface 
            isOpen={isOpen} 
            onClose={() => setIsOpen(false)} 
          />
        )}

        {!isOpen && (
          <div className="text-center">
            <button
              onClick={() => setIsOpen(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors"
            >
              Chat'i Aç
            </button>
          </div>
        )}
      </div>
    </div>
  )
}