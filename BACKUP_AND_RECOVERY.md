# Backup & Recovery

## 1. MySQL Backups
System administrators should use standard tools like `mysqldump` to perform daily backups of the `casemanager` and `lexivault` databases.
```bash
mysqldump -u root -p casemanager > backup_$(date +%F).sql
```

## 2. Vector Index Recovery
If the `the_chatbot.index` file is lost or corrupted, it can be fully recovered by running the `ingest_cases.py` script, which rebuilds the index from the MySQL database.

## 3. Disaster Recovery
In the event of hardware failure:
1. Re-install prerequisites (Node.js, Python, MySQL, Ollama).
2. Restore MySQL from the latest `.sql` backup.
3. Re-ingest the vector database.
4. Update the `.env` file with restored credentials.
