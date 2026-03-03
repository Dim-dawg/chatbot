# Database Schema

## 1. Primary Tables
### `data_casefiles`
The core table containing all case metadata.
- `claim_number` (PK): Unique identifier.
- `CaseName`: Descriptive title.
- `CaseSummary`: Detailed narrative.
- `claim_status`: ACTIVE, FINALIZED, or INACTIVE.
- `case_outcome`: Current outcome (e.g., PENDING, DISMISSED).
- `claim_date`: Original filing date.
- `DateFinalized`: Completion timestamp.

### `data_casefiles_hearings`
- `record_number` (PK)
- `claim_number` (FK)
- `hearing_type`: Trial, Motion, Arraignment, etc.
- `assigned_start_date`: Scheduled date.
- `judge_code`: Links to `cat_judges`.

## 2. Dashboard Views
- `ai_caseload_summary`: Aggregates case counts.
- `ai_upcoming_hearings`: Dynamic hearing schedule.
- `ai_recent_judgments`: Feed of recently closed cases.

## 3. Junction Views
- `view_case_parties`: Links cases to entities and legal counsel.
- `view_case_judges`: Directly maps cases to presiding judges.
