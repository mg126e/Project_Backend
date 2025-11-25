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