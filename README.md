# The Chatbot v1.0

A professional, local-first conversational assistant and judicial command center designed for judges to interact with and manage case data seamlessly.

## 🚀 Overview
"The chatbot" transforms complex judicial databases into an intuitive, conversational interface. It combines natural language processing (via Ollama) with structured data (MySQL) and semantic search (FAISS) to provide a unified "Command Center" for case management.

## ✨ Key Features
- **Conversational AI**: Ask questions about cases in plain English (powered by Mistral AI).
- **Judicial Dashboard**: Real-time visualization of caseload trends, upcoming hearings, and recent outcomes.
- **Deep Case Files**: One-click access to full case histories, involved parties, and procedural notes.
- **Global Search**: Instant searching across 21,000+ records by name or claim number.
- **Actionable Commands**: Perform database updates (like finalizing cases) directly through chat or dashboard buttons.
- **Vector Search (FAISS)**: Semantic search through case summaries and PDFs using local Mistral embeddings via Ollama.

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express.
- **AI/LLM**: Mistral AI (Cloud API for reasoning), Ollama (Local for embeddings & logging).
- **Database**: MySQL (Metadata), FAISS (Vector Index).

## 🚦 Quick Start
1. **Prerequisites**: Ensure MySQL and Ollama are running locally.
2. **Environment**: Configure your `.env` file with MySQL and `MISTRAL_API_KEY` credentials.
3. **Install**: `npm install`
4. **Run**: `npm run dev`
5. **Vector Service**: Run `python vector_service.py` to activate the librarian.

## 📁 Documentation
See the `/docs` folder (or root Markdown files) for detailed specifications on architecture, security, and setup.
