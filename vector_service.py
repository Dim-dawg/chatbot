import faiss
import numpy as np
import os
import sys
import logging
import time
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from dotenv import load_dotenv
from mistralai import Mistral

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration Load ---
load_dotenv()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_EMBEDDING_MODEL = os.getenv("MISTRAL_EMBEDDING_MODEL", "mistral-embed")
INDEX_FILE = "the_chatbot.index"

# --- Config Validation ---
if not MISTRAL_API_KEY:
    logger.critical("CRITICAL: MISTRAL_API_KEY is missing from environment variables.")
    sys.exit(1)

logger.info(f"Configuration Loaded. Embedding Model: {MISTRAL_EMBEDDING_MODEL}")

# --- Initialize Mistral Client ---
client = Mistral(api_key=MISTRAL_API_KEY)

app = FastAPI(title="The Chatbot Vector Service (Mistral Cloud)")

# --- In-Memory Mapping ---
# Maps vector IDs to claim_numbers. In prod, use a DB or a persistent key-value store.
vector_to_claim = {}

# --- Initialize FAISS ---
# We need to determine the dimension dynamically or set a default.
# Mistral-embed is typically 1024. We'll verify on first request or try to load.
DIMENSION = 1024 

try:
    index = faiss.read_index(INDEX_FILE)
    logger.info(f"Loaded existing FAISS index with {index.ntotal} vectors.")
except Exception as e:
    logger.warning(f"Could not load index: {e}. Creating new FAISS index (Dimension: {DIMENSION}).")
    index = faiss.IndexFlatL2(DIMENSION)

class CaseEntry(BaseModel):
    claim_number: str
    text: str

class SearchQuery(BaseModel):
    text: str
    top_k: int = 5

def get_mistral_embedding(text: str) -> np.ndarray:
    start_time = time.time()
    try:
        # Mistral API call
        resp = client.embeddings.create(
            model=MISTRAL_EMBEDDING_MODEL,
            inputs=[text]
        )
        
        # Check for data
        if not resp.data:
            raise ValueError("Mistral API returned no embedding data.")
            
        embedding = resp.data[0].embedding
        duration = (time.time() - start_time) * 1000
        logger.info(f"Mistral embedding generated in {duration:.2f}ms")
        
        return np.array(embedding).astype('float32')
        
    except Exception as e:
        logger.error(f"Mistral API Error: {e}")
        raise HTTPException(status_code=502, detail=f"Embedding provider error: {str(e)}")

@app.post("/add")
async def add_case(case: CaseEntry):
    try:
        embedding = get_mistral_embedding(case.text)
        
        # Dimension Check
        if embedding.shape[0] != index.d:
            raise HTTPException(status_code=500, detail=f"Dimension mismatch. Index: {index.d}, Model: {embedding.shape[0]}")

        # Add to index
        index.add(np.array([embedding]))
        
        # Map ID
        vector_id = index.ntotal - 1
        vector_to_claim[vector_id] = case.claim_number
        
        # Persist
        faiss.write_index(index, INDEX_FILE)
        return {"status": "success", "vector_id": vector_id}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Add Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search_cases(query: SearchQuery):
    try:
        if index.ntotal == 0:
            return []

        query_embedding = get_mistral_embedding(query.text)
        
        D, I = index.search(np.array([query_embedding]), query.top_k)
        
        results = []
        for i in range(len(I[0])):
            idx = int(I[0][i])
            if idx != -1 and idx in vector_to_claim:
                results.append({
                    "claim_number": vector_to_claim[idx],
                    "score": float(D[0][i])
                })
        
        return results
    except Exception as e:
        logger.error(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
