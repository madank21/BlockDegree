import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Hash, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../useStore';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

export default function Register({ onNavigate }: RegisterProps) {
  const { register } = useStore();
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailValid = email.endsWith('@iqra.edu.pk');
  const emailHasRegNo = email.includes(`.${regNo}@`) && regNo.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailValid) {
      setError('Please use an official @iqra.edu.pk email address.');
      return;
    }
    if (!emailHasRegNo && regNo) {
      setError('Email must include your registration number (e.g., name.70618@iqra.edu.pk).');
      return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    try {
      register(name, email, regNo, password, 'student');
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-sm text-gray-400 mt-1">Register with your university email</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-sm text-red-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Madan Kumar"
                  className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Registration Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  placeholder="70618"
                  className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">University Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name.70618@iqra.edu.pk"
                  className={`w-full pl-11 pr-10 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition ${
                    email.length > 0 ? (emailValid ? 'border-green-500/50 focus:border-green-500' : 'border-red-500/50 focus:border-red-500') : 'border-gray-700 focus:border-blue-500'
                  } focus:ring-1 focus:ring-blue-500`}
                  required
                />
                {email.length > 5 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValid ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be @iqra.edu.pk domain</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !emailValid}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-white"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <button onClick={() => onNavigate('login')} className="text-blue-400 hover:text-blue-300">Sign In</button>
          </p>
        </div>

        <button onClick={() => onNavigate('landing')} className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition mx-auto block">
          ← Back to Home
        </button>
      </motion.div>
    </div>
  );
}
