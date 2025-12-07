# API Specification


This document provides the REST API specification for all concepts in the RunBuddy application.

**Base URL:** `/api`

## Authentication
Most endpoints require authentication via session cookies. Sessions are created upon successful login and must be included in subsequent requests.

---

## Authentication & Authorization

### Register User
**POST** `/PasswordAuthentication/register`

Creates a new user account with email verification.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "verificationRecordId": "ID",
  "verificationCode": "string"
}
```

**Response (Success):**
```json
{
  "user": "ID"
}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

**Notes:**
- Email verification is required before registration
- `verificationRecordId` and `verificationCode` must be obtained via the email verification flow
- Password must meet security requirements

---

### Login
**POST** `/PasswordAuthentication/authenticate`

Authenticates a user and creates a session.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (Success):**
```json
{
  "user": "ID"
}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

**Notes:**
- Returns session cookie upon success
- Email must be verified before login is allowed

---

### Logout
**POST** `/logout`

Ends the current user session.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Response:**
```json
{}
```

---

### Change Password
**POST** `/PasswordAuthentication/changePassword`

Changes the password for the authenticated user.

**Request Body:**
```json
{
  "session": "ID",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

## Email Verification

### Request Email Verification
**POST** `/EmailVerification/requestVerification`

Sends a verification code to the specified email address.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:**
```json
{
  "verificationRecordId": "ID"
}
```

---

### Verify Email
**POST** `/EmailVerification/verifyEmail`

Confirms an email address using the verification code.

**Request Body:**
```json
{
  "verificationRecordId": "ID",
  "verificationCode": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

## User Profile

### Create Profile
**POST** `/UserProfile/createProfile`

Creates a user profile for the authenticated user.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Set Display Name
**POST** `/UserProfile/setName`

Updates the user's display name.

**Request Body:**
```json
{
  "session": "ID",
  "displayname": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Set Bio
**POST** `/UserProfile/setBio`

Updates the user's bio/description.

**Request Body:**
```json
{
  "session": "ID",
  "bio": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Set Location
**POST** `/UserProfile/setLocation`

Updates the user's location.

**Request Body:**
```json
{
  "session": "ID",
  "location": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Set Emergency Contact
**POST** `/UserProfile/setEmergencyContact`

Updates the user's emergency contact information.

**Request Body:**
```json
{
  "session": "ID",
  "emergencyContact": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Set Tag
**POST** `/UserProfile/setTag`

Adds or updates a tag for the user's profile.

**Request Body:**
```json
{
  "session": "ID",
  "tag": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Set Profile Image
**POST** `/UserProfile/setProfileImage`

Sets the user's profile image.

**Request Body:**
```json
{
  "session": "ID",
  "profileImageFileId": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

**Notes:**
- `profileImageFileId` must reference a file uploaded via the FileUploading concept

---

### Get Profile Image Download URL
**POST** `/UserProfile/getProfileImageDownloadURL`

Retrieves a download URL for the user's profile image.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Response:**
```json
{
  "downloadURL": "string"
}
```

---

### Set Active Status
**POST** `/UserProfile/setIsActive`

Sets whether the user's profile is active.

**Request Body:**
```json
{
  "session": "ID",
  "isActive": "boolean"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Close Profile
**POST** `/UserProfile/closeProfile`

Closes the user's profile.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Get Profile
**POST** `/UserProfile/_getProfile`

Retrieves a user's profile information.

**Request Body:**
```json
{
  "session": "ID",
  "userId": "ID"
}
```

**Response:**
```json
{
  "profile": {
    "user": "ID",
    "displayname": "string",
    "bio": "string",
    "location": "string",
    "emergencyContact": "string",
    "tags": ["string"],
    "profileImageFileId": "ID",
    "isActive": "boolean"
  }
}
```

---

## File Uploading

### Request Upload URL
**POST** `/FileUploading/requestUploadURL`

Requests a presigned URL to upload a file.

**Request Body:**
```json
{
  "session": "ID",
  "filename": "string"
}
```

**Response:**
```json
{
  "uploadURL": "string",
  "fileId": "ID"
}
```

---

### Confirm Upload
**POST** `/FileUploading/confirmUpload`

Confirms that a file has been successfully uploaded.

**Request Body:**
```json
{
  "file": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Delete File
**POST** `/FileUploading/delete`

Deletes an uploaded file.

**Request Body:**
```json
{
  "session": "ID",
  "file": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

## Partner Matching

### Suggest Match
**POST** `/PartnerMatching/suggestMatch`

Creates a partner suggestion for a user.

**Request Body:**
```json
{
  "recipient": "ID",
  "candidate": "ID"
}
```

**Response:**
```json
{
  "suggestion": "ID"
}
```

**Notes:**
- Typically triggered automatically after completing a one-run match

---

### Accept Suggestion
**POST** `/PartnerMatching/acceptSuggestion`

Accepts a partner suggestion.

**Request Body:**
```json
{
  "session": "ID",
  "suggestionId": "ID"
}
```

**Response:**
```json
{
  "suggestion": "ID",
  "match": "ID" // Only present if mutual acceptance occurs
}
```

---

### Decline Suggestion
**POST** `/PartnerMatching/declineSuggestion`

Declines a partner suggestion.

**Request Body:**
```json
{
  "session": "ID",
  "suggestionId": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### End Partnership
**POST** `/PartnerMatching/endPartnership`

Ends an active partnership.

**Request Body:**
```json
{
  "session": "ID",
  "partnerId": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

## One Run Matching

### Create Invite
**POST** `/OneRunMatching/createInvite`

Creates an invitation for a one-time run.

**Request Body:**
```json
{
  "session": "ID",
  "candidate": "ID",
  "scheduledTime": "Date"
}
```

**Response:**
```json
{
  "invite": "ID"
}
```

---

### Accept Invite
**POST** `/OneRunMatching/acceptInvite`

Accepts a run invitation.

**Request Body:**
```json
{
  "session": "ID",
  "invite": "ID"
}
```

**Response:**
```json
{
  "scheduledRun": "ID"
}
```

---

### Decline Invite
**POST** `/OneRunMatching/declineInvite`

Declines a run invitation.

**Request Body:**
```json
{
  "session": "ID",
  "invite": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Cancel Run
**POST** `/OneRunMatching/cancelRun`

Cancels a scheduled run.

**Request Body:**
```json
{
  "session": "ID",
  "run": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Complete Run
**POST** `/OneRunMatching/completeRun`

Marks a run as completed.

**Request Body:**
```json
{
  "session": "ID",
  "run": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

**Notes:**
- Completing a run triggers partner suggestions for both participants

---

## Messaging

### Send Message
**POST** `/Messaging/sendMessage`

Sends a message in a chat thread.

**Request Body:**
```json
{
  "session": "ID",
  "thread": "ID",
  "content": "string"
}
```

**Response:**
```json
{
  "message": "ID"
}
```

---

### Edit Message
**POST** `/Messaging/editMessage`

Edits an existing message.

**Request Body:**
```json
{
  "session": "ID",
  "message": "ID",
  "content": "string"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Delete Message
**POST** `/Messaging/deleteMessage`

Deletes a message.

**Request Body:**
```json
{
  "session": "ID",
  "message": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

## Shared Goals

### Create Shared Goal
**POST** `/SharedGoals/createSharedGoal`

Creates a shared goal between partners.

**Request Body:**
```json
{
  "session": "ID",
  "users": ["ID", "ID"],
  "description": "string"
}
```

**Response:**
```json
{
  "sharedGoalId": "ID"
}
```

---

### Generate Shared Steps
**POST** `/SharedGoals/generateSharedSteps`

Generates AI-powered steps for a shared goal.

**Request Body:**
```json
{
  "session": "ID",
  "sharedGoal": "ID"
}
```

**Response:**
```json
{
  "steps": [
    {
      "id": "ID",
      "description": "string",
      "isCompleted": "boolean",
      "completedAt": "Date | null"
    }
  ]
}
```

---

### Regenerate Shared Steps
**POST** `/SharedGoals/regenerateSharedSteps`

Regenerates AI-powered steps for a shared goal.

**Request Body:**
```json
{
  "session": "ID",
  "sharedGoal": "ID"
}
```

**Response:**
```json
{
  "steps": [
    {
      "id": "ID",
      "description": "string",
      "isCompleted": "boolean",
      "completedAt": "Date | null"
    }
  ]
}
```

---

### Add Shared Step
**POST** `/SharedGoals/addSharedStep`

Manually adds a step to a shared goal.

**Request Body:**
```json
{
  "session": "ID",
  "sharedGoal": "ID",
  "description": "string"
}
```

**Response:**
```json
{
  "stepId": "ID"
}
```

---

### Complete Shared Step
**POST** `/SharedGoals/completeSharedStep`

Marks a step as completed.

**Request Body:**
```json
{
  "session": "ID",
  "step": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Remove Shared Step
**POST** `/SharedGoals/removeSharedStep`

Removes a step from a shared goal.

**Request Body:**
```json
{
  "session": "ID",
  "step": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Close Shared Goal
**POST** `/SharedGoals/closeSharedGoal`

Closes a shared goal.

**Request Body:**
```json
{
  "session": "ID",
  "sharedGoal": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Get All Goals for User
**POST** `/SharedGoals/_getAllGoalsForUser`

Retrieves all shared goals for the authenticated user.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Response:**
```json
{
  "goals": [
    {
      "id": "ID",
      "users": ["ID", "ID"],
      "description": "string",
      "createdAt": "Date",
      "isActive": "boolean"
    }
  ]
}
```

---

### Get Shared Goals
**POST** `/SharedGoals/_getSharedGoals`

Retrieves shared goals for a specific user pair.

**Request Body:**
```json
{
  "session": "ID",
  "users": ["ID", "ID"]
}
```

**Response:**
```json
{
  "goals": [
    {
      "id": "ID",
      "users": ["ID", "ID"],
      "description": "string",
      "createdAt": "Date",
      "isActive": "boolean"
    }
  ]
}
```

---

### Get Shared Goal by ID
**POST** `/SharedGoals/_getSharedGoalById`

Retrieves a specific shared goal by its ID.

**Request Body:**
```json
{
  "session": "ID",
  "users": ["ID", "ID"],
  "sharedGoalId": "ID"
}
```

**Response:**
```json
{
  "goal": {
    "id": "ID",
    "users": ["ID", "ID"],
    "description": "string",
    "createdAt": "Date",
    "isActive": "boolean"
  }
}
```

---

### Get Shared Steps
**POST** `/SharedGoals/_getSharedSteps`

Retrieves all steps for a shared goal.

**Request Body:**
```json
{
  "session": "ID",
  "sharedGoal": "ID"
}
```

**Response:**
```json
{
  "steps": [
    {
      "id": "ID",
      "description": "string",
      "isCompleted": "boolean",
      "completedAt": "Date | null"
    }
  ]
}
```

---

## Milestone Map

### Create Milestone Map
**POST** `/MilestoneMap/createMilestoneMap`

Creates a shared milestone map for a set of users (typically two partners).

**Request Body:**
```json
{
  "session": "ID",
  "users": ["ID", "ID"]
}
```

**Response:**
```json
{
  "milestoneMapId": "ID"
}
```

**Notes:**
- Requires at least 2 users
- Authenticated user must be included in the users array
- Frontend typically uses 2 users, but the backend supports any number of users for modularity

---

### Add Milestone
**POST** `/MilestoneMap/addMilestone`

Adds a milestone to a shared map.

**Request Body:**
```json
{
  "session": "ID",
  "milestoneMapId": "ID",
  "latitude": "number",
  "longitude": "number",
  "title": "string",
  "description": "string",
  "photoFileId": "ID" // Optional
}
```

**Response:**
```json
{
  "milestoneId": "ID"
}
```

---

### Remove Milestone
**POST** `/MilestoneMap/removeMilestone`

Removes a milestone from a shared map.

**Request Body:**
```json
{
  "session": "ID",
  "milestoneId": "ID"
}
```

**Response (Success):**
```json
{}
```

**Response (Error):**
```json
{
  "error": "string"
}
```

---

### Get Milestone Map
**POST** `/MilestoneMap/getMilestoneMap`

Retrieves a milestone map for a set of users.

**Request Body:**
```json
{
  "session": "ID",
  "users": ["ID", "ID"]
}
```

**Response:**
```json
{
  "milestoneMap": {
    "id": "ID",
    "users": ["ID", "ID"],
    "createdAt": "Date"
  }
}
```

---

### Get Milestones
**POST** `/MilestoneMap/getMilestones`

Retrieves all milestones for a specific map.

**Request Body:**
```json
{
  "session": "ID",
  "milestoneMapId": "ID"
}
```

**Response:**
```json
{
  "milestones": [
    {
      "id": "ID",
      "latitude": "number",
      "longitude": "number",
      "title": "string",
      "description": "string",
      "addedBy": "ID",
      "photoFileId": "ID", // Only present if photo was added
      "createdAt": "Date"
    }
  ]
}
```

---

### Get All Maps for User
**POST** `/MilestoneMap/getAllMapsForUser`

Retrieves all milestone maps for the authenticated user.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Response:**
```json
{
  "maps": [
    {
      "id": "ID",
      "users": ["ID", "ID"],
      "createdAt": "Date",
      "isActive": "boolean"
    }
  ]
}
```

---

## Error Handling

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common error scenarios:
- **401 Unauthorized**: Invalid or missing session
- **403 Forbidden**: User lacks permission for the requested operation
- **404 Not Found**: Requested resource does not exist
- **400 Bad Request**: Invalid request parameters
- **500 Internal Server Error**: Server-side error

---

## Data Types

### ID
A unique identifier string in the format `prefix:uuid` (e.g., `user:123e4567-e89b-12d3-a456-426614174000`)

### Date
ISO 8601 formatted date-time string (e.g., `2025-12-07T10:30:00.000Z`)

---

## Notes

- All POST requests expect JSON request bodies
- All responses are in JSON format
- Session authentication is required for most endpoints
- File uploads use a two-step process: request upload URL, then confirm upload
- Concept queries (prefixed with `_`) are read-only operations
- Some operations trigger automatic syncs (e.g., completing a run triggers partner suggestions)
