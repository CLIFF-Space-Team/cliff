'use client';

import { useCallback, useRef, useState } from 'react';

import { API_BASE_URL } from '@/lib/api-client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Source URLs returned by the AI (only on assistant turns when web search ran). */
  citations?: string[];
}

export interface ChatHookOptions {
  systemPrompt?: string;
  initialMessages?: ChatMessage[];
}

interface SendOptions {
  signal?: AbortSignal;
}

/**
 * Streaming chat hook backed by the backend `/api/v1/ai/chat` SSE endpoint.
 *
 * - Maintains a local conversation log
 * - Streams assistant tokens as they arrive (UI shows them live)
 * - Cancels in-flight streams on `cancel()` or unmount via the AbortController
 * - Falls back to a single error message if the upstream rejects
 */
export function useChat(options: ChatHookOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? []);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setMessages([]);
    setError(null);
  }, [cancel]);

  const send = useCallback(
    async (text: string, opts: SendOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;
      const externalSignal = opts.signal;
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      // Optimistically append the user's message + an empty assistant slot.
      const userMsg: ChatMessage = { role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
      setStreaming(true);

      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            history: history.slice(0, -1), // exclude the current user msg, sent as `query`
            query: trimmed,
            stream: true,
            with_search: true,
            temperature: 0.6,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI server returned ${response.status}`);
        }
        if (!response.body) {
          throw new Error('AI server returned empty body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE chunks separated by \n\n
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith('data:')) continue;
            const dataStr = line.slice('data:'.length).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr) as
                | { event: 'start' }
                | { event: 'delta'; content: string }
                | { event: 'citations'; urls: string[] }
                | { event: 'done' }
                | { event: 'error'; message: string };
              if (parsed.event === 'delta') {
                assistantText += parsed.content;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  next[next.length - 1] = {
                    role: 'assistant',
                    content: assistantText,
                    citations: last?.citations,
                  };
                  return next;
                });
              } else if (parsed.event === 'citations' && Array.isArray(parsed.urls)) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === 'assistant') {
                    next[next.length - 1] = {
                      role: 'assistant',
                      content: last.content,
                      citations: parsed.urls,
                    };
                  }
                  return next;
                });
              } else if (parsed.event === 'error') {
                throw new Error(parsed.message);
              }
            } catch (err) {
              // ignore malformed event chunk (continue streaming)
              if (err instanceof Error && err.message && err.message !== 'JSON.parse error') {
                // surface real errors only
                if (assistantText.length === 0) throw err;
              }
            }
          }
        }

        if (assistantText.length === 0) {
          // Stream produced nothing — likely upstream silent error.
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: 'assistant',
              content: 'Yanıt alınamadı. Lütfen tekrar deneyin.',
            };
            return next;
          });
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // user cancelled — leave messages as-is
        } else {
          const message = err instanceof Error ? err.message : 'Beklenmeyen hata';
          setError(message);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant' && last.content === '') {
              next[next.length - 1] = { role: 'assistant', content: `⚠️ ${message}` };
            }
            return next;
          });
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming],
  );

  return { messages, streaming, error, send, cancel, reset };
}
