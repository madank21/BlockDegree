const nodemailer = require('nodemailer');
const { logger } = require('../src/utils/logger');

class NotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.from = process.env.EMAIL_FROM || 'BlockDegree <noreply@blockdegree.com>';
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.verifyTransporter();
  }

  async verifyTransporter() {
    try {
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.verify();
        logger.info('✅ Email transporter ready');
      }
    } catch (error) {
      logger.warn('⚠️ Email transporter not configured:', error.message);
    }
  }

  // ─── Send Email ───────────────────────────────────────────────────────────
  async sendEmail(to, subject, html, text = '') {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📧 [DEV] Email to ${to}: ${subject}`);
        return { success: true, messageId: 'dev-mock-id' };
      }

      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: text || subject,
        html,
      });

      logger.info(`Email sent: ${info.messageId} to ${to}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email send error:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  // ─── Email Templates ──────────────────────────────────────────────────────
  
  // Welcome / Email Verification
  async sendWelcomeEmail(user, verificationToken) {
    const verifyUrl = `${this.baseUrl}/verify-email?token=${verificationToken}`;
    const html = this.baseTemplate(`
      <h2>Welcome to BlockDegree, ${user.first_name}! 🎓</h2>
      <p>Thank you for registering. Please verify your email address to get started.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
    `);

    return this.sendEmail(user.email, 'Welcome to BlockDegree - Verify Your Email', html);
  }

  // Password Reset
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
    const html = this.baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>Hi ${user.first_name}, we received a request to reset your BlockDegree password.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #DC2626; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `);

    return this.sendEmail(user.email, 'BlockDegree - Password Reset Request', html);
  }

  // Degree Issued
  async sendDegreeIssuedEmail(graduate, degree) {
    const verifyUrl = `${this.baseUrl}/verify/${degree.id}`;
    const html = this.baseTemplate(`
      <h2>Your Degree Has Been Issued! 🎉</h2>
      <p>Congratulations ${degree.student_name}!</p>
      <p>Your degree has been successfully recorded on the blockchain.</p>
      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Degree:</strong> ${degree.degree_title}</p>
        <p><strong>Field of Study:</strong> ${degree.field_of_study}</p>
        <p><strong>Graduation Date:</strong> ${new Date(degree.graduation_date).toLocaleDateString()}</p>
        <p><strong>Certificate Number:</strong> ${degree.certificate_number}</p>
        <p><strong>Degree Hash:</strong> <code style="font-size: 12px;">${degree.degree_hash}</code></p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background: #059669; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View & Share Your Degree
        </a>
      </div>
    `);

    return this.sendEmail(
      graduate.email,
      `🎓 Your ${degree.degree_title} Degree Has Been Issued - BlockDegree`,
      html
    );
  }

  // Verification Complete
  async sendVerificationCompleteEmail(email, verification, degree) {
    const status = verification.status;
    const statusColor = status === 'verified' ? '#059669' : '#DC2626';
    const statusIcon = status === 'verified' ? '✅' : '❌';

    const html = this.baseTemplate(`
      <h2>Degree Verification ${status === 'verified' ? 'Successful' : 'Failed'} ${statusIcon}</h2>
      <p>The degree verification you requested has been completed.</p>
      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Verification Code:</strong> ${verification.verification_code}</p>
        <p><strong>Degree:</strong> ${degree.degree_title}</p>
        <p><strong>Student:</strong> ${degree.student_name}</p>
        <p><strong>Certificate Number:</strong> ${degree.certificate_number}</p>
        <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status.toUpperCase()}</span></p>
        <p><strong>Blockchain Verified:</strong> ${verification.blockchain_verified ? '✅ Yes' : '❌ No'}</p>
      </div>
    `);

    return this.sendEmail(
      email,
      `BlockDegree - Verification ${status === 'verified' ? 'Successful' : 'Failed'}: ${degree.student_name}`,
      html
    );
  }

  // Degree Revoked
  async sendDegreeRevokedEmail(graduate, degree, reason) {
    const html = this.baseTemplate(`
      <h2 style="color: #DC2626;">⚠️ Degree Revocation Notice</h2>
      <p>Dear ${degree.student_name},</p>
      <p>We are writing to inform you that the following degree credential has been revoked.</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Degree:</strong> ${degree.degree_title}</p>
        <p><strong>Certificate Number:</strong> ${degree.certificate_number}</p>
        <p><strong>Revocation Reason:</strong> ${reason}</p>
        <p><strong>Revoked At:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p>If you believe this is an error, please contact your institution immediately.</p>
    `);

    return this.sendEmail(
      graduate.email,
      '⚠️ BlockDegree - Important Notice: Degree Revoked',
      html
    );
  }

  // ─── Base Template ─────────────────────────────────────────────────────────
  baseTemplate(content) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F9FAFB;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px;">
            <h1 style="color: #4F46E5; margin: 0; font-size: 28px;">🎓 BlockDegree</h1>
            <p style="color: #6B7280; margin: 5px 0 0;">Blockchain-Verified Academic Credentials</p>
          </div>
          
          <!-- Content -->
          <div style="color: #1F2937; line-height: 1.6;">
            ${content}
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px;">
            <p>© ${new Date().getFullYear()} BlockDegree. All rights reserved.</p>
            <p>This email was sent automatically. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

const notificationService = new NotificationService();
module.exports = notificationService;