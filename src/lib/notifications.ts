import emailjs from '@emailjs/browser';

// Initialize EmailJS (do this once on app load)
export function initEmailJS() {
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  if (publicKey) {
    emailjs.init(publicKey);
  }
}

/**
 * Send degree issued notification to student
 */
export async function sendDegreeIssuedEmail(
  studentEmail: string,
  studentName: string,
  degreeId: string,
  degreeTitle: string,
  program: string,
  blockchainHash?: string
): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

    if (!serviceId || !templateId) {
      console.warn('EmailJS configuration missing');
      return false;
    }

    const response = await emailjs.send(serviceId, templateId, {
      to_email: studentEmail,
      to_name: studentName,
      degree_id: degreeId,
      degree_title: degreeTitle,
      program: program,
      blockchain_hash: blockchainHash || 'Pending',
      verify_url: `${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/verify/${degreeId}`,
      message: `Your degree "${degreeTitle}" has been issued successfully!`,
    });

    console.log('Degree issued email sent:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send degree issued email:', error);
    return false;
  }
}

/**
 * Send verification approval notification
 */
export async function sendVerificationApprovalEmail(
  studentEmail: string,
  studentName: string
): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = 'template_verification_approved';

    if (!serviceId) {
      console.warn('EmailJS service ID missing');
      return false;
    }

    const response = await emailjs.send(serviceId, templateId, {
      to_email: studentEmail,
      to_name: studentName,
      message: 'Your identity verification has been approved. You can now apply for degrees.',
    });

    console.log('Verification approved email sent:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send verification approval email:', error);
    return false;
  }
}

/**
 * Send face verification failed notification
 */
export async function sendFaceVerificationFailedEmail(
  studentEmail: string,
  studentName: string,
  reason: string
): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = 'template_verification_failed';

    if (!serviceId) return false;

    const response = await emailjs.send(serviceId, templateId, {
      to_email: studentEmail,
      to_name: studentName,
      reason: reason,
      message: `Your face verification failed. Reason: ${reason}. Please try again.`,
    });

    console.log('Face verification failed email sent:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send face verification failed email:', error);
    return false;
  }
}

/**
 * Send document upload confirmation
 */
export async function sendDocumentUploadConfirmationEmail(
  studentEmail: string,
  studentName: string,
  documentTypes: string[]
): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = 'template_document_uploaded';

    if (!serviceId) return false;

    const response = await emailjs.send(serviceId, templateId, {
      to_email: studentEmail,
      to_name: studentName,
      documents: documentTypes.join(', '),
      message: `Your documents (${documentTypes.join(', ')}) have been received and are being processed.`,
    });

    console.log('Document upload confirmation email sent:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send document upload email:', error);
    return false;
  }
}

/**
 * Send degree application submitted notification
 */
export async function sendDegreeApplicationSubmittedEmail(
  studentEmail: string,
  studentName: string,
  degreeTitle: string,
  program: string
): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = 'template_degree_applied';

    if (!serviceId) return false;

    const response = await emailjs.send(serviceId, templateId, {
      to_email: studentEmail,
      to_name: studentName,
      degree_title: degreeTitle,
      program: program,
      message: `Your application for ${degreeTitle} (${program}) has been submitted for review.`,
    });

    console.log('Degree application submitted email sent:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send degree application email:', error);
    return false;
  }
}

/**
 * Send admin notification for verification required
 */
export async function sendAdminVerificationRequiredEmail(
  adminEmail: string,
  studentName: string,
  studentId: string,
  reason: string
): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = 'template_admin_verification_required';

    if (!serviceId) return false;

    const response = await emailjs.send(serviceId, templateId, {
      to_email: adminEmail,
      admin_name: 'Administrator',
      student_name: studentName,
      student_id: studentId,
      reason: reason,
      dashboard_url: `${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/students`,
    });

    console.log('Admin verification email sent:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send admin verification email:', error);
    return false;
  }
}

/**
 * Send fraud alert email
 */
export async function sendFraudAlertEmail(
  adminEmail: string,
  studentName: string,
  fraudType: string,
  details: string
): Promise<boolean> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = 'template_fraud_alert';

    if (!serviceId) return false;

    const response = await emailjs.send(serviceId, templateId, {
      to_email: adminEmail,
      admin_name: 'Administrator',
      student_name: studentName,
      fraud_type: fraudType,
      details: details,
      dashboard_url: `${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/fraud`,
    });

    console.log('Fraud alert email sent:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send fraud alert email:', error);
    return false;
  }
}
