import { Collection, Database } from "@deps/mongo";
import FileUploadingConcept from "../FileUploading/FileUploadingConcept.ts";
import { Empty, ID } from "@utils/types.ts";

const PREFIX = "Userprofile.";

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
export type AllowedTag = "runningPace" | "gender" | "age" | "runningLevel" | "personality";

interface EmergencyContact {
  name: string;
  phone: string;
}

interface UserProfileDoc {
  _id: User;
  displayname?: string;
  profileImage?: Image; // Now stores a File ID, using FileUploading concept
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

  constructor(private readonly db: Database) {
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
    const result = await this.fileUploading._getDownloadURL({ file: profile.profileImage });
    if (result.length === 0) {
      return { error: "Failed to get download URL for profile image." };
    }
    return { downloadURL: result[0].downloadURL };
  }

  /**
   * createProfile (user: User)
   *
   * @requires no profile for the given user already exists.
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
   * setIsActive (user: User, isActive: boolean)
   *
   * @requires the user exists in the set of users.
   * @effects sets the user's isActive field to the given boolean value.
   */
  async setIsActive(
    { user, isActive }: { user: User; isActive: boolean },
  ): Promise<Empty | { error: string }> {
    const result = await this.userProfiles.updateOne(
      { _id: user },
      { $set: { isActive } },
    );
    if (result.matchedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
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
   * closeAccount (user: User)
   *
   * @requires the user exists in the set of users.
   * @effects closes the user's profile permanently.
   */
  async closeProfile(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.userProfiles.deleteOne({ _id: user });
    if (result.deletedCount === 0) {
      return { error: `User profile for ${user} not found.` };
    }
    return {};
  }

  /**
   * getProfile (user: User)
   *
   * @requires the user exists in the set of users.
   * @returns the user's profile document, or an error if not found.
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<UserProfileDoc | { error: string }> {
    const profile = await this.userProfiles.findOne({ _id: user });
    if (!profile) {
      return { error: `User profile for ${user} not found.` };
    }
    return profile;
  }
}