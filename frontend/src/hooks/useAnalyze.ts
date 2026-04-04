import { useState } from 'react';
import type { AnalysisResult } from '@/types';

interface UseAnalyzeReturn {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyze: (errorMessage: string) => Promise<void>;
}

export const useAnalyze = (): UseAnalyzeReturn => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (errorMessage: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: errorMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if it's a mock/real response or "AI not wired up yet" message
      if ('message' in data) {
        setError(data.message);
      } else {
        setResult(data as AnalysisResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze error');
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, analyze };
};
