import express from "express";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Removed global ai instance

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/schema", async (req, res) => {
    const { host, port, user, password, database } = req.body;
    try {
      const connection = await mysql.createConnection({
        host,
        port: port || 3306,
        user,
        password,
        database,
      });

      const [tables] = await connection.execute(
        `SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.tables WHERE table_schema = ?`,
        [database]
      );

      const schemaContext: any = {};
      
      for (const row of tables as any[]) {
        const tableName = row.TABLE_NAME;
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
          [database, tableName]
        );
        schemaContext[tableName] = (columns as any[]).map(c => `${c.COLUMN_NAME} (${c.DATA_TYPE})`);
      }

      await connection.end();
      res.json({ schema: schemaContext });
    } catch (error: any) {
      console.error("Schema fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch schema" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { message, credentials, schemaContext, history } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    console.log("API Key present:", !!apiKey, "Value:", apiKey ? apiKey.substring(0, 5) + "..." : "none");
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ 
        error: "API key is missing or invalid. Please ensure your Gemini API key is configured in the AI Studio Secrets panel." 
      });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
      // 1. Generate SQL using Gemini
      const prompt = `
You are a MySQL expert. Given the following database schema, write a MySQL query to answer the user's question.
Pay close attention to any filtering criteria (e.g., specific dates, statuses, names) and sorting preferences (e.g., newest first, alphabetical) mentioned by the user, and translate them into appropriate WHERE and ORDER BY clauses.
Return ONLY a valid JSON object with a single property "sql" containing the query string. Do not include markdown formatting or any other text.

Schema:
${JSON.stringify(schemaContext, null, 2)}

User Question: ${message}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sql: {
                type: Type.STRING,
                description: "The MySQL query to execute",
              },
            },
            required: ["sql"],
          },
        },
      });

      const jsonStr = response.text?.trim() || "{}";
      
      let sql = "";
      try {
        // Try to parse as JSON first
        // Sometimes the model wraps it in markdown like ```json ... ```
        const cleanedJsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanedJsonStr);
        sql = parsed.sql || "";
      } catch (e) {
        // If it's not valid JSON, maybe the model just returned text
        console.log("Failed to parse JSON, raw response:", jsonStr);
        // We'll just pass empty SQL and let the second prompt handle the conversational response
      }

      console.log("Generated SQL:", sql);

      // 2. Execute SQL
      let rows: any[] = [];
      if (sql && credentials.database !== 'Offline Mode (SQL Generation Only)') {
        const connection = await mysql.createConnection({
          host: credentials.host,
          port: credentials.port || 3306,
          user: credentials.user,
          password: credentials.password,
          database: credentials.database,
        });

        const [result] = await connection.execute(sql);
        rows = result as any[];
        await connection.end();
      }

      // 3. Generate natural language response
      const resultPrompt = `
You are a helpful database assistant. The user asked a question, and we generated a SQL query to get the answer.
${credentials.database === 'Offline Mode (SQL Generation Only)' ? 'We are in offline mode, so we did not execute the query. Just provide the SQL query and explain how it works.' : 'We executed the query and got the result data.'}
Based on the user's question, the SQL query, and the result data (if any), provide a clear, concise, and helpful answer to the user.
If the result is a large dataset, summarize it or present it nicely.

User Question: ${message}
SQL Query: ${sql}
Result Data: ${JSON.stringify(rows).substring(0, 5000)} // Truncated for length
`;

      const finalResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: resultPrompt,
      });

      res.json({
        reply: finalResponse.text,
        sql,
        data: rows,
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
