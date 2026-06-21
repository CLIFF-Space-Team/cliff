/**
 * Demo Tour event bus — sayfa-içi "göstermek" eylemleri için tip-güvenli kanal.
 *
 * DemoTour bu kanaldan event yayar; sayfalar (CityStatusCard, ImpactPage,
 * ZamanMakinesiPage, vb.) `useDemoAction` ile abone olup ekran içi
 * etkileşimleri otomatik tetikler.
 */

export type DemoActionPayload =
  | { type: 'turkey:cycle-cities'; cities: number[]; intervalMs: number }
  | { type: 'turkey:cycle-stop' }
  | { type: 'impact:set-view'; view: 'three' | 'map' }
  | { type: 'impact:focus-popup'; index: number }
  | { type: 'zaman-makinesi:set-year'; year: number; pauseAfter: boolean }
  | { type: 'zaman-makinesi:play' }
  | { type: 'galeri:cycle-categories'; intervalMs: number }
  | { type: 'galeri:cycle-stop' }
  | { type: 'dashboard:focus-top-threat' }
  | { type: 'landing:focus-qr' }
  | { type: 'celyabinsk:restart-timeline' }
  /** Bir DOM elementini vurgula — etrafına spotlight + label + opsiyonel zoom. */
  | {
      type: 'spotlight';
      selector: string;
      label?: string;
      /** 1.0 = yok, 1.05-1.2 = yumuşak zoom-in. */
      zoom?: number;
    }
  /** Önceki spotlight'ı temizle. */
  | { type: 'spotlight-clear' }
  /** Belirli noktaya sahte fare imleci hareketi. */
  | { type: 'point-and-click'; selector: string; clickAfterMs?: number };

const EVENT_NAME = 'cliff:demo:action';

export function dispatchDemoAction(payload: DemoActionPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
}

export function subscribeDemoAction(
  handler: (payload: DemoActionPayload) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (evt: Event) => {
    const ce = evt as CustomEvent<DemoActionPayload>;
    handler(ce.detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
