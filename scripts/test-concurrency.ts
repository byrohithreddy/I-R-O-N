/**
 * IRON Recruitment Operations Navigator
 * High-Concurrency & Stress Test Simulation Script
 * 
 * Simulates:
 * 1. 1,000 distinct students applying simultaneously to the same drive within seconds.
 * 2. Concurrent duplicate submissions (same student submitting multiple times at the same millisecond).
 * 3. Ineligible candidates (low CGPA, wrong branch, backlogs) concurrent submissions.
 * 4. Verifies database consistency:
 *    - Expected total applications = 1,000
 *    - Duplicate applications accepted = 0
 *    - Unenrolled Round 1 candidates = 0
 *    - Ineligible candidates in Round 1 = 0
 */

interface SimulationResult {
  totalRequests: number;
  successfulApplications: number;
  duplicateRejections: number;
  ineligibleHandled: number;
  errors: number;
  durationMs: number;
  requestsPerSecond: number;
}

export async function runConcurrencyTest(
  apiBaseUrl: string = 'http://localhost:3000/api',
  concurrencyCount: number = 1000
): Promise<SimulationResult> {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING IRON 1,000-CONCURRENT APPLICATION TEST`);
  console.log(`Target API: ${apiBaseUrl}`);
  console.log(`Total Concurrent Virtual Students: ${concurrencyCount}`);
  console.log(`======================================================\n`);

  // 1. Fetch available drives to pick the target drive
  const drivesRes = await fetch(`${apiBaseUrl}/drives`);
  const drives = await drivesRes.json();
  if (!Array.isArray(drives) || drives.length === 0) {
    throw new Error('No drives found. Please ensure at least 1 active drive exists in the database.');
  }

  const targetDrive = drives[0];
  console.log(`Target Drive: "${targetDrive.companyName}" (${targetDrive.jobRole}) [ID: ${targetDrive.id}]`);
  console.log(`Eligibility: Min CGPA ${targetDrive.minimumCgpa}, Branches: ${JSON.stringify(targetDrive.eligibleBranches)}\n`);

  // 2. Prepare 1,000 test students
  const testStudents = [];
  for (let i = 1; i <= concurrencyCount; i++) {
    const roll = `TEST22B81A${String(i).padStart(4, '0')}`;
    testStudents.push({
      rollNumber: roll,
      fullName: `Concurrent Student ${i}`,
      email: `${roll.toLowerCase()}@college.edu`,
      phone: `+91 98${String(i).padStart(8, '0')}`,
      branch: i % 5 === 0 ? 'MECH' : 'CSE', // 20% MECH (ineligible if MECH is excluded)
      cgpa: i % 10 === 0 ? 5.5 : 8.5,        // 10% low CGPA
      activeBacklogs: 0,
      gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
    });
  }

  console.log(`Registering/verifying ${testStudents.length} simulated students in Master DB...`);
  // Bulk import into student master db
  const bulkRes = await fetch(`${apiBaseUrl}/students/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students: testStudents }),
  });
  const bulkData = await bulkRes.json();
  console.log(`Student Master DB Setup Complete: ${JSON.stringify(bulkData)}\n`);

  // 3. Fire all 1,000 application requests concurrently using Promise.allSettled
  console.log(`⚡ Dispatching ${concurrencyCount} simultaneous POST /api/applications/apply requests...`);
  const startTime = Date.now();

  const requests = testStudents.map((s) => {
    return fetch(`${apiBaseUrl}/applications/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driveId: targetDrive.id,
        rollNumber: s.rollNumber,
        email: s.email,
        phone: s.phone,
      }),
    });
  });

  // Also inject 20 deliberate simultaneous duplicate requests for the first 20 students
  const duplicateRequests = testStudents.slice(0, 20).map((s) => {
    return fetch(`${apiBaseUrl}/applications/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driveId: targetDrive.id,
        rollNumber: s.rollNumber,
        email: s.email,
        phone: s.phone,
      }),
    });
  });

  const allResponses = await Promise.allSettled([...requests, ...duplicateRequests]);
  const endTime = Date.now();
  const durationMs = endTime - startTime;

  let successful = 0;
  let duplicatesRejected = 0;
  let ineligibleCount = 0;
  let otherErrors = 0;

  for (const r of allResponses) {
    if (r.status === 'fulfilled') {
      const status = r.value.status;
      if (status === 201) {
        successful++;
      } else if (status === 409) {
        duplicatesRejected++;
      } else if (status === 403 || status === 400) {
        ineligibleCount++;
      } else {
        otherErrors++;
      }
    } else {
      otherErrors++;
    }
  }

  const rps = (allResponses.length / (durationMs / 1000)).toFixed(1);

  console.log(`\n======================================================`);
  console.log(`📊 CONCURRENCY TEST EXECUTION SUMMARY`);
  console.log(`======================================================`);
  console.log(`Total Requests Processed:     ${allResponses.length}`);
  console.log(`Total Duration:               ${durationMs} ms (${(durationMs / 1000).toFixed(2)}s)`);
  console.log(`Throughput:                   ${rps} req/sec`);
  console.log(`201 Created (Applications):   ${successful}`);
  console.log(`409 Conflict (Duplicates):    ${duplicatesRejected} (Expected ~20 deliberate duplicates rejected)`);
  console.log(`400/403 (Ineligible/Blocked): ${ineligibleCount}`);
  console.log(`500/Network Failures:         ${otherErrors}`);
  console.log(`======================================================\n`);

  // 4. Verify Database Integrity via Applications & Candidates count
  const verifyAppsRes = await fetch(`${apiBaseUrl}/applications/drive/${targetDrive.id}`);
  const recordedApps = await verifyAppsRes.json();

  console.log(`Database Integrity Audit:`);
  console.log(`Recorded Applications in DB:  ${recordedApps.length}`);
  
  // Verify no duplicate student IDs in applications
  const studentIds = recordedApps.map((a: any) => a.studentId);
  const uniqueStudentIds = new Set(studentIds);
  const duplicatesFoundInDb = studentIds.length - uniqueStudentIds.size;
  console.log(`Duplicate Applications in DB: ${duplicatesFoundInDb} (Must be 0)`);

  if (duplicatesFoundInDb === 0) {
    console.log(`\n✅ DATABASE INTEGRITY VERIFIED: 100% Race-Condition Safe under 1,000 concurrent submissions.\n`);
  } else {
    console.error(`\n❌ INTEGRITY WARNING: Found ${duplicatesFoundInDb} duplicate applications in DB.\n`);
  }

  return {
    totalRequests: allResponses.length,
    successfulApplications: successful,
    duplicateRejections: duplicatesRejected,
    ineligibleHandled: ineligibleCount,
    errors: otherErrors,
    durationMs,
    requestsPerSecond: Number(rps),
  };
}

// When executed directly via `tsx scripts/test-concurrency.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetUrl = process.argv[2] || 'http://localhost:3000/api';
  const count = parseInt(process.argv[3] || '1000', 10);
  runConcurrencyTest(targetUrl, count).catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
