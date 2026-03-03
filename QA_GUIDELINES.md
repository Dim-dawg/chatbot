# QA Guidelines

## 1. AI Response Quality
- **Grounding**: Ensure the chatbot only answers based on provided database results. It must never "hallucinate" case facts.
- **Tone**: Professional, helpful, and respectful of judicial protocols.
- **Language**: Standard legal English. Avoid slang or overly technical AI jargon.

## 2. Dashboard Accuracy
- **Counts**: Summary cards must match the results of `SELECT COUNT(*)` on the live tables.
- **Sync**: Verify that the "Sync Now" button correctly refreshes all components.

## 3. UI/UX Standards
- **Accessibility**: Ensure high contrast ratios (minimum 4.5:1) for text against the dark theme.
- **Responsiveness**: The dashboard must be readable on standard judicial workstation resolutions (1920x1080).
- **Bubble Interaction**: The chat bubble must not block critical dashboard information.
