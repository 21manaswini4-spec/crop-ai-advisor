import { useState, useCallback, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

interface CropResult {
  name: string;
  confidence: number;
}

// Map MobileNet classes to crop-related categories
const CROP_KEYWORDS = [
  "corn", "wheat", "rice", "barley", "soybean", "cotton", "sugarcane",
  "sunflower", "potato", "tomato", "pepper", "cucumber", "lettuce",
  "cabbage", "carrot", "onion", "garlic", "bean", "pea", "lentil",
  "apple", "orange", "banana", "grape", "mango", "strawberry",
  "plant", "flower", "leaf", "seed", "fruit", "vegetable", "crop",
  "field", "farm", "garden", "grass", "tree", "mushroom"
];

function isCropRelated(className: string): boolean {
  const lower = className.toLowerCase();
  return CROP_KEYWORDS.some((kw) => lower.includes(kw));
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
    async (imageElement: HTMLImageElement, voiceContext?: string) => {
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

        // Generate advice based on predictions and voice context
        const topPrediction = cropResults[0]?.name || "unknown plant";
        const cropRelated = cropResults.filter((r) => isCropRelated(r.name));
        
        const adviceText = generateLocalAdvice(topPrediction, cropRelated, voiceContext);
        setAdvice(adviceText);
      } catch (error) {
        console.error("Analysis failed:", error);
        setAdvice("Failed to analyze image. Please try again with a clearer photo.");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [loadModel]
  );

  return { predictions, advice, isAnalyzing, analyzeImage, modelLoaded, loadModel };
}

function generateLocalAdvice(
  topPrediction: string,
  cropRelated: CropResult[],
  voiceContext?: string
): string {
  const lower = topPrediction.toLowerCase();
  let advice = `🌾 **Detected: ${topPrediction}**\n\n`;

  if (voiceContext) {
    advice += `📢 You mentioned: "${voiceContext}"\n\n`;
  }

  // General farming advice based on detection
  advice += `📋 **General Recommendations:**\n\n`;
  
  if (lower.includes("corn") || lower.includes("maize")) {
    advice += `• **Watering:** Corn requires 1-1.5 inches of water per week\n`;
    advice += `• **Soil:** Well-drained, fertile soil with pH 5.8-7.0\n`;
    advice += `• **Fertilizer:** Apply nitrogen-rich fertilizer at knee-high stage\n`;
    advice += `• **Pests:** Watch for corn borers and armyworms\n`;
    advice += `• **Yield tip:** Plant in blocks rather than rows for better pollination\n`;
  } else if (lower.includes("wheat")) {
    advice += `• **Watering:** 12-15 inches of water throughout growing season\n`;
    advice += `• **Soil:** Loamy soil with pH 6.0-7.0\n`;
    advice += `• **Fertilizer:** Apply phosphorus at sowing, nitrogen at tillering\n`;
    advice += `• **Disease:** Monitor for rust and powdery mildew\n`;
    advice += `• **Harvest:** When grain moisture drops to 13-14%\n`;
  } else if (lower.includes("rice")) {
    advice += `• **Watering:** Maintain 2-4 inches of standing water during growth\n`;
    advice += `• **Soil:** Clay or clay-loam soils are ideal\n`;
    advice += `• **Fertilizer:** Split nitrogen application across growth stages\n`;
    advice += `• **Pests:** Watch for stem borers and leaf folders\n`;
    advice += `• **Yield tip:** Proper spacing (20x15 cm) increases yield by 20%\n`;
  } else if (lower.includes("tomato")) {
    advice += `• **Watering:** 1-2 inches per week, consistent watering prevents cracking\n`;
    advice += `• **Soil:** Well-drained, slightly acidic (pH 6.0-6.8)\n`;
    advice += `• **Support:** Use cages or stakes for better yield\n`;
    advice += `• **Pruning:** Remove suckers for larger fruits\n`;
    advice += `• **Disease:** Rotate crops to prevent blight\n`;
  } else if (lower.includes("potato")) {
    advice += `• **Soil:** Loose, well-drained soil with pH 5.0-6.0\n`;
    advice += `• **Hilling:** Mound soil around stems as they grow\n`;
    advice += `• **Watering:** 1-2 inches per week, avoid waterlogging\n`;
    advice += `• **Harvest:** When foliage dies back\n`;
    advice += `• **Storage:** Cure in dark, cool place for 2 weeks\n`;
  } else {
    advice += `• **Soil health:** Test soil pH and nutrient levels regularly\n`;
    advice += `• **Watering:** Water deeply but infrequently to encourage deep roots\n`;
    advice += `• **Mulching:** Apply 2-3 inches of organic mulch to retain moisture\n`;
    advice += `• **Crop rotation:** Rotate crops yearly to prevent soil depletion\n`;
    advice += `• **Pest management:** Use integrated pest management (IPM) practices\n`;
    advice += `• **Monitoring:** Check plants daily for signs of disease or stress\n`;
  }

  if (voiceContext) {
    advice += `\n🎯 **Based on your description:**\n`;
    const voiceLower = voiceContext.toLowerCase();
    if (voiceLower.includes("yellow") || voiceLower.includes("wilting")) {
      advice += `• Yellowing/wilting may indicate nitrogen deficiency or overwatering\n`;
      advice += `• Check soil drainage and consider adding compost\n`;
    }
    if (voiceLower.includes("pest") || voiceLower.includes("insect") || voiceLower.includes("bug")) {
      advice += `• Try neem oil spray as a natural pesticide\n`;
      advice += `• Introduce beneficial insects like ladybugs\n`;
    }
    if (voiceLower.includes("dry") || voiceLower.includes("drought")) {
      advice += `• Apply mulch to conserve soil moisture\n`;
      advice += `• Consider drip irrigation for water efficiency\n`;
    }
    if (voiceLower.includes("growth") || voiceLower.includes("slow")) {
      advice += `• Test soil nutrients — may need balanced NPK fertilizer\n`;
      advice += `• Ensure adequate sunlight (6-8 hours daily)\n`;
    }
  }

  return advice;
}
