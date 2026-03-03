# The Chatbot: Database Documentation

This document tracks the technical understanding of the MySQL database schema for "The chatbot".

## 1. Core Data Tables
These tables contain the primary live data.

| Table Name | Description | Record Count (approx) |
| :--- | :--- | :--- |
| `data_casefiles` | Primary case information, status, outcomes. | 21,984 |
| `data_casefiles_hearings` | Records of all court hearings. | 55,410 |
| `cat_judges` | Catalog of judges and their details. | TBD |

## 2. Empty "View" Tables
**Note:** These are Base Tables, NOT dynamic views, and are currently empty. Do not use for live data queries.
* `view_case_calendars`
* `view_casereports`
* `view_hearings`
* `view_judge_assignments`
* (Most other tables starting with `view_`)

## 3. Custom AI Views
...
| `ai_recent_judgments` | `data_casefiles` | Cases finalized in the last 7 days. |

## 4. Vector Search (FAISS - The Smart Librarian)
This layer enables searching by "meaning" rather than just keywords.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Vector Index** | FAISS (CPU) | Stores "meaning fingerprints" of case summaries. |
| **Service** | Python / FastAPI | Handles adding and searching vectors. |
| **Linking** | `claim_number` | Every vector points back to a MySQL record. |

### How it works:
1. **Ingestion**: Case summaries are sent to Ollama to create an embedding (vector).
2. **Storage**: The vector is saved in FAISS with the `claim_number` as metadata.
3. **Retrieval**: When a judge asks a conceptual question, FAISS finds the most similar cases.

## 5. Stored Procedures (Robot Helpers)
...
