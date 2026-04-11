import express from "express";
import cors from "cors";

const app = express();
const port = 4000;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "CropSense backend is running" });
});

app.post("/api/advice", (req, res) => {
  const { crop, symptoms, source, transcript, language } = req.body;

  if (!source) {
    return res.status(400).json({ error: "source is required" });
  }

  const advice = generateAdvice({ crop, symptoms, source, transcript, language });
  return res.json({ advice });
});

app.use((err, _req, res, _next) => {
  console.error("Backend error:", err);
  res.status(500).json({ error: "Server error. Please try again later." });
});

app.listen(port, () => {
  console.log(`CropSense backend listening on http://localhost:${port}`);
});

function generateAdvice({ crop, symptoms = [], source, transcript = "", language = "en-US" }) {
  const sourceLabel = source === "image" ? "image" : "voice";
  const detected = crop ? crop : "a crop";
  let advice = `📄 Advice based on ${sourceLabel} input for ${detected}:\n\n`;

  if (crop) {
    const lower = crop.toLowerCase();
    if (lower.includes("corn") || lower.includes("maize")) {
      advice += `• Water 1-1.5 inches per week\n• Use nitrogen-rich fertilizer at knee-high stage\n• Plant in blocks for better pollination\n`;
    } else if (lower.includes("wheat")) {
      advice += `• Water 12-15 inches across season\n• Use loamy soil with pH 6.0-7.0\n• Watch for rust diseases\n`;
    } else if (lower.includes("rice")) {
      advice += `• Maintain 2-4 inches of standing water\n• Use clay to clay-loam soil\n• Split nitrogen application by growth stage\n`;
    } else if (lower.includes("tomato")) {
      advice += `• Water 1-2 inches per week\n• Support plants with stakes or cages\n• Prune suckers to improve fruit size\n`;
    } else {
      advice += `• Test soil pH and nutrients regularly\n• Water deeply but infrequently\n• Use mulching and crop rotation\n`;
    }
  } else {
    advice += `• No specific crop detected yet. Please provide a clearer photo or more details.\n`;
  }

  if (symptoms && symptoms.length > 0) {
    advice += `\n🎯 Symptoms observed:\n`;
    symptoms.forEach((symptom) => {
      const lower = symptom.toLowerCase();
      if (lower.includes("yellow")) {
        advice += `• Yellowing may indicate nutrient deficiency or watering issues.\n`;
      } else if (lower.includes("pest")) {
        advice += `• Pests detected: consider neem oil and beneficial insects.\n`;
      } else if (lower.includes("dry") || lower.includes("drought")) {
        advice += `• Dry conditions: increase mulch and consider drip irrigation.\n`;
      } else if (lower.includes("disease")) {
        advice += `• Disease signs: remove affected areas and improve airflow.\n`;
      } else {
        advice += `• ${symptom}: monitor and adjust crop care accordingly.\n`;
      }
    });
  }

  if (transcript) {
    advice += `\n🔍 Transcript note: "${transcript}"\n`;
  }

  return advice.trim();
}
