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
import { actions, Sync } from "@engine";
import { PasswordAuthentication, Requesting, Sessioning } from "@concepts";

//-- User Registration --//
export const RegisterRequest: Sync = ({ request, username, password, email }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuthentication/register", username, password, email },
    { request },
  ]),
  then: actions([PasswordAuthentication.register, { username, password, email }]),
});

// Session and profile creation moved to email verification completion
// Users must verify their email before getting a session



export const RegisterResponseSuccess: Sync = ({ request, user }) => {
  console.log("[RegisterResponseSuccess] user:", user);
  return {
    when: actions(
      [Requesting.request, { path: "/PasswordAuthentication/register" }, { request }],
      [PasswordAuthentication.register, {}, { user }],
    ),
    then: actions([Requesting.respond, { request, user, msg: { requiresEmailVerification: true } }]),
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

import { EmailVerification } from "@concepts";

import { ID } from "@utils/types.ts";
import { Frames } from "@engine";

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
