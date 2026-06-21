'use client';

import { Sparkles } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiExplanationProps {
  text: string;
  model?: string;
}

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-text-primary last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="not-italic text-text-secondary">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-1 text-sm text-text-primary marker:text-text-tertiary last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1 text-sm text-text-primary marker:text-text-tertiary last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-1 text-sm font-semibold text-text-primary">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-1 text-sm font-semibold text-text-primary">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 text-sm font-semibold text-text-primary">{children}</h3>
  ),
  code: ({ children }) => (
    <code className="rounded bg-surface-2 px-1 py-0.5 font-mono-tnum text-[12px] text-text-primary">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-text-primary underline decoration-white/30 underline-offset-2 hover:decoration-white/60"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-2 border-white/[0.06]" />,
};

export function AiExplanation({ text, model }: AiExplanationProps) {
  return (
    <div className="relative rounded-md border border-white/[0.06] bg-surface-1 p-3">
      <div className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
      <div className="mb-2 flex items-center justify-between border-b border-white/[0.06] pb-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
          <Sparkles className="size-3" />
          ai açıklama
        </div>
        {model && (
          <div className="font-mono-tnum text-[10px] text-text-tertiary">{model}</div>
        )}
      </div>
      <div className="pl-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
