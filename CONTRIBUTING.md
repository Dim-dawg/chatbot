# Contributing to The Chatbot

Thank you for your interest in improving "The chatbot". To maintain high standards for judicial software, please follow these guidelines.

## Development Workflow
1. **Local-First**: Always ensure changes work with local Ollama and MySQL instances.
2. **No Simulation**: Do not introduce mock or simulated data. All features must pull from the live database.
3. **Naming**: Maintain the project name "The chatbot". Avoid references to old project names.
4. **Clean UI**: Use Tailwind CSS and Framer Motion for a modern, distraction-free interface.

## Pull Request Process
- Ensure all TypeScript types are correct (`npm run lint`).
- Document new database views or procedures in `DATABASE_DOCS.md`.
- Update the `CHANGELOG.md` with your changes.

## Tech Stack Requirements
- Node.js v18+
- Python 3.9+ (for FAISS service)
- MySQL 8.0+
- Ollama with required models.
