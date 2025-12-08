import { Messaging, PartnerMatching } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Implements automatic matching when two users send each other requests.
 *
 * sync autoMatchMutualRequests
 * when PartnerMatching.suggestMatch (recipient: User, candidate: User): (suggestion: Suggestion)
 * then PartnerMatching.checkAndCreateMatchFromMutualRequests (recipient: User, candidate: User): (match: Match) | Empty
 *
 * Note: When a user sends a request (suggestMatch) to another user, this sync checks if
 * the other user has also sent a request back. If both users have sent requests to each other,
 * they are automatically matched.
 */
export const autoMatchMutualRequests: Sync = ({
  recipient,
  candidate,
  suggestion,
}) => ({
  when: actions([
    PartnerMatching.suggestMatch,
    // When a suggestion is created from recipient to candidate...
    { recipient, candidate },
    // ...and it was successful (suggestion was created).
    { suggestion },
  ]),
  then: actions([
    // Check if both users have sent requests to each other and create a match if so.
    PartnerMatching.checkAndCreateMatchFromMutualRequests,
    { recipient, candidate },
  ]),
});

/**
 * Implements automatic chat creation when a match is created from mutual requests.
 *
 * sync autoMatchMutualRequestsAndChat
 * when PartnerMatching.checkAndCreateMatchFromMutualRequests (recipient: User, candidate: User): (match: Match)
 * then Messaging.startChat (userA: User, userB: User): (thread: Thread)
 *
 * Note: When two users are automatically matched because they both sent requests to each other,
 * a chat is automatically started between them to encourage communication.
 */
export const autoMatchMutualRequestsAndChat: Sync = ({
  recipient,
  candidate,
  match,
}) => ({
  when: actions([
    PartnerMatching.checkAndCreateMatchFromMutualRequests,
    // When a match is created from mutual requests...
    { recipient, candidate },
    // ...and it was successful (match was created).
    { match },
  ]),
  then: actions([
    // ...then start a chat between the two newly matched users.
    Messaging.startChat,
    { userA: recipient, userB: candidate },
  ]),
});

