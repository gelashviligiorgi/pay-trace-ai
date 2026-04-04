import type { AnalysisResult } from '@/types'

interface DiagnosisResultProps {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

export const DiagnosisResult = ({ result, loading, error }: DiagnosisResultProps) => {
  if (loading) {
    return (
      <div className="diagnosis-result loading">
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

  if (!result) {
    return null;
  }

  return (
    <div className="diagnosis-result success">
      <h3>Diagnosis</h3>

      <div className="result-section">
        <strong>Diagnosis:</strong>
        <p>{result.diagnosis}</p>
      </div>

      <div className="result-section">
        <strong>Cause:</strong>
        <p>{result.cause}</p>
      </div>

      <div className="result-section">
        <strong>Suggestion:</strong>
        <p>{result.suggestion}</p>
      </div>

      <div className="result-section">
        <strong>Payment Provider:</strong>
        <p>{result.psp}</p>
      </div>
    </div>
  );
};
