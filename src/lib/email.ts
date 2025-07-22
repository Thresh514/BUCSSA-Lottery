import nodemailer from 'nodemailer';
import { env } from './env';

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

// 发送验证码邮件
export async function sendVerificationCode(
  email: string, 
  verificationCode: string
): Promise<boolean> {
  try {
    const mailOptions = {
      from: env.EMAIL_USER,
      to: email,
      subject: '缩圈抽奖系统 - 登录验证码',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">缩圈抽奖系统</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; margin-bottom: 10px;">您的登录验证码为：</p>
            <h3 style="color: #007bff; font-size: 32px; text-align: center; margin: 20px 0; letter-spacing: 5px;">
              ${verificationCode}
            </h3>
            <p style="color: #666; font-size: 14px;">验证码有效期为5分钟，请及时使用。</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            如果您没有请求此验证码，请忽略此邮件。
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('发送邮件失败:', error);
    return false;
  }
} 