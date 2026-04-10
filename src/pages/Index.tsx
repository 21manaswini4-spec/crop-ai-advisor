import { useState, useRef, useEffect } from "react";
import { Leaf, Sprout, Scan, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { VoiceInput } from "@/components/VoiceInput";
import { CropResults } from "@/components/CropResults";
import { useCropDetection } from "@/hooks/useCropDetection";
import heroImage from "@/assets/hero-farm.jpg";

const Index = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceAdvice, setVoiceAdvice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("image");
  const imageRef = useRef<HTMLImageElement>(null);

  const { predictions, advice, isAnalyzing, analyzeImage, modelLoaded, loadModel } =
    useCropDetection();

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
    if (!voiceTranscript) return;
    const adviceText = generateVoiceAdvice(voiceTranscript);
    setVoiceAdvice(adviceText);
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
            AI-powered crop detection & farming advice. Use image recognition or voice input — two independent ways to get instant crop analysis.
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
          <div className={`w-2 h-2 rounded-full ${modelLoaded ? "bg-primary" : "bg-accent animate-pulse"}`} />
          {modelLoaded ? "TensorFlow.js model ready" : "Loading AI model..."}
        </div>

        {/* Tabs for two independent features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="image" className="gap-2 font-heading">
              <Scan className="w-4 h-4" /> Image Detection
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2 font-heading">
              <Volume2 className="w-4 h-4" /> Voice Analysis
            </TabsTrigger>
          </TabsList>

          {/* Image Detection Tab */}
          <TabsContent value="image" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <h2 className="font-heading font-semibold text-lg mb-2 flex items-center gap-2">
                  <Scan className="w-5 h-5 text-primary" />
                  Detect Crop from Image
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a photo of your crop. Our TensorFlow.js model will identify it and provide tailored farming advice.
                </p>
                <ImageUpload onImageSelect={handleImageSelect} preview={imagePreview} onClear={handleClear} />
                {imagePreview && (
                  <img ref={imageRef} src={imagePreview} alt="Analysis input" className="hidden" crossOrigin="anonymous" />
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleImageAnalyze}
              disabled={!imagePreview || isAnalyzing || !modelLoaded}
              size="lg"
              className="w-full font-heading font-semibold text-lg py-6 gap-2"
            >
              <Leaf className="w-5 h-5" />
              {isAnalyzing ? "Analyzing..." : "Analyze Crop Image"}
            </Button>

            <CropResults predictions={predictions} advice={advice} isAnalyzing={isAnalyzing} />
          </TabsContent>

          {/* Voice Analysis Tab */}
          <TabsContent value="voice" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <h2 className="font-heading font-semibold text-lg mb-2 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  Describe Your Crop Issue
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Speak about your crop — mention the crop name, symptoms, or issues. Get instant advice based on your description.
                </p>
                <VoiceInput onTranscript={setVoiceTranscript} transcript={voiceTranscript} />
              </CardContent>
            </Card>

            <Button
              onClick={handleVoiceAnalyze}
              disabled={!voiceTranscript}
              size="lg"
              className="w-full font-heading font-semibold text-lg py-6 gap-2"
            >
              <Leaf className="w-5 h-5" />
              Get Crop Advice
            </Button>

            <CropResults predictions={[]} advice={voiceAdvice} isAnalyzing={false} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>CropSense AI — Powered by TensorFlow.js & Web Speech API</p>
      </footer>
    </div>
  );
};

function generateVoiceAdvice(transcript: string): string {
  const lower = transcript.toLowerCase();
  let advice = `📢 **You said:** "${transcript}"\n\n`;

  // Detect crop name
  const crops: Record<string, string> = {
    rice: "Rice",
    wheat: "Wheat",
    corn: "Corn",
    maize: "Corn/Maize",
    tomato: "Tomato",
    potato: "Potato",
    cotton: "Cotton",
    sugarcane: "Sugarcane",
    soybean: "Soybean",
    onion: "Onion",
    mango: "Mango",
    banana: "Banana",
  };

  let detectedCrop = "your crop";
  for (const [key, name] of Object.entries(crops)) {
    if (lower.includes(key)) {
      detectedCrop = name;
      break;
    }
  }

  advice += `🌾 **Crop identified:** ${detectedCrop}\n\n`;
  advice += `📋 **Recommendations based on your description:**\n\n`;

  if (lower.includes("yellow") || lower.includes("yellowing")) {
    advice += `• **Yellowing leaves** often indicates nitrogen deficiency\n`;
    advice += `• Apply urea or ammonium sulfate fertilizer\n`;
    advice += `• Check for iron deficiency in alkaline soils\n`;
    advice += `• Could also indicate overwatering — ensure proper drainage\n\n`;
  }
  if (lower.includes("wilt") || lower.includes("drooping") || lower.includes("dying")) {
    advice += `• **Wilting** may be caused by fusarium wilt or root rot\n`;
    advice += `• Check soil moisture — both over and under-watering cause wilting\n`;
    advice += `• Apply fungicide if fungal infection is suspected\n`;
    advice += `• Ensure proper root aeration\n\n`;
  }
  if (lower.includes("pest") || lower.includes("insect") || lower.includes("bug") || lower.includes("worm")) {
    advice += `• Use **neem oil** spray as a natural pesticide\n`;
    advice += `• Introduce beneficial insects (ladybugs, lacewings)\n`;
    advice += `• Apply Bt (Bacillus thuringiensis) for caterpillars\n`;
    advice += `• Consider crop rotation to break pest cycles\n\n`;
  }
  if (lower.includes("dry") || lower.includes("drought") || lower.includes("water")) {
    advice += `• Apply **mulch** (2-3 inches) to conserve soil moisture\n`;
    advice += `• Consider drip irrigation for water efficiency\n`;
    advice += `• Water deeply but less frequently to encourage deep roots\n`;
    advice += `• Schedule watering for early morning to reduce evaporation\n\n`;
  }
  if (lower.includes("growth") || lower.includes("slow") || lower.includes("small")) {
    advice += `• Test soil nutrients — may need balanced **NPK fertilizer**\n`;
    advice += `• Ensure adequate sunlight (6-8 hours daily)\n`;
    advice += `• Check soil pH and amend if needed\n`;
    advice += `• Add compost to improve soil structure\n\n`;
  }
  if (lower.includes("spot") || lower.includes("disease") || lower.includes("fungus") || lower.includes("black")) {
    advice += `• **Leaf spots** often indicate fungal or bacterial disease\n`;
    advice += `• Remove and destroy infected leaves\n`;
    advice += `• Apply copper-based fungicide\n`;
    advice += `• Improve air circulation between plants\n\n`;
  }

  // If no specific issue detected
  if (!lower.match(/yellow|wilt|pest|insect|bug|dry|drought|water|growth|slow|spot|disease|fungus|black|worm|drooping|dying|small/)) {
    advice += `• **Soil health:** Test soil pH and nutrient levels regularly\n`;
    advice += `• **Watering:** Water deeply but infrequently for strong roots\n`;
    advice += `• **Mulching:** Apply 2-3 inches of organic mulch\n`;
    advice += `• **Crop rotation:** Rotate yearly to prevent soil depletion\n`;
    advice += `• **Monitoring:** Check plants daily for early signs of stress\n`;
    advice += `• **Fertilizer:** Use balanced NPK based on soil test results\n\n`;
  }

  advice += `💡 **Tip:** For more specific advice, try describing symptoms like "yellow leaves", "pest damage", or "slow growth".`;

  return advice;
}

export default Index;
