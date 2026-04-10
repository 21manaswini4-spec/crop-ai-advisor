import { useState, useRef, useEffect } from "react";
import { Leaf, Sprout, Scan, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { VoiceInput } from "@/components/VoiceInput";
import { CropResults } from "@/components/CropResults";
import { useCropDetection } from "@/hooks/useCropDetection";
import heroImage from "@/assets/hero-farm.jpg";

const Index = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);

  const { predictions, advice, isAnalyzing, analyzeImage, modelLoaded, loadModel } =
    useCropDetection();

  // Pre-load model on mount
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

  const handleAnalyze = () => {
    if (!imageRef.current) return;
    analyzeImage(imageRef.current, voiceTranscript || undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative h-[340px] md:h-[400px] overflow-hidden">
        <img
          src={heroImage}
          alt="Agricultural farmland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 to-foreground/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="flex items-center gap-2 mb-3">
            <Sprout className="w-8 h-8 text-primary-foreground" />
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-primary-foreground">
              CropSense AI
            </h1>
          </div>
          <p className="text-primary-foreground/80 max-w-xl text-sm md:text-base">
            AI-powered crop detection & farming advice. Upload an image or speak about your crop to get instant analysis and recommendations.
          </p>
          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary-foreground">
              <Scan className="w-3 h-3" /> Image Detection
            </div>
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary-foreground">
              <Volume2 className="w-3 h-3" /> Voice Input
            </div>
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-primary-foreground">
              <Leaf className="w-3 h-3" /> Smart Advice
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status bar */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div
            className={`w-2 h-2 rounded-full ${
              modelLoaded ? "bg-primary" : "bg-accent animate-pulse"
            }`}
          />
          {modelLoaded ? "TensorFlow.js model ready" : "Loading AI model..."}
        </div>

        {/* Image Upload */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
              <Scan className="w-5 h-5 text-primary" />
              Step 1: Upload Crop Image
            </h2>
            <ImageUpload
              onImageSelect={handleImageSelect}
              preview={imagePreview}
              onClear={handleClear}
            />
            {/* Hidden image for TF.js */}
            {imagePreview && (
              <img
                ref={imageRef}
                src={imagePreview}
                alt="Analysis input"
                className="hidden"
                crossOrigin="anonymous"
              />
            )}
          </CardContent>
        </Card>

        {/* Voice Input */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Step 2: Describe Your Issue (Optional)
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Tell us about your crop's condition — yellowing leaves, pest issues, slow growth, etc.
            </p>
            <VoiceInput onTranscript={setVoiceTranscript} transcript={voiceTranscript} />
          </CardContent>
        </Card>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={!imagePreview || isAnalyzing || !modelLoaded}
          size="lg"
          className="w-full font-heading font-semibold text-lg py-6 gap-2"
        >
          <Leaf className="w-5 h-5" />
          {isAnalyzing ? "Analyzing..." : "Analyze Crop"}
        </Button>

        {/* Results */}
        <CropResults
          predictions={predictions}
          advice={advice}
          isAnalyzing={isAnalyzing}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>CropSense AI — Powered by TensorFlow.js & Web Speech API</p>
      </footer>
    </div>
  );
};

export default Index;
