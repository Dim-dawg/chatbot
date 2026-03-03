# Infrastructure Requirements

## 1. Hardware Recommendations
For smooth performance with local LLMs:
- **CPU**: 8+ cores (Intel i7/AMD Ryzen 7 or better).
- **RAM**: 32GB (Essential for running Ollama and MySQL simultaneously).
- **GPU (Optional)**: NVIDIA RTX 3060+ with 12GB+ VRAM for faster AI responses.
- **Storage**: SSD with 50GB+ free space for database and models.

## 2. Software Requirements
- **Operating System**: Linux (Ubuntu 22.04 recommended) or Windows 11 with WSL2.
- **Runtime**: Node.js 18.x, Python 3.9+.
- **Service Containerization (Future)**: Docker and Docker Compose for simplified orchestration.

## 3. Storage Architecture
- **MySQL**: Persistent relational data.
- **FAISS Index**: Local binary file (`the_chatbot.index`).
- **Ollama Models**: Stored in the default Ollama local directory.
