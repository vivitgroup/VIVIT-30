import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema:  "./db/schema.ts",
  out:     "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use DRIZZLE_DATABASE_URL (direct port 5432) for migrations
    // Or DATABASE_URL (pooler port 6543) for push
    url: process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
  // Verbose logging for debugging
  verbose: true,
  // Strict mode — warns about destructive changes
  strict:  false,
});
