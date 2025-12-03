import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "Messaging" + ".";

// Generic type parameters
type User = ID;
type Thread = ID;
type Message = ID;
type Timestamp = Date;

// A type for the status of a message
type MessageStatus = "delivered" | "read";

/**
 * @interface ThreadState
 * Represents a conversation thread between two users.
 *
 * a set of Threads with
 *   a user UserA
 *   a user UserB
 *   a set of Messages
 */
interface ThreadState {
  _id: Thread;
  userA: User;
  userB: User;
  messages: Message[];
  // This field is added to support the "delete for me" functionality
  deletedBy: User[];
}

/**
 * @interface MessageState
 * Represents a single message within a thread.
 *
 * a set of Messages with
 *   a Sender user
 *   a Timestamp
 *   a content String
 *   a delivered or read Status
 */
interface MessageState {
  _id: Message;
  threadId: Thread;
  sender: User;
  timestamp: Timestamp;
  content: string;
  status: MessageStatus;
}

/**
 * @concept Messaging
 * @purpose one user can send a message to other users to communicate about scheduled runs
 * @principle a user may send messages to other users,
 * users can view a history of messages for each thread;
 * messages cannot be sent to users with whom there is no active connection
 */
export default class MessagingConcept {
  threads: Collection<ThreadState>;
  messages: Collection<MessageState>;
  private runs: Collection<{ _id: ID; userA: User; userB: User; completed: boolean }>;
  private sharedGoals: Collection<{ _id: ID; users: User[]; isActive: boolean }>;

  constructor(private readonly db: Db) {
    this.threads = this.db.collection(PREFIX + "threads");
    this.messages = this.db.collection(PREFIX + "messages");
    this.runs = this.db.collection("OneRunMatching.runs");
    this.sharedGoals = this.db.collection("SharedGoals.sharedGoals");
  }

  /**
   * Helper method to check if two users have an active match.
   * A match exists if:
   * - They have an active (non-completed) run together, OR
   * - They have an active shared goal together
   */
  private async hasMatch(userA: User, userB: User): Promise<boolean> {
    // Check for active run (not completed)
    const activeRun = await this.runs.findOne({
      $or: [
        { userA: userA, userB: userB, completed: false },
        { userA: userB, userB: userA, completed: false },
      ],
    });

    if (activeRun) {
      return true;
    }

    // Check for active shared goal (users can be part of a goal with more than 2 people)
    const activeGoal = await this.sharedGoals.findOne({
      users: { $all: [userA, userB] },
      isActive: true,
    });

    return !!activeGoal;
  }

  /**
   * startChat (userA: User, userB: User): (thread: Thread)
   *
   * requires: userA and userB exist and are distinct; there is no existing thread between userA and userB
   * effects: creates and returns a new thread between userA and userB. If a thread previously existed but was deleted by a user, it is restored.
   */
  async startChat(
    { userA, userB }: { userA: User; userB: User },
  ): Promise<{ thread: Thread } | { error: string }> {
    try {
      if (userA === userB) {
        return { error: "Cannot start a chat with oneself." };
      }

      // Check for an existing thread between the two users
      const existingThread = await this.threads.findOne({
        $or: [
          { userA: userA, userB: userB },
          { userA: userB, userB: userA },
        ],
      });

      if (existingThread) {
        // If the thread exists but was deleted by either user, "undelete" it for both.
        // This provides a better user experience than creating a new thread or showing an error.
        if (existingThread.deletedBy.length > 0) {
          await this.threads.updateOne({ _id: existingThread._id }, { $set: { deletedBy: [] } });
        }
        return { thread: existingThread._id };
      }

      const newThreadId = freshID() as Thread;
      const newThread: ThreadState = {
        _id: newThreadId,
        userA: userA,
        userB: userB,
        messages: [],
        deletedBy: [],
      };

      await this.threads.insertOne(newThread);
      return { thread: newThreadId };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "An unknown error occurred" };
    }
  }

  /**
   * deleteChat (initiator: User, thread: Thread): Empty
   *
   * requires: there is an existing thread between the initiator of the deletion and another user.
   * effects: deletes the thread between the initiator and users only for the initiator.
   */
  async deleteChat(
    { initiator, thread }: { initiator: User; thread: Thread },
  ): Promise<Empty | { error: string }> {
    try {
      const existingThread = await this.threads.findOne({ _id: thread });

      if (!existingThread) {
        return { error: "Thread not found." };
      }

      if (existingThread.userA !== initiator && existingThread.userB !== initiator) {
        return { error: "User is not a participant in this thread." };
      }

      // Add the initiator to the `deletedBy` array to hide it from their view.
      await this.threads.updateOne({ _id: thread }, { $addToSet: { deletedBy: initiator } });

      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "An unknown error occurred" };
    }
  }

  /**
   * sendMessage (content: String, thread: Thread, sender: User): (message: Message)
   *
   * requires: there is an existing thread between the sender and receiver; the content must not be empty.
   * effects: creates a new message from the sender in the thread with a timestamp and sets its Status to ‘delivered’. Restores the chat for the receiver if they had deleted it.
   */
  async sendMessage(
    { content, thread, sender }: { content: string; thread: Thread; sender: User },
  ): Promise<{ message: Message } | { error: string }> {
    try {
      if (!content || content.trim() === "") {
        return { error: "Message content cannot be empty." };
      }

      const existingThread = await this.threads.findOne({ _id: thread });
      if (!existingThread) {
        return { error: "Thread not found." };
      }

      if (existingThread.userA !== sender && existingThread.userB !== sender) {
        return { error: "Sender is not a participant in this thread." };
      }

      if (existingThread.deletedBy.includes(sender)) {
        return { error: "Cannot send message in a deleted chat. Please restore it first." };
      }

      const newMessageId = freshID() as Message;
      const newMessage: MessageState = {
        _id: newMessageId,
        threadId: thread,
        sender: sender,
        timestamp: new Date(),
        content: content,
        status: "delivered",
      };

      await this.messages.insertOne(newMessage);

      // A new message should make the chat reappear for a receiver who had previously deleted it.
      const receiver = existingThread.userA === sender ? existingThread.userB : existingThread.userA;
      await this.threads.updateOne(
        { _id: thread },
        {
          $push: { messages: newMessageId },
          $pull: { deletedBy: receiver },
        },
      );

      return { message: newMessageId };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "An unknown error occurred" };
    }
  }

  /**
   * readMessage (message: Message, reader: User): Empty
   *
   * requires: there is an existing message; message exists and its Status is set to ‘delivered’.
   * effects: sets the Status of the message to ‘read’.
   */
  async readMessage({ message, reader }: { message: Message; reader: User }): Promise<Empty | { error: string }> {
    try {
      const existingMessage = await this.messages.findOne({ _id: message, status: "delivered" });

      if (!existingMessage) {
        // This can be because the message doesn't exist or is already read. Not an error.
        return {};
      }

      if (existingMessage.sender === reader) {
        // User cannot mark their own sent message as "read".
        return {};
      }

      // Check if the reader is actually a participant of the thread.
      const thread = await this.threads.findOne({_id: existingMessage.threadId});
      if (!thread || (thread.userA !== reader && thread.userB !== reader)) {
        return { error: "User is not a participant in this message's thread." };
      }

      await this.messages.updateOne({ _id: message }, { $set: { status: "read" } });

      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "An unknown error occurred" };
    }
  }

  // --- QUERIES ---

  /**
   * _getThreadsForUser (user: User): (threads: ThreadState)[]
   *
   * effects: returns all threads a user is a participant in, that they have not personally deleted,
   * and only if there is an active match between the user and the other participant.
   */
  async _getThreadsForUser({ user }: { user: User }): Promise<ThreadState[]> {
    const allThreads = await this.threads
      .find({
        $and: [{ $or: [{ userA: user }, { userB: user }] }, { deletedBy: { $ne: user } }],
      })
      .toArray();

    // Filter threads to only include those where there's an active match
    const filteredThreads: ThreadState[] = [];
    for (const thread of allThreads) {
      const otherUser = thread.userA === user ? thread.userB : thread.userA;
      if (await this.hasMatch(user, otherUser)) {
        filteredThreads.push(thread);
      }
    }

    return filteredThreads;
  }

  /**
   * _getMessagesInThread (thread: Thread, user: User): (messages: MessageState)[] | (error: string)
   *
   * requires: user is a participant in the thread and there is an active match between the users
   * effects: returns all messages for a given thread, ordered by timestamp
   */
  async _getMessagesInThread(
    { thread, user }: { thread: Thread; user: User },
  ): Promise<MessageState[] | { error: string }[]> {
    try {
      const existingThread = await this.threads.findOne({ _id: thread });
      if (!existingThread) {
        return [{ error: "Thread not found." }];
      }
      if (existingThread.userA !== user && existingThread.userB !== user) {
        return [{ error: "User is not a participant in this thread." }];
      }

      // Check if there's an active match between the users
      const otherUser = existingThread.userA === user ? existingThread.userB : existingThread.userA;
      if (!(await this.hasMatch(user, otherUser))) {
        return [{ error: "No active match found between users. Messages are only available for matched users." }];
      }

      return await this.messages.find({ threadId: thread }).sort({ timestamp: 1 }).toArray();
    } catch (e) {
      const message = e instanceof Error ? e.message : "An unknown error occurred fetching messages";
      return [{ error: message }];
    }
  }
}