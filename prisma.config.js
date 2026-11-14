// Prisma 7 reads its settings (schema location, migrations folder and the
// database URL) from this file instead of from schema.prisma.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seeds.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
