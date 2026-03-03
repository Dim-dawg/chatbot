# Filename: list_mysql_tables.py

import mysql.connector
import os
import sys

# --- Configuration ---
# Fetch database connection details from environment variables.
# These should be set in your .env file and loaded into your environment.
MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_PORT = os.environ.get("MYSQL_PORT", "3306")
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE")

# --- Pre-checks ---
if not MYSQL_PASSWORD:
    print("Error: MYSQL_PASSWORD environment variable is not set.")
    print("Please ensure your .env file is correctly configured and loaded.")
    sys.exit(1)

if not MYSQL_DATABASE:
    print("Error: MYSQL_DATABASE environment variable is not set.")
    print("Please ensure your .env file is correctly configured and loaded.")
    sys.exit(1)

# --- Database Connection and Table Listing ---
connection = None
cursor = None
try:
    # Establish the connection to the MySQL database
    print(f"Attempting to connect to database '{MYSQL_DATABASE}' on {MYSQL_HOST}:{MYSQL_PORT} as user '{MYSQL_USER}'...")
    connection = mysql.connector.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE
    )

    if connection.is_connected():
        print("Connection successful!")

        # Create a cursor object to execute SQL queries
        cursor = connection.cursor()

        # Execute the query to list all tables in the database
        print("Fetching list of tables...")
        cursor.execute("SHOW TABLES;")

        # Fetch all the results
        tables = cursor.fetchall()

        if tables:
            print("
--- Tables in the database ---")
            for table_row in tables:
                # Each row is a tuple, table name is the first element
                print(f"- {table_row[0]}")
            print("------------------------------")
        else:
            print("
No tables found in the database.")

    else:
        print("Failed to connect to the database.")

except mysql.connector.Error as e:
    print(f"Database connection error: {e}")
    print("Please ensure the MySQL server is running and accessible, and that the credentials are correct.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

finally:
    # Close the cursor and connection
    if cursor is not None:
        cursor.close()
        print("Cursor closed.")
    if connection is not None and connection.is_connected():
        connection.close()
        print("MySQL connection closed.")
