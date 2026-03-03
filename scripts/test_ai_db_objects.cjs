const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  const log = (...args) => console.log(...args);

  const drops = [
    'DROP VIEW IF EXISTS ai_judge_daily_calendar',
    'DROP VIEW IF EXISTS ai_overdue_cases',
    'DROP VIEW IF EXISTS ai_case_timeline',
    'DROP VIEW IF EXISTS ai_hearing_load_by_judge',
    'DROP VIEW IF EXISTS ai_outcome_trends_30d',
    'DROP VIEW IF EXISTS ai_cases_needing_action',
    'DROP PROCEDURE IF EXISTS sp_schedule_hearing',
    'DROP PROCEDURE IF EXISTS sp_reschedule_hearing',
    'DROP PROCEDURE IF EXISTS sp_assign_judge',
    'DROP PROCEDURE IF EXISTS sp_finalize_case',
    'DROP PROCEDURE IF EXISTS sp_reopen_case',
    'DROP PROCEDURE IF EXISTS sp_bulk_close_stale_cases',
    'DROP FUNCTION IF EXISTS fn_case_age_days',
    'DROP FUNCTION IF EXISTS fn_next_hearing_date',
    'DROP FUNCTION IF EXISTS fn_is_case_overdue',
    'DROP FUNCTION IF EXISTS fn_case_status_bucket',
    'DROP FUNCTION IF EXISTS fn_judge_full_name',
    'DROP FUNCTION IF EXISTS fn_hearing_count_7d'
  ];

  for (const q of drops) await conn.query(q);

  const creates = [
`CREATE VIEW ai_judge_daily_calendar AS
SELECT h.record_number,h.claim_number,c.CaseName,h.hearing_type,h.assigned_start_date,h.start_time,h.end_time,h.court_code,h.judge_code,j.judge_name,c.claim_status,c.case_stage
FROM data_casefiles_hearings h
LEFT JOIN data_casefiles c ON c.claim_number = h.claim_number
LEFT JOIN cat_judges j ON j.judge_code = h.judge_code
WHERE h.voided <> 'Y' AND DATE(h.assigned_start_date) = CURRENT_DATE()`,

`CREATE VIEW ai_overdue_cases AS
SELECT c.claim_number,c.CaseName,c.claim_status,c.case_stage,c.claim_date,c.assigned_start_date AS next_hearing_date,c.judge_code,j.judge_name,
TIMESTAMPDIFF(DAY, c.claim_date, NOW()) AS case_age_days,
TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) AS days_since_last_listing
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
WHERE c.claim_status NOT IN ('Closed', 'Finalized', 'Disposed')
AND c.claim_date IS NOT NULL
AND TIMESTAMPDIFF(DAY, c.claim_date, NOW()) > 90`,

`CREATE VIEW ai_case_timeline AS
SELECT c.claim_number,c.CaseName,'FILED' AS event_type,c.claim_date AS event_datetime,c.claim_status,c.case_stage,c.judge_code,j.judge_name,c.next_activity AS event_note
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
WHERE c.claim_date IS NOT NULL
UNION ALL
SELECT h.claim_number,c.CaseName,CONCAT('HEARING: ', h.hearing_type) AS event_type,h.assigned_start_date AS event_datetime,c.claim_status,c.case_stage,h.judge_code,j.judge_name,COALESCE(h.hearing_outcome, h.comments) AS event_note
FROM data_casefiles_hearings h
LEFT JOIN data_casefiles c ON c.claim_number = h.claim_number
LEFT JOIN cat_judges j ON j.judge_code = h.judge_code
WHERE h.assigned_start_date IS NOT NULL AND h.voided <> 'Y'`,

`CREATE VIEW ai_hearing_load_by_judge AS
SELECT h.judge_code,j.judge_name,COUNT(*) AS hearings_next_7_days,
SUM(CASE WHEN h.assigned_start_date < NOW() THEN 1 ELSE 0 END) AS already_started,
MIN(h.assigned_start_date) AS earliest_hearing,
MAX(h.assigned_start_date) AS latest_hearing
FROM data_casefiles_hearings h
LEFT JOIN cat_judges j ON j.judge_code = h.judge_code
WHERE h.voided <> 'Y'
AND h.assigned_start_date >= NOW()
AND h.assigned_start_date < DATE_ADD(NOW(), INTERVAL 7 DAY)
GROUP BY h.judge_code, j.judge_name`,

`CREATE VIEW ai_outcome_trends_30d AS
SELECT COALESCE(c.case_outcome, 'UNKNOWN') AS case_outcome,COUNT(*) AS outcome_count,MIN(c.DateFinalized) AS first_finalized,MAX(c.DateFinalized) AS last_finalized
FROM data_casefiles c
WHERE c.DateFinalized >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY COALESCE(c.case_outcome, 'UNKNOWN')
ORDER BY outcome_count DESC`,

`CREATE VIEW ai_cases_needing_action AS
SELECT c.claim_number,c.CaseName,c.claim_status,c.case_stage,c.claim_date,c.judge_code,j.judge_name,
CASE
WHEN c.judge_code IS NULL OR c.judge_code = 0 THEN 'NO_JUDGE_ASSIGNED'
WHEN c.assigned_start_date IS NULL THEN 'NO_NEXT_HEARING_DATE'
WHEN c.DateFinalized IS NULL AND EXISTS (SELECT 1 FROM data_casefiles_hearings h WHERE h.claim_number = c.claim_number AND h.voided <> 'Y' AND h.assigned_start_date < NOW()) THEN 'PAST_HEARING_NO_FINAL_OUTCOME'
WHEN c.claim_status NOT IN ('Closed', 'Finalized', 'Disposed') AND TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) > 45 THEN 'STALE_OPEN_CASE'
ELSE 'CHECK_MANUALLY' END AS action_reason
FROM data_casefiles c
LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
WHERE (c.judge_code IS NULL OR c.judge_code = 0)
OR c.assigned_start_date IS NULL
OR (c.DateFinalized IS NULL AND EXISTS (SELECT 1 FROM data_casefiles_hearings h WHERE h.claim_number = c.claim_number AND h.voided <> 'Y' AND h.assigned_start_date < NOW()))
OR (c.claim_status NOT IN ('Closed', 'Finalized', 'Disposed') AND TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) > 45)`,

`CREATE PROCEDURE sp_schedule_hearing(IN p_claim_number VARCHAR(255),IN p_hearing_type VARCHAR(255),IN p_start_dt DATETIME,IN p_judge_code INT,IN p_entered_by VARCHAR(255))
BEGIN
DECLARE v_court_code VARCHAR(25);
SELECT COALESCE(NULLIF(TRIM(court_room), ''), 'UNASSIGNED') INTO v_court_code FROM data_casefiles WHERE claim_number = p_claim_number LIMIT 1;
INSERT INTO data_casefiles_hearings (claim_number,hearing_type,entered_by,date_entered,comments,assigned_start_date,assigned_end_date,start_time,end_time,due_date,court_code,subnumber,judge_code,voided)
VALUES (p_claim_number,p_hearing_type,COALESCE(p_entered_by, 'system'),NOW(),'Scheduled by procedure',p_start_dt,DATE_ADD(p_start_dt, INTERVAL 1 HOUR),DATE_FORMAT(p_start_dt, '%H:%i'),DATE_FORMAT(DATE_ADD(p_start_dt, INTERVAL 1 HOUR), '%H:%i'),DATE(p_start_dt),v_court_code,'',p_judge_code,'N');
UPDATE data_casefiles SET assigned_start_date = p_start_dt,hearing_type = p_hearing_type,judge_code = p_judge_code,last_listing_date = NOW(),next_activity = CONCAT('Scheduled ', p_hearing_type)
WHERE claim_number = p_claim_number;
END`,

`CREATE PROCEDURE sp_reschedule_hearing(IN p_record_number INT,IN p_new_start_dt DATETIME,IN p_changed_by VARCHAR(255))
BEGIN
DECLARE v_claim_number VARCHAR(255);
SELECT claim_number INTO v_claim_number FROM data_casefiles_hearings WHERE record_number = p_record_number LIMIT 1;
UPDATE data_casefiles_hearings SET assigned_start_date = p_new_start_dt,comments = CONCAT(COALESCE(comments, ''), ' | Rescheduled by ', COALESCE(p_changed_by, 'system'), ' at ', NOW()) WHERE record_number = p_record_number;
UPDATE data_casefiles SET assigned_start_date = p_new_start_dt,last_listing_date = NOW(),next_activity = 'Hearing rescheduled' WHERE claim_number = v_claim_number;
END`,

`CREATE PROCEDURE sp_assign_judge(IN p_claim_number VARCHAR(255),IN p_judge_code INT,IN p_assigned_by VARCHAR(255))
BEGIN
UPDATE data_casefiles SET judge_code = p_judge_code,judge_acknowledged = 'N',pending_reassign = 'N',next_activity = CONCAT('Judge assigned by ', COALESCE(p_assigned_by, 'system')),last_listing_date = NOW() WHERE claim_number = p_claim_number;
END`,

`CREATE PROCEDURE sp_finalize_case(IN p_claim_number VARCHAR(255),IN p_outcome VARCHAR(255))
BEGIN
UPDATE data_casefiles SET claim_status = 'Closed',case_outcome = p_outcome,DateFinalized = NOW(),case_stage = 'Finalized',next_activity = 'Case finalized',last_listing_date = NOW() WHERE claim_number = p_claim_number;
END`,

`CREATE PROCEDURE sp_reopen_case(IN p_claim_number VARCHAR(255),IN p_reason VARCHAR(255))
BEGIN
UPDATE data_casefiles SET claim_status = 'Open',case_stage = 'Reopened',next_activity = CONCAT('Case reopened: ', COALESCE(p_reason, 'No reason supplied')),last_listing_date = NOW() WHERE claim_number = p_claim_number;
END`,

`CREATE PROCEDURE sp_bulk_close_stale_cases(IN p_days_old INT,IN p_outcome VARCHAR(255))
BEGIN
UPDATE data_casefiles SET claim_status = 'Closed',case_stage = 'Finalized',case_outcome = p_outcome,DateFinalized = NOW(),next_activity = CONCAT('Auto-finalized after ', p_days_old, ' days idle'),last_listing_date = NOW()
WHERE claim_status NOT IN ('Closed', 'Finalized', 'Disposed')
AND TIMESTAMPDIFF(DAY, COALESCE(last_listing_date, claim_date), NOW()) >= p_days_old;
END`,

`CREATE FUNCTION fn_case_age_days(p_claim_number VARCHAR(255)) RETURNS INT READS SQL DATA
BEGIN
DECLARE v_days INT;
SELECT TIMESTAMPDIFF(DAY, claim_date, NOW()) INTO v_days FROM data_casefiles WHERE claim_number = p_claim_number LIMIT 1;
RETURN COALESCE(v_days, 0);
END`,

`CREATE FUNCTION fn_next_hearing_date(p_claim_number VARCHAR(255)) RETURNS DATETIME READS SQL DATA
BEGIN
DECLARE v_dt DATETIME;
SELECT MIN(assigned_start_date) INTO v_dt FROM data_casefiles_hearings WHERE claim_number = p_claim_number AND voided <> 'Y' AND assigned_start_date >= NOW();
RETURN v_dt;
END`,

`CREATE FUNCTION fn_is_case_overdue(p_claim_number VARCHAR(255), p_days INT) RETURNS TINYINT READS SQL DATA
BEGIN
DECLARE v_is_overdue TINYINT DEFAULT 0;
SELECT CASE WHEN claim_status IN ('Closed', 'Finalized', 'Disposed') THEN 0 WHEN TIMESTAMPDIFF(DAY, COALESCE(last_listing_date, claim_date), NOW()) > p_days THEN 1 ELSE 0 END INTO v_is_overdue FROM data_casefiles WHERE claim_number = p_claim_number LIMIT 1;
RETURN COALESCE(v_is_overdue, 0);
END`,

`CREATE FUNCTION fn_case_status_bucket(p_claim_number VARCHAR(255)) RETURNS VARCHAR(20) READS SQL DATA
BEGIN
DECLARE v_status VARCHAR(255);
SELECT claim_status INTO v_status FROM data_casefiles WHERE claim_number = p_claim_number LIMIT 1;
RETURN CASE WHEN v_status IN ('Closed', 'Finalized', 'Disposed') THEN 'CLOSED' WHEN v_status IN ('Pending', 'Judgment Reserved', 'Awaiting Order') THEN 'PENDING' WHEN v_status IS NULL OR TRIM(v_status) = '' THEN 'UNKNOWN' ELSE 'OPEN' END;
END`,

`CREATE FUNCTION fn_judge_full_name(p_judge_code INT) RETURNS VARCHAR(255) READS SQL DATA
BEGIN
DECLARE v_name VARCHAR(255);
SELECT COALESCE(NULLIF(TRIM(judge_name), ''), CONCAT_WS(' ', NULLIF(TRIM(other_name), ''), NULLIF(TRIM(short_name), ''))) INTO v_name FROM cat_judges WHERE judge_code = p_judge_code LIMIT 1;
RETURN COALESCE(v_name, 'Unassigned');
END`,

`CREATE FUNCTION fn_hearing_count_7d(p_judge_code INT) RETURNS INT READS SQL DATA
BEGIN
DECLARE v_count INT;
SELECT COUNT(*) INTO v_count FROM data_casefiles_hearings WHERE judge_code = p_judge_code AND voided <> 'Y' AND assigned_start_date >= NOW() AND assigned_start_date < DATE_ADD(NOW(), INTERVAL 7 DAY);
RETURN COALESCE(v_count, 0);
END`
  ];

  for (const q of creates) await conn.query(q);

  log('Created all 18 objects.');

  const viewNames = ['ai_judge_daily_calendar','ai_overdue_cases','ai_case_timeline','ai_hearing_load_by_judge','ai_outcome_trends_30d','ai_cases_needing_action'];
  for (const v of viewNames) {
    const [cnt] = await conn.query(`SELECT COUNT(*) AS c FROM ${v}`);
    log(`View ${v}: ${cnt[0].c} rows`);
  }

  const [[caseRow]] = await conn.query("SELECT claim_number, judge_code FROM data_casefiles WHERE claim_number IS NOT NULL LIMIT 1");
  const [[closedRow]] = await conn.query("SELECT claim_number FROM data_casefiles WHERE claim_status IN ('Closed','Finalized','Disposed') LIMIT 1");
  const [[hearingRow]] = await conn.query("SELECT record_number, claim_number, assigned_start_date FROM data_casefiles_hearings WHERE voided <> 'Y' LIMIT 1");

  const [fnRows] = await conn.query(
    `SELECT fn_case_age_days(?) AS case_age_days,
            fn_next_hearing_date(?) AS next_hearing_date,
            fn_is_case_overdue(?, 45) AS is_overdue,
            fn_case_status_bucket(?) AS status_bucket,
            fn_judge_full_name(?) AS judge_name,
            fn_hearing_count_7d(?) AS hearings_7d`,
    [caseRow.claim_number, caseRow.claim_number, caseRow.claim_number, caseRow.claim_number, caseRow.judge_code || 0, caseRow.judge_code || 0]
  );
  log('Function sample output:', JSON.stringify(fnRows[0]));

  await conn.query('START TRANSACTION');
  await conn.query('CALL sp_assign_judge(?, ?, ?)', [caseRow.claim_number, caseRow.judge_code || 0, 'test-runner']);
  await conn.query('ROLLBACK');
  log('sp_assign_judge: OK (rollback)');

  await conn.query('START TRANSACTION');
  await conn.query('CALL sp_schedule_hearing(?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), ?, ?)', [caseRow.claim_number, 'Mention', caseRow.judge_code || 0, 'test-runner']);
  await conn.query('ROLLBACK');
  log('sp_schedule_hearing: OK (rollback)');

  await conn.query('START TRANSACTION');
  await conn.query('CALL sp_reschedule_hearing(?, DATE_ADD(NOW(), INTERVAL 3 DAY), ?)', [hearingRow.record_number, 'test-runner']);
  await conn.query('ROLLBACK');
  log('sp_reschedule_hearing: OK (rollback)');

  await conn.query('START TRANSACTION');
  await conn.query('CALL sp_finalize_case(?, ?)', [caseRow.claim_number, 'Test Outcome']);
  await conn.query('ROLLBACK');
  log('sp_finalize_case: OK (rollback)');

  if (closedRow && closedRow.claim_number) {
    await conn.query('START TRANSACTION');
    await conn.query('CALL sp_reopen_case(?, ?)', [closedRow.claim_number, 'Test reopen']);
    await conn.query('ROLLBACK');
    log('sp_reopen_case: OK (rollback)');
  } else {
    log('sp_reopen_case: SKIPPED (no closed case found)');
  }

  await conn.query('START TRANSACTION');
  await conn.query('CALL sp_bulk_close_stale_cases(?, ?)', [99999, 'No-Op Test']);
  await conn.query('ROLLBACK');
  log('sp_bulk_close_stale_cases: OK (rollback/no-op threshold)');

  const [routineCounts] = await conn.query(`
    SELECT ROUTINE_TYPE, COUNT(*) AS c
    FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE()
      AND ROUTINE_NAME IN (
        'sp_schedule_hearing','sp_reschedule_hearing','sp_assign_judge','sp_finalize_case','sp_reopen_case','sp_bulk_close_stale_cases',
        'fn_case_age_days','fn_next_hearing_date','fn_is_case_overdue','fn_case_status_bucket','fn_judge_full_name','fn_hearing_count_7d'
      )
    GROUP BY ROUTINE_TYPE
  `);
  log('Routine counts:', JSON.stringify(routineCounts));

  await conn.end();
}

run().catch((e) => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
