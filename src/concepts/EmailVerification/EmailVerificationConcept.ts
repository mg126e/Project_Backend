import { Collection, Database } from "@deps/mongo";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { createSendGridEmailFromEnv, SendGridEmail } from "@utils/sendgrid-email.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "EmailVerification" + ".";

// Generic types for the concept's external dependencies
type User = ID; // Represents a user ID, linking to UserAuthConcept
type EmailVerificationRecordID = ID; // Unique ID for each verification request

/**
 * Helper function to generate a simple numeric verification code.
 * In a real system, this might be more robust (e.g., alphanumeric, longer, cryptographically secure).
 */
function generateVerificationCode(): string {
  // Generate a 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper function to get the expiration timestamp for a verification code.
 * Code expires in 15 minutes by default.
 */
function getExpirationTimestamp(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15); // 15 minutes from now
  return now;
}

/**
 * State: A set of email verification records.
 * Each record tracks the state of an email verification request for a user.
 */
interface EmailVerificationRecordDoc {
  _id: EmailVerificationRecordID;
  userId: User; // The ID of the user whose email is being verified
  email: string; // The email address to be verified
  verificationCode: string; // The secret code sent to the email
  expiresAt: Date; // Timestamp when the verification code becomes invalid
  isVerified: boolean; // Boolean indicating if the email has been successfully verified
  createdAt: Date; // Timestamp for when the verification record was created
}

/**
 * @concept EmailVerification
 * @purpose To confirm that a user has access to a specific email address,
 *          enhancing security and user trust, typically during registration,
 *          password recovery, or updating account contact information.
 * @principle A unique, time-sensitive code is generated and associated with
 *             a user's email address. This code is expected to be sent to
 *             the user's email (external to this concept). The user must then
 *             provide this code within the valid timeframe to prove ownership
 *             of the email address. Once the code is successfully provided,
 *             the corresponding record is marked as verified.
 */
export default class EmailVerificationConcept {
  records: Collection<EmailVerificationRecordDoc>;
  private emailService: SendGridEmail | null = null;

  constructor(private readonly db: Database) {
    this.records = this.db.collection(PREFIX + "records");
    // It's good practice to create indexes for frequently queried fields
    // For example, to quickly find pending records for a user/email, or to clean up expired ones.
    // this.records.createIndex({ userId: 1, email: 1, isVerified: 1, expiresAt: 1 });
    // this.records.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

    // Initialize email service if SendGrid credentials are available
    try {
      this.emailService = createSendGridEmailFromEnv();
      console.log("[EmailVerification] SendGrid email service initialized");
    } catch (error) {
      console.warn(
        "[EmailVerification] SendGrid email service not available:",
        error instanceof Error ? error.message : error,
      );
      console.warn(
        "[EmailVerification] Email verification codes will be generated but not sent via email",
      );
    }
  }

  /**
   * Action: Initiates an email verification process for a given user and email address.
   * requestVerification (userId: User, email: String): { verificationRecordId: EmailVerificationRecordID, verificationCode: String } | { error: String }
   *
   * @requires A valid user ID and an email address to be verified.
   *
   * @effects Generates a new unique verification code and an expiration timestamp.
   *          Invalidates any existing *unverified and unexpired* records for the same
   *          user and email to ensure only one active code exists per request context.
   *          Creates a new verification record in the database.
   *          Returns the new verification record ID and the generated code.
   *          (The returned code is expected to be sent to the user's email externally).
   */
  async requestVerification(
    { userId, email }: {
      userId: User;
      email: string;
    },
  ): Promise<{ verificationRecordId: EmailVerificationRecordID; verificationCode: string } | { error: string }> {
    try {
      // Invalidate any previous unverified, unexpired codes for this user and email
      // by setting their expiration to a past date.
      await this.records.updateMany(
        {
          userId,
          email,
          isVerified: false,
          expiresAt: { $gt: new Date() },
        },
        { $set: { expiresAt: new Date(0) } } // Set expiry to epoch to effectively invalidate
      );

      const verificationRecordId = freshID() as EmailVerificationRecordID;
      const verificationCode = generateVerificationCode();
      const expiresAt = getExpirationTimestamp();
      const createdAt = new Date();

      const newRecord: EmailVerificationRecordDoc = {
        _id: verificationRecordId,
        userId,
        email,
        verificationCode,
        expiresAt,
        isVerified: false,
        createdAt,
      };

      await this.records.insertOne(newRecord);

      // Send verification email if email service is available
      if (this.emailService) {
        try {
          await this.emailService.sendVerificationEmail(
            email,
            verificationCode,
            {
              appName: "RunBuddy",
              expirationMinutes: 15,
            },
          );
          console.log(
            `[EmailVerification.requestVerification] Verification email sent to ${email}`,
          );
        } catch (emailError) {
          console.error(
            "[EmailVerification.requestVerification] Failed to send email:",
            emailError,
          );
          // If email sending fails, we return an error
          // The verification record is already stored in the database
          // The user can retry the request, which will generate a new code and invalidate this one
          return {
            error:
              "Verification code generated but email could not be sent. Please try again or contact support.",
          };
        }
      } else {
        console.warn(
          `[EmailVerification.requestVerification] Email service not available. Code generated: ${verificationCode} for ${email}`,
        );
        // If email service is not configured, we still return the code
        // This allows for manual testing or alternative delivery methods
      }

      return { verificationRecordId, verificationCode };
    } catch (error) {
      console.error("[EmailVerification.requestVerification] Database error:", error);
      return {
        error: "Email verification request service unavailable. Please try again later.",
      };
    }
  }

  /**
   * Action: Verifies an email address using a provided verification code.
   * verifyEmail (verificationRecordId: EmailVerificationRecordID, verificationCode: String): { user: User, email: String } | { error: String }
   *
   * @requires A valid, unexpired, and unverified `verificationRecordId`
   *           and a `verificationCode` that matches the one stored in the record.
   *
   * @effects If the verification is successful, the corresponding record's `isVerified`
   *          field is updated to `true`. Returns the user ID and email of the
   *          successfully verified record.
   */
  async verifyEmail(
    { verificationRecordId, verificationCode }: {
      verificationRecordId: EmailVerificationRecordID;
      verificationCode: string;
    },
  ): Promise<{ user: User; email: string } | { error: string }> {
    try {
      const record = await this.records.findOne({ _id: verificationRecordId });

      if (!record) {
        return { error: `Verification record with ID '${verificationRecordId}' not found.` };
      }

      if (record.isVerified) {
        return { error: "Verification record is not in 'pending' status." };
      }

      if (record.expiresAt < new Date()) {
        return { error: "Verification record is not in 'pending' status." };
      }

      if (record.verificationCode !== verificationCode) {
        return { error: "Invalid verification code." };
      }

      // Mark the record as verified
      await this.records.updateOne(
        { _id: verificationRecordId },
        { $set: { isVerified: true } },
      );

      return { user: record.userId, email: record.email };
    } catch (error) {
      console.error("[EmailVerification.verifyEmail] Database error:", error);
      return {
        error: "Email verification service unavailable. Please try again later.",
      };
    }
  }

  /**
   * Query: Retrieves an email verification record by its ID.
   * This is an internal query useful for testing or other internal operations.
   */
  async _getVerificationRecord(
    { recordId }: { recordId: EmailVerificationRecordID },
  ): Promise<EmailVerificationRecordDoc | null> {
    return await this.records.findOne({ _id: recordId });
  }

  /**
   * Query: Retrieves the latest pending (unverified, unexpired) verification record
   * for a specific user and email address.
   * This is an internal query.
   */
  async _getPendingVerificationForUserEmail(
    { userId, email }: { userId: User; email: string },
  ): Promise<EmailVerificationRecordDoc | null> {
    return await this.records.findOne(
      { userId, email, isVerified: false, expiresAt: { $gt: new Date() } },
      { sort: { createdAt: -1 } } // Get the most recent one
    );
  }

  /**
   * Query: Retrieves all successful (isVerified: true) verification records
   * for a specific user. This can be used to list all verified emails for a user.
   * This is an internal query.
   */
  async _getVerifiedEmailsForUser(
    { userId }: { userId: User },
  ): Promise<EmailVerificationRecordDoc[]> {
    return await this.records.find({ userId, isVerified: true }).toArray();
  }
}