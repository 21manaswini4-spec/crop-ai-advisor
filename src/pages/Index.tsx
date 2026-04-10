import { useState, useRef, useEffect } from "react";
import { Leaf, Sprout, Scan, Volume2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { VoiceInput } from "@/components/VoiceInput";
import { CropResults } from "@/components/CropResults";
import { useCropDetection } from "@/hooks/useCropDetection";
import heroImage from "@/assets/hero-farm.jpg";

const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
];

const Index = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [language, setLanguage] = useState("en-US");
  const imageRef = useRef<HTMLImageElement>(null);

  const {
    predictions: imagePredictions,
    advice: imageAdvice,
    isAnalyzing: isImageAnalyzing,
    analyzeImage,
    modelLoaded,
    loadModel,
  } = useCropDetection();

  const {
    predictions: voicePredictions,
    advice: voiceAdvice,
    isAnalyzing: isVoiceAnalyzing,
    analyzeVoice,
  } = useCropDetection();

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  const handleImageSelect = (file: File, preview: string) => {
    setImageFile(file);
    setImagePreview(preview);
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageAnalyze = () => {
    if (!imageRef.current) return;
    analyzeImage(imageRef.current);
  };

  const handleVoiceAnalyze = () => {
    if (!voiceTranscript.trim()) return;
    analyzeVoice(voiceTranscript, language);
  };

  const selectedLang = LANGUAGES.find((l) => l.code === language);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative h-[340px] md:h-[400px] overflow-hidden">
        <img src={heroImage} alt="Agricultural farmland" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 to-foreground/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="flex items-center gap-2 mb-3">
            <Sprout className="w-8 h-8 text-primary-foreground" />
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-primary-foreground">
              CropSense AI
            </h1>
          </div>
          <p className="text-primary-foreground/80 max-w-xl text-sm md:text-base">
            AI-powered crop detection & farming advice. Use image upload OR voice — each works independently. Supports English, ಕನ್ನಡ & తెలుగు.
          </p>
          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary-foreground">
              <Scan className="w-3 h-3" /> Image Detection
            </div>
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary-foreground">
              <Volume2 className="w-3 h-3" /> Voice Input
            </div>
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary-foreground">
              <Globe className="w-3 h-3" /> Multilingual
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Status bar */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${modelLoaded ? "bg-primary" : "bg-accent animate-pulse"}`} />
          {modelLoaded ? "TensorFlow.js model ready" : "Loading AI model..."}
        </div>

        {/* Language Selection */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Language / ಭಾಷೆ / భాష
            </h2>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ===== FEATURE 1: Image-Based Detection ===== */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-sm">1</div>
            <h2 className="text-xl font-heading font-bold text-foreground">Image-Based Crop Detection</h2>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a photo of your crop. The AI will identify it and provide farming recommendations.
              </p>
              <ImageUpload onImageSelect={handleImageSelect} preview={imagePreview} onClear={handleClear} />
              {imagePreview && (
                <img ref={imageRef} src={imagePreview} alt="Analysis input" className="hidden" crossOrigin="anonymous" />
              )}
              <Button
                onClick={handleImageAnalyze}
                disabled={!imagePreview || isImageAnalyzing || !modelLoaded}
                size="lg"
                className="w-full font-heading font-semibold gap-2"
              >
                <Scan className="w-5 h-5" />
                {isImageAnalyzing ? "Analyzing Image..." : "Analyze Crop Image"}
              </Button>
            </CardContent>
          </Card>

          <CropResults predictions={imagePredictions} advice={imageAdvice} isAnalyzing={isImageAnalyzing} />
        </section>

        {/* ===== FEATURE 2: Voice-Based Detection ===== */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-heading font-bold text-sm">2</div>
            <h2 className="text-xl font-heading font-bold text-foreground">Voice-Based Crop Advice</h2>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Speak about your crop in {selectedLang?.label || "your language"} — describe conditions, problems, or ask questions.
              </p>
              <VoiceInput onTranscript={setVoiceTranscript} transcript={voiceTranscript} language={language} />
              <Button
                onClick={handleVoiceAnalyze}
                disabled={!voiceTranscript.trim() || isVoiceAnalyzing}
                size="lg"
                variant="secondary"
                className="w-full font-heading font-semibold gap-2"
              >
                <Leaf className="w-5 h-5" />
                {isVoiceAnalyzing ? "Analyzing..." : "Get Advice from Voice"}
              </Button>
            </CardContent>
          </Card>

          <CropResults predictions={voicePredictions} advice={voiceAdvice} isAnalyzing={isVoiceAnalyzing} />
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>CropSense AI — Powered by TensorFlow.js & Web Speech API</p>
        <p className="mt-1">Supports English, ಕನ್ನಡ (Kannada) & తెలుగు (Telugu)</p>
      </footer>
    </div>
  );
};

export default Index;
