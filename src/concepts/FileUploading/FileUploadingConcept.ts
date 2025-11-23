import { Collection, Db } from "mongodb";
import { Storage } from "npm:@google-cloud/storage";
import { extname } from "@std/path/extname";
import { contentType } from "jsr:@std/media-types/content-type";
import { Empty, ID } from "@utils/types.ts";

// Prefix for MongoDB collections to avoid name collisions
const PREFIX = "FileUploading.";

type User = ID;
type File = ID;

/**
 * State for a File, representing its metadata in the database.
 * a set of Files with
 *   an owner User
 *   a filename String
 *   a storagePath String (e.g., the path/key of the object in the GCS bucket)
 *   a status String (values: "pending", "uploaded")
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
    this.bucketName = Deno.env.get("FILE_UPLOADING_GCS_BUCKET_NAME")!;
    const projectId = Deno.env.get("FILE_UPLOADING_GCS_PROJECT_ID");
    const privateKey = Deno.env.get("FILE_UPLOADING_GCS_PRIVATE_KEY")?.replace(/\\n/g, "\n");
    const clientEmail = Deno.env.get("FILE_UPLOADING_GCS_CLIENT_EMAIL");
    if (!this.bucketName || !projectId || !privateKey || !clientEmail) {
      throw new Error("Missing required GCS environment variables for FileUploadingConcept. Please check your .env file.");
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
   * requestUploadURL (owner: User, filename: String): (file: File, uploadURL: String)
   *
   * @requires true.
   * @effects creates a new File f with status 'pending', owner, and filename; generates a unique storagePath for f; generates a presigned GCS upload URL; returns the new file's ID and the URL.
   */
  async requestUploadURL(
    { owner, filename }: { owner: User; filename: string },
  ): Promise<{ file: File; uploadURL: string } | { error: string }> {
    const newFileId = (Math.random().toString(36).slice(2) + Date.now()) as File;
    const storagePath = `${newFileId}/${filename}`;
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
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: inferredContentType,
      };
      const [url] = await this.storage.bucket(this.bucketName).file(storagePath).getSignedUrl(options);
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
   * @requires a File f exists and its status is "pending".
   * @effects sets the status of f to "uploaded". If conditions not met, returns an error.
   */
  async confirmUpload(
    { file }: { file: File },
  ): Promise<{ file: File } | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file });
    if (!fileRecord) {
      return { error: "File not found." };
    }
    if (fileRecord.status !== "pending") {
      return { error: `File is not in 'pending' state. Current state: ${fileRecord.status}` };
    }
    const result = await this.files.updateOne({ _id: file }, { $set: { status: "uploaded" } });
    if (result.modifiedCount === 0) {
      return { error: "Failed to confirm upload." };
    }
    return { file };
  }

  /**
   * getDownloadURL (file: File): (downloadURL: String)
   *
   * @requires the given file exists and its status is "uploaded".
   * @effects generates a short-lived, presigned GCS download URL for the file and returns it.
   */
  async getDownloadURL(
    { file }: { file: File },
  ): Promise<{ downloadURL: string } | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file, status: "uploaded" });
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
      console.error(`FileUploadingConcept: Failed to generate download URL for file ${file}:`, e);
      return { error: "Failed to generate download URL." };
    }
  }

  /**
   * delete (file: File): () | (error: String)
   *
   * @requires the given file exists.
   * @effects removes the file record f from the state and deletes the object from the GCS bucket.
   */
  async delete(
    { file }: { file: File },
  ): Promise<Empty | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file });
    if (!fileRecord) {
      return { error: "File not found." };
    }
    try {
      await this.storage.bucket(this.bucketName).file(fileRecord.storagePath).delete();
      await this.files.deleteOne({ _id: file });
      return {};
    } catch (e) {
      console.error(`FileUploadingConcept: Failed to delete file ${file} from GCS or DB:`, e);
      return { error: "An error occurred during file deletion." };
    }
  }
}
