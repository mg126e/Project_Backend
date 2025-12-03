```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserAuthConcept from "../PasswordAuthentication/PasswordAuthenticationConcept.ts";
import EmailVerificationConcept from "./EmailVerificationConcept.ts";

// --- Test Constants and Helper Functions ---

// Define example user data for testing
const userA_data = {
  username: "alice_ev_test",
  password: "passwordEV123",
  email: "alice_ev_test@example.com",
};

const userB_data = {
  username: "bob_ev_test",
  password: "secure_passEV",
  email: "bob_ev_test@example.com",
};

const _userC_data = {
  username: "charlie_ev_test",
  password: "charlie_passEV",
  email: "charlie_ev_test@example.com",
};

// Define example emails for verification
const email1 = "test1@example.com";
const email2 = "test2@example.com";
const email3 = "test3@example.com";
const _nonExistentEmail = "non_existent@example.com";

// A dummy ID that won't exist in the database for error cases
const nonExistentId = "non_existent_id" as ID;
const invalidToken = "invalid-verification-token";

/**
 * Helper function to register and confirm a user using UserAuthConcept.
 * This is a prerequisite for most email verification tests.
 * @param userAuth Instance of UserAuthConcept.
 * @param userData User data to register.
 * @returns The ID of the registered and confirmed user.
 */
async function registerUser(userAuth: UserAuthConcept, userData: typeof userA_data): Promise<ID> {
  const registerResult = await userAuth.register(userData);
  assertNotEquals("error" in registerResult, true, `Registration for ${userData.username} should succeed.`);
  const { user } = registerResult as { user: ID };
  return user;
}

function expectSuccess<T extends Record<string, unknown>>(result: T | { error: string }, context: string): T {
  if ("error" in result) {
    throw new Error(`${context} failed: ${result.error}`);
  }
  return result;
}

function logStep(message: string) {
  console.log(message);
}

// --- Principle Test ---

Deno.test("Principle: User requests email verification, then verifies it successfully", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  let userId: ID;
  try {
    // 1. Register and confirm a user (necessary for email verification)
    logStep("1. Registering baseline user for principle scenario");
    userId = await registerUser(userAuthConcept, userA_data);
    logStep(`   ✓ Registered ${userA_data.username} with id ${userId}`);

    // 2. Request verification for a new email (email1)
    logStep("2. Requesting verification code for email1");
    const requestResult = await emailVerificationConcept.requestVerification({
      userId,
      email: email1,
    });
    assertNotEquals(
      "error" in requestResult,
      true,
      "Request verification should not fail for a new email.",
    );
    const { verificationRecordId, verificationCode } = requestResult as {
      verificationRecordId: ID;
      verificationCode: string;
    };
    logStep(`   ✓ Received verification record ${verificationRecordId} with code ${verificationCode}`);
    assertExists(verificationRecordId, "Verification ID should be returned.");
    assertExists(verificationCode, "Verification code should be returned.");

    // Verify a pending record exists for email1
    const pendingRecord1 = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertExists(pendingRecord1, "A pending verification record should exist for email1.");
    assertEquals(pendingRecord1?.userId, userId, "Pending record userId should match.");
    assertEquals(pendingRecord1?.email, email1, "Pending record email should match.");
    assertEquals(pendingRecord1?.verificationCode, verificationCode, "Pending record code should match.");
    assertEquals(pendingRecord1?.isVerified, false, "Pending record should be unverified.");

    // 3. Verify email1 with the correct token
    const verifyOutcome = await emailVerificationConcept.verifyEmail({
      verificationRecordId,
      verificationCode,
    });
    assertEquals(
      "error" in verifyOutcome,
      false,
      "Email verification should not fail with correct ID and token.",
    );
    logStep("3. Submitted correct code and email marked verified");

    // Verify no pending record exists for email1 anymore
    const noPendingRecord1 = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertEquals(noPendingRecord1, null, "No pending record should exist for email1 after successful verification.");

    // Verify the email1 is now in the user's verified list
    const verifiedRecords1 = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    const verifiedEmails1 = verifiedRecords1.map((record) => record.email);
    assertArrayIncludes(verifiedEmails1, [email1], "email1 should be in the list of verified emails.");
    assertEquals(verifiedEmails1.length, 1, "Only one email should be verified.");
    logStep("4. Principle scenario complete: email1 verified and reflected in records");

    // Verify the specific verification record status: it should now be 'verified'
    const fetchedRecordAfterVerification = await emailVerificationConcept._getVerificationRecord({ recordId: verificationRecordId });
    assertExists(fetchedRecordAfterVerification, "Verification record should still exist after verification.");
    assertEquals(fetchedRecordAfterVerification?.isVerified, true, "Verification record should be marked verified.");
    assertEquals(
      fetchedRecordAfterVerification?.verificationCode,
      verificationCode,
      "Verification code should remain stored for auditing purposes.",
    );

  } finally {
    await client.close();
  }
});

// --- Action: requestVerification Tests ---

Deno.test("Action: requestVerification successfully creates a new pending record for a new email", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Registering userA and initiating first verification request");
    const userId = await registerUser(userAuthConcept, userA_data);

    const requestResult = await emailVerificationConcept.requestVerification({
      userId,
      email: email1,
    });
    const { verificationRecordId: verificationId, verificationCode: token } = expectSuccess(
      requestResult,
      "requestVerification",
    );

    const fetchedRecord = await emailVerificationConcept._getVerificationRecord({ recordId: verificationId });
    assertExists(fetchedRecord, "Verification record should exist after request.");
    assertEquals(fetchedRecord?.userId, userId);
    assertEquals(fetchedRecord?.email, email1);
    assertEquals(fetchedRecord?.verificationCode, token);
    assertEquals(fetchedRecord?.isVerified, false);
    logStep(`   ✓ Verification record ${verificationId} stored for ${email1}`);

    const pendingForUserEmail = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertExists(pendingForUserEmail, "Pending record should be found for user and email.");
    assertEquals(pendingForUserEmail?._id, verificationId);

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    assertEquals(verifiedRecords.length, 0, "Email should not be in verified list yet.");
    logStep("2. Pending record confirmed and no verified emails yet");
  } finally {
    await client.close();
  }
});

Deno.test("Action: requestVerification replaces existing pending verification for the same user and email", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Registering user and issuing first verification code");
    const userId = await registerUser(userAuthConcept, userA_data);

    // First request
    const requestResult1 = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: id1, verificationCode: code1 } = expectSuccess(
      requestResult1,
      "requestVerification (first)",
    );
    logStep(`   ✓ First record ${id1} created with code ${code1}`);

    const pendingRecord1 = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertExists(pendingRecord1, "Initial pending record should exist.");
    assertEquals(pendingRecord1?._id, id1);

    // Second request for the same user and email
    logStep("2. Requesting second verification code to replace first");
    const requestResult2 = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: id2, verificationCode: code2 } = expectSuccess(
      requestResult2,
      "requestVerification (second)",
    );
    assertNotEquals(id1, id2, "A new verification ID should be generated.");
    assertNotEquals(code1, code2, "A new code should be generated.");

    // The first record should no longer be pending
    const oldRecord = await emailVerificationConcept._getVerificationRecord({ recordId: id1 });
    // Assuming the old record is marked as 'replaced' or removed. If it's removed, _getVerificationRecord would return null.
    // If it's replaced, it might update status. Let's verify it's no longer pending.
    assertExists(oldRecord, "Old verification record should still exist to track its state."); // If it's removed, this test fails.
    assertEquals(oldRecord?.expiresAt.getTime(), 0, "Old record should be expired after replacement.");

    const newPendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertExists(newPendingRecord, "New pending record should exist.");
    assertEquals(newPendingRecord?._id, id2, "Pending record getter should return the new record.");
    assertEquals(newPendingRecord?.verificationCode, code2);
    logStep(`   ✓ Replacement succeeded with new record ${id2} and code ${code2}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: requestVerification allows new pending record even if email is already verified (re-verification)", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Performing initial verification of email1");
    const userId = await registerUser(userAuthConcept, userA_data);

    // 1. First verification for email1
    const reqResult1 = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: id1, verificationCode: token1 } = expectSuccess(
      reqResult1,
      "requestVerification (original)",
    );
    await emailVerificationConcept.verifyEmail({ verificationRecordId: id1, verificationCode: token1 });
    logStep("   ✓ Email1 verified the first time");

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    assertArrayIncludes(verifiedRecords.map((record) => record.email), [email1], "Email should be verified initially.");

    // 2. Request verification again for the *same* verified email
    logStep("2. Requesting a new verification code for the already verified email1");
    const reqResult2 = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    assertNotEquals("error" in reqResult2, true, "Re-requesting verification for an already verified email should succeed.");
    const { verificationRecordId: id2, verificationCode: token2 } = expectSuccess(
      reqResult2,
      "requestVerification (reverify)",
    );

    assertNotEquals(id1, id2, "A new verification ID should be generated for re-verification.");
    assertNotEquals(token1, token2, "A new token should be generated for re-verification.");
    logStep(`   ✓ Replacement record ${id2} created with new code ${token2}`);

    const pendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertExists(pendingRecord, "A new pending record should exist for the re-verification request.");
    assertEquals(pendingRecord?._id, id2, "Pending record getter should return the new record.");
    assertEquals(pendingRecord?.isVerified, false, "The new record should be pending (not verified).");

    // The verified emails list should still only contain the original entry for email1
    const updatedVerifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    const updatedVerifiedEmails = updatedVerifiedRecords.map((record) => record.email);
    assertArrayIncludes(updatedVerifiedEmails, [email1], "Email should remain in verified list.");
    assertEquals(updatedVerifiedEmails.length, 1, "Only one entry for email1 should exist in the verified list.");
    logStep("3. Verified list remains at one entry while new pending request exists");

  } finally {
    await client.close();
  }
});


// --- Action: verifyEmail Tests ---

Deno.test("Action: verifyEmail successfully verifies an email", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Requesting verification code and completing verification");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    assertEquals("error" in requestResult, false, "Request should succeed.");
    const { verificationRecordId, verificationCode } = requestResult as {
      verificationRecordId: ID;
      verificationCode: string;
    };

    const verifyResult = await emailVerificationConcept.verifyEmail({ verificationRecordId, verificationCode });
    assertEquals("error" in verifyResult, false, "Verification should succeed.");
    logStep(`   ✓ Verified email1 using record ${verificationRecordId}`);

    const pendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertEquals(pendingRecord, null, "No pending record should exist after successful verification.");

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    const verifiedEmails = verifiedRecords.map((record) => record.email);
    assertArrayIncludes(verifiedEmails, [email1], "Email should be in verified list after verification.");
    assertEquals(verifiedEmails.length, 1);
    logStep("2. Pending list cleared and verified list updated");

    const record = await emailVerificationConcept._getVerificationRecord({ recordId: verificationRecordId });
    assertExists(record, "The verification record should exist.");
    assertEquals(record?.isVerified, true, "Record should be marked verified.");
    assertEquals(record?.verificationCode, verificationCode, "Record should retain the verification code value.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: verifyEmail fails with invalid verification ID", async () => {
  const [db, client] = await testDb();
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Attempting verification with invalid record id");
    const verifyResult = await emailVerificationConcept.verifyEmail({
      verificationRecordId: nonExistentId,
      verificationCode: "anytoken",
    });
    assertEquals("error" in verifyResult, true, "Verification should fail for non-existent ID.");
    assertEquals((verifyResult as { error: string }).error, `Verification record with ID '${nonExistentId}' not found.`, "Error message should match.");
    logStep("   ✓ Received not-found error as expected");
  } finally {
    await client.close();
  }
});

Deno.test("Action: verifyEmail fails with incorrect token", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Obtaining valid verification record then sending wrong token");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    assertEquals("error" in requestResult, false, "Request should succeed.");
    const { verificationRecordId } = expectSuccess(requestResult, "requestVerification");

    const verifyResult = await emailVerificationConcept.verifyEmail({
      verificationRecordId,
      verificationCode: invalidToken,
    });
    assertEquals("error" in verifyResult, true, "Verification should fail with incorrect token.");
    assertEquals((verifyResult as { error: string }).error, "Invalid verification code.", "Error message should match.");
    logStep("   ✓ Invalid token rejected and error returned");

    const pendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertExists(pendingRecord, "Pending record should still exist after failed verification attempt.");
    assertEquals(pendingRecord?.isVerified, false);

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    assertEquals(verifiedRecords.length, 0, "Email should not be in verified list after failed verification.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: verifyEmail fails if record is not pending (already verified)", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Verifying once and attempting to reuse same code");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: verificationId, verificationCode: token } = expectSuccess(
      requestResult,
      "requestVerification",
    );

    // First successful verification
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verificationId, verificationCode: token });
    logStep("   ✓ First verification consumed the record");

    // Attempt to verify again with the same (now consumed) token
    const verifyResult = await emailVerificationConcept.verifyEmail({
      verificationRecordId: verificationId,
      verificationCode: token,
    });
    assertEquals("error" in verifyResult, true, "Verification should fail if the record is not pending.");
    assertEquals((verifyResult as { error: string }).error, "Verification record is not in 'pending' status.", "Error message should match.");
    logStep("   ✓ Second attempt correctly rejected");

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    const verifiedEmails = verifiedRecords.map((record) => record.email);
    assertArrayIncludes(verifiedEmails, [email1], "Email should still be in verified list.");
    assertEquals(verifiedEmails.length, 1);
  } finally {
    await client.close();
  }
});

Deno.test("Action: verifyEmail fails if record is not pending (already replaced)", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Creating two verification records to force replacement");
    const userId = await registerUser(userAuthConcept, userA_data);

    // Request 1: creates record1
    const reqResult1 = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: id1, verificationCode: token1 } = expectSuccess(
      reqResult1,
      "requestVerification (record1)",
    );

    // Request 2: replaces record1 with record2
    await emailVerificationConcept.requestVerification({ userId, email: email1 });

    // Try to verify with token from record1 (which should now be 'replaced' or non-pending)
    const verifyResult = await emailVerificationConcept.verifyEmail({
      verificationRecordId: id1,
      verificationCode: token1,
    });
    assertEquals("error" in verifyResult, true, "Verification should fail if the record has been replaced.");
    assertEquals((verifyResult as { error: string }).error, "Verification record is not in 'pending' status.", "Error message should match.");
    logStep("   ✓ Reused code rejected because record was replaced");

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    assertEquals(verifiedRecords.length, 0, "Email should not be in verified list.");
  } finally {
    await client.close();
  }
});


// --- Query: _getVerificationRecord Tests ---

Deno.test("Query: _getVerificationRecord retrieves a pending record by ID", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Creating pending verification record to query directly");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: verificationId, verificationCode: token } = expectSuccess(
      requestResult,
      "requestVerification",
    );

    const record = await emailVerificationConcept._getVerificationRecord({ recordId: verificationId });
    assertExists(record, "Record should be found by its ID.");
    assertEquals(record?._id, verificationId);
    assertEquals(record?.userId, userId);
    assertEquals(record?.email, email1);
    assertEquals(record?.verificationCode, token);
    assertEquals(record?.isVerified, false);
    logStep(`   ✓ Retrieved pending record ${verificationId}`);
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getVerificationRecord retrieves a verified record by ID", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Verifying email then fetching record in verified state");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: verificationId, verificationCode: token } = expectSuccess(
      requestResult,
      "requestVerification",
    );
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verificationId, verificationCode: token });

    const record = await emailVerificationConcept._getVerificationRecord({ recordId: verificationId });
    assertExists(record, "Record should be found by its ID after verification.");
    assertEquals(record?._id, verificationId);
    assertEquals(record?.userId, userId);
    assertEquals(record?.email, email1);
    assertEquals(record?.verificationCode, token);
    assertEquals(record?.isVerified, true);
    logStep(`   ✓ Verified record ${verificationId} shows isVerified=true`);
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getVerificationRecord returns null for a non-existent ID", async () => {
  const [db, client] = await testDb();
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Querying record by non-existent id");
    const record = await emailVerificationConcept._getVerificationRecord({ recordId: nonExistentId });
    assertEquals(record, null, "Should return null for a non-existent verification ID.");
    logStep("   ✓ Null returned as expected");
  } finally {
    await client.close();
  }
});

// --- Query: _getPendingVerificationForUserEmail Tests ---

Deno.test("Query: _getPendingVerificationForUserEmail retrieves a pending record for user and email", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Creating pending record to test lookup helper");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: verificationId, verificationCode: token } = expectSuccess(
      requestResult,
      "requestVerification",
    );

    const pendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertExists(pendingRecord, "Pending record should be found for user and email.");
    assertEquals(pendingRecord?._id, verificationId);
    assertEquals(pendingRecord?.userId, userId);
    assertEquals(pendingRecord?.email, email1);
    assertEquals(pendingRecord?.verificationCode, token);
    assertEquals(pendingRecord?.isVerified, false);
    logStep(`   ✓ Pending lookup returned record ${verificationId}`);
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPendingVerificationForUserEmail returns null if no pending record exists for user/email", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Confirming pending lookup returns null when no requests exist");
    const userId = await registerUser(userAuthConcept, userA_data);

    // No request made for email1
    const pendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertEquals(pendingRecord, null, "Should return null if no pending request for the specified email.");
    logStep("   ✓ Null returned when no requests exist");

    // Request made for email2, but not email1
    await emailVerificationConcept.requestVerification({ userId, email: email2 });
    const pendingRecord2 = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertEquals(pendingRecord2, null, "Should return null if pending request for a different email.");
    logStep("   ✓ Null returned when only other emails are pending");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPendingVerificationForUserEmail returns null if email is already verified", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Verifying email then checking pending lookup returns null");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: verificationId, verificationCode: token } = expectSuccess(
      requestResult,
      "requestVerification",
    );
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verificationId, verificationCode: token });

    const pendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId, email: email1 });
    assertEquals(pendingRecord, null, "Should return null if the email has already been verified.");
    logStep("   ✓ Pending lookup empty after verification");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getPendingVerificationForUserEmail returns null for a different user", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Ensuring pending lookup is scoped per user");
    const userIdA = await registerUser(userAuthConcept, userA_data);
    const userIdB = await registerUser(userAuthConcept, userB_data);

    await emailVerificationConcept.requestVerification({ userId: userIdA, email: email1 });

    const pendingRecord = await emailVerificationConcept._getPendingVerificationForUserEmail({ userId: userIdB, email: email1 });
    assertEquals(pendingRecord, null, "Should return null if pending record is for a different user.");
    logStep("   ✓ UserB sees no pending record for UserA's email");
  } finally {
    await client.close();
  }
});

// --- Query: _getVerifiedEmailsForUser Tests ---

Deno.test("Query: _getVerifiedEmailsForUser returns an empty array for a user with no verified emails", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Checking verified emails before any verification occurs");
    const userId = await registerUser(userAuthConcept, userA_data);
    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    assertEquals(verifiedRecords, [], "Should return an empty array for a user with no verified emails.");
    logStep("   ✓ Verified list empty");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getVerifiedEmailsForUser returns an empty array for a user with only pending verifications", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Creating multiple pending requests without verifying");
    const userId = await registerUser(userAuthConcept, userA_data);
    await emailVerificationConcept.requestVerification({ userId, email: email1 });
    await emailVerificationConcept.requestVerification({ userId, email: email2 });

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    assertEquals(verifiedRecords, [], "Should return an empty array if only pending verifications exist.");
    logStep("   ✓ Verified list still empty with pending requests");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getVerifiedEmailsForUser returns one verified email", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Verifying a single email and reading verified list");
    const userId = await registerUser(userAuthConcept, userA_data);
    const requestResult = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const { verificationRecordId: verificationId, verificationCode: token } = expectSuccess(
      requestResult,
      "requestVerification",
    );
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verificationId, verificationCode: token });

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    const verifiedEmails = verifiedRecords.map((record) => record.email);
    assertArrayIncludes(verifiedEmails, [email1], "Should return an array containing the single verified email.");
    assertEquals(verifiedEmails.length, 1);
    logStep("   ✓ Verified list contains exactly one email");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getVerifiedEmailsForUser returns multiple verified emails for a user", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Verifying two emails to ensure both appear in list");
    const userId = await registerUser(userAuthConcept, userA_data);

    // Verify email1
    const reqResult1 = await emailVerificationConcept.requestVerification({ userId, email: email1 });
    const {
      verificationRecordId: verifiedId1,
      verificationCode: verifiedCode1,
    } = expectSuccess(reqResult1, "requestVerification email1");
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verifiedId1, verificationCode: verifiedCode1 });

    // Verify email2
    const reqResult2 = await emailVerificationConcept.requestVerification({ userId, email: email2 });
    const {
      verificationRecordId: verifiedId2,
      verificationCode: verifiedCode2,
    } = expectSuccess(reqResult2, "requestVerification email2");
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verifiedId2, verificationCode: verifiedCode2 });

    // Request email3 but don't verify it (should not appear in results)
    await emailVerificationConcept.requestVerification({ userId, email: email3 });

    const verifiedRecords = await emailVerificationConcept._getVerifiedEmailsForUser({ userId });
    const verifiedEmails = verifiedRecords.map((record) => record.email);
    assertEquals(verifiedEmails.length, 2, "Should return an array with two verified emails.");
    assertArrayIncludes(verifiedEmails, [email1, email2], "Should include both email1 and email2.");
    assertNotEquals(verifiedEmails.includes(email3), true, "Should not include email3 as it's only pending.");
    logStep("   ✓ Verified list contains email1 and email2 only");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getVerifiedEmailsForUser distinguishes between users", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);
  const emailVerificationConcept = new EmailVerificationConcept(db);

  try {
    logStep("1. Verifying different emails for userA and userB");
    const userIdA = await registerUser(userAuthConcept, userA_data);
    const userIdB = await registerUser(userAuthConcept, userB_data);

    // User A verifies email1
    const reqResultA1 = await emailVerificationConcept.requestVerification({ userId: userIdA, email: email1 });
    const {
      verificationRecordId: verifiedAId,
      verificationCode: verifiedACode,
    } = expectSuccess(reqResultA1, "requestVerification userA");
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verifiedAId, verificationCode: verifiedACode });

    // User B verifies email2
    const reqResultB1 = await emailVerificationConcept.requestVerification({ userId: userIdB, email: email2 });
    const {
      verificationRecordId: verifiedBId,
      verificationCode: verifiedBCode,
    } = expectSuccess(reqResultB1, "requestVerification userB");
    await emailVerificationConcept.verifyEmail({ verificationRecordId: verifiedBId, verificationCode: verifiedBCode });

    const verifiedRecordsA = await emailVerificationConcept._getVerifiedEmailsForUser({ userId: userIdA });
    const verifiedEmailsA = verifiedRecordsA.map((record) => record.email);
    assertArrayIncludes(verifiedEmailsA, [email1], "User A should only have email1 verified.");
    assertEquals(verifiedEmailsA.length, 1);
    logStep("   ✓ UserA verified emails list correct");

    const verifiedRecordsB = await emailVerificationConcept._getVerifiedEmailsForUser({ userId: userIdB });
    const verifiedEmailsB = verifiedRecordsB.map((record) => record.email);
    assertArrayIncludes(verifiedEmailsB, [email2], "User B should only have email2 verified.");
    assertEquals(verifiedEmailsB.length, 1);
    logStep("   ✓ UserB verified emails list correct");
  } finally {
    await client.close();
  }
});
```