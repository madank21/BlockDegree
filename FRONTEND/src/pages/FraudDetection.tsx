// FRONTEND/src/pages/FraudDetection.tsx
//
// FIXES APPLIED:
//   [1] api.get('/fraud/reports') → fraudApi.list()    — correct named export, correct path
//   [2] api.get('/fraud/stats')   → fraudApi.stats()   — correct named export
//   [3] api.get('/fraud/checks')  → fraudApi.checks()  — correct named export
//   [4] Removed default `api` import — all calls now use named fraudApi export
//   [5] FraudStats interface updated: resolved/unresolved computed from
//       resolvedCount/unresolvedCount (backend field names confirmed)
//   [6] FraudCheck interface: score → fraudScore, severity maps now match backend shape
//   [7] FraudReport interface: severity made optional with fallback to riskLevel
//   [8] severityConfig extended with 'low' key (backend returns 'low' as a severity)
//   [9] graceful handling when reports/checks come back as non-arrays
//

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fraudApi } from '../api/api';
import { AlertTriangle, Shield, CheckCircle2, XCircle, Activity } from 'lucide-react';

// ── Local interfaces (stricter than global types for this page) ───────────────

interface FraudReport {
  id: string;
  type?: string;
  description?: string;
  // [FIX 7] Backend uses either `severity` (old) or `riskLevel` (new) — support both
  severity?:  'high' | 'medium' | 'low' | 'safe';
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  studentName?: string;
  timestamp?:   string;
  createdAt?:   string;
  resolved?:    boolean;
  isFraudulent?: boolean;
  fraudScore?:  number;
  findings?:    string[];
}

// [FIX 5] Field names confirmed from fraudController.getStats
interface FraudStats {
  unresolvedCount:    number;
  resolvedCount:      number;
  highCount:          number;
  mediumCount:        number;
  lowCount:           number;
  duplicateCnicCount: number;
  fraudulentDocCount: number;
  safetyScore:        number;
  totalApplications:  number;
}

// [FIX 6] Backend fraudDetectionService.runBulkFraudChecks shape
interface FraudCheck {
  applicationId: string;
  studentName:   string;
  // Backend returns fraudScore (not score)
  fraudScore:    number;
  score?:        number; // kept as fallback
  severity:      'high' | 'medium' | 'safe';
  flags:         string[];
}

// [FIX 8] Added 'low' key — backend can return 'low' as severity
const severityConfig: Record<string, { color: string; bg: string; icon: typeof XCircle }> = {
  high:   { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',       icon: XCircle },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: AlertTriangle },
  low:    { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', icon: AlertTriangle },
  safe:   { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',   icon: CheckCircle2 },
};

// Map riskLevel strings (UPPER_CASE from new backend) → severityConfig keys
function riskLevelToSeverity(riskLevel?: string, severity?: string): string {
  const key = (riskLevel || severity || 'safe').toLowerCase();
  if (key === 'critical') return 'high';
  if (key === 'minimal')  return 'safe';
  return key in severityConfig ? key : 'safe';
}

export default function FraudDetection() {
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [stats,   setStats]   = useState<FraudStats | null>(null);
  const [checks,  setChecks]  = useState<FraudCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // [FIX 1-3] Use fraudApi named exports (correct paths)
      const [reportsRaw, statsData, checksRaw] = await Promise.all([
        fraudApi.list(),
        fraudApi.stats(),
        fraudApi.checks(),
      ]);

      // [FIX 9] Graceful handling — backend returns arrays directly (no envelope)
      setReports(Array.isArray(reportsRaw) ? reportsRaw : []);
      setStats(statsData as FraudStats);
      setChecks(Array.isArray(checksRaw) ? checksRaw : []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fraud data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="text-center">
        <Shield className="w-10 h-10 mx-auto mb-3 animate-pulse" />
        <p>Loading fraud detection data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-red-400">{error}</p>
      <button
        onClick={fetchData}
        className="mt-3 px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition text-sm"
      >
        Retry
      </button>
    </div>
  );

  if (!stats) return null;

  // [FIX 6] Use fraudScore with fallback to score
  const safeChecks = checks.map(c => ({
    ...c,
    fraudScore: c.fraudScore ?? c.score ?? 0,
  }));

  const detectionTypes = [
    {
      type:  'Fake Documents',
      desc:  'Documents flagged by validation checks',
      count: stats.fraudulentDocCount,
    },
    {
      type:  'Data Mismatch',
      desc:  'Application data needs admin review',
      count: safeChecks.filter(c => c.severity !== 'safe').length,
    },
    {
      type:  'Duplicate Accounts',
      desc:  'Same CNIC across multiple accounts',
      count: stats.duplicateCnicCount,
    },
    {
      type:  'Duplicate Degrees',
      desc:  'Multiple degree requests for same program',
      count: safeChecks.filter(c =>
        c.flags?.some(f => f.toLowerCase().includes('another active degree'))
      ).length,
    },
    {
      type:  'Invalid Academic Data',
      desc:  'CGPA or study duration anomalies',
      count: safeChecks.filter(c =>
        c.flags?.some(f => /cgpa|duration/i.test(f))
      ).length,
    },
    {
      type:  'High Risk Applications',
      desc:  'Applications with score ≥ 0.6',
      count: safeChecks.filter(c => c.severity === 'high').length,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Fraud Detection</h2>
        <p className="text-gray-400 mt-1">AI-powered fraud detection and security monitoring</p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Safety Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none" stroke="url(#safeGrad)" strokeWidth="8"
                strokeDasharray={`${(stats.safetyScore / 100) * 251} 251`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="safeGrad" x1="0%" y1="0%" x2="100%">
                  <stop offset="0%"   stopColor="#22c55e" />
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

        {/* Unresolved alerts */}
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
            <span className="text-red-400">{stats.highCount} high</span>{' '}•{' '}
            <span className="text-yellow-400">{stats.mediumCount} medium</span>{' '}•{' '}
            <span className="text-orange-400">{stats.lowCount} low</span>
          </div>
        </motion.div>

        {/* Resolved */}
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

      {/* Detection Categories */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" /> Detection Categories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detectionTypes.map((dt, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  dt.count > 0 ? 'bg-red-500/10' : 'bg-green-500/10'
                }`}>
                  {dt.count > 0
                    ? <AlertTriangle className="w-4 h-4 text-red-400" />
                    : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{dt.type}</p>
                  <p className="text-xs text-gray-500">{dt.desc}</p>
                </div>
              </div>
              <span className={`text-lg font-bold ${dt.count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {dt.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Fraud Reports */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Recent Fraud Reports</h3>

        {reports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No fraud reports found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              // [FIX 7] Normalise severity from either field
              const severityKey = riskLevelToSeverity(report.riskLevel, report.severity);
              const config = severityConfig[severityKey] || severityConfig.safe;
              const displayTime = report.timestamp || report.createdAt;

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
                        <p className="font-medium text-sm">{report.type || 'Fraud Alert'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {report.description || (report.findings ? report.findings[0] : '—')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Student: {report.studentName || 'Unknown'}
                          {displayTime && ` • ${new Date(displayTime).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${config.bg} ${config.color}`}>
                        {severityKey}
                      </span>
                      {(report.resolved || report.isFraudulent === false) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-400/10 text-green-400 border border-green-400/20">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fraud score bar */}
                  {typeof report.fraudScore === 'number' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 uppercase">Fraud Score</span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {(report.fraudScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${
                            report.fraudScore >= 0.8 ? 'bg-red-500' :
                            report.fraudScore >= 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, report.fraudScore * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fraud Score Scale */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Fraud Score Scale</h3>
        <div className="flex gap-4">
          <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">0–0.2</p>
            <p className="text-xs text-green-400 font-medium">Minimal Risk</p>
          </div>
          <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">0.2–0.4</p>
            <p className="text-xs text-blue-400 font-medium">Low Risk</p>
          </div>
          <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">0.4–0.6</p>
            <p className="text-xs text-yellow-400 font-medium">Medium Risk</p>
          </div>
          <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">0.6–0.8</p>
            <p className="text-xs text-orange-400 font-medium">High Risk</p>
          </div>
          <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">0.8–1.0</p>
            <p className="text-xs text-red-400 font-medium">Critical</p>
          </div>
        </div>
      </div>
    </div>
  );
}