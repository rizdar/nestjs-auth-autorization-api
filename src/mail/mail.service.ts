import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendPasswordReset(
    toEmail: string,
    toName: string,
    resetToken: string,
  ): Promise<void> {
    const from = this.configService.get<string>('mail.from');
    const resetUrl = `http://localhost:3000/auth/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi <strong>${toName}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a 
            href="${resetUrl}" 
            style="
              background-color: #4F46E5;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-size: 16px;
            "
          >
            Reset Password
          </a>
        </div>
        <p>Or copy this link to your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          If you did not request a password reset, please ignore this email.
          Your password will remain unchanged.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Password Reset Request',
        html,
      });
      this.logger.log(
        `Password reset email sent to: ${toEmail}`,
        'MailService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to: ${toEmail}`,
        error.message,
        'MailService',
      );
      throw error;
    }
  }

  async sendEmailVerification(
    toEmail: string,
    toName: string,
    verificationToken: string,
  ): Promise<void> {
    const from = this.configService.get<string>('mail.from');
    const verifyUrl = `http://localhost:3000/auth/verify-email?token=${verificationToken}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify Your Email</h2>
      <p>Hi <strong>${toName}</strong>,</p>
      <p>Thanks for registering! Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a 
          href="${verifyUrl}" 
          style="
            background-color: #4F46E5;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
          "
        >
          Verify Email
        </a>
      </div>
      <p>Or copy this link to your browser:</p>
      <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
      <p><strong>This link will expire in 24 hours.</strong></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px;">
        If you did not create an account, please ignore this email.
      </p>
    </div>
  `;

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Verify Your Email Address',
        html,
      });
      this.logger.log(`Verification email sent to: ${toEmail}`, 'MailService');
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to: ${toEmail}`,
        error.message,
        'MailService',
      );
      throw error;
    }
  }
}
