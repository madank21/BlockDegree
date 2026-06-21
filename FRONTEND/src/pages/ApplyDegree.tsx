import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import { GraduationCap, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { degreesApi } from '../api/api'; // changed import

interface Props {
  onNavigate: (page: string) => void;
}

export default function ApplyDegree({ onNavigate }: Props) {
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    department: currentUser?.department || '',
    program: currentUser?.program || '',
    degreeTitle: '',
    cgpa: currentUser?.cgpa || 0,
    admissionYear: currentUser?.admissionYear || 2022,
    graduationYear: currentUser?.graduationYear || 2026,
  });

  if (!currentUser) return null;

  const isApproved = currentUser.verificationStatus === 'approved';

  const departments = ['Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Data Science', 'Electrical Engineering', 'Business Administration'];
  const programs: Record<string, string[]> = {
    'Computer Science': ['BS Computer Science', 'MS Computer Science', 'PhD Computer Science'],
    'Software Engineering': ['BS Software Engineering', 'MS Software Engineering'],
    'Artificial Intelligence': ['BS Artificial Intelligence', 'MS Artificial Intelligence'],
    'Data Science': ['BS Data Science', 'MS Data Science'],
    'Electrical Engineering': ['BS Electrical Engineering', 'MS Electrical Engineering'],
    'Business Administration': ['BBA', 'MBA', 'PhD Business Administration'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare payload matching backend expected fields
      const payload = {
        studentId: currentUser.id,
        studentName: currentUser.name,
        registrationNumber: currentUser.registrationNumber,
        department: form.department,
        program: form.program,
        degreeTitle: form.degreeTitle || `Bachelor of Science in ${form.department}`,
        cgpa: form.cgpa,
        admissionYear: form.admissionYear,
        graduationYear: form.graduationYear,
        // Additional fields if needed: studentEmail, etc.
      };

      // Use degreesApi.issue
      const result = await degreesApi.issue(payload);
      // result contains: degreeHash, qrCodeUrl, degreeId
      setSuccess(true);
    } catch (err: any) {
      console.error('Degree application error:', err);
      setError(err.message || 'Failed to submit degree application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component (the JSX) unchanged except the import and the submit handler
  return (
    // Keep the same JSX; the only changes are the import and the handleSubmit implementation
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ... everything else same ... */}
    </div>
  );
}