'use client';

import dynamic from 'next/dynamic';
import { ArrowLeft, Download, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button, Skeleton } from '@/components/ui';
import { TOUR_DURATION_S } from '@/components/cinematic/CinematicScene';
import { CinematicNeoCard } from '@/components/cinematic/CinematicNeoCard';
import { useTtsAudio } from '@/hooks/useTts';

const CinematicScene = dynamic(
  () =>
    import('@/components/cinematic/CinematicScene').then((m) => ({
      default: m.CinematicScene,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="absolute inset-0" />,
  },
);

/**
 * Sinematik Fly-Through — 30 saniyelik scripted kamera turu.
 *
 * Bağımsız hafif bir 3D sahne (Güneş + Dünya + Ay + iki asteroit + yıldız
 * arka planı). Kamera 7 keyframe arası lerp ile hareket eder, sonsuz döngü.
 * Etkinlikte sosyal medya klipi için "klip kaydet" butonu (canvas → webm).
 */
export default function SinematikPage() {
  const [caption, setCaption] = useState('');
  const [narration, setNarration] = useState('');
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  // Sinematik tur kendi kendine sunum yapar → anlatım VARSAYILAN AÇIK
  // (global tehdit-sesi mute'undan bağımsız). Sağ üstteki butonla kapatılır.
  const [muted, setMuted] = useState(false);

  // Her çekimin anlatımı seslendirilir: caption ekrana, narration sese gider.
  // Tarayıcı Türkçe (tr-TR) TTS fallback'i ile API key gerekmeden konuşur.
  useTtsAudio({
    text: narration,
    enabled: !muted && narration.length > 0,
    voiceSpeed: 1.0,
    volume: 0.85,
  });

  const handleRecord = async () => {
    if (recording) return;
    const canvas = document.querySelector(
      'canvas',
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      toast.error('Canvas bulunamadı');
      return;
    }
    if (typeof canvas.captureStream !== 'function') {
      toast.error('Tarayıcı kayıt desteklemiyor');
      return;
    }

    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 4_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cliff-sinematik-${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setRecording(false);
        toast.success('Klip indirildi');
      };
      recorder.start();
      setRecording(true);
      toast('Kayıt başladı — bir tur (~30 sn)', { duration: 3000 });
      window.setTimeout(() => recorder.stop(), TOUR_DURATION_S * 1000 + 500);
    } catch {
      toast.error('Kayıt başlatılamadı');
      setRecording(false);
    }
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <CinematicScene
        onCaptionChange={(c, p, n) => {
          setCaption(c);
          setProgress(p);
          setNarration(n);
        }}
      />

      {/* Canlı izlenen NEO bilgi kartı — gerçek backend verisi, dönüşümlü */}
      <CinematicNeoCard />

      {/* Üst — geri linki */}
      <div className="absolute left-3 top-3 z-10 sm:left-5 sm:top-5">
        <Button asChild variant="ghost" size="icon" aria-label="Geri">
          <Link href="/" className="bg-surface-1/70 backdrop-blur">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Sağ üst — ses aç/kapat + kayıt butonu */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Anlatımı aç' : 'Anlatımı kapat'}
          title={muted ? 'Anlatımı aç' : 'Anlatımı kapat'}
          className="bg-surface-1/70 backdrop-blur"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRecord}
          disabled={recording}
          className="bg-surface-1/70 backdrop-blur"
        >
          <Download className="size-3.5" />
          {recording ? 'Kaydediliyor…' : 'Klip kaydet'}
        </Button>
      </div>

      {/* Alt — caption + progress */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-6 pt-12 sm:px-8 sm:pb-10">
        <div className="mx-auto w-full max-w-2xl">
          <p className="font-mono-tnum text-[10px] uppercase tracking-[0.3em] text-text-tertiary">
            CLIFF · Sinematik Tur
          </p>
          <h1 className="mt-1 text-base font-semibold text-text-primary sm:text-xl">
            {caption || 'Yükleniyor…'}
          </h1>
          <div className="mt-3 h-px w-full bg-white/[0.1]">
            <div
              className="h-full bg-text-primary transition-all duration-100 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1 font-mono-tnum text-[10px] text-text-tertiary">
            {Math.round(progress * TOUR_DURATION_S)}sn / {TOUR_DURATION_S}sn ·
            sonsuz döngü
          </p>
        </div>
      </div>
    </div>
  );
}
