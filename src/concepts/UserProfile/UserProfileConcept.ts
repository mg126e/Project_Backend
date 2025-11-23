import { Collection, Db } from "mongodb";
import { Storage } from "npm:@google-cloud/storage";
import { extname } from "@std/path/extname";
import { contentType } from "jsr:@std/media-types/content-type";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserProfile.";

// Generic types for this concept
type User = ID;
type Image = string; // URL or base64 string
type File = ID;
// Prefix for profile image files collection
const PROFILE_IMAGE_PREFIX = PREFIX + "profileImages.";

/**
 * State for a Profile Image File, representing its metadata in the database.
 * a set of Files with
 *   an owner User
 *   a filename String
 *   a storagePath String (e.g., the path/key of the object in the GCS bucket)
 *   a status String (values: "pending", "uploaded")
 */
interface ProfileImageFileState {
  _id: File;
  owner: User;
  filename: string;
  storagePath: string;
  status: "pending" | "uploaded";
}


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

interface UserProfileDoc {
  _id: User;
  displayname?: string;
  profileImage?: Image;
  bio?: string;
  location?: string;
  emergencyContact?: string;
  tags?: Partial<Record<AllowedTag, string | number>>;
  isActive?: boolean;
}

/**
 * State:
 * a set of Hobbies with
 *   an active status Boolean
 *
 * A collection representing the relationship between a user and a specific hobby,
 * along with whether that hobby is currently active for that user.
 */
interface UserHobbyDoc {
  _id: ID; // Unique ID for this specific user-hobby relationship record
  userId: User; // The ID of the user
  hobby: string;
  active: boolean;
}

/**
 * @concept UserProfile
 * @purpose allow users to share their personal info
 * @principle after setting a name, hobby, and image for a user, other users can see them
 */
export default class UserProfileConcept {

  private userProfiles: Collection<UserProfileDoc>;
  public readonly profileImages: Collection<ProfileImageFileState>;
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly db: Db) {
    this.userProfiles = this.db.collection<UserProfileDoc>(PREFIX + "userProfiles");
    this.profileImages = this.db.collection<ProfileImageFileState>(PROFILE_IMAGE_PREFIX + "files");

    // Initialize Google Cloud Storage client from environment variables
    this.bucketName = Deno.env.get("FILE_UPLOADING_GCS_BUCKET_NAME")!;
    const projectId = Deno.env.get("FILE_UPLOADING_GCS_PROJECT_ID");
    const privateKey = Deno.env.get("FILE_UPLOADING_GCS_PRIVATE_KEY")?.replace(/\\n/g, "\n");
    const clientEmail = Deno.env.get("FILE_UPLOADING_GCS_CLIENT_EMAIL");
    if (!this.bucketName || !projectId || !privateKey || !clientEmail) {
      throw new Error("Missing required GCS environment variables for UserProfileConcept file uploading. Please check your .env file.");
    }
    this.storage = new Storage({
      projectId,
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
    });
  }
  /**
   * requestProfileImageUploadURL (owner: User, filename: String): (file: File, uploadURL: String)
   *
   * @requires true.
   * @effects creates a new File f with status 'pending', owner, and filename; generates a unique storagePath for f; generates a presigned GCS upload URL; returns the new file's ID and the URL.
   */
  async requestProfileImageUploadURL(
    { owner, filename }: { owner: User; filename: string },
  ): Promise<{ file: File; uploadURL: string } | { error: string }> {
    const newFileId = (Math.random().toString(36).slice(2) + Date.now()) as File;
    const storagePath = `${newFileId}/${filename}`;
    const newFile: ProfileImageFileState = {
      _id: newFileId,
      owner,
      filename,
      storagePath,
      status: "pending",
    };
    try {
      const extension = extname(filename);
      const inferredContentType = contentType(extension) || "application/octet-stream";
      const options = {
        version: "v4" as const,
        action: "write" as const,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: inferredContentType,
      };
      const [url] = await this.storage.bucket(this.bucketName).file(storagePath).getSignedUrl(options);
      await this.profileImages.insertOne(newFile);
      return { file: newFileId, uploadURL: url };
    } catch (e) {
      console.error("UserProfileConcept: Error generating upload URL:", e);
      return { error: "Failed to generate an upload URL." };
    }
  }

  /**
   * confirmProfileImageUpload (file: File, user: User): () | (error: String)
   *
   * @requires a File f exists and its status is "pending".
   * @effects sets the status of f to "uploaded" and updates the user's profileImage field. If conditions not met, returns an error.
   */
  async confirmProfileImageUpload(
    { file, user }: { file: File; user: User },
  ): Promise<Empty | { error: string }> {
    const fileRecord = await this.profileImages.findOne({ _id: file });
    if (!fileRecord) {
      return { error: "File not found." };
    }
    if (fileRecord.status !== "pending") {
      return { error: `File is not in 'pending' state. Current state: ${fileRecord.status}` };
    }
    const result = await this.profileImages.updateOne({ _id: file }, { $set: { status: "uploaded" } });
    if (result.modifiedCount === 0) {
      return { error: "Failed to confirm upload." };
    }
    // Save the storagePath as the user's profileImage
    await this.userProfiles.updateOne(
      { _id: user },
      { $set: { profileImage: fileRecord.storagePath } },
    );
    return {};
  }

  /**
   * getProfileImageDownloadURL (file: File): (downloadURL: String)
   *
   * @requires the given file exists and its status is "uploaded".
   * @effects generates a short-lived, presigned GCS download URL for the file and returns it.
   */
  async getProfileImageDownloadURL(
    { file }: { file: File },
  ): Promise<{ downloadURL: string } | { error: string }> {
    const fileRecord = await this.profileImages.findOne({ _id: file, status: "uploaded" });
    if (!fileRecord) {
      return { error: "File not found or not uploaded." };
    }
    try {
      const options = {
        version: "v4" as const,
        action: "read" as const,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      };
      const [url] = await this.storage.bucket(this.bucketName).file(fileRecord.storagePath).getSignedUrl(options);
      return { downloadURL: url };
    } catch (e) {
      console.error(`UserProfileConcept: Failed to generate download URL for file ${file}:`, e);
      return { error: "Failed to generate download URL." };
    }
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
   * @effects sets the user's profile image to the uploaded image (from file/photo).
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
   * setEmergencyContact (user: User, emergencyContact: String)
   *
   * @requires the user exists in the set of users.
   * @effects updates the user's emergency contact.
   */
  async setEmergencyContact(
    { user, emergencyContact }: { user: User; emergencyContact: string },
  ): Promise<Empty | { error: string }> {
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