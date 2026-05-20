'use strict';

const nodemailer = require('nodemailer');

function buildTransporter() {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '')
    .replace(/\s/g, '')
    .replace(/^["']|["']$/g, '');

  if (emailUser && emailPass) {
    if (process.env.SMTP_HOST) {
      const port = Number(process.env.SMTP_PORT) || 587;
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: emailUser, pass: emailPass }
      });
    }

    const service = (process.env.EMAIL_SERVICE || 'gmail').toLowerCase();
    if (service === 'gmail') {
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: emailUser, pass: emailPass }
      });
    }

    return nodemailer.createTransport({
      service,
      auth: { user: emailUser, pass: emailPass }
    });
  }

  const host = process.env.SMTP_HOST;
  if (host) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: (process.env.SMTP_PASS || '').replace(/\s/g, '')
      }
    });
  }

  return null;
}

const transporter = buildTransporter();

/**
 * Sends a password reset email to the user.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} resetToken - The JWT reset token.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function sendPasswordResetEmail(toEmail, resetToken) {
  if (!transporter) {
    console.error(
      'Email not configured. Set EMAIL_USER and EMAIL_PASSWORD (or SMTP_*) in .env'
    );
    return false;
  }

  const port = process.env.PORT || 5000;
  const appUrl =
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    `http://localhost:${port}`;
  const resetLink = `${appUrl.replace(/\/$/, '')}/?token=${resetToken}`;
  const fromAddress = process.env.EMAIL_FROM || `"Potter's Duel" <${process.env.EMAIL_USER}>`;

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: 'Restore Your Magic - Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a14; color: #f4ecd8; padding: 20px; border-radius: 8px;">
        <h2 style="color: #c9a84c; text-align: center;">Potter's Duel</h2>
        <p>Greetings, Wizard,</p>
        <p>An owl arrived requesting a password reset for your account.</p>
        <p>Please click the link below to cast your new incantation and regain access:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #c9a84c; color: #0a0a14; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #888;">Or copy and paste this link: ${resetLink}</p>
        <p>If you did not request this, please ignore this owl.</p>
        <p>Magic awaits!</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Reset email sent: %s', info.messageId);
    return true;
  } catch (error) {
    if (error.code === 'EAUTH') {
      console.error(
        '[email] Gmail rejected login (535 BadCredentials).\n' +
          '  • Use an App Password, not your normal Gmail password:\n' +
          '    https://myaccount.google.com/apppasswords\n' +
          '  • EMAIL_USER must be the same Gmail account\n' +
          '  • Enable 2-Step Verification first, then create App Password for "Mail"\n' +
          '  • Put the 16-character password in .env as EMAIL_PASSWORD (spaces optional)'
      );
    } else {
      console.error('Error sending reset email:', error.message || error);
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('[email] DEV — reset link (email not sent):', resetLink);
    }

    return false;
  }
}

module.exports = {
  sendPasswordResetEmail
};
