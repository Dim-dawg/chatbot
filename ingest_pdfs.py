import mysql.connector
import requests
import os
import sys
import logging
from dotenv import load_dotenv
from PyPDF2 import PdfReader

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

# --- Config ---
MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "user": os.getenv("MYSQL_USER"),
    "password": os.getenv("MYSQL_PASSWORD"),
    "database": os.getenv("MYSQL_DATABASE")
}
VECTOR_SERVICE_URL = "http://localhost:8000/add"
CHUNK_SIZE = 1000
OVERLAP = 150

def get_db_connection():
    return mysql.connector.connect(**MYSQL_CONFIG)

def extract_text_from_pdf(file_path):
    """Extracts text from a PDF file."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "
"
        return text
    except Exception as e:
        logger.error(f"Error reading PDF {file_path}: {e}")
        return None

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=OVERLAP):
    """Splits text into chunks with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def ingest_pdfs():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        logger.info("Fetching PDF records from data_scanned_documents...")
        cursor.execute("SELECT claim_number, file_path, document_type FROM data_scanned_documents WHERE file_path IS NOT NULL")
        records = cursor.fetchall()
        
        logger.info(f"Found {len(records)} document records.")
        
        for i, record in enumerate(records):
            file_path = record['file_path']
            claim_number = record['claim_number']
            
            # Check if file exists
            if not os.path.exists(file_path):
                logger.warning(f"File not found: {file_path} (Case: {claim_number})")
                continue
                
            # Extract Text
            text = extract_text_from_pdf(file_path)
            if not text or len(text.strip()) < 50:
                logger.warning(f"No text extracted from {file_path}")
                continue
                
            # Chunk Text
            chunks = chunk_text(text)
            logger.info(f"Processing {claim_number}: {len(chunks)} chunks")
            
            # Send to Vector Service
            for chunk in chunks:
                payload = {
                    "claim_number": claim_number,
                    "text": f"Document Type: {record['document_type']}
Content: {chunk}"
                }
                try:
                    res = requests.post(VECTOR_SERVICE_URL, json=payload)
                    if res.status_code != 200:
                        logger.error(f"Failed to ingest chunk for {claim_number}: {res.text}")
                except Exception as req_err:
                    logger.error(f"Request error: {req_err}")
                    
    except Exception as e:
        logger.critical(f"Ingestion failed: {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    # Validate environment
    if not os.getenv("MISTRAL_API_KEY"):
        logger.critical("MISTRAL_API_KEY not found. Cannot proceed with ingestion.")
        sys.exit(1)
        
    ingest_pdfs()
