'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MemeComposer } from '@/services/MemeComposer'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'

export default function ImpactMemePage() {
  const params = useParams()
  const shareId = params?.shareId as string
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (shareId) {
      const memeData = MemeComposer.getMemeByShareId(shareId)
      setImageUrl(memeData)
      setLoading(false)
    }
  }, [shareId])

  const handleDownload = () => {
    if (imageUrl) {
      MemeComposer.downloadImage(imageUrl, `asteroid-impact-${shareId}.png`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pure-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cliff-white mx-auto mb-4"></div>
          <p className="text-cliff-white">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="min-h-screen bg-pure-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Meme Bulunamadı</h1>
          <p className="text-cliff-light-gray mb-6">
            Bu paylaşım linki geçersiz veya süresi dolmuş olabilir.
          </p>
          <Link href="/impact-simulator">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Simülatöre Dön
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pure-black flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/impact-simulator">
            <Button variant="ghost" className="text-cliff-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Simülatöre Dön
            </Button>
          </Link>
          <Button onClick={handleDownload} className="bg-gradient-to-r from-red-600 to-orange-600">
            <Download className="mr-2 h-4 w-4" />
            İndir
          </Button>
        </div>

        <div className="bg-pure-black/50 border border-cliff-white/10 rounded-lg overflow-hidden">
          <img 
            src={imageUrl} 
            alt="Asteroid Impact Meme" 
            className="w-full h-auto"
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-cliff-light-gray text-sm">
            CLIFF Asteroid Impact Simulator ile oluşturuldu
          </p>
          <p className="text-cliff-light-gray text-xs mt-2">
            Kendi asteroid simülasyonunuzu oluşturmak için yukarıdaki butona tıklayın
          </p>
        </div>
      </div>
    </div>
  )
}

