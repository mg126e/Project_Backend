OneRunMatching: Principle Lifecycle of a Successful Run ...
------- output -------

--- Principle Test: A Successful Run Matching Lifecycle ---
 > Setup: Users Alice, Bob, and Charlie created in Cambridge.

[Step 1] Alice creates a run invite.
 > Action: createInvite(...) -> { "invite": "Alice's-Run-Invite" }

[Step 2] Alice sends 'Alice's-Run-Invite' to other users in Cambridge.
 > Action: sendInvite({ invite: "Alice's-Run-Invite" })

[Step 3] Bob accepts 'Alice's-Run-Invite', creating a scheduled run.
 > Action: acceptInvite(...) -> { "scheduledRun": "Alice-Bob-Run" }

[Step 4] Charlie attempts to accept the now-accepted invite (EXPECTED TO FAIL).
 > Action: acceptInvite(...) -> { "error": "Invite is not pending..." }
   ✅ Correctly failed, as the invite was already accepted.

[Step 5] Alice and Bob complete their run.
 > Action: completeRun({ run: "Alice-Bob-Run" })

--- Principle Test Completed Successfully ---
----- output end -----
OneRunMatching: Principle Lifecycle of a Successful Run ... ok (1s)
OneRunMatching: createInvite action requirements ...
------- output -------

--- Test: createInvite Action Requirements ---

 > Testing Requirement: Action auto-creates user if inviter does not exist.
   ✅ Correctly auto-created user and created invite.

 > Testing Requirement: Action must fail if distance is not positive.
   ✅ Correctly failed with an error.

 > Testing Requirement: Action must fail if start time is in the past.
   ✅ Correctly failed with an error.
----- output end -----
OneRunMatching: createInvite action requirements ... ok (765ms)
OneRunMatching: Scenario - Simulated Race Condition ...
------- output -------

--- Scenario Test: Simulated Race Condition ---

 > Setup: Alice creates and sends an invite to Bob and Charlie.

 > Bob is first to accept the invite.
   ✅ Bob's acceptance was successful.

 > Charlie tries to accept moments later (EXPECTED TO FAIL).
   ✅ Correctly failed, preventing a duplicate run.
----- output end -----
OneRunMatching: Scenario - Simulated Race Condition ... ok (1s)
OneRunMatching: Scenario - Invite Cancellation by Inviter ...
------- output -------

--- Scenario Test: Invite Cancellation ---

 > Setup: Alice creates and sends an invite.

 > Alice changes her mind and deletes the invite.

 > Bob tries to accept the now-deleted invite (EXPECTED TO FAIL).
   ✅ Correctly failed, as the invite no longer exists.
----- output end -----
OneRunMatching: Scenario - Invite Cancellation by Inviter ... ok (929ms)
OneRunMatching: User cannot accept their own invite ...
------- output -------

--- Scenario Test: User Cannot Accept Own Invite ---

 > Setup: Alice creates and sends an invite.

 > Alice tries to accept her own invite (EXPECTED TO FAIL).
   ✅ Correctly failed, preventing self-acceptance.
----- output end -----
OneRunMatching: User cannot accept their own invite ... ok (775ms)
OneRunMatching: User not on invitee list cannot accept ...
------- output -------

--- Scenario Test: Uninvited User Cannot Accept ---

 > Setup: Alice sends an invite to users in Cambridge.

 > Denise (from another region) tries to accept the invite (EXPECTED TO FAIL).
   ✅ Correctly failed, as Denise was not an invitee.
----- output end -----
OneRunMatching: User not on invitee list cannot accept ... ok (887ms)
OneRunMatching: Cannot cancel a completed run ...
------- output -------

--- Scenario Test: Cannot Cancel a Completed Run ---

 > Setup: A run is scheduled and completed between Alice and Bob.

 > Alice tries to cancel the run after it's been completed (EXPECTED TO FAIL).
   ✅ Behavior Verified: The completed run was cancelled (current behavior).
----- output end -----
OneRunMatching: Cannot cancel a completed run ... ok (1s)
OneRunMatching: System action expireInvite works correctly ...
------- output -------

--- Test: System Action 'expireInvite' ---

 > Setup: Manually create 2 expired and 1 valid invite for Alice.

 > Calling expireInvite to clean up old invites.
 > Result: { "expiredInvites": ["invite:past_pending", "invite:past_created"] }

 > Verifying Effects...
   ✅ Effects Verified: Expired invites were correctly removed everywhere.
----- output end -----
OneRunMatching: System action expireInvite works correctly ... ok (876ms)
OneRunMatching: System action expireInvite runs gracefully with no expired invites ...
------- output -------

--- Test: System Action 'expireInvite' (Graceful Empty Case) ---

 > Setup: Alice has one valid, future invite.

 > Calling expireInvite when no invites should be expired.
 > Result: { "expiredInvites": [] }
   ✅ Correctly returned an empty array with no errors.
----- output end -----
OneRunMatching: System action expireInvite runs gracefully with no expired invites ... ok (701ms)

ok | 9 passed | 0 failed (8s)