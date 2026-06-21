'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui';
import { api } from '@/lib/api-client';
import {
  formatDiameter,
  formatDistanceKm,
  formatScore,
  formatTimestamp,
  formatVelocity,
} from '@/lib/format';
import type { HybridAnalysis, RiskRecord } from '@/lib/api-types';

interface PdfExportButtonProps {
  neoId: string;
  record: RiskRecord | null | undefined;
  analysis: HybridAnalysis | null | undefined;
  language?: 'tr' | 'en';
}

/**
 * One-page CLIFF threat briefing as PDF. Built with jsPDF directly so the
 * output is text-searchable (not just a screenshot). Pulls a fresh AI
 * explanation from the backend at click time so the briefing reflects current
 * pipeline state.
 */
export function PdfExportButton({ neoId, record, analysis, language = 'tr' }: PdfExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!record) return;
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');

      // Prefer the shared cache: every visitor sees the same explanation
      // and PDF exports don't burn paid Grok calls. If nothing's cached
      // yet, generate one (the first export pays it, subsequent exports
      // — by anyone — read it back instantly).
      let aiText = '';
      try {
        let cached: { text?: string } | null = null;
        try {
          cached = await api.get<{ text?: string }>(
            `/api/v1/threats/risk/${encodeURIComponent(neoId)}/explanation`,
          );
        } catch {
          cached = null;
        }
        if (cached?.text) {
          aiText = cached.text;
        } else {
          const fresh = await api.post<{ text?: string }>(
            `/api/v1/threats/risk/${encodeURIComponent(neoId)}/explanation`,
            { language, with_search: true },
          );
          aiText = fresh.text ?? '';
        }
      } catch {
        aiText = 'AI açıklaması mevcut değil.';
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, W, H, 'F');

      // Header band
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, W, 70, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('CLIFF', 40, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(160, 160, 160);
      doc.text('Cosmic Level Intelligent Forecast Framework', 40, 54);
      doc.setFontSize(8);
      doc.text(new Date().toISOString().slice(0, 16) + 'Z', W - 40, 38, { align: 'right' });
      doc.text('notcome.app', W - 40, 54, { align: 'right' });

      // Title
      let y = 110;
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(record.name, 40, y);
      y += 22;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(160, 160, 160);
      doc.text(`NEO ${record.neo_id}  ·  ${record.designation ?? '—'}`, 40, y);
      y += 18;

      // Severity tag
      const tone = severityRgb(record.risk_class);
      doc.setFillColor(...tone, 0.18 as unknown as number);
      doc.setDrawColor(...tone);
      doc.roundedRect(40, y, 110, 22, 4, 4, 'FD');
      doc.setTextColor(...tone);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(record.risk_class.toUpperCase(), 95, y + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 220, 220);
      doc.setFontSize(11);
      doc.text(`hibrit skor: ${formatScore(record.hybrid_score)}`, 165, y + 14);
      doc.text(`ML güven: ${(record.ml_confidence * 100).toFixed(0)}%`, 320, y + 14);
      y += 40;

      // Stats grid
      doc.setDrawColor(60, 60, 60);
      doc.line(40, y, W - 40, y);
      y += 16;

      const stats: Array<[string, string]> = [
        ['Çap (max)', formatDiameter(record.diameter_max_km)],
        ['Min mesafe', formatDistanceKm(record.miss_distance_km)],
        ['Hız', formatVelocity(record.relative_velocity_kms)],
        ['Yaklaşma', formatTimestamp(record.next_approach_at)],
        ['Sentry-listed', record.sentry_listed ? 'Evet' : 'Hayır'],
        ['PHA', record.is_potentially_hazardous ? 'Evet' : 'Hayır'],
      ];
      doc.setFontSize(9);
      stats.forEach((kv, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 40 + col * ((W - 80) / 2);
        const cy = y + row * 22;
        doc.setTextColor(140, 140, 140);
        doc.setFont('helvetica', 'normal');
        doc.text(kv[0], cx, cy);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(kv[1], cx + 90, cy);
      });
      y += Math.ceil(stats.length / 2) * 22 + 14;

      // Monte Carlo
      if (analysis?.monte_carlo) {
        doc.setDrawColor(60, 60, 60);
        doc.line(40, y, W - 40, y);
        y += 16;
        doc.setTextColor(180, 180, 180);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Monte Carlo Belirsizlik', 40, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const mc = analysis.monte_carlo;
        const mcLines: Array<[string, string]> = [
          ['p1', formatDistanceKm(mc.p1_km)],
          ['p50', formatDistanceKm(mc.p50_km)],
          ['p99', formatDistanceKm(mc.p99_km)],
          ['Örneklem', mc.samples.toLocaleString()],
        ];
        mcLines.forEach(([k, v], i) => {
          const cx = 40 + (i % 2) * ((W - 80) / 2);
          const cy = y + Math.floor(i / 2) * 18;
          doc.setTextColor(140, 140, 140);
          doc.text(k, cx, cy);
          doc.setTextColor(255, 255, 255);
          doc.text(v, cx + 60, cy);
        });
        y += Math.ceil(mcLines.length / 2) * 18 + 14;
      }

      // AI explanation
      doc.setDrawColor(60, 60, 60);
      doc.line(40, y, W - 40, y);
      y += 16;
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AI Açıklama', 40, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(220, 220, 220);
      const lines = doc.splitTextToSize(stripMarkdown(aiText), W - 80) as string[];
      lines.forEach((ln) => {
        if (y > H - 60) return;
        doc.text(ln, 40, y);
        y += 13;
      });

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Veriler: NASA NeoWs · JPL Sentry · JPL Horizons. CLIFF brifingi operasyonel karar belgesi değildir.',
        40,
        H - 30,
      );

      doc.save(`cliff-${record.neo_id}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handle} disabled={busy || !record} variant="outline" size="sm">
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
      PDF
    </Button>
  );
}

type RGB = [number, number, number];

function severityRgb(severity: RiskRecord['risk_class']): RGB {
  switch (severity) {
    case 'critical':
      return [239, 68, 68];
    case 'high':
      return [249, 115, 22];
    case 'moderate':
      return [234, 179, 8];
    case 'low':
      return [34, 197, 94];
    default:
      return [148, 163, 184];
  }
}

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}
