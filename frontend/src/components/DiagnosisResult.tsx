import { useEffect, useState } from 'react';

interface DiagnosisResultProps {
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
}

export const DiagnosisResult = ({ streamingText, isStreaming, error }: DiagnosisResultProps) => {
  const [showCursor, setShowCursor] = useState(true);

  // Blink cursor while streaming
  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false);
      return;
    }

    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Show pulsing loading indicator before first chunk
  if (isStreaming && !streamingText) {
    return (
      <div className="diagnosis-result loading">
        <div className="loading-pulse">
          <div className="pulse-dot"></div>
          <div className="pulse-dot"></div>
          <div className="pulse-dot"></div>
        </div>
        <p>Analyzing error...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diagnosis-result error">
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!streamingText && !isStreaming) {
    return null;
  }

  return (
    <div className="diagnosis-result success">
      <h3>Diagnosis</h3>
      <div className="streaming-text-container">
        <pre className="streaming-text">
          {streamingText}
          {isStreaming && showCursor && <span className="cursor">▊</span>}
        </pre>
      </div>
    </div>
  );
};
