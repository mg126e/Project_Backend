import { Messaging, PartnerMatching } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Implements the sync `matchAndChat`.
 *
 * sync matchAndChat
 * when PartnerMatching.acceptSuggestion (SuggestionAB, RecipientA, CandidateB): (match: SuggestionA)
 * where in PartnerMatching: CandidateB has already accepted the suggestion of RecipientA
 * then Messaging.startChat (UserA,  UserB): (thread: Thread)
 *
 * Note: This implementation relies on the specific behavior of `PartnerMatching.acceptSuggestion`.
 * That action only produces a `match` output when a reciprocal "accepted" suggestion
 * from the other user already exists. Therefore, by matching on the presence of the `match` output
 * in the `when` clause, we implicitly satisfy the condition from the sync's `where` clause
 * without needing to write a separate `where` function in TypeScript.
 */
export const matchAndChat: Sync = ({
  // In the spec, RecipientA accepts a suggestion involving CandidateB.
  // These are mapped to userA and userB for the startChat action.
  recipient,
  candidate,
  suggestion,
  match,
}) => ({
  when: actions([
    PartnerMatching.acceptSuggestion,
    // When a suggestion is accepted by a recipient...
    { suggestion, recipient, candidate },
    // ...and it results in a successful match (which only happens on mutual acceptance).
    { match },
  ]),
  then: actions([
    // ...then start a chat between the two newly matched users.
    Messaging.startChat,
    { userA: recipient, userB: candidate },
  ]),
});