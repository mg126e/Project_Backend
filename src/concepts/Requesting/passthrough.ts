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
  "/api/FileUploading/_getDownloadURL":
    "read-only query to get download URL for uploaded files",
  "/api/FileUploading/_getOwner":
    "public query to get file owner (non-sensitive)",
  "/api/FileUploading/_getFilename":
    "public query to get file name (non-sensitive)",
  "/api/FileUploading/getFileContent":
    "public query to get file content (if access controlled elsewhere)",
  "/api/FileUploading/_getFilesByOwner":
    "public query to list files by owner (for user dashboards)",
  "/api/PasswordAuthentication/deleteUser":
    "admin or user-initiated account deletion (should be access controlled)",
  "/api/PasswordAuthentication/_getUsername":
    "public query to get username from user ID (non-sensitive)",
  "/api/Sessioning/start":
    "public action to start a session (login)",
  "/api/Sessioning/end":
    "public action to end a session (logout)",
  "/api/Sessioning/_getUser":
    "public query to get user from session (non-sensitive)",
  "/api/SharedGoals/initializeLLM":
    "public action to initialize LLM for shared goals (if safe)",
  "/api/SharedGoals/validateStepQuality":
    "public action to validate step quality (if safe)",
  "/api/SharedGoals/generateSharedSteps":
    "public action to generate shared steps (if safe)",
  "/api/SharedGoals/regenerateSharedSteps":
    "public action to regenerate shared steps (if safe)",
  "/api/SharedGoals/addSharedStep":
    "public action to add shared step (if access controlled elsewhere)",
  "/api/SharedGoals/completeSharedStep":
    "public action to complete shared step (if access controlled elsewhere)",
  "/api/SharedGoals/removeSharedStep":
    "public action to remove shared step (if access controlled elsewhere)",
  "/api/SharedGoals/closeSharedGoal":
    "public action to close shared goal (if access controlled elsewhere)",
  "/api/SharedGoals/setInitialized":
    "public action to set shared goal as initialized (if access controlled elsewhere)",
  "/api/UserProfile/getProfileImageDownloadURL":
    "public query to get profile image download URL (non-sensitive)",
  "/api/UserProfile/_getProfilesByLocation":
    "public query to get profiles by location for partner discovery",
  "/api/UserProfile/_getAllProfiles":
    "public query to get all profiles for partner discovery and matching",
  "/api/UserProfile/_getDisplayName":
    "public query to get display name for a user",
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
  "/api/PasswordAuthentication/register",
  "/api/PasswordAuthentication/authenticate",
  "/api/PasswordAuthentication/changePassword",
  "/api/logout",
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
  "/api/SharedGoals/createSharedGoal",
  "/api/SharedGoals/setDescription",
  "/api/SharedGoals/setDate",
  "/api/SharedGoals/setTime",
  "/api/SharedGoals/setNotes",
  "/api/SharedGoals/setDuration",
  "/api/SharedGoals/setLocation",
  "/api/SharedGoals/addParticipant",
  "/api/SharedGoals/removeParticipant",
  "/api/SharedGoals/addStep",
  "/api/SharedGoals/completeStep",
  "/api/SharedGoals/uncompleteStep",
  "/api/SharedGoals/removeStep",
  "/api/SharedGoals/activateGoal",
  "/api/SharedGoals/deactivateGoal",
  "/api/SharedGoals/_getAllGoalsForUser",
  "/api/SharedGoals/_getSharedGoals",
  "/api/SharedGoals/_getSharedGoalById",
  "/api/SharedGoals/_getSharedSteps",
];
