"use client";

import { memo, type ReactNode } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { ExternalLink } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { Citation } from "@/lib/stream";

interface MarkdownProps {
  text: string;
  citations?: Citation[];
}

/**
 * Streaming-friendly markdown renderer used in chat bubbles.
 *
 * Differences from a stock react-markdown setup:
 *  - GitHub-flavoured tables / strikethrough / task lists.
 *  - External links open in a new tab.
 *  - "[N]" markers in the body get wrapped in a hoverable citation chip when a
 *    matching citation is in scope.
 */
function MarkdownInner({ text, citations = [] }: MarkdownProps) {
  const components: Components = {
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="ek-text-secondary underline decoration-dotted hover:decoration-solid"
        {...props}
      >
        {children}
      </a>
    ),
    p: ({ children }) => <p>{renderWithCitations(children, citations)}</p>,
    li: ({ children }) => <li>{renderWithCitations(children, citations)}</li>,
    td: ({ children }) => <td>{renderWithCitations(children, citations)}</td>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="text-left font-bold border-b ek-border px-2 py-1 ek-text-brand">{children}</th>
    ),
    code: ({ children }) => (
      <code className="rounded bg-brand-light px-1 py-0.5 text-xs">{children}</code>
    ),
    h1: ({ children }) => <h2 className="text-lg font-bold ek-text-brand mt-2">{children}</h2>,
    h2: ({ children }) => <h3 className="text-base font-bold ek-text-brand mt-2">{children}</h3>,
    h3: ({ children }) => <h4 className="text-sm font-bold ek-text-brand mt-2">{children}</h4>,
  };
  return (
    <div className="ek-markdown space-y-2 leading-relaxed text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text || " "}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownInner);

function renderWithCitations(node: ReactNode, citations: Citation[]): ReactNode {
  if (!citations.length) return node;
  return mapText(node, (text) => substituteCitations(text, citations));
}

function mapText(node: ReactNode, f: (s: string) => ReactNode): ReactNode {
  if (typeof node === "string") return f(node);
  if (Array.isArray(node)) return node.map((child, idx) => <span key={idx}>{mapText(child, f)}</span>);
  return node;
}

function substituteCitations(text: string, citations: Citation[]): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  const re = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const marker = Number(m[1]);
    const citation = citations.find((c) => c.marker === marker);
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <CitationChip key={`${m.index}-${marker}`} marker={marker} citation={citation}>
        [{marker}]
      </CitationChip>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? <>{parts}</> : text;
}

function CitationChip({
  marker,
  citation,
  children,
}: {
  marker: number;
  citation?: Citation;
  children: ReactNode;
}) {
  if (!citation) return <span className="text-xs ek-text-muted">{children}</span>;
  return (
    <HoverCardPrimitive.Root openDelay={120} closeDelay={80}>
      <HoverCardPrimitive.Trigger asChild>
        <a
          href={citation.source_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Citimi ${marker}: ${citation.service_id}`}
          className="inline-flex items-center align-baseline rounded-full bg-brand-light ek-text-brand text-[10px] font-bold px-1.5 py-0.5 ml-0.5 hover:bg-brand-soft transition-colors no-underline"
        >
          {children}
        </a>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 w-80 ek-glass-card p-3 text-xs space-y-2 ek-fade-up"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold ek-text-brand">
              [{marker}] {citation.service_id || "burim"}
            </span>
            {citation.language && (
              <span className="uppercase text-[10px] ek-text-muted">{citation.language}</span>
            )}
          </div>
          {citation.snippet && (
            <p className="ek-text-muted line-clamp-4 leading-snug">{citation.snippet}</p>
          )}
          {citation.source_url && (
            <a
              href={citation.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] ek-text-secondary hover:underline break-all"
            >
              {citation.source_url}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          )}
          <HoverCardPrimitive.Arrow className="fill-white" />
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
