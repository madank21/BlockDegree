import { DegreeApplication, FraudLevel, User } from '../types';

export interface FraudCheckResult {
  score: number;
  flags: string[];
  severity: FraudLevel;
}

export function runFraudChecks(
  user: User | undefined,
  allUsers: User[],
  application: Pick<DegreeApplication, 'studentId' | 'program' | 'cgpa' | 'admissionYear' | 'graduationYear' | 'status'>,
  allApplications: DegreeApplication[] = [],
): FraudCheckResult {
  const flags: string[] = [];
  let deductions = 0;

  if (!user) {
    return {
      score: 0,
      flags: ['Student record is missing.'],
      severity: 'high',
    };
  }

  if (user.cnicNumber) {
    const duplicateCnicCount = allUsers.filter(
      candidate => candidate.id !== user.id && candidate.cnicNumber === user.cnicNumber,
    ).length;

    if (duplicateCnicCount > 0) {
      flags.push(`CNIC is linked to ${duplicateCnicCount} other account(s).`);
      deductions += 40;
    }
  }

  const duplicateDegree = allApplications.some(
    candidate =>
      candidate.studentId === application.studentId &&
      candidate.program === application.program &&
      candidate.status !== 'revoked',
  );

  if (duplicateDegree) {
    flags.push('Another active degree application exists for this program.');
    deductions += 20;
  }

  if (application.cgpa > 4 || application.cgpa < 0) {
    flags.push(`CGPA ${application.cgpa} is outside the valid 0.0-4.0 range.`);
    deductions += 35;
  } else if (application.cgpa >= 3.99) {
    flags.push(`CGPA ${application.cgpa} is unusually high and should be reviewed.`);
    deductions += 10;
  }

  const studyDuration = application.graduationYear - application.admissionYear;
  if (studyDuration < 2 || studyDuration > 8) {
    flags.push(`Study duration of ${studyDuration} years is unusual.`);
    deductions += 15;
  }

  if (user.role === 'student' && !/^[a-zA-Z]+[\w.-]*\.\d{4,10}@iqra\.edu\.pk$/i.test(user.email)) {
    flags.push('Student email does not match the expected university pattern.');
    deductions += 10;
  }

  const documents = user.documents || [];
  const missingRequiredDocs = ['cnic', 'marksheet', 'certificate'].filter(
    type => !documents.some(doc => doc.type === type && doc.ocrStatus === 'verified'),
  );

  if (missingRequiredDocs.length > 0) {
    flags.push(`Missing verified documents: ${missingRequiredDocs.join(', ')}.`);
    deductions += missingRequiredDocs.length * 10;
  }

  const forgedDocs = documents.filter(doc => doc.yoloStatus === 'fraudulent');
  if (forgedDocs.length > 0) {
    flags.push(`${forgedDocs.length} document(s) were flagged as fraudulent.`);
    deductions += 35;
  }

  const score = Math.max(0, 100 - deductions);
  const severity: FraudLevel = score < 40 ? 'high' : score < 71 ? 'medium' : 'safe';

  return {
    score,
    flags: flags.length > 0 ? flags : ['No fraud indicators detected.'],
    severity,
  };
}
