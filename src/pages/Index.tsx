import { useState, useRef, useEffect } from "react";
import { Leaf, Sprout, Scan, Volume2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const FEATURE_DIALOGS = [
  {
    id: "image-detection",
    title: "Image-Based Crop Detection",
    description:
      "Upload a crop photo and CropSense AI analyzes the plant image, identifies the crop, and returns recommendations in your selected language.",
    icon: Scan,
  },
  {
    id: "voice-advice",
    title: "Voice-Based Farm Advice",
    description:
      "Speak about your crop condition and get advice instantly. The app detects crop names and symptoms in English, Kannada or Telugu.",
    icon: Volume2,
  },
  {
    id: "translation",
    title: "Multilingual Support",
    description:
      "Choose English, ಕನ್ನಡ or తెలుగు. The backend and on-device UI both adapt so you receive both crop names and farming advice in your preferred language.",
    icon: Globe,
  },
];

interface SearchHistoryItem {
  id: string;
  type: "voice" | "image";
  query: string;
  when: string;
  language: string;
}

const Index = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<{ title: string; description: string } | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem("cropSenseSearchHistory");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const imageRef = useRef<HTMLImageElement>(null);

  const addSearchHistory = (item: Omit<SearchHistoryItem, "id" | "when">) => {
    setSearchHistory((prev) => [
      {
        id: `history-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        when: new Date().toLocaleString(),
        ...item,
      },
      ...prev.slice(0, 9),
    ]);
  };

  const {
    predictions: imagePredictions,
    advice: imageAdvice,
    error: imageError,
    isAnalyzing: isImageAnalyzing,
    analyzeImage,
    modelLoaded,
    loadModel,
  } = useCropDetection();

  const {
    predictions: voicePredictions,
    essay: voiceEssay,
    advice: voiceAdvice,
    error: voiceError,
    isAnalyzing: isVoiceAnalyzing,
    analyzeVoice,
  } = useCropDetection();
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState("");
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  useEffect(() => {
    window.localStorage.setItem("cropSenseSearchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const getSpeechVoice = (languageCode: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const localePrefix = languageCode.startsWith("kn")
      ? "kn"
      : languageCode.startsWith("te")
      ? "te"
      : "en";
    return (
      voices.find((voice) => voice.lang.toLowerCase().startsWith(localePrefix)) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
      voices[0] ||
      null
    );
  };

  const speakText = (text: string, languageCode: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getSpeechVoice(languageCode);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = languageCode;
    }
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsVoiceSpeaking(true);
    utterance.onend = () => setIsVoiceSpeaking(false);
    utterance.onerror = () => setIsVoiceSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const buildSpokenOutput = (essayText: string | null, adviceText: string | null, languageCode: string) => {
    const summary = adviceText || essayText || "No output available.";
    if (languageCode.startsWith("kn")) {
      return `ನಿಮ್ಮ ಎಜೆಂಟ್ ಹೇಳಿಕೆಯನ್ನು ಕೇಳಿ: ${summary}`;
    }
    if (languageCode.startsWith("te")) {
      return `మీ ఏజెంట్ అవుట్పుట్ ఇది: ${summary}`;
    }
    return `Here is the agent output: ${summary}`;
  };

  useEffect(() => {
    if (!voiceAdvice && !voiceEssay) return;
    speakText(buildSpokenOutput(voiceEssay, voiceAdvice, language), language);
  }, [voiceAdvice, voiceEssay, language]);

  useEffect(() => {
    if (!voiceTranscript.trim()) return;
    if (voiceTranscript === lastVoiceTranscript) return;
    setLastVoiceTranscript(voiceTranscript);
    addSearchHistory({
      type: "voice",
      query: voiceTranscript,
      language,
    });
    analyzeVoice(voiceTranscript, language);
  }, [voiceTranscript, language, analyzeVoice, lastVoiceTranscript]);

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
    addSearchHistory({
      type: "image",
      query: imageFile?.name || "Image upload",
      language,
    });
    analyzeImage(imageRef.current, language);
  };

  const handleVoiceAnalyze = () => {
    if (!voiceTranscript.trim()) return;
    analyzeVoice(voiceTranscript, language);
  };

  const selectedLang = LANGUAGES.find((l) => l.code === language);

  const openFeatureDialog = (item: { title: string; description: string }) => {
    setDialogContent(item);
    setDialogOpen(true);
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {FEATURE_DIALOGS.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.id}
                  onClick={() => openFeatureDialog(feature)}
                  className="group relative flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-gradient-to-br from-white/20 to-white/5 px-6 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-all duration-300 hover:-translate-y-2 hover:border-white/50 hover:from-white/30 hover:to-white/10 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 backdrop-blur-md"
                  style={{
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Icon className="w-5 h-5 text-white transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 relative z-10" />
                  <span className="hidden sm:inline relative z-10">{feature.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {dialogContent && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogContent.title}</DialogTitle>
              <DialogDescription>{dialogContent.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10" style={{ perspective: "1200px" }}>
        {/* Status bar with 3D effect */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-gradient-to-r from-background/50 to-background/20 rounded-lg p-3 backdrop-blur-sm border border-border/50 shadow-lg">
          <div className={`w-3 h-3 rounded-full ${modelLoaded ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50"}`} />
          {modelLoaded ? "🎯 AI Model Ready - Ready to detect crops & plants" : "⏳ Loading AI model..."}
        </div>

        {/* Language Selection with 3D Card */}
        <div className="group relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-accent/30 opacity-30 blur-xl group-hover:opacity-50 transition duration-500" />
          <Card className="relative border-2 border-primary/20 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="pt-6">
              <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                <Globe className="w-5 h-5 text-primary" />
                🌍 Select Language
              </h2>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full max-w-xs border-2 border-primary/30 hover:border-primary/60 transition">
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
        </div>

        {/* ===== FEATURE 1: Image-Based Detection with 3D ===== */}
        <section className="space-y-4 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-heading font-bold text-lg shadow-lg">1</div>
            <h2 className="text-2xl font-heading font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">📸 Scan Your Crop</h2>
          </div>

          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary/20 to-blue-500/20 opacity-40 blur-xl group-hover:opacity-60 transition duration-500" />
            <Card className="relative border-2 border-primary/30 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  📷 Upload a photo of your crop, fruit, vegetable, or plant. AI will identify it and provide farming recommendations.
                </p>
                <div className="transform transition-transform duration-300 hover:scale-105">
                  <ImageUpload onImageSelect={handleImageSelect} preview={imagePreview} onClear={handleClear} />
                </div>
                {imagePreview && (
                  <img ref={imageRef} src={imagePreview} alt="Analysis input" className="hidden" crossOrigin="anonymous" />
                )}
                <Button
                  onClick={handleImageAnalyze}
                  disabled={!imagePreview || isImageAnalyzing || !modelLoaded}
                  size="lg"
                  className="w-full font-heading font-bold gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/80 hover:to-blue-600/80 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <Scan className="w-5 h-5" />
                  {isImageAnalyzing ? "🔍 Analyzing..." : "🚀 Analyze Crop"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <CropResults predictions={imagePredictions} advice={imageAdvice} error={imageError} isAnalyzing={isImageAnalyzing} language={language} />
        </section>

        {/* ===== FEATURE 2: Voice-Based Detection with 3D ===== */}
        <section className="space-y-4 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-heading font-bold text-lg shadow-lg">2</div>
            <h2 className="text-2xl font-heading font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">🎤 Voice Advice</h2>
          </div>

          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-accent/20 to-purple-500/20 opacity-40 blur-xl group-hover:opacity-60 transition duration-500" />
            <Card className="relative border-2 border-accent/30 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  🗣️ Speak about your crop in {selectedLang?.label || "your language"} — describe plant condition, diseases, or ask for advice.
                </p>
                <div className="transform transition-transform duration-300 hover:scale-105">
                  <VoiceInput onTranscript={setVoiceTranscript} transcript={voiceTranscript} language={language} />
                </div>
                <Button
                  onClick={handleVoiceAnalyze}
                  disabled={!voiceTranscript.trim() || isVoiceAnalyzing}
                  size="lg"
                  className="w-full font-heading font-bold gap-2 bg-gradient-to-r from-accent to-purple-600 hover:from-accent/80 hover:to-purple-600/80 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <Leaf className="w-5 h-5" />
                  {isVoiceAnalyzing ? "🔊 Analyzing..." : "💡 Get Advice"}
                </Button>
                <Button
                  onClick={() => speakText(voiceAdvice || voiceEssay || "No output to read.", language)}
                  disabled={!voiceAdvice && !voiceEssay}
                  variant="secondary"
                  className="w-full font-heading font-bold gap-2 border border-accent/40 text-accent hover:border-accent hover:bg-accent/10 transition-all duration-300"
                >
                  {isVoiceSpeaking ? "🔈 Speaking..." : "🔊 Read Agent Output"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  {language === "kn-IN"
                    ? "ವಾಯ್ಸ್‍ನಲ್ಲಿ ಕನ್ನಡ ಫಲಿತಾಂಶವನ್ನು ತೆರೆಯಿರಿ."
                    : language === "te-IN"
                    ? "వాయిస్ ద్వారా తెలుగు ఫలితాన్ని వినండి."
                    : "Listen to the LLM voice output in your selected language."}
                </p>
              </CardContent>
            </Card>
          </div>

          <CropResults predictions={voicePredictions} essay={voiceEssay} advice={voiceAdvice} error={voiceError} isAnalyzing={isVoiceAnalyzing} language={language} />
        </section>

        <section className="space-y-4 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-heading font-bold text-lg shadow-lg">3</div>
            <h2 className="text-2xl font-heading font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">🕘 Search History</h2>
          </div>

          <Card className="border-2 border-emerald-200 bg-background/80 backdrop-blur-sm shadow-2xl">
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review your recent voice and image searches so you can see what you have searched.
              </p>

              {searchHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent searches yet. Use voice or image scan to start tracking history.
                </p>
              ) : (
                <div className="space-y-3">
                  {searchHistory.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/50 bg-background/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {item.type === "voice" ? "Voice search" : "Image search"}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.when}</span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">"{item.query}"</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Language: {LANGUAGES.find((lang) => lang.code === item.language)?.label || item.language}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {searchHistory.length > 0 && (
                <Button variant="secondary" className="w-full" onClick={() => setSearchHistory([])}>
                  Clear history
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/30 bg-gradient-to-t from-background/50 to-background py-8 px-4 text-center text-sm text-muted-foreground backdrop-blur-sm shadow-2xl">
        <p className="font-heading font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">🌾 CropSense AI 3D</p>
        <p>Powered by TensorFlow.js, Web Speech API & Advanced CV</p>
        <p className="mt-2 text-xs opacity-80">🌐 English • ಕನ್ನಡ • తెలుగు</p>
      </footer>
    </div>
  );
};

export default Index;
