import { useState } from 'react';
import { ErrorInput } from '@/components/ErrorInput';
import { DiagnosisResult } from '@/components/DiagnosisResult';
import { useAnalyze } from '@/hooks/useAnalyze';
import './App.css';

function App() {
  const [errorMessage, setErrorMessage] = useState('');
  const { result, loading, error, analyze } = useAnalyze();

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
          disabled={loading}
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !errorMessage.trim()}
          className="analyze-button"
        >
          {loading ? 'Analyzing...' : 'Analyze Error'}
        </button>

        <DiagnosisResult result={result} loading={loading} error={error} />
      </main>
    </div>
  );
}

export default App;
