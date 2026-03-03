# Environment Setup

Follow these steps to set up "The chatbot" for local development.

## 1. Prerequisites
- **Node.js**: v18 or newer.
- **Python**: v3.9 or newer (for FAISS).
- **MySQL**: v8.0 or newer.
- **Ollama**: Installed and running.

## 2. Database Setup
1. Create a MySQL database (e.g., `casemanager`).
2. Run the provided schema scripts (or connect to an existing judicial database).
3. Ensure the `ai_` prefixed views are created (see `DATABASE_DOCS.md`).

## 3. Ollama Setup
Download the required models:
```bash
ollama pull lexivault-deepseek-r1:latest
ollama pull mistral:latest
```

## 4. Backend & Frontend Setup
```bash
# Install dependencies
npm install

# Create environment file
touch .env
# Fill .env with your MySQL credentials (see CONFIGURATION_GUIDE.md)

# Start development server
npm run dev
```

## 5. Vector Service Setup
```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate

# Install requirements
pip install fastapi uvicorn faiss-cpu requests numpy python-dotenv

# Start service
python vector_service.py
```
