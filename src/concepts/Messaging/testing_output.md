running 6 tests from ./src/concepts/Messaging/Messaging.test.ts
Messaging: Principle Lifecycle of a Resilient Chat ...
------- output -------

--- Principle Test: A Full Messaging Lifecycle ---
 > Setup: Three users exist: Alice, Bob, and Charlie. The database is clean.

[Step 1] A chat thread is created for Alice and Bob.
 > Action: startChat -> New thread created: 019adc03-6470-7e1f-9ba6-fa09655f27e1
   ✅ Effect Verified: A thread between Alice and Bob now exists.

[Step 2] Alice sends a message to Bob.
 > Action: sendMessage -> Message created: 019adc03-64ee-76a5-a358-1e1ddc115d75
   ✅ Effect Verified: Message is 'delivered'.

[Step 3] Bob reads Alice's initial message.
 > Action: readMessage on message 019adc03-64ee-76a5-a358-1e1ddc115d75
   ✅ Effect Verified: Message status is now 'read'.

[Step 4] Bob deletes the chat.
 > Action: deleteChat by Bob on thread 019adc03-6470-7e1f-9ba6-fa09655f27e1
   ✅ Effect Verified: Chat hidden for Bob, visible for Alice.

[Step 5] Alice sends another message, restoring the chat for Bob.
 > Action: sendMessage from Alice
   ✅ Effect Verified: Chat restored for Bob with full history.

--- Principle Test Completed Successfully ---
----- output end -----
Messaging: Principle Lifecycle of a Resilient Chat ... ok (1s)


Messaging Action: startChat ...
------- output -------

--- Test: 'startChat' Action ---
----- output end -----
  FAIL: User cannot start a chat with themself ...
------- output -------

 > Testing Requirement: Cannot start chat with oneself.
   ✅ Correctly failed as required.
----- output end -----
  FAIL: User cannot start a chat with themself ... ok (0ms)
  SUCCESS: Returns existing thread on subsequent calls ...
------- output -------

 > Testing Effect: Subsequent calls return the same thread.
   ✅ Correctly returned existing thread without duplication.
----- output end -----
  SUCCESS: Returns existing thread on subsequent calls ... ok (114ms)
  SUCCESS: Restores a chat if the initiator previously deleted it ...
------- output -------

 > Testing Effect: Restores a self-deleted chat.
   ✅ Correctly restored the chat for the initiator.
----- output end -----
  SUCCESS: Restores a chat if the initiator previously deleted it ... ok (185ms)
Messaging Action: startChat ... ok (874ms)


Messaging Action: sendMessage ...
------- output -------

--- Test: 'sendMessage' Action ---
----- output end -----
  FAIL: Message content cannot be empty ...
------- output -------

 > Testing Requirement: Message content cannot be empty.
   ✅ Correctly failed as required.
----- output end -----
  FAIL: Message content cannot be empty ... ok (0ms)
  FAIL: Sender must be a participant in the thread ...
------- output -------

 > Testing Requirement: Sender must be a participant.
   ✅ Correctly failed as required.
----- output end -----
  FAIL: Sender must be a participant in the thread ... ok (20ms)
  FAIL: Cannot send message in a self-deleted chat ...
------- output -------

 > Testing Requirement: Cannot send message in deleted chat.
   ✅ Correctly failed as required.
----- output end -----
  FAIL: Cannot send message in a self-deleted chat ... ok (88ms)
Messaging Action: sendMessage ... ok (691ms)


Messaging Action: readMessage ...
------- output -------

--- Test: 'readMessage' Action ---
----- output end -----
  NO-OP: User cannot mark their own message as read ...
------- output -------

 > Testing Effect: Reading own message is a no-op.
   ✅ Correctly had no effect.
----- output end -----
  NO-OP: User cannot mark their own message as read ... ok (46ms)
  FAIL: Non-participant cannot read a message ...
------- output -------

 > Testing Requirement: Non-participant cannot read message.
   ✅ Correctly failed as required.
----- output end -----
  FAIL: Non-participant cannot read a message ... ok (44ms)
  SUCCESS: Sets status to 'read' for the recipient ...
------- output -------

 > Testing Effect: Sets message status to 'read'.
   ✅ Correctly updated message status.
----- output end -----
  SUCCESS: Sets status to 'read' for the recipient ... ok (88ms)
  NO-OP: Reading an already-read message changes nothing ...
------- output -------

 > Testing Effect: Reading an already read message is a no-op.
   ✅ Correctly had no effect and returned no error.
----- output end -----
  NO-OP: Reading an already-read message changes nothing ... ok (22ms)
Messaging Action: readMessage ... ok (892ms)
Messaging: Scenario - Mutual Deletion and Restoration ...
------- output -------

--- Scenario Test: Mutual Deletion and Restoration ---

 > Setup: Alice and Bob start a chat and send a message.

[Step 1] Alice deletes the chat.
   ✅ Alice's thread list is empty.

[Step 2] Bob also deletes the chat.
   ✅ Bob's thread list is empty.
   ✅ Database state shows both users have deleted the thread.

[Step 3] A system event re-establishes the connection via startChat.
   > Action: startChat({ userA: Alice, userB: Bob })
   ✅ Effect Verified: Chat is now visible to both Alice and Bob.
   ✅ Effect Verified: The 'deletedBy' list in the database is now empty.

[Step 4] Verify message history is preserved.
   ✅ Effect Verified: Previous messages are still present.
----- output end -----
Messaging: Scenario - Mutual Deletion and Restoration ... ok (994ms)


Messaging Queries ...
------- output -------

--- Test: Queries ---
----- output end -----
  _getThreadsForUser: returns correct threads based on deletions ...
------- output -------

 > Testing Query: _getThreadsForUser respects deletions.
   ✅ Correctly returned correct thread lists for each user.
----- output end -----
  _getThreadsForUser: returns correct threads based on deletions ... ok (60ms)
  _getMessagesInThread: FAIL for non-participant ...
------- output -------

 > Testing Query: _getMessagesInThread fails for non-participant.
   ✅ Correctly failed as required.
----- output end -----
  _getMessagesInThread: FAIL for non-participant ... ok (249ms)
Messaging Queries ... ok (1s)

ok | 6 passed (12 steps) | 0 failed (5s)