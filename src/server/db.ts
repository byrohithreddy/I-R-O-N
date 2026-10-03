import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { generateSalt, hashPassword } from './crypto';

// Generic database statement interface matching Cloudflare D1
export interface DbStatement {
  bind(...params: any[]): DbStatement;
  all<T = any>(): Promise<{ results: T[] }>;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: any }>;
}

export interface IronDatabase {
  prepare(sql: string): DbStatement;
  batch(statements: DbStatement[]): Promise<any[]>;
  exec(sql: string): void;
}

// Local SQLite Adapter that mirrors Cloudflare D1
class LocalSqliteDatabase implements IronDatabase {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): DbStatement {
    const rawSql = sql;
    let boundParams: any[] = [];
    const dbInstance = this.db;

    const stmtObj: DbStatement = {
      bind(...params: any[]) {
        boundParams = params;
        return stmtObj;
      },
      async all<T = any>(): Promise<{ results: T[] }> {
        const stmt = dbInstance.prepare(rawSql);
        const results = stmt.all(...boundParams) as T[];
        return { results };
      },
      async first<T = any>(colName?: string): Promise<T | null> {
        const stmt = dbInstance.prepare(rawSql);
        const row = stmt.get(...boundParams) as any;
        if (!row) return null;
        if (colName) return row[colName] !== undefined ? row[colName] : null;
        return row as T;
      },
      async run(): Promise<{ success: boolean; meta?: any }> {
        const stmt = dbInstance.prepare(rawSql);
        const info = stmt.run(...boundParams);
        return { success: true, meta: info };
      },
    };

    return stmtObj;
  }

  async batch(statements: DbStatement[]): Promise<any[]> {
    this.db.exec('BEGIN TRANSACTION');
    try {
      const results: any[] = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      this.db.exec('COMMIT');
      return results;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}

let globalDb: IronDatabase | null = null;

export function getDatabase(): IronDatabase {
  if (globalDb) return globalDb;

  const dbDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'iron.sqlite');
  globalDb = new LocalSqliteDatabase(dbPath);
  return globalDb;
}

// Initialize tables and seed database
export async function initializeDatabase(db: IronDatabase): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  try {
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (e) {}

  // Keep older local SQLite databases compatible with the authoritative Student Master schema.
  try {
    const columns = await db.prepare('PRAGMA table_info(students)').all<any>();
    const names = new Set(columns.results.map((r: any) => r.name));
    for (const [name, definition] of [
      ['college', "TEXT NOT NULL DEFAULT ''"],
      ['department', "TEXT NOT NULL DEFAULT ''"],
      ['academic_year', "TEXT NOT NULL DEFAULT '2023-2027'"],
      ['is_active', 'INTEGER NOT NULL DEFAULT 1'],
    ] as Array<[string, string]>) {
      if (!names.has(name)) {
        db.exec(`ALTER TABLE students ADD COLUMN ${name} ${definition}`);
      }
    }
  } catch (e) {
    console.warn('Student schema compatibility check failed:', e);
  }

  // Applications table status column compatibility
  try {
    const columns = await db.prepare('PRAGMA table_info(applications)').all<any>();
    const names = new Set(columns.results.map((r: any) => r.name));
    if (!names.has('status')) {
      db.exec("ALTER TABLE applications ADD COLUMN status TEXT NOT NULL DEFAULT 'APPLIED'");
    }
  } catch (e) {}

  // Users table is_active column compatibility
  try {
    const columns = await db.prepare('PRAGMA table_info(users)').all<any>();
    const names = new Set(columns.results.map((r: any) => r.name));
    if (!names.has('is_active')) {
      db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    }
  } catch (e) {}

  // Ensure UNIQUE index on rounds(drive_id, round_number)
  try {
    db.exec(`
      DELETE FROM rounds
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM rounds
        GROUP BY drive_id, round_number
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_drive_round_number ON rounds(drive_id, round_number);
    `);
  } catch (e) {
    // Already enforced or index exists
  }

  // 1. Check if TPO admin exists
  const existingTpo = await db
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind('Tpo_admin')
    .first();

  if (!existingTpo) {
    const tpoSalt = generateSalt();
    const tpoHash = await hashPassword('tpo_password_2026', tpoSalt);

    await db
      .prepare(
        `INSERT INTO users (id, username, password_hash, salt, role, full_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        'usr_tpo_admin',
        'Tpo_admin',
        tpoHash,
        tpoSalt,
        'TPO',
        'Head of Training & Placement'
      )
      .run();
  }

  // 2. Student Master DB and Recruitment Drives are authoritative and created only by TPO.
  // Purge any legacy sample mock drives that may exist in older database files
  try {
    const mockIds = ['drv_google', 'drv_tcs', 'drv_microsoft', 'drv_accenture'];
    for (const mId of mockIds) {
      await db.prepare('DELETE FROM drives WHERE id = ?').bind(mId).run();
      await db.prepare('DELETE FROM users WHERE drive_id = ?').bind(mId).run();
      await db.prepare('DELETE FROM drive_credentials WHERE drive_id = ?').bind(mId).run();
    }
  } catch (err) {
    // Ignore if tables don't exist yet
  }
}
