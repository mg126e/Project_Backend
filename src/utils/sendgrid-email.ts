/**
 * SendGrid Email Service for Deno
 * 
 * Provides email sending functionality using SendGrid's REST API.
 * This is a Deno-compatible implementation (not using the Node.js library).
 * 
 */

import "jsr:@std/dotenv/load";
import { load } from "jsr:@std/dotenv";

/**
 * Configuration for SendGrid email service
 */
export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

/**
 * Email message structure
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
  fromName?: string;
}

/**
 * SendGrid API response
 */
interface SendGridResponse {
  statusCode: number;
  body: unknown;
}

/**
 * SendGrid Email Service Class
 * 
 * Usage:
 * ```typescript
 * const emailService = new SendGridEmail({
 *   apiKey: Deno.env.get("SENDGRID_API_KEY")!,
 *   fromEmail: "noreply@example.com",
 *   fromName: "Your App Name"
 * });
 * 
 * await emailService.sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   text: "Welcome to our app",
 *   html: "<h1>Welcome to our app</h1>"
 * });
 * ```
 */
export class SendGridEmail {
  private apiKey: string;
  private fromEmail: string;
  private fromName?: string;
  private readonly apiUrl = "https://api.sendgrid.com/v3/mail/send";

  constructor(config: SendGridConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  /**
   * Send an email using SendGrid API
   * 
   * @param message Email message to send
   * @returns Promise that resolves when email is sent successfully
   * @throws Error if the email fails to send
   */
  async sendEmail(message: EmailMessage): Promise<void> {
    const fromEmail = message.from || this.fromEmail;
    const fromName = message.fromName || this.fromName;

    const payload = {
      personalizations: [
        {
          to: [{ email: message.to }],
          subject: message.subject,
        },
      ],
      from: {
        email: fromEmail,
        ...(fromName && { name: fromName }),
      },
      content: [
        {
          type: "text/plain",
          value: message.text,
        },
        {
          type: "text/html",
          value: message.html,
        },
      ],
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `SendGrid API error: ${response.status} ${response.statusText}. ${errorBody}`,
        );
      }

      console.log(`✅ Email sent successfully to ${message.to}`);
    } catch (error) {
      console.error("❌ Error sending email:", error);
      throw error;
    }
  }

  /**
   * Send an email verification code
   * 
   * @param to Recipient email address
   * @param verificationCode The verification code to send
   * @param options Optional configuration
   */
  async sendVerificationEmail(
    to: string,
    verificationCode: string,
    options?: {
      appName?: string;
      expirationMinutes?: number;
    },
  ): Promise<void> {
    const appName = options?.appName || "Our App";
    const expirationMinutes = options?.expirationMinutes || 15;

    const subject = `Verify your email address for ${appName}`;
    const text = `Your verification code is: ${verificationCode}\n\nThis code will expire in ${expirationMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #333; margin-top: 0;">Verify Your Email Address</h1>
  </div>
  
  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
    <p>Hello,</p>
    <p>Thank you for signing up for ${appName}. Please use the verification code below to verify your email address:</p>
    
    <div style="background-color: #f9f9f9; border: 2px dashed #333; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
      <h2 style="color: #333; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h2>
    </div>
    
    <p>This code will expire in <strong>${expirationMinutes} minutes</strong>.</p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you didn't request this verification code, please ignore this email.
    </p>
  </div>
  
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center;">
    <p>This is an automated message from ${appName}. Please do not reply to this email.</p>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }
}

/**
 * Load SendGrid environment variables from sendgrid.env file
 * 
 * This function explicitly loads variables from sendgrid.env.
 * You can call this before using createSendGridEmailFromEnv() if
 * your variables are in sendgrid.env instead of the main .env file.
 * 
 * @param envPath Path to the sendgrid.env file (default: "./sendgrid.env")
 */
export async function loadSendGridEnv(envPath: string = "./sendgrid.env"): Promise<void> {
  try {
    const env = await load({ envPath });
    // Merge into Deno.env
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith("SENDGRID_")) {
        Deno.env.set(key, value);
      }
    }
  } catch (error) {
    // If file doesn't exist, that's okay - user might be using main .env or env vars
    console.warn(`Could not load ${envPath}:`, error);
  }
}

/**
 * Create a SendGrid email service instance from environment variables
 * 
 * Reads SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, and optionally SENDGRID_FROM_NAME
 * from environment variables. If using sendgrid.env file, call loadSendGridEnv() first.
 * 
 * @returns SendGridEmail instance
 * @throws Error if required environment variables are missing
 */
export function createSendGridEmailFromEnv(): SendGridEmail {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL");
  const fromName = Deno.env.get("SENDGRID_FROM_NAME");

  if (!apiKey) {
    throw new Error(
      "SENDGRID_API_KEY environment variable is required. Please set it in sendgrid.env or as an environment variable.",
    );
  }

  if (!fromEmail) {
    throw new Error(
      "SENDGRID_FROM_EMAIL environment variable is required. This should be your verified sender email address.",
    );
  }

  return new SendGridEmail({
    apiKey,
    fromEmail,
    ...(fromName && { fromName }),
  });
}

