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

  // 2. Student Master DB is intentionally empty until the TPO imports the authoritative dataset.
  // 3. Seed Initial Sample Drives & Recruiter Accounts
  const existingDrives = await db
    .prepare('SELECT COUNT(*) as count FROM drives')
    .first<{ count: number }>();

  if (!existingDrives || existingDrives.count === 0) {
    const drivesData = [
      {
        id: 'drv_google',
        companyName: 'Google Cloud India',
        jobRole: 'Associate Cloud Engineer (SDE-1)',
        package: '₹18.5 LPA',
        jobDescription: 'Design, build, and deploy reliable, scalable microservices and infrastructure.',
        eligibilityCriteria: 'Minimum 8.0 CGPA, strictly 0 active backlogs.',
        minimumCgpa: 8.0,
        backlogRule: 0,
        eligibleBranches: JSON.stringify(['CSE', 'CSIT', 'ECE']),
        driveDate: '2026-10-15',
        driveTime: '09:00',
        location: 'Campus Main Auditorium & Lab 4',
        applicationDeadline: '2026-10-15T00:00:00Z',
        status: 'ONGOING',
        retentionExpiresAt: '2027-04-15',
        coordUser: 'coord_google',
        coordPass: 'coord2026@google',
        hrUser: 'hr_google',
        hrPass: 'hr2026@google',
      },
      {
        id: 'drv_tcs',
        companyName: 'Tata Consultancy Services',
        jobRole: 'Digital & Prime Software Engineer',
        package: '₹9.0 LPA',
        jobDescription: 'Software engineer for enterprise cloud platforms and artificial intelligence solutions.',
        eligibilityCriteria: 'Minimum 7.0 CGPA, maximum 1 backlog allowed.',
        minimumCgpa: 7.0,
        backlogRule: 1,
        eligibleBranches: JSON.stringify(['CSE', 'CSIT', 'ECE', 'EEE']),
        driveDate: '2026-10-25',
        driveTime: '08:30',
        location: 'Convention Hall & Online Testing Lab',
        applicationDeadline: '2026-10-25T00:00:00Z',
        status: 'ONGOING',
        retentionExpiresAt: '2027-04-25',
        coordUser: 'coord_tcs',
        coordPass: 'coord2026@tcs',
        hrUser: 'hr_tcs',
        hrPass: 'hr2026@tcs',
      },
      {
        id: 'drv_microsoft',
        companyName: 'Microsoft IDC',
        jobRole: 'Software Development Engineer',
        package: '₹22.0 LPA',
        jobDescription: 'Core platform engineering on Azure, Windows, and distributed cloud services.',
        eligibilityCriteria: 'Minimum 8.5 CGPA, strictly 0 active backlogs.',
        minimumCgpa: 8.5,
        backlogRule: 0,
        eligibleBranches: JSON.stringify(['CSE', 'CSIT']),
        driveDate: '2026-11-02',
        driveTime: '10:00',
        location: 'Seminar Hall 1',
        applicationDeadline: '2026-11-02T00:00:00Z',
        status: 'UPCOMING',
        retentionExpiresAt: '2027-05-02',
        coordUser: 'coord_microsoft',
        coordPass: 'coord2026@microsoft',
        hrUser: 'hr_microsoft',
        hrPass: 'hr2026@microsoft',
      },
    ];

    for (const d of drivesData) {
      await db
        .prepare(
          `INSERT INTO drives
           (id, company_name, job_role, package, job_description, eligibility_criteria, minimum_cgpa, backlog_rule, eligible_branches, drive_date, drive_time, location, application_deadline, status, retention_expires_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(
          d.id,
          d.companyName,
          d.jobRole,
          d.package,
          d.jobDescription,
          d.eligibilityCriteria,
          d.minimumCgpa,
          d.backlogRule,
          d.eligibleBranches,
          d.driveDate,
          d.driveTime,
          d.location,
          d.applicationDeadline,
          d.status,
          d.retentionExpiresAt
        )
        .run();

      // Recruiter Credentials
      const coordSalt = generateSalt();
      const coordHash = await hashPassword(d.coordPass, coordSalt);
      const hrSalt = generateSalt();
      const hrHash = await hashPassword(d.hrPass, hrSalt);

      await db
        .prepare(
          `INSERT INTO drive_credentials
           (id, drive_id, coordinator_username, coordinator_password_hash, coordinator_salt, hr_username, hr_password_hash, hr_salt, plain_coordinator_password, plain_hr_password)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          `cred_${d.id}`,
          d.id,
          d.coordUser,
          coordHash,
          coordSalt,
          d.hrUser,
          hrHash,
          hrSalt,
          d.coordPass,
          d.hrPass
        )
        .run();

      // Coordinator User Account
      await db
        .prepare(
          `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          `usr_${d.coordUser}`,
          d.coordUser,
          coordHash,
          coordSalt,
          'COORDINATOR',
          d.id,
          d.companyName,
          `Student Coordinator (${d.companyName})`
        )
        .run();

      const compSlug = (d.companyName || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (`coord_${compSlug}` !== d.coordUser) {
        await db
          .prepare(
            `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            `usr_coord_${compSlug}`,
            `coord_${compSlug}`,
            coordHash,
            coordSalt,
            'COORDINATOR',
            d.id,
            d.companyName,
            `Student Coordinator (${d.companyName})`
          )
          .run();
      }

      // HR User Account
      await db
        .prepare(
          `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          `usr_${d.hrUser}`,
          d.hrUser,
          hrHash,
          hrSalt,
          'HR',
          d.id,
          d.companyName,
          `Talent Acquisition Partner (${d.companyName})`
        )
        .run();

      if (`hr_${compSlug}` !== d.hrUser) {
        await db
          .prepare(
            `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            `usr_hr_${compSlug}`,
            `hr_${compSlug}`,
            hrHash,
            hrSalt,
            'HR',
            d.id,
            d.companyName,
            `Talent Acquisition Partner (${d.companyName})`
          )
          .run();
      }

      // Rounds
      await db
        .prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(`rnd_${d.id}_1`, d.id, 1, 'Round 1: Screening & Aptitude', 'Aptitude', 'First screening test', 'COMPLETED', 0)
        .run();

      await db
        .prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(`rnd_${d.id}_2`, d.id, 2, 'Round 2: Technical Interview', 'Technical', 'Technical problem solving', 'ONGOING', 0)
        .run();

      await db
        .prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(`rnd_${d.id}_3`, d.id, 3, 'Round 3: Final HR Interview', 'HR', 'Final HR Round (Rule 22: HOLD disabled, SELECT creates placement)', 'UPCOMING', 1)
        .run();
    }
  }
}
