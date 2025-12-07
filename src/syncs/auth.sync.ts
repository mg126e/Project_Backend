import { actions, Sync, Frames } from "@engine";
import { PasswordAuthentication, Requesting, Sessioning, EmailVerification, OneRunMatching } from "@concepts";
import { ID } from "@utils/types.ts";

// Respond with error if login is blocked due to missing email verification
export const LoginBlockedUnverified: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/PasswordAuthentication/authenticate" }, { request }],
    [PasswordAuthentication.authenticate, {}, { user }],
  ),
  where: async (frames) => {
    const userId = frames[0][user] as ID;
    const verifiedEmails = await EmailVerification._getVerifiedEmailsForUser({ userId });
    if (verifiedEmails.length === 0) {
      return frames;
    }
    return new Frames();
  },
  then: actions([Requesting.respond, { request, error: "Please verify your email before logging in." }]),
});


//-- User Registration: Respond with error if verification info is missing --//
export const RegisterRequestMissingVerification: Sync = ({ request, verificationRecordId, verificationCode }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuthentication/register", verificationRecordId, verificationCode },
    { request },
  ]),
  where: (frames) => {
    // Check if verification info is missing
    const req = frames[0];
    const vId = req[verificationRecordId];
    const vCode = req[verificationCode];
    // If verificationRecordId is null/undefined or verificationCode is missing, return frames to match
    // Note: null values will be bound, but undefined/missing values won't be in the frame
    if (vId == null || vId === undefined || vCode == null || vCode === undefined || vCode === "") {
      return frames;
    }
    return new Frames(); // Don't match if verification info is present
  },
  then: actions([
    Requesting.respond, { request, error: "Email verification is required. Please provide verificationRecordId and verificationCode." },
  ]),
});

//-- User Registration: Respond with error if verification fails --//
export const RegisterRequestVerificationFailed: Sync = ({ request, verificationRecordId, verificationCode }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuthentication/register", verificationRecordId, verificationCode },
    { request },
  ]),
  where: async (frames) => {
    // Extract verification info
    const req = frames[0];
    const vId = req[verificationRecordId] as ID;
    const vCode = req[verificationCode] as string;
    // Skip if verification info is missing (handled by RegisterRequestMissingVerification)
    if (vId == null || vCode == null || vCode === undefined || vCode === "") {
      return new Frames();
    }
    
    // First check if the record is already verified - if so, don't match (let RegisterRequest handle it)
    try {
      const verificationRecord = await EmailVerification._getVerificationRecord({ recordId: vId });
      if (verificationRecord && verificationRecord.isVerified === true) {
        return new Frames(); // Don't match if already verified (handled by RegisterRequest)
      }
      if (!verificationRecord) {
        console.log(`[RegisterRequestVerificationFailed] Record not found, will attempt verification (will fail)`);
      }
    } catch (error) {
      console.error(`[RegisterRequestVerificationFailed] Error checking verification record:`, error);
      // Continue to verification attempt
    }
    
    // Check verification - if it fails, return frames to match this sync
    const verificationResult = await EmailVerification.verifyEmail({ verificationRecordId: vId, verificationCode: vCode });
    if (verificationResult && typeof verificationResult === 'object' && !('error' in verificationResult)) {
      return new Frames(); // Don't match if verification succeeds (handled by RegisterRequest)
    }
    return frames; // Match if verification failed
  },
  then: actions([
    Requesting.respond, { request, error: "Email verification failed. Please check your verification code." },
  ]),
});

//-- User Registration: Accepts verification info and only creates user if verified --//
export const RegisterRequest: Sync = ({ request, username, password, email, verificationRecordId, verificationCode }) => ({
    when: actions([
      Requesting.request,
      { path: "/PasswordAuthentication/register", username, password, email, verificationRecordId, verificationCode },
      { request },
    ]),
    where: async (frames) => {
      try {
        // Extract and cast values from frames
        const req = frames[0];
        const vId = req[verificationRecordId] as ID;
        const vCode = req[verificationCode] as string;

      // Skip if verification info is missing (handled by RegisterRequestMissingVerification)
      if (vId == null || vCode == null || vCode === undefined || vCode === "") {
        return new Frames();
      }
      
      // First, check if the verification record is already verified
      const verificationRecord = await EmailVerification._getVerificationRecord({ recordId: vId });
      if (verificationRecord) {
        if (verificationRecord.isVerified) {
          // Email is already verified, allow registration to proceed
          return frames;
        }
      } else {
        // Record doesn't exist - this is an error case
        return new Frames(); // block registration - record doesn't exist
      }
      
      // If not verified yet, try to verify it
      const verificationResult = await EmailVerification.verifyEmail({ verificationRecordId: vId, verificationCode: vCode });
      if (verificationResult && typeof verificationResult === 'object' && !('error' in verificationResult)) {
        return frames; // allow to proceed
      }
      return new Frames(); // block registration if not verified (handled by RegisterRequestVerificationFailed)
    } catch (error) {
      console.error(`[RegisterRequest] Error in where clause:`, error);
      return new Frames(); // block on error
    }
  },
  then: actions([
    PasswordAuthentication.register, { username, password, email },
  ]),
});



// Register response when email is already verified
export const RegisterResponseSuccessVerified: Sync = ({ request, user, email, verificationRecordId, activeInvites }) => {
  return {
    when: actions(
      [Requesting.request, { path: "/PasswordAuthentication/register", email, verificationRecordId }, { request }],
      [PasswordAuthentication.register, {}, { user }],
    ),
    where: async (frames) => {
      const originalFrame = frames[0];
      const req = frames[0];
      const vId = req[verificationRecordId] as ID | undefined;
      const userId = frames[1][user] as ID;
      
      // Check if verification was already completed
      if (vId) {
        try {
          const verificationRecord = await EmailVerification._getVerificationRecord({ recordId: vId });
          if (verificationRecord && verificationRecord.isVerified) {
            // Verification record is verified - allow this sync to match
            // Fetch active invites to include in response
            const invites = await OneRunMatching._getActiveInvites();
            return new Frames({ ...originalFrame, [activeInvites]: invites }, frames[1]);
          }
        } catch (error) {
          console.error(`[RegisterResponseSuccessVerified] Error checking verification record:`, error);
        }
      }
      
      // Also check if the user has any verified emails
      try {
        const verifiedEmails = await EmailVerification._getVerifiedEmailsForUser({ userId });
        if (verifiedEmails.length > 0) {
          // Fetch active invites to include in response
          const invites = await OneRunMatching._getActiveInvites();
          return new Frames({ ...originalFrame, [activeInvites]: invites }, frames[1]);
        }
      } catch (error) {
        console.error(`[RegisterResponseSuccessVerified] Error checking verified emails:`, error);
      }
      
      // Not verified, don't match this sync
      return new Frames();
    },
    then: actions([Requesting.respond, { request, user, activeInvites }]),
  };
};

// Register response when email is not yet verified
export const RegisterResponseSuccess: Sync = ({ request, user, email, verificationRecordId, activeInvites }) => {
  console.log("[RegisterResponseSuccess] user:", user);
  return {
    when: actions(
      [Requesting.request, { path: "/PasswordAuthentication/register", email, verificationRecordId }, { request }],
      [PasswordAuthentication.register, {}, { user }],
    ),
    where: async (frames) => {
      const originalFrame = frames[0];
      const req = frames[0];
      const vId = req[verificationRecordId] as ID | undefined;
      const userId = frames[1][user] as ID;
      
      // Only match if verification is NOT completed
      if (vId) {
        try {
          const verificationRecord = await EmailVerification._getVerificationRecord({ recordId: vId });
          if (verificationRecord && verificationRecord.isVerified) {
            // Verification is completed, don't match this sync (let RegisterResponseSuccessVerified handle it)
            return new Frames();
          }
        } catch (error) {
          console.error(`[RegisterResponseSuccess] Error checking verification record:`, error);
        }
      }
      
      // Also check if the user has any verified emails
      try {
        const verifiedEmails = await EmailVerification._getVerifiedEmailsForUser({ userId });
        if (verifiedEmails.length > 0) {
          // User has verified emails, don't match this sync
          return new Frames();
        }
      } catch (error) {
        console.error(`[RegisterResponseSuccess] Error checking verified emails:`, error);
      }
      
      // Verification not completed, allow this sync to match
      // Fetch active invites to include in response
      const invites = await OneRunMatching._getActiveInvites();
      return new Frames({ ...originalFrame, [activeInvites]: invites }, frames[1]);
    },
    then: actions([Requesting.respond, { request, user, msg: { requiresEmailVerification: true }, activeInvites }]),
  };
};

export const RegisterResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/PasswordAuthentication/register" }, { request }],
    [PasswordAuthentication.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Login & Session Creation --//
export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuthentication/authenticate", username, password },
    { request },
  ]),
  then: actions([PasswordAuthentication.authenticate, { username, password }]),
});

export const LoginSuccessCreatesSession: Sync = ({ user }) => ({
  when: actions([PasswordAuthentication.authenticate, {}, { user }]),
  where: async (frames) => {
    const userId = frames[0][user] as ID;
    const verifiedEmails = await EmailVerification._getVerifiedEmailsForUser({ userId });
    if (verifiedEmails.length > 0) {
      return frames;
    }
    // Block session creation if not verified
    return new Frames();
  },
  then: actions([Sessioning.start, { user }]),
});

export const LoginResponseSuccess: Sync = ({ request, user, session }) => {
  console.log("[LoginResponseSuccess] user:", user, "session:", session);
  return {
    when: actions(
      [Requesting.request, { path: "/PasswordAuthentication/authenticate" }, { request }],
      [PasswordAuthentication.authenticate, {}, { user }],
      [Sessioning.start, { user }, { session }],
    ),
    then: actions([Requesting.respond, { request, user, session }]),
  };
};

export const LoginResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/PasswordAuthentication/authenticate" }, { request }],
    [PasswordAuthentication.authenticate, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Logout --//
export const LogoutRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/logout", session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Sessioning.end, { session }]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Sessioning.end, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

//-- Change Password --//
export const ChangePasswordRequest: Sync = ({ request, session, user, oldPassword, newPassword }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuthentication/changePassword", session, oldPassword, newPassword },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([PasswordAuthentication.changePassword, { user, oldPassword, newPassword }]),
});

export const ChangePasswordResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/PasswordAuthentication/changePassword" }, { request }],
    [PasswordAuthentication.changePassword, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const ChangePasswordResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/PasswordAuthentication/changePassword" }, { request }],
    [PasswordAuthentication.changePassword, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});
