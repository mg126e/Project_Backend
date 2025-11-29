import { Collection, Db } from "npm:mongodb";
import { Storage } from "npm:@google-cloud/storage";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { extname } from "@std/path/extname";
import { contentType } from "jsr:@std/media-types/content-type";

// Generic types used by this concept
type User = ID;
type File = ID;

// Prefix for MongoDB collections to avoid name collisions
const PREFIX = "FileUploading" + ".";

/**
 * State for a File, representing its metadata in the database.
 *
 * a set of `File`s with
 *   an `owner` User
 *   a `filename` String
 *   a `storagePath` String (e.g., the path/key of the object in the GCS bucket)
 *   a `status` String (values: "pending", "uploaded")
 */
interface FileState {
  _id: File;
  owner: User;
  filename: string;
  storagePath: string;
  status: "pending" | "uploaded";
}

/**
 * @concept FileUploading
 * @purpose To manage the lifecycle and metadata of user-owned files stored in an external cloud service.
 */
export default class FileUploadingConcept {
  public readonly files: Collection<FileState>;
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly db: Db) {
    this.files = this.db.collection<FileState>(PREFIX + "files");

    // Initialize Google Cloud Storage client from environment variables
    this.bucketName = Deno.env.get("FILE_UPLOADING_GCS_BUCKET_NAME")!;
    const projectId = Deno.env.get("FILE_UPLOADING_GCS_PROJECT_ID");
    // The private key from the JSON file often has newlines that need to be parsed correctly
    const privateKey = Deno.env.get("FILE_UPLOADING_GCS_PRIVATE_KEY")?.replace(
      /\\n/g,
      "\n",
    );
    const clientEmail = Deno.env.get("FILE_UPLOADING_GCS_CLIENT_EMAIL");

    if (!this.bucketName || !projectId || !privateKey || !clientEmail) {
      throw new Error(
        "Missing required GCS environment variables for FileUploadingConcept. Please check your .env file.",
      );
    }

    this.storage = new Storage({
      projectId,
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
    });
  }

  // === ACTIONS ===

  /**
   * requestUploadURL (owner: User, filename: String): (file: File, uploadURL: String)
   *
   * **requires**: true.
   * **effects**: creates a new File `f` with status `pending`, owner `owner`, and filename `filename`;
   *             generates a unique `storagePath` for `f`; generates a presigned GCS upload URL
   *             corresponding to that path; returns the new file's ID and the URL.
   */
  async requestUploadURL(
    { owner, filename }: { owner: User; filename: string },
  ): Promise<{ file: File; uploadURL: string } | { error: string }> {
    const newFileId = freshID() as File;
    const storagePath = `${newFileId}/${filename}`; // Use the unique ID to prevent path collisions

    const newFile: FileState = {
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
        expires: Date.now() + 15 * 60 * 1000, // URL is valid for 15 minutes
        contentType: inferredContentType,
      };

      const [url] = await this.storage.bucket(this.bucketName).file(storagePath)
        .getSignedUrl(options);

      await this.files.insertOne(newFile);

      return { file: newFileId, uploadURL: url };
    } catch (e) {
      console.error("FileUploadingConcept: Error generating upload URL:", e);
      return { error: "Failed to generate an upload URL." };
    }
  }

  /**
   * confirmUpload (file: File): () | (error: String)
   *
   * **requires**: a File `f` exists and its status is "pending".
   * **effects**: sets the status of `f` to "uploaded". If conditions not met, returns an error.
   */
  async confirmUpload(
    { file }: { file: File },
  ): Promise<{ file:File } | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file });

    if (!fileRecord) {
      return { error: "File not found." };
    }
    if (fileRecord.status !== "pending") {
      return {
        error:
          `File is not in 'pending' state. Current state: ${fileRecord.status}`,
      };
    }

    const result = await this.files.updateOne({ _id: file }, {
      $set: { status: "uploaded" },
    });

    if (result.modifiedCount === 0) {
      return { error: "Failed to confirm upload." };
    }

    return { file };
  }

  /**
   * delete (file: File): () | (error: String)
   *
   * **requires**: the given `file` exists.
   * **effects**: removes the file record `f` from the state. Additionally, it triggers the
   *             deletion of the corresponding object from the external GCS bucket.
   */
  async delete({ file }: { file: File }): Promise<Empty | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file });

    if (!fileRecord) {
      return { error: "File not found." };
    }

    try {
      // First, delete the object from GCS
      await this.storage.bucket(this.bucketName).file(fileRecord.storagePath)
        .delete();
      // Then, delete the record from the database
      await this.files.deleteOne({ _id: file });
      return {};
    } catch (e) {
      console.error(
        `FileUploadingConcept: Failed to delete file ${file} from GCS or DB:`,
        e,
      );
      return { error: "An error occurred during file deletion." };
    }
  }

  // === QUERIES ===

  /**
   * _getOwner (file: File): (owner: User)
   *
   * **requires**: the given `file` exists.
   * **effects**: returns the owner of the file.
   */
  async _getOwner({ file }: { file: File }): Promise<{ owner: User }[]> {
    const fileRecord = await this.files.findOne({ _id: file }, {
      projection: { owner: 1 },
    });
    return fileRecord ? [{ owner: fileRecord.owner }] : [];
  }
  
  /**
   * _getFilename (file: File): (filename: String)
   *
   * **requires**: the given `file` exists.
   * **effects**: returns the filename of the file.
   */
  async _getFilename({ file }: { file: File }): Promise<{ filename: string }[]> {
    const fileRecord = await this.files.findOne({ _id: file }, { projection: { filename: 1 } });
    return fileRecord ? [{ filename: fileRecord.filename }] : [];
  }

  /**
   * _getDownloadURL (file: File): (downloadURL: String)
   *
   * **requires**: the given `file` exists and its status is "uploaded".
   * **effects**: generates a short-lived, presigned GCS download URL for the file `f` and returns it.
   */
  async _getDownloadURL(
    { file }: { file: File },
  ): Promise<{ downloadURL: string }[]> {
    const fileRecord = await this.files.findOne({
      _id: file,
      status: "uploaded",
    });

    if (!fileRecord) {
      return [];
    }

    try {
      const options = {
        version: "v4" as const,
        action: "read" as const,
        expires: Date.now() + 15 * 60 * 1000, // URL is valid for 15 minutes
      };
      const [url] = await this.storage.bucket(this.bucketName).file(
        fileRecord.storagePath,
      ).getSignedUrl(options);
      return [{ downloadURL: url }];
    } catch (e) {
      console.error(
        `FileUploadingConcept: Failed to generate download URL for file ${file}:`,
        e,
      );
      return [];
    }
  }

  /**
   * _getFilesByOwner (owner: User): (file: File, filename: String)
   *
   * **requires**: the given `owner` exists.
   * **effects**: returns all files owned by the user with status "uploaded", along with their filenames.
   */
  async _getFilesByOwner(
    { owner }: { owner: User },
  ): Promise<{ file: File; filename: string }[]> {
    const userFiles = await this.files
      .find(
        { owner, status: "uploaded" },
        { projection: { _id: 1, filename: 1 } },
      )
      .toArray();

    return userFiles.map((doc) => ({
      file: doc._id,
      filename: doc.filename,
    }));
  }
}