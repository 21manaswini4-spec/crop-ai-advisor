# Crop AI Advisor

This project includes a React frontend and a FastAPI backend. The backend can call OpenAI using environment variables for secure API key handling.

## Backend configuration

- Copy `.env.example` to `.env`
- Set `OPENAI_API_KEY` to your OpenAI API key
- Optionally set `OPENAI_MODEL` and `OPENAI_API_BASE`

Run the backend with environment variables available, for example:

```bash
uvicorn backend.app:app --reload --env-file .env
```

The backend will use the API key if provided and otherwise fall back to local advice logic.
