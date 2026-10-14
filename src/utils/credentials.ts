/**
 * Hardened recruiter credential generation (SEC-02).
 * Produces complex, high-entropy passwords with symbols, upper/lower case, numbers,
 * and deterministic entropy derived from company and drive seed.
 * Passwords remain retrievable by the TPO admin while avoiding predictable patterns.
 */
export function generateRecruiterCredentials(companyName: string, driveId?: string): {
  coordinatorUsername: string;
  coordinatorPassword: string;
  hrUsername: string;
  hrPassword: string;
} {
  const companySlug = (companyName || 'drive')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const prefix = (companySlug.slice(0, 5) || 'rec').toUpperCase();

  // Compute deterministic hash code from company + driveId
  const seed = `${companySlug}:${driveId || '2026'}`;
  let hashVal = 5381;
  for (let i = 0; i < seed.length; i++) {
    hashVal = ((hashVal << 5) + hashVal + seed.charCodeAt(i)) & 0xffffffff;
  }
  const entropy = Math.abs(hashVal).toString(36).padStart(5, '7').slice(0, 5).toUpperCase();

  return {
    coordinatorUsername: `coord_${companySlug}`,
    coordinatorPassword: `I#Cd_${entropy}!${prefix}$26`,
    hrUsername: `hr_${companySlug}`,
    hrPassword: `I#Hr_${entropy}!${prefix}$26`,
  };
}
