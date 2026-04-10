import { useState, useCallback } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  transcript: string;
}

export function VoiceInput({ onTranscript, transcript }: VoiceInputProps) {
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
    recognition.lang = "en-US";

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
  }, [onTranscript]);

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
              Listening...
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Speak About Your Crop
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
