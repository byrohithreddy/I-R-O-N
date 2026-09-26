import { Student, Drive, DriveRound, Application, Batch, BatchStudent, Placement, User } from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem('iron_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server error occurred');
  }

  return data as T;
}

export const api = {
  // Authentication
  auth: {
    async login(username: string, password: string): Promise<{ token: string; user: User }> {
      const res = await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      sessionStorage.setItem('iron_auth_token', res.token);
      sessionStorage.setItem('iron_active_user', JSON.stringify(res.user));
      return res;
    },

    async getMe(): Promise<{ user: User }> {
      return request<{ user: User }>('/auth/me');
    },

    logout() {
      sessionStorage.removeItem('iron_auth_token');
      sessionStorage.removeItem('iron_active_user');
    },
  },

  // Students
  students: {
    async getAll(search?: string, branch?: string): Promise<Student[]> {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (branch) params.append('branch', branch);
      return request<Student[]>(`/students?${params.toString()}`);
    },

    async getByRollNumber(rollNumber: string): Promise<Student> {
      return request<Student>(`/students/by-roll/${encodeURIComponent(rollNumber)}`);
    },

    async create(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
      return request<Student>('/students', {
        method: 'POST',
        body: JSON.stringify(student),
      });
    },

    async update(id: string, student: Partial<Student>): Promise<Student> {
      return request<Student>(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(student),
      });
    },

    async delete(id: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/students/${id}`, {
        method: 'DELETE',
      });
    },

    async bulkImport(students: Partial<Student>[]): Promise<{ total: number; inserted: number; duplicates: number; errors: number }> {
      return request('/students/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ students }),
      });
    },
  },

  // Drives
  drives: {
    async getAll(): Promise<Drive[]> {
      return request<Drive[]>('/drives');
    },

    async getById(id: string): Promise<Drive> {
      return request<Drive>(`/drives/${id}`);
    },

    async getCredentials(id: string): Promise<any> {
      return request(`/drives/${id}/credentials`);
    },

    async create(drive: Partial<Drive> & { rounds?: any[] }): Promise<Drive> {
      return request<Drive>('/drives', {
        method: 'POST',
        body: JSON.stringify(drive),
      });
    },

    async update(id: string, drive: Partial<Drive>): Promise<Drive> {
      return request<Drive>(`/drives/${id}`, {
        method: 'PUT',
        body: JSON.stringify(drive),
      });
    },

    async purge(id: string): Promise<{ success: boolean; archiveId: string }> {
      return request(`/drives/${id}/purge`, {
        method: 'DELETE',
      });
    },
  },

  // Rounds
  rounds: {
    async getByDrive(driveId: string): Promise<DriveRound[]> {
      return request<DriveRound[]>(`/rounds/drive/${driveId}`);
    },

    async create(round: Partial<DriveRound>): Promise<DriveRound> {
      return request<DriveRound>('/rounds', {
        method: 'POST',
        body: JSON.stringify(round),
      });
    },

    async delete(id: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/rounds/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Applications
  applications: {
    async getByDrive(driveId: string): Promise<Application[]> {
      return request<Application[]>(`/applications/drive/${driveId}`);
    },

    async apply(payload: { driveId: string; rollNumber: string; email?: string; phone?: string }): Promise<{
      success: boolean;
      applicationId: string;
      eligibilityStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE';
      reasons?: any;
    }> {
      return request('/applications/apply', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async override(id: string, reason: string): Promise<{ success: boolean }> {
      return request(`/applications/${id}/override`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
  },

  // Batches
  batches: {
    async getCandidates(roundId: string): Promise<any[]> {
      return request(`/rounds/${roundId}/candidates`);
    },

    async getByRound(roundId: string): Promise<Batch[]> {
      return request<Batch[]>(`/batches/round/${roundId}`);
    },

    async create(payload: { roundId: string; driveId: string; batchName: string; capacityType: string; capacity: number | null }): Promise<Batch> {
      return request<Batch>('/batches', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async delete(id: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(`/batches/${id}`, {
        method: 'DELETE',
      });
    },

    async getStudents(batchId: string): Promise<BatchStudent[]> {
      return request<BatchStudent[]>(`/batches/${batchId}/students`);
    },

    async assignStudents(batchId: string, studentIds: string[]): Promise<{ success: boolean; added: number; errors: string[] }> {
      return request(`/batches/${batchId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ studentIds }),
      });
    },

    async removeStudent(batchId: string, studentId: string): Promise<{ success: boolean }> {
      return request(`/batches/${batchId}/remove`, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      });
    },
  },

  // Evaluations
  evaluations: {
    async getByBatch(batchId: string): Promise<any[]> {
      return request(`/evaluations/batch/${batchId}`);
    },

    async getRoundResults(roundId: string): Promise<any[]> {
      return request(`/round-results/round/${roundId}`);
    },

    async evaluate(payload: { batchId: string; roundId: string; studentId: string; action: 'SELECT' | 'HOLD' | 'REJECT'; notes?: string }): Promise<any> {
      return request('/evaluations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async submitBatch(batchId: string): Promise<{ success: boolean; batchId: string; status: 'SUBMITTED' }> {
      return request(`/batches/${batchId}/submit`, {
        method: 'POST',
      });
    },
  },

  // Placements
  placements: {
    async getAll(driveId?: string): Promise<Placement[]> {
      const url = driveId ? `/placements?driveId=${encodeURIComponent(driveId)}` : '/placements';
      return request<Placement[]>(url);
    },
  },

  // Real-Time Sync & Consolidation
  sync: {
    async getFullState(): Promise<{
      students: Student[];
      drives: Drive[];
      rounds: DriveRound[];
      applications: Application[];
      candidates: any[];
      batches: Batch[];
      batchStudents: BatchStudent[];
      evaluations: any[];
      roundResults: any[];
      placements: Placement[];
    }> {
      return request('/sync');
    },
  },

  // Archives
  archives: {
    async getAll(): Promise<any[]> {
      return request('/archives');
    },
  },
};
