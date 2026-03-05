# Changelog

All notable changes to "The chatbot" will be documented in this file.

## [1.0.0] - 2024-10-24
### Added
- **Judicial Command Center**: Unified UI with Dashboard and Bubble-to-Widget Chat.
- **Deep Case Files**: Side panel for full case history, parties, and notes.
- **Global Search**: Searchable access to all 21,000+ database records.
- **Actionable AI**: Ability to finalize cases via conversational commands.
- **Vector Search Foundation**: FAISS Python service integrated with Mistral embeddings.
- **Live Data Sync**: Real-time MySQL synchronization for all dashboard metrics.
- **Stored Procedures**: `sp_finalize_case` for atomic database updates.

### Changed
- **AI Engine Overhaul**: Replaced the local Ollama reasoning model (`lexivault-deepseek-r1`) with the external Mistral AI API (`mistral-large-latest`) for improved performance and accuracy in chat and intent detection.
- Redesigned Dashboard using high-performance custom SVG charts.
- Optimized database layer with dynamic views (`ai_` prefixed).

### Removed
- Eliminated all "Offline Mode" and simulated mock data.
