import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import { GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { degreesApi } from '../api/api';

interface Props {
  onNavigate: (page: string) => void;
}

export default function ApplyDegree({ onNavigate }: Props) {
  const { currentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [degreeHash, setDegreeHash] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Form fields that match the backend's degree creation schema
  const [form, setForm] = useState({
    // student_name and student_id are derived from currentUser
    degreeTitle: '',
    fieldOfStudy: currentUser?.program || '',   // maps to field_of_study
    graduationDate: '',                         // will be a date string (YYYY-MM-DD)
    gpa: currentUser?.cgpa || 0,                // maps to gpa
    honors: false,                              // boolean
  });

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to apply for a degree.</p>
      </div>
    );
  }

  // Only approved students can apply
  const isApproved = currentUser.verificationStatus === 'approved';

  // Example list of fields of study – you can customize
  const fieldsOfStudy = [
    'Computer Science',
    'Software Engineering',
    'Artificial Intelligence',
    'Data Science',
    'Electrical Engineering',
    'Business Administration',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Build payload exactly as the backend expects (snake_case)
    const payload = {
      student_name: currentUser.name,                    // from user
      student_id: currentUser.registrationNumber,       // or currentUser.id – backend expects a string
      degree_title: form.degreeTitle,
      field_of_study: form.fieldOfStudy,
      graduation_date: form.graduationDate,              // must be a valid date string
      gpa: form.gpa,
      honors: form.honors,
    };

    try {
      const result = await degreesApi.issue(payload);
      // After the API response unwrapping (Phase 3), result contains the degree data
      // The backend returns: { degree: { id, degreeHash, ... } } but after unwrap we get the inner data
      // We'll handle both cases
      const degreeData = result;
      setDegreeHash(degreeData?.degreeHash || null);
      setQrCodeUrl(degreeData?.qrCodeUrl || null); // if backend adds this later
      setSuccess(true);
    } catch (err: any) {
      console.error('Degree application error:', err);
      setError(err.message || 'Failed to submit degree application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Apply for Degree</h1>
        </div>

        {!isApproved ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Account Not Verified</p>
              <p className="text-yellow-700 text-sm">
                Your account must be approved by an administrator before you can apply for a degree.
              </p>
            </div>
          </div>
        ) : (
          <>
            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Degree Application Submitted!</h3>
                </div>
                <p className="text-green-700">
                  Your degree has been issued and recorded on the blockchain.
                </p>
                {degreeHash && (
                  <div className="bg-white rounded p-3 border border-green-200">
                    <p className="text-sm font-medium text-gray-700">Transaction Hash</p>
                    <p className="text-xs text-gray-600 break-all font-mono">{degreeHash}</p>
                  </div>
                )}
                {qrCodeUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">QR Code</p>
                    <img src={qrCodeUrl} alt="Degree QR Code" className="w-32 h-32 border rounded" />
                  </div>
                )}
                <button
                  onClick={() => onNavigate('my-degrees')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  View My Degrees
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Degree Title *
                    </label>
                    <input
                      type="text"
                      name="degreeTitle"
                      value={form.degreeTitle}
                      onChange={handleChange}
                      placeholder="e.g., Bachelor of Science in Computer Science"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field of Study *
                    </label>
                    <select
                      name="fieldOfStudy"
                      value={form.fieldOfStudy}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select field</option>
                      {fieldsOfStudy.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Graduation Date *
                    </label>
                    <input
                      type="date"
                      name="graduationDate"
                      value={form.graduationDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GPA / CGPA *
                    </label>
                    <input
                      type="number"
                      name="gpa"
                      value={form.gpa}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="4.0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="honors"
                        checked={form.honors}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Awarded with Honors</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Issue Degree'
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}