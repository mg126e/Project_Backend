import { OneRunMatching, PartnerMatching } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Implements the sync `suggest`.
 *
 * sync suggest
 * when OneRunMatching.completeRun(inviter: Inviter, accepter: Accepter, run: Run)
 * then
 *   PartnerMatching.suggestMatch (recipient: Inviter, candidate: Accepter)
 *   PartnerMatching.suggestMatch (recipient: Accepter, candidate: Inviter)
 *
 * Note: The `OneRunMatching.completeRun` action only takes the `run` ID and the `user`
 * initiating the completion, not both participants. To get both the original inviter
 * and accepter, this sync matches on the historical `OneRunMatching.acceptInvite` action
 * that created the `run` within the same causal flow. This ensures that when the run
 * is completed, we have the identities of both users to create a mutual partner suggestion.
 */
export const suggest: Sync = ({ Inviter, Accepter, run }) => ({
  when: actions(
    // First, match the historical action that created the run to bind both participants.
    [OneRunMatching.acceptInvite, { inviter: Inviter, accepter: Accepter }, {
      scheduledRun: run,
    }],
    // Then, match the completion of that specific run. We don't need to specify
    // which user completed it, only that it was completed.
    [OneRunMatching.completeRun, { run }, {}],
  ),
  then: actions(
    // Create a suggestion from the inviter to the accepter.
    [PartnerMatching.suggestMatch, {
      recipient: Inviter,
      candidate: Accepter,
    }],
    // Create a reciprocal suggestion from the accepter to the inviter.
    [PartnerMatching.suggestMatch, {
      recipient: Accepter,
      candidate: Inviter,
    }],
  ),
});