import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { User, Drive } from '../../types';
import { ShieldCheck, UserCheck, Briefcase, Lock, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  drives: Drive[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  drives = [],
}) => {
  const [selectedRole, setSelectedRole] = useState<'TPO' | 'COORDINATOR' | 'HR'>('TPO');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: 'TPO' | 'COORDINATOR' | 'HR') => {
    setSelectedRole(role);
    setError(null);
    if (role === 'TPO') {
      setUsername('Tpo_admin');
      setPassword('tpo_password_2026');
    } else if (drives.length > 0) {
      const firstDrive = drives[0];
      const creds = firstDrive.credentials;
      if (role === 'COORDINATOR') {
        setUsername(creds?.coordinatorUsername || `coord_${firstDrive.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        setPassword(creds?.coordinatorPassword || `coord2026@${firstDrive.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      } else {
        setUsername(creds?.hrUsername || `hr_${firstDrive.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        setPassword(creds?.hrPassword || `hr2026@${firstDrive.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      }
    } else {
      setUsername('');
      setPassword('');
    }
  };

  const handleQuickFillDrive = (d: Drive) => {
    setError(null);
    const creds = d.credentials;
    if (selectedRole === 'COORDINATOR') {
      setUsername(creds?.coordinatorUsername || `coord_${d.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      setPassword(creds?.coordinatorPassword || `coord2026@${d.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    } else if (selectedRole === 'HR') {
      setUsername(creds?.hrUsername || `hr_${d.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      setPassword(creds?.hrPassword || `hr2026@${d.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    try {
      // Real backend authentication via Cloudflare Worker / Express SQLite DB
      const result = await api.auth.login(cleanUser, cleanPass);
      onLoginSuccess(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff & Recruiter Authentication"
      subtitle="Sign in to access your dashboard"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Toggle Selector */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded">
          <button
            type="button"
            onClick={() => handleRoleSelect('TPO')}
            className={`py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              selectedRole === 'TPO'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>TPO Admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('COORDINATOR')}
            className={`py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              selectedRole === 'COORDINATOR'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Coordinator</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('HR')}
            className={`py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
              selectedRole === 'HR'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Company HR</span>
          </button>
        </div>

        {/* Quick Fill suggestions for Coordinators and HR */}
        {selectedRole !== 'TPO' && drives.length > 0 && (
          <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded text-xs">
            <div className="flex items-center gap-1 font-semibold text-zinc-800 mb-1.5 text-[11px]">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Select Active Drive to Quick-Fill:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {drives.slice(0, 5).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleQuickFillDrive(d)}
                  className="px-2 py-1 text-[11px] bg-white border border-zinc-200 hover:border-zinc-900 rounded font-medium text-zinc-700 transition-colors"
                >
                  {d.companyName}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        {/* Username */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
              <UserIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={
                selectedRole === 'TPO'
                  ? 'Tpo_admin'
                  : selectedRole === 'COORDINATOR'
                  ? 'coord_google'
                  : 'hr_google'
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-2 px-4 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-400 rounded transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <span>Sign In as {selectedRole === 'TPO' ? 'TPO Admin' : selectedRole === 'COORDINATOR' ? 'Coordinator' : 'Company HR'}</span>
          )}
        </button>
      </form>
    </Modal>
  );
};
