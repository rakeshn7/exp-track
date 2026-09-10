const nodemailer = require('nodemailer');
require('dotenv').config();

const GMAIL_USER = (process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.EMAIL_PASS || '').trim();
const EMAIL_FROM = process.env.EMAIL_FROM || (GMAIL_USER ? `EXPTRACK Security <${GMAIL_USER}>` : 'EXPTRACK <noreply@exptrack.com>');

let transporter = null;

function isEmailConfigured() {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (transporter) return transporter;

  if (!isEmailConfigured()) {
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });

  return transporter;
}

/**
 * Verify transporter connection on startup.
 */
async function verifyTransporter() {
  if (!isEmailConfigured()) {
    console.log('ℹ Email service: GMAIL_USER / GMAIL_APP_PASSWORD not set in environment.');
    return false;
  }

  try {
    const t = getTransporter();
    await t.verify();
    console.log(`✓ Email service verified: connected to Gmail SMTP as ${GMAIL_USER}`);
    return true;
  } catch (err) {
    console.warn(`! Email service warning: Gmail SMTP verification failed (${err.message}). Check GMAIL_USER and GMAIL_APP_PASSWORD.`);
    return false;
  }
}

/**
 * Generate a responsive, modern HTML email template for EXPTRACK OTP.
 */
function buildOtpEmailHtml({ recipientName, otp }) {
  const name = recipientName ? recipientName.split(' ')[0] : 'there';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your EXPTRACK Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header with Brand -->
          <tr>
            <td style="padding: 32px 32px 20px; background: linear-gradient(135deg, #1e1b4b 0%, #111827 100%); border-bottom: 1px solid #1f2937; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); line-height: 44px; font-size: 22px; color: #ffffff; margin-bottom: 12px;">§</div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">EXPTRACK</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #9ca3af;">Smart Expense Tracking & Financial Clarity</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #f9fafb;">Password Reset Code</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
                Hello <strong>${name}</strong>,<br>
                We received a request to reset your password. Use the 6-digit verification code below:
              </p>

              <!-- OTP Display Box -->
              <div style="background-color: #0f172a; border: 2px dashed #4f46e5; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #818cf8; display: block; margin-bottom: 8px;">Your One-Time Password (OTP)</span>
                <div style="font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4); padding-left: 10px;">
                  ${otp}
                </div>
                <p style="margin: 10px 0 0; font-size: 12px; color: #94a3b8;">
                  ⏱ Valid for <strong>10 minutes</strong>. Single use only.
                </p>
              </div>

              <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; border-radius: 6px; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #c7d2fe; line-height: 1.5;">
                  <strong>Security Note:</strong> Never share this code with anyone. EXPTRACK will never ask for your verification code.
                </p>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                If you did not request a password reset, ignore this email. Your existing password remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0d131f; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #4b5563;">
                EXPTRACK • Secure Monthly Income & Expense Ledger
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send 6-digit OTP to user's registered email address.
 * Security constraint: NEVER log the raw OTP.
 * 
 * @param {string} toEmail
 * @param {string} recipientName
 * @param {string} otp
 * @returns {Promise<{ sent: boolean, reason?: string, messageId?: string, error?: string }>}
 */
async function sendOtpEmail(toEmail, recipientName, otp) {
  if (!isEmailConfigured()) {
    console.warn(`! [EMAIL] GMAIL_USER or GMAIL_APP_PASSWORD not configured. Cannot send email to ${toEmail}.`);
    return {
      sent: false,
      reason: 'unconfigured',
      message: 'Gmail credentials not configured in environment.'
    };
  }

  const t = getTransporter();
  const mailOptions = {
    from: EMAIL_FROM,
    to: toEmail,
    subject: `EXPTRACK: Your Password Reset Code is ${otp}`,
    text: `Your EXPTRACK password reset code is: ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: buildOtpEmailHtml({ recipientName, otp })
  };

  try {
    const info = await t.sendMail(mailOptions);
    console.log(`✓ [OTP SENT] Sent reset OTP email to ${toEmail}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`! [EMAIL FAILED] Could not deliver reset email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  isEmailConfigured,
  verifyTransporter,
  sendOtpEmail
};
