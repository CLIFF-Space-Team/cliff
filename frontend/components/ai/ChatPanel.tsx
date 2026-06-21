'use client';

import { useQuery } from '@tanstack/react-query';
import { Bot, Globe, Loader2, MessageSquare, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AiExplanation } from '@/components/asteroid/AiExplanation';
import { Button, Surface } from '@/components/ui';
import { useChat } from '@/hooks/useChat';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface AiModelsResponse {
  default: string;
  available: string[];
  configured: boolean;
  capabilities: { web_search: boolean; streaming: boolean };
}

const STARTER_PROMPTS = [
  'Apophis 2029 yaklaşması ne kadar tehlikeli?',
  '20 metrelik bir asteroid Türkiye\'ye düşse ne olur?',
  'Hayabusa-2 ile OSIRIS-REx arasındaki fark ne?',
  'Tunguska olayını anlat',
  'PHA tanımı nedir?',
  'NEO ve asteroid farkı?',
];

/**
 * Floating chat assistant. Stays minimized as a pill in the bottom-right
 * corner of the dashboard; expands into a tall drawer on click. Streams
 * tokens from the backend `/ai/chat` SSE endpoint and surfaces upstream
 * citations whenever the model issued a live web search.
 */
export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, streaming, send, cancel, reset, error } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull the active model + capability flags so the header can label the
  // assistant honestly (no hard-coded "gpt-5.5" lying when we're on Grok).
  const modelsQuery = useQuery({
    queryKey: ['ai', 'models'],
    queryFn: () => api.get<AiModelsResponse>('/api/v1/ai/models'),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const modelLabel = modelsQuery.data?.default ?? 'AI';
  const webSearchOn = modelsQuery.data?.capabilities?.web_search ?? false;

  // Auto-scroll on new tokens.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    void send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] right-3 z-30 flex items-center gap-2 rounded-full border border-white/[0.12] bg-surface-2/90 px-3 py-2 text-[12px] font-semibold text-text-primary shadow-lg backdrop-blur transition-colors hover:bg-surface-3 sm:right-4 md:bottom-4"
        aria-label="AI sohbeti aç"
      >
        <MessageSquare className="size-4" />
        <span>Soru Sor</span>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
          AI
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-x-2 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] top-2 z-40 flex flex-col sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:h-[min(640px,80vh)] sm:w-[min(420px,calc(100vw-2rem))] md:bottom-4">
      <Surface
        elevation={3}
        glass
        className="flex h-full flex-col overflow-hidden border-white/[0.12]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded bg-surface-2">
              <Bot className="size-4 text-text-primary" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-text-primary">CLIFF AI</div>
              <div className="flex items-center gap-1 font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
                <span>{modelLabel}</span>
                {webSearchOn && (
                  <>
                    <span className="text-text-tertiary/60">·</span>
                    <span className="flex items-center gap-0.5 text-text-secondary">
                      <Globe className="size-2.5" />
                      web search
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={reset}
                aria-label="Sohbeti temizle"
                disabled={streaming}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Kapat"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
        >
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                <Sparkles className="size-3" />
                başlangıç soruları
              </div>
              <div className="grid gap-1.5">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInput('');
                      void send(prompt);
                    }}
                    disabled={streaming}
                    className="rounded border border-white/[0.06] bg-surface-2/60 p-2 text-left text-[12px] text-text-secondary transition-colors hover:border-white/[0.18] hover:bg-surface-2 hover:text-text-primary disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-tertiary">
                NEO&apos;lar, gezegen savunması, NASA misyonları, çarpma fiziği ve
                Türkiye gözlem programları hakkında soru sorabilirsiniz.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              citations={msg.citations}
            />
          ))}
          {error && (
            <div className="rounded border border-threat-critical/40 bg-threat-critical/10 p-2 text-[11px] text-threat-critical">
              {error}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.08] p-2">
          <div className="flex items-end gap-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bir şey sor… (Enter gönderir, Shift+Enter satır)"
              rows={1}
              className="scrollbar-thin max-h-[120px] min-h-[36px] flex-1 resize-none rounded border border-white/[0.08] bg-surface-2 px-2 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-white/[0.24] focus:outline-none"
              disabled={streaming}
            />
            {streaming ? (
              <Button variant="outline" size="icon" onClick={cancel} aria-label="Durdur">
                <Loader2 className="size-4 animate-spin" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Gönder"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
}

function ChatMessage({
  role,
  content,
  citations,
}: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: string[];
}) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-[12px] leading-relaxed',
          isUser
            ? 'bg-surface-3 text-text-primary'
            : 'bg-surface-1 text-text-primary',
        )}
      >
        {role === 'assistant' && content ? (
          <AiExplanation text={content} />
        ) : (
          <p className="whitespace-pre-line">{content || '…'}</p>
        )}
        {role === 'assistant' && citations && citations.length > 0 && (
          <CitationList urls={citations} />
        )}
      </div>
    </div>
  );
}

function CitationList({ urls }: { urls: string[] }) {
  return (
    <div className="mt-2 border-t border-white/[0.06] pt-2">
      <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        <Globe className="size-2.5" />
        kaynaklar · {urls.length}
      </div>
      <ol className="space-y-0.5 text-[10px]">
        {urls.map((url, i) => {
          let host = url;
          try {
            host = new URL(url).hostname.replace(/^www\./, '');
          } catch {
            // leave host = url for non-URLs
          }
          return (
            <li key={`${url}-${i}`} className="flex items-start gap-1.5">
              <span className="font-mono-tnum text-text-tertiary">[{i + 1}]</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
                title={url}
              >
                {host}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
