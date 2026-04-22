import { useEffect, useState } from 'react';
import './DiagnosisResult.css';

interface DiagnosisResultProps {
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
}

/* ── Inline markdown renderer ─────────────────────────────── */
function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="md-bold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="md-inline-code">{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      nodes.push(<h4 key={i} className="md-h3">{line.slice(4)}</h4>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} className="md-h2">{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h2 key={i} className="md-h1">{line.slice(2)}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      nodes.push(
        <div key={i} className="md-bullet">
          <span className="md-bullet-dot">▸</span>
          <span>{inlineMarkdown(line.slice(2))}</span>
        </div>
      );
    } else if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} className="md-code-block">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="md-spacer" />);
    } else {
      nodes.push(<p key={i} className="md-p">{inlineMarkdown(line)}</p>);
    }
    i++;
  }
  return nodes;
}

/* ── Sub-components ───────────────────────────────────────── */
function LoadingDots() {
  return (
    <div className="loading-dots">
      <div className="dots">
        {[0, 1, 2].map((i) => (
          <div key={i} className="dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <span className="loading-label">Reading error context…</span>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export const DiagnosisResult = ({ streamingText, isStreaming, error }: DiagnosisResultProps) => {
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!isStreaming) { setShowCursor(false); return; }
    const t = setInterval(() => setShowCursor((p) => !p), 530);
    return () => clearInterval(t);
  }, [isStreaming]);

  if (error) {
    return (
      <div className="result-card result-card--error">
        <div className="result-card__header">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.2" />
            <path d="M7 4v3.5M7 9.5v.5" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="result-card__title result-card__title--error">Error</span>
        </div>
        <p className="result-card__error-text">{error}</p>
      </div>
    );
  }

  if (isStreaming && !streamingText) return <LoadingDots />;
  if (!streamingText) return null;

  const isMarkdown =
    streamingText.includes('###') ||
    streamingText.includes('**') ||
    streamingText.includes('```');

  return (
    <div className={`result-card${isStreaming ? ' result-card--streaming' : ''}`}>
      <div className="result-card__header">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1.5 2.5h10v8a1 1 0 01-1 1h-8a1 1 0 01-1-1v-8z" stroke="var(--accent)" strokeWidth="1.1" />
          <path d="M4 2.5V1.5M6.5 2.5V1.5M9 2.5V1.5" stroke="var(--accent)" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        <span className="result-card__title">Diagnosis</span>
        {isStreaming && (
          <div className="result-card__live">
            <div className="live-dot" />
            <span className="live-label">live</span>
          </div>
        )}
      </div>

      <div className="result-card__body">
        {isMarkdown ? (
          <div>
            {renderMarkdown(streamingText)}
            {isStreaming && showCursor && <span className="streaming-cursor">▊</span>}
          </div>
        ) : (
          <pre className="result-card__plain">
            {streamingText}
            {isStreaming && showCursor && <span className="streaming-cursor">▊</span>}
          </pre>
        )}
      </div>
    </div>
  );
};
