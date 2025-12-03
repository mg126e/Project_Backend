import { Messaging, OneRunMatching } from "@concepts";
import { actions, Sync } from "@engine";

// Define necessary types locally, mirroring the concept's internal structure,
// as they are not exported from the concept file.
type ID = string;
type User = ID;
type Thread = ID;

interface ThreadState {
  _id: Thread;
  userA: User;
  userB: User;
}

/**
 * Implements the sync `cancelRun`.
 *
 * sync cancelRun
 * when cancelRun (initiator: UserA, userB: UserB, run: Run, time: Time)
 * where in Messaging: initiator UserA and other user UserB have a thread T together
 * then
 *   Messaging.deleteChat (initiator: UserA, thread: T)
 *   Messaging.deleteChat (initiator: UserB, thread: T)
 *
 * Note: The implementation interprets the sync specification by leveraging the engine's "flow"
 * semantics. To identify both users involved in the run (`UserA` and `UserB`), it matches
 * on the historical `acceptInvite` action that created the `run`. The `where` clause then
 * finds the corresponding chat thread between them before deleting it for both parties in
 * the `then` clause. The `userB` and `time` parameters from the `when` spec are bound
 * through this historical matching and are not direct inputs to the `cancelRun` action itself.
 */
export const cancelRun: Sync = (
  { UserA, UserB, run, T, threadObject, initiator },
) => ({
  when: actions(
    // Match the creation of the run to bind both UserA (inviter) and UserB (accepter)
    [OneRunMatching.acceptInvite, { inviter: UserA, accepter: UserB }, {
      scheduledRun: run,
    }],
    // Match the cancellation of that same run by an initiator
    [OneRunMatching.cancelRun, { run, initiator }, {}],
  ),
  where: async (frames) => {
    // For each run cancellation, find the corresponding chat thread.
    // Query for all threads involving one of the users (UserA).
    frames = await frames.query(Messaging._getThreadsForUser, { user: UserA }, {
      threadObject,
    });

    // Filter those threads to find the one that also involves the other user (UserB).
    // A type assertion `as ThreadState` is used because the engine treats query outputs as 'unknown'.
    const filteredFrames = frames.filter(($) => {
      const thread = $[threadObject] as ThreadState;
      const otherUserInRun = $[UserB];
      // A thread from UserA's list involves UserB if UserB is the other participant.
      return thread.userA === otherUserInRun || thread.userB === otherUserInRun;
    });

    // If no matching thread is found, filteredFrames will be empty, and 'then' will not execute.
    // For the frame that remains, bind the thread's ID to the variable `T`.
    return filteredFrames.map(($) => {
      const thread = $[threadObject] as ThreadState;
      return { ...$, [T]: thread._id };
    });
  },
  then: actions(
    // Delete the chat for both users involved in the run.
    [Messaging.deleteChat, { initiator: UserA, thread: T }],
    [Messaging.deleteChat, { initiator: UserB, thread: T }],
  ),
});