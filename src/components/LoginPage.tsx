import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { USERS } from '../store';
import { Shield, GraduationCap, Lock, Mail, ChevronDown, Blocks, ScanEye, BrainCircuit } from 'lucide-react';

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showQuickLogin, setShowQuickLogin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(email, password);
    if (!user) {
      setError('Invalid credentials. Use one of the demo accounts below.');
    }
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    login(userEmail, 'demo');
  };

  const roleColors: Record<string, string> = {
    admin: 'from-red-500 to-red-600',
    university: 'from-blue-500 to-blue-600',
    student: 'from-green-500 to-green-600',
    employer: 'from-purple-500 to-purple-600',
  };

  const roleIcons: Record<string, string> = {
    admin: '🛡️',
    university: '🏛️',
    student: '🎓',
    employer: '🏢',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
            <Blocks className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">BlockDegree</h1>
            <p className="text-xs text-gray-400">Blockchain Attestation System</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Info */}
          <div className="hidden lg:block space-y-8">
            <div>
              <h2 className="text-5xl font-bold text-white leading-tight">
                AI-Powered<br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Blockchain Degree
                </span><br />
                Verification
              </h2>
              <p className="mt-4 text-lg text-gray-400 max-w-md">
                Secure, immutable degree attestation using private Ethereum blockchain with AI-driven fraud detection.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
                <Shield className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="font-semibold text-white text-sm">Blockchain Security</h3>
                <p className="text-xs text-gray-400 mt-1">Immutable smart contract records on private Ethereum</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
                <ScanEye className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-semibold text-white text-sm">OCR Extraction</h3>
                <p className="text-xs text-gray-400 mt-1">Tesseract-powered text extraction from degree images</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
                <BrainCircuit className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-semibold text-white text-sm">YOLO Detection</h3>
                <p className="text-xs text-gray-400 mt-1">AI detects logos, stamps, signatures for fraud check</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
                <GraduationCap className="w-8 h-8 text-green-400 mb-3" />
                <h3 className="font-semibold text-white text-sm">RBAC System</h3>
                <p className="text-xs text-gray-400 mt-1">Role-based access for universities, students & employers</p>
              </div>
            </div>
          </div>

          {/* Right - Login Form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Sign In</h3>
                <p className="text-sm text-gray-400 mt-1">Access the verification system</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-900/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-900/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/25 cursor-pointer"
                >
                  Sign In
                </button>
              </form>

              {/* Quick Login */}
              <div className="mt-6">
                <button
                  onClick={() => setShowQuickLogin(!showQuickLogin)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition cursor-pointer"
                >
                  <span>Demo Quick Login</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showQuickLogin ? 'rotate-180' : ''}`} />
                </button>

                {showQuickLogin && (
                  <div className="mt-3 space-y-2">
                    {USERS.filter((u, i, arr) => arr.findIndex(x => x.role === u.role) === i).map(user => (
                      <button
                        key={user.id}
                        onClick={() => quickLogin(user.email)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r ${roleColors[user.role]} text-white text-sm font-medium hover:opacity-90 transition cursor-pointer`}
                      >
                        <span className="text-lg">{roleIcons[user.role]}</span>
                        <div className="text-left">
                          <div>{user.name}</div>
                          <div className="text-xs opacity-75">{user.role.charAt(0).toUpperCase() + user.role.slice(1)} • {user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              🔐 JWT Authentication • RBAC Access Control • Private Ethereum
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
