import { Messaging, OneRunMatching } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Implements the sync `oneTimeChat`.
 *
 * sync oneTimeChat
 * when OneRunMatching.scheduleRun (inviter: UserA, invite: Invite, accepter: UserB): (run: Run)
 * then Messaging.startChat (UserA,  UserB): (thread: Thread)
 *
 * Note: Based on the provided `OneRunMatchingConcept.ts`, the action `scheduleRun`
 * is implemented as `acceptInvite`, and its successful output parameter is `scheduledRun`.
 * This implementation maps the specification to the concrete implementation accordingly.
 */
export const oneTimeChat: Sync = ({ UserA, UserB, invite, run }) => ({
  when: actions([
    OneRunMatching.acceptInvite,
    { inviter: UserA, invite, accepter: UserB },
    { scheduledRun: run },
  ]),
  then: actions([
    Messaging.startChat,
    { userA: UserA, userB: UserB },
  ]),
});