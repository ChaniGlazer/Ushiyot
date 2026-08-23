import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "nitzotz.db");

let instance: DatabaseSync | null = null;

function getInstance(): DatabaseSync {
  if (!instance) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    instance = new DatabaseSync(DB_PATH);
    instance.exec("PRAGMA journal_mode = WAL;");
    instance.exec("PRAGMA foreign_keys = ON;");
    runMigrations(instance);
  }
  return instance;
}

/**
 * Lazy Proxy: no file is opened until the first property/method access.
 * Keeps `import { db } from "@/lib/db"` side-effect-free at module load time
 * (safe during Next.js build) while still exposing a normal DatabaseSync API.
 */
export const db: DatabaseSync = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const real = getInstance();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
