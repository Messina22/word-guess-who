import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:5173";
const FROM_EMAIL = process.env.FROM_EMAIL || "Word Guess Who <noreply@wordguesswho.com>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/** Escape HTML special characters to prevent injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Send a password reset email (or log to console in dev) */
export async function sendPasswordResetEmail(
  to: string,
  token: string,
  instructorName: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  if (!resend) {
    console.log("──────────────────────────────────────────────");
    console.log("Password reset requested (no RESEND_API_KEY set)");
    console.log(`  Email: ${to}`);
    console.log(`  Name:  ${instructorName}`);
    console.log(`  URL:   ${resetUrl}`);
    console.log("──────────────────────────────────────────────");
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your Word Guess Who password",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">Reset Your Password</h2>
        <p>Hi ${escapeHtml(instructorName)},</p>
        <p>We received a request to reset your Word Guess Who password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.</p>
        <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${resetUrl}</p>
      </div>
    `,
  });
}
