# Data Retention Policy

## 1. Relational Data (MySQL)
Case data is retained in accordance with the court's official records schedule. "The chatbot" does not delete data unless specifically triggered by an administrative action.

## 2. Vector Data (FAISS)
The vector index is a derivative of the MySQL data. It should be re-indexed if significant data deletions occur in MySQL to ensure accuracy.

## 3. Logs
Application logs are retained for 90 days for troubleshooting and audit purposes, after which they may be archived or deleted.
