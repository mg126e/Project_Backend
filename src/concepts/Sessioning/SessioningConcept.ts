import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Sessioning.";

// Generic types for this concept
type User = ID;
type Session = ID;

/**
 * Interface for the 'Sessions' collection documents.
 * Corresponds to:
 *   a set of Sessions with
 *     a user User
 */
interface SessionDoc {
  _id: Session;
  user: User;
}

/**
 * @concept Sessioning
 * @purpose Track active user sessions to maintain user state across requests
 */
export default class SessioningConcept {
  private sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection<SessionDoc>(PREFIX + "sessions");
  }

  /**
   * start (user: User): (session: Session)
   *
   * @requires user exists
   *
   * @effects creates a new session for the user and returns the session ID
   */
  async start(
    { user }: { user: User },
  ): Promise<{ session: Session } | { error: string }> {
    const newSession: Session = freshID() as Session;

    await this.sessions.insertOne({
      _id: newSession,
      user,
    });

    console.log(
      "[Sessioning.start] Created session",
      newSession,
      "for user",
      user,
    );
    return { session: newSession };
  }

  /**
   * end (session: Session)
   *
   * @requires session exists
   *
   * @effects deletes the session
   */
  async end(
    { session }: { session: Session },
  ): Promise<Empty | { error: string }> {
    const result = await this.sessions.deleteOne({ _id: session });

    if (result.deletedCount === 0) {
      return { error: `Session ${session} not found.` };
    }

    return {};
  }

  /**
   * _getUser (session: Session): (user: User)
   *
   * @requires session exists
   *
   * @effects returns the user associated with the session
   */
  async _getUser(
    { session }: { session: Session },
  ): Promise<Array<{ user: User }> | [{ error: string }]> {
    const sessionDoc = await this.sessions.findOne({ _id: session });

    if (!sessionDoc) {
      return [{ error: `Session ${session} not found.` }];
    }

    return [{ user: sessionDoc.user }];
  }
}
