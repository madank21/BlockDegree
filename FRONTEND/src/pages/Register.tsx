import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Hash, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../useStore';
import { authApi, setToken } from '../api/api';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

export default function Register({ onNavigate }: RegisterProps) {
  const { register: storeRegister } = useStore();
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
    try {
      const response = await authApi.register({
        name,
        email,
        registrationNumber: regNo,
        password,
        role: 'student', // or whatever default
      });
      // If backend returns token, store it
      if (response.token) {
        setToken(response.token);
      }
      // Optionally update store with user info (if response.user)
      // storeRegister(name, email, regNo, password, 'student'); // not needed now
      // Navigate to dashboard or login
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... JSX unchanged ...
    <div className="min-h-screen bg-gray-950 ...">
      {/* ... everything else same ... */}
    </div>
  );
}