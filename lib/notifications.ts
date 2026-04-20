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
 * Gửi Email chứa mã xác thực tài khoản mới
 */
export async function sendVerificationEmail(email: string, code: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #fcfcfc; border: 1px solid #eee; border-radius: 16px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0891b2; margin: 0; font-size: 28px; letter-spacing: -0.5px;">OptiRoute AI</h1>
        <p style="color: #666; font-size: 14px; margin-top: 5px;">Xác thực tài khoản của bạn</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); text-align: center;">
        <h2 style="color: #111; font-size: 20px; margin-top: 0;">Chào mừng bạn đến với OptiRoute!</h2>
        <p style="line-height: 1.6; color: #555;">Cảm ơn bạn đã đăng ký. Vui lòng sử dụng mã OTP dưới đây để hoàn tất việc xác thực tài khoản:</p>
        
        <div style="background: #f0f9ff; padding: 24px; text-align: center; border-radius: 16px; margin: 24px 0; border: 1px dashed #bae6fd;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 0.3em; color: #0369a1;">${code}</span>
        </div>
        
        <p style="font-size: 13px; color: #888; margin-top: 25px;">
          Mã này sẽ hết hạn sau <strong>10 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">
        <p>&copy; 2026 OptiRoute AI. All rights reserved.</p>
        <p>Đây là hệ thống tự động, vui lòng không phản hồi email này.</p>
      </div>
    </div>
  `;

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await transporter.sendMail({
        from: `"OptiRoute AI" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `[OptiRoute] Mã xác thực tài khoản của bạn: ${code}`,
        html: html,
      });
      return;
    } catch (error) {
      console.error("Lỗi gửi Email Verification qua Gmail:", error);
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'OptiRoute AI <hello@optiroute.ai>',
        to: email,
        subject: `[OptiRoute] Mã xác thực tài khoản của bạn: ${code}`,
        html: html,
      });
      return;
    } catch (error) {
      console.error("Lỗi gửi Email Verification qua Resend:", error);
    }
  }

  console.warn("⚠️ Chưa cấu hình Email. Mã OTP hiển thị tại đây:");
  console.log(`[Verification OTP] To: ${email}, Code: ${code}`);
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


/**
 * Gửi Email khôi phục mật khẩu
 */
export async function sendResetPasswordEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #fcfcfc; border: 1px solid #eee; border-radius: 16px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0891b2; margin: 0; font-size: 28px; letter-spacing: -0.5px;">OptiRoute AI</h1>
        <p style="color: #666; font-size: 14px; margin-top: 5px;">Hệ thống Lịch trình thông minh</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
        <h2 style="color: #111; font-size: 20px; margin-top: 0;">Khôi phục mật khẩu</h2>
        <p style="line-height: 1.6; color: #555;">Chào bạn,</p>
        <p style="line-height: 1.6; color: #555;">Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu mới:</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetLink}" style="background-color: #0891b2; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s ease;">
            Thiết lập lại mật khẩu
          </a>
        </div>
        
        <p style="font-size: 13px; color: #888; margin-top: 25px;">
          Đường dẫn này sẽ hết hạn sau <strong>1 giờ</strong>. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này, mật khẩu của bạn vẫn sẽ được giữ nguyên.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">
        <p>&copy; 2026 OptiRoute AI. All rights reserved.</p>
        <p>Đây là hệ thống tự động, vui lòng không phản hồi email này.</p>
      </div>
    </div>
  `;

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await transporter.sendMail({
        from: `"Hỗ trợ OptiRoute AI" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "[OptiRoute AI] Yêu cầu khôi phục mật khẩu",
        html: html,
      });
      return;
    } catch (error) {
      console.error("Lỗi gửi Email Reset qua Gmail:", error);
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'OptiRoute AI <support@optiroute.ai>',
        to: email,
        subject: "[OptiRoute AI] Yêu cầu khôi phục mật khẩu",
        html: html,
      });
      return;
    } catch (error) {
      console.error("Lỗi gửi Email Reset qua Resend:", error);
    }
  }

  console.warn("⚠️ Chưa cấu hình Email. Reset Link hiển thị tại đây:");
  console.log(`[Reset Password Link] To: ${email}, Link: ${resetLink}`);
}
