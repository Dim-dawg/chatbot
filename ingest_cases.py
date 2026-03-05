import mysql.connector
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "user": os.getenv("MYSQL_USER"),
    "password": os.getenv("MYSQL_PASSWORD"),
    "database": os.getenv("MYSQL_DATABASE")
}
VECTOR_SERVICE_URL = "http://localhost:8000/add"

def ingest():
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        print("Fetching case summaries from MySQL...")
        cursor.execute("SELECT claim_number, CaseSummary FROM data_casefiles WHERE CaseSummary IS NOT NULL AND CaseSummary != ''")
        cases = cursor.fetchall()
        
        print(f"Found {len(cases)} cases. Starting ingestion into FAISS...")
        
        for i, case in enumerate(cases):
            payload = {
                "claim_number": case["claim_number"],
                "text": case["CaseSummary"]
            }
            res = requests.post(VECTOR_SERVICE_URL, json=payload)
            if res.status_code == 200:
                if i % 100 == 0:
                    print(f"Processed {i}/{len(cases)} cases...")
            else:
                print(f"Failed to ingest {case['claim_number']}: {res.text}")
                
        print("Ingestion complete!")
        
    except Exception as e:
        print(f"Error during ingestion: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    ingest()
