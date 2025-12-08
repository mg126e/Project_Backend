import { EmailVerification, PasswordAuthentication, Requesting, Sessioning, UserProfile } from "@concepts";
import { actions, Sync, Frames } from "@engine";
import { ID } from "@utils/types.ts";

const REQUEST_VERIFICATION_PATH = "/EmailVerification/requestVerification";
const VERIFY_EMAIL_PATH = "/EmailVerification/verifyEmail";
const REGISTER_PATH = "/EmailVerification/register";
const VERIFY_CODE_PATH = "/EmailVerification/verifyCode";
const RESEND_CODE_PATH = "/EmailVerification/resendCode";

export const HandleRequestVerificationRequest: Sync = (
  { request, userId, email },
) => ({
  when: actions([
    Requesting.request,
    { path: REQUEST_VERIFICATION_PATH, userId, email },
    { request },
  ]),
  then: actions([EmailVerification.requestVerification, { userId, email }]),
});

export const RespondToRequestVerificationSuccess: Sync = (
  { request, verificationRecordId, verificationCode },
) => ({
  when: actions(
    [Requesting.request, { path: REQUEST_VERIFICATION_PATH }, { request }],
    [
      EmailVerification.requestVerification,
      {},
      { verificationRecordId, verificationCode },
    ],
  ),
  then: actions([
    Requesting.respond,
    { request, verificationRecordId, verificationCode },
  ]),
});

export const RespondToRequestVerificationError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: REQUEST_VERIFICATION_PATH }, { request }],
    [EmailVerification.requestVerification, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const HandleVerifyEmailRequest: Sync = (
  { request, verificationRecordId, verificationCode },
) => ({
  when: actions([
    Requesting.request,
    {
      path: VERIFY_EMAIL_PATH,
      verificationRecordId,
      verificationCode,
    },
    { request },
  ]),
  then: actions([
    EmailVerification.verifyEmail,
    { verificationRecordId, verificationCode },
  ]),
});

export const RespondToVerifyEmailError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_EMAIL_PATH }, { request }],
    [EmailVerification.verifyEmail, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// After successful email verification, create a session for the user
export const CreateSessionAfterEmailVerification: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyEmail, {}, { user }],
  ),
  then: actions([Sessioning.start, { user }]),
});

// After successful email verification via verifyCode, create a session for the user
export const CreateSessionAfterVerifyCode: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyCode, { user }, { success: true }],
  ),
  then: actions([Sessioning.start, { user }]),
});

// After successful email verification, create a user profile (runs asynchronously)
export const CreateProfileAfterEmailVerification: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyEmail, {}, { user }],
  ),
  then: actions([UserProfile.createProfile, { user }]),
});

// After successful email verification via verifyCode, create a user profile (runs asynchronously)
export const CreateProfileAfterVerifyCode: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyCode, { user }, { success: true }],
  ),
  then: actions([UserProfile.createProfile, { user }]),
});

// Respond to verify email with session (responds immediately after session creation, without waiting for profile)
export const RespondToVerifyEmailWithSession: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_EMAIL_PATH }, { request }],
    [EmailVerification.verifyEmail, {}, { user }],
    [Sessioning.start, { user }, { session }],
  ),
  then: actions([Requesting.respond, { request, user, session }]),
});

// Sync: emailVerificationOnRegister
// When PasswordAuthentication.register returns a user, trigger EmailVerification.register
export const emailVerificationOnRegister: Sync = ({ user, email }) => ({
  when: actions(
    [PasswordAuthentication.register, { email }, { user }],
  ),
  where: async (frames) => {
    // Extract email from the register action input
    const emailValue = frames[0][email] as string | undefined;
    if (!emailValue) {
      // If email not in frame, try to get it from the user
      const userId = frames[0][user];
      if (!userId) {
        return new Frames();
      }
      const emailResult = await PasswordAuthentication._getEmail({ user: userId as ID });
      if ("error" in emailResult) {
        return new Frames();
      }
      // Add email to frames
      return frames.map(frame => ({
        ...frame,
        [email]: emailResult.email,
      }));
    }
    return frames;
  },
  then: actions([EmailVerification.register, { user, email }]),
});

// Sync: createProfileOnRegister
// When PasswordAuthentication.register returns a user AND EmailVerification.verifyCode succeeds, create profile
export const createProfileOnRegister: Sync = ({ user }) => ({
  when: actions(
    [PasswordAuthentication.register, {}, { user }],
    [EmailVerification.verifyCode, { user }, { success: true }],
  ),
  then: actions([UserProfile.createProfile, { user }]),
});


// Handle requests to EmailVerification.register
export const HandleRegisterRequest: Sync = ({ request, user, email }) => ({
  when: actions([
    Requesting.request,
    { path: REGISTER_PATH, user, email },
    { request },
  ]),
  then: actions([EmailVerification.register, { user, email }]),
});

// Respond to EmailVerification.register success
// Only matches when there's an actual HTTP request to /EmailVerification/register
// NOTE: This sync should rarely/never match since /EmailVerification/register is typically
// called internally from emailVerificationOnRegister sync, not as a direct HTTP request
export const RespondToRegisterSuccess: Sync = ({ request, user, email }) => ({
  when: actions(
    [Requesting.request, { path: REGISTER_PATH, user, email }, { request }],
    [EmailVerification.register, { user, email }, {}],
  ),
  where: (frames) => {
    try {
      console.log("[RespondToRegisterSuccess.where] Called with frames:", frames);
      console.log("[RespondToRegisterSuccess.where] Frames length:", frames?.length);
      
      // Defensive check: ensure frames exist and have the expected structure
      if (!frames || frames.length === 0) {
        console.log("[RespondToRegisterSuccess.where] No frames or empty frames, returning empty");
        return new Frames();
      }
      
      // The sync requires 2 actions: Requesting.request and EmailVerification.register
      // If matchWhen couldn't find both, frames will be empty or incomplete
      // We need to verify that we actually have both actions matched
      
      // Check each frame to ensure it has the request binding
      // If the Requesting.request for /EmailVerification/register wasn't in the flow,
      // the frame won't have the request binding
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        console.log(`[RespondToRegisterSuccess.where] Processing frame ${i}:`, frame);
        
        if (!frame) {
          console.log(`[RespondToRegisterSuccess.where] Frame ${i} is null/undefined, returning empty`);
          return new Frames();
        }
        
        // Log what symbols are in the frame
        const frameSymbols = Object.getOwnPropertySymbols(frame);
        console.log(`[RespondToRegisterSuccess.where] Frame ${i} has symbols:`, frameSymbols.map(s => s.description || String(s)));
        
        // Critical check: the request binding MUST exist in the frame
        // If it doesn't, this means Requesting.request for /EmailVerification/register
        // was not found in the flow (i.e., this was called from a sync, not an HTTP request)
        console.log(`[RespondToRegisterSuccess.where] Checking frame[request]:`, frame[request]);
        if (frame[request] === undefined) {
          console.log(`[RespondToRegisterSuccess.where] Frame ${i} missing request binding, returning empty`);
          return new Frames();
        }
        
        // Also verify user and email are present
        console.log(`[RespondToRegisterSuccess.where] Checking frame[user]:`, frame[user]);
        console.log(`[RespondToRegisterSuccess.where] Checking frame[email]:`, frame[email]);
        const hasUser = frame[user] !== undefined;
        const hasEmail = frame[email] !== undefined;
        
        if (!hasUser || !hasEmail) {
          console.log(`[RespondToRegisterSuccess.where] Frame ${i} missing user or email, returning empty`);
          return new Frames();
        }
        
        console.log(`[RespondToRegisterSuccess.where] Frame ${i} passed all checks`);
      }
      
      // All frames passed validation - this is a valid HTTP request
      console.log("[RespondToRegisterSuccess.where] All frames passed validation, returning frames");
      return frames;
    } catch (error) {
      // If any error occurs, don't match
      console.error("[RespondToRegisterSuccess.where] Error in where clause:", error);
      console.error("[RespondToRegisterSuccess.where] Error stack:", error instanceof Error ? error.stack : "No stack");
      return new Frames();
    }
  },
  then: actions([Requesting.respond, { request, msg: {} }]),
});

// Respond to EmailVerification.register error
export const RespondToRegisterError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: REGISTER_PATH }, { request }],
    [EmailVerification.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Handle requests to EmailVerification.verifyCode
export const HandleVerifyCodeRequest: Sync = ({ request, user, code }) => ({
  when: actions([
    Requesting.request,
    { path: VERIFY_CODE_PATH, user, code },
    { request },
  ]),
  then: actions([EmailVerification.verifyCode, { user, code }]),
});

// Respond to EmailVerification.verifyCode success with session
export const RespondToVerifyCodeSuccess: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_CODE_PATH, user }, { request }],
    [EmailVerification.verifyCode, { user }, { success: true }],
    [Sessioning.start, { user }, { session }],
  ),
  then: actions([Requesting.respond, { request, success: true, user, session }]),
});

// Respond to EmailVerification.verifyCode error
export const RespondToVerifyCodeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_CODE_PATH }, { request }],
    [EmailVerification.verifyCode, {}, { success: false, error }],
  ),
  then: actions([Requesting.respond, { request, success: false, error }]),
});

// Handle requests to EmailVerification.resendCode
export const HandleResendCodeRequest: Sync = ({ request, user }) => ({
  when: actions([
    Requesting.request,
    { path: RESEND_CODE_PATH, user },
    { request },
  ]),
  then: actions([EmailVerification.resendCode, { user }]),
});

// Respond to EmailVerification.resendCode success
export const RespondToResendCodeSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: RESEND_CODE_PATH }, { request }],
    [EmailVerification.resendCode, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

// Respond to EmailVerification.resendCode error
export const RespondToResendCodeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: RESEND_CODE_PATH }, { request }],
    [EmailVerification.resendCode, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
