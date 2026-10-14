import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  RefreshCw,
  LogOut,
  Info,
  Check,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

interface PasswordChangeLog {
  id: string;
  user_id: string;
  username: string;
  ip_address: string;
  user_agent: string;
  status: string;
  created_at: string;
}

interface TpoSecurityProps {
  onLogout: () => void;
}

export const TpoSecurity: React.FC<TpoSecurityProps> = ({ onLogout }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; countdown: number } | null>(null);

  const [logs, setLogs] = useState<PasswordChangeLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Password complexity checks (Strict: At least 8 characters with letters, numbers, and symbols)
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^a-zA-Z0-9]/.test(newPassword);
  const isDifferentFromOld = oldPassword ? newPassword !== oldPassword : true;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmNewPassword;

  const isPasswordValid = hasMinLength && hasLetter && hasNumber && hasSymbol;
  const canSubmit =
    oldPassword.trim().length > 0 &&
    isPasswordValid &&
    passwordsMatch &&
    isDifferentFromOld &&
    !isSubmitting;

  // Strength score (0 to 4)
  const strengthScore = [hasMinLength, hasLetter, hasNumber, hasSymbol].filter(Boolean).length;
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-zinc-200 text-zinc-500',
    'bg-rose-500 text-white',
    'bg-amber-500 text-white',
    'bg-blue-500 text-white',
    'bg-emerald-600 text-white',
  ];

  // Fetch security audit logs
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await api.security.getLogs();
      setLogs(res.logs || []);
    } catch {
      // Non-blocking for log fetch
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Handle countdown on success
  useEffect(() => {
    if (!successInfo) return;

    if (successInfo.countdown <= 0) {
      onLogout();
      return;
    }

    const timer = setInterval(() => {
      setSuccessInfo((prev) => (prev ? { ...prev, countdown: prev.countdown - 1 } : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [successInfo, onLogout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!oldPassword.trim()) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('New password must satisfy all strict complexity criteria (min. 8 chars, letters, numbers, and symbols).');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.security.changePassword(oldPassword, newPassword, confirmNewPassword);
      setSuccessInfo({
        message: res.message || 'Password changed successfully. All active sessions have been invalidated.',
        countdown: 5,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      fetchLogs();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please check your current password and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLogDate = (dateString: string) => {
    try {
      // SQLite datetime('now') returns UTC string e.g. "2026-10-14 14:20:00"
      const utcDate = new Date(dateString.replace(' ', 'T') + 'Z');
      if (isNaN(utcDate.getTime())) return dateString;
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Kolkata',
      }).format(utcDate) + ' (IST)';
    } catch {
      return dateString;
    }
  };

  const simplifyUserAgent = (ua: string) => {
    if (!ua) return 'Web Client';
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Edge')) return 'Edge Browser';
    return ua.slice(0, 30);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">Security settings</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Active Protection
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Manage your TPO account security. Configure privileged access controls and institutional credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {successInfo && (
        <div className="p-5 bg-emerald-50 border-2 border-emerald-500/50 rounded-xl shadow-sm">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-950">
                Password Successfully Updated
              </h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                {successInfo.message}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign In With New Password Now
                </button>
                <span className="text-xs text-emerald-700 font-medium">
                  Auto-redirecting in {successInfo.countdown}s...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Form & Security Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Change Password Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Change Password</h2>
                <p className="text-xs text-zinc-500">
                  Enter your current password to authorize this change.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Field 1: Old Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Old password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    disabled={isSubmitting || !!successInfo}
                    className="w-full text-xs px-3 py-2.5 pr-10 rounded-lg border border-zinc-300 bg-white text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                    aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 2: New Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  New password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter a new password"
                    required
                    disabled={isSubmitting || !!successInfo}
                    className="w-full text-xs px-3 py-2.5 pr-10 rounded-lg border border-zinc-300 bg-white text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Password strength:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${strengthColors[strengthScore]}`}>
                        {strengthLabels[strengthScore]}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= step
                              ? strengthScore === 4
                                ? 'bg-emerald-500'
                                : strengthScore === 3
                                ? 'bg-blue-500'
                                : strengthScore === 2
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                              : 'bg-zinc-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Password Criteria Checklist */}
                <div className="mt-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
                  <div className="text-[11px] font-semibold text-zinc-700">Strict Password Requirements:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-zinc-500'}`}>
                      {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] text-zinc-400">•</div>}
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-medium' : 'text-zinc-500'}`}>
                      {hasLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] text-zinc-400">•</div>}
                      Includes letters (a-z, A-Z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-zinc-500'}`}>
                      {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] text-zinc-400">•</div>}
                      Includes numbers (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-700 font-medium' : 'text-zinc-500'}`}>
                      {hasSymbol ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] text-zinc-400">•</div>}
                      Includes symbols (!@#$%...)
                    </div>
                  </div>
                  {oldPassword && newPassword && !isDifferentFromOld && (
                    <div className="pt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      Must not match current password
                    </div>
                  )}
                </div>
              </div>

              {/* Field 3: Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Confirm new password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter the new password"
                    required
                    disabled={isSubmitting || !!successInfo}
                    className={`w-full text-xs px-3 py-2.5 pr-10 rounded-lg border bg-white text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 ${
                      confirmNewPassword.length > 0
                        ? passwordsMatch
                          ? 'border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500'
                          : 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-zinc-300 focus:ring-emerald-500 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmNewPassword.length > 0 && (
                  <div className="mt-1.5 text-[11px]">
                    {passwordsMatch ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1 font-medium">
                        <X className="w-3.5 h-3.5" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Audit Log Card */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">Password Change Audit Log</h2>
                  <p className="text-xs text-zinc-500">
                    Audit trail of previous password update events and timestamps.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-4">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                  <History className="w-5 h-5 mx-auto mb-1 text-zinc-300" />
                  No previous password changes recorded.
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    The initial institutional TPO credentials are in active use.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 text-zinc-500 font-medium">
                        <th className="py-2.5 pr-4 font-semibold">Date & Time</th>
                        <th className="py-2.5 px-4 font-semibold">Event</th>
                        <th className="py-2.5 px-4 font-semibold">Client / Device</th>
                        <th className="py-2.5 px-4 font-semibold">IP Address</th>
                        <th className="py-2.5 pl-4 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 pr-4 font-medium text-zinc-900 whitespace-nowrap">
                            {formatLogDate(log.created_at)}
                          </td>
                          <td className="py-3 px-4 text-zinc-700">
                            Password Reset
                          </td>
                          <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                            {simplifyUserAgent(log.user_agent)}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                            {log.ip_address}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Security Policies & Best Practices */}
        <div className="space-y-6">
          {/* Immediate Invalidation Advisory */}
          <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Session Revocation Policy
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  Upon saving a new password, all active JWT sessions on all browsers, devices, and tabs will be
                  terminated immediately.
                </p>
                <div className="mt-3 p-2.5 bg-amber-100/60 rounded-lg text-[11px] text-amber-950 border border-amber-200 font-medium">
                  You will need to sign in immediately using your new password.
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Guidelines */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-950">
              <Info className="w-4 h-4 text-emerald-600" />
              TPO Security Best Practices
            </div>
            <ul className="text-xs text-zinc-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  <strong>Independent Staff Roles:</strong> Student Coordinators and Company HR partners possess isolated credentials. Never provide TPO admin login details to recruiters.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  <strong>Periodic Rotation:</strong> We recommend updating your administrator password at the start of each academic placement season.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  <strong>High Entropy:</strong> Incorporate uppercase, lowercase, numerals, and special characters.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
