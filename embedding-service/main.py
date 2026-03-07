"""
HelixCareAI Embedding Service (sentence-transformers, all-MiniLM-L6-v2, 384 dimensions).
Run: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_model = None
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def load_model():
    global _model
    if _model is None:
        logger.info("Loading model: %s", MODEL_NAME)
        from sentence_transformers import SentenceTransformer  # type: ignore
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Model loaded.")
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    # shutdown: model stays in memory until process exits


app = FastAPI(title="HelixCareAI Embedding Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to embed (therapy notes or question)")


class EmbedResponse(BaseModel):
    embedding: list[float] = Field(..., description="384-dimensional embedding vector")


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    """Generate embedding for the given text using all-MiniLM-L6-v2."""
    try:
        model = load_model()
        text = request.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="text must be non-empty")
        vector = model.encode(text, convert_to_numpy=True)
        embedding = vector.tolist()
        if len(embedding) != 384:
            raise HTTPException(status_code=500, detail=f"Unexpected embedding dimension: {len(embedding)}")
        return EmbedResponse(embedding=embedding)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Embedding failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}
