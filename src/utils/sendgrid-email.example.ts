/**
 * Example usage of SendGrid Email Service
 * 
 * This file demonstrates how to use the SendGrid email utility
 * to send emails, including verification emails.
 */

import { createSendGridEmailFromEnv, SendGridEmail } from "./sendgrid-email.ts";

/**
 * Example 1: Using the helper function to create from environment variables
 */
async function example1_SendVerificationEmail() {
  try {
    // This reads from sendgrid.env or environment variables
    const emailService = createSendGridEmailFromEnv();

    // Send a verification email
    await emailService.sendVerificationEmail(
      "user@example.com",
      "123456",
      {
        appName: "LongTermBuddy",
        expirationMinutes: 15,
      },
    );

    console.log("Verification email sent successfully!");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

/**
 * Example 2: Creating the service manually with custom config
 */
async function example2_CustomEmail() {
  const emailService = new SendGridEmail({
    apiKey: Deno.env.get("SENDGRID_API_KEY")!,
    fromEmail: "noreply@example.com",
    fromName: "My App",
  });

  await emailService.sendEmail({
    to: "recipient@example.com",
    subject: "Welcome to My App",
    text: "Welcome! We're excited to have you.",
    html: "<h1>Welcome!</h1><p>We're excited to have you.</p>",
  });
}

/**
 * Example 3: Integration with EmailVerification concept
 * 
 * This shows how you might integrate email sending into your sync
 */
async function example3_IntegrationWithEmailVerification(
  email: string,
  verificationCode: string,
) {
  try {
    const emailService = createSendGridEmailFromEnv();
    await emailService.sendVerificationEmail(email, verificationCode, {
      appName: "LongTermBuddy",
      expirationMinutes: 15,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    // Handle error appropriately in your sync
    throw error;
  }
}

// Uncomment to test:
// await example1_SendVerificationEmail();

