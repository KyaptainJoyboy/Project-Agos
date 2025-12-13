import { useState, useEffect } from 'react';
import { AlertCircle, User, X } from 'lucide-react';
import { signIn } from '../../lib/auth';
import { getStoredAccounts, removeStoredAccount, StoredAccount } from '../../lib/storedAccounts';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);
  const [showAccountsList, setShowAccountsList] = useState(true);

  useEffect(() => {
    setStoredAccounts(getStoredAccounts());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (account: StoredAccount) => {
    setEmail(account.email);
    setShowAccountsList(false);
    setTimeout(() => {
      document.getElementById('password')?.focus();
    }, 100);
  };

  const handleRemoveAccount = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeStoredAccount(email);
    setStoredAccounts(getStoredAccounts());
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AGOS</h1>
        <p className="text-slate-600">Advanced Geohazard Observation System</p>
      </div>

      {showAccountsList && storedAccounts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-700 mb-3">Quick Login</h2>
          <div className="space-y-2">
            {storedAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleQuickLogin(account)}
                className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-slate-900">{account.fullName}</p>
                  <p className="text-sm text-slate-500">{account.email}</p>
                </div>
                <button
                  onClick={(e) => handleRemoveAccount(account.email, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  title="Remove account"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAccountsList(false)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Use different account
            </button>
          </div>
        </div>
      )}

      {(!showAccountsList || storedAccounts.length === 0) && (
        <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      )}

      {!showAccountsList && storedAccounts.length > 0 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAccountsList(true)}
            className="text-sm text-slate-600 hover:text-slate-700 font-medium"
          >
            Back to saved accounts
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToRegister}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Don't have an account? Register
        </button>
      </div>
    </div>
  );
}
