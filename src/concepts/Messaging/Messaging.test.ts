import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb, freshID } from "@utils/database.ts";
import MessagingConcept from "./MessagingConcept.ts";
import { ID } from "@utils/types.ts";

// --- Test Suite Setup ---

// Define user IDs for testing clarity
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;

/**
 * Helper function to create a partner match between two users.
 * This is needed because _getThreadsForUser filters threads based on active matches.
 */
async function createPartnerMatch(db: Db, userA: ID, userB: ID): Promise<void> {
  const matches = db.collection<{ _id: ID; users: [ID, ID] }>("PartnerMatching.matches");
  const sortedUsers: [ID, ID] = userA < userB ? [userA, userB] : [userB, userA];
  await matches.insertOne({
    _id: freshID(),
    users: sortedUsers,
  });
}

// --- Test Cases ---

Deno.test("Messaging: Principle Lifecycle of a Resilient Chat", async () => {
  let client: MongoClient | null = null; // Initialize client to null for safety in finally block
  let db: Db;
  console.log("\n--- Principle Test: A Full Messaging Lifecycle ---");
  [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);

    console.log(
      " > Setup: Three users exist: Alice, Bob, and Charlie. The database is clean.",
    );

    // Create a partner match between Alice and Bob so threads are visible
    await createPartnerMatch(db, userAlice, userBob);

    // Step 1: Alice and Bob are connected, creating a thread.
    console.log("\n[Step 1] A chat thread is created for Alice and Bob.");
    const startChatResult = await concept.startChat({
      userA: userAlice,
      userB: userBob,
    });
    assert("thread" in startChatResult);
    const threadId = startChatResult.thread;
    console.log(` > Action: startChat -> New thread created: ${threadId}`);
    const threadState = await concept.threads.findOne({ _id: threadId });
    assertExists(threadState, "Verification failed: Thread should exist.");
    console.log("   ✅ Effect Verified: A thread between Alice and Bob now exists.");

    // Step 2: Alice sends a message to Bob.
    console.log("\n[Step 2] Alice sends a message to Bob.");
    const sendMessage1Result = await concept.sendMessage({
      content: "Hello, Bob!",
      thread: threadId,
      sender: userAlice,
    });
    assert("message" in sendMessage1Result);
    const messageId1 = sendMessage1Result.message;
    console.log(` > Action: sendMessage -> Message created: ${messageId1}`);
    const msg1State = await concept.messages.findOne({ _id: messageId1 });
    assertEquals(msg1State?.status, "delivered");
    console.log("   ✅ Effect Verified: Message is 'delivered'.");

    // Step 3: Bob reads Alice's message.
    console.log("\n[Step 3] Bob reads Alice's initial message.");
    await concept.readMessage({
      message: messageId1,
      reader: userBob,
    });
    console.log(` > Action: readMessage on message ${messageId1}`);
    const msg1StateAfterRead = await concept.messages.findOne({
      _id: messageId1,
    });
    assertEquals(msg1StateAfterRead?.status, "read");
    console.log("   ✅ Effect Verified: Message status is now 'read'.");

    // Step 4: Bob deletes the chat. It should only disappear for him.
    console.log("\n[Step 4] Bob deletes the chat.");
    await concept.deleteChat({
      initiator: userBob,
      thread: threadId,
    });
    console.log(` > Action: deleteChat by Bob on thread ${threadId}`);
    const bobThreads = await concept._getThreadsForUser({ user: userBob });
    assertEquals(bobThreads.length, 0, "Bob should see no threads.");
    const aliceThreads = await concept._getThreadsForUser({
      user: userAlice,
    });
    assertEquals(aliceThreads.length, 1, "Alice should still see the thread.");
    console.log("   ✅ Effect Verified: Chat hidden for Bob, visible for Alice.");

    // Step 5: Alice sends another message, which should restore the chat for Bob.
    console.log("\n[Step 5] Alice sends another message, restoring the chat for Bob.");
    await concept.sendMessage({
      content: "You there?",
      thread: threadId,
      sender: userAlice,
    });
    console.log(` > Action: sendMessage from Alice`);
    const bobThreadsAfterRestore = await concept._getThreadsForUser({
      user: userBob,
    });
    assertEquals(bobThreadsAfterRestore.length, 1, "Bob should see the thread again.");
    const bobMessages = await concept._getMessagesInThread({
      thread: threadId,
      user: userBob,
    });
    assertEquals(bobMessages.length, 2, "Bob should see both messages.");
    console.log("   ✅ Effect Verified: Chat restored for Bob with full history.");

    console.log("\n--- Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Messaging Action: startChat", async (t) => {
  console.log("\n--- Test: 'startChat' Action ---");
  const [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);

    await t.step("FAIL: User cannot start a chat with themself", async () => {
      console.log("\n > Testing Requirement: Cannot start chat with oneself.");
      const result = await concept.startChat({ userA: userAlice, userB: userAlice });
      assert("error" in result);
      assertEquals(result.error, "Cannot start a chat with oneself.");
      console.log("   ✅ Correctly failed as required.");
    });

    await t.step("SUCCESS: Returns existing thread on subsequent calls", async () => {
      console.log("\n > Testing Effect: Subsequent calls return the same thread.");
      const res1 = await concept.startChat({ userA: userAlice, userB: userBob });
      assert("thread" in res1);
      const res2 = await concept.startChat({ userA: userBob, userB: userAlice }); // Order swapped
      assert("thread" in res2);

      assertEquals(res1.thread, res2.thread, "Should return the same thread ID.");
      const count = await concept.threads.countDocuments();
      assertEquals(count, 1, "Should not create a duplicate thread.");
      console.log("   ✅ Correctly returned existing thread without duplication.");
    });

    await t.step("SUCCESS: Restores a chat if the initiator previously deleted it", async () => {
      console.log("\n > Testing Effect: Restores a self-deleted chat.");
      const { thread } = await concept.startChat({ userA: userCharlie, userB: userAlice }) as { thread: ID };
      await concept.deleteChat({ initiator: userCharlie, thread });
      let threadState = await concept.threads.findOne({ _id: thread });
      assertEquals(threadState?.deletedBy, [userCharlie]);

      // Simulate re-establishing the chat connection
      await concept.startChat({ userA: userCharlie, userB: userAlice });
      threadState = await concept.threads.findOne({ _id: thread });
      assertEquals(threadState?.deletedBy, []);
      console.log("   ✅ Correctly restored the chat for the initiator.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Messaging Action: sendMessage", async (t) => {
  console.log("\n--- Test: 'sendMessage' Action ---");
  const [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);
    const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };

    await t.step("FAIL: Message content cannot be empty", async () => {
      console.log("\n > Testing Requirement: Message content cannot be empty.");
      const result = await concept.sendMessage({ content: "  ", thread, sender: userAlice });
      assert("error" in result);
      assertEquals(result.error, "Message content cannot be empty.");
      console.log("   ✅ Correctly failed as required.");
    });

    await t.step("FAIL: Sender must be a participant in the thread", async () => {
      console.log("\n > Testing Requirement: Sender must be a participant.");
      const result = await concept.sendMessage({ content: "I'm an outsider", thread, sender: userCharlie });
      assert("error" in result);
      assertEquals(result.error, "Sender is not a participant in this thread.");
      console.log("   ✅ Correctly failed as required.");
    });

    await t.step("FAIL: Cannot send message in a self-deleted chat", async () => {
      console.log("\n > Testing Requirement: Cannot send message in deleted chat.");
      await concept.deleteChat({ initiator: userAlice, thread });
      const result = await concept.sendMessage({ content: "Hello?", thread, sender: userAlice });
      assert("error" in result);
      assertEquals(result.error, "Cannot send message in a deleted chat. Please restore it first.");

      // Restore the chat for the next test
      await concept.threads.updateOne({ _id: thread }, { $pull: { deletedBy: userAlice } });
      console.log("   ✅ Correctly failed as required.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Messaging Action: readMessage", async (t) => {
  console.log("\n--- Test: 'readMessage' Action ---");
  const [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);
    const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
    const { message } = await concept.sendMessage({ content: "To be read", thread, sender: userAlice }) as { message: ID };

    await t.step("NO-OP: User cannot mark their own message as read", async () => {
      console.log("\n > Testing Effect: Reading own message is a no-op.");
      await concept.readMessage({ message, reader: userAlice });
      const msgState = await concept.messages.findOne({ _id: message });
      assertEquals(msgState?.status, "delivered", "Status should not change.");
      console.log("   ✅ Correctly had no effect.");
    });

    await t.step("FAIL: Non-participant cannot read a message", async () => {
      console.log("\n > Testing Requirement: Non-participant cannot read message.");
      const result = await concept.readMessage({ message, reader: userCharlie });
      assert("error" in result);
      assertEquals(result.error, "User is not a participant in this message's thread.");
      console.log("   ✅ Correctly failed as required.");
    });

    await t.step("SUCCESS: Sets status to 'read' for the recipient", async () => {
      console.log("\n > Testing Effect: Sets message status to 'read'.");
      await concept.readMessage({ message, reader: userBob });
      const msgState = await concept.messages.findOne({ _id: message });
      assertEquals(msgState?.status, "read");
      console.log("   ✅ Correctly updated message status.");
    });

    await t.step("NO-OP: Reading an already-read message changes nothing", async () => {
      console.log("\n > Testing Effect: Reading an already read message is a no-op.");
      const result = await concept.readMessage({ message, reader: userBob });
      assert(!("error" in result));
      console.log("   ✅ Correctly had no effect and returned no error.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Messaging: Scenario - Mutual Deletion and Restoration", async () => {
  console.log("\n--- Scenario Test: Mutual Deletion and Restoration ---");
  const [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);
    console.log("\n > Setup: Alice and Bob start a chat and send a message.");
    // Create a partner match between Alice and Bob so threads are visible
    await createPartnerMatch(db, userAlice, userBob);
    const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
    await concept.sendMessage({ content: "Initial message", thread, sender: userAlice });

    console.log("\n[Step 1] Alice deletes the chat.");
    await concept.deleteChat({ initiator: userAlice, thread });
    let aliceThreads = await concept._getThreadsForUser({ user: userAlice });
    assertEquals(aliceThreads.length, 0);
    console.log("   ✅ Alice's thread list is empty.");

    console.log("\n[Step 2] Bob also deletes the chat.");
    await concept.deleteChat({ initiator: userBob, thread });
    let bobThreads = await concept._getThreadsForUser({ user: userBob });
    assertEquals(bobThreads.length, 0);
    console.log("   ✅ Bob's thread list is empty.");
    const threadState = await concept.threads.findOne({ _id: thread });
    assertEquals(threadState?.deletedBy.length, 2);
    console.log("   ✅ Database state shows both users have deleted the thread.");

    console.log("\n[Step 3] A system event re-establishes the connection via startChat.");
    const restoreResult = await concept.startChat({ userA: userAlice, userB: userBob });
    assert("thread" in restoreResult);
    assertEquals(restoreResult.thread, thread);
    console.log("   > Action: startChat({ userA: Alice, userB: Bob })");

    aliceThreads = await concept._getThreadsForUser({ user: userAlice });
    bobThreads = await concept._getThreadsForUser({ user: userBob });
    assertEquals(aliceThreads.length, 1, "Chat should be restored for Alice.");
    assertEquals(bobThreads.length, 1, "Chat should be restored for Bob.");
    console.log("   ✅ Effect Verified: Chat is now visible to both Alice and Bob.");
    const finalThreadState = await concept.threads.findOne({ _id: thread });
    assertEquals(finalThreadState?.deletedBy.length, 0);
    console.log("   ✅ Effect Verified: The 'deletedBy' list in the database is now empty.");

    console.log("\n[Step 4] Verify message history is preserved.");
    const messages = await concept._getMessagesInThread({ thread, user: userAlice });
    assert(!("error" in (messages[0] ?? {})));
    assertEquals(messages.length, 1);
    const message = messages[0] as { content: string };
    assertEquals(message.content, "Initial message");
    console.log("   ✅ Effect Verified: Previous messages are still present.");
  } finally {
    await client.close();
  }
});

Deno.test("Messaging Queries", async (t) => {
  console.log("\n--- Test: Queries ---");
  const [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);
    // Setup: Alice has chats with Bob and Charlie. Bob deletes his.
    // Create partner matches so threads are visible
    await createPartnerMatch(db, userAlice, userBob);
    await createPartnerMatch(db, userAlice, userCharlie);
    const { thread: threadAB } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
    await concept.startChat({ userA: userAlice, userB: userCharlie });
    await concept.sendMessage({ content: "Hi Bob", thread: threadAB, sender: userAlice });
    await concept.deleteChat({ initiator: userBob, thread: threadAB });

    await t.step("_getThreadsForUser: returns correct threads based on deletions", async () => {
      console.log("\n > Testing Query: _getThreadsForUser respects deletions.");
      const aliceThreads = await concept._getThreadsForUser({ user: userAlice });
      assertEquals(aliceThreads.length, 2, "Alice should see both threads.");
      const bobThreads = await concept._getThreadsForUser({ user: userBob });
      assertEquals(bobThreads.length, 0, "Bob should see no threads.");
      const charlieThreads = await concept._getThreadsForUser({ user: userCharlie });
      assertEquals(charlieThreads.length, 1, "Charlie should see one thread.");
      console.log("   ✅ Correctly returned correct thread lists for each user.");
    });

    await t.step("_getMessagesInThread: FAIL for non-participant", async () => {
      console.log("\n > Testing Query: _getMessagesInThread fails for non-participant.");
      const result = await concept._getMessagesInThread({ thread: threadAB, user: userCharlie });
      assert("error" in (result[0] ?? {}));
      assertEquals((result[0] as { error: string }).error, "User is not a participant in this thread.");
      console.log("   ✅ Correctly failed as required.");
    });
  } finally {
    await client.close();
  }
});