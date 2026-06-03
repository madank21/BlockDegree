import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  User, Degree, VerificationResult, FraudReport, AuditLog, BlockchainTransaction
} from '../types';
import {
  USERS, INITIAL_DEGREES, INITIAL_VERIFICATIONS, INITIAL_FRAUD_REPORTS,
  INITIAL_AUDIT_LOGS, INITIAL_TRANSACTIONS, generateHash, generateTxHash
} from '../store';

interface AppState {
  currentUser: User | null;
  degrees: Degree[];
  verifications: VerificationResult[];
  fraudReports: FraudReport[];
  auditLogs: AuditLog[];
  transactions: BlockchainTransaction[];
  login: (email: string, password: string) => User | null;
  logout: () => void;
  issueDegree: (data: Omit<Degree, 'id' | 'degreeHash' | 'blockchainTxHash' | 'status' | 'issuedAt'>) => Degree;
  verifyDegreeByHash: (hash: string, employerName: string) => VerificationResult;
  revokeDegree: (degreeId: string) => void;
  addFraudReport: (report: FraudReport) => void;
  addVerification: (v: VerificationResult) => void;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  addTransaction: (tx: BlockchainTransaction) => void;
  users: User[];
}

const AppContext = createContext<AppState>({} as AppState);

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [degrees, setDegrees] = useState<Degree[]>(INITIAL_DEGREES);
  const [verifications, setVerifications] = useState<VerificationResult[]>(INITIAL_VERIFICATIONS);
  const [fraudReports, setFraudReports] = useState<FraudReport[]>(INITIAL_FRAUD_REPORTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>(INITIAL_TRANSACTIONS);

  const login = useCallback((email: string, _password: string): User | null => {
    const user = USERS.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      return user;
    }
    return null;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const issueDegree = useCallback((data: Omit<Degree, 'id' | 'degreeHash' | 'blockchainTxHash' | 'status' | 'issuedAt'>): Degree => {
    const hashInput = `${data.studentName}|${data.studentId}|${data.program}|${data.university}|${data.graduationDate}`;
    const degreeHash = generateHash(hashInput);
    const txHash = generateTxHash();
    const newDegree: Degree = {
      ...data,
      id: `deg-${Date.now()}`,
      degreeHash,
      blockchainTxHash: txHash,
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
    };
    setDegrees(prev => [...prev, newDegree]);

    const newTx: BlockchainTransaction = {
      hash: txHash,
      from: currentUser?.walletAddress || '0x0',
      to: '0xDegreeRegistry',
      action: 'issueDegree()',
      timestamp: new Date().toISOString(),
      blockNumber: 1007 + Math.floor(Math.random() * 100),
      gasUsed: 125000,
    };
    setTransactions(prev => [...prev, newTx]);

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'DEGREE_ISSUED',
      actor: data.university,
      role: 'university',
      target: `${data.studentName} - ${data.program}`,
      timestamp: new Date().toISOString(),
      txHash,
    };
    setAuditLogs(prev => [...prev, newLog]);

    return newDegree;
  }, [currentUser]);

  const verifyDegreeByHash = useCallback((hash: string, employerName: string): VerificationResult => {
    const degree = degrees.find(d => d.degreeHash === hash);
    let result: VerificationResult;
    if (!degree) {
      result = {
        id: `ver-${Date.now()}`,
        employer: employerName,
        degreeHash: hash,
        result: 'INVALID',
        timestamp: new Date().toISOString(),
      };
    } else if (degree.status === 'REVOKED') {
      result = {
        id: `ver-${Date.now()}`,
        employer: employerName,
        degreeHash: hash,
        result: 'REVOKED',
        timestamp: new Date().toISOString(),
        studentName: degree.studentName,
        program: degree.program,
        university: degree.university,
      };
    } else {
      result = {
        id: `ver-${Date.now()}`,
        employer: employerName,
        degreeHash: hash,
        result: 'VALID',
        timestamp: new Date().toISOString(),
        studentName: degree.studentName,
        program: degree.program,
        university: degree.university,
      };
    }

    setVerifications(prev => [...prev, result]);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'DEGREE_VERIFIED',
      actor: employerName,
      role: 'employer',
      target: degree ? `${degree.studentName} - ${degree.program}${degree.status === 'REVOKED' ? ' (REVOKED)' : ''}` : `Unknown hash`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [...prev, newLog]);
    return result;
  }, [degrees]);

  const revokeDegree = useCallback((degreeId: string) => {
    setDegrees(prev => prev.map(d => d.id === degreeId ? { ...d, status: 'REVOKED' as const } : d));
    const degree = degrees.find(d => d.id === degreeId);
    if (degree) {
      const txHash = generateTxHash();
      const newTx: BlockchainTransaction = {
        hash: txHash,
        from: currentUser?.walletAddress || '0x0',
        to: '0xDegreeRegistry',
        action: 'revokeDegree()',
        timestamp: new Date().toISOString(),
        blockNumber: 1007 + Math.floor(Math.random() * 100),
        gasUsed: 65000,
      };
      setTransactions(prev => [...prev, newTx]);

      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        action: 'DEGREE_REVOKED',
        actor: currentUser?.name || 'Unknown',
        role: currentUser?.role || 'admin',
        target: `${degree.studentName} - ${degree.program}`,
        timestamp: new Date().toISOString(),
        txHash,
      };
      setAuditLogs(prev => [...prev, newLog]);
    }
  }, [degrees, currentUser]);

  const addFraudReport = useCallback((report: FraudReport) => {
    setFraudReports(prev => [...prev, report]);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'FRAUD_DETECTED',
      actor: currentUser?.name || 'Unknown',
      role: currentUser?.role || 'employer',
      target: report.fileName,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [...prev, newLog]);
  }, [currentUser]);

  const addVerification = useCallback((v: VerificationResult) => {
    setVerifications(prev => [...prev, v]);
  }, []);

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id'>) => {
    setAuditLogs(prev => [...prev, { ...log, id: `log-${Date.now()}` }]);
  }, []);

  const addTransaction = useCallback((tx: BlockchainTransaction) => {
    setTransactions(prev => [...prev, tx]);
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser,
      degrees,
      verifications,
      fraudReports,
      auditLogs,
      transactions,
      login,
      logout,
      issueDegree,
      verifyDegreeByHash,
      revokeDegree,
      addFraudReport,
      addVerification,
      addAuditLog,
      addTransaction,
      users: USERS,
    }}>
      {children}
    </AppContext.Provider>
  );
}
