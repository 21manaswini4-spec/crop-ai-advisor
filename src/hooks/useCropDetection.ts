import { useState, useCallback, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import { fetchBackendAdvice } from "@/lib/api";

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

const CROP_VOICE_MAP: Record<string, string> = {
  "ಭತ್ತ": "rice", "ರಾಗಿ": "finger millet", "ಜೋಳ": "sorghum", "ಮೆಕ್ಕೆಜೋಳ": "corn",
  "ಗೋಧಿ": "wheat", "ಟೊಮ್ಯಾಟೊ": "tomato", "ಟೊಮೇಟೋ": "tomato", "ಟೊಮೇಟೊ": "tomato", "ಟೊಮೆಟೊ": "tomato", "ಆಲೂಗಡ್ಡೆ": "potato", "ಈರುಳ್ಳಿ": "onion",
  "ಬೆಳ್ಳುಳ್ಳಿ": "garlic", "ಕಬ್ಬು": "sugarcane", "ಹತ್ತಿ": "cotton", "ಮಾವು": "mango",
  "ಬಾಳೆಹಣ್ಣು": "banana", "ದ್ರಾಕ್ಷಿ": "grape", "ಮೆಣಸಿನಕಾಯಿ": "pepper", "ಮಿರ್ಚಿ": "pepper",
  "ಸೂರ್ಯಕಾಂತಿ": "sunflower", "ಶೇಂಗಾ": "groundnut", "ತೊಗರಿ": "pigeon pea",
  "వరి": "rice", "రాగి": "finger millet", "జొన్న": "sorghum", "మొక్కజొన్న": "corn",
  "గోధుమ": "wheat", "టమాటా": "tomato", "బంగాళాదుంప": "potato", "ఉల్లిపాయ": "onion",
  "వెల్లుల్లి": "garlic", "చెరకు": "sugarcane", "పత్తి": "cotton", "మామిడి": "mango",
  "అరటి": "banana", "ద్రాక్ష": "grape", "మిరపకాయ": "pepper",
  "పొద్దుతిరుగుడు": "sunflower", "వేరుశెనగ": "groundnut", "కంది": "pigeon pea",
};

const PLANT_TYPE_MAP: Record<string, string> = {
  "fruit": "fruit", "fruits": "fruit", "ಹಣ್ಣು": "fruit", "ಹಣ್ಣುಗಳು": "fruit", "ಪಂಡು": "fruit", "ಪಂಡ್ಲు": "fruit",
  "vegetable": "vegetable", "vegetables": "vegetable", "ತರಕಾರಿ": "vegetable", "ತರಕಾರಿಗಳು": "vegetable", "ಕೂರగాయ": "vegetable", "కూరగాయలు": "vegetable",
  "leaf": "leaf", "leafy": "leaf", "ಎಲೆ": "leaf", "ಎಲೆಗಳು": "leaf", "ఆకు": "leaf", "ఆకులు": "leaf",
  "plant": "plant", "crops": "plant", "crop": "plant", "ಸಸ್ಯ": "plant", "ప్లాంట్": "plant", "సస్యం": "plant",
  "ಸಸ್ಯಗಳು": "plant", "ಪ್ಲಾಂಟ್": "plant",
};

const DISEASE_KEYWORDS: Record<string, string> = {
  "rust": "rust", "blight": "blight", "powdery": "powdery mildew", "mildew": "powdery mildew", "spot": "leaf spot", "rot": "rot", "wilt": "wilt",
  "ಹೆಚ್ಚು": "stress", "ಹಳದಿ": "yellowing", "ಕೀಟ": "pest", "పసుపు": "yellowing", "వాంతు": "wilt", "పురుగు": "pest",  "ರೋಗ": "disease", "ಕೊಳೆ": "rot", "ಬಾಡು": "wilt", "ಹುಳ": "pest", "ಮಚ್ಚ": "spot",
  "రోగం": "disease", "మచ్చ": "spot", "వాడిపోతోంది": "wilt", "పురుగు": "pest", "పసుపు": "yellowing",};

const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  yellow: ["yellow", "yellowing", "ಹಳದಿ", "ಪಸುಪು", "పసుపు"],
  wilting: ["wilting", "wilt", "drooping", "ಬಾಡುತ್ತಿದೆ", "వాడిపోతోంది", "వాడిపోతోంది"],
  pest: ["pest", "insect", "bug", "worm", "ಕೀಟ", "ಹುಳ", "ಪುರಿಗು", "పురుగు", "కీటకం"],
  dry: ["dry", "drought", "ಒಣ", "ಬర", "ఎండ", "కరువు"],
  growth: ["growth", "slow", "ಬೆಳವಣಿಗೆ", "ನೆಮ್ಮದಿ", "పెరుగుదల", "నిధాన"],
  disease: ["disease", "rot", "spot", "blight", "ರೋಗ", "ಕೊಳೆ", "మಚ್ಚ", "రోగం", "మచ్చ"],
};

const SOIL_HEALTH_KEYWORDS: Record<string, string[]> = {
  "Healthy Soil": [
    "dark", "crumbly", "organic matter", "moisture retention", "earthworm", "well-aerated", "good drainage", "neutral ph", "microbial activity",
  ],
  "Moderately Healthy Soil": [
    "slightly dry", "minor nutrient imbalance", "moderately compact", "early signs of erosion", "low organic matter",
  ],
  "Poor Soil": [
    "dry and hard", "cracks", "lacking nitrogen", "compacted", "sandy", "low water retention", "uneven texture", "poor fertility",
  ],
  "Degraded Soil": [
    "severely eroded", "nutrient loss", "saline", "chemical use", "lifeless", "desertification",
  ],
  "Contaminated Soil": [
    "industrial waste", "heavy metal", "pesticide residue", "toxic", "chemical smell", "contaminated",
  ],
};

const CROP_TYPE_CLASSIFICATIONS: Record<string, string[]> = {
  Fruits: ["apple", "orange", "banana", "grape", "mango", "strawberry"],
  Vegetables: ["tomato", "potato", "cucumber", "lettuce", "cabbage", "carrot", "onion", "garlic", "pepper"],
  Cereals: ["corn", "wheat", "rice", "barley", "sorghum", "finger millet"],
  Pulses: ["soybean", "lentil", "pigeon pea"],
  "Cash Crops": ["cotton", "sugarcane", "sunflower", "groundnut"],
};

function detectSoilHealth(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(SOIL_HEALTH_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "Moderately Healthy Soil";
}

function detectPlantHealth(text: string, symptoms: string[], detectedDisease?: string | null): string {
  const lower = text.toLowerCase();
  if (detectedDisease || SYMPTOM_KEYWORDS.disease.some((kw) => lower.includes(kw))) {
    return "Disease Infected";
  }
  if (SYMPTOM_KEYWORDS.pest.some((kw) => lower.includes(kw))) {
    return "Pest Infested";
  }
  if (SYMPTOM_KEYWORDS.yellow.some((kw) => lower.includes(kw)) || SYMPTOM_KEYWORDS.growth.some((kw) => lower.includes(kw))) {
    return "Nutrient Deficiency";
  }
  if (lower.includes("wilt") || lower.includes("wilting") || lower.includes("severely") || lower.includes("damaged") || lower.includes("broken")) {
    return "Severely Damaged";
  }
  if (lower.includes("slight") || lower.includes("mild") || lower.includes("slow") || lower.includes("stress") || lower.includes("dry")) {
    return "Early Stress";
  }
  return "Healthy Plant";
}

function detectCropType(detectedCrop: string | null, transcript: string): string {
  const lower = (detectedCrop ?? transcript).toLowerCase();
  for (const [type, values] of Object.entries(CROP_TYPE_CLASSIFICATIONS)) {
    if (values.some((crop) => lower.includes(crop))) {
      return type;
    }
  }
  if (lower.includes("fruit")) return "Fruits";
  if (lower.includes("vegetable")) return "Vegetables";
  if (lower.includes("cereal")) return "Cereals";
  if (lower.includes("pulse")) return "Pulses";
  return "Fruits";
}

function generateClassificationAdvice(
  transcript: string,
  detectedCrop: string | null,
  soilHealth: string,
  plantHealth: string,
  cropType: string,
  language: string
): string {
  const normalized = normalizeLanguage(language);
  const cropLabel = detectedCrop ? getLocalizedCropName(detectedCrop, language) : "Unknown crop";
  const header = normalized === "kn"
    ? `📚 **ವರ್ಗೀಕರಣ ಸಂಗ್ರಹ**\n\n` 
    : normalized === "te"
    ? `📚 **వర్గీకరణ సారాంశం**\n\n`
    : `📚 **Classification Summary**\n\n`;

  const summary = normalized === "kn"
    ? `🌱 **ಗುರುತಿಸಿದ ಬೆಳೆ:** ${cropLabel}\n` +
      `🧪 **ಮಣ್ಣು ಆರೋಗ್ಯ ವರ್ಗ:** ${soilHealth}\n` +
      `🌿 **ಸಸ್ಯ ಆರೋಗ್ಯ ವರ್ಗ:** ${plantHealth}\n` +
      `🌾 **ಬೆಳೆ ಪ್ರಕಾರ ವರ್ಗ:** ${cropType}\n\n`
    : normalized === "te"
    ? `🌱 **గుర్తించిన పంట:** ${cropLabel}\n` +
      `🧪 **డొక్క ఆరోగ్య వర్గం:** ${soilHealth}\n` +
      `🌿 **ఆకారం ఆరోగ్య వర్గం:** ${plantHealth}\n` +
      `🌾 **పంట రకం వర్గం:** ${cropType}\n\n`
    : `🌱 **Detected crop:** ${cropLabel}\n` +
      `🧪 **Soil Health Classification:** ${soilHealth}\n` +
      `🌿 **Plant Health Classification:** ${plantHealth}\n` +
      `🌾 **Crop Type Classification:** ${cropType}\n\n`;

  const structure = `A. Soil Health Classification\n` +
    `- Healthy Soil\n` +
    `- Moderately Healthy Soil\n` +
    `- Poor Soil\n` +
    `- Degraded Soil\n` +
    `- Contaminated Soil\n\n` +
    `B. Plant Health Classification\n` +
    `- Healthy Plant\n` +
    `- Early Stress\n` +
    `- Nutrient Deficiency\n` +
    `- Disease Infected\n` +
    `- Pest Infested\n` +
    `- Severely Damaged\n\n` +
    `C. Crop Type Classification\n` +
    `- Fruits\n` +
    `- Vegetables\n` +
    `- Cereals\n` +
    `- Pulses\n` +
    `- Cash Crops\n\n`;

  const description = `🌿 2. Soil Health Descriptions\n` +
    `🟢 Healthy Soil\n` +
    `- Dark, crumbly soil rich in organic matter with good moisture retention\n` +
    `- Soil with balanced nutrients and visible earthworm activity\n` +
    `- Well-aerated soil with proper drainage and no foul odor\n` +
    `- Moist soil supporting strong root penetration\n` +
    `- Soil with neutral pH and high microbial activity\n\n` +
    `🟡 Moderately Healthy Soil\n` +
    `- Slightly dry soil but still supports crop growth\n` +
    `- Soil with minor nutrient imbalance\n` +
    `- Moderately compact soil with reduced aeration\n` +
    `- Soil showing early signs of erosion\n` +
    `- Low organic matter but still usable\n\n` +
    `🔴 Poor Soil\n` +
    `- Dry and hard soil with cracks\n` +
    `- Soil lacking nitrogen and organic content\n` +
    `- Compacted soil restricting root growth\n` +
    `- Sandy soil with low water retention\n` +
    `- Soil with uneven texture and poor fertility\n\n` +
    `⚫ Degraded Soil\n` +
    `- Severely eroded soil with nutrient loss\n` +
    `- Saline soil with white crust formation\n` +
    `- Soil affected by excessive chemical use\n` +
    `- Lifeless soil lacking microbial activity\n` +
    `- Soil showing desertification signs\n\n` +
    `☣️ Contaminated Soil\n` +
    `- Soil polluted with industrial waste\n` +
    `- Heavy metal contaminated soil\n` +
    `- Soil with pesticide residue accumulation\n` +
    `- Toxic soil unsuitable for farming\n` +
    `- Soil emitting unusual chemical smell\n\n` +
    `🌾 3. Plant Health Descriptions\n` +
    `🟢 Healthy Plants\n` +
    `- Bright green leaves with strong stems\n` +
    `- Uniform growth and no visible damage\n` +
    `- Healthy root system and proper flowering\n` +
    `- Leaves free from spots or discoloration\n` +
    `- Vigorous growth with high yield potential\n\n` +
    `🟡 Early Stress\n` +
    `- Slight yellowing of lower leaves\n` +
    `- Mild wilting during daytime\n` +
    `- Slow growth compared to normal\n` +
    `- Minor leaf curling\n` +
    `- Slight discoloration on edges\n\n` +
    `🧪 Nutrient Deficiency\n` +
    `- Yellow leaves indicating nitrogen deficiency\n` +
    `- Purple tint due to phosphorus deficiency\n` +
    `- Brown leaf edges from potassium deficiency\n` +
    `- Stunted growth due to lack of nutrients\n` +
    `- Uneven leaf coloration\n\n` +
    `🦠 Disease Infected\n` +
    `- Leaf spots caused by fungal infection\n` +
    `- Powdery mildew on leaves\n` +
    `- Black patches indicating bacterial disease\n` +
    `- Rotting stems or roots\n` +
    `- Mosaic patterns on leaves\n\n` +
    `🐛 Pest Infested\n` +
    `- Holes in leaves from insects\n` +
    `- Sticky residue from aphids\n` +
    `- Visible larvae on plant surface\n` +
    `- Chewed stems and damaged buds\n` +
    `- Webbing from spider mites\n\n` +
    `🍎 4. Fruits Classification + Descriptions\n` +
    `🍓 Healthy Fruits\n` +
    `- Smooth skin with natural color\n` +
    `- Firm texture and no blemishes\n` +
    `- Proper size and ripeness\n` +
    `- Sweet aroma and good taste\n` +
    `- No signs of rot\n\n` +
    `⚠️ Damaged Fruits\n` +
    `- Bruised surface due to handling\n` +
    `- Overripe fruit with soft texture\n` +
    `- Cracked skin due to irregular watering\n` +
    `- Sunburn patches on surface\n` +
    `- Uneven ripening\n\n` +
    `🦠 Diseased Fruits\n` +
    `- Fungal spots on fruit skin\n` +
    `- Rotting from inside\n` +
    `- Black mold formation\n` +
    `- Discolored patches\n` +
    `- Fruit shrinkage\n\n` +
    `🐛 Pest Affected\n` +
    `- Holes from insects\n` +
    `- Larvae inside fruit\n` +
    `- Sticky residue outside\n` +
    `- Damaged seeds\n` +
    `- Bite marks on surface\n\n` +
    `🥕 5. Vegetables Classification + Descriptions\n` +
    `🟢 Healthy Vegetables\n` +
    `- Crisp texture and vibrant color\n` +
    `- Uniform shape and size\n` +
    `- No spots or decay\n` +
    `- Fresh smell and firmness\n` +
    `- Proper hydration\n\n` +
    `⚠️ Poor Quality\n` +
    `- Wilted leaves in leafy vegetables\n` +
    `- Soft spots indicating spoilage\n` +
    `- Uneven growth\n` +
    `- Bitter taste due to stress\n` +
    `- Cracks in root vegetables\n\n` +
    `🦠 Diseased\n` +
    `- Leaf blight symptoms\n` +
    `- Rotting base or stem\n` +
    `- Fungal growth\n` +
    `- Yellow patches\n` +
    `- Blackened edges\n\n` +
    `🐛 Pest Infested\n` +
    `- Holes in leaves\n` +
    `- Visible insects\n` +
    `- Sticky residue\n` +
    `- Damaged roots\n` +
    `- Leaf curling\n`;

  return header + summary + structure + description;
}

function isCropRelated(className: string): boolean {
  const lower = className.toLowerCase();
  return CROP_KEYWORDS.some((kw) => lower.includes(kw));
}

function detectCropFromVoice(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of CROP_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  for (const [localWord, englishCrop] of Object.entries(CROP_VOICE_MAP)) {
    if (lower.includes(localWord.toLowerCase())) return englishCrop;
  }
  return null;
}

function detectPlantTypeFromVoice(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [localWord, plantType] of Object.entries(PLANT_TYPE_MAP)) {
    if (lower.includes(localWord.toLowerCase())) return plantType;
  }
  return null;
}

function detectDiseaseFromVoice(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [localWord, diseaseType] of Object.entries(DISEASE_KEYWORDS)) {
    if (lower.includes(localWord.toLowerCase())) return diseaseType;
  }
  return null;
}

function normalizeLanguage(language: string): "en" | "kn" | "te" {
  if (language.startsWith("kn")) return "kn";
  if (language.startsWith("te")) return "te";
  return "en";
}

const LOCAL_CROP_NAMES: Record<string, { en: string; kn: string; te: string }> = {
  corn: { en: "corn", kn: "ಮೊಸರು ಜೋಳ", te: "మొక్కజొన్న" },
  wheat: { en: "wheat", kn: "ಗಂಧಿ", te: "గోధుమ" },
  rice: { en: "rice", kn: "ಭತ್ತ", te: "వరి" },
  tomato: { en: "tomato", kn: "ಟೊಮ್ಯಾಟೊ", te: "టమాటా" },
  potato: { en: "potato", kn: "ಆಲೂಗಡ್ಡೆ", te: "బంగాళాదుంప" },
  onion: { en: "onion", kn: "ಈರುಳ್ಳಿ", te: "ఉల్లిపాయ" },
  garlic: { en: "garlic", kn: "ಬೆಳ್ಳುಳ್ಳಿ", te: "వెల్లుల్లి" },
  sugarcane: { en: "sugarcane", kn: "ಕಬ್ಬು", te: "చెరకు" },
  cotton: { en: "cotton", kn: "ಹತ್ತಿ", te: "పత్తి" },
  mango: { en: "mango", kn: "మాబు", te: "మామిడి" },
  banana: { en: "banana", kn: "బಾಳೆಹಣ್ಣು", te: "అరటి" },
  grape: { en: "grape", kn: "ದ్రಾಕ್ಷి", te: "ద్రాక్ష" },
  pepper: { en: "pepper", kn: "మెಣసినకాయ్", te: "మిరపకాయ" },
  sunflower: { en: "sunflower", kn: "ಸೂರ್ಯಕಾಂತಿ", te: "పొద్దుతిరుగుడు" },
  groundnut: { en: "groundnut", kn: "ಶೇಂಗಾ", te: "వేరుశెనగ" },
  "pigeon pea": { en: "pigeon pea", kn: "ತೊಗರಿ", te: "కంది" },
  fruit: { en: "fruit", kn: "ಹಣ್ಣು", te: "ఫలం" },
  vegetable: { en: "vegetable", kn: "ತರಕಾರಿ", te: "కూరగాయ" },
  leaf: { en: "leafy crop", kn: "ಎಲೆ ತರಹದ ಬೆಳೆ", te: "ఆకు పంట" },
  plant: { en: "plant", kn: "ಸಸ್ಯ", te: "సಸ್ಯం" },
};

function getLocalizedCropName(crop: string, language: string): string {
  const normalized = normalizeLanguage(language);
  const lower = crop.toLowerCase();
  const mapping = LOCAL_CROP_NAMES[lower];
  if (mapping) return mapping[normalized];
  return crop;
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
  const [essay, setEssay] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    async (imageElement: HTMLImageElement, language: string = "en-US") => {
      setIsAnalyzing(true);
      setPredictions([]);
      setAdvice(null);
      setError(null);

      try {
        const model = await loadModel();
        const results = await model.classify(imageElement, 5);
        const cropResults: CropResult[] = results.map((result) => ({
          name: result.className,
          confidence: result.probability,
        }));
        setPredictions(cropResults);

        const topPrediction = cropResults[0]?.name || "unknown plant";
        const cropRelated = cropResults.filter((result) => isCropRelated(result.name));

        try {
          const response = await fetchBackendAdvice({
            crop: topPrediction,
            symptoms: cropRelated.map((result) => result.name),
            source: "image",
            transcript: topPrediction,
            language,
          });
          setAdvice(response.advice);
        } catch (backendError) {
          console.error("Backend advice fetch failed:", backendError);
          setAdvice(generateImageAdvice(topPrediction, cropRelated, language));
        }
      } catch (analysisError) {
        console.error("Image analysis failed:", analysisError);
        const message = "Failed to analyze image. Please try again with a clearer photo.";
        setError(message);
        setAdvice(message);
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
    setError(null);

    setTimeout(async () => {
      const detectedCrop = detectCropFromVoice(transcript);
      const detectedPlantType = detectedCrop ? null : detectPlantTypeFromVoice(transcript);
      const detectedDisease = detectDiseaseFromVoice(transcript);
      const symptoms = detectSymptoms(transcript);

          if (detectedCrop || detectedPlantType) {
        setPredictions([
          {
            name: getLocalizedCropName(detectedCrop || detectedPlantType!, language),
            confidence: 0.85,
          },
        ]);
      }

      const essayText = generateVoiceEssay(transcript, detectedCrop || detectedPlantType, symptoms, language, detectedDisease);
      setEssay(essayText);

      const soilHealth = detectSoilHealth(transcript);
      const plantHealth = detectPlantHealth(transcript, symptoms, detectedDisease);
      const cropType = detectCropType(detectedCrop || detectedPlantType, transcript);
      const classificationAdvice = generateClassificationAdvice(
        transcript,
        detectedCrop || detectedPlantType,
        soilHealth,
        plantHealth,
        cropType,
        language
      );

      setAdvice(classificationAdvice);
      setIsAnalyzing(false);
    }, 800);
  }, []);

  return { predictions, essay, advice, error, isAnalyzing, analyzeImage, analyzeVoice, modelLoaded, loadModel };
}

function generateVoiceEssay(
  transcript: string,
  detectedCrop: string | null,
  symptoms: string[],
  language: string,
  detectedDisease?: string | null
): string {
  const locale = normalizeLanguage(language);
  const cropName = detectedCrop ? getLocalizedCropName(detectedCrop, language) : null;
  const symptomPhrase = symptoms.length > 0 ? symptoms.join(", ") : null;
  const diseasePhrase = detectedDisease ? detectedDisease : null;

  if (cropName) {
    if (locale === "kn") {
      return `ನೀವು ಹೇಳಿದ್ದು: "${transcript}".
ಈ ಪಠ್ಯದಲ್ಲಿ ನಾವು ${cropName} haqida ಮಾತನಾಡುತ್ತಿದ್ದೇವೆ. ${diseasePhrase ? `ನೀವು ${diseasePhrase} ರೋಗದ ಲಕ್ಷಣಗಳನ್ನು ಉಲ್ಲೇಖಿಸಿದ್ದೀರಿ.` : "ಪೇಸ್ಟ್ನಲ್ಲಿರುವ ಸಮಸ್ಯೆಗಳಿಗೆ ಗಮನ ಸೆಳೆಯಲಾಗಿದೆ."} ${symptomPhrase ? `ಮುಖ್ಯ ಲಕ್ಷಣಗಳು: ${symptomPhrase}.` : "ಕೂಡಲಾಗಿ ಪರಿಸರ ಮತ್ತು ಮಣ್ಣಿನ ಸ್ಥಿತಿಯನ್ನು ಚೆಕ್ ಮಾಡಬೇಕು."}`;
    }

    if (locale === "te") {
      return `మీరు చెప్పారు: "${transcript}".
ఈ వివరణలో ${cropName} గురించి చర్చించారు. ${diseasePhrase ? `మీరు ${diseasePhrase} వ్యాధి లక్షణాలను పేర్కొన్నారు.` : "పంట పరిస్థితిపై శ్రద్ధ అవసరం."} ${symptomPhrase ? `ప్రధాన లక్షణాలు: ${symptomPhrase}.` : "మట్టిని మరియు నీటిని పరీక్షించండి."}`;
    }

    return `You said: "${transcript}".
This description appears to be about ${cropName}. ${diseasePhrase ? `You mentioned possible ${diseasePhrase}.` : "The plant condition should be checked carefully."} ${symptomPhrase ? `Key symptoms: ${symptomPhrase}.` : "Consider inspecting soil and moisture levels."}`;
  }

  if (locale === "kn") {
    return `ನೀವು ಹೇಳಿದ್ದು: "${transcript}".
ಈ ವಿವರಣೆಯಿಂದ ನಿರ್ದಿಷ್ಟವಾದ ಪಂಟನ್ನು ಗುರುತಿಸಲಾಗಿಲ್ಲ, ಆದರೆ ನಾವು ಕಾಣುವ ಕೆಲವು ಲಕ್ಷಣಗಳು ನಿಮ್ಮ ಬೆಳೆಗೆ ಸಾಮಾನ್ಯವಾದ ಸಮಸ್ಯೆಗಳನ್ನು ಸೂಚಿಸುತ್ತವೆ. ಹೆಚ್ಚಿನ ನಿಗಾವಳಿ ಮತ್ತು ಒಂದು ಸಮಗ್ರ ಉಪಸ್ಥಿತಿ ಪರಿಶೀಲನೆ ಮುಖ್ಯ.`;
  }

  if (locale === "te") {
    return `మీరు చెప్పారు: "${transcript}".
ఈ వివరణ నుండి ప్రత్యేకమైన పంటను గుర్తించడం మొదలయ్యలేదు, కానీ కొన్ని లక్షణాలు సాధారణ సమస్యలను సూచిస్తాయి. మరింత పరిశీలన మరియు సరైన పర్యవేక్షణ అవసరం.`;
  }

  return `You said: "${transcript}".
The description did not clearly identify one crop, but it suggests common plant issues that need careful review. Consider a full inspection of soil, water, and pests.`;
}

function generateImageAdvice(topPrediction: string, cropRelated: CropResult[], language: string): string {
  const locale = normalizeLanguage(language);
  const localizedCrop = getLocalizedCropName(topPrediction, language);
  const header = locale === "kn"
    ? `🌾 **ಕಂಡುಹಿಡಿದಿದೆ: ${localizedCrop}**\n\n📋 **ಶಿಫಾರಸುಗಳು:**\n\n`
    : locale === "te"
    ? `🌾 **గుర్తించబడింది: ${localizedCrop}**\n\n📋 **సిఫార్సులు:**\n\n`
    : `🌾 **Detected: ${localizedCrop}**\n\n📋 **Recommendations:**\n\n`;

  let advice = header;
  const lower = topPrediction.toLowerCase();

  if (lower.includes("corn") || lower.includes("maize")) {
    advice += locale === "kn"
      ? `• 1-1.5 ಇಂಚು ನೀರು ಪ್ರತಿ ವಾರ\n• ನೈಟ್ರೋಜನ್ ಸಮೃದ್ಧ ಎರೆವಿನ ಬಳಕೆ\n• ಉತ್ತಮ ಪರ pollination ಗೆ ಗುಂಪುಗಳಲ್ಲಿ ನೆಡಿಸಿ\n`
      : locale === "te"
      ? `• ప్రతి వారంలా 1-1.5 అంగుళాలు నీరు\n• నత్రజని సమృద్ధి ఎరువును ఉపయోగించండి\n• మంచి పర్యవేక్షణ కోసం గ్రూపులలో నాటండి\n`
      : `• **Watering:** 1-1.5 inches/week\n• **Soil:** pH 5.8-7.0\n• **Fertilizer:** Nitrogen-rich at knee-high stage\n• **Pests:** Watch for corn borers\n• **Tip:** Plant in blocks for better pollination\n`;
  } else if (lower.includes("wheat")) {
    advice += locale === "kn"
      ? `• 12-15 ಇಂಚು ನೀರು\n• ಲೋಮಿ ಮಣ್ಣು, pH 6.0-7.0\n• ರಸ್ಟ್‌ಗೆ ಗಮನಿಸಿ\n`
      : locale === "te"
      ? `• 12-15 అంగుళాలు నీరు\n• లోమీ నేలు, pH 6.0-7.0\n• రస్ట్‌ను పర్యవేక్షించండి\n`
      : `• **Watering:** 12-15 inches across season\n• **Soil:** Loamy, pH 6.0-7.0\n• **Fertilizer:** Phosphorus at sowing, nitrogen at tillering\n• **Disease:** Monitor for rust\n`;
  } else if (lower.includes("rice")) {
    advice += locale === "kn"
      ? `• 2-4 ಇಂಚು ನಿಂತ ನೀರು\n• ಮಣ್ಣು: ಕಲ್ಲು ಮಣ್ಣು ಅಥವಾ ಕಲ್ಲು-ಮಣ್ಣು\n• ಬೆಳವಣಿಗೆಯ ಹಂತಗಳಲ್ಲಿ ನೈಟ್ರೋಜನ್ ಹಂಚಿಕೆ\n`
      : locale === "te"
      ? `• 2-4 అంగుళాల నిలిచిన నీరు\n• నేలు: మట్టి లేదా మట్టి-లోమ్\n• వృద్ధి దశల్లో నత్రజని విడదీయండి\n`
      : `• **Watering:** 2-4 inches standing water\n• **Soil:** Clay or clay-loam\n• **Fertilizer:** Split nitrogen application\n• **Spacing:** 20x15 cm increases yield 20%\n`;
  } else if (lower.includes("tomato")) {
    advice += locale === "kn"
      ? `• 1-2 ಇಂಚು ನೀರು ಪ್ರತಿ ವಾರ\n• ಬೆಳೆ ಬೆಂಬಲಕ್ಕೆ ಕೇಜ್ ಅಥವಾ ಸ್ಟೇಕ್\n• ದೊಡ್ಡ ಹಣ್ಣುಗಳಿಗಾಗಿ ಪ್ರೂನಿಂಗ್\n`
      : locale === "te"
      ? `• ప్రతి వారంలా 1-2 అంగుళాలు నీరు\n• మద్దతు కోసం కేజీలు లేదా స్టేక్స్\n• పెద్ద పండ్ల కోసం ఫలాలను తొలగించండి\n`
      : `• **Watering:** 1-2 inches/week\n• **Soil:** pH 6.0-6.8\n• **Support:** Use cages or stakes\n• **Pruning:** Remove suckers for larger fruits\n`;
  } else if (lower.includes("potato")) {
    advice += locale === "kn"
      ? `• ಮಣ್ಣು ಹಗ್ಗ, pH 5.0-6.0\n• ಹಿಲ್ಲಿಂಗ್: ಸಸ್ಯದ ಸುತ್ತಲೂ ಮಣ್ಣನ್ನು ಎತ್ತಿ\n• ಎಲೆಗಳು ಸತ್ತಾಗ harvest ಮಾಡಿ\n`
      : locale === "te"
      ? `• నేల సడిలగా ఉండాలి, pH 5.0-6.0\n• హిల్లింగ్: మొక్క చుట్టూ మట్టిని ఎత్తండి\n• పిండి నొప్పి దగ్గర harvest చేయండి\n`
      : `• **Soil:** Loose, pH 5.0-6.0\n• **Hilling:** Mound soil around stems\n• **Harvest:** When foliage dies back\n`;
  } else {
    advice += locale === "kn"
      ? `• ಮಣ್ಣು pH ಮತ್ತು ಪೋಷಕಾಂಶಗಳನ್ನು ಪರೀಕ್ಷಿಸಿ\n• ನೀರು ಆಳವಾಗಿ ಆದರೆ ಕಡಿಮೆ\n• 2-3 ಇಂಚು ಮಲ್ಚ್ ಬಳಸಿ\n• ಬೆಳೆ ತಿರುಗಿಸಿ\n`
      : locale === "te"
      ? `• నేల పీహెచ్ మరియు పోషకాలను పరీక్షించండి\n• లోతుగా కానీ అరుదుగా నీరు ఇవ్వండి\n• 2-3 అంగుళాల మల్చ్ వాడండి\n• పంట రొటేషన్ చేయండి\n`
      : `• **Soil:** Test pH and nutrients regularly\n• **Watering:** Deep but infrequent\n• **Mulching:** 2-3 inches organic mulch\n• **Rotation:** Rotate crops yearly\n• **IPM:** Integrated pest management\n`;
  }

  return advice;
}

function generateCategoryVoiceAdvice(
  transcript: string,
  detectedCrop: string | null,
  symptoms: string[],
  language: string,
  detectedDisease?: string | null
): string | null {
  const locale = normalizeLanguage(language);
  const cl = detectedCrop?.toLowerCase() || "";

  if (cl.includes("leaf") || cl === "leaf") {
    return locale === "kn"
      ? `📋 **ಎಲೆಗಳ ಆರೈಕೆ:**\n• ಹಳದಿ ಅಥವಾ ಮಚ್ಚಿನ ಲಕ್ಷಣಗಳನ್ನು ಪರಿಶೀಲಿಸಿ\n• ನೀರನ್ನು ಸಮತೋಲವಾಗಿ ನೀಡಿ\n• ಗಾಳಿ ಸಂಚಾರವನ್ನು ಹೆಚ್ಚಿಸಿ\n\n`
      : locale === "te"
      ? `📋 **ఆకు సంరక్షణ:**\n• ఆకులపై పసుపు లేదా మచ్చలను పరిశీలించండి\n• సమతుల్యంగా నీరు ఇవ్వండి\n• గాలి ప్రవాహాన్ని మెరుగుపరచండి\n\n`
      : `📋 **Leaf care tips:**\n• Check for yellowing or spots on leaves\n• Water evenly and avoid overwatering\n• Improve airflow around foliage\n\n`;
  }

  if (cl.includes("fruit") || cl === "fruit") {
    return locale === "kn"
      ? `📋 **ಹಣ್ಣು ಬೆಳೆ ಸಲಹೆಗಳು:**\n• ಹಣ್ಣುಗಳ ಬೆಳವಣಿಗೆಗಾಗಿ ಸಮತೋಲನ ಪೋಷಣೆ ನೀಡಿ\n• ಕೀಟಗಳನ್ನು ನಿರಂತರವಾಗಿ ನೋಡಿಕೊಳ್ಳಿ\n• ಹಣ್ಣುಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಪರಿಶೀಲಿಸಿ\n\n`
      : locale === "te"
      ? `📋 **ఫలం పంట సూచనలు:**\n• పండ్లకు సరైన పోషకాలు ఇవ్వండి\n• కీటాలను పర్యవేక్షించండి\n• పండ్లను నియమితంగా పరిశీలించండి\n\n`
      : `📋 **Fruit crop tips:**\n• Feed for balanced fruit development\n• Monitor for pests on fruit clusters\n• Check fruit regularly for ripeness\n\n`;
  }

  if (cl.includes("vegetable") || cl === "vegetable") {
    return locale === "kn"
      ? `📋 **ತರಕಾರಿ ಸಲಹೆಗಳು:**\n• ಮಣ್ಣನ್ನು ಸಮೃದ್ಧವಾಗಿರಲಿ\n• ನೀರನ್ನು ನಿಯಮಿತವಾಗಿ ನೀಡಿ\n• ರೋಗ ಮತ್ತು ಕೀಟದ ನಿರ್ವಹಣೆ ಮಾಡಿ\n\n`
      : locale === "te"
      ? `📋 **కూరగాయల సూచనలు:**\n• నేలను సమృద్ధిగా ఉంచండి\n• నీటిని క్రమంగా ఇవ్వండి\n• pests మరియు వ్యాధులను నియంత్రించండి\n\n`
      : `📋 **Vegetable crop tips:**\n• Keep soil rich and fertile\n• Water on a regular schedule\n• Control pests and disease early\n\n`;
  }

  if (cl.includes("plant") || cl === "plant") {
    return locale === "kn"
      ? `📋 **ಸಸ್ಯದ ಆರೈಕೆ:**\n• ಬೆಳಕು ಮತ್ತು ನೀರನ್ನು ಸಮತೋಲನದಿಂದ ನೀಡಿ\n• ಸಸ್ಯವನ್ನು ನಿಯಮಿತವಾಗಿ ಪರಿಶೀಲಿಸಿ\n• ಗಾಳಿ ಹರಿವನ್ನು ಉತ್ತಮಗೊಳಿಸಿ\n\n`
      : locale === "te"
      ? `📋 **ప్లాంట్ కేర్:**\n• సరైన కాంతి మరియు నీటిని ఇవ్వండి\n• ప్లాంటును పరిశీలించండి\n• గాలి ప్రసారాన్ని మెరుగుపరచండి\n\n`
      : `📋 **Plant care tips:**\n• Provide balanced light and water\n• Inspect plants regularly\n• Improve airflow around growth\n\n`;
  }

  if (detectedCrop && !symptoms.length && detectedDisease) {
    return null;
  }

  return null;
}

function generateVoiceAdvice(
  transcript: string,
  detectedCrop: string | null,
  symptoms: string[],
  language: string,
  detectedDisease?: string | null
): string {
  const locale = normalizeLanguage(language);
  const localizedCrop = detectedCrop ? getLocalizedCropName(detectedCrop, language) : null;
  const label = locale === "kn" ? "ಕನ್ನಡ" : locale === "te" ? "తెలుగు" : "English";

  let advice = locale === "kn"
    ? `📢 **ನೀವು ಹೇಳಿದ್ದು (${label}):** "${transcript}"\n\n`
    : locale === "te"
    ? `📢 **మీరు చెప్పింది (${label}):** "${transcript}"\n\n`
    : `📢 **You said (${label}):** "${transcript}"\n\n`;

  if (localizedCrop) {
    advice += locale === "kn"
      ? `🌱 **ಗುರುತಿಸಿದ ಬೆಳೆ:** ${localizedCrop}\n\n`
      : locale === "te"
      ? `🌱 **గుర్తించిన పంట:** ${localizedCrop}\n\n`
      : `🌱 **Detected crop:** ${localizedCrop}\n\n`;

    const cl = detectedCrop!.toLowerCase();
    if (cl.includes("rice") || cl === "rice") {
      advice += locale === "kn"
        ? `📋 **ಭತ್ತದ ಶಿಫಾರಸುಗಳು:**\n• 2-4 ಇಂಚು ನಿಂತ ನೀರು\n• ಬೆಳವಣಿಗೆಯ ಹಂತಗಳಲ್ಲಿ ನೈಟ್ರೋಜನ್ ಹಂಚಿಕೆ\n• ರೋಟ್ ಬೋರರ್‌ಗಳು ಮತ್ತು ಎಲೆ ಫೋಲ್ಡರ್‌ಗಳಿಗೆ ಗಮನ\n\n`
        : locale === "te"
        ? `📋 **అన్నపు సిఫార్సులు:**\n• 2-4 అంగుళాల నిలిచిన నీరు\n• అభివృద్ధి దశల్లో నత్రజని విభజన\n• స్టెమ్ బోరర్లను గమనించండి\n\n`
        : `📋 **Rice recommendations:**\n• Maintain 2-4 inches standing water\n• Split nitrogen across growth stages\n• Watch for stem borers and leaf folders\n\n`;
    } else if (cl.includes("corn") || cl === "corn") {
      advice += locale === "kn"
        ? `📋 **ಮೆಕ್ಕೆಜೋಳದ ಶಿಫಾರಸುಗಳು:**\n• 1-1.5 ಇಂಚು ನೀರು\n• ನೈಟ್ರೋಜನ್ ಸಮೃದ್ಧ ಎರೆವು\n• ಗುಂಪುಗಳಲ್ಲಿ ನೆಡಿಸಿ pollination ಹೆಚ್ಚಿಸಲು\n\n`
        : locale === "te"
        ? `📋 **మొక్కజొన్న సిఫార్సులు:**\n• 1-1.5 అంగుళాలు నీరు\n• నైట్రోజన్ సమృద్ధి ఎరువు\n• గ్రూపులలో నాటండి\n\n`
        : `📋 **Corn recommendations:**\n• 1-1.5 inches water/week\n• Nitrogen-rich fertilizer at knee-high\n• Plant in blocks for pollination\n\n`;
    } else if (cl.includes("wheat")) {
      advice += locale === "kn"
        ? `📋 **ಗೋಧಿಯ ಶಿಫಾರಸುಗಳು:**\n• 12-15 ಇಂಚು ನೀರು\n• ರಸ್ಟ್‌ಗೆ ಗಮನಧರಿಸಿ\n\n`
        : locale === "te"
        ? `📋 **గోధుమ సిఫార్సులు:**\n• 12-15 అంగుళాలు నీరు\n• రస్ట్‌ను పర్యవేక్షించండి\n\n`
        : `📋 **Wheat recommendations:**\n• 12-15 inches water across season\n• Monitor for rust and powdery mildew\n\n`;
    } else if (cl.includes("pepper") || cl === "pepper") {
      advice += locale === "kn"
        ? `📋 **ಮೆಣಸಿನಕಾಯಿ ಶಿಫಾರಸುಗಳು:**\n• 1-2 ಇಂಚು ನೀರು per week\n• ಚೆನ್ನಾಗಿ ಹರಿದ ನೀರಿನ ವ್ಯವಸ್ಥೆ\n• ಕೀಟಗಳಿಗೆ ನಿರಂತರ ಪర్యವేక్షಣೆ\n\n`
        : locale === "te"
        ? `📋 **మిరపకాయ సిఫార్సులు:**\n• 1-2 అంగుళాలు నీరు\n• బాగా డ్రెయిన్డ్ నేల\n• కీటాల కోసం పర్యవేక్షించండి\n\n`
        : `📋 **Pepper recommendations:**\n• 1-2 inches water/week\n• Use well-drained soil\n• Watch for pests and diseases\n\n`;
    } else if (cl.includes("leaf") || cl === "leaf") {
      advice += locale === "kn"
        ? `📋 **ಎಲೆಗಳ ಆರೈಕೆ:**
• ಹಳದಿ ಅಥವಾ ಮಚ್ಚಿನ ಲಕ್ಷಣಗಳನ್ನು ಪರಿಶೀಲಿಸಿ
• ನೀರನ್ನು ಸಮತೋಲವಾಗಿ ನೀಡಿ
• ಗಾಳಿ ಸಂಚಾರವನ್ನು ಹೆಚ್ಚಿಸಿ

`
        : locale === "te"
        ? `📋 **ఆకు సంరక్షణ:**
• ఆకులపై పసుపు లేదా మచ్చలను పరిశీలించండి
• సమతుల్యంగా నీరు ఇవ్వండి
• గాలి ప్రవాహాన్ని మెరుగుపరచండి

`
        : `📋 **Leaf care tips:**
• Check for yellowing or spots on leaves
• Water evenly and avoid overwatering
• Improve airflow around foliage

`;
    } else {
      advice += locale === "kn"
        ? `📋 **ಸಾಮಾನ್ಯ ಶಿಫಾರಸುಗಳು:**\n• ಮಣ್ಣು ಪರೀಕ್ಷಿಸಿ\n• ಆಳವಾಗಿ ಆದರೆ ಕಡಿಮೆ ನೀರು\n• ಮಲ್ಚ್ ಬಳಸಿ\n\n`
        : locale === "te"
        ? `📋 **సాధారణ సిఫార్సులు:**\n• నేల పరీక్షించండి\n• లోతుగా కానీ అరుదుగా నీరు ఇవ్వండి\n• మల్చ్ ఉపయోగించండి\n\n`
        : `📋 **General recommendations:**\n• Test soil pH and nutrients\n• Water deeply but infrequently\n• Use organic mulch\n\n`;
    }
  } else {
    advice += locale === "kn"
      ? `ℹ️ ನಿಮ್ಮ ವಿವರಣೆಯಿಂದ ಸ್ಪಷ್ಟವಾದ ಬೆಳೆ ಗುರುತಿಸಲ್ಪಟ್ಟಿಲ್ಲ. ಸಾಮಾನ್ಯ ಸಲಹೆ ಕೆಳಕಂಡಂತಿದೆ:\n• ಮಣ್ಣು ಪರೀಕ್ಷಿಸಿ\n• ಪಯಿಂಟ್ ರೋಟೇಷನ್ ಮಾಡಿ\n• ಕೀಟ ನಿರ್ವಹಣೆ\n• ಆಳವಾದ ನೀರು\n`
      : locale === "te"
      ? `ℹ️ మీ వివరణ నుండి ప్రత్యేక పంట గుర్తింపు కాలేదు. సాధారణ సూచనలు:\n• నేల పరీక్షించండి\n• పంట బదిలీ చేయండి\n• కీటాల నియంత్రణ\n• లోతుగా నీరు\n`
      : `ℹ️ No clear crop detected from your description. General advice:\n• Test soil regularly\n• Rotate crops\n• Manage pests\n• Water deeply and less frequently\n`;
  }

  if (detectedDisease) {
    advice += locale === "kn"
      ? `🦠 **ರೋಗ ಗುರುತಿಸಲಾಗಿದೆ:** ${detectedDisease}\n`
      : locale === "te"
      ? `🦠 **రోగం గుర్తించబడింది:** ${detectedDisease}\n`
      : `🦠 **Disease detected:** ${detectedDisease}\n`;

    if (detectedDisease === "rust") {
      advice += locale === "kn"
        ? `• ಗಾಯಗೊಂಡ ಎಲೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ ಮತ್ತು ಗಾಳಿ ಸಲೀಸು ಮಾಡಿ\n`
        : locale === "te"
        ? `• పాడైన ఆకులను తీసేసి గాలి ప్రవాహాన్ని పెంచండి\n`
        : `• Remove affected leaves and improve air circulation\n`;
    } else if (detectedDisease === "blight") {
      advice += locale === "kn"
        ? `• ಆಕ್ರಮಿತ ಭಾಗಗಳನ್ನು ತೆಗೆದುಹಾಕಿ ಮತ್ತು ಆರ್ದ್ರತೆಯನ್ನು ಕಡಿಮೆ ಮಾಡಿ\n`
        : locale === "te"
        ? `• ప్రభావిత భాగాలను తీసివేసి తడి తగ్గించండి\n`
        : `• Remove infected parts and reduce humidity\n`;
    } else if (detectedDisease === "powdery mildew") {
      advice += locale === "kn"
        ? `• ಗಾಳಿ ಸುಲಭವಾಗಿ ಹರಿಯುವಂತೆ ಮಾಡಿ ಮತ್ತು ಪರಿಸರ ಶಾಖ ಸಂಪಾದಿಸಿ\n`
        : locale === "te"
        ? `• గాలి ప్రవాహాన్ని మెరుగు పరచండి మరియు తేమ తగ్గించండి\n`
        : `• Improve air circulation and reduce humidity\n`;
    } else if (detectedDisease === "leaf spot") {
      advice += locale === "kn"
        ? `• ಕೀಟ ಮತ್ತು ರೋಗ ನಿರೋಧಕ ವ್ಯವಹಾರಗಳನ್ನು ಅನುಸರಿಸಿ\n`
        : locale === "te"
        ? `• పురుగుల నియంత్రణ మరియు వ్యాధి నిరోధక చర్యలు పాటించండి\n`
        : `• Practice pest control and disease prevention\n`;
    } else if (detectedDisease === "wilt") {
      advice += locale === "kn"
        ? `• ಬೇರು ಶಕ್ತಿ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಹೆಚ್ಚು ನೀರಿನ ಮಿತಿಯನ್ನೊಡನೆ ಕಾಳಜಿ ವಹಿಸಿ\n`
        : locale === "te"
        ? `• వేరులు బలాన్ని తనిఖీ చేసి సరైన నీటిచర్య నిర్వహించండి\n`
        : `• Check root strength and manage water carefully\n`;
    }
  }

  if (symptoms.length > 0) {
    advice += locale === "kn"
      ? `🎯 **ಲಕ್ಷಣಗಳ ಆಧಾರದಲ್ಲಿ:**\n`
      : locale === "te"
      ? `🎯 **లక్షణాల ఆధారంగా:**\n`
      : `🎯 **Based on symptoms:**\n`;

    if (symptoms.includes("yellow") || symptoms.includes("wilting")) {
      advice += locale === "kn"
        ? `• ಹಳದಿ/ವಿಲ್ಟ್ → ನೀರು ಅಥವಾ ಪೋಷಕಾಂಶ ತೊಂದರೆ\n• ಡ್ರೆನೇಜ್ ಪರಿಶೀಲಿಸಿ\n`
        : locale === "te"
        ? `• పసుపు/వాంతు → నీరు లేదా పుష్కల పోషక లోపం\n• డ్రెయినేజ్ తనిఖీ చేయండి\n`
        : `• Yellowing/wilting may indicate overwatering or nutrient deficiency\n• Check drainage and soil health\n`;
    }
    if (symptoms.includes("pest")) {
      advice += locale === "kn"
        ? `• ಕೀಟಗಳು ಕಂಡುಬಂದಲ್ಲಿ ನೀಮ್ ಎಣ್ಣೆ ಅಥವಾ ಲಾಭದಾಯಕ ಕೀಟಗಳನ್ನು ಬಳಸಿ\n`
        : locale === "te"
        ? `• కీటాలు కనబడితే నీమ్ ఆయిల్ లేదా మంచి కీటాలను ఉపయోగించండి\n`
        : `• If pests are present, consider neem oil or beneficial insects\n`;
    }
    if (symptoms.includes("dry")) {
      advice += locale === "kn"
        ? `• ಒಣಗಿರುವ ಹವಾಮಾನ → ಮಲ್ಚ್ ಮತ್ತು ಡ್ರಿಪ್ ಇರಿಗೆಶನ್\n`
        : locale === "te"
        ? `• పొడి పరిస్థితి → మల్చ్ మరియు డ్రిప్ నీర్పాటు\n`
        : `• Dry conditions call for mulch and drip irrigation\n`;
    }
    if (symptoms.includes("growth")) {
      advice += locale === "kn"
        ? `• ನಿಧಾನ ಬೆಳವಣಿಗೆ → ಮಣ್ಣು ಮತ್ತು ಪೋಷಕಾಂಶವನ್ನು ಪರೀಕ್ಷಿಸಿ\n`
        : locale === "te"
        ? `• పెరుగుదల మెల్లగా ఉంటే → నేల మరియు పోషకాలను తనిఖీ చేయండి\n`
        : `• Slow growth may mean nutrient imbalance; test soil\n`;
    }
    if (symptoms.includes("disease")) {
      advice += locale === "kn"
        ? `• ರೋಗ ಲಕ್ಷಣಗಳು → ಬಾಧಿತ ಭಾಗಗಳನ್ನು ತೆಗೆದುಹಾಕಿ ಮತ್ತು ಗಾಳಿ ಸರಿಸು\n`
        : locale === "te"
        ? `• వ్యాధి లక్షణాలు → బాధిత భాగాలను తొలగించి గాలి మార్చండి\n`
        : `• Disease symptoms: remove affected parts and improve ventilation\n`;
    }
  }

  if (transcript) {
    advice += locale === "kn"
      ? `\n🔍 **ಟ್ರಾನ್ಸ್‍ಕ್ರಿಪ್ಟ್:** "${transcript}"\n`
      : locale === "te"
      ? `\n🔍 **ట్రాన్స్క్రిప్ట్:** "${transcript}"\n`
      : `\n🔍 Transcript: "${transcript}"\n`;
  }

  return advice;
}
