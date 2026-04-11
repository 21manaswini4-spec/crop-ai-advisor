import json
import os
import urllib.error
import urllib.request

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AdviceRequest(BaseModel):
    crop: Optional[str] = None
    symptoms: List[str] = []
    source: str
    transcript: Optional[str] = None
    language: Optional[str] = "en-US"

class AdviceResponse(BaseModel):
    advice: str

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")


def detect_plant_type(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    lower = text.lower()
    plant_types = {
        "fruit": ["fruit", "fruits", "ಹಣ್ಣು", "హಣ್ಣು", "పండు", "పండ్లు"],
        "vegetable": ["vegetable", "vegetables", "ತರಕಾರಿ", "కూరగాయ", "కూరగాయలు"],
        "leaf": ["leaf", "leafy", "ಎಲೆ", "ఎలె", "ఆకు", "ఆకులు"],
        "plant": ["plant", "plants", "crop", "crops", "ಸಸ್ಯ", "ప్లాంట్"],
    }
    for plant_type, keywords in plant_types.items():
        if any(keyword in lower for keyword in keywords):
            return plant_type
    return None


def detect_disease(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    lower = text.lower()
    disease_map = {
        "rust": ["rust", "ರಸ್ಟ್", "రస్ట్"],
        "blight": ["blight", "బ్లైట్", "ಬ್ಲೈಟ್"],
        "powdery mildew": ["powdery", "mildew", "ಮೈಲ్డ್ಯೂ", "మైల్డ్"],
        "leaf spot": ["spot", "spots", "స్పాట్", "స్పాట్", "ಸ್ಪಾಟ್"],
        "rot": ["rot", "ರೋಟ್", "రోట్"],
        "wilt": ["wilt", "wilting", "వాంతు", "వాడిపో"],
        "yellowing": ["yellow", "yellowing", "ಹಳದಿ", "పసుపు"],
        "pest": ["pest", "insect", "bug", "worm", "ಕೀಟ", "పురుగు"],
    }
    for disease_type, keywords in disease_map.items():
        if any(keyword in lower for keyword in keywords):
            return disease_type
    return None


def localize_text(locale: str, en: str, kn: str, te: str) -> str:
    if locale == "kn":
        return kn
    if locale == "te":
        return te
    return en


def call_openai(prompt: str) -> str:
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not configured.")

    url = f"{OPENAI_API_BASE}/chat/completions"
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful agricultural advisor that provides crop growth estimates and care recommendations."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 500,
    }
    request_data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}",
    }
    req = urllib.request.Request(url, data=request_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            response_text = resp.read().decode("utf-8")
            response_json = json.loads(response_text)
            return response_json["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as http_err:
        error_body = http_err.read().decode("utf-8")
        raise RuntimeError(f"OpenAI request failed: {http_err.code} {http_err.reason} - {error_body}")
    except Exception as exc:
        raise RuntimeError(f"OpenAI request failed: {exc}")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "CropSense Python backend is running"}

@app.post("/api/advice", response_model=AdviceResponse)
def advice(request: AdviceRequest):
    if not request.source:
        raise HTTPException(status_code=400, detail="source is required")

    local_advice = generate_advice(
        crop=request.crop,
        symptoms=request.symptoms,
        source=request.source,
        transcript=request.transcript,
        language=request.language,
    )

    if OPENAI_API_KEY:
        prompt = (
            "You are an agricultural advisor. Provide a concise, friendly response "
            "about crop care, disease treatment, and growth expectations based on the "
            "following details. Use Kannada or Telugu only if the input language is not English.\n\n"
            f"Crop: {request.crop or 'unknown'}\n"
            f"Symptoms: {', '.join(request.symptoms) if request.symptoms else 'none'}\n"
            f"Detected transcript: {request.transcript or 'none'}\n"
            f"Source: {request.source}\n"
            f"Language: {request.language or 'en-US'}\n"
            f"Existing local advice:\n{local_advice}"
        )
        try:
            ai_advice = call_openai(prompt)
            return {"advice": ai_advice}
        except Exception:
            return {"advice": local_advice}

    return {"advice": local_advice}


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Server error. Please try again later."})


def generate_advice(crop: Optional[str], symptoms: List[str], source: str, transcript: Optional[str], language: Optional[str]) -> str:
    locale = "kn" if language and language.startswith("kn") else "te" if language and language.startswith("te") else "en"
    source_label = "image" if source == "image" else "voice"
    if locale == "kn":
        source_label = "ಚಿತ್ರ" if source == "image" else "ಧ್ವನಿ"
    elif locale == "te":
        source_label = "చిత్రం" if source == "image" else "శబ్దం"

    plant_type = None if crop else detect_plant_type(transcript)
    disease = detect_disease(transcript)
    detected = crop or plant_type or localize_text(locale, "a crop", "ಒಂದು ಬೆಳೆ", "ఒక పంట")
    advice_lines = [
        localize_text(locale,
            f"📄 Advice based on {source_label} input for {detected}:",
            f"📄 {source_label} ಆಧಾರದ ಮೇಲೆ {detected} ಗೆ ಪರಿಹಾರ:",
            f"📄 {source_label} ఆధారంగా {detected} కోసం సలహా:",
        ),
        "",
    ]

    if crop:
        lower = crop.lower()
        if "corn" in lower or "maize" in lower:
            advice_lines.extend([
                localize_text(locale,
                    "• Water 1-1.5 inches per week",
                    "• ಪ್ರತಿ ವಾರ 1-1.5 ಇಂಚು ನೀರು",
                    "• ప్రతి వారానికి 1-1.5 అంగుళాలు నీరు",
                ),
                localize_text(locale,
                    "• Use nitrogen-rich fertilizer at knee-high stage",
                    "• ಮೊಣಕಾಲಿನ ಹಂತದಲ್ಲಿ ನೈಟ್ರೋಜನ್ ಸಮೃದ್ಧ ರಸಗೊಬ್ಬರ ಬಳಸಿರಿ",
                    "• మోకాళ్లు పొడవైన దశలో నైట్రోజన్ సంతులిత ఎరువును ఉపయోగించండి",
                ),
                localize_text(locale,
                    "• Plant in blocks for better pollination",
                    "• ಉತ್ತಮ ಪರ pollination ಗೆ ಗುಂಪುಗಳಲ್ಲಿ ನೆಡಿಸಿ",
                    "• మంచి పొలినేషన్ కోసం బ్లాక్‌లలో నాటండి",
                ),
            ])
        elif "wheat" in lower:
            advice_lines.extend([
                localize_text(locale,
                    "• Water 12-15 inches across season",
                    "• ಋತುವಿನ ಅವಧಿಯಲ್ಲಿ 12-15 ಇಂಚು ನೀರು",
                    "• సమస్త కాలంలో 12-15 అంగుళాలు నీరు",
                ),
                localize_text(locale,
                    "• Use loamy soil with pH 6.0-7.0",
                    "• pH 6.0-7.0 ಇರುವ ಲೋಮಿ ಮಣ್ಣು ಬಳಸಿ",
                    "• pH 6.0-7.0 కలిగిన లోమీ నేల ఉపయోగించండి",
                ),
                localize_text(locale,
                    "• Watch for rust diseases",
                    "• ರಸ್ಟ್ ರೋಗಗಳಿಗೆ ಗಮನಹರಿಸಿ",
                    "• రస్ట్ వ్యాధులపై పర్యవేక్షించండి",
                ),
            ])
        elif "rice" in lower:
            advice_lines.extend([
                localize_text(locale,
                    "• Maintain 2-4 inches of standing water",
                    "• 2-4 ಇಂಚು ನಿಂತ ನೀರನ್ನು ಇಡಿ",
                    "• 2-4 అంగుళాల నిలిచిన నీటిని ఉంచండి",
                ),
                localize_text(locale,
                    "• Use clay or clay-loam soil",
                    "• ಚಿಲ್ಲಿ ಅಥವಾ ಚಿಲ್ಲಿ-ಲೋಮ್ ಮಣ್ಣನ್ನು ಬಳಸಿ",
                    "• మట్టి లేదా మట్టి-లోమ్ నేల ఉపయోగించండి",
                ),
                localize_text(locale,
                    "• Split nitrogen application by growth stage",
                    "• ಬೆಳವಣಿಗೆ ಹಂತಗಳ ಮೂಲಕ ನೈಟ್ರೋಜನ್ ಅನ್ವಯವನ್ನು ಹಂಚಿ",
                    "• వృద్ధి దశల ద్వారా నైట్రోజన్ అప్లికేషన్‌ను విభజించండి",
                ),
            ])
        elif "tomato" in lower:
            advice_lines.extend([
                localize_text(locale,
                    "• Water 1-2 inches per week",
                    "• ಪ್ರತಿ ವಾರ 1-2 ಇಂಚು ನೀರು",
                    "• ప్రతి వారానికి 1-2 అంగుళాలు నీరు",
                ),
                localize_text(locale,
                    "• Support plants with stakes or cages",
                    "• ಸ್ತೇಕ್ ಅಥವಾ ಪಂಜೆಯನ್ನು ಬಳಸಿ ಬೆಳೆ ಬೆಂಬಲಿಸಿ",
                    "• స్టేక్స్ లేదా కెஜీలతో మొక్కలను మద్దతు ఇవ్వండి",
                ),
                localize_text(locale,
                    "• Prune suckers to improve fruit size",
                    "• ಹಣ್ಣು ಗಾತ್ರ ಹೆಚ್ಚಿಸಲು ಸಕ್ಕರ್‍ಗಳನ್ನು ಪ್ರೂನ್ ಮಾಡಿ",
                    "• పండ్ల పరిమాణాన్ని మెరుగుపరచడానికి సకర్‌లను ట్రిమ్ చేయండి",
                ),
            ])
        elif "vegetable" in lower:
            advice_lines.extend([
                localize_text(locale,
                    "• Keep the vegetable soil moist and rich in nutrients",
                    "• ತರಕಾರಿ ಮಣ್ಣು ತೇವಗೊಳಿಸಿ ಮತ್ತು ಪೋಷಕಾಂಶದಲ್ಲಿ ಶ್ರೀಮಂತವಾಗಿರಲಿ",
                    "• కూరగాయ మట్టిని తడి గా మరియు పోషకాలలో ధన్యంగా ఉంచండి",
                ),
                localize_text(locale,
                    "• Mulch around the base to retain moisture",
                    "• ತೇವವನ್ನು ಕಾಪಾಡಲು ಮೂಲದ ಸುತ್ತಲೂ ಮಲ್ಚ್ ಮಾಡಿ",
                    "• ఒత్తిడి నిల్వ చేసేందుకు పునర్జననం చుట్టూ చేయండి",
                ),
                localize_text(locale,
                    "• Inspect leaves regularly for pests and disease",
                    "• ಕೀಟ ಮತ್ತು ರೋಗಗಳಿಗೆ ಎಲೆಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಪರಿಶೀಲಿಸಿ",
                    "• కీటకాలు మరియు వ్యాధుల కోసం ఆకులను తరచుగా తనిఖీ చేయండి",
                ),
            ])
        elif "fruit" in lower:
            advice_lines.extend([
                localize_text(locale,
                    "• Feed with balanced fruit fertilizer",
                    "• ಸಮತೋಲಿತ ಹಣ್ಣಿನ ಎರೆವು ನೀಡಿ",
                    "• సమతుల్యమైన పండు ఎరువును ఇవ్వండి",
                ),
                localize_text(locale,
                    "• Ensure good sunlight and regular watering",
                    "• ಉತ್ತಮ ಬೆಳಕು ಮತ್ತು ನಿಯಮಿತ ನೀರು ಖಚಿತಪಡಿಸಿ",
                    "• మంచి సూర్యరశ్మి మరియు పర్యావృత నీరుపై దృష్టి పెట్టండి",
                ),
                localize_text(locale,
                    "• Remove damaged fruit and thin crowded branches",
                    "• ಹಾನಿಗೊಂಡ ಹಣ್ಣುಗಳನ್ನು ತೆಗೆದುಹಾಕಿ ಮತ್ತು ಸೇರಿಕೊಂಡ ಶಾಖಗಳನ್ನು ತೆಗ್ಗಿಸಿ",
                    "• దెబ్బతిన్న పండ్లను తీసివేస్తూ ఎక్కబడిన కొమ్ములను పక్కాగా తగ్గించండి",
                ),
            ])
        elif "leaf" in lower:
            advice_lines.extend([
                localize_text(locale,
                    "• Leafy crops need even watering and shade during heat",
                    "• ಎಲೆ ಬೆಳೆಗಳಿಗೆ ತಾಪಮಾನದಲ್ಲಿ ಸಮತೋಲಿತ ನೀರಾವರಿ ಹಾಗೂ ನೆರಾವಳಿ ಅಗತ್ಯ",
                    "• ఆకుల పంటలకు వేడిలో సమానంగా నీరు మరియు నీడ అవసరం",
                ),
                localize_text(locale,
                    "• Use nitrogen-rich fertilizers for strong foliage",
                    "• ಬಲವಾದ ಎಲೆಗಾಗಿ ನೈಟ್ರೋಜನ್ ಸಮೃದ್ಧ ರಸಗೊಬ್ಬರ ಬಳಸಿ",
                    "• బలమైన ఆకుల కోసం నైట్రోజన్ సమృద్ధి ఎరువులు ఉపయోగించండి",
                ),
                localize_text(locale,
                    "• Harvest young leaves before they harden",
                    "• ಎಲೆಗಳು ಕಠಿಣವಾಗುವ ಮೊದಲು 젊ಗಿ ಕಾಯಿ",
                    "• ఆకులు గట్టి కాక ముందే పండించండి",
                ),
            ])
        else:
            advice_lines.extend([
                localize_text(locale,
                    "• Test soil pH and nutrients regularly",
                    "• ಮಣ್ಣಿನ pH ಮತ್ತು ಪೋಷಕಾಂಶಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಪರೀಕ್ಷಿಸಿ",
                    "• నేల pH మరియు పోషకాలను తరచూ పరీక్షించండి",
                ),
                localize_text(locale,
                    "• Water deeply but infrequently",
                    "• ಆಳವಾಗಿ ಆದರೆ ಅಪರೂಪವಾಗಿ ನೀರು ನೀಡಿರಿ",
                    "• లోతుగా కానీ అరుదుగా నీరు ఇవ్వండి",
                ),
                localize_text(locale,
                    "• Use mulching and crop rotation",
                    "• ಮಲ್ಚಿಂಗ್ ಮತ್ತು ಬೆಳೆ ತಿರುಗಿಸುವಿಕೆ ಬಳಸಿ",
                    "• మల్చింగ్ మరియు పంట రొటేషన్ ఉపయోగించండి",
                ),
            ])
    elif plant_type:
        advice_lines.append(localize_text(locale,
            f"• Detected plant type: {plant_type}",
            f"• ಕಂಡುಹಿಡಿದ ಸಸ್ಯ ತರಹ: {plant_type}",
            f"• గుర్తించిన పంట రకం: {plant_type}",
        ))
        if plant_type == "fruit":
            advice_lines.extend([
                localize_text(locale,
                    "• Focus on fruit quality: balanced fertilizer and stable irrigation",
                    "• ಹಣ್ಣು ಗುಣಮಟ್ಟದ ಮೇಲೆ ಗಮನಹರಿಸಿ: ಸಮತೋಲಿತ ರಸಗೊಬ್ಬರ ಮತ್ತು ಸ್ಥಿರ ನೀರಾವರಿ",
                    "• పండు నాణ్యతపై దృష్టి పెట్టండి: సమతుల్య ఎరువులు మరియు స్థిర నీటివ్వడం",
                ),
                localize_text(locale,
                    "• Protect from pests and prune weak shoots",
                    "• ಕೀಟಗಳಿಂದ ರಕ್ಷಿಸಿ ಮತ್ತು ದುರ್ಬಲ ಕೊಂಬುಗಳನ್ನು ಪ್ರೂನ್ ಮಾಡಿ",
                    "• కీటకాలు నుండి రక్షించండి మరియు బలహೀನ కొమ్ములను ట్రిమ్ చేయండి",
                ),
                localize_text(locale,
                    "• Harvest when fruit reaches full size and colour",
                    "• ಹಣ್ಣು ಪೂರ್ಣ ಗಾತ್ರ ಮತ್ತು ಬಣ್ಣ ತಲುಪಿದಾಗ harvest ಮಾಡಿ",
                    "• పండు పూర్తి పరిమాణం మరియు రంగు చేరినప్పుడు పండించండి",
                ),
            ])
        elif plant_type == "vegetable":
            advice_lines.extend([
                localize_text(locale,
                    "• Keep vegetables well-watered and fed with compost",
                    "• ತರಕಾರಿಗಳನ್ನು ಚೆನ್ನಾಗಿ ನೀರಾವರಿ ಮಾಡಿ ಮತ್ತು ಕಾಂಪೋಸ್ಟ್ ನೀಡಿರಿ",
                    "• కూరగాయలను నీరు ఇస్తూ మరియు కంపోస్ట్‌తో పోషించండి",
                ),
                localize_text(locale,
                    "• Use mulch to preserve soil moisture",
                    "• ಮಣ್ಣಿನ ತೇವವನ್ನು ಉಳಿಸಲು ಮಲ್ಪ್ ಬಳಸಿ",
                    "• నేల తేమను నిలుపుకోవడానికి మల్చ్ వాడండి",
                ),
                localize_text(locale,
                    "• Check leaves for pests and fungal spots",
                    "• ಕೀಟ ಹಾಗೂ ಫಂಗಸ್ ಸ್ತ್ರೀಗಳುಗಾಗಿ ಎಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
                    "• ఆకులు pests మరియు ఫంగల్ మచ్చలు కోసం తనిఖీ చేయండి",
                ),
            ])
        elif plant_type == "leaf":
            advice_lines.extend([
                localize_text(locale,
                    "• Leaf crops need regular moisture and plenty of nutrients",
                    "• ಎಲೆ ಬೆಳೆಗಳಿಗೆ ನಿಯಮಿತ ತೇವ ಮತ್ತು ಸಾಕಷ್ಟು ಪೋಷಕಾಂಶಗಳು ಬೇಕು",
                    "• ఆకుల పంటలకు తరచుగా తేమ మరియు పోషకాలు అవసరం",
                ),
                localize_text(locale,
                    "• Avoid long dry spells and harvest before leaves yellow",
                    "• ದೊಡ್ಡ ಒಣ ಸಮಯವನ್ನು ತಪ್ಪಿಸಿ ಮತ್ತು ಎಲೆಗಳು ಹಳದಿ ಆಗುವ ಮೊದಲು harvest ಮಾಡಿ",
                    "• పొడవైన పొడి సమయాలను నివారించండి మరియు ఆకులు పసుపు కాక ముందు కోయండి",
                ),
                localize_text(locale,
                    "• Keep good airflow and remove damaged leaves",
                    "• ಉತ್ತಮ ಗಾಳಿ ಹರಿವು ಇಡಿ ಮತ್ತು ಹಾಳಾದ ಎಲೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ",
                    "• మంచి గాలి ప్రవాహం ఉంచండి మరియు పాడైన ఆకులను తీసివేయండి",
                ),
            ])
        else:
            advice_lines.extend([
                localize_text(locale,
                    "• Keep the plant healthy with balanced nutrition and proper watering",
                    "• ಸಸ್ಯವನ್ನು ಸಮತೋಲಿತ ಪೋಷಣೆ ಮತ್ತು ಸರಿಯಾದ ನೀರಾವರಿಯಿಂದ ಆರೋಗ್ಯಕರವಾಗಿ ಇಡಿ",
                    "• మొక్కను సమతుల్య పోషణ మరియు సరైన నీటివ్వడితో ఆరోగ్యంగా ఉంచండి",
                ),
                localize_text(locale,
                    "• Identify the crop type for more targeted care",
                    "• ಹೆಚ್ಚು ಲಕ್ಯಿತ ಆರೈಕೆಗಾಗಿ ಬೆಳೆ ಪ್ರಕಾರವನ್ನು ಗುರುತಿಸಿ",
                    "• లక్ష్యపూరిత శ్రద్ధ కోసం పంట రకాన్ని గుర్తించండి",
                ),
                localize_text(locale,
                    "• Avoid overwatering and encourage good drainage",
                    "• ತುಂಬಿ ನೀರು ಹಾಕದಿರಿ ಮತ್ತು ಉತ್ತಮDrainage ಗೆ ಉತ್ತೇಜಿಸಿ",
                    "• Excess నీటిని నివారించండి మరియు మంచి డ్రేనేజ్‌ను ప్రోత్సహించండి",
                ),
            ])
    else:
        advice_lines.append(localize_text(locale,
            "• No specific crop detected yet. Please provide a clearer photo or more details.",
            "• ಇನ್ನೂ ನಿರ್ದಿಷ್ಟ ಬೆಳೆ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟ ಫೋಟೋ ಅಥವಾ ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ಒದಗಿಸಿ.",
            "• ఇంకా నిర్దిష్ట పంట గుర్తింపు లేదు. దయచేసి స్పష్టమైన ఫోటో లేదా మరింత వివరాలు అందించండి.",
        ))

    if disease:
        advice_lines.append("")
        advice_lines.append(localize_text(locale,
            f"🦠 Disease detected: {disease}",
            f"🦠 ರೋಗ ಕಂಡುಹಿಡಿದು: {disease}",
            f"🦠 వ్యాధి గుర్తించబడింది: {disease}",
        ))
        if disease == "rust":
            advice_lines.extend([
                localize_text(locale,
                    "• Remove affected leaves and improve airflow.",
                    "• ప్రభಾವಿತ ಎಲೆಗಳನ್ನು ತೆಗೆದು ಗಾಳಿಗುಣ ಹೆಚ್ಚಿಸಿ.",
                    "• ప్రభావిత ఆకులను తీసివేసి గాలి ప్రసారంను మెరుగుపరచండి.",
                ),
                localize_text(locale,
                    "• Avoid overhead watering and use a fungicide if needed.",
                    "• ಮೇಲ್ಭಾಗದ ನೀರಾವರಿಯನ್ನು ತಪ್ಪಿಸಿ ಮತ್ತು ಬೇಕಾದರೆ ಫಂಗಿಸೈಡ್ ಬಳಸಿ.",
                    "• ఎటువంటి అతి పై వరుసలో నీటివ్వకండి మరియు అవసరమైతే ఫంగిసైడ్ ఉపయోగించండి.",
                ),
            ])
        elif disease == "blight":
            advice_lines.extend([
                localize_text(locale,
                    "• Remove infected foliage immediately.",
                    "• ಸೋಂಕಾಗಿದ ಎಲೆಗಳನ್ನು ತಕ್ಷಣ ತೆಗೆದುಹಾಕಿ.",
                    "• సోకిన ఆకులను తక్షణమే తీసి వేయండి.",
                ),
                localize_text(locale,
                    "• Maintain good spacing and avoid wet leaves.",
                    "• ಉತ್ತಮ ಜಾಗವನ್ನು ಕಾಯ್ದುಕೊಳ್ಳಿ ಮತ್ತು ತೇವದ ಎಲೆಗಳನ್ನು ತಪ್ಪಿಸಿ.",
                    "• మంచి అంతరం ఉంచండి మరియు తడి ఆకులను దూరంగా పెట్టండి.",
                ),
            ])
        elif disease == "powdery mildew":
            advice_lines.extend([
                localize_text(locale,
                    "• Improve airflow and reduce humidity around plants.",
                    "• ಗುದ್ದಲೆಯನ್ನು ಉತ್ತಮಗೊಳಿಸಿ ಮತ್ತು ಸಸ್ಯಗಳ ಸುತ್ತಲಿನ ತೇವತೆಯನ್ನು ಕಡಿಮೆಮಾಡಿ.",
                    "• మొక్కల చుట్టూ గాలి ప్రసారాన్ని మెరుగుపరచండి మరియు తేమను తగ్గించండి.",
                ),
                localize_text(locale,
                    "• Apply a milk spray or fungicide for powdery mildew.",
                    "• ಪುಡಿ ಗಿಡಬೀಳಿಗೆ ಹಾಲಿನ ಸ್ಪ್ರೇ ಅಥವಾ ಫಂಗಿಸೈಡ್ ವ್ಹರಿಸಿ.",
                    "• పొడిసారుకి పాలు స్ప్రే లేదా ఫంగిసైడ్ అప్లై చేయండి.",
                ),
            ])
        elif disease == "leaf spot":
            advice_lines.extend([
                localize_text(locale,
                    "• Remove affected leaves and keep the area dry.",
                    "• ಪರಿಣಾಮಿತ ಎಲೆಗಳನ್ನು ತೆಗೆದು ಪ್ರದೇಶವನ್ನು ಒಣಗಿಡಿ.",
                    "• ప్రభావిత ఆకులను తీసి ప్రాంతాన్ని పొడి ఉంచండి.",
                ),
                localize_text(locale,
                    "• Use copper-based spray if the issue spreads.",
                    "• ಸಮಸ್ಯೆ ಹರಡಿದರೆ ಕಾಪರ್ ಆಧಾರಿತ ಸ್ಪ್ರೇ ಮಾಡಿ.",
                    "• సమస్యపుట్టితే కాపర్ ఆధారిత స్ప్రే ఉపయోగించండి.",
                ),
            ])
        elif disease == "rot":
            advice_lines.extend([
                localize_text(locale,
                    "• Improve soil drainage and reduce watering.",
                    "• ಮಣ್ಣು ನಿಕ್ಕಾರವನ್ನು ಉತ್ತಮಗೊಳಿಸಿ ಮತ್ತು ನೀರಾವರಿಯನ್ನು ಕಡಿಮೆಮಾಡಿ.",
                    "• నేల డ్రెనేజ్ మెరుగుపరచండి మరియు నీటివ్వడాన్ని తగ్గించండి.",
                ),
                localize_text(locale,
                    "• Remove rotten material and avoid standing water.",
                    "• ಕುಂಡಲು ಮಾಡಿರುವ ವಸ್ತುಗಳನ್ನು ತೆಗೆದು ನಿಂತ ನೀರನ್ನು ತಪ್ಪಿಸಿ.",
                    "• పాడైన పదార్థాన్ని తీసివేసి నిలిచిన నీటిని నివారించండి.",
                ),
            ])
        elif disease == "wilt":
            advice_lines.extend([
                localize_text(locale,
                    "• Check soil moisture and water deeply when needed.",
                    "• ಮಣ್ಣಿನ ತೇವವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಬೇಕಾದಾಗ ಆಳವಾಗಿ ನೀರು ನೀಡಿ.",
                    "• నేల తేమను తనిఖీ చేసి అవసరమైతే లోతుగా నీరు ఇవ్వండి.",
                ),
                localize_text(locale,
                    "• Avoid root damage and inspect for vascular problems.",
                    "• ಬೇರು ಹಾನಿಯನ್ನು ತಪ್ಪಿಸಿ ಮತ್ತು ರಕ್ತನಾಳದ ಸಮಸ್ಯೆಗಳಿಗಾಗಿ ಪರಿಶೀಲಿಸಿ.",
                    "• వేరులను నష్టం కాకుండా చూసి రక్తనాళ సమస్యల కోసం తనిఖీ చేయండి.",
                ),
            ])
        elif disease == "yellowing":
            advice_lines.extend([
                localize_text(locale,
                    "• Yellow leaves may mean nutrient or water stress.",
                    "• ಹಳದಿ ಎಲೆಗಳು ಪೋಷಕಾಂಶ ಅಥವಾ ನೀರು ಕೊರತೆಯ ಲಕ್ಷಣವಾಗಬಹುದು.",
                    "• పసుపు ఆకులు పోషకాలు లేదా నీటి ఒత్తిడిని సూచించవచ్చు.",
                ),
                localize_text(locale,
                    "• Test the soil and adjust feeding or irrigation.",
                    "• ಮಣ್ಣನ್ನು ಪರೀಕ್ಷಿಸಿ ಮತ್ತು ಪೋಷಣೆ ಅಥವಾ ನೀರಾವರಿಯನ್ನು ಹೊಂದಿಸಿ.",
                    "• నేలని పరీక్షించి పోషణ లేదా నీటివ్వడాన్ని సరిచేయండి.",
                ),
            ])
        elif disease == "pest":
            advice_lines.extend([
                localize_text(locale,
                    "• Use neem oil or insecticidal soap for pests.",
                    "• ಕೀಟಗಳಿಗಾಗಿ ನೀಂ ಎಣ್ಣೆ ಅಥವಾ ಕೀಟನಾಶಕ ಕೊಳೆ ಬಳಸಿ.",
                    "• కీటకాలకు నీమ్ నూనె లేదా ఇన్సెక్టిసైడల్ సోప్ ఉపయోగించండి.",
                ),
                localize_text(locale,
                    "• Encourage beneficial insects like ladybugs.",
                    "• ಲೇಡಿಬಗ್‌ಗಳಂತಹ ಉಪಯುಕ್ತ ಕೀಟಗಳನ್ನು ಪ್ರೋತ್ಸಾಹಿಸಿ.",
                    "• లేడీబగ్‌లాంటి ఉపయుక్త కీటకాలను ప్రోత్సహించండి.",
                ),
            ])

    if symptoms:
        advice_lines.append("")
        advice_lines.append(localize_text(locale,
            "🎯 Symptoms observed:",
            "🎯 ಗಮನಿಸಿದ ಲಕ್ಷಣಗಳು:",
            "🎯 గమనించిన లక్షణాలు:",
        ))
        for symptom in symptoms:
            lower = symptom.lower()
            if "yellow" in lower:
                advice_lines.append(localize_text(locale,
                    "• Yellowing may indicate nutrient deficiency or watering issues.",
                    "• ಹಳದಿ ಆಗುವುದು ಪೋಷಕಾಂಶದ ಕೊರತೆ ಅಥವಾ ನೀರಾವರಿ ಸಮಸ್ಯೆಗಳನ್ನು ಸೂಚಿಸುತ್ತದೆ.",
                    "• పసుపు కావడం పోషకాహార లోపం లేదా నీరు సమస్యలను సూచించవచ్చు.",
                ))
            elif "pest" in lower:
                advice_lines.append(localize_text(locale,
                    "• Pests detected: consider neem oil and beneficial insects.",
                    "• ಕೀಟಗಳು ಕಂಡುಬಹಿದ್ದು: ನೀಂ ಎಣ್ಣೆ ಮತ್ತು ಉಪಯುಕ್ತ ಕೀಟಗಳನ್ನು ಪರಿಗಣಿಸಿ.",
                    "• కీటకాలు కనుగొనబడ్డాయ: నీమ్ నూనె మరియు ఉపయోగకర కీటకాలను పరిగణించండి.",
                ))
            elif "dry" in lower or "drought" in lower:
                advice_lines.append(localize_text(locale,
                    "• Dry conditions: increase mulch and consider drip irrigation.",
                    "• ಒಣ ಪರಿಸ್ಥಿತಿ: ಮಲ್ಚ್ ಹೆಚ್ಚಿಸಿ ಮತ್ತು ಡ್ರಿಪ್-irrigation ಯನ್ನು ಪರಿಗಣಿಸಿ.",
                    "• పొడి పరిస్థితులు: మల్చ్ పెంచండి మరియు డ్రిప్ నీరుమోత వంటి మీథడ్లను పరిగణించండి.",
                ))
            elif "disease" in lower:
                advice_lines.append(localize_text(locale,
                    "• Disease signs: remove affected areas and improve airflow.",
                    "• ರೋಗสಂಕರಣ ಲಕ್ಷಣಗಳು: ಪರಿಣಾಮಿತ ಭಾಗಗಳನ್ನು ತೆಗೆದು ಗಾಳಿ ಹರಿವನ್ನು ಸುಧಾರಿಸಿ.",
                    "• వ్యాధి గుర్తులు: ప్రభావిత ప్రాంతాలను తొలగించి గాలి ప్రసారాన్ని మెరుగుపరచండి.",
                ))
            else:
                advice_lines.append(localize_text(locale,
                    f"• {symptom}: monitor and adjust crop care accordingly.",
                    f"• {symptom}: ಸಂಬಂಧಿಸಿದಂತೆ ಬೆಳೆ ಆರೈಕೆಯನ್ನು ಗಮನಿಸಿ ಮತ್ತು ಹೊಂದಿಸಿ.",
                    f"• {symptom}: సరైన crop సంరక్షణను పర్యవేక్షించి సరిచేయండి.",
                ))

    if transcript:
        advice_lines.append("")
        advice_lines.append(localize_text(locale,
            f"🔍 Transcript note: \"{transcript}\"",
            f"🔍 ಪತ್ರಿಕೆ ಟಿಪ್ಪಣಿ: \"{transcript}\"",
            f"🔍 ట్రాన్స్క్రిప్ట్ గమనిక: \"{transcript}\"",
        ))

    return "\n".join(advice_lines)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
