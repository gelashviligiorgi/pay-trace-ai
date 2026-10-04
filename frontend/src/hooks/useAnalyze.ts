import { useState, useRef } from 'react';

interface UseAnalyzeReturn {
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
  analyze: (errorMessage: string, onComplete?: () => void) => Promise<void>;
}

export const useAnalyze = (): UseAnalyzeReturn => {
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyze = async (errorMessage: string, onComplete?: () => void) => {
    // Reset state
    setStreamingText('');
    setIsStreaming(true);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: errorMessage }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is SSE
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream')) {
        // Fallback to JSON for non-streaming responses
        const data = await response.json();
        if ('message' in data) {
          setError(data.message);
        } else if ('diagnosis' in data) {
          setStreamingText(data.diagnosis);
        }
        setIsStreaming(false);
        onComplete?.();
        return;
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE format: "data: {...}\n\n"
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6); // Remove "data: " prefix
            try {
              const data = JSON.parse(jsonStr);

              if (data.chunk) {
                accumulatedText += data.chunk;
                setStreamingText(accumulatedText);
              } else if (data.done) {
                setIsStreaming(false);
                onComplete?.();
              } else if (data.error) {
                setError(data.error);
                setIsStreaming(false);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to analyze error');
      setIsStreaming(false);
    }
  };

  return { streamingText, isStreaming, error, analyze };
};
