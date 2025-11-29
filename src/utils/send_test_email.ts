/**
 * Test script to send a verification email
 * Run with: deno run --allow-net --allow-env --allow-read send_test_email.ts
 * 
 * Make sure you have SENDGRID_API_KEY and SENDGRID_FROM_EMAIL set as environment variables
 * or in a .env file in the project root.
 */

import { createSendGridEmailFromEnv } from "./sendgrid-email.ts";
import { load } from "jsr:@std/dotenv";

// Try to load environment variables from .env file (if it exists)
try {
  await load({ export: true });
} catch (error) {
  // .env file doesn't exist, that's okay - use environment variables directly
  console.log("ℹ️  No .env file found, using environment variables directly");
}

async function sendTestEmail() {
  try {
    console.log("📧 Setting up email service...");
    const emailService = createSendGridEmailFromEnv();

    const recipientEmail = "mg126@wellesley.edu";
    const verificationCode = "559094";

    console.log(`📤 Sending email to ${recipientEmail}...`);
    console.log(`   Code: ${verificationCode}`);

    await emailService.sendEmail({
      to: recipientEmail,
      subject: "Your RunBuddy Code",
      text: `Your runbuddy code is ${verificationCode}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RunBuddy Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #333; margin-top: 0;">Your RunBuddy Code</h1>
  </div>
  
  <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
    <p>Hello,</p>
    <p>Your runbuddy code is:</p>
    
    <div style="background-color: #f9f9f9; border: 2px dashed #333; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
      <h2 style="color: #333; margin: 0; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h2>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });

    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    Deno.exit(1);
  }
}

await sendTestEmail();

