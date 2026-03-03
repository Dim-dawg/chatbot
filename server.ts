import express from "express";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_PORT = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

// --- Mistral Configuration ---
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = process.env.MISTRAL_MODEL_NAME || "mistral-large-latest";
const VECTOR_SERVICE_URL = "http://localhost:8000/search";

if (!MISTRAL_API_KEY) {
    console.error("CRITICAL: MISTRAL_API_KEY is missing from .env");
    process.exit(1);
}

async function getDbConnection(creds: any = null) {
    const config = {
        host: creds?.host || MYSQL_HOST || "localhost",
        port: parseInt(creds?.port || process.env.MYSQL_PORT || "3306"),
        user: creds?.user || MYSQL_USER,
        password: creds?.password || MYSQL_PASSWORD,
        database: creds?.database || MYSQL_DATABASE,
    };
    if (!config.user || !config.password || !config.database) {
        throw new Error("Database configuration incomplete. Ensure .env is set.");
    }
    return await mysql.createConnection(config);
}

async function callMistral(messages: any[]): Promise<string> {
    try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: MISTRAL_MODEL,
                messages: messages,
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error: any) {
        console.error("Error calling Mistral:", error);
        throw new Error(`Failed to get response from Mistral: ${error.message}`);
    }
}

async function searchVectors(query: string): Promise<any[]> {
    try {
        const response = await fetch(VECTOR_SERVICE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: query, top_k: 3 })
        });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.warn("Vector search failed (service might be down):", e);
        return [];
    }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // 1. Initialization: Fetch Schema
  app.post("/api/schema", async (req, res) => {
    try {
      const connection = await getDbConnection(req.body);
      const [tables] = await connection.execute(`SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?`, [connection.config.database]);
      const coreTables = new Set(["cat_judges", "data_casefiles", "data_casefiles_hearings", "view_case_judges", "view_case_parties", "cat_attorneys", "lawyers", "data_casefiles_attorneys", "cat_hearingtypes", "data_hearings_details", "view_case_calendars", "view_hearings", "cat_casetypes", "cat_outcomes", "cat_jurisdictions", "data_entities"]);
      const schemaContext: any = {};
      for (const row of tables as any[]) {
        const tableName = row.TABLE_NAME;
        if (coreTables.has(tableName)) {
            const [columns] = await connection.execute(`SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`, [connection.config.database, tableName]);
            schemaContext[tableName] = (columns as any[]).map(c => `${c.COLUMN_NAME} (${c.DATA_TYPE})`);
        }
      }
      await connection.end();
      res.json({ schema: schemaContext, database: connection.config.database });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 2. Chat & AI Commands (Hybrid RAG)
  app.post("/api/chat", async (req, res) => {
    const { message, credentials, schemaContext, uiContext } = req.body;
    try {
      const lowerMsg = String(message || '').toLowerCase();
      const pageAwarenessAsk = /(which page|what page|where am i|screen-aware|viewport|what can i do|what can be done|what is on this page|what's on this page|what can this page do)/i.test(lowerMsg);
      const actionAsk = /\b(assign|schedule|reopen|finali[sz]e|show|list|search|find|query)\b/i.test(lowerMsg);
      if (pageAwarenessAsk && !actionAsk) {
        const page = uiContext?.activePage || uiContext?.page || "unknown";
        const width = uiContext?.viewport?.width ?? "unknown";
        const height = uiContext?.viewport?.height ?? "unknown";
        const caps = uiContext?.pageCapabilities || null;
        const canDo = Array.isArray(caps?.canDo) ? caps.canDo : [];
        const dataViews = Array.isArray(caps?.dataViews) ? caps.dataViews : [];
        const actions = Array.isArray(caps?.actions) ? caps.actions : [];

        const lines: string[] = [];
        lines.push(`You are on the ${page} page (viewport ${width}x${height}).`);
        if (caps?.title) lines.push(`This screen is: ${caps.title}.`);
        if (canDo.length) {
          lines.push("What you can do here:");
          canDo.forEach((x: string, i: number) => lines.push(`${i + 1}) ${x}`));
        }
        if (dataViews.length) {
          lines.push("What is visible:");
          dataViews.forEach((x: string, i: number) => lines.push(`${i + 1}) ${x}`));
        }
        if (actions.length) {
          lines.push("Direct actions available:");
          actions.forEach((x: string, i: number) => lines.push(`${i + 1}) ${x}`));
        }

        return res.json({
          reply: lines.join("\n"),
          data: [],
          vectorData: [],
          success: true,
          multi_step: false
        });
      }

      // Step A: Detect Intent
      const intentPrompt = `
You are "The chatbot", a professional assistant for judges.
Analyze the user message and return ONLY valid JSON.

Allowed ACTIONS and REQUIRED params:
1) finalize_case: { claim_number, outcome }
2) assign_judge: { claim_number, judge_code }
3) schedule_hearing: { claim_number, hearing_type, start_dt, judge_code }
4) reopen_case: { claim_number, reason }

Rules:
- If the user asks to perform one of the actions above, return ACTION.
- If any required parameter is missing, still return ACTION with missing fields as null.
- For QUERY, return SQL SELECT only using known tables:
  data_casefiles, data_casefiles_hearings, cat_judges, ai_*
- Never use made-up tables like cases, claims, hearings.
- needs_vector_search should be true only for precedent/similarity/document lookup.

Current Schema: ${JSON.stringify(schemaContext, null, 2)}
UI Context: ${JSON.stringify(uiContext || {}, null, 2)}

Return JSON:
{
  "type": "QUERY" | "ACTION",
  "needs_vector_search": boolean,
  "sql": "SELECT ...",
  "action": "finalize_case" | "assign_judge" | "schedule_hearing" | "reopen_case" | null,
  "params": { ... },
  "missing_params": []
}

User Message: "${message}"
`;
      const intentRaw = await callMistral([{ role: "user", content: intentPrompt }]);
      
      let intent: any = { type: 'QUERY', sql: '' };
      try { 
          const jsonStr = intentRaw.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
          intent = JSON.parse(jsonStr); 
      } catch (e) { 
          if (intentRaw.toLowerCase().includes('select')) intent = { type: 'QUERY', sql: intentRaw.trim() }; 
      }

      // Deterministic fallback parser for ACTION prompts when model output is weak.
      const m = String(message || '');
      const claimMatch = m.match(/\b([A-Z]{1,4}-\d{2,4}-\d{1,6})\b/i);
      const judgeMatch = m.match(/\bjudge\s+(\d+)\b/i);
      const dateTimeMatch = m.match(/\b(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\b/);
      const hearingTypeMatch = m.match(/\b(mention|trial|motion|hearing)\b/i);
      const outcomeMatch = m.match(/\boutcome\s+([a-z0-9 _-]+)\b/i);

      if (/\bfinali[sz]e\b/i.test(m) && claimMatch) {
        intent = {
          type: 'ACTION',
          action: 'finalize_case',
          params: { claim_number: claimMatch[1], outcome: (outcomeMatch?.[1] || 'Resolved').trim() }
        };
      } else if (/\bassign\b/i.test(m) && /\bjudge\b/i.test(m) && claimMatch && judgeMatch) {
        intent = {
          type: 'ACTION',
          action: 'assign_judge',
          params: { claim_number: claimMatch[1], judge_code: Number(judgeMatch[1]) }
        };
      } else if (/\bschedule\b/i.test(m) && /\bhearing\b/i.test(m) && claimMatch && judgeMatch && dateTimeMatch) {
        intent = {
          type: 'ACTION',
          action: 'schedule_hearing',
          params: {
            claim_number: claimMatch[1],
            hearing_type: (hearingTypeMatch?.[1] || 'Mention'),
            start_dt: dateTimeMatch[1].length === 16 ? `${dateTimeMatch[1]}:00` : dateTimeMatch[1],
            judge_code: Number(judgeMatch[1])
          }
        };
      } else if (/\breopen\b/i.test(m) && claimMatch) {
        intent = {
          type: 'ACTION',
          action: 'reopen_case',
          params: { claim_number: claimMatch[1], reason: 'Reopened via assistant' }
        };
      }

      // Multi-step deterministic execution for prompts containing multiple actions/queries.
      let rawSteps = m
        .split(/\n+/)
        .flatMap((line: string) => line.split(/\bthen\b|;/i))
        .map((s: string) => s.replace(/^\s*\d+[\).\s-]*/, '').trim())
        .filter((s: string) => s.length > 3)
        .filter((s: string) => !/^(you are|do these in order|in order|after each step)/i.test(s));

      // Robust extractor for single-line numbered instructions: "1) ... 2) ... 3) ..."
      if (rawSteps.length === 0) {
        const numberedSteps: string[] = [];
        const re = /(?:^|\s)\d+\)\s*(.*?)(?=(?:\s+\d+\)\s*)|$)/gis;
        let match: RegExpExecArray | null;
        while ((match = re.exec(m)) !== null) {
          const step = String(match[1] || '').trim();
          if (step) numberedSteps.push(step);
        }
        if (numberedSteps.length > 0) rawSteps = numberedSteps;
      }
      const hasMultiStepSignal = rawSteps.length > 1 || /\b(then|after each step|in order)\b/i.test(m);

      const parseStepIntent = (text: string) => {
        const cleaned = String(text || '')
          .replace(/\s+after each step.*$/i, '')
          .trim()
          .replace(/[,\s]+$/, '');
        const cm = cleaned.match(/\b([A-Z]{1,4}-\d{2,4}-\d{1,6})\b/i);
        const jm = cleaned.match(/\bjudge\s+(\d+)\b/i);
        const dm = cleaned.match(/\b(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\b/);
        const hm = cleaned.match(/\b(mention|trial|motion|hearing)\b/i);
        const outcomeQuoted = cleaned.match(/\boutcome\s+"([^"]+)"/i) || cleaned.match(/\boutcome\s+'([^']+)'/i);
        const om = cleaned.match(/\boutcome\s+([a-z0-9 _-]+)\b/i);

        if (/\bfinali[sz]e\b/i.test(cleaned) && cm) {
          return {
            type: 'ACTION',
            action: 'finalize_case',
            params: { claim_number: cm[1], outcome: (outcomeQuoted?.[1] || om?.[1] || 'Resolved').trim() },
            step_text: cleaned
          };
        }
        if (/\bassign\b/i.test(cleaned) && /\bjudge\b/i.test(cleaned)) {
          return { type: 'ACTION', action: 'assign_judge', params: { claim_number: cm?.[1] || null, judge_code: jm ? Number(jm[1]) : null }, step_text: cleaned };
        }
        if (/\bschedule\b/i.test(cleaned) && /\bhearing\b/i.test(cleaned)) {
          return {
            type: 'ACTION',
            action: 'schedule_hearing',
            params: {
              claim_number: cm?.[1] || null,
              hearing_type: (hm?.[1] || 'Mention'),
              start_dt: dm ? (dm[1].length === 16 ? `${dm[1]}:00` : dm[1]) : null,
              judge_code: jm ? Number(jm[1]) : null
            },
            step_text: cleaned
          };
        }
        if (/\breopen\b/i.test(cleaned)) {
          const reasonQuoted = cleaned.match(/\breason\s+"([^"]+)"/i) || cleaned.match(/\breason\s+'([^']+)'/i);
          const reasonMatch = cleaned.match(/\breason\s+(.+)$/i);
          return {
            type: 'ACTION',
            action: 'reopen_case',
            params: { claim_number: cm?.[1] || null, reason: (reasonQuoted?.[1] || reasonMatch?.[1] || 'Reopened via assistant').trim() },
            step_text: cleaned
          };
        }
        if (/\brecent\b.*\bclosed\b.*\bcases?\b/i.test(cleaned)) {
          return { type: 'QUERY', sql: '__RECENT_CLOSED_FALLBACK__', step_text: cleaned };
        }
        return { type: 'QUERY', sql: null, step_text: cleaned };
      };

      const executeAction = async (action: string, p: any) => {
        const connection = await getDbConnection(credentials);
        try {
          if (action === 'finalize_case') {
            if (!p.claim_number) throw new Error("Missing required parameter: claim_number");
            await connection.execute('CALL sp_finalize_case(?, ?)', [p.claim_number, p.outcome || 'Resolved']);
            return true;
          }
          if (action === 'assign_judge') {
            if (!p.claim_number || p.judge_code === undefined || p.judge_code === null || Number.isNaN(Number(p.judge_code))) throw new Error("Missing required parameters: claim_number, judge_code");
            await connection.execute('CALL sp_assign_judge(?, ?, ?)', [p.claim_number, p.judge_code, 'ai_assistant']);
            return true;
          }
          if (action === 'schedule_hearing') {
            if (!p.claim_number || !p.hearing_type || !p.start_dt || p.judge_code === undefined || p.judge_code === null || Number.isNaN(Number(p.judge_code))) throw new Error("Missing required parameters: claim_number, hearing_type, start_dt, judge_code");
            const [existing] = await connection.execute(
              `
              SELECT record_number, assigned_start_date, start_time
              FROM data_casefiles_hearings
              WHERE claim_number = ?
                AND hearing_type = ?
                AND assigned_start_date = ?
                AND (voided IS NULL OR voided <> 'Y')
              LIMIT 1
              `,
              [p.claim_number, p.hearing_type, p.start_dt]
            );
            if (Array.isArray(existing) && existing.length > 0) {
              const dt = new Date(p.start_dt);
              const suggested = isNaN(dt.getTime())
                ? null
                : new Date(dt.getTime() + 30 * 60000).toISOString().slice(0, 19).replace('T', ' ');
              throw new Error(
                suggested
                  ? `Hearing already exists for that claim/type/date-time. Suggested next slot: ${suggested}`
                  : "Hearing already exists for that claim/type/date-time."
              );
            }
            await connection.execute('CALL sp_schedule_hearing(?, ?, ?, ?, ?)', [p.claim_number, p.hearing_type, p.start_dt, p.judge_code, 'ai_assistant']);
            return true;
          }
          if (action === 'reopen_case') {
            if (!p.claim_number) throw new Error("Missing required parameter: claim_number");
            await connection.execute('CALL sp_reopen_case(?, ?)', [p.claim_number, p.reason || 'Reopened via assistant']);
            return true;
          }
          throw new Error(`Unsupported action: ${action}`);
        } finally {
          await connection.end();
        }
      };

      if (hasMultiStepSignal) {
        const results: any[] = [];
        for (const stepText of rawSteps) {
          const parsed = parseStepIntent(stepText);
          if (parsed.type === 'ACTION') {
            try {
              await executeAction(parsed.action, parsed.params);
              results.push({ step: parsed.step_text || stepText, type: 'ACTION', action: parsed.action, params: parsed.params, success: true });
            } catch (e: any) {
              results.push({ step: parsed.step_text || stepText, type: 'ACTION', action: parsed.action, params: parsed.params, success: false, error: e.message });
            }
          } else if (parsed.sql === '__RECENT_CLOSED_FALLBACK__') {
            try {
              const connection = await getDbConnection(credentials);
              const [result] = await connection.execute(`
                SELECT claim_number, CaseName, case_outcome, DateFinalized
                FROM data_casefiles
                WHERE claim_status = 'FINALIZED' OR case_outcome IS NOT NULL
                ORDER BY DateFinalized DESC
                LIMIT 5
              `);
              await connection.end();
              results.push({ step: parsed.step_text || stepText, type: 'QUERY', params: {}, success: true, rows: result });
            } catch (e: any) {
              results.push({ step: parsed.step_text || stepText, type: 'QUERY', params: {}, success: false, error: e.message, rows: [] });
            }
          } else {
            results.push({ step: parsed.step_text || stepText, type: 'UNKNOWN', success: false, error: 'Could not map step to supported action/query' });
          }
        }
        const allOk = results.length > 0 && results.every((r) => r.success);
        const okCount = results.filter((r) => r.success).length;
        const failCount = results.length - okCount;
        const page = uiContext?.activePage || uiContext?.page || 'unknown';
        const vpw = uiContext?.viewport?.width ?? 'unknown';
        const vph = uiContext?.viewport?.height ?? 'unknown';

        const userLines = results.map((r, i) => {
          const usedParams = r?.params ? JSON.stringify(r.params) : '{}';
          if (r.type === 'QUERY') {
            const count = Array.isArray(r.rows) ? r.rows.length : 0;
            return `${i + 1}) Requested: ${r.step}\nParameters used: ${usedParams}\nStatus: ${r.success ? `SUCCESS (returned ${count} row(s))` : `FAILED (${r.error})`}`;
          }
          if (r.type === 'ACTION') {
            return `${i + 1}) Requested: ${r.step}\nParameters used: ${usedParams}\nStatus: ${r.success ? 'SUCCESS' : `FAILED (${r.error})`}`;
          }
          return `${i + 1}) Requested: ${r.step}\nParameters used: ${usedParams}\nStatus: FAILED (Could not map step to a supported action/query)`;
        });

        const topLine = `You are on the ${page} page, viewport ${vpw}x${vph}.`;
        const summaryLine = `I executed ${results.length} step(s): ${okCount} succeeded, ${failCount} failed.`;
        const naturalReply = `${topLine}\n${summaryLine}\n\n${userLines.join('\n\n')}`;
        return res.json({
          reply: naturalReply,
          data: results,
          vectorData: [],
          success: allOk,
          multi_step: true
        });
      }

      let rows: any[] = [];
      let vectorResults: any[] = [];
      let actionSuccess = false;

      // Step B: Execute Vector Search if needed
      if (intent.needs_vector_search) {
          vectorResults = await searchVectors(message);
      }

      // Step C: Execute SQL or Action
      if (intent.type === 'ACTION') {
          const p = intent.params || {};
          const connection = await getDbConnection(credentials);
          try {
            if (intent.action === 'finalize_case') {
              if (!p.claim_number) throw new Error("Missing required parameter: claim_number");
              await connection.execute('CALL sp_finalize_case(?, ?)', [p.claim_number, p.outcome || 'Resolved']);
              actionSuccess = true;
            } else if (intent.action === 'assign_judge') {
              if (!p.claim_number || p.judge_code === undefined || p.judge_code === null || Number.isNaN(Number(p.judge_code))) {
                throw new Error("Missing required parameters: claim_number, judge_code");
              }
              await connection.execute('CALL sp_assign_judge(?, ?, ?)', [p.claim_number, p.judge_code, 'ai_assistant']);
              actionSuccess = true;
            } else if (intent.action === 'schedule_hearing') {
              if (!p.claim_number || !p.hearing_type || !p.start_dt || p.judge_code === undefined || p.judge_code === null || Number.isNaN(Number(p.judge_code))) {
                throw new Error("Missing required parameters: claim_number, hearing_type, start_dt, judge_code");
              }
              const [existing] = await connection.execute(
                `
                SELECT record_number, assigned_start_date, start_time
                FROM data_casefiles_hearings
                WHERE claim_number = ?
                  AND hearing_type = ?
                  AND assigned_start_date = ?
                  AND (voided IS NULL OR voided <> 'Y')
                LIMIT 1
                `,
                [p.claim_number, p.hearing_type, p.start_dt]
              );
              if (Array.isArray(existing) && existing.length > 0) {
                const dt = new Date(p.start_dt);
                const suggested = isNaN(dt.getTime())
                  ? null
                  : new Date(dt.getTime() + 30 * 60000).toISOString().slice(0, 19).replace('T', ' ');
                throw new Error(
                  suggested
                    ? `Hearing already exists for that claim/type/date-time. Suggested next slot: ${suggested}`
                    : "Hearing already exists for that claim/type/date-time."
                );
              }
              await connection.execute('CALL sp_schedule_hearing(?, ?, ?, ?, ?)', [p.claim_number, p.hearing_type, p.start_dt, p.judge_code, 'ai_assistant']);
              actionSuccess = true;
            } else if (intent.action === 'reopen_case') {
              if (!p.claim_number) throw new Error("Missing required parameter: claim_number");
              await connection.execute('CALL sp_reopen_case(?, ?)', [p.claim_number, p.reason || 'Reopened via assistant']);
              actionSuccess = true;
            }
          } finally {
            await connection.end();
          }
      } else if (intent.sql) {
          const sql = String(intent.sql).trim();
          if (!/^select\b/i.test(sql)) throw new Error("Only SELECT queries are allowed in chat query mode.");
          const forbidden = /\b(cases|claims|hearings)\b/i; // common hallucinated tables in this project
          if (forbidden.test(sql) && !/\b(data_casefiles|data_casefiles_hearings|cat_judges|ai_)\b/i.test(sql)) {
            throw new Error("Generated SQL references non-existent tables. Please rephrase using known schema.");
          }
          try {
            const connection = await getDbConnection(credentials);
            try {
              const [result] = await connection.execute(sql);
              rows = result as any[];
            } finally {
              await connection.end();
            }
          } catch (queryErr: any) {
            // If generated SQL fails, use deterministic fallback for known requests.
            if (/\brecent\b.*\bclosed\b.*\bcases?\b/i.test(m)) {
              const connection = await getDbConnection(credentials);
              try {
                const [result] = await connection.execute(`
                  SELECT claim_number, CaseName, case_outcome, DateFinalized
                  FROM data_casefiles
                  WHERE claim_status = 'FINALIZED' OR case_outcome IS NOT NULL
                  ORDER BY DateFinalized DESC
                  LIMIT 5
                `);
                rows = result as any[];
              } finally {
                await connection.end();
              }
            } else {
              throw queryErr;
            }
          }
      }

      // Deterministic query fallback for common requests when model SQL is unusable.
      if (intent.type !== 'ACTION' && rows.length === 0 && /\brecent\b.*\bclosed\b.*\bcases?\b/i.test(m)) {
        const connection = await getDbConnection(credentials);
        try {
          const [result] = await connection.execute(`
            SELECT claim_number, CaseName, case_outcome, DateFinalized
            FROM data_casefiles
            WHERE claim_status = 'FINALIZED' OR case_outcome IS NOT NULL
            ORDER BY DateFinalized DESC
            LIMIT 5
          `);
          rows = result as any[];
        } finally {
          await connection.end();
        }
      }

      // Step D: Synthesize Answer
      const systemContext = `
You are "The chatbot". Answer based ONLY on provided data.
If Action Status is Success, explicitly confirm the action and parameters used.
SQL Results: ${JSON.stringify(rows).substring(0, 3000)}
Vector/Document Context: ${JSON.stringify(vectorResults).substring(0, 3000)}
UI Context: ${JSON.stringify(uiContext || {}).substring(0, 1000)}
Action: ${intent.action || "none"}
Action Params: ${JSON.stringify(intent.params || {})}
Action Status: ${actionSuccess ? "Success" : "None"}
`;
      
      const reply = await callMistral([
          { role: "system", content: systemContext },
          { role: "user", content: message }
      ]);

      res.json({ reply, data: rows, vectorData: vectorResults, success: actionSuccess });

    } catch (error: any) { 
        console.error("Chat Error", error);
        res.status(500).json({ error: error.message }); 
    }
  });

  // 3. Dashboard Filters
  app.post("/api/dashboard/filters", async (req, res) => {
    try {
      const connection = await getDbConnection(req.body.credentials);
      const [caseTypes] = await connection.execute('SELECT DISTINCT case_type FROM data_casefiles WHERE case_type IS NOT NULL ORDER BY case_type');
      const [judges] = await connection.execute('SELECT DISTINCT judge_name FROM cat_judges ORDER BY judge_name');
      const [jurisdictions] = await connection.execute('SELECT DISTINCT jurisdiction FROM data_casefiles WHERE jurisdiction IS NOT NULL ORDER BY jurisdiction');
      await connection.end();
      res.json({
        caseTypes: (caseTypes as any[]).map(r => r.case_type),
        judges: (judges as any[]).map(r => r.judge_name),
        jurisdictions: (jurisdictions as any[]).map(r => r.jurisdiction)
      });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 4. Dashboard Summary
  app.post("/api/dashboard/summary", async (req, res) => {
    const { credentials, filters } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      let where = " WHERE 1=1";
      let params: any[] = [];
      if (filters?.caseType) { where += " AND case_type = ?"; params.push(filters.caseType); }
      if (filters?.judgeName) { 
          const [j] = await connection.execute('SELECT judge_code FROM cat_judges WHERE judge_name = ?', [filters.judgeName]);
          if (j[0]) { where += " AND judge_code = ?"; params.push(j[0].judge_code); }
      }
      if (filters?.jurisdiction) { where += " AND jurisdiction = ?"; params.push(filters.jurisdiction); }
      if (filters?.days && String(filters.days).toLowerCase() !== 'all') {
        const d = Number(filters.days);
        if (!Number.isNaN(d) && d > 0) {
          where += " AND claim_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)";
          params.push(d);
        }
      }

      const [total] = await connection.execute(`SELECT COUNT(*) as count FROM data_casefiles ${where}`, params);
      const [open] = await connection.execute(`SELECT COUNT(*) as count FROM data_casefiles ${where} AND claim_status = 'ACTIVE'`, params);
      const [closed] = await connection.execute(`SELECT COUNT(*) as count FROM data_casefiles ${where} AND claim_status = 'FINALIZED'`, params);
      const [pending] = await connection.execute(`SELECT COUNT(*) as count FROM data_casefiles ${where} AND claim_status = 'ACTIVE' AND case_outcome = 'PENDING'`, params);

      await connection.end();
      res.json({ total: total[0].count, open: open[0].count, closed: closed[0].count, pending: pending[0].count });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 5. Dashboard Hearings
  app.post("/api/dashboard/upcoming-hearings", async (req, res) => {
    const { credentials, filters } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      let where = "";
      let params = [];
      if (filters?.caseType) { where += " AND c.case_type = ?"; params.push(filters.caseType); }
      if (filters?.judgeName) { where += " AND j.judge_name = ?"; params.push(filters.judgeName); }
      
      const [rows] = await connection.execute(`
        SELECT h.claim_number, c.CaseName as casename, h.hearing_type, h.assigned_start_date, h.start_time, j.judge_name 
        FROM data_casefiles_hearings h
        JOIN data_casefiles c ON h.claim_number = c.claim_number
        LEFT JOIN cat_judges j ON h.judge_code = j.judge_code
        WHERE 1=1 ${where}
        ORDER BY h.assigned_start_date DESC LIMIT 15
      `, params);
      await connection.end();
      res.json(rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 6. Dashboard Judgments
  app.post("/api/dashboard/recent-judgments", async (req, res) => {
    const { credentials, filters } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      let where = " AND DateFinalized != '1900-01-01 00:00:00'";
      let params = [];
      if (filters?.caseType) { where += " AND case_type = ?"; params.push(filters.caseType); }
      
      const [rows] = await connection.execute(`
        SELECT claim_number, CaseName, case_outcome, DateFinalized 
        FROM data_casefiles 
        WHERE 1=1 ${where}
        ORDER BY DateFinalized DESC LIMIT 10
      `, params);
      await connection.end();
      res.json(rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 6b. Dashboard Outcome Mix (aggregated)
  app.post("/api/dashboard/outcome-mix", async (req, res) => {
    const { credentials, filters } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      let where = " WHERE c.case_outcome IS NOT NULL AND TRIM(c.case_outcome) <> ''";
      const params: any[] = [];
      if (filters?.caseType) { where += " AND c.case_type = ?"; params.push(filters.caseType); }
      if (filters?.judgeName) { where += " AND j.judge_name = ?"; params.push(filters.judgeName); }
      if (filters?.jurisdiction) { where += " AND c.jurisdiction = ?"; params.push(filters.jurisdiction); }
      if (filters?.days && String(filters.days).toLowerCase() !== 'all') {
        const d = Number(filters.days);
        if (!Number.isNaN(d) && d > 0) {
          where += " AND c.claim_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)";
          params.push(d);
        }
      }

      // Prefer terminal outcomes so pie isn't dominated by "PENDING" when resolved outcomes exist.
      const [terminalRows] = await connection.execute(`
        SELECT c.case_outcome as name, COUNT(*) as value
        FROM data_casefiles c
        LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
        ${where}
          AND UPPER(c.case_outcome) <> 'PENDING'
        GROUP BY c.case_outcome
        ORDER BY value DESC
      `, params);

      let rows: any[] = terminalRows as any[];
      if (!rows.length) {
        const [allRows] = await connection.execute(`
          SELECT c.case_outcome as name, COUNT(*) as value
          FROM data_casefiles c
          LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
          ${where}
          GROUP BY c.case_outcome
          ORDER BY value DESC
        `, params);
        rows = allRows as any[];
      }
      await connection.end();
      res.json(rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 7. Dashboard Trend
  app.get("/api/dashboard/monthly-case-counts", async (req, res) => {
    try {
      const connection = await getDbConnection();
      const excludeFuture = String(req.query.exclude_future || '0') === '1';
      const daysRaw = String(req.query.days || 'all');
      const days = daysRaw.toLowerCase() === 'all' ? null : Number(daysRaw);
      const extraWhere = excludeFuture ? " AND claim_date <= CURRENT_DATE()" : "";
      const daysWhere = !days || Number.isNaN(days) || days <= 0 ? "" : " AND claim_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)";
      const [rows] = await connection.execute(`
        SELECT DATE_FORMAT(claim_date, '%b %Y') AS month, COUNT(*) AS count 
        FROM data_casefiles 
        WHERE claim_date IS NOT NULL
          ${extraWhere}
          ${daysWhere}
        GROUP BY DATE_FORMAT(claim_date, '%Y-%m'), month 
        ORDER BY MIN(claim_date) DESC LIMIT 12
      `, !days || Number.isNaN(days) || days <= 0 ? [] : [days]);
      await connection.end();
      res.json((rows as any[]).reverse());
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 5b. Calendar schedules by date range
  app.post("/api/calendar/schedules", async (req, res) => {
    const { credentials, startDate, endDate } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      const start = startDate || new Date().toISOString().slice(0, 10);
      const end = endDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const [rows] = await connection.execute(
        `
        SELECT
          h.record_number,
          h.claim_number,
          c.CaseName AS casename,
          h.hearing_type,
          h.assigned_start_date,
          h.start_time,
          h.end_time,
          h.court_code,
          j.judge_name,
          p.party_names
        FROM data_casefiles_hearings h
        LEFT JOIN data_casefiles c ON c.claim_number = h.claim_number
        LEFT JOIN cat_judges j ON j.judge_code = h.judge_code
        LEFT JOIN ai_case_parties_summary p ON p.claim_number = h.claim_number
        WHERE DATE(h.assigned_start_date) BETWEEN ? AND ?
          AND (h.voided IS NULL OR h.voided <> 'Y')
        ORDER BY h.assigned_start_date ASC, h.start_time ASC
        `,
        [start, end]
      );
      await connection.end();
      res.json(rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 7b. Cases Needing Action
  app.post("/api/dashboard/cases-needing-action", async (req, res) => {
    const { credentials, filters } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      let where = " WHERE 1=1";
      const params: any[] = [];
      if (filters?.caseType) { where += " AND c.case_type = ?"; params.push(filters.caseType); }
      if (filters?.judgeName) { where += " AND j.judge_name = ?"; params.push(filters.judgeName); }
      if (filters?.jurisdiction) { where += " AND c.jurisdiction = ?"; params.push(filters.jurisdiction); }

      const [rows] = await connection.execute(`
        SELECT
          c.claim_number,
          c.CaseName,
          c.claim_date,
          c.claim_status,
          c.case_stage,
          j.judge_name,
          CASE
            WHEN c.judge_code IS NULL OR c.judge_code = 0 THEN 'NO_JUDGE_ASSIGNED'
            WHEN c.assigned_start_date IS NULL THEN 'NO_NEXT_HEARING_DATE'
            WHEN c.claim_status <> 'FINALIZED' AND TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) > 45 THEN 'STALE_OPEN_CASE'
            ELSE 'CHECK_MANUALLY'
          END AS action_reason
        FROM data_casefiles c
        LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
        ${where}
        ORDER BY c.claim_date ASC
        LIMIT 200
      `, params);
      await connection.end();
      res.json(rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 7c. Overdue Cases
  app.post("/api/dashboard/overdue-cases", async (req, res) => {
    const { credentials, filters } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      let where = " WHERE c.claim_date IS NOT NULL";
      const params: any[] = [];
      if (filters?.caseType) { where += " AND c.case_type = ?"; params.push(filters.caseType); }
      if (filters?.judgeName) { where += " AND j.judge_name = ?"; params.push(filters.judgeName); }
      if (filters?.jurisdiction) { where += " AND c.jurisdiction = ?"; params.push(filters.jurisdiction); }

      const [rows] = await connection.execute(`
        SELECT
          c.claim_number,
          c.CaseName,
          c.claim_status,
          c.case_stage,
          c.claim_date,
          c.last_listing_date,
          j.judge_name,
          TIMESTAMPDIFF(DAY, c.claim_date, NOW()) AS case_age_days,
          TIMESTAMPDIFF(DAY, COALESCE(c.last_listing_date, c.claim_date), NOW()) AS days_since_last_listing
        FROM data_casefiles c
        LEFT JOIN cat_judges j ON j.judge_code = c.judge_code
        ${where}
        AND c.claim_status <> 'FINALIZED'
        AND TIMESTAMPDIFF(DAY, c.claim_date, NOW()) > 90
        ORDER BY days_since_last_listing DESC
        LIMIT 200
      `, params);
      await connection.end();
      res.json(rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 8. Global Case Search
  app.post("/api/cases/search", async (req, res) => {
    const { query, credentials } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      const searchTerm = `%${query}%`;
      const [rows] = await connection.execute(`SELECT claim_number, CaseName, claim_status, case_outcome FROM data_casefiles WHERE CaseName LIKE ? OR claim_number LIKE ? LIMIT 50`, [searchTerm, searchTerm]);
      await connection.end();
      res.json(rows);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 9. Case Detail (File View)
  app.post("/api/cases/detail", async (req, res) => {
    const { claim_number, credentials } = req.body;
    try {
      const connection = await getDbConnection(credentials);
      const [caseInfo] = await connection.execute(`
        SELECT c.*, j.judge_name 
        FROM data_casefiles c 
        LEFT JOIN cat_judges j ON c.judge_code = j.judge_code 
        WHERE c.claim_number = ?
      `, [claim_number]);
      const [parties] = await connection.execute('SELECT entity_name, role, attorneys FROM view_case_parties WHERE claim_number = ?', [claim_number]);
      const [history] = await connection.execute('SELECT hearing_type, assigned_start_date, start_time, hearing_outcome, comments FROM data_casefiles_hearings WHERE claim_number = ? ORDER BY assigned_start_date DESC', [claim_number]);
      await connection.end();
      res.json({ info: (caseInfo as any[])[0], parties, history });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // 10. Operations: Finalize Case
  app.post("/api/cases/finalize", async (req, res) => {
    try {
      const connection = await getDbConnection(req.body.credentials);
      await connection.execute('CALL sp_finalize_case(?, ?)', [req.body.claim_number, req.body.outcome]);
      await connection.end();
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else { app.use(express.static("dist")); }

  app.listen(PORT, "0.0.0.0", () => { console.log(`Server running on http://localhost:${PORT}`); });
}
startServer();
