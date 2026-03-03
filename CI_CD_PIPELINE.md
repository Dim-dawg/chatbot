# CI/CD Pipeline

Currently, "The chatbot" follows a manual deployment flow to ensure high security in a judicial environment.

## 1. Automated Linting
Before any commit, run:
```bash
npm run lint
```
This ensures TypeScript standards and naming conventions ("The chatbot") are maintained.

## 2. Integration Testing (Proposed)
A CI pipeline (e.g., GitHub Actions or local Jenkins) should include:
1. **Build Test**: Ensuring the React app compiles.
2. **AI Mock Test**: Verifying the backend can correctly handle JSON responses from a mock Ollama endpoint.
3. **Database Migration Test**: Verifying stored procedures and views exist.

## 3. Deployment Triggers
Deployments are currently triggered manually by the systems administrator after verifying code changes in the development branch.
