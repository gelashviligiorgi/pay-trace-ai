export interface HealthResponse {
  status: string;
  supabase: {
    connected: boolean;
    error?: string;
  };
  anthropicApiKey: boolean;
  mockMode: boolean;
}
