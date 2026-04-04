export interface AnalyzeRequest {
  error: string;
}

export interface DiagnosisResponse {
  diagnosis: string;
  cause: string;
  suggestion: string;
  psp: string;
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
}
