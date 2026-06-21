import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api/api';  // ✅ default import gives you the object with .get, .post, etc. // <-- changed to default import
import { AlertTriangle, Shield, CheckCircle2, XCircle, Activity } from 'lucide-react';

interface FraudReport {
  id: string;
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low' | 'safe';
  studentName: string;
  timestamp: string;
  resolved: boolean;
}

interface FraudStats {
  unresolvedCount: number;
  resolvedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  duplicateCnicCount: number;
  fraudulentDocCount: number;
  safetyScore: number;
  totalApplications: number;
}

interface FraudCheck {
  applicationId: string;
  studentName: string;
  score: number;
  severity: 'high' | 'medium' | 'safe';
  flags: string[];
}

const severityConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: XCircle },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: AlertTriangle },
  safe: { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', icon: CheckCircle2 },
};

export default function FraudDetection() {
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [checks, setChecks] = useState<FraudCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // ✅ Use api.get<T>() – no function call on the object itself
      const [reportsData, statsData, checksData] = await Promise.all([
        api.get<FraudReport[]>('/fraud/reports'),
        api.get<FraudStats>('/fraud/stats'),
        api.get<FraudCheck[]>('/fraud/checks'),
      ]);
      setReports(reportsData);
      setStats(statsData);
      setChecks(checksData);
    } catch (err) {
      // 👇 Fix unknown error
      setError(err instanceof Error ? err.message : 'Failed to fetch fraud data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-6">Loading fraud detection data...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!stats) return null;

  // Compute detection types using stats
  const detectionTypes = [
    { type: 'Fake Documents', desc: 'Documents flagged by validation checks', count: stats.fraudulentDocCount },
    { type: 'Data Mismatch', desc: 'Application data needs admin review', count: checks.filter(c => c.severity !== 'safe').length },
    { type: 'Duplicate Accounts', desc: 'Same CNIC across multiple accounts', count: stats.duplicateCnicCount },
    { type: 'Duplicate Degrees', desc: 'Multiple degree requests for same program', count: checks.filter(c => c.flags.some(f => f.toLowerCase().includes('another active degree'))).length },
    { type: 'Invalid Academic Data', desc: 'CGPA or study duration anomalies', count: checks.filter(c => c.flags.some(f => f.toLowerCase().includes('cgpa') || f.toLowerCase().includes('duration'))).length },
    { type: 'High Risk Applications', desc: 'Applications with a score below 40', count: checks.filter(c => c.severity === 'high').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Fraud Detection</h2>
        <p className="text-gray-400 mt-1">AI-powered fraud detection and security monitoring</p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#safeGrad)" strokeWidth="8" strokeDasharray={`${(stats.safetyScore / 100) * 251} 251`} strokeLinecap="round" />
              <defs>
                <linearGradient id="safeGrad" x1="0%" y1="0%" x2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-400">{stats.safetyScore}</span>
            </div>
          </div>
          <p className="font-semibold text-green-400">System Safety Score</p>
          <p className="text-xs text-gray-500 mt-1">Overall fraud prevention rating</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
        >
          <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-3xl font-bold text-red-400">{stats.unresolvedCount}</p>
          <p className="text-sm text-gray-400 mt-1">Unresolved Alerts</p>
          <div className="mt-3 text-xs text-gray-500">
            <span className="text-red-400">{stats.highCount} high</span> •{' '}
            <span className="text-yellow-400">{stats.mediumCount} medium</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
        >
          <Shield className="w-8 h-8 text-green-400 mb-3" />
          <p className="text-3xl font-bold text-green-400">{stats.resolvedCount}</p>
          <p className="text-sm text-gray-400 mt-1">Resolved Cases</p>
          <div className="mt-3 text-xs text-gray-500">All flagged cases reviewed and handled</div>
        </motion.div>
      </div>

      {/* Detection Types */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" /> Detection Categories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detectionTypes.map((dt, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dt.count > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  {dt.count > 0 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{dt.type}</p>
                  <p className="text-xs text-gray-500">{dt.desc}</p>
                </div>
              </div>
              <span className={`text-lg font-bold ${dt.count > 0 ? 'text-red-400' : 'text-green-400'}`}>{dt.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fraud Reports */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Recent Fraud Reports</h3>
        <div className="space-y-3">
          {reports.map(report => {
            const config = severityConfig[report.severity as keyof typeof severityConfig] || severityConfig.safe;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`border rounded-xl p-4 ${config.bg}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <config.icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
                    <div>
                      <p className="font-medium text-sm">{report.type}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{report.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Student: {report.studentName} • {new Date(report.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${config.bg} ${config.color}`}>
                      {report.severity}
                    </span>
                    {report.resolved && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-400/10 text-green-400 border border-green-400/20">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Fraud Score Scale */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Fraud Score Scale</h3>
        <div className="flex gap-4">
          <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">0-40</p>
            <p className="text-xs text-red-400 font-medium">High Risk</p>
          </div>
          <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">41-70</p>
            <p className="text-xs text-yellow-400 font-medium">Medium Risk</p>
          </div>
          <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">71-100</p>
            <p className="text-xs text-green-400 font-medium">Safe</p>
          </div>
        </div>
      </div>
    </div>
  );
}