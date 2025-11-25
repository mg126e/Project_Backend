**UserProfile** [User]
   - **Purpose:** Allow users to share their personal info, including a profile image and key tags for access to running partner features.
   - **Principle:** After setting a display name, uploading a profile image from their device, creating a bio, and adding personal tags (running pace, running level, age, gender, and personality), users can be discovered and matched more effectively.
   - **State:**
       - A set of `Users`, each with:
           - `displayname`: String
           - `profileImage`: Image ( managed by the FileUploading concept; uploaded from user's device)
           - `bio`: String (a biography where users can state more about themselves and what they are looking for, including describing their personal goals)
           - `location`: String
             - `emergencyContact`: Object with fields:
               - `name`: String (contact person's name)
               - `phone`: String (contact's phone number)
           - `tags`: Object with allowed keys: "gender", "age", "runningLevel", "runningPace", "personality" (e.g., "introvert"/"extrovert"). Each key maps to a single value.
           - `isActive`: Boolean
   - **Actions:**
       - `createProfile(user: User): ()`
           - *Requires:* No profile for the given user already exists.
           - *Effects:* Creates a new user profile record for the given user with no initial display name, profile image, location, bio, or tags. The profile is not active (not visible to others) until all required fields are filled out.
       - `setActive(user: User): ()`
           - *Requires:* The user exists in the set of users. All required fields (displayname, profileImage, bio, location, and all required tags) must be filled out.
           - *Effects:* Sets the user's profile to active (visible to others).
       - `setLocation(user: User, location: String): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Updates the user's location.
        - `setEmergencyContact(user: User, name: String, phone: String): ()`
          - *Requires:* The user exists in the set of users.
          - *Effects:* Updates the user's emergency contact (name and phone).
       - `setBio(user: User, bio: String): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Updates the user's biography.
       - `setName(user: User, displayname: String): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Sets the user's display name.
       - `setProfileImage(user: User, image: Image): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Sets the user's profile image to the uploaded image (from file/photo).
       - `setTag(user: User, tagType: String, value: String|Number): ()`
           - *Requires:* The user exists in the set of users. `tagType` must be one of the allowed types: "runningPace", "gender", "age", "runningLevel", "personality" ("introvert"/"extrovert").
           - *Effects:* Sets or updates the tag of the specified type for the user's profile. Only one value per tag type is allowed per user.
       - `removeTag(user: User, tagType: String): ()`
           - *Requires:* The user exists in the set of users and the tag type exists for the user.
           - *Effects:* Removes the tag of the specified type from the user's profile.
       - `closeProfile(user: User): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Permanently deletes the user's profile and all associated data.
    - **Notes:**
        - By requiring that a user must be fully filled in, this helps users feel safer when they are looking for long-term matches
        - We are also going to continue to work on our set of allowed tags as we do testing to see what runners would want to see and filter by the most. Though, users could also discuss the tags within their bio and expand there.
        - Another topic we will navigate is the emergency contact information. A user would provide the phone number of the person. 
        - Integrating FileUploading concept from provided code from course


```typescript
import { Collection, Db } from "mongodb";
import FileUploadingConcept from "../FileUploading/FileUploadingConcept.ts";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserProfile.";

// Generic types for this concept
type User = ID;
type Image = File; // Opaque identifier, managed by FileUploading concept
type File = ID;

/**
 * State:
 * a set of Users with
 *   displayname: String
 *   profileImage: Image
 *   bio: String
 *   location: String
 *   emergencyContact: String
 *   tags: { gender, age, runningLevel, runningPace, personality }
 *   isActive: Boolean
 */
type AllowedTag = "runningPace" | "gender" | "age" | "runningLevel" | "personality";

interface EmergencyContact {
  name: string;
  phone: string;
}

interface UserProfileDoc {
  _id: User;
  displayname?: string;
  profileImage?: Image; // Now stores a File ID
  bio?: string;
  location?: string;
  emergencyContact?: EmergencyContact;
  tags?: Partial<Record<AllowedTag, string | number>>;
  isActive?: boolean;
}

/**
 * @concept UserProfile
 */
export default class UserProfileConcept {

  private userProfiles: Collection<UserProfileDoc>;
  private readonly fileUploading: FileUploadingConcept;

  constructor(private readonly db: Db) {
    this.userProfiles = this.db.collection<UserProfileDoc>(PREFIX + "userProfiles");
    this.fileUploading = new FileUploadingConcept(db);
  }

  /**
   * Helper to get a download URL for the user's profile image using FileUploadingConcept.
   */
  async getProfileImageDownloadURL(user: User): Promise<{ downloadURL: string } | { error: string }> {
    const profile = await this.userProfiles.findOne({ _id: user });
    if (!profile || !profile.profileImage) {
      return { error: "No profile image set for this user." };
    }
    return this.fileUploading.getDownloadURL({ file: profile.profileImage });
  }

  /**
   * createProfile (user: User)
   *
   * @requires no profile for the given user already exists.
   * @effects creates a new user profile record for the given user with no initial display name, profile image, location, bio, or tags. The profile is not active (not visible to others) until all required fields are filled out.
   */
  async createProfile(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const existingProfile = await this.userProfiles.findOne({ _id: user });
    if (existingProfile) {
      return { error: `Profile for user ${user} already exists.` };
    }
    await this.userProfiles.insertOne({
      _id: user,
      displayname: undefined,
      profileImage: undefined,
      bio: undefined,
      location: undefined,
      emergencyContact: undefined,
      tags: {},
      isActive: false,
    });
    return {};
  }

  /**
   * setName (user: User, displayname: String)
   *
   * @requires the user exists in the set of users.
   * @effects sets the user's display name.
   */
  async setName(
    { user, displayname }: { user: User; displayname: string },
  ): Promise<Empty | { error: string }> {
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { displayname } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }

  /**
   * setProfileImage (user: User, image: Image)
   *
   * @requires the user exists in the set of users.
   * @effects sets the user's profile image to the given file ID (opaque identifier).
   */
  async setProfileImage(
    { user, image }: { user: User; image: Image },
  ): Promise<Empty | { error: string }> {
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { profileImage: image } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }
  /**
   * setBio (user: User, bio: String)
   *
   * @requires the user exists in the set of users.
   * @effects updates the user's biography.
   */
  async setBio(
    { user, bio }: { user: User; bio: string },
  ): Promise<Empty | { error: string }> {
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { bio } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }

  /**
   * setLocation (user: User, location: String)
   *
   * @requires the user exists in the set of users.
   * @effects updates the user's location.
   */
  async setLocation(
    { user, location }: { user: User; location: string },
  ): Promise<Empty | { error: string }> {
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { location } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }

  /**
   * setEmergencyContact (user: User, name: String, phone: String)
   *
   * @requires the user exists in the set of users.
   * @effects updates the user's emergency contact (name and phone).
   */
  async setEmergencyContact(
    { user, name, phone }: { user: User; name: string; phone: string },
  ): Promise<Empty | { error: string }> {
    const emergencyContact = { name, phone };
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { emergencyContact } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }

  /**
   * setTag (user: User, tagType: String, value: String|Number)
   *
   * @requires the user exists in the set of users. tagType must be one of the allowed types.
   * @effects sets or updates the tag of the specified type for the user's profile. Only one value per tag type is allowed per user.
   */
  async setTag(
    { user, tagType, value }: { user: User; tagType: AllowedTag; value: string | number },
  ): Promise<Empty | { error: string }> {
    const allowedTags: AllowedTag[] = ["runningPace", "gender", "age", "runningLevel", "personality"];
    if (!allowedTags.includes(tagType)) {
      return { error: `Tag type '${tagType}' is not allowed.` };
    }
    const profile = await this.userProfiles.findOne({ _id: user });
    if (!profile) {
      return { error: `User profile for ${user} not found.` };
    }
    const tags: Partial<Record<AllowedTag, string | number>> = { ...(profile.tags || {}) };
    tags[tagType] = value;
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { tags } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }

  /**
   * removeTag (user: User, tagType: String)
   *
   * @requires the user exists in the set of users and the tag type exists for the user.
   * @effects removes the tag of the specified type from the user's profile.
   */
  async removeTag(
    { user, tagType }: { user: User; tagType: AllowedTag },
  ): Promise<Empty | { error: string }> {
    const allowedTags: AllowedTag[] = ["runningPace", "gender", "age", "runningLevel", "personality"];
    if (!allowedTags.includes(tagType)) {
      return { error: `Tag type '${tagType}' is not allowed.` };
    }
    const profile = await this.userProfiles.findOne({ _id: user });
    if (!profile || !profile.tags || !(tagType in profile.tags)) {
      return { error: `Tag type '${tagType}' not found for user ${user}.` };
    }
    const tags: Partial<Record<AllowedTag, string | number>> = { ...profile.tags };
    delete tags[tagType];
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { tags } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }
}
```