import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();

    const result = await client.query("SELECT NOW()");

    console.log("✅ Database connected successfully!");
    console.log("Server time:", result.rows[0]);

    await client.end();
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error.message);

    process.exit(1);
  }
}

testConnection();