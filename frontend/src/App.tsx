import { useState } from 'react';
import { ErrorInput } from '@/components/ErrorInput';
import { DiagnosisResult } from '@/components/DiagnosisResult';
import { useAnalyze } from '@/hooks/useAnalyze';
import './App.css';

const EXAMPLES = [
  'insufficient_funds',
  'card_declined',
  'do_not_honor',
  'expired_card',
  'Your card has been declined. Please contact your bank.',
  '{"error":{"code":"card_declined","decline_code":"insufficient_funds"}}',
];

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="rgba(168,85,247,0.15)" />
        <path d="M7 14L11 10L14 13L18 8L21 11" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 20h14" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <circle cx="21" cy="11" r="2" fill="#a855f7" />
      </svg>
      <span className="logo-text">
        PayTrace <span className="logo-accent">AI</span>
      </span>
    </div>
  );
}

function ExamplePill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="example-pill" onClick={onClick}>
      {label.length > 40 ? label.slice(0, 40) + '…' : label}
    </button>
  );
}

function App() {
  const [errorMessage, setErrorMessage] = useState('');
  const { streamingText, isStreaming, error, analyze } = useAnalyze();

  const handleSubmit = async () => {
    if (!errorMessage.trim() || isStreaming) return;
    await analyze(errorMessage);
  };

  const hasResult = streamingText || error || (isStreaming && !streamingText);

  return (
    <div className="app">
      {/* Ambient glow */}
      <div className="ambient-glow" />

      {/* Header */}
      <header className="app-header">
        <Logo />
      </header>

      {/* Main */}
      <main className="app-main">
        <div className="content-wrapper">
          {/* Title */}
          <div className="title-block">
            <h1 className="title">
              Decode payment errors<span className="title-accent"> instantly.</span>
            </h1>
            <p className="subtitle">
              Paste any error code or message — get a plain-English diagnosis with next steps.
            </p>
          </div>

          {/* Input card */}
          <div className="input-card">
            <ErrorInput
              value={errorMessage}
              onChange={setErrorMessage}
              disabled={isStreaming}
              onSubmit={handleSubmit}
            />

            {!errorMessage && (
              <div className="examples-row">
                <span className="examples-label">try:</span>
                {EXAMPLES.map((ex) => (
                  <ExamplePill key={ex} label={ex} onClick={() => setErrorMessage(ex)} />
                ))}
              </div>
            )}

            <button
              className={`analyze-button${isStreaming ? ' analyzing' : ''}`}
              onClick={handleSubmit}
              disabled={isStreaming || !errorMessage.trim()}
            >
              {isStreaming ? (
                <>
                  <svg className="spinner" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                    <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Analyze Error
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {hasResult && (
            <DiagnosisResult
              streamingText={streamingText}
              isStreaming={isStreaming}
              error={error}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
