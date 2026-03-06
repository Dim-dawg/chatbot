# Contributing to LexiVault

Thank you for your interest in improving LexiVault. To maintain high standards for judicial software, please follow these guidelines.

## Development Workflow
1. **Local-First**: Always ensure changes work with local Ollama and MySQL instances.
2. **No Simulation**: Do not introduce mock or simulated data. All features must pull from the live database.
3. **Naming**: Maintain the project name "LexiVault". Avoid references to "The chatbot".
4. **Clean UI**: Use Tailwind CSS and Framer Motion for a modern, distraction-free interface.

## Pull Request Process
- Ensure all TypeScript types are correct (`npm run lint`).
- Document new database views or procedures in `docs/database/DATABASE_SCHEMA.md`.
- Update `docs/development/CHANGELOG.md` with your changes.

## Tech Stack Requirements
- Node.js v20+
- Python 3.9+ (for FAISS service)
- MySQL 8.0+
- Ollama with required models.
