import { useState, useCallback, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

interface CropResult {
  name: string;
  confidence: number;
}

const CROP_KEYWORDS = [
  "corn", "wheat", "rice", "barley", "soybean", "cotton", "sugarcane",
  "sunflower", "potato", "tomato", "pepper", "cucumber", "lettuce",
  "cabbage", "carrot", "onion", "garlic", "bean", "pea", "lentil",
  "apple", "orange", "banana", "grape", "mango", "strawberry",
  "plant", "flower", "leaf", "seed", "fruit", "vegetable", "crop",
  "field", "farm", "garden", "grass", "tree", "mushroom"
];

// Kannada & Telugu crop keywords for voice-based detection
const CROP_VOICE_MAP: Record<string, string> = {
  // Kannada
  "ಭತ್ತ": "rice", "ರಾಗಿ": "finger millet", "ಜೋಳ": "sorghum", "ಮೆಕ್ಕೆಜೋಳ": "corn",
  "ಗೋಧಿ": "wheat", "ಟೊಮ್ಯಾಟೊ": "tomato", "ಆಲೂಗಡ್ಡೆ": "potato", "ಈರುಳ್ಳಿ": "onion",
  "ಬೆಳ್ಳುಳ್ಳಿ": "garlic", "ಕಬ್ಬು": "sugarcane", "ಹತ್ತಿ": "cotton", "ಮಾವು": "mango",
  "ಬಾಳೆಹಣ್ಣು": "banana", "ದ್ರಾಕ್ಷಿ": "grape", "ಮೆಣಸಿನಕಾಯಿ": "pepper",
  "ಸೂರ್ಯಕಾಂತಿ": "sunflower", "ಶೇಂಗಾ": "groundnut", "ತೊಗರಿ": "pigeon pea",
  // Telugu
  "వరి": "rice", "రాగి": "finger millet", "జొన్న": "sorghum", "మొక్కజొన్న": "corn",
  "గోధుమ": "wheat", "టమాటా": "tomato", "బంగాళాదుంప": "potato", "ఉల్లిపాయ": "onion",
  "వెల్లుల్లి": "garlic", "చెరకు": "sugarcane", "పత్తి": "cotton", "మామిడి": "mango",
  "అరటి": "banana", "ద్రాక్ష": "grape", "మిరపకాయ": "pepper",
  "పొద్దుతిరుగుడు": "sunflower", "వేరుశెనగ": "groundnut", "కంది": "pigeon pea",
};

// Voice symptom keywords in all three languages
const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  yellow: ["yellow", "yellowing", "ಹಳದಿ", "పసుపు"],
  wilting: ["wilting", "wilt", "drooping", "ಬಾಡುತ್ತಿದೆ", "వాడిపోతోంది"],
  pest: ["pest", "insect", "bug", "worm", "ಕೀಟ", "ಹುಳ", "పురుగు", "కీటకం"],
  dry: ["dry", "drought", "ಒಣ", "ಬರ", "ఎండ", "కరువు"],
  growth: ["growth", "slow", "ಬೆಳವಣಿಗೆ", "ನಿಧಾನ", "పెరుగుదల", "నెమ్మది"],
  disease: ["disease", "rot", "spot", "blight", "ರೋಗ", "ಕೊಳೆ", "రోగం", "మచ్చ"],
};

function isCropRelated(className: string): boolean {
  const lower = className.toLowerCase();
  return CROP_KEYWORDS.some((kw) => lower.includes(kw));
}

function detectCropFromVoice(text: string): string | null {
  const lower = text.toLowerCase();
  // Check English crop keywords
  for (const kw of CROP_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  // Check Kannada/Telugu keywords
  for (const [localWord, englishCrop] of Object.entries(CROP_VOICE_MAP)) {
    if (text.includes(localWord)) return englishCrop;
  }
  return null;
}

function detectSymptoms(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const [symptom, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw) || text.includes(kw))) {
      found.push(symptom);
    }
  }
  return found;
}

export function useCropDetection() {
  const [predictions, setPredictions] = useState<CropResult[]>([]);
  const [advice, setAdvice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const modelRef = useRef<mobilenet.MobileNet | null>(null);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current;
    await tf.ready();
    const model = await mobilenet.load({ version: 2, alpha: 1.0 });
    modelRef.current = model;
    setModelLoaded(true);
    return model;
  }, []);

  const analyzeImage = useCallback(
    async (imageElement: HTMLImageElement) => {
      setIsAnalyzing(true);
      setPredictions([]);
      setAdvice(null);
      try {
        const model = await loadModel();
        const results = await model.classify(imageElement, 5);
        const cropResults: CropResult[] = results.map((r) => ({
          name: r.className,
          confidence: r.probability,
        }));
        setPredictions(cropResults);
        const topPrediction = cropResults[0]?.name || "unknown plant";
        const cropRelated = cropResults.filter((r) => isCropRelated(r.name));
        setAdvice(generateImageAdvice(topPrediction, cropRelated));
      } catch (error) {
        console.error("Image analysis failed:", error);
        setAdvice("Failed to analyze image. Please try again with a clearer photo.");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [loadModel]
  );

  const analyzeVoice = useCallback((transcript: string, language: string) => {
    setIsAnalyzing(true);
    setPredictions([]);
    setAdvice(null);

    setTimeout(() => {
      const detectedCrop = detectCropFromVoice(transcript);
      const symptoms = detectSymptoms(transcript);

      if (detectedCrop) {
        setPredictions([{ name: detectedCrop, confidence: 0.85 }]);
      }

      const adviceText = generateVoiceAdvice(transcript, detectedCrop, symptoms, language);
      setAdvice(adviceText);
      setIsAnalyzing(false);
    }, 800);
  }, []);

  return { predictions, advice, isAnalyzing, analyzeImage, analyzeVoice, modelLoaded, loadModel };
}

function generateImageAdvice(topPrediction: string, cropRelated: CropResult[]): string {
  const lower = topPrediction.toLowerCase();
  let advice = `🌾 **Detected: ${topPrediction}**\n\n📋 **Recommendations:**\n\n`;

  if (lower.includes("corn") || lower.includes("maize")) {
    advice += `• **Watering:** 1-1.5 inches/week\n• **Soil:** pH 5.8-7.0\n• **Fertilizer:** Nitrogen-rich at knee-high stage\n• **Pests:** Watch for corn borers\n• **Tip:** Plant in blocks for better pollination\n`;
  } else if (lower.includes("wheat")) {
    advice += `• **Watering:** 12-15 inches across season\n• **Soil:** Loamy, pH 6.0-7.0\n• **Fertilizer:** Phosphorus at sowing, nitrogen at tillering\n• **Disease:** Monitor for rust\n`;
  } else if (lower.includes("rice")) {
    advice += `• **Watering:** 2-4 inches standing water\n• **Soil:** Clay or clay-loam\n• **Fertilizer:** Split nitrogen application\n• **Spacing:** 20x15 cm increases yield 20%\n`;
  } else if (lower.includes("tomato")) {
    advice += `• **Watering:** 1-2 inches/week\n• **Soil:** pH 6.0-6.8\n• **Support:** Use cages or stakes\n• **Pruning:** Remove suckers for larger fruits\n`;
  } else if (lower.includes("potato")) {
    advice += `• **Soil:** Loose, pH 5.0-6.0\n• **Hilling:** Mound soil around stems\n• **Harvest:** When foliage dies back\n`;
  } else {
    advice += `• **Soil:** Test pH and nutrients regularly\n• **Watering:** Deep but infrequent\n• **Mulching:** 2-3 inches organic mulch\n• **Rotation:** Rotate crops yearly\n• **IPM:** Integrated pest management\n`;
  }

  return advice;
}

function generateVoiceAdvice(
  transcript: string,
  detectedCrop: string | null,
  symptoms: string[],
  language: string
): string {
  let advice = "";

  const langLabel = language === "kn-IN" ? "ಕನ್ನಡ" : language === "te-IN" ? "తెలుగు" : "English";
  advice += `📢 **You said (${langLabel}):** "${transcript}"\n\n`;

  if (detectedCrop) {
    advice += `🌱 **Detected crop:** ${detectedCrop}\n\n`;
    // Add crop-specific advice
    const cl = detectedCrop.toLowerCase();
    if (cl.includes("rice") || cl === "rice") {
      advice += `📋 **Rice recommendations:**\n• Maintain 2-4 inches standing water\n• Split nitrogen across growth stages\n• Watch for stem borers and leaf folders\n\n`;
    } else if (cl.includes("corn") || cl === "corn") {
      advice += `📋 **Corn recommendations:**\n• 1-1.5 inches water/week\n• Nitrogen-rich fertilizer at knee-high\n• Plant in blocks for pollination\n\n`;
    } else if (cl.includes("wheat")) {
      advice += `📋 **Wheat recommendations:**\n• 12-15 inches water across season\n• Monitor for rust and powdery mildew\n\n`;
    } else if (cl.includes("sugarcane")) {
      advice += `📋 **Sugarcane recommendations:**\n• Deep furrow planting, 90cm spacing\n• Heavy nitrogen + potassium fertilization\n• Earthing up at 3-4 months\n\n`;
    } else if (cl.includes("cotton")) {
      advice += `📋 **Cotton recommendations:**\n• Well-drained soil, pH 5.5-8.0\n• Monitor for bollworms\n• Picking at full boll opening\n\n`;
    } else if (cl.includes("mango")) {
      advice += `📋 **Mango recommendations:**\n• Minimal water during flowering\n• Prune after harvest\n• Spray for anthracnose prevention\n\n`;
    } else if (cl.includes("finger millet") || cl.includes("ragi")) {
      advice += `📋 **Finger millet (Ragi) recommendations:**\n• Drought tolerant — water moderately\n• Transplant 25-30 day seedlings\n• Apply FYM + NPK fertilizer\n\n`;
    } else {
      advice += `📋 **General recommendations:**\n• Test soil pH and nutrients\n• Water deeply but infrequently\n• Use organic mulch\n\n`;
    }
  } else {
    advice += `ℹ️ No specific crop detected from your description. Providing general advice.\n\n`;
    advice += `📋 **General farming advice:**\n• Test soil regularly\n• Use crop rotation\n• Apply integrated pest management\n• Water deeply, less frequently\n\n`;
  }

  if (symptoms.length > 0) {
    advice += `🎯 **Based on symptoms detected:**\n`;
    if (symptoms.includes("yellow") || symptoms.includes("wilting")) {
      advice += `• Yellowing/wilting → nitrogen deficiency or overwatering\n• Check drainage, add compost or urea\n`;
    }
    if (symptoms.includes("pest")) {
      advice += `• Pests → try neem oil spray as natural pesticide\n• Introduce beneficial insects (ladybugs)\n`;
    }
    if (symptoms.includes("dry")) {
      advice += `• Drought stress → mulch to conserve moisture\n• Consider drip irrigation\n`;
    }
    if (symptoms.includes("growth")) {
      advice += `• Slow growth → test soil nutrients, may need NPK\n• Ensure 6-8 hours sunlight daily\n`;
    }
    if (symptoms.includes("disease")) {
      advice += `• Disease signs → remove affected parts immediately\n• Apply appropriate fungicide\n• Improve air circulation\n`;
    }
  }

  return advice;
}
