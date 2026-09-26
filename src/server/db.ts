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
    const results: any[] = [];
    for (const s of statements) {
      results.push(await s.run());
    }
    return results;
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

  // 2. Check and Seed 1,500 students if students table is empty or small
  const studentCountRow = await db
    .prepare('SELECT COUNT(*) as count FROM students')
    .first<{ count: number }>();

  const currentCount = studentCountRow ? studentCountRow.count : 0;

  if (currentCount < 1000) {
    const firstNames = [
      'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
      'Shaurya', 'Atharv', 'Abhimanyu', 'Advik', 'Pranav', 'Advaith', 'Kabir', 'Ananya', 'Diya', 'Gauri',
      'Isha', 'Kavya', 'Khushi', 'Myra', 'Navya', 'Pooja', 'Priya', 'Riya', 'Saanvi', 'Tanvi',
      'Vanya', 'Zoya', 'Rohith', 'Siddharth', 'Nikhil', 'Harsh', 'Varun', 'Tarun', 'Deepak', 'Manish',
      'Sneha', 'Meera', 'Roshni', 'Aakash', 'Rohan', 'Kunal', 'Vikram', 'Anjali', 'Swati', 'Preeti'
    ];

    const lastNames = [
      'Sharma', 'Verma', 'Reddy', 'Rao', 'Patel', 'Nair', 'Menon', 'Gupta', 'Singh', 'Kumar',
      'Chowdhury', 'Iyer', 'Pillai', 'Bose', 'Das', 'Banerjee', 'Mishra', 'Joshi', 'Kulkarni', 'Deshmukh',
      'Bhat', 'Hegde', 'Gowda', 'Shetty', 'Pawar', 'Yadav', 'Trivedi', 'Mehta', 'Shah', 'Aggarwal'
    ];

    const branches = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'];
    const branchWeights = [0.35, 0.25, 0.20, 0.10, 0.05, 0.05]; // Realistic distribution

    function pickBranch(): string {
      const r = Math.random();
      let cumulative = 0;
      for (let i = 0; i < branches.length; i++) {
        cumulative += branchWeights[i];
        if (r <= cumulative) return branches[i];
      }
      return 'CSE';
    }

    // Seed up to 1,500 students
    const needed = 1500 - currentCount;
    for (let i = 1; i <= needed; i++) {
      const num = (currentCount + i).toString().padStart(4, '0');
      const rollNumber = `23BD1A${num}`;
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${fName} ${lName}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${num}@college.edu`;
      const phone = `+91 ${9000000000 + Math.floor(Math.random() * 999999999)}`;
      const branch = pickBranch();
      // CGPA centered around 7.6 with normal distribution between 6.0 and 9.8
      const cgpa = Number(Math.min(9.9, Math.max(6.0, 6.5 + Math.random() * 2.5 + Math.random() * 0.8)).toFixed(2));
      const hasBacklogs = Math.random() < 0.12; // 12% have active backlogs
      const activeBacklogs = hasBacklogs ? Math.floor(Math.random() * 3) + 1 : 0;
      const historyOfBacklogs = activeBacklogs + (Math.random() < 0.15 ? Math.floor(Math.random() * 2) + 1 : 0);
      const gender = Math.random() < 0.45 ? 'FEMALE' : 'MALE';

      await db
        .prepare(
          `INSERT OR IGNORE INTO students
           (id, roll_number, full_name, email, phone, branch, cgpa, active_backlogs, history_of_backlogs, gender, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(
          `std_${num}`,
          rollNumber,
          fullName,
          email,
          phone,
          branch,
          cgpa,
          activeBacklogs,
          historyOfBacklogs,
          gender
        )
        .run();
    }
  }

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
        eligibleBranches: JSON.stringify(['CSE', 'IT', 'ECE']),
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
        eligibleBranches: JSON.stringify(['CSE', 'IT', 'ECE', 'EEE']),
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
        eligibleBranches: JSON.stringify(['CSE', 'IT']),
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
