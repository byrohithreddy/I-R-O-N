import express, { Request, Response, NextFunction } from 'express';
import { getDatabase, IronDatabase } from './db';
import { verifyPassword, signJwt, verifyJwt, JwtPayload, generateSalt, hashPassword } from './crypto';

export const apiRouter = express.Router();

// Middleware: Authenticate JWT Token
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  const payload = await verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or token invalid' });
  }

  req.user = payload;
  next();
}

export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient privileges' });
    }
    next();
  };
}

// -------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// POST /api/auth/login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = getDatabase();
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    // 1. Try finding direct user by username (case-insensitive)
    let user = await db
      .prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)')
      .bind(cleanUsername)
      .first<any>();

    // 2. If user not directly found in users table, check drive_credentials table
    if (!user) {
      // Check coordinator credentials
      const coordCred = await db
        .prepare('SELECT * FROM drive_credentials WHERE LOWER(coordinator_username) = LOWER(?)')
        .bind(cleanUsername)
        .first<any>();

      if (coordCred) {
        const drive = await db
          .prepare('SELECT * FROM drives WHERE id = ?')
          .bind(coordCred.drive_id)
          .first<any>();

        const compName = drive?.company_name || 'Campus Drive';
        const salt = coordCred.coordinator_salt || generateSalt();
        const hash = coordCred.coordinator_password_hash || (await hashPassword(coordCred.plain_coordinator_password, salt));

        user = {
          id: `usr_${coordCred.coordinator_username}`,
          username: coordCred.coordinator_username,
          password_hash: hash,
          salt: salt,
          role: 'COORDINATOR',
          drive_id: coordCred.drive_id,
          company_name: compName,
          full_name: `Student Coordinator (${compName})`,
          plain_pass: coordCred.plain_coordinator_password,
        };

        // Self-heal/insert into users table
        await db
          .prepare(
            `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(user.id, user.username, user.password_hash, user.salt, user.role, user.drive_id, user.company_name, user.full_name)
          .run();
      } else {
        // Check HR credentials
        const hrCred = await db
          .prepare('SELECT * FROM drive_credentials WHERE LOWER(hr_username) = LOWER(?)')
          .bind(cleanUsername)
          .first<any>();

        if (hrCred) {
          const drive = await db
            .prepare('SELECT * FROM drives WHERE id = ?')
            .bind(hrCred.drive_id)
            .first<any>();

          const compName = drive?.company_name || 'Campus Drive';
          const salt = hrCred.hr_salt || generateSalt();
          const hash = hrCred.hr_password_hash || (await hashPassword(hrCred.plain_hr_password, salt));

          user = {
            id: `usr_${hrCred.hr_username}`,
            username: hrCred.hr_username,
            password_hash: hash,
            salt: salt,
            role: 'HR',
            drive_id: hrCred.drive_id,
            company_name: compName,
            full_name: `Talent Acquisition Partner (${compName})`,
            plain_pass: hrCred.plain_hr_password,
          };

          // Self-heal/insert into users table
          await db
            .prepare(
              `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            )
            .bind(user.id, user.username, user.password_hash, user.salt, user.role, user.drive_id, user.company_name, user.full_name)
            .run();
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify Password: first try cryptographic hash verification, fallback to plain check if seeded
    let isValid = false;
    if (user.salt && user.password_hash) {
      isValid = await verifyPassword(cleanPassword, user.salt, user.password_hash);
    }
    if (!isValid && user.plain_pass && cleanPassword === user.plain_pass) {
      isValid = true;
    }

    // Also check drive_credentials table plain password as backup verification
    if (!isValid && (user.role === 'COORDINATOR' || user.role === 'HR')) {
      const cred = await db
        .prepare('SELECT * FROM drive_credentials WHERE drive_id = ?')
        .bind(user.drive_id)
        .first<any>();

      if (cred) {
        if (user.role === 'COORDINATOR' && cred.plain_coordinator_password === cleanPassword) {
          isValid = true;
          // Re-hash and update user password hash for future logins
          const newSalt = generateSalt();
          const newHash = await hashPassword(cleanPassword, newSalt);
          await db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').bind(newHash, newSalt, user.id).run();
        } else if (user.role === 'HR' && cred.plain_hr_password === cleanPassword) {
          isValid = true;
          const newSalt = generateSalt();
          const newHash = await hashPassword(cleanPassword, newSalt);
          await db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').bind(newHash, newSalt, user.id).run();
        }
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = await signJwt({
      sub: user.id,
      username: user.username,
      role: user.role,
      driveId: user.drive_id || undefined,
      companyName: user.company_name || undefined,
      fullName: user.full_name,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        driveId: user.drive_id,
        companyName: user.company_name,
        fullName: user.full_name,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Authentication error' });
  }
});

// GET /api/auth/me
apiRouter.get('/auth/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/sync - Unified single-request real-time database sync for all clients
apiRouter.get('/sync', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const [
      studentsRes,
      drivesRes,
      roundsRes,
      appsRes,
      candsRes,
      batchesRes,
      batchStudentsRes,
      evalsRes,
      roundResultsRes,
      placementsRes,
    ] = await Promise.all([
      db.prepare('SELECT * FROM students ORDER BY roll_number ASC LIMIT 3000').all<any>(),
      db.prepare(`
        SELECT d.*, 
               c.coordinator_username, c.plain_coordinator_password, 
               c.hr_username, c.plain_hr_password 
        FROM drives d 
        LEFT JOIN drive_credentials c ON d.id = c.drive_id 
        ORDER BY d.drive_date DESC
      `).all<any>(),
      db.prepare('SELECT * FROM rounds ORDER BY round_number ASC').all<any>(),
      db.prepare('SELECT * FROM applications ORDER BY applied_at DESC').all<any>(),
      db.prepare('SELECT * FROM round_candidates').all<any>(),
      db.prepare('SELECT * FROM batches ORDER BY created_at ASC').all<any>(),
      db.prepare('SELECT * FROM batch_students').all<any>(),
      db.prepare('SELECT * FROM evaluations').all<any>(),
      db.prepare('SELECT * FROM round_results').all<any>(),
      db.prepare('SELECT * FROM placements ORDER BY placed_at DESC').all<any>(),
    ]);

    res.json({
      students: studentsRes.results.map((s) => ({
        id: s.id,
        rollNumber: s.roll_number,
        fullName: s.full_name,
        email: s.email,
        phone: s.phone,
        college: 'Institute of Engineering & Technology',
        branch: s.branch,
        department: s.branch === 'CSE' ? 'Computer Science & Engineering' : s.branch === 'ECE' ? 'Electronics & Communication' : s.branch === 'IT' ? 'Information Technology' : 'Engineering',
        academicYear: '2022-2026',
        cgpa: s.cgpa,
        backlogCount: s.active_backlogs ?? 0,
        activeBacklogs: s.active_backlogs ?? 0,
        historyOfBacklogs: s.history_of_backlogs ?? 0,
        gender: s.gender || 'Other',
        isActive: true,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
      drives: drivesRes.results.map((d) => {
        const companySlug = (d.company_name || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '');
        let branches: string[] = [];
        try {
          branches = JSON.parse(d.eligible_branches);
        } catch {
          branches = ['CSE', 'IT', 'ECE'];
        }
        const coordUser = d.coordinator_username || `coord_${companySlug}`;
        const coordPass = d.plain_coordinator_password || `coord2026@${companySlug}`;
        const hrUser = d.hr_username || `hr_${companySlug}`;
        const hrPass = d.plain_hr_password || `hr2026@${companySlug}`;

        return {
          id: d.id,
          companyName: d.company_name,
          jobRole: d.job_role,
          package: d.package,
          jobDescription: d.job_description,
          eligibilityCriteria: d.eligibility_criteria,
          minimumCgpa: d.minimum_cgpa,
          backlogRule: d.backlog_rule,
          eligibleBranches: branches,
          driveDate: d.drive_date,
          driveTime: d.drive_time,
          location: d.location,
          applicationDeadline: d.application_deadline,
          status: d.status,
          retentionExpiresAt: d.retention_expires_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          credentials: {
            coordinatorUsername: coordUser,
            coordinatorPassword: coordPass,
            hrUsername: hrUser,
            hrPassword: hrPass,
          },
        };
      }),
      rounds: roundsRes.results.map((r) => ({
        id: r.id,
        driveId: r.drive_id,
        roundNumber: r.round_number,
        roundName: r.round_name,
        roundType: r.round_type,
        description: r.description,
        status: r.status,
        isFinalRound: Boolean(r.is_final_round),
        createdAt: r.created_at,
      })),
      applications: appsRes.results.map((a) => ({
        id: a.id,
        driveId: a.drive_id,
        studentId: a.student_id,
        applicationEmail: a.application_email,
        applicationPhone: a.application_phone,
        eligibilityStatus: a.eligibility_status,
        eligibilityOverride: Boolean(a.eligibility_override),
        overrideReason: a.override_reason,
        overrideBy: a.override_by,
        overrideAt: a.override_at,
        appliedAt: a.applied_at,
        status: a.status || 'IN_PROGRESS',
      })),
      candidates: candsRes.results.map((c) => ({
        id: c.id,
        driveId: c.drive_id,
        roundId: c.round_id,
        studentId: c.student_id,
        applicationId: c.application_id,
        entryStatus: c.entry_status,
        sourceRoundId: c.source_round_id,
        createdAt: c.created_at,
      })),
      batches: batchesRes.results.map((b) => ({
        id: b.id,
        roundId: b.round_id,
        driveId: b.drive_id,
        batchName: b.batch_name,
        capacityType: b.capacity_type,
        capacity: b.capacity,
        status: b.status,
        createdBy: b.created_by,
        createdAt: b.created_at,
        submittedAt: b.submitted_at,
        submittedBy: b.submitted_by,
      })),
      batchStudents: batchStudentsRes.results.map((bs) => ({
        id: bs.id,
        batchId: bs.batch_id,
        roundId: bs.round_id,
        driveId: bs.drive_id,
        studentId: bs.student_id,
        assignedAt: bs.assigned_at,
      })),
      evaluations: evalsRes.results.map((e) => ({
        id: e.id,
        batchId: e.batch_id,
        roundId: e.round_id,
        studentId: e.student_id,
        action: e.action,
        notes: e.notes,
        evaluatedAt: e.evaluated_at,
        evaluatedBy: e.evaluated_by,
      })),
      roundResults: roundResultsRes.results.map((rr) => ({
        id: rr.id,
        roundId: rr.round_id,
        driveId: rr.drive_id,
        batchId: rr.batch_id,
        studentId: rr.student_id,
        result: rr.result,
        notes: rr.notes,
        finalizedAt: rr.finalized_at,
        finalizedBy: rr.finalized_by,
      })),
      placements: placementsRes.results.map((p) => ({
        id: p.id,
        driveId: p.drive_id,
        studentId: p.student_id,
        rollNumber: p.roll_number,
        studentName: p.student_name,
        branch: p.branch,
        companyName: p.company_name,
        jobRole: p.job_role,
        package: p.package,
        placedAt: p.placed_at,
        sourceRoundId: p.source_round_id,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// STUDENTS (STUDENT MASTER DB) ENDPOINTS
// -------------------------------------------------------------

// GET /api/students (Public or Auth, with pagination / search)
apiRouter.get('/students', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const search = req.query.search ? String(req.query.search).trim() : '';
    const branch = req.query.branch ? String(req.query.branch).trim() : '';

    let sql = 'SELECT * FROM students WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (roll_number LIKE ? OR full_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (branch && branch !== 'ALL') {
      sql += ' AND branch = ?';
      params.push(branch);
    }

    sql += ' ORDER BY roll_number ASC LIMIT 2000';

    const { results } = await db.prepare(sql).bind(...params).all<any>();
    
    // Convert to frontend camelCase
    const mapped = results.map((r) => ({
      id: r.id,
      rollNumber: r.roll_number,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      branch: r.branch,
      cgpa: r.cgpa,
      activeBacklogs: r.active_backlogs,
      historyOfBacklogs: r.history_of_backlogs,
      gender: r.gender,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/by-roll/:rollNumber
apiRouter.get('/students/by-roll/:rollNumber', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const cleanRoll = req.params.rollNumber.trim().toUpperCase();

    const r = await db
      .prepare('SELECT * FROM students WHERE UPPER(roll_number) = ?')
      .bind(cleanRoll)
      .first<any>();

    if (!r) {
      return res.status(404).json({ error: `Roll number ${cleanRoll} is not found in Student Master DB` });
    }

    res.json({
      id: r.id,
      rollNumber: r.roll_number,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      branch: r.branch,
      cgpa: r.cgpa,
      activeBacklogs: r.active_backlogs,
      historyOfBacklogs: r.history_of_backlogs,
      gender: r.gender,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students (TPO Only)
apiRouter.post('/students', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const s = req.body;
    const cleanRoll = (s.rollNumber || '').trim().toUpperCase();

    if (!cleanRoll || !s.fullName) {
      return res.status(400).json({ error: 'Roll number and full name are required' });
    }

    const existing = await db
      .prepare('SELECT id FROM students WHERE UPPER(roll_number) = ?')
      .bind(cleanRoll)
      .first();

    if (existing) {
      return res.status(409).json({ error: `Roll number ${cleanRoll} is already registered` });
    }

    const id = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db
      .prepare(
        `INSERT INTO students (id, roll_number, full_name, email, phone, branch, cgpa, active_backlogs, history_of_backlogs, gender, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        id,
        cleanRoll,
        s.fullName,
        s.email || `${cleanRoll.toLowerCase()}@college.edu`,
        s.phone || '',
        s.branch || 'CSE',
        s.cgpa || 7.0,
        s.activeBacklogs || 0,
        s.historyOfBacklogs || 0,
        s.gender || 'MALE'
      )
      .run();

    res.status(201).json({ id, rollNumber: cleanRoll, ...s });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id (TPO Only)
apiRouter.put('/students/:id', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = req.params.id;
    const s = req.body;
    const cleanRoll = (s.rollNumber || '').trim().toUpperCase();

    await db
      .prepare(
        `UPDATE students
         SET roll_number = ?, full_name = ?, email = ?, phone = ?, branch = ?, cgpa = ?, active_backlogs = ?, history_of_backlogs = ?, gender = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        cleanRoll,
        s.fullName,
        s.email,
        s.phone,
        s.branch,
        s.cgpa,
        s.activeBacklogs,
        s.historyOfBacklogs,
        s.gender,
        id
      )
      .run();

    res.json({ id, ...s });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id (TPO Only)
apiRouter.delete('/students/:id', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    await db.prepare('DELETE FROM students WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/bulk-import (TPO Only)
apiRouter.post('/students/bulk-import', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { students: rawStudents } = req.body;

    if (!Array.isArray(rawStudents)) {
      return res.status(400).json({ error: 'Expected students array' });
    }

    let inserted = 0;
    let duplicates = 0;
    let errors = 0;

    for (const s of rawStudents) {
      const cleanRoll = (s.rollNumber || s.roll_number || '').trim().toUpperCase();
      if (!cleanRoll) {
        errors++;
        continue;
      }

      const existing = await db
        .prepare('SELECT id FROM students WHERE UPPER(roll_number) = ?')
        .bind(cleanRoll)
        .first();

      if (existing) {
        duplicates++;
        continue;
      }

      const id = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db
        .prepare(
          `INSERT INTO students (id, roll_number, full_name, email, phone, branch, cgpa, active_backlogs, history_of_backlogs, gender, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(
          id,
          cleanRoll,
          s.fullName || s.full_name || 'Student',
          s.email || `${cleanRoll.toLowerCase()}@college.edu`,
          s.phone || '',
          s.branch || 'CSE',
          Number(s.cgpa) || 7.0,
          Number(s.activeBacklogs || s.active_backlogs) || 0,
          Number(s.historyOfBacklogs || s.history_of_backlogs) || 0,
          s.gender || 'MALE'
        )
        .run();

      inserted++;
    }

    res.json({ total: rawStudents.length, inserted, duplicates, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DRIVES ENDPOINTS
// -------------------------------------------------------------

// GET /api/drives (Public)
apiRouter.get('/drives', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare(`
        SELECT d.*, 
               c.coordinator_username, c.plain_coordinator_password, 
               c.hr_username, c.plain_hr_password 
        FROM drives d 
        LEFT JOIN drive_credentials c ON d.id = c.drive_id 
        ORDER BY d.drive_date DESC
      `)
      .all<any>();

    const mapped = results.map((d) => {
      let branches: string[] = [];
      try {
        branches = JSON.parse(d.eligible_branches);
      } catch {
        branches = ['CSE', 'IT', 'ECE'];
      }

      const companySlug = (d.company_name || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '');
      const coordUser = d.coordinator_username || `coord_${companySlug}`;
      const coordPass = d.plain_coordinator_password || `coord2026@${companySlug}`;
      const hrUser = d.hr_username || `hr_${companySlug}`;
      const hrPass = d.plain_hr_password || `hr2026@${companySlug}`;

      return {
        id: d.id,
        companyName: d.company_name,
        jobRole: d.job_role,
        package: d.package,
        jobDescription: d.job_description,
        eligibilityCriteria: d.eligibility_criteria,
        minimumCgpa: d.minimum_cgpa,
        backlogRule: d.backlog_rule,
        eligibleBranches: branches,
        driveDate: d.drive_date,
        driveTime: d.drive_time,
        location: d.location,
        applicationDeadline: d.application_deadline,
        status: d.status,
        retentionExpiresAt: d.retention_expires_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        credentials: {
          coordinatorUsername: coordUser,
          coordinatorPassword: coordPass,
          hrUsername: hrUser,
          hrPassword: hrPass,
        },
      };
    });

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drives/:id (Public)
apiRouter.get('/drives/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const d = await db
      .prepare(`
        SELECT d.*, 
               c.coordinator_username, c.plain_coordinator_password, 
               c.hr_username, c.plain_hr_password 
        FROM drives d 
        LEFT JOIN drive_credentials c ON d.id = c.drive_id 
        WHERE d.id = ?
      `)
      .bind(req.params.id)
      .first<any>();

    if (!d) return res.status(404).json({ error: 'Drive not found' });

    let branches: string[] = [];
    try {
      branches = JSON.parse(d.eligible_branches);
    } catch {
      branches = ['CSE', 'IT', 'ECE'];
    }

    const companySlug = (d.company_name || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '');
    const coordUser = d.coordinator_username || `coord_${companySlug}`;
    const coordPass = d.plain_coordinator_password || `coord2026@${companySlug}`;
    const hrUser = d.hr_username || `hr_${companySlug}`;
    const hrPass = d.plain_hr_password || `hr2026@${companySlug}`;

    res.json({
      id: d.id,
      companyName: d.company_name,
      jobRole: d.job_role,
      package: d.package,
      jobDescription: d.job_description,
      eligibilityCriteria: d.eligibility_criteria,
      minimumCgpa: d.minimum_cgpa,
      backlogRule: d.backlog_rule,
      eligibleBranches: branches,
      driveDate: d.drive_date,
      driveTime: d.drive_time,
      location: d.location,
      applicationDeadline: d.application_deadline,
      status: d.status,
      retentionExpiresAt: d.retention_expires_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      credentials: {
        coordinatorUsername: coordUser,
        coordinatorPassword: coordPass,
        hrUsername: hrUser,
        hrPassword: hrPass,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drives/:id/credentials (TPO Only)
apiRouter.get('/drives/:id/credentials', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const cred = await db
      .prepare('SELECT * FROM drive_credentials WHERE drive_id = ?')
      .bind(req.params.id)
      .first<any>();

    if (!cred) {
      const drive = await db.prepare('SELECT * FROM drives WHERE id = ?').bind(req.params.id).first<any>();
      const companySlug = (drive?.company_name || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '');
      return res.json({
        coordinatorUsername: `coord_${companySlug}`,
        coordinatorPassword: `coord2026@${companySlug}`,
        hrUsername: `hr_${companySlug}`,
        hrPassword: `hr2026@${companySlug}`,
      });
    }

    res.json({
      coordinatorUsername: cred.coordinator_username,
      coordinatorPassword: cred.plain_coordinator_password,
      hrUsername: cred.hr_username,
      hrPassword: cred.plain_hr_password,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drives (TPO Only, with custom rounds)
apiRouter.post('/drives', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const d = req.body;

    const driveDate = d.driveDate || new Date().toISOString().split('T')[0];
    const applicationDeadline = `${driveDate}T00:00:00Z`;
    const driveDateObj = new Date(driveDate);
    const retentionDate = new Date(driveDateObj);
    retentionDate.setMonth(retentionDate.getMonth() + 6);
    const retentionExpiresAt = retentionDate.toISOString().split('T')[0];

    const driveId = d.id || `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const companySlug = (d.companyName || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '');

    await db
      .prepare(
        `INSERT INTO drives
         (id, company_name, job_role, package, job_description, eligibility_criteria, minimum_cgpa, backlog_rule, eligible_branches, drive_date, drive_time, location, application_deadline, status, retention_expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        driveId,
        d.companyName,
        d.jobRole,
        d.package || '₹6.0 LPA',
        d.jobDescription || '',
        d.eligibilityCriteria || '',
        Number(d.minimumCgpa) || 7.0,
        Number(d.backlogRule) || 0,
        JSON.stringify(d.eligibleBranches || ['CSE', 'IT', 'ECE']),
        driveDate,
        d.driveTime || '09:00',
        d.location || 'Campus Auditorium',
        applicationDeadline,
        d.status || 'UPCOMING',
        retentionExpiresAt
      )
      .run();

    // Recruiter accounts
    const coordUser = d.credentials?.coordinatorUsername || `coord_${companySlug}`;
    const coordPass = d.credentials?.coordinatorPassword || `coord2026@${companySlug}`;
    const hrUser = d.credentials?.hrUsername || `hr_${companySlug}`;
    const hrPass = d.credentials?.hrPassword || `hr2026@${companySlug}`;

    const coordSalt = generateSalt();
    const coordHash = await hashPassword(coordPass, coordSalt);
    const hrSalt = generateSalt();
    const hrHash = await hashPassword(hrPass, hrSalt);

    await db
      .prepare(
        `INSERT INTO drive_credentials
         (id, drive_id, coordinator_username, coordinator_password_hash, coordinator_salt, hr_username, hr_password_hash, hr_salt, plain_coordinator_password, plain_hr_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `cred_${driveId}`,
        driveId,
        coordUser,
        coordHash,
        coordSalt,
        hrUser,
        hrHash,
        hrSalt,
        coordPass,
        hrPass
      )
      .run();

    // Insert user logins into users table
    await db
      .prepare(
        `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(`usr_${coordUser}`, coordUser, coordHash, coordSalt, 'COORDINATOR', driveId, d.companyName, `Coordinator (${d.companyName})`)
      .run();

    await db
      .prepare(
        `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(`usr_${hrUser}`, hrUser, hrHash, hrSalt, 'HR', driveId, d.companyName, `HR (${d.companyName})`)
      .run();

    // Rounds: Custom rounds or default 3 rounds
    const customRounds = Array.isArray(d.rounds) && d.rounds.length > 0 ? d.rounds : null;

    if (customRounds) {
      for (let i = 0; i < customRounds.length; i++) {
        const rnd = customRounds[i];
        await db
          .prepare(
            `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            `rnd_${driveId}_${i + 1}`,
            driveId,
            i + 1,
            rnd.roundName,
            rnd.roundType || 'Technical',
            rnd.description || '',
            'UPCOMING',
            rnd.isFinalRound ? 1 : 0
          )
          .run();
      }
    } else {
      // Default 3 rounds
      await db
        .prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, 1, 'Round 1: Screening & Aptitude', 'Aptitude', 'Screening assessment', 'UPCOMING', 0, datetime('now'))`
        )
        .bind(`rnd_${driveId}_1`, driveId)
        .run();

      await db
        .prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, 2, 'Round 2: Technical Interview', 'Technical', 'Technical evaluation', 'UPCOMING', 0, datetime('now'))`
        )
        .bind(`rnd_${driveId}_2`, driveId)
        .run();

      await db
        .prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, 3, 'Round 3: Final HR Interview', 'HR', 'Final HR round', 'UPCOMING', 1, datetime('now'))`
        )
        .bind(`rnd_${driveId}_3`, driveId)
        .run();
    }

    res.status(201).json({ id: driveId, ...d });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/drives/:id (TPO Only)
apiRouter.put('/drives/:id', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const driveId = req.params.id;
    const d = req.body;

    await db
      .prepare(
        `UPDATE drives
         SET company_name = COALESCE(?, company_name),
             job_role = COALESCE(?, job_role),
             package = COALESCE(?, package),
             job_description = COALESCE(?, job_description),
             eligibility_criteria = COALESCE(?, eligibility_criteria),
             minimum_cgpa = COALESCE(?, minimum_cgpa),
             backlog_rule = COALESCE(?, backlog_rule),
             eligible_branches = COALESCE(?, eligible_branches),
             drive_date = COALESCE(?, drive_date),
             drive_time = COALESCE(?, drive_time),
             location = COALESCE(?, location),
             status = COALESCE(?, status),
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        d.companyName,
        d.jobRole,
        d.package,
        d.jobDescription,
        d.eligibilityCriteria,
        d.minimumCgpa,
        d.backlogRule,
        d.eligibleBranches ? JSON.stringify(d.eligibleBranches) : null,
        d.driveDate,
        d.driveTime,
        d.location,
        d.status,
        driveId
      )
      .run();

    res.json({ id: driveId, ...d });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ROUNDS ENDPOINTS
// -------------------------------------------------------------

// GET /api/rounds/drive/:driveId
apiRouter.get('/rounds/drive/:driveId', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare('SELECT * FROM rounds WHERE drive_id = ? ORDER BY round_number ASC')
      .bind(req.params.driveId)
      .all<any>();

    const mapped = results.map((r) => ({
      id: r.id,
      driveId: r.drive_id,
      roundNumber: r.round_number,
      roundName: r.round_name,
      roundType: r.round_type,
      description: r.description,
      status: r.status,
      isFinalRound: Boolean(r.is_final_round),
      createdAt: r.created_at,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rounds (TPO Only)
apiRouter.post('/rounds', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const r = req.body;

    const roundId = `rnd_${r.driveId}_${Date.now()}`;
    await db
      .prepare(
        `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        roundId,
        r.driveId,
        r.roundNumber || 1,
        r.roundName,
        r.roundType || 'Technical',
        r.description || '',
        r.status || 'UPCOMING',
        r.isFinalRound ? 1 : 0
      )
      .run();

    res.status(201).json({ id: roundId, ...r });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rounds/:id (TPO Only)
apiRouter.delete('/rounds/:id', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    await db.prepare('DELETE FROM rounds WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// APPLICATIONS ENDPOINTS
// -------------------------------------------------------------

// GET /api/applications/drive/:driveId
apiRouter.get('/applications/drive/:driveId', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare('SELECT * FROM applications WHERE drive_id = ? ORDER BY applied_at DESC')
      .bind(req.params.driveId)
      .all<any>();

    const mapped = results.map((a) => ({
      id: a.id,
      driveId: a.drive_id,
      studentId: a.student_id,
      applicationEmail: a.application_email,
      applicationPhone: a.application_phone,
      eligibilityStatus: a.eligibility_status,
      eligibilityOverride: Boolean(a.eligibility_override),
      overrideReason: a.override_reason,
      overrideBy: a.override_by,
      overrideAt: a.override_at,
      appliedAt: a.applied_at,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications/apply (Student Zero-Login Application)
apiRouter.post('/applications/apply', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { driveId, rollNumber, email, phone } = req.body;

    if (!driveId || !rollNumber) {
      return res.status(400).json({ error: 'Drive ID and Roll Number are required' });
    }

    const cleanRoll = rollNumber.trim().toUpperCase();

    // 1. Fetch drive
    const drive = await db.prepare('SELECT * FROM drives WHERE id = ?').bind(driveId).first<any>();
    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    // Rule 10 & 11: Cutoff deadline
    const deadline = new Date(drive.application_deadline);
    if (new Date() >= deadline) {
      return res.status(403).json({ error: 'Applications are closed. Deadline was strictly 00:00 on the drive date.' });
    }

    // 2. Fetch student from Master DB
    const student = await db.prepare('SELECT * FROM students WHERE UPPER(roll_number) = ?').bind(cleanRoll).first<any>();
    if (!student) {
      return res.status(404).json({ error: `Roll number ${cleanRoll} is not found in Student Master DB` });
    }

    // Rule 12: Check duplicate application
    const existingApp = await db
      .prepare('SELECT id FROM applications WHERE drive_id = ? AND student_id = ?')
      .bind(driveId, student.id)
      .first();

    if (existingApp) {
      return res.status(409).json({ error: `Student ${cleanRoll} has already applied to this drive.` });
    }

    // 3. Check Eligibility criteria
    let branches: string[] = [];
    try {
      branches = JSON.parse(drive.eligible_branches);
    } catch {
      branches = ['CSE', 'IT', 'ECE'];
    }

    const isBranchEligible = branches.includes(student.branch);
    const isCgpaEligible = student.cgpa >= drive.minimum_cgpa;
    const isBacklogEligible =
      drive.backlog_rule === 'NOT_APPLICABLE' ||
      drive.backlog_rule === 'Not applicable' ||
      drive.backlog_rule === -1 ||
      drive.backlog_rule === null ||
      student.active_backlogs <= Number(drive.backlog_rule);

    const isEligible = isBranchEligible && isCgpaEligible && isBacklogEligible;

    const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db
      .prepare(
        `INSERT INTO applications
         (id, drive_id, student_id, application_email, application_phone, eligibility_status, eligibility_override, applied_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`
      )
      .bind(
        appId,
        driveId,
        student.id,
        email || student.email,
        phone || student.phone,
        isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE'
      )
      .run();

    // If eligible, automatically enroll into Round 1 Candidate Pool
    if (isEligible) {
      const round1 = await db
        .prepare('SELECT id FROM rounds WHERE drive_id = ? AND round_number = 1')
        .bind(driveId)
        .first<any>();

      if (round1) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO round_candidates (id, drive_id, round_id, student_id, application_id, entry_status, created_at)
             VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))`
          )
          .bind(`cand_${round1.id}_${student.id}`, driveId, round1.id, student.id, appId)
          .run();
      }
    }

    res.status(201).json({
      success: true,
      applicationId: appId,
      eligibilityStatus: isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      reasons: !isEligible ? {
        branch: isBranchEligible,
        cgpa: isCgpaEligible,
        backlogs: isBacklogEligible,
      } : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications/:id/override (TPO Only)
apiRouter.post('/applications/:id/override', authMiddleware, roleMiddleware(['TPO']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const appId = req.params.id;
    const { reason } = req.body;

    const app = await db.prepare('SELECT * FROM applications WHERE id = ?').bind(appId).first<any>();
    if (!app) return res.status(404).json({ error: 'Application not found' });

    await db
      .prepare(
        `UPDATE applications
         SET eligibility_status = 'ELIGIBLE', eligibility_override = 1, override_reason = ?, override_by = ?, override_at = datetime('now')
         WHERE id = ?`
      )
      .bind(reason || 'Approved by TPO Exception', req.user?.username || 'TPO', appId)
      .run();

    // Add to Round 1 candidate pool
    const round1 = await db
      .prepare('SELECT id FROM rounds WHERE drive_id = ? AND round_number = 1')
      .bind(app.drive_id)
      .first<any>();

    if (round1) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO round_candidates (id, drive_id, round_id, student_id, application_id, entry_status, created_at)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))`
        )
        .bind(`cand_${round1.id}_${app.student_id}`, app.drive_id, round1.id, app.student_id, appId)
        .run();
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BATCHES & CANDIDATES ENDPOINTS
// -------------------------------------------------------------

// GET /api/rounds/:roundId/candidates
apiRouter.get('/rounds/:roundId/candidates', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare('SELECT * FROM round_candidates WHERE round_id = ?')
      .bind(req.params.roundId)
      .all<any>();

    const mapped = results.map((rc) => ({
      id: rc.id,
      driveId: rc.drive_id,
      roundId: rc.round_id,
      studentId: rc.student_id,
      applicationId: rc.application_id,
      entryStatus: rc.entry_status,
      sourceRoundId: rc.source_round_id,
      createdAt: rc.created_at,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches/round/:roundId
apiRouter.get('/batches/round/:roundId', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare('SELECT * FROM batches WHERE round_id = ? ORDER BY created_at ASC')
      .bind(req.params.roundId)
      .all<any>();

    const mapped = results.map((b) => ({
      id: b.id,
      roundId: b.round_id,
      driveId: b.drive_id,
      batchName: b.batch_name,
      capacityType: b.capacity_type,
      capacity: b.capacity,
      status: b.status,
      createdBy: b.created_by,
      createdAt: b.created_at,
      submittedAt: b.submitted_at,
      submittedBy: b.submitted_by,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches (Coordinator & TPO)
apiRouter.post('/batches', authMiddleware, roleMiddleware(['COORDINATOR', 'TPO']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const { roundId, driveId, batchName, capacityType, capacity } = req.body;

    if (!roundId || !batchName) {
      return res.status(400).json({ error: 'Round ID and Batch Name are required' });
    }

    const batchId = `btch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db
      .prepare(
        `INSERT INTO batches (id, round_id, drive_id, batch_name, capacity_type, capacity, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, datetime('now'))`
      )
      .bind(
        batchId,
        roundId,
        driveId,
        batchName,
        capacityType || 'LIMITED',
        capacityType === 'LIMITED' ? Number(capacity) || 30 : null,
        req.user?.username || 'Coordinator'
      )
      .run();

    res.status(201).json({ id: batchId, roundId, driveId, batchName, capacityType, capacity, status: 'DRAFT' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/batches/:id (Coordinator & TPO)
apiRouter.delete('/batches/:id', authMiddleware, roleMiddleware(['COORDINATOR', 'TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const batch = await db.prepare('SELECT status FROM batches WHERE id = ?').bind(req.params.id).first<any>();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status === 'SUBMITTED') {
      return res.status(403).json({ error: 'Rule 21: Cannot delete a frozen/submitted batch' });
    }

    await db.prepare('DELETE FROM batches WHERE id = ?').bind(req.params.id).run();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches/:id/students
apiRouter.get('/batches/:id/students', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare('SELECT * FROM batch_students WHERE batch_id = ?')
      .bind(req.params.id)
      .all<any>();

    const mapped = results.map((bs) => ({
      id: bs.id,
      batchId: bs.batch_id,
      roundId: bs.round_id,
      driveId: bs.drive_id,
      studentId: bs.student_id,
      assignedAt: bs.assigned_at,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/:id/assign (Coordinator Bulk Assignment with Database-Level Uniqueness & Capacity Guard)
apiRouter.post('/batches/:id/assign', authMiddleware, roleMiddleware(['COORDINATOR', 'TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const batchId = req.params.id;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array is required' });
    }

    const batch = await db.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).first<any>();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status === 'SUBMITTED') {
      return res.status(403).json({ error: 'Batch is frozen and read-only' });
    }

    // Current students in batch
    const currentCountRow = await db
      .prepare('SELECT COUNT(*) as count FROM batch_students WHERE batch_id = ?')
      .bind(batchId)
      .first<{ count: number }>();
    const currentCount = currentCountRow ? currentCountRow.count : 0;

    if (batch.capacity_type === 'LIMITED' && batch.capacity !== null) {
      if (currentCount + studentIds.length > batch.capacity) {
        return res.status(400).json({
          error: `Capacity exceeded! Batch limit is ${batch.capacity}. Currently assigned: ${currentCount}. Attempting to add: ${studentIds.length}.`,
        });
      }
    }

    let added = 0;
    const errors: string[] = [];

    for (const sId of studentIds) {
      // Check Rule 15: UNIQUE(round_id, student_id)
      const existingInRound = await db
        .prepare('SELECT id FROM batch_students WHERE round_id = ? AND student_id = ?')
        .bind(batch.round_id, sId)
        .first();

      if (existingInRound) {
        errors.push(`Student ${sId} is already assigned to a batch in this round.`);
        continue;
      }

      await db
        .prepare(
          `INSERT INTO batch_students (id, batch_id, round_id, drive_id, student_id, assigned_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(`bs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, batchId, batch.round_id, batch.drive_id, sId)
        .run();

      added++;
    }

    // Auto-update batch status to ACTIVE if it has students
    await db.prepare("UPDATE batches SET status = 'ACTIVE' WHERE id = ? AND status = 'DRAFT'").bind(batchId).run();

    res.json({ success: true, added, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/:id/remove (Remove Student from Batch)
apiRouter.post('/batches/:id/remove', authMiddleware, roleMiddleware(['COORDINATOR', 'TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const batchId = req.params.id;
    const { studentId } = req.body;

    const batch = await db.prepare('SELECT status FROM batches WHERE id = ?').bind(batchId).first<any>();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status === 'SUBMITTED') {
      return res.status(403).json({ error: 'Batch is frozen' });
    }

    await db
      .prepare('DELETE FROM batch_students WHERE batch_id = ? AND student_id = ?')
      .bind(batchId, studentId)
      .run();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// EVALUATIONS & HR BATCH SUBMISSION (RULE 17, 18, 21, 22)
// -------------------------------------------------------------

// GET /api/evaluations/batch/:batchId
apiRouter.get('/evaluations/batch/:batchId', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare('SELECT * FROM evaluations WHERE batch_id = ?')
      .bind(req.params.batchId)
      .all<any>();

    const mapped = results.map((e) => ({
      id: e.id,
      batchId: e.batch_id,
      roundId: e.round_id,
      studentId: e.student_id,
      action: e.action,
      notes: e.notes,
      evaluatedAt: e.evaluated_at,
      evaluatedBy: e.evaluated_by,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/round-results/round/:roundId
apiRouter.get('/round-results/round/:roundId', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db
      .prepare('SELECT * FROM round_results WHERE round_id = ?')
      .bind(req.params.roundId)
      .all<any>();

    const mapped = results.map((rr) => ({
      id: rr.id,
      roundId: rr.round_id,
      driveId: rr.drive_id,
      batchId: rr.batch_id,
      studentId: rr.student_id,
      result: rr.result,
      notes: rr.notes,
      finalizedAt: rr.finalized_at,
      finalizedBy: rr.finalized_by,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/evaluations (HR In-flight Decision)
apiRouter.post('/evaluations', authMiddleware, roleMiddleware(['HR', 'TPO']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const { batchId, roundId, studentId, action, notes } = req.body;

    const batch = await db.prepare('SELECT status FROM batches WHERE id = ?').bind(batchId).first<any>();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const round = await db.prepare('SELECT is_final_round FROM rounds WHERE id = ?').bind(roundId).first<any>();
    // Rule 22: HOLD is disabled in Final Round
    if (round?.is_final_round && action === 'HOLD') {
      return res.status(400).json({ error: 'Rule 22: HOLD is not permitted in the Final Round' });
    }

    await db
      .prepare(
        `INSERT OR REPLACE INTO evaluations (id, batch_id, round_id, student_id, action, notes, evaluated_at, evaluated_by)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`
      )
      .bind(
        `eval_${batchId}_${studentId}`,
        batchId,
        roundId,
        studentId,
        action,
        notes || '',
        req.user?.username || 'HR'
      )
      .run();

    res.json({ success: true, action });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batches/:id/submit (HR Submit & Freeze Batch - Rules 17, 18, 21, 22, 23)
apiRouter.post('/batches/:id/submit', authMiddleware, roleMiddleware(['HR', 'TPO']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const batchId = req.params.id;

    const batch = await db.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).first<any>();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const round = await db.prepare('SELECT * FROM rounds WHERE id = ?').bind(batch.round_id).first<any>();
    const isFinal = Boolean(round?.is_final_round);

    // Get all students in this batch
    const { results: batchStudents } = await db
      .prepare('SELECT student_id FROM batch_students WHERE batch_id = ?')
      .bind(batchId)
      .all<{ student_id: string }>();

    // Get evaluations recorded by HR
    const { results: evals } = await db
      .prepare('SELECT * FROM evaluations WHERE batch_id = ?')
      .bind(batchId)
      .all<any>();

    const evalMap = new Map(evals.map((e) => [e.student_id, e]));

    // Find next round if not final
    let nextRound: any = null;
    if (!isFinal) {
      nextRound = await db
        .prepare('SELECT * FROM rounds WHERE drive_id = ? AND round_number = ?')
        .bind(batch.drive_id, round.round_number + 1)
        .first<any>();
    }

    const hrUser = req.user?.username || 'HR';
    const drive = await db.prepare('SELECT * FROM drives WHERE id = ?').bind(batch.drive_id).first<any>();

    for (const bs of batchStudents) {
      const evaluation = evalMap.get(bs.student_id);
      let decision: 'SELECTED' | 'HOLD' | 'REJECTED' = 'REJECTED';

      if (evaluation) {
        if (evaluation.action === 'SELECT') decision = 'SELECTED';
        else if (evaluation.action === 'HOLD' && !isFinal) decision = 'HOLD';
        else decision = 'REJECTED';
      }

      // Record in round_results
      await db
        .prepare(
          `INSERT OR REPLACE INTO round_results (id, round_id, drive_id, batch_id, student_id, result, notes, finalized_at, finalized_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
        )
        .bind(
          `rr_${round.id}_${bs.student_id}`,
          round.id,
          batch.drive_id,
          batchId,
          bs.student_id,
          decision,
          evaluation?.notes || '',
          hrUser
        )
        .run();

      // If SELECT or HOLD in non-final round, add to next round candidate pool
      if (!isFinal && nextRound) {
        if (decision === 'SELECTED' || decision === 'HOLD') {
          await db
            .prepare(
              `INSERT OR REPLACE INTO round_candidates (id, drive_id, round_id, student_id, application_id, entry_status, source_round_id, created_at)
               VALUES (?, ?, ?, ?, NULL, ?, ?, datetime('now'))`
            )
            .bind(
              `cand_${nextRound.id}_${bs.student_id}`,
              batch.drive_id,
              nextRound.id,
              bs.student_id,
              decision === 'HOLD' ? 'HOLD' : 'ACTIVE',
              round.id
            )
            .run();
        } else {
          // If rejected, remove from next round candidate pool if previously promoted
          await db
            .prepare('DELETE FROM round_candidates WHERE round_id = ? AND student_id = ?')
            .bind(nextRound.id, bs.student_id)
            .run();
        }
      }

      // If Final Round and SELECT -> create permanent placement record
      if (isFinal) {
        if (decision === 'SELECTED') {
          const student = await db.prepare('SELECT * FROM students WHERE id = ?').bind(bs.student_id).first<any>();
          if (student) {
            const placementId = `plc_${batch.drive_id}_${bs.student_id}`;
            await db
              .prepare(
                `INSERT OR REPLACE INTO placements (id, drive_id, student_id, roll_number, student_name, branch, company_name, job_role, package, placed_at, source_round_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
              )
              .bind(
                placementId,
                batch.drive_id,
                student.id,
                student.roll_number,
                student.full_name,
                student.branch,
                drive?.company_name || 'Hiring Company',
                drive?.job_role || 'Graduate Engineer',
                drive?.package || '₹6.0 LPA',
                round.id
              )
              .run();
          }
        } else {
          // If rejected, remove any placement for this student on this drive
          await db
            .prepare('DELETE FROM placements WHERE drive_id = ? AND student_id = ?')
            .bind(batch.drive_id, bs.student_id)
            .run();
        }
      }
    }

    // Freeze batch (Rule 21)
    await db
      .prepare("UPDATE batches SET status = 'SUBMITTED', submitted_at = datetime('now'), submitted_by = ? WHERE id = ?")
      .bind(hrUser, batchId)
      .run();

    res.json({ success: true, batchId, status: 'SUBMITTED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PLACEMENTS ENDPOINTS
// -------------------------------------------------------------

// GET /api/placements (Public)
apiRouter.get('/placements', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const driveId = req.query.driveId ? String(req.query.driveId) : null;

    let sql = 'SELECT * FROM placements';
    const params: any[] = [];
    if (driveId) {
      sql += ' WHERE drive_id = ?';
      params.push(driveId);
    }
    sql += ' ORDER BY placed_at DESC';

    const { results } = await db.prepare(sql).bind(...params).all<any>();

    const mapped = results.map((p) => ({
      id: p.id,
      driveId: p.drive_id,
      studentId: p.student_id,
      rollNumber: p.roll_number,
      studentName: p.student_name,
      branch: p.branch,
      companyName: p.company_name,
      jobRole: p.job_role,
      package: p.package,
      placedAt: p.placed_at,
      sourceRoundId: p.source_round_id,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DATA RETENTION & ARCHIVES (RULE 30, 31, 32)
// -------------------------------------------------------------

// GET /api/archives
apiRouter.get('/archives', authMiddleware, roleMiddleware(['TPO']), async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { results } = await db.prepare('SELECT * FROM drive_archives ORDER BY archived_at DESC').all<any>();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/drives/:id/purge (Permanent Drive Purge - Preserving Student Master DB)
apiRouter.delete('/drives/:id/purge', authMiddleware, roleMiddleware(['TPO']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const driveId = req.params.id;

    const drive = await db.prepare('SELECT * FROM drives WHERE id = ?').bind(driveId).first<any>();
    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    // Record in archives table
    const archiveId = `arch_${Date.now()}`;
    await db
      .prepare(
        `INSERT INTO drive_archives (id, drive_id, company_name, drive_date, archive_filename, archived_at, archived_by, metadata_json)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)`
      )
      .bind(
        archiveId,
        driveId,
        drive.company_name,
        drive.drive_date,
        `IRON_ARCHIVE_${drive.company_name.replace(/[^a-zA-Z0-9]/g, '_')}_${drive.drive_date}.zip`,
        req.user?.username || 'TPO',
        JSON.stringify(drive)
      )
      .run();

    // Delete drive (Cascades to applications, rounds, batches, evaluations, round_results; Student Master DB is NOT touched)
    await db.prepare('DELETE FROM drives WHERE id = ?').bind(driveId).run();

    res.json({ success: true, archiveId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
