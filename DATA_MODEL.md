# Data Model

## Relationship Overview

```text
[ data_casefiles ]
       |
       |-- (1:N) --> [ data_casefiles_hearings ]
       |-- (1:N) --> [ view_case_parties ]
       |-- (1:1) --> [ cat_judges ] (via judge_code)
       |-- (1:1) --> [ FAISS Index ] (via claim_number)
```

## Entity Definitions
- **Case**: The central unit of data. Defined by a `claim_number`.
- **Hearing**: A scheduled event belonging to a Case.
- **Party**: An entity (Person or Organization) involved in a Case.
- **Embedding**: A 1024-dimensional vector representing the Case Summary for semantic search.

## Status Lifecycle
1. **ACTIVE**: Ongoing case with active hearings.
2. **FINALIZED**: Case reached an outcome and is closed.
3. **INACTIVE**: Case put on hold or suspended.
