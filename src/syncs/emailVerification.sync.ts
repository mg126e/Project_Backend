import { EmailVerification, PasswordAuthentication, Requesting, Sessioning, UserProfile } from "@concepts";
import { actions, Sync } from "@engine";

const REQUEST_VERIFICATION_PATH = "/EmailVerification/requestVerification";
const VERIFY_EMAIL_PATH = "/EmailVerification/verifyEmail";

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

// After successful email verification, mark the user as verified in PasswordAuthentication
export const MarkUserEmailVerifiedOnSuccess: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyEmail, {}, { user }],
  ),
  then: actions([PasswordAuthentication.markEmailVerified, { user }]),
});

// After marking email as verified, create a session for the user
export const CreateSessionAfterEmailVerification: Sync = ({ user }) => ({
  when: actions(
    [EmailVerification.verifyEmail, {}, { user }],
    [PasswordAuthentication.markEmailVerified, { user }, {}],
  ),
  then: actions([Sessioning.start, { user }]),
});

// After marking email as verified, create a profile for the user
export const CreateProfileAfterEmailVerification: Sync = ({ user }) => {
  console.log("[CreateProfileAfterEmailVerification] Creating profile for user:", user);
  return {
    when: actions(
      [EmailVerification.verifyEmail, {}, { user }],
      [PasswordAuthentication.markEmailVerified, { user }, {}],
    ),
    then: actions([UserProfile.createProfile, { user }]),
  };
};

// Update the verify email response to include the session
export const RespondToVerifyEmailWithSession: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_EMAIL_PATH }, { request }],
    [EmailVerification.verifyEmail, {}, { user }],
    [Sessioning.start, { user }, { session }],
    [UserProfile.createProfile, { user }, {}],
  ),
  then: actions([Requesting.respond, { request, user, session, verified: true }]),
});
