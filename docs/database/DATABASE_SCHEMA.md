# Database Schema

## 1. Core Data Tables

### `data_casefiles`
The central registry of all legal cases.
| Column | Type | Description |
| :--- | :--- | :--- |
| `claim_number` | VARCHAR(20) | **PK**. Unique Case ID (e.g., "CV-2024-001"). |
| `CaseName` | VARCHAR(255) | Title of the case. |
| `CaseSummary` | TEXT | Detailed narrative description. |
| `claim_status` | ENUM | 'ACTIVE', 'FINALIZED', 'INACTIVE'. |
| `case_outcome` | VARCHAR(50) | 'PENDING', 'DISMISSED', 'JUDGMENT'. |
| `claim_date` | DATETIME | Date filed. |
| `DateFinalized` | DATETIME | Date closed. |
| `judge_code` | INT | Foreign Key to `cat_judges`. |

### `data_casefiles_hearings`
Scheduled court events.
| Column | Type | Description |
| :--- | :--- | :--- |
| `record_number` | INT | **PK**. Auto-increment ID. |
| `claim_number` | VARCHAR(20) | **FK**. Links to `data_casefiles`. |
| `hearing_type` | VARCHAR(50) | e.g., "Mention", "Trial". |
| `assigned_start_date` | DATETIME | Scheduled date/time. |
| `hearing_outcome` | VARCHAR(255) | Result of the hearing. |

### `cat_judges`
Judicial officers.
| Column | Type | Description |
| :--- | :--- | :--- |
| `judge_code` | INT | **PK**. Unique Judge ID. |
| `judge_name` | VARCHAR(100) | Full name and title. |
| `status` | ENUM | 'Active', 'Retired'. |

## 2. Security & Identity Tables

### `cat_users`
System operators.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT | **PK**. |
| `username` | VARCHAR(50) | Unique login handle. |
| `password_hash` | VARCHAR(255) | Scrypt hash with salt. |
| `role` | VARCHAR(20) | 'admin', 'judge', 'clerk'. |

### `audit_log`
Immutable security trail.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT | **PK**. |
| `username` | VARCHAR(50) | Who performed the action. |
| `action` | VARCHAR(50) | e.g., 'LOGIN_SUCCESS'. |
| `target_type` | VARCHAR(50) | e.g., 'case', 'user'. |
| `details` | JSON | Metadata about the event. |

## 3. Intelligence Tables (Triple-Link)

### `semantic_chunks`
Maps text segments to FAISS vectors.
| Column | Type | Description |
| :--- | :--- | :--- |
| `chunk_id` | INT | **PK**. |
| `document_id` | INT | **FK**. Links to source document. |
| `vector_id` | INT | ID in the FAISS index. |
| `chunk_text` | TEXT | The actual text segment. |

### `data_scanned_documents`
Tracks files in the Vault.
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT | **PK**. |
| `claim_number` | VARCHAR(20) | **FK**. |
| `storage_path` | VARCHAR(255) | Hashed path in the encrypted vault. |
| `encryption_iv` | VARCHAR(64) | Initialization Vector for AES-256. |
