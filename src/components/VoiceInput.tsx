import { useState, useCallback } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  transcript: string;
  language?: string;
}

const LANG_LABELS: Record<string, string> = {
  "en-US": "English",
  "kn-IN": "ಕನ್ನಡ",
  "te-IN": "తెలుగు",
};

export function VoiceInput({ onTranscript, transcript, language = "en-US" }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onTranscript(text);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [onTranscript, language]);

  const langLabel = LANG_LABELS[language] || language;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <Button
          onClick={startListening}
          disabled={isListening}
          variant={isListening ? "destructive" : "default"}
          className="gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4 animate-pulse" />
              Listening ({langLabel})...
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Speak in {langLabel}
            </>
          )}
        </Button>
        {isListening && (
          <div className="flex gap-1 items-center">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 16}px`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      {transcript && (
        <div className="mt-3 p-3 rounded-lg bg-secondary border border-border">
          <div className="flex items-start gap-2">
            <Volume2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-secondary-foreground">"{transcript}"</p>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
