// Cloudflare Pages Function: /api/* Edge API Router
// Powered by Cloudflare Workers Runtime & Cloudflare D1 (SQLite)

interface D1Result<T = any> {
  results: T[];
  success: boolean;
  meta: any;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = any>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<any>;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
  data: Record<string, any>;
}) => Promise<Response>;

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

// Crypto Helpers using Web Crypto API
function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const saltBytes = new Uint8Array(salt.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes as any, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  const secret = env.JWT_SECRET || 'iron_campus_recruitment_jwt_secret_key_2026';

  // JWT Verification Helper
  const getAuthUser = async (): Promise<any | null> => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch {
      return null;
    }
  };

  try {
    // Health check
    if (path === '/api/health') {
      return jsonResponse({ status: 'ok', platform: 'cloudflare-pages-d1', timestamp: new Date().toISOString() });
    }

    // 0. Unified Real-Time Single-Request Sync: GET /api/sync
    if (path === '/api/sync' && method === 'GET') {
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
        env.DB.prepare('SELECT * FROM students ORDER BY roll_number ASC LIMIT 3000').all(),
        env.DB.prepare(`
          SELECT d.*, 
                 c.coordinator_username, c.plain_coordinator_password, 
                 c.hr_username, c.plain_hr_password 
          FROM drives d 
          LEFT JOIN drive_credentials c ON d.id = c.drive_id 
          ORDER BY d.drive_date DESC
        `).all(),
        env.DB.prepare('SELECT * FROM rounds ORDER BY round_number ASC').all(),
        env.DB.prepare('SELECT * FROM applications ORDER BY applied_at DESC').all(),
        env.DB.prepare('SELECT * FROM round_candidates').all(),
        env.DB.prepare('SELECT * FROM batches ORDER BY created_at ASC').all(),
        env.DB.prepare('SELECT * FROM batch_students').all(),
        env.DB.prepare('SELECT * FROM evaluations').all(),
        env.DB.prepare('SELECT * FROM round_results').all(),
        env.DB.prepare('SELECT * FROM placements ORDER BY placed_at DESC').all(),
      ]);

      return jsonResponse({
        students: (studentsRes.results || []).map((s: any) => ({
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
        drives: (drivesRes.results || []).map((d: any) => {
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
            eligibleBranches: JSON.parse(d.eligible_branches || '[]'),
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
        rounds: (roundsRes.results || []).map((r: any) => ({
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
        applications: (appsRes.results || []).map((a: any) => ({
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
        candidates: (candsRes.results || []).map((c: any) => ({
          id: c.id,
          driveId: c.drive_id,
          roundId: c.round_id,
          studentId: c.student_id,
          applicationId: c.application_id,
          entryStatus: c.entry_status,
          sourceRoundId: c.source_round_id,
          createdAt: c.created_at,
        })),
        batches: (batchesRes.results || []).map((b: any) => ({
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
        batchStudents: (batchStudentsRes.results || []).map((bs: any) => ({
          id: bs.id,
          batchId: bs.batch_id,
          roundId: bs.round_id,
          driveId: bs.drive_id,
          studentId: bs.student_id,
          assignedAt: bs.assigned_at,
        })),
        evaluations: (evalsRes.results || []).map((e: any) => ({
          id: e.id,
          batchId: e.batch_id,
          roundId: e.round_id,
          studentId: e.student_id,
          action: e.action,
          notes: e.notes,
          evaluatedAt: e.evaluated_at,
          evaluatedBy: e.evaluated_by,
        })),
        roundResults: (roundResultsRes.results || []).map((rr: any) => ({
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
        placements: (placementsRes.results || []).map((p: any) => ({
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
    }

    // 1. Auth: /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      const body = (await request.json()) as any;
      const { username, password } = body;
      const cleanUsername = String(username || '').trim();
      const cleanPassword = String(password || '').trim();

      let user = await env.DB.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').bind(cleanUsername).first<any>();

      if (!user) {
        // Check coordinator credentials
        const coordCred = await env.DB.prepare('SELECT * FROM drive_credentials WHERE LOWER(coordinator_username) = LOWER(?)').bind(cleanUsername).first<any>();
        if (coordCred) {
          const drive = await env.DB.prepare('SELECT * FROM drives WHERE id = ?').bind(coordCred.drive_id).first<any>();
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
          await env.DB.prepare(
            `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          ).bind(user.id, user.username, user.password_hash, user.salt, user.role, user.drive_id, user.company_name, user.full_name).run();
        } else {
          // Check HR credentials
          const hrCred = await env.DB.prepare('SELECT * FROM drive_credentials WHERE LOWER(hr_username) = LOWER(?)').bind(cleanUsername).first<any>();
          if (hrCred) {
            const drive = await env.DB.prepare('SELECT * FROM drives WHERE id = ?').bind(hrCred.drive_id).first<any>();
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
            await env.DB.prepare(
              `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(user.id, user.username, user.password_hash, user.salt, user.role, user.drive_id, user.company_name, user.full_name).run();
          }
        }
      }

      if (!user) {
        return jsonResponse({ error: 'Invalid username or password' }, 401);
      }

      // Password verification using Web Crypto PBKDF2
      let isValid = false;
      if (user.salt && user.password_hash) {
        const computedHash = await hashPassword(cleanPassword, user.salt);
        isValid = computedHash === user.password_hash;
      }
      if (!isValid && user.plain_pass && cleanPassword === user.plain_pass) {
        isValid = true;
      }

      // Check drive credentials fallback
      if (!isValid && (user.role === 'COORDINATOR' || user.role === 'HR')) {
        const cred = await env.DB.prepare('SELECT * FROM drive_credentials WHERE drive_id = ?').bind(user.drive_id).first<any>();
        if (cred) {
          if (user.role === 'COORDINATOR' && cred.plain_coordinator_password === cleanPassword) {
            isValid = true;
          } else if (user.role === 'HR' && cred.plain_hr_password === cleanPassword) {
            isValid = true;
          }
        }
      }

      if (!isValid) {
        return jsonResponse({ error: 'Invalid username or password' }, 401);
      }

      // Create JWT
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadObj = {
        sub: user.id,
        username: user.username,
        role: user.role,
        driveId: user.drive_id,
        companyName: user.company_name,
        fullName: user.full_name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      };
      const payload = btoa(JSON.stringify(payloadObj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${payload}`));
      const signature = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const token = `${header}.${payload}.${signature}`;

      return jsonResponse({ token, user: payloadObj });
    }

    // Auth check: /api/auth/me
    if (path === '/api/auth/me' && method === 'GET') {
      const user = await getAuthUser();
      if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
      return jsonResponse({ user });
    }

    // 2. Drives: GET /api/drives
    if (path === '/api/drives' && method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT d.*, 
               c.coordinator_username, c.plain_coordinator_password, 
               c.hr_username, c.plain_hr_password 
        FROM drives d 
        LEFT JOIN drive_credentials c ON d.id = c.drive_id 
        ORDER BY d.drive_date DESC
      `).all();
      const mapped = results.map((d: any) => {
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
          eligibleBranches: JSON.parse(d.eligible_branches || '[]'),
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
      return jsonResponse(mapped);
    }

    // Create Drive: POST /api/drives
    if (path === '/api/drives' && method === 'POST') {
      const d = (await request.json()) as any;
      const driveDate = d.driveDate || new Date().toISOString().split('T')[0];
      const applicationDeadline = `${driveDate}T00:00:00Z`;
      const driveDateObj = new Date(driveDate);
      const retentionDate = new Date(driveDateObj);
      retentionDate.setMonth(retentionDate.getMonth() + 6);
      const retentionExpiresAt = retentionDate.toISOString().split('T')[0];

      const driveId = d.id || `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const companySlug = (d.companyName || 'drive').toLowerCase().replace(/[^a-z0-9]/g, '');

      await env.DB.prepare(
        `INSERT INTO drives
         (id, company_name, job_role, package, job_description, eligibility_criteria, minimum_cgpa, backlog_rule, eligible_branches, drive_date, drive_time, location, application_deadline, status, retention_expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
        .bind(
          driveId,
          d.companyName || 'Untitled Company',
          d.jobRole || 'Graduate Engineer Trainee',
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

      // Recruiter credentials
      const coordUser = `coord_${companySlug}`;
      const coordPass = `coord2026@${companySlug}`;
      const hrUser = `hr_${companySlug}`;
      const hrPass = `hr2026@${companySlug}`;

      const coordSalt = generateSalt();
      const coordHash = await hashPassword(coordPass, coordSalt);
      const hrSalt = generateSalt();
      const hrHash = await hashPassword(hrPass, hrSalt);

      await env.DB.prepare(
        `INSERT OR REPLACE INTO drive_credentials
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

      // Recruiter user accounts
      await env.DB.prepare(
        `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(`usr_${coordUser}`, coordUser, coordHash, coordSalt, 'COORDINATOR', driveId, d.companyName, `Coordinator (${d.companyName})`)
        .run();

      await env.DB.prepare(
        `INSERT OR REPLACE INTO users (id, username, password_hash, salt, role, drive_id, company_name, full_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(`usr_${hrUser}`, hrUser, hrHash, hrSalt, 'HR', driveId, d.companyName, `HR (${d.companyName})`)
        .run();

      // Create Rounds (custom or standard 3 rounds)
      const customRounds = Array.isArray(d.rounds) && d.rounds.length > 0 ? d.rounds : null;
      if (customRounds) {
        for (let i = 0; i < customRounds.length; i++) {
          const rnd = customRounds[i];
          const rId = rnd.id || `rnd_${driveId}_${i + 1}`;
          await env.DB.prepare(
            `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
            .bind(
              rId,
              driveId,
              i + 1,
              rnd.roundName,
              rnd.roundType || 'Technical',
              rnd.description || '',
              rnd.status || 'UPCOMING',
              rnd.isFinalRound ? 1 : 0
            )
            .run();
        }
      } else {
        await env.DB.prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, 1, 'Round 1: Screening & Aptitude', 'Aptitude', 'Screening assessment', 'UPCOMING', 0, datetime('now'))`
        ).bind(`rnd_${driveId}_1`, driveId).run();

        await env.DB.prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, 2, 'Round 2: Technical Interview', 'Technical', 'Technical evaluation', 'UPCOMING', 0, datetime('now'))`
        ).bind(`rnd_${driveId}_2`, driveId).run();

        await env.DB.prepare(
          `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
           VALUES (?, ?, 3, 'Round 3: Final HR Interview', 'HR', 'Final HR round', 'UPCOMING', 1, datetime('now'))`
        ).bind(`rnd_${driveId}_3`, driveId).run();
      }

      return jsonResponse({
        id: driveId,
        ...d,
        applicationDeadline,
        retentionExpiresAt,
        status: d.status || 'UPCOMING',
        credentials: {
          coordinatorUsername: coordUser,
          coordinatorPassword: coordPass,
          hrUsername: hrUser,
          hrPassword: hrPass,
        }
      }, 201);
    }

    // Single Drive: GET /api/drives/:id, PUT /api/drives/:id, DELETE /api/drives/:id/purge
    const driveMatch = path.match(/^\/api\/drives\/([a-zA-Z0-9_-]+)$/);
    if (driveMatch && method === 'GET') {
      const d = await env.DB.prepare('SELECT * FROM drives WHERE id = ?').bind(driveMatch[1]).first<any>();
      if (!d) return jsonResponse({ error: 'Drive not found' }, 404);
      return jsonResponse({
        id: d.id,
        companyName: d.company_name,
        jobRole: d.job_role,
        package: d.package,
        jobDescription: d.job_description,
        eligibilityCriteria: d.eligibility_criteria,
        minimumCgpa: d.minimum_cgpa,
        backlogRule: d.backlog_rule,
        eligibleBranches: JSON.parse(d.eligible_branches || '[]'),
        driveDate: d.drive_date,
        driveTime: d.drive_time,
        location: d.location,
        applicationDeadline: d.application_deadline,
        status: d.status,
        retentionExpiresAt: d.retention_expires_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      });
    }

    if (driveMatch && method === 'PUT') {
      const driveId = driveMatch[1];
      const d = (await request.json()) as any;
      await env.DB.prepare(
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

      return jsonResponse({ id: driveId, ...d });
    }

    // Purge Drive: DELETE /api/drives/:id/purge
    const purgeMatch = path.match(/^\/api\/drives\/([a-zA-Z0-9_-]+)\/purge$/);
    if (purgeMatch && method === 'DELETE') {
      const driveId = purgeMatch[1];
      await env.DB.prepare('DELETE FROM drives WHERE id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM rounds WHERE drive_id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM applications WHERE drive_id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM round_candidates WHERE drive_id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM batches WHERE drive_id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM batch_students WHERE drive_id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM evaluations WHERE round_id IN (SELECT id FROM rounds WHERE drive_id = ?)').bind(driveId).run();
      await env.DB.prepare('DELETE FROM round_results WHERE drive_id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM drive_credentials WHERE drive_id = ?').bind(driveId).run();
      await env.DB.prepare('DELETE FROM users WHERE drive_id = ?').bind(driveId).run();
      return jsonResponse({ success: true });
    }

    // Drive credentials: /api/drives/:id/credentials
    const credMatch = path.match(/^\/api\/drives\/([a-zA-Z0-9_-]+)\/credentials$/);
    if (credMatch && method === 'GET') {
      const cred = await env.DB.prepare('SELECT * FROM drive_credentials WHERE drive_id = ?').bind(credMatch[1]).first<any>();
      if (!cred) return jsonResponse({ error: 'Credentials not found' }, 404);
      return jsonResponse({
        coordinatorUsername: cred.coordinator_username,
        coordinatorPassword: cred.plain_coordinator_password,
        hrUsername: cred.hr_username,
        hrPassword: cred.plain_hr_password,
      });
    }

    // 3. Students: /api/students
    if (path === '/api/students' && method === 'GET') {
      const search = url.searchParams.get('search') || '';
      const branch = url.searchParams.get('branch') || '';

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

      const { results } = await env.DB.prepare(sql).bind(...params).all();
      const mapped = results.map((s: any) => ({
        id: s.id,
        rollNumber: s.roll_number,
        fullName: s.full_name,
        email: s.email,
        phone: s.phone,
        branch: s.branch,
        cgpa: s.cgpa,
        activeBacklogs: s.active_backlogs,
        historyOfBacklogs: s.history_of_backlogs,
        gender: s.gender,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
      return jsonResponse(mapped);
    }

    // Create Student: POST /api/students
    if (path === '/api/students' && method === 'POST') {
      const s = (await request.json()) as any;
      const cleanRoll = (s.rollNumber || s.roll_number || '').trim().toUpperCase();

      if (!cleanRoll || !s.fullName) {
        return jsonResponse({ error: 'Roll number and full name are required' }, 400);
      }

      const existing = await env.DB.prepare('SELECT id FROM students WHERE UPPER(roll_number) = ?').bind(cleanRoll).first();
      if (existing) {
        return jsonResponse({ error: `Roll number ${cleanRoll} is already registered` }, 409);
      }

      const id = s.id || `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await env.DB.prepare(
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
          Number(s.cgpa) || 7.0,
          Number(s.activeBacklogs || s.active_backlogs) || 0,
          Number(s.historyOfBacklogs || s.history_of_backlogs) || 0,
          s.gender || 'MALE'
        )
        .run();

      return jsonResponse({ id, rollNumber: cleanRoll, ...s }, 201);
    }

    // Update Student: PUT /api/students/:id
    const studentMatch = path.match(/^\/api\/students\/([a-zA-Z0-9_-]+)$/);
    if (studentMatch && method === 'PUT') {
      const id = studentMatch[1];
      const s = (await request.json()) as any;
      const cleanRoll = (s.rollNumber || s.roll_number || '').trim().toUpperCase();

      await env.DB.prepare(
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
          s.activeBacklogs ?? s.active_backlogs ?? 0,
          s.historyOfBacklogs ?? s.history_of_backlogs ?? 0,
          s.gender,
          id
        )
        .run();

      return jsonResponse({ id, ...s });
    }

    // Delete Student: DELETE /api/students/:id
    if (studentMatch && method === 'DELETE') {
      const id = studentMatch[1];
      await env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true });
    }

    // Bulk Import Students: POST /api/students/bulk-import
    if (path === '/api/students/bulk-import' && method === 'POST') {
      const { students: rawStudents } = (await request.json()) as any;
      if (!Array.isArray(rawStudents)) {
        return jsonResponse({ error: 'Expected students array' }, 400);
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

        const existing = await env.DB.prepare('SELECT id FROM students WHERE UPPER(roll_number) = ?').bind(cleanRoll).first();
        if (existing) {
          duplicates++;
          continue;
        }

        const id = s.id || `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await env.DB.prepare(
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

      return jsonResponse({ total: rawStudents.length, inserted, duplicates, errors });
    }

    // 4. Placements: /api/placements
    if (path === '/api/placements' && method === 'GET') {
      const driveId = url.searchParams.get('driveId');
      let sql = 'SELECT * FROM placements';
      const params: any[] = [];
      if (driveId) {
        sql += ' WHERE drive_id = ?';
        params.push(driveId);
      }
      sql += ' ORDER BY placed_at DESC';
      const { results } = await env.DB.prepare(sql).bind(...params).all();
      const mapped = results.map((p: any) => ({
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
      return jsonResponse(mapped);
    }

    // 5. Rounds: GET /api/rounds/drive/:driveId, POST /api/rounds, DELETE /api/rounds/:id
    const roundsMatch = path.match(/^\/api\/rounds\/drive\/([a-zA-Z0-9_-]+)$/);
    if (roundsMatch && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM rounds WHERE drive_id = ? ORDER BY round_number ASC').bind(roundsMatch[1]).all();
      const mapped = results.map((r: any) => ({
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
      return jsonResponse(mapped);
    }

    if (path === '/api/rounds' && method === 'POST') {
      const r = (await request.json()) as any;
      const roundId = r.id || `rnd_${r.driveId}_${Date.now()}`;
      await env.DB.prepare(
        `INSERT INTO rounds (id, drive_id, round_number, round_name, round_type, description, status, is_final_round, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(
          roundId,
          r.driveId,
          r.roundNumber || 1,
          r.roundName || `Round ${r.roundNumber || 1}`,
          r.roundType || 'Technical',
          r.description || '',
          r.status || 'UPCOMING',
          r.isFinalRound ? 1 : 0
        )
        .run();

      return jsonResponse({ id: roundId, ...r }, 201);
    }

    const deleteRoundMatch = path.match(/^\/api\/rounds\/([a-zA-Z0-9_-]+)$/);
    if (deleteRoundMatch && method === 'DELETE') {
      const roundId = deleteRoundMatch[1];
      await env.DB.prepare('DELETE FROM rounds WHERE id = ?').bind(roundId).run();
      await env.DB.prepare('DELETE FROM batches WHERE round_id = ?').bind(roundId).run();
      await env.DB.prepare('DELETE FROM round_candidates WHERE round_id = ?').bind(roundId).run();
      return jsonResponse({ success: true });
    }

    // 6. Applications: GET /api/applications/drive/:driveId
    const appsMatch = path.match(/^\/api\/applications\/drive\/([a-zA-Z0-9_-]+)$/);
    if (appsMatch && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM applications WHERE drive_id = ? ORDER BY applied_at DESC').bind(appsMatch[1]).all();
      const mapped = results.map((a: any) => ({
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
      return jsonResponse(mapped);
    }

    // 7. Student apply: /api/applications/apply
    if (path === '/api/applications/apply' && method === 'POST') {
      const { driveId, rollNumber, email, phone } = (await request.json()) as any;
      const cleanRoll = (rollNumber || '').trim().toUpperCase();

      const drive = await env.DB.prepare('SELECT * FROM drives WHERE id = ?').bind(driveId).first<any>();
      if (!drive) return jsonResponse({ error: 'Drive not found' }, 404);

      if (new Date() >= new Date(drive.application_deadline)) {
        return jsonResponse({ error: 'Applications are closed for this drive' }, 403);
      }

      const student = await env.DB.prepare('SELECT * FROM students WHERE UPPER(roll_number) = ?').bind(cleanRoll).first<any>();
      if (!student) {
        return jsonResponse({ error: `Roll number ${cleanRoll} is not found in Student Master DB` }, 404);
      }

      const existingApp = await env.DB.prepare('SELECT id FROM applications WHERE drive_id = ? AND student_id = ?').bind(driveId, student.id).first();
      if (existingApp) {
        return jsonResponse({ error: `Student ${cleanRoll} has already applied to this drive.` }, 409);
      }

      const branches = JSON.parse(drive.eligible_branches || '[]');
      const backlogOk =
        drive.backlog_rule === 'NOT_APPLICABLE' ||
        drive.backlog_rule === 'Not applicable' ||
        drive.backlog_rule === -1 ||
        drive.backlog_rule === null ||
        student.active_backlogs <= Number(drive.backlog_rule);
      const isEligible = branches.includes(student.branch) && student.cgpa >= drive.minimum_cgpa && backlogOk;

      const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await env.DB.prepare(
        `INSERT INTO applications (id, drive_id, student_id, application_email, application_phone, eligibility_status, eligibility_override, applied_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`
      )
        .bind(appId, driveId, student.id, email || student.email, phone || student.phone, isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE')
        .run();

      if (isEligible) {
        const round1 = await env.DB.prepare('SELECT id FROM rounds WHERE drive_id = ? AND round_number = 1').bind(driveId).first<any>();
        if (round1) {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO round_candidates (id, drive_id, round_id, student_id, application_id, entry_status, created_at)
             VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))`
          )
            .bind(`cand_${round1.id}_${student.id}`, driveId, round1.id, student.id, appId)
            .run();
        }
      }

      return jsonResponse({ success: true, applicationId: appId, eligibilityStatus: isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE' }, 201);
    }

    // Override application eligibility: POST /api/applications/:id/override
    const overrideMatch = path.match(/^\/api\/applications\/([a-zA-Z0-9_-]+)\/override$/);
    if (overrideMatch && method === 'POST') {
      const user = await getAuthUser();
      const appId = overrideMatch[1];
      const { reason } = (await request.json()) as any;

      const app = await env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(appId).first<any>();
      if (!app) return jsonResponse({ error: 'Application not found' }, 404);

      await env.DB.prepare(
        `UPDATE applications
         SET eligibility_status = 'ELIGIBLE', eligibility_override = 1, override_reason = ?, override_by = ?, override_at = datetime('now')
         WHERE id = ?`
      )
        .bind(reason || 'Approved by TPO Exception', user?.username || 'TPO', appId)
        .run();

      const round1 = await env.DB.prepare('SELECT id FROM rounds WHERE drive_id = ? AND round_number = 1').bind(app.drive_id).first<any>();
      if (round1) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO round_candidates (id, drive_id, round_id, student_id, application_id, entry_status, created_at)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))`
        )
          .bind(`cand_${round1.id}_${app.student_id}`, app.drive_id, round1.id, app.student_id, appId)
          .run();
      }

      return jsonResponse({ success: true });
    }

    // 8. Candidates for a round: /api/rounds/:roundId/candidates
    const candMatch = path.match(/^\/api\/rounds\/([a-zA-Z0-9_-]+)\/candidates$/);
    if (candMatch && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM round_candidates WHERE round_id = ?').bind(candMatch[1]).all();
      const mapped = results.map((rc: any) => ({
        id: rc.id,
        driveId: rc.drive_id,
        roundId: rc.round_id,
        studentId: rc.student_id,
        applicationId: rc.application_id,
        entryStatus: rc.entry_status,
        sourceRoundId: rc.source_round_id,
        createdAt: rc.created_at,
      }));
      return jsonResponse(mapped);
    }

    // 9. Batches for a round: /api/batches/round/:roundId
    const batchesMatch = path.match(/^\/api\/batches\/round\/([a-zA-Z0-9_-]+)$/);
    if (batchesMatch && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM batches WHERE round_id = ? ORDER BY created_at ASC').bind(batchesMatch[1]).all();
      const mapped = results.map((b: any) => ({
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
      return jsonResponse(mapped);
    }

    // Create Batch: POST /api/batches
    if (path === '/api/batches' && method === 'POST') {
      const user = await getAuthUser();
      const { roundId, driveId, batchName, capacityType, capacity, id } = (await request.json()) as any;
      if (!roundId || !batchName) return jsonResponse({ error: 'Round ID and Batch Name are required' }, 400);

      const batchId = id || `btch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await env.DB.prepare(
        `INSERT INTO batches (id, round_id, drive_id, batch_name, capacity_type, capacity, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, datetime('now'))`
      )
        .bind(
          batchId,
          roundId,
          driveId || null,
          batchName,
          capacityType || 'LIMITED',
          capacityType === 'LIMITED' ? Number(capacity) || 30 : null,
          user?.username || 'Coordinator'
        )
        .run();

      return jsonResponse({ id: batchId, roundId, driveId, batchName, capacityType, capacity, status: 'DRAFT' }, 201);
    }

    // Delete Batch: DELETE /api/batches/:id
    const deleteBatchMatch = path.match(/^\/api\/batches\/([a-zA-Z0-9_-]+)$/);
    if (deleteBatchMatch && method === 'DELETE') {
      const batchId = deleteBatchMatch[1];
      const batch = await env.DB.prepare('SELECT status FROM batches WHERE id = ?').bind(batchId).first<any>();
      if (!batch) return jsonResponse({ error: 'Batch not found' }, 404);
      if (batch.status === 'SUBMITTED') {
        return jsonResponse({ error: 'Cannot delete a frozen/submitted batch' }, 403);
      }
      await env.DB.prepare('DELETE FROM batches WHERE id = ?').bind(batchId).run();
      await env.DB.prepare('DELETE FROM batch_students WHERE batch_id = ?').bind(batchId).run();
      await env.DB.prepare('DELETE FROM evaluations WHERE batch_id = ?').bind(batchId).run();
      return jsonResponse({ success: true });
    }

    // 10. Batch students: /api/batches/:id/students
    const bStudentsMatch = path.match(/^\/api\/batches\/([a-zA-Z0-9_-]+)\/students$/);
    if (bStudentsMatch && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM batch_students WHERE batch_id = ?').bind(bStudentsMatch[1]).all();
      const mapped = results.map((bs: any) => ({
        id: bs.id,
        batchId: bs.batch_id,
        roundId: bs.round_id,
        driveId: bs.drive_id,
        studentId: bs.student_id,
        assignedAt: bs.assigned_at,
      }));
      return jsonResponse(mapped);
    }

    // Assign Students to Batch: POST /api/batches/:id/assign
    const assignMatch = path.match(/^\/api\/batches\/([a-zA-Z0-9_-]+)\/assign$/);
    if (assignMatch && method === 'POST') {
      const batchId = assignMatch[1];
      const { studentIds } = (await request.json()) as any;
      const batch = await env.DB.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).first<any>();
      if (!batch) return jsonResponse({ error: 'Batch not found' }, 404);
      if (batch.status === 'SUBMITTED') {
        return jsonResponse({ error: 'Cannot add candidates to a frozen/submitted batch' }, 403);
      }

      let added = 0;
      for (const sid of (studentIds || [])) {
        try {
          const bsId = `bs_${batchId}_${sid}`;
          await env.DB.prepare(
            `INSERT OR IGNORE INTO batch_students (id, batch_id, round_id, drive_id, student_id, assigned_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`
          ).bind(bsId, batchId, batch.round_id, batch.drive_id, sid).run();
          added++;
        } catch {}
      }

      return jsonResponse({ success: true, added });
    }

    // Remove Student from Batch: POST /api/batches/:id/remove
    const removeMatch = path.match(/^\/api\/batches\/([a-zA-Z0-9_-]+)\/remove$/);
    if (removeMatch && method === 'POST') {
      const batchId = removeMatch[1];
      const { studentId } = (await request.json()) as any;
      const batch = await env.DB.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).first<any>();
      if (!batch) return jsonResponse({ error: 'Batch not found' }, 404);
      if (batch.status === 'SUBMITTED') {
        return jsonResponse({ error: 'Cannot remove candidates from a frozen/submitted batch' }, 403);
      }
      await env.DB.prepare('DELETE FROM batch_students WHERE batch_id = ? AND student_id = ?').bind(batchId, studentId).run();
      return jsonResponse({ success: true });
    }

    // 11. Evaluations for batch: /api/evaluations/batch/:batchId
    const evalsMatch = path.match(/^\/api\/evaluations\/batch\/([a-zA-Z0-9_-]+)$/);
    if (evalsMatch && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM evaluations WHERE batch_id = ?').bind(evalsMatch[1]).all();
      const mapped = results.map((e: any) => ({
        id: e.id,
        batchId: e.batch_id,
        roundId: e.round_id,
        studentId: e.student_id,
        action: e.action,
        notes: e.notes,
        evaluatedAt: e.evaluated_at,
        evaluatedBy: e.evaluated_by,
      }));
      return jsonResponse(mapped);
    }

    // Set Evaluation: POST /api/evaluations
    if (path === '/api/evaluations' && method === 'POST') {
      const user = await getAuthUser();
      const { batchId, roundId, studentId, action, notes } = (await request.json()) as any;
      const batch = await env.DB.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).first<any>();
      if (!batch) return jsonResponse({ error: 'Batch not found' }, 404);
      if (batch.status === 'SUBMITTED') {
        return jsonResponse({ error: 'Cannot evaluate students in a submitted/frozen batch' }, 403);
      }

      const round = await env.DB.prepare('SELECT * FROM rounds WHERE id = ?').bind(roundId).first<any>();
      if (round?.is_final_round && action === 'HOLD') {
        return jsonResponse({ error: 'HOLD is not permitted in the Final Round' }, 400);
      }

      const evalId = `eval_${batchId}_${studentId}`;
      await env.DB.prepare(
        `INSERT OR REPLACE INTO evaluations (id, batch_id, round_id, student_id, action, notes, evaluated_at, evaluated_by)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`
      ).bind(evalId, batchId, roundId, studentId, action, notes || '', user?.username || 'HR').run();

      return jsonResponse({ success: true, action });
    }

    // Submit & Freeze Batch: POST /api/batches/:id/submit
    const submitBatchMatch = path.match(/^\/api\/batches\/([a-zA-Z0-9_-]+)\/submit$/);
    if (submitBatchMatch && method === 'POST') {
      const user = await getAuthUser();
      const batchId = submitBatchMatch[1];
      const batch = await env.DB.prepare('SELECT * FROM batches WHERE id = ?').bind(batchId).first<any>();
      if (!batch) return jsonResponse({ error: 'Batch not found' }, 404);
      if (batch.status === 'SUBMITTED') {
        return jsonResponse({ error: 'Batch is already submitted and frozen' }, 400);
      }

      const round = await env.DB.prepare('SELECT * FROM rounds WHERE id = ?').bind(batch.round_id).first<any>();
      const isFinal = Boolean(round?.is_final_round);

      const { results: batchStudents } = await env.DB.prepare('SELECT student_id FROM batch_students WHERE batch_id = ?').bind(batchId).all<any>();
      const { results: evals } = await env.DB.prepare('SELECT * FROM evaluations WHERE batch_id = ?').bind(batchId).all<any>();
      const evalMap = new Map(evals.map((e: any) => [e.student_id, e]));

      let nextRound: any = null;
      if (!isFinal && round) {
        nextRound = await env.DB.prepare('SELECT * FROM rounds WHERE drive_id = ? AND round_number = ?').bind(batch.drive_id, round.round_number + 1).first<any>();
      }

      const drive = await env.DB.prepare('SELECT * FROM drives WHERE id = ?').bind(batch.drive_id).first<any>();

      for (const bs of batchStudents) {
        const studentId = bs.student_id;
        const evaluation = evalMap.get(studentId);
        const action = evaluation ? evaluation.action : 'REJECT';

        const resultId = `rr_${round?.id || 'rnd'}_${studentId}`;
        const outcome = action === 'SELECT' ? 'SELECTED' : action === 'HOLD' ? 'HOLD' : 'REJECTED';

        await env.DB.prepare(
          `INSERT OR REPLACE INTO round_results (id, round_id, drive_id, batch_id, student_id, result, notes, finalized_at, finalized_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
        ).bind(resultId, batch.round_id, batch.drive_id, batchId, studentId, outcome, evaluation?.notes || '', user?.username || 'HR').run();

        if (action === 'SELECT' || action === 'HOLD') {
          if (!isFinal && nextRound) {
            const app = await env.DB.prepare('SELECT id FROM applications WHERE drive_id = ? AND student_id = ?').bind(batch.drive_id, studentId).first<any>();
            const candId = `cand_${nextRound.id}_${studentId}`;
            await env.DB.prepare(
              `INSERT OR REPLACE INTO round_candidates (id, drive_id, round_id, student_id, application_id, entry_status, source_round_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(candId, batch.drive_id, nextRound.id, studentId, app?.id || null, action === 'HOLD' ? 'HOLD' : 'ACTIVE', batch.round_id).run();
          } else if (isFinal && action === 'SELECT') {
            const student = await env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(studentId).first<any>();
            const placementId = `plc_${batch.drive_id}_${studentId}`;
            if (student) {
              await env.DB.prepare(
                `INSERT OR REPLACE INTO placements (id, drive_id, student_id, roll_number, student_name, branch, company_name, job_role, package, placed_at, source_round_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
              ).bind(
                placementId,
                batch.drive_id,
                student.id,
                student.roll_number,
                student.full_name,
                student.branch,
                drive?.company_name || 'Hiring Company',
                drive?.job_role || 'Graduate Engineer',
                drive?.package || '₹6.0 LPA',
                round?.id
              ).run();
            }
          }
        } else {
          // If HR marked as REJECT / deselect on edit:
          if (isFinal) {
            await env.DB.prepare('DELETE FROM placements WHERE drive_id = ? AND student_id = ?').bind(batch.drive_id, studentId).run();
          } else if (nextRound) {
            await env.DB.prepare('DELETE FROM round_candidates WHERE round_id = ? AND student_id = ?').bind(nextRound.id, studentId).run();
          }
        }
      }

      // Freeze batch
      await env.DB.prepare("UPDATE batches SET status = 'SUBMITTED', submitted_at = datetime('now'), submitted_by = ? WHERE id = ?")
        .bind(user?.username || 'HR', batchId)
        .run();

      return jsonResponse({ success: true, batchId, status: 'SUBMITTED' });
    }

    // 12. Round results: /api/round-results/round/:roundId
    const rResultsMatch = path.match(/^\/api\/round-results\/round\/([a-zA-Z0-9_-]+)$/);
    if (rResultsMatch && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM round_results WHERE round_id = ?').bind(rResultsMatch[1]).all();
      const mapped = results.map((rr: any) => ({
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
      return jsonResponse(mapped);
    }

    return jsonResponse({ error: `Not found: ${path}` }, 404);
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
};
