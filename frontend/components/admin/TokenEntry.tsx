'use client';

import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Button, Surface } from '@/components/ui';
import { useInvalidateAdmin } from '@/hooks/useAdminAnalytics';
import { setAdminToken } from '@/lib/api-client';

interface TokenEntryProps {
  /** Caller's resolved IP — shown so the operator can see why they were
   *  rejected (whitelist mismatch). */
  visitorIp?: string;
}

export function TokenEntry({ visitorIp }: TokenEntryProps) {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const invalidate = useInvalidateAdmin();

  const handle = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setAdminToken(trimmed);
    invalidate();
    // Give whoami a beat to refetch before resetting the spinner.
    setTimeout(() => setSubmitting(false), 600);
  };

  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center p-6">
      <Surface elevation={2} className="w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-amber-500/10">
            <ShieldCheck className="size-4 text-amber-300" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Yönetici Girişi
            </h2>
            <p className="text-[11px] text-text-tertiary">
              Bu sayfa yetkili kullanıcıya özel. Bearer token gir veya beyaz
              listedeki IP üzerinden bağlan.
            </p>
          </div>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-text-tertiary">
          Token
          <div className="mt-1 flex items-center gap-2 rounded-md border border-white/[0.08] bg-surface-2 px-2 py-1.5 focus-within:border-white/[0.24]">
            <KeyRound className="size-3.5 text-text-tertiary" />
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handle();
              }}
              placeholder="ADMIN_TOKEN"
              className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </label>

        <Button
          variant="primary"
          size="sm"
          onClick={handle}
          disabled={submitting || !token.trim()}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <KeyRound className="size-3.5" />
          )}
          Giriş yap
        </Button>

        {visitorIp && (
          <p className="text-center font-mono-tnum text-[10px] text-text-tertiary">
            Senin IP: {visitorIp}
          </p>
        )}
      </Surface>
    </div>
  );
}
