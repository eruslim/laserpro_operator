import { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { signIn, signUpCustomer } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  adminOnly?: boolean;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signin', adminOnly = true }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchMode = () => {
    resetForm();
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  const validateForm = (): string | null => {
    if (!email.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (mode === 'signup') {
      if (!fullName.trim()) {
        return 'Full name is required';
      }
      if (password !== confirmPassword) {
        return 'Passwords do not match';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        // Sign in
        await signIn(email, password);
        setSuccess('Signed in successfully!');
        // Close modal and let auth listener update the state
        setTimeout(() => {
          handleClose();
          // No reload needed - onAuthStateChange will handle it
        }, 500);
      } else {
        // Sign up
        await signUpCustomer(email, password, fullName);
        setSuccess('Account created successfully! Please check your email to confirm your account.');
        setTimeout(() => {
          // Auto-switch to sign in after successful signup
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
          setSuccess(null);
        }, 3000);
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      // Handle specific error messages
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('User already registered')) {
        setError('An account with this email already exists');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-gray-600 mt-1">
                {mode === 'signin'
                  ? (adminOnly ? 'Admin Portal - Sign in with admin credentials.' : 'Welcome back! Please sign in to continue.')
                  : 'Get started with your LaserCut Pro account.'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                {mode === 'signup' && (
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                )}
              </div>

              {/* Confirm Password (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Switch mode - hide for admin portal */}
            {!adminOnly && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={switchMode}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={loading}
                  >
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            )}

            {/* Admin portal notice */}
            {adminOnly && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Admin Access Only</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Only admin users can access this portal. Contact your system administrator if you need admin access.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
