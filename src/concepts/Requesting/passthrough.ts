/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  "/api/EmailVerification/_getVerificationRecord":
    "read-only diagnostic query for admins",
  "/api/EmailVerification/_getPendingVerificationForUserEmail":
    "read-only status check needed for support tooling",
  "/api/EmailVerification/_getVerifiedEmailsForUser":
    "read-only list used by support dashboards",
  "/api/FileUploading/confirmUpload":
    "public action to confirm file upload completion",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  "/api/EmailVerification/requestVerification",
  "/api/EmailVerification/verifyEmail",
  "/api/UserProfile/createProfile",
  "/api/UserProfile/setName",
  "/api/UserProfile/setBio",
  "/api/UserProfile/setLocation",
  "/api/UserProfile/setEmergencyContact",
  "/api/UserProfile/setTag",
  "/api/UserProfile/setProfileImage",
  "/api/UserProfile/setIsActive",
  "/api/UserProfile/closeProfile",
  "/api/UserProfile/_getProfile",
  "/api/FileUploading/requestUploadURL",
  "/api/FileUploading/delete",
];
