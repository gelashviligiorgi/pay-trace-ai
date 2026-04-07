import { useState } from 'react';
import { ErrorInput } from '@/components/ErrorInput';
import { DiagnosisResult } from '@/components/DiagnosisResult';
import { useAnalyze } from '@/hooks/useAnalyze';
import './App.css';

function App() {
  const [errorMessage, setErrorMessage] = useState('');
  const { streamingText, isStreaming, error, analyze } = useAnalyze();

  const handleSubmit = async () => {
    if (!errorMessage.trim()) {
      return;
    }
    await analyze(errorMessage);
  };

  return (
    <div className="app">
      <header>
        <h1>Pay Trace AI</h1>
        <p>AI-powered payment error debugger</p>
      </header>

      <main>
        <ErrorInput
          value={errorMessage}
          onChange={setErrorMessage}
          disabled={isStreaming}
        />

        <button
          onClick={handleSubmit}
          disabled={isStreaming || !errorMessage.trim()}
          className="analyze-button"
        >
          {isStreaming ? 'Analyzing...' : 'Analyze Error'}
        </button>

        <DiagnosisResult streamingText={streamingText} isStreaming={isStreaming} error={error} />
      </main>
    </div>
  );
}

export default App;
