import { Resend } from 'resend';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Initialize Resend (Email - Optional)
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Nodemailer (Gmail - Free & Real)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Initialize Twilio (SMS)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Sinh mã OTP ngẫu nhiên 6 chữ số
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Gửi Email chứa mã xác thực
 */
export async function send2FAEmail(email: string, code: string) {
  // Ưu tiên dùng GMAIL (Miễn phí & Gửi được cho người lạ)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await transporter.sendMail({
        from: `"Bảo mật OptiRoute AI" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `[OptiRoute] Mã xác thực bảo mật tài khoản: ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #6366f1; text-align: center;">Bảo mật OptiRoute AI</h2>
            <p>Chào bạn,</p>
            <p>Bạn vừa yêu cầu kích hoạt bảo mật 2 lớp cho tài khoản của mình. Vui lòng sử dụng mã dưới đây để tiếp tục:</p>
            <div style="background: #f8fafc; padding: 24px; text-align: center; border-radius: 12px; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #1e1b4b;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">Mã này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 OptiRoute AI - Smart Itinerary Systems</p>
          </div>
        `,
      });
      return;
    } catch (error) {
      console.error("Lỗi gửi Email qua Gmail:", error);
    }
  }

  // Phương thức dự phòng: Resend (Yêu cầu Domain để gửi cho người lạ)
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'OptiRoute AI <security@optiroute.ai>',
        to: email,
        subject: `[OptiRoute] Mã xác thực bảo mật tài khoản: ${code}`,
        html: `...`, // (Giữ nguyên giao diện HTML cũ)
      });
      return;
    } catch (error) {
      console.error("Lỗi gửi Email qua Resend:", error);
    }
  }

  // Cuối cùng: In ra Console nếu không có cấu hình nào
  console.warn("⚠️ Chưa cấu hình Email gửi đi. Mã OTP hiển thị tại đây:");
  console.log(`[2FA OTP] To: ${email}, Code: ${code}`);
}

/**
 * Gửi SMS chứa mã xác thực (Sử dụng Twilio)
 */
export async function send2FASMS(phone: string, code: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn("⚠️ Cấu hình Twilio chưa đầy đủ. Mã OTP hiển thị tại console.");
    console.log(`[SMS OTP] To: ${phone}, Code: ${code}`);
    return;
  }

  try {
    await twilioClient.messages.create({
      body: `[OptiRoute AI] Ma xac thuc 2FA cua ban la: ${code}. Ma het han sau 10 phut.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
  } catch (error) {
    console.error("Lỗi gửi SMS (Twilio):", error);
    throw new Error("Không thể gửi tin nhắn xác thực. Vui lòng kiểm tra lại số điện thoại.");
  }
}

