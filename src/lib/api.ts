export interface AdviceRequest {
  crop: string | null;
  symptoms: string[];
  source: "image" | "voice";
  transcript?: string;
  language?: string;
}

export interface AdviceResponse {
  advice: string;
}

export async function fetchBackendAdvice(request: AdviceRequest): Promise<AdviceResponse> {
  const response = await fetch("/api/advice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Backend request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json();
}
