import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { User, Drive } from '../../types';
import { ShieldCheck, UserCheck, Briefcase, Lock, User as UserIcon, Loader2 } from 'lucide-react';
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
}) => {
  const [selectedRole, setSelectedRole] = useState<'TPO' | 'COORDINATOR' | 'HR'>('TPO');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: 'TPO' | 'COORDINATOR' | 'HR') => {
    setSelectedRole(role);
    setError(null);
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
              placeholder="Enter username"
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
            <span>Sign In</span>
          )}
        </button>
      </form>
    </Modal>
  );
};
