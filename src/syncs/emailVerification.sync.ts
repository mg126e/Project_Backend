import { EmailVerification, Requesting } from "@concepts";
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

export const RespondToVerifyEmailSuccess: Sync = (
  { request, user, email },
) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_EMAIL_PATH }, { request }],
    [EmailVerification.verifyEmail, {}, { user, email }],
  ),
  then: actions([Requesting.respond, { request, user, email }]),
});

export const RespondToVerifyEmailError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: VERIFY_EMAIL_PATH }, { request }],
    [EmailVerification.verifyEmail, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
