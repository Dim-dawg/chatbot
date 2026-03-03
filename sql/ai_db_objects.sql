-- AI helper objects for judicial dashboard + assistant
-- Generated on 2026-03-03
-- Target: MySQL 8+

-- =========================
-- Views (6)
-- =========================

DROP VIEW IF EXISTS ai_judge_daily_calendar;
CREATE VIEW ai_judge_daily_calendar AS
SELECT
  h.record_number,
  h.claim_number,
  c.CaseName,
  h.hearing_type,
  h.assigned_start_date,
  h.start_time,
  h.end_time,
  h.court_code,
  h.judge_code,
  j.judge_name,
  c.claim_status,
  c.case_stage
FROM data_casefiles_hearings h
LEFT JOIN data_casefiles c ON c.claim_number = h.claim_number
LEFT JOIN cat_judges j ON j.judge_code = h.judge_code
WHERE h.voided <> 'Y'
  AND DATE(h.assigned_start_date) = CURRENT_DATE();

DROP VIEW IF EXISTS ai_overdue_cases;
CREATE VIEW ai_overdue_cases AS
SELECT
  c.claim_number,
  c.CaseName,
  c.claim_status,
  c.case_stage,
  c.claim_date,
  c.assigned_start_date AS next_hearing_date,
  c.judge_code,
  j.judge_name,
  TIMESTAMPDIFF(DAY, c.claim_date, NOW()) AS case_age_days,
  TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) AS days_since_last_listing
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
WHERE c.claim_status NOT IN ('Closed', 'Finalized', 'Disposed')
  AND c.claim_date IS NOT NULL
  AND TIMESTAMPDIFF(DAY, c.claim_date, NOW()) > 90;

DROP VIEW IF EXISTS ai_case_timeline;
CREATE VIEW ai_case_timeline AS
SELECT
  c.claim_number,
  c.CaseName,
  'FILED' AS event_type,
  c.claim_date AS event_datetime,
  c.claim_status,
  c.case_stage,
  c.judge_code,
  j.judge_name,
  c.next_activity AS event_note
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
WHERE c.claim_date IS NOT NULL

UNION ALL

SELECT
  h.claim_number,
  c.CaseName,
  CONCAT('HEARING: ', h.hearing_type) AS event_type,
  h.assigned_start_date AS event_datetime,
  c.claim_status,
  c.case_stage,
  h.judge_code,
  j.judge_name,
  COALESCE(h.hearing_outcome, h.comments) AS event_note
FROM data_casefiles_hearings h
LEFT JOIN data_casefiles c ON c.claim_number = h.claim_number
LEFT JOIN cat_judges j ON j.judge_code = h.judge_code
WHERE h.assigned_start_date IS NOT NULL
  AND h.voided <> 'Y';

DROP VIEW IF EXISTS ai_hearing_load_by_judge;
CREATE VIEW ai_hearing_load_by_judge AS
SELECT
  h.judge_code,
  j.judge_name,
  COUNT(*) AS hearings_next_7_days,
  SUM(CASE WHEN h.assigned_start_date < NOW() THEN 1 ELSE 0 END) AS already_started,
  MIN(h.assigned_start_date) AS earliest_hearing,
  MAX(h.assigned_start_date) AS latest_hearing
FROM data_casefiles_hearings h
LEFT JOIN cat_judges j ON j.judge_code = h.judge_code
WHERE h.voided <> 'Y'
  AND h.assigned_start_date >= NOW()
  AND h.assigned_start_date < DATE_ADD(NOW(), INTERVAL 7 DAY)
GROUP BY h.judge_code, j.judge_name;

DROP VIEW IF EXISTS ai_outcome_trends_30d;
CREATE VIEW ai_outcome_trends_30d AS
SELECT
  COALESCE(c.case_outcome, 'UNKNOWN') AS case_outcome,
  COUNT(*) AS outcome_count,
  MIN(c.DateFinalized) AS first_finalized,
  MAX(c.DateFinalized) AS last_finalized
FROM data_casefiles c
WHERE c.DateFinalized >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY COALESCE(c.case_outcome, 'UNKNOWN')
ORDER BY outcome_count DESC;

DROP VIEW IF EXISTS ai_cases_needing_action;
CREATE VIEW ai_cases_needing_action AS
SELECT
  c.claim_number,
  c.CaseName,
  c.claim_status,
  c.case_stage,
  c.claim_date,
  c.judge_code,
  j.judge_name,
  CASE
    WHEN c.judge_code IS NULL OR c.judge_code = 0 THEN 'NO_JUDGE_ASSIGNED'
    WHEN c.assigned_start_date IS NULL THEN 'NO_NEXT_HEARING_DATE'
    WHEN c.DateFinalized IS NULL
         AND EXISTS (
           SELECT 1
           FROM data_casefiles_hearings h
           WHERE h.claim_number = c.claim_number
             AND h.voided <> 'Y'
             AND h.assigned_start_date < NOW()
         ) THEN 'PAST_HEARING_NO_FINAL_OUTCOME'
    WHEN c.claim_status NOT IN ('Closed', 'Finalized', 'Disposed')
         AND TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) > 45 THEN 'STALE_OPEN_CASE'
    ELSE 'CHECK_MANUALLY'
  END AS action_reason
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
WHERE
  (c.judge_code IS NULL OR c.judge_code = 0)
  OR c.assigned_start_date IS NULL
  OR (
    c.DateFinalized IS NULL
    AND EXISTS (
      SELECT 1
      FROM data_casefiles_hearings h
      WHERE h.claim_number = c.claim_number
        AND h.voided <> 'Y'
        AND h.assigned_start_date < NOW()
    )
  )
  OR (
    c.claim_status NOT IN ('Closed', 'Finalized', 'Disposed')
    AND TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) > 45
  );

-- =========================
-- Stored Procedures (6)
-- =========================

DROP PROCEDURE IF EXISTS sp_schedule_hearing;
DROP PROCEDURE IF EXISTS sp_reschedule_hearing;
DROP PROCEDURE IF EXISTS sp_assign_judge;
DROP PROCEDURE IF EXISTS sp_finalize_case;
DROP PROCEDURE IF EXISTS sp_reopen_case;
DROP PROCEDURE IF EXISTS sp_bulk_close_stale_cases;

DELIMITER $$

CREATE PROCEDURE sp_schedule_hearing(
  IN p_claim_number VARCHAR(255),
  IN p_hearing_type VARCHAR(255),
  IN p_start_dt DATETIME,
  IN p_judge_code INT,
  IN p_entered_by VARCHAR(255)
)
BEGIN
  DECLARE v_court_code VARCHAR(25);
  DECLARE v_start_time VARCHAR(8);
  DECLARE v_end_time VARCHAR(8);

  SELECT COALESCE(NULLIF(TRIM(court_room), ''), 'UNASSIGNED')
    INTO v_court_code
  FROM data_casefiles
  WHERE claim_number = p_claim_number
  LIMIT 1;

  SET v_start_time = DATE_FORMAT(p_start_dt, '%h:%i %p');
  SET v_end_time = DATE_FORMAT(DATE_ADD(p_start_dt, INTERVAL 1 HOUR), '%h:%i %p');

  INSERT INTO data_casefiles_hearings (
    claim_number,
    hearing_type,
    entered_by,
    date_entered,
    comments,
    assigned_start_date,
    assigned_end_date,
    start_time,
    end_time,
    due_date,
    court_code,
    subnumber,
    judge_code,
    voided
  ) VALUES (
    p_claim_number,
    p_hearing_type,
    COALESCE(p_entered_by, 'system'),
    NOW(),
    'Scheduled by procedure',
    p_start_dt,
    DATE_ADD(p_start_dt, INTERVAL 1 HOUR),
    v_start_time,
    v_end_time,
    DATE(p_start_dt),
    COALESCE(v_court_code, 'UNASSIGNED'),
    '',
    p_judge_code,
    'N'
  );

  UPDATE data_casefiles
  SET
    assigned_start_date = p_start_dt,
    hearing_type = p_hearing_type,
    judge_code = p_judge_code,
    last_listing_date = NOW(),
    next_activity = CONCAT('Scheduled ', p_hearing_type)
  WHERE claim_number = p_claim_number;
END$$

CREATE PROCEDURE sp_reschedule_hearing(
  IN p_record_number INT,
  IN p_new_start_dt DATETIME,
  IN p_changed_by VARCHAR(255)
)
BEGIN
  DECLARE v_claim_number VARCHAR(255);

  SELECT claim_number
    INTO v_claim_number
  FROM data_casefiles_hearings
  WHERE record_number = p_record_number
  LIMIT 1;

  UPDATE data_casefiles_hearings
  SET
    assigned_start_date = p_new_start_dt,
    comments = CONCAT(COALESCE(comments, ''), ' | Rescheduled by ', COALESCE(p_changed_by, 'system'), ' at ', NOW())
  WHERE record_number = p_record_number;

  UPDATE data_casefiles
  SET
    assigned_start_date = p_new_start_dt,
    last_listing_date = NOW(),
    next_activity = 'Hearing rescheduled'
  WHERE claim_number = v_claim_number;
END$$

CREATE PROCEDURE sp_assign_judge(
  IN p_claim_number VARCHAR(255),
  IN p_judge_code INT,
  IN p_assigned_by VARCHAR(255)
)
BEGIN
  UPDATE data_casefiles
  SET
    judge_code = p_judge_code,
    judge_acknowledged = 'N',
    pending_reassign = 'N',
    next_activity = CONCAT('Judge assigned by ', COALESCE(p_assigned_by, 'system')),
    last_listing_date = NOW()
  WHERE claim_number = p_claim_number;
END$$

CREATE PROCEDURE sp_finalize_case(
  IN p_claim_number VARCHAR(255),
  IN p_outcome VARCHAR(255)
)
BEGIN
  UPDATE data_casefiles
  SET
    claim_status = 'Closed',
    case_outcome = p_outcome,
    DateFinalized = NOW(),
    case_stage = 'Finalized',
    next_activity = 'Case finalized',
    last_listing_date = NOW()
  WHERE claim_number = p_claim_number;
END$$

CREATE PROCEDURE sp_reopen_case(
  IN p_claim_number VARCHAR(255),
  IN p_reason VARCHAR(255)
)
BEGIN
  UPDATE data_casefiles
  SET
    claim_status = 'Open',
    case_stage = 'Reopened',
    next_activity = CONCAT('Case reopened: ', COALESCE(p_reason, 'No reason supplied')),
    last_listing_date = NOW()
  WHERE claim_number = p_claim_number;
END$$

CREATE PROCEDURE sp_bulk_close_stale_cases(
  IN p_days_old INT,
  IN p_outcome VARCHAR(255)
)
BEGIN
  UPDATE data_casefiles
  SET
    claim_status = 'Closed',
    case_stage = 'Finalized',
    case_outcome = p_outcome,
    DateFinalized = NOW(),
    next_activity = CONCAT('Auto-finalized after ', p_days_old, ' days idle'),
    last_listing_date = NOW()
  WHERE claim_status NOT IN ('Closed', 'Finalized', 'Disposed')
    AND TIMESTAMPDIFF(DAY, COALESCE(last_listing_date, claim_date), NOW()) >= p_days_old;
END$$

DELIMITER ;

-- =========================
-- Additional Performance Views (6)
-- =========================

DROP VIEW IF EXISTS view_case_parties;
CREATE VIEW view_case_parties AS
SELECT 
    e.claim_number,
    e.FullName AS entity_name,
    e.Entity_id AS entity_number,
    e.role,
    GROUP_CONCAT(a.attorney_name SEPARATOR ', ') AS attorneys,
    e.party_number,
    e.detached
FROM data_casefiles_entities e
LEFT JOIN data_casefiles_attorneys ca ON e.Entity_id = ca.entity_id AND e.claim_number = ca.claim_number
LEFT JOIN cat_attorneys a ON ca.attorney_code = a.attorney_code
GROUP BY e.claim_number, e.Entity_id, e.FullName, e.role, e.party_number, e.detached;

DROP VIEW IF EXISTS ai_case_search_index;
CREATE VIEW ai_case_search_index AS
SELECT
  c.claim_number,
  c.CaseName,
  c.claim_status,
  c.case_stage,
  c.case_outcome,
  c.claim_date,
  c.last_listing_date,
  c.judge_code,
  j.judge_name,
  (
    SELECT party_names 
    FROM ai_case_parties_summary p 
    WHERE p.claim_number = c.claim_number
  ) AS entities,
  (
    SELECT MAX(h.assigned_start_date)
    FROM data_casefiles_hearings h
    WHERE h.claim_number = c.claim_number
      AND h.voided <> 'Y'
  ) AS last_hearing_date
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code;

DROP VIEW IF EXISTS ai_case_detail_summary;
CREATE VIEW ai_case_detail_summary AS
SELECT
  c.claim_number,
  c.CaseName,
  c.CaseSummary,
  c.claim_status,
  c.case_stage,
  c.case_outcome,
  c.claim_date,
  c.DateFinalized,
  c.judge_code,
  j.judge_name,
  c.court_room,
  c.case_type,
  c.next_activity,
  c.last_listing_date
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code;

DROP VIEW IF EXISTS ai_case_parties_summary;
CREATE VIEW ai_case_parties_summary AS
SELECT
  p.claim_number,
  COUNT(*) AS parties_count,
  GROUP_CONCAT(DISTINCT p.entity_name ORDER BY p.entity_name SEPARATOR ', ') AS party_names,
  GROUP_CONCAT(DISTINCT p.role ORDER BY p.role SEPARATOR ', ') AS party_roles
FROM view_case_parties p
GROUP BY p.claim_number;

DROP VIEW IF EXISTS ai_case_activity_latest;
CREATE VIEW ai_case_activity_latest AS
SELECT
  c.claim_number,
  c.CaseName,
  c.claim_status,
  c.case_stage,
  h_latest.assigned_start_date AS latest_hearing_date,
  h_latest.hearing_type AS latest_hearing_type,
  h_latest.hearing_outcome AS latest_hearing_outcome,
  TIMESTAMPDIFF(
    DAY,
    COALESCE(h_latest.assigned_start_date, c.last_listing_date, c.claim_date),
    NOW()
  ) AS days_since_last_activity
FROM data_casefiles c
LEFT JOIN data_casefiles_hearings h_latest
  ON h_latest.claim_number = c.claim_number
 AND h_latest.voided <> 'Y'
 AND h_latest.assigned_start_date = (
   SELECT MAX(h2.assigned_start_date)
   FROM data_casefiles_hearings h2
   WHERE h2.claim_number = c.claim_number
     AND h2.voided <> 'Y'
 );

DROP VIEW IF EXISTS ai_judge_workload_today;
CREATE VIEW ai_judge_workload_today AS
SELECT
  j.judge_code,
  j.judge_name,
  COUNT(DISTINCT h.record_number) AS hearings_today,
  COUNT(DISTINCT c.claim_number) AS total_cases_assigned,
  SUM(CASE WHEN c.claim_status IN ('Closed', 'Finalized', 'Disposed') THEN 0 ELSE 1 END) AS open_cases_assigned
FROM cat_judges j
LEFT JOIN data_casefiles_hearings h
  ON h.judge_code = j.judge_code
 AND h.voided <> 'Y'
 AND DATE(h.assigned_start_date) = CURRENT_DATE()
LEFT JOIN data_casefiles c
  ON c.judge_code = j.judge_code
GROUP BY j.judge_code, j.judge_name;

DROP VIEW IF EXISTS ai_case_outcome_kpis;
CREATE VIEW ai_case_outcome_kpis AS
SELECT
  COUNT(*) AS total_cases,
  SUM(CASE WHEN claim_status IN ('Closed', 'Finalized', 'Disposed') THEN 1 ELSE 0 END) AS closed_cases,
  SUM(CASE WHEN claim_status IN ('Pending', 'Judgment Reserved', 'Awaiting Order') THEN 1 ELSE 0 END) AS pending_cases,
  SUM(CASE WHEN claim_status NOT IN ('Closed', 'Finalized', 'Disposed') THEN 1 ELSE 0 END) AS open_cases,
  SUM(CASE WHEN DateFinalized >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS finalized_last_7d,
  SUM(CASE WHEN DateFinalized >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS finalized_last_30d
FROM data_casefiles;

-- =========================
-- Functions (6)
-- =========================

DROP FUNCTION IF EXISTS fn_case_age_days;
DROP FUNCTION IF EXISTS fn_next_hearing_date;
DROP FUNCTION IF EXISTS fn_is_case_overdue;
DROP FUNCTION IF EXISTS fn_case_status_bucket;
DROP FUNCTION IF EXISTS fn_judge_full_name;
DROP FUNCTION IF EXISTS fn_hearing_count_7d;

DELIMITER $$

CREATE FUNCTION fn_case_age_days(p_claim_number VARCHAR(255))
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_days INT;

  SELECT TIMESTAMPDIFF(DAY, claim_date, NOW())
    INTO v_days
  FROM data_casefiles
  WHERE claim_number = p_claim_number
  LIMIT 1;

  RETURN COALESCE(v_days, 0);
END$$

CREATE FUNCTION fn_next_hearing_date(p_claim_number VARCHAR(255))
RETURNS DATETIME
READS SQL DATA
BEGIN
  DECLARE v_dt DATETIME;

  SELECT MIN(assigned_start_date)
    INTO v_dt
  FROM data_casefiles_hearings
  WHERE claim_number = p_claim_number
    AND voided <> 'Y'
    AND assigned_start_date >= NOW();

  RETURN v_dt;
END$$

CREATE FUNCTION fn_is_case_overdue(p_claim_number VARCHAR(255), p_days INT)
RETURNS TINYINT
READS SQL DATA
BEGIN
  DECLARE v_is_overdue TINYINT DEFAULT 0;

  SELECT
    CASE
      WHEN claim_status IN ('Closed', 'Finalized', 'Disposed') THEN 0
      WHEN TIMESTAMPDIFF(DAY, COALESCE(last_listing_date, claim_date), NOW()) > p_days THEN 1
      ELSE 0
    END
  INTO v_is_overdue
  FROM data_casefiles
  WHERE claim_number = p_claim_number
  LIMIT 1;

  RETURN COALESCE(v_is_overdue, 0);
END$$

CREATE FUNCTION fn_case_status_bucket(p_claim_number VARCHAR(255))
RETURNS VARCHAR(20)
READS SQL DATA
BEGIN
  DECLARE v_status VARCHAR(255);

  SELECT claim_status
    INTO v_status
  FROM data_casefiles
  WHERE claim_number = p_claim_number
  LIMIT 1;

  RETURN CASE
    WHEN v_status IN ('Closed', 'Finalized', 'Disposed') THEN 'CLOSED'
    WHEN v_status IN ('Pending', 'Judgment Reserved', 'Awaiting Order') THEN 'PENDING'
    WHEN v_status IS NULL OR TRIM(v_status) = '' THEN 'UNKNOWN'
    ELSE 'OPEN'
  END;
END$$

CREATE FUNCTION fn_judge_full_name(p_judge_code INT)
RETURNS VARCHAR(255)
READS SQL DATA
BEGIN
  DECLARE v_name VARCHAR(255);

  SELECT
    COALESCE(NULLIF(TRIM(judge_name), ''), CONCAT_WS(' ', NULLIF(TRIM(other_name), ''), NULLIF(TRIM(short_name), '')))
  INTO v_name
  FROM cat_judges
  WHERE judge_code = p_judge_code
  LIMIT 1;

  RETURN COALESCE(v_name, 'Unassigned');
END$$

CREATE FUNCTION fn_hearing_count_7d(p_judge_code INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE v_count INT;

  SELECT COUNT(*)
    INTO v_count
  FROM data_casefiles_hearings
  WHERE judge_code = p_judge_code
    AND voided <> 'Y'
    AND assigned_start_date >= NOW()
    AND assigned_start_date < DATE_ADD(NOW(), INTERVAL 7 DAY);

  RETURN COALESCE(v_count, 0);
END$$

DELIMITER ;
