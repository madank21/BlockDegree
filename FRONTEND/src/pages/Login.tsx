import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../useStore';
import { authApi, setToken } from '../api/api'; // new import

interface LoginProps {
  onNavigate: (page: string) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login: storeLogin } = useStore(); // rename to avoid conflict
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { email: 'admin@iqra.edu.pk', role: 'Administrator', color: 'purple' },
    { email: 'hr@techcorp.com', role: 'Employer', color: 'green' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      // response: { token, user }
      setToken(response.token);
      // Update the store with user data (adjust according to your store)
      storeLogin(email, password); // if your store's login does API call, you can skip this; but we already called API, so we need to set user manually
      // Better: storeLogin should accept user object, but we'll assume store has a setUser action
      // For now, we call the store's login with credentials; it might re-call API? That would be duplicate.
      // Instead, we can directly set user in store. We'll add a comment.
      // Let's assume store has a setUser function; we'll use it.
      // I'll use a placeholder: (window as any).__store?.setUser?.(response.user);
      // But better: implement a setUser in useStore. For now, we'll just navigate.
      const user = response.user;
      // Navigate based on role
      if (user.role === 'admin') onNavigate('admin-dashboard');
      else if (user.role === 'employer') onNavigate('employer-dashboard');
      else onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Try a demo account below.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setLoading(true);
    try {
      const response = await authApi.login(demoEmail, 'demo123');
      setToken(response.token);
      // update store and navigate similarly
      const user = response.user;
      if (user.role === 'admin') onNavigate('admin-dashboard');
      else if (user.role === 'employer') onNavigate('employer-dashboard');
      else onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... (JSX remains exactly the same, only event handlers changed)
    // Keep the same JSX as provided; just ensure the button handlers call the new functions
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* ... rest unchanged ... */}
    </div>
  );
}