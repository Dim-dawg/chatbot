# System Architecture

"The chatbot" is a three-tier synchronized platform designed for secure, local-first legal intelligence.

## 1. Presentation Layer (React)
- **Framework**: React 19 with Vite.
- **UI**: Tailwind CSS for styling and Framer Motion for animations.
- **Features**: A unified Command Center containing a full-screen Dashboard and a floating Chat Widget.

## 2. Orchestration Layer (Node.js)
- **Framework**: Express.js.
- **Logic**: Handles intent detection (QUERY vs ACTION), executes SQL, triggers stored procedures, and interacts with Ollama.
- **Security**: Filters database schemas to provide the AI with only essential context.

## 3. Data & Intelligence Layer
- **Relational (MySQL)**: Stores all metadata, case files, and procedural notes. Powers the dashboard views.
- **Vector (FAISS)**: A secondary Python-based service that provides semantic search through case summaries.
- **AI (Ollama)**: Local LLM engine.
    - **DeepSeek-R1**: Used for natural language reasoning and SQL generation.
    - **Mistral**: Used for generating vector embeddings from text and PDFs.

## 4. Key Workflows
### A. Conversational Query
1. User types in Chat Widget.
2. Node.js backend sends query + filtered schema to Ollama.
3. Ollama returns SQL or Action intent.
4. Node.js executes SQL against MySQL and retrieves data.
5. Ollama summarizes the data into a professional reply.

### B. Dashboard Visualization
1. On load, React calls custom Dashboard APIs.
2. Backend queries dedicated `ai_` MySQL views.
3. React renders charts and lists using real-time data.
