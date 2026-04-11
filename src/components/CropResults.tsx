import { Leaf, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CropResult {
  name: string;
  confidence: number;
}

interface CropResultsProps {
  predictions: CropResult[];
  essay?: string | null;
  advice: string | null;
  error?: string | null;
  isAnalyzing: boolean;
  language: string;
}

function normalizeLanguage(lang: string) {
  if (lang.startsWith("kn")) return "kn";
  if (lang.startsWith("te")) return "te";
  return "en";
}

// ✅ TRANSLATION FUNCTION
function translate(text: string | null, lang: string) {
  const normalized = normalizeLanguage(lang);
  if (!text) return "";

  const translations: any = {
    "Test soil pH and nutrients regularly": {
      en: "Test soil pH and nutrients regularly",
      kn: "ಮಣ್ಣಿನ pH ಮತ್ತು ಪೋಷಕಾಂಶಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಪರೀಕ್ಷಿಸಿ",
      te: "మట్టి pH మరియు పోషకాలను క్రమం తప్పకుండా పరీక్షించండి",
    },
    "Use nitrogen-rich fertilizers": {
      en: "Use nitrogen-rich fertilizers",
      kn: "ನೈಟ್ರೋಜನ್ ಸಮೃದ್ಧ ರಸಗೊಬ್ಬರಗಳನ್ನು ಬಳಸಿ",
      te: "నైట్రోజన్ సమృద్ధిగా ఉన్న ఎరువులు వాడండి",
    },
    "Ensure proper sunlight": {
      en: "Ensure proper sunlight",
      kn: "ಸರಿಯಾದ ಸೂರ್ಯಪ್ರಕಾಶವನ್ನು ಒದಗಿಸಿ",
      te: "సరైన సూర్యకాంతి అందించండి",
    },
  };

  let result = text;

  Object.keys(translations).forEach((key) => {
    if (text.includes(key)) {
      result = result.replace(key, translations[key][normalized]);
    }
  });

  return result;
}

const GROWTH_DURATION_WEEKS: Record<string, number> = {
  tomato: 10,
  potato: 14,
  onion: 16,
  garlic: 20,
  corn: 12,
  wheat: 18,
  rice: 16,
  banana: 48,
  mango: 52,
  grape: 50,
  pepper: 16,
  cucumber: 12,
  lettuce: 8,
  cabbage: 14,
  carrot: 16,
  soybean: 20,
  cotton: 25,
  sugarcane: 52,
  sunflower: 18,
  groundnut: 18,
  "pigeon pea": 16,
  strawberry: 14,
};

function getCropGrowthWeeks(crop: string): number {
  const key = crop.toLowerCase();
  return GROWTH_DURATION_WEEKS[key] ?? 18;
}

function getGrowthData(predictions: CropResult[]) {
  return predictions.map((prediction) => ({
    crop: prediction.name,
    value: Math.round(prediction.confidence * 100),
    weeks: getCropGrowthWeeks(prediction.name),
    months: Math.round((getCropGrowthWeeks(prediction.name) / 4) * 10) / 10,
  }));
}

function getGrowthSummary(predictions: CropResult[], language: string) {
  const data = getGrowthData(predictions);
  if (language.startsWith("kn")) {
    return `AI ಏಜೆಂಟ್ ವಿಶ್ಲೇಷಣೆ:
${data
      .map((entry) => `- ${entry.crop}: ${entry.value}% ವಿಶ್ವಾಸ ಮತ್ತು ${entry.weeks} ವಾರಗಳ ಬೆಳವಣಿಗೆ (ಸುಮಾರು ${entry.months} ತಿಂಗಳು)`)
      .join("\n")}

ಈ ವಿವರಗಳು ಆಳವಾದ ಕಾರಣಸ್ಸಹಿತವಾದ ಹವಮಾನ ಮತ್ತು ಬೆಳೆ ನಿಯಂತ್ರಣ ಸೂಚನೆಗಳನ್ನು ಸಹಿತವಾಗಿ ನಿಮ್ಮ ತೀರ್ಮಾನಕ್ಕಾಗಿ ಸಹಾಯ ಮಾಡುತ್ತವೆ.`;
  }
  if (language.startsWith("te")) {
    return `AI ఏజెంట్ విశ్లేషణ:
${data
      .map((entry) => `- ${entry.crop}: ${entry.value}% నమ్మకం మరియు ${entry.weeks} వారాల పెరుగుదల (~${entry.months} నెలలు)`)
      .join("\n")}

ఈ వివరాలు మీ వ్యవసాయ వ్యూహానికి ఒక స్పష్టమైన దారిదీపం ఇవ్వగలవు.`;
  }
  return `AI Agent analysis:
${data
    .map((entry) => `- ${entry.crop}: ${entry.value}% confidence and ${entry.weeks} weeks growth (~${entry.months} months)`)
    .join("\n")}

Use these estimates to plan your crop care, irrigation, and harvest timing.`;
}

export function CropResults({
  predictions,
  essay,
  advice,
  error,
  isAnalyzing,
  language,
}: CropResultsProps) {
  if (isAnalyzing) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <Leaf className="w-16 h-16 text-primary animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <p className="font-heading font-semibold text-foreground">
              {language === "kn"
                ? "ನಿಮ್ಮ ಬೆಳೆ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ..."
                : language === "te"
                ? "మీ పంట విశ్లేషణ జరుగుతోంది..."
                : "Analyzing your crop..."}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === "kn"
                ? "AI ಬಳಸಿ ಗುರುತಿಸಲಾಗುತ್ತಿದೆ"
                : language === "te"
                ? "AI ఉపయోగించి గుర్తిస్తోంది"
                : "Using AI to identify and provide recommendations"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (predictions.length === 0 && !advice) return null;

  return (
    <div className="space-y-4">
      {predictions.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-heading">
              <Leaf className="w-5 h-5 text-primary" />
              {language === "kn"
                ? "ಗುರುತಿಸಿದ ಬೆಳೆಗಳು"
                : language === "te"
                ? "గుర్తించిన పంటలు"
                : "Detected Crops"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.map((pred, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground capitalize">
                    {pred.name}
                  </span>
                  <span className="text-sm font-heading font-semibold text-primary">
                    {(pred.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${pred.confidence * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-heading">
              <TrendingUp className="w-5 h-5 text-accent" />
              {language.startsWith("kn")
                ? "ಬೆಳೆ ಬೆಳವಣಿಗೆ ಅಂದಾಜು"
                : language.startsWith("te")
                ? "పంట పెరుగుదల అంచనాలు"
                : "Growth Time Estimates"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {getGrowthData(predictions).map((entry) => (
              <div key={entry.crop} className="rounded-xl border border-border/50 bg-background/80 p-4">
                <p className="text-sm font-semibold text-foreground">{entry.crop}</p>
                <p className="text-xs text-muted-foreground">
                  {language.startsWith("kn")
                    ? `ಅಂದಾಜು ಬೆಳವಣಿಗೆ: ${entry.weeks} ವಾರಗಳು (~${entry.months} ತಿಂಗಳು)`
                    : language.startsWith("te")
                    ? `అంచనా పెరుగుదల: ${entry.weeks} వారం (~${entry.months} నెలలు)`
                    : `Estimated growth: ${entry.weeks} weeks (~${entry.months} months)`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <Card className="border-accent/30 bg-secondary/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-heading">
              <TrendingUp className="w-5 h-5 text-accent" />
              {language.startsWith("kn")
                ? "LLM ಬೆಳವಣಿಗೆ ಸಾರಾಂಶ"
                : language.startsWith("te")
                ? "LLM వృద్ధి సంగ్రహం"
                : "LLM Growth Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap">
              {getGrowthSummary(predictions, language)}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-heading text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {language.startsWith("kn")
                ? "ದೋಷ"
                : language.startsWith("te")
                ? "లోపం"
                : "Error"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {essay && (
        <Card className="border-accent/30 bg-secondary/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-heading">
              <TrendingUp className="w-5 h-5 text-accent" />
              {language.startsWith("kn")
                ? "LLM ಏಜೆಂಟ್ ವಿವರಣೆ"
                : language.startsWith("te")
                ? "LLM ఏజెంట్ వివరణ"
                : "LLM Agent Explanation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap">
              {translate(essay, language)}
            </div>
          </CardContent>
        </Card>
      )}

      {advice && (
        <Card className="border-accent/30 bg-secondary/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-heading">
              <TrendingUp className="w-5 h-5 text-accent" />
              {language.startsWith("kn")
                ? "ವರ್ಗೀಕರಣ ಸಾರಾಂಶ"
                : language.startsWith("te")
                ? "వర్గీకరణ సారాంశం"
                : "Classification Summary & Structure"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap">
              {translate(advice, language)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}