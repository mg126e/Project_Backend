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

// After email verification, create a profile for the user
export const CreateProfileAfterEmailVerification: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyEmail, {}, { user }],
  ),
  then: actions([UserProfile.createProfile, { user }]),
});

export const RespondToVerifyEmailWithSession: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_EMAIL_PATH }, { request }],
    [EmailVerification.verifyEmail, {}, { user }],
    [Sessioning.start, { user }, { session }],
    [UserProfile.createProfile, { user }, {}],
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

// Create profile when verifyCode succeeds (for users who may have registered earlier)
export const CreateProfileAfterVerifyCode: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyCode, { user }, { success: true }],
  ),
  where: async (frames) => {
    // Only create profile if one doesn't already exist
    const userId = frames[0][user] as ID;
    try {
      const profile = await UserProfile._getProfile({ user: userId });
      if ("error" in profile) {
        // Profile doesn't exist, allow creation
        return frames;
      }
      // Profile already exists, don't create
      return new Frames();
    } catch {
      // On error, allow creation attempt
      return frames;
    }
  },
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
export const RespondToRegisterSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: REGISTER_PATH }, { request }],
    [EmailVerification.register, {}, {}],
  ),
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

// Respond to EmailVerification.verifyCode success
export const RespondToVerifyCodeSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_CODE_PATH }, { request }],
    [EmailVerification.verifyCode, {}, { success: true }],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
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
