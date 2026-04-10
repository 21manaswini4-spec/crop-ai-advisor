import { Leaf, TrendingUp, Droplets, Sun, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CropResult {
  name: string;
  confidence: number;
}

interface CropResultsProps {
  predictions: CropResult[];
  advice: string | null;
  isAnalyzing: boolean;
}

export function CropResults({ predictions, advice, isAnalyzing }: CropResultsProps) {
  if (isAnalyzing) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <Leaf className="w-16 h-16 text-primary animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <p className="font-heading font-semibold text-foreground">Analyzing your crop...</p>
            <p className="text-sm text-muted-foreground">Using AI to identify and provide recommendations</p>
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
              Detected Crops
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.map((pred, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground capitalize">{pred.name}</span>
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

      {advice && (
        <Card className="border-accent/30 bg-secondary/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-heading">
              <TrendingUp className="w-5 h-5 text-accent" />
              Crop Advice & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap">
              {advice}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
