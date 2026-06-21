'use client';

interface CinematicFxProps {
  /** 0..1 timeline cursor. */
  progress: number;
}

// Tam ekran beyaz flaş — çarpma anında (0.62) ekran beyaza patlar, hızla söner.
function flashOpacity(p: number): number {
  if (p < 0.62 || p > 0.73) return 0;
  const t = (p - 0.62) / 0.11;
  // Keskin yükseliş, hızlı düşüş.
  return Math.max(0, 1 - t) * 0.95;
}

// Sıcak çevresel parıltı — ateş topu boyunca ekran kenarları kor gibi yanar.
function heatOpacity(p: number): number {
  if (p < 0.63 || p > 0.95) return 0;
  const t = (p - 0.63) / 0.32;
  return Math.max(0, 1 - t) * 0.55;
}

// Şok dalgası anında hafif kırmızı nabız (basınç cephesi hissi).
function shockPulse(p: number): number {
  if (p < 0.65 || p > 0.8) return 0;
  const t = (p - 0.65) / 0.15;
  return Math.sin(t * Math.PI) * 0.22;
}

/**
 * Ekran-uzayı sinematik katman: çarpmada beyaz flaş + ateş topu boyunca sıcak
 * köşe parıltısı + şok dalgası nabzı. Saf DOM overlay (canvas üstünde),
 * pointer-events yok; progress'e bağlı, ucuz.
 */
export function CinematicFx({ progress }: CinematicFxProps) {
  const flash = flashOpacity(progress);
  const heat = heatOpacity(progress);
  const pulse = shockPulse(progress);

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {/* Sıcak köşe parıltısı — ekran kenarları kor */}
      {heat > 0 && (
        <div
          className="absolute inset-0"
          style={{
            opacity: heat,
            background:
              'radial-gradient(circle at center, rgba(255,90,25,0) 42%, rgba(255,70,18,0.85) 100%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* Şok dalgası kırmızı nabzı */}
      {pulse > 0 && (
        <div
          className="absolute inset-0"
          style={{
            opacity: pulse,
            background:
              'radial-gradient(circle at center, rgba(255,40,30,0) 30%, rgba(255,30,20,0.9) 100%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* Beyaz çarpma flaşı — en üstte */}
      {flash > 0 && (
        <div className="absolute inset-0 bg-white" style={{ opacity: flash }} />
      )}
    </div>
  );
}
