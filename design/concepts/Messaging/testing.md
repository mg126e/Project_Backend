# prompt: Write a comprehensive deno test suite for the Messaging implementation that clearly prints the process and output to the console. Use the given BodyMapGeneration test suite as an example and don't use unnecessary imports.

[@testing-concepts](testing-concepts.md)

[@concept-design-overview](../../design/background/concept-design-overview.md)

[@concept-specifications](../background/concept-specifications.md)

[@implementing-concepts](../background/implementing-concepts.md)

[@MessagingConcept](MessagingConcept.ts)

[@BodyMapGeneration](../../src/concepts/BodyMapGeneration/BodyMapGeneration.test.ts)

# response:

# file: src/concepts/Messaging/MessagingConcept.test.ts

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import MessagingConcept from "./MessagingConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("MessagingConcept", async (test) => {
  let client: MongoClient | null = null;
  let db: Db;

  // Define user IDs for testing clarity
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;

  await test.step("Principle: Full Messaging Lifecycle", async () => {
    console.log("\n=== PRINCIPLE TEST: Full Messaging Lifecycle ===");
    try {
      [db, client] = await testDb();
      const concept = new MessagingConcept(db);
      let threadId: ID;
      let messageId1: ID;
      let messageId2: ID;
      let messageId3: ID;

      // 1. Alice starts a chat with Bob.
      console.log("-> Action: Alice starts a chat with Bob.");
      const startChatResult = await concept.startChat({
        userA: userAlice,
        userB: userBob,
      });
      assert(
        "thread" in startChatResult,
        `Failed to start chat: ${JSON.stringify(startChatResult)}`,
      );
      threadId = startChatResult.thread;
      console.log(`<- Effect: Chat thread ${threadId} created.`);

      const threadState = await concept.threads.findOne({ _id: threadId });
      assertExists(threadState, "Thread should exist in the database.");
      assertEquals(threadState.messages.length, 0);

      // 2. Alice sends a message to Bob.
      console.log("-> Action: Alice sends 'Hello, Bob!'");
      const sendMessage1Result = await concept.sendMessage({
        content: "Hello, Bob!",
        thread: threadId,
        sender: userAlice,
      });
      assert(
        "message" in sendMessage1Result,
        `Failed to send message: ${JSON.stringify(sendMessage1Result)}`,
      );
      messageId1 = sendMessage1Result.message;
      console.log(`<- Effect: Message ${messageId1} created and delivered.`);

      const msg1State = await concept.messages.findOne({ _id: messageId1 });
      assertExists(msg1State, "First message should exist.");
      assertEquals(msg1State.status, "delivered");
      assertEquals(msg1State.sender, userAlice);

      // 3. Bob sends a reply.
      console.log("-> Action: Bob replies with 'Hi, Alice!'");
      const sendMessage2Result = await concept.sendMessage({
        content: "Hi, Alice!",
        thread: threadId,
        sender: userBob,
      });
      assert(
        "message" in sendMessage2Result,
        `Failed to send reply: ${JSON.stringify(sendMessage2Result)}`,
      );
      messageId2 = sendMessage2Result.message;
      console.log(`<- Effect: Reply message ${messageId2} created and delivered.`);

      // 4. Verify message history for both users.
      console.log("-> Query: Get message history for Alice.");
      const aliceMessages = await concept._getMessagesInThread({
        thread: threadId,
        user: userAlice,
      });
      assert(!("error" in aliceMessages[0]));
      assertEquals(aliceMessages.length, 2, "Alice should see two messages.");
      assertEquals(
        (aliceMessages as any[])[0].content,
        "Hello, Bob!",
        "First message content is incorrect.",
      );
      assertEquals(
        (aliceMessages as any[])[1].content,
        "Hi, Alice!",
        "Second message content is incorrect.",
      );
      console.log("<- Verification: Alice sees the full conversation.");

      // 5. Bob reads Alice's message.
      console.log("-> Action: Bob reads Alice's message.");
      const readResult = await concept.readMessage({
        message: messageId1,
        reader: userBob,
      });
      assert(
        !("error" in readResult),
        `Failed to read message: ${JSON.stringify(readResult)}`,
      );
      const msg1StateAfterRead = await concept.messages.findOne({
        _id: messageId1,
      });
      assertEquals(
        msg1StateAfterRead?.status,
        "read",
        "Message status should be 'read'.",
      );
      console.log("<- Effect: Message status updated to 'read'.");

      // 6. Bob deletes the chat.
      console.log("-> Action: Bob deletes the chat.");
      const deleteResult = await concept.deleteChat({
        initiator: userBob,
        thread: threadId,
      });
      assert(
        !("error" in deleteResult),
        `Failed to delete chat: ${JSON.stringify(deleteResult)}`,
      );
      const bobThreads = await concept._getThreadsForUser({ user: userBob });
      assertEquals(
        bobThreads.length,
        0,
        "Bob should see no threads after deleting.",
      );
      const aliceThreads = await concept._getThreadsForUser({
        user: userAlice,
      });
      assertEquals(
        aliceThreads.length,
        1,
        "Alice should still see the thread.",
      );
      console.log(
        "<- Effect: Chat is hidden from Bob's view, but not Alice's.",
      );

      // 7. Alice sends another message, which should restore the chat for Bob.
      console.log("-> Action: Alice sends 'You there?'");
      const sendMessage3Result = await concept.sendMessage({
        content: "You there?",
        thread: threadId,
        sender: userAlice,
      });
      assert(
        "message" in sendMessage3Result,
        `Failed to send third message: ${JSON.stringify(sendMessage3Result)}`,
      );
      messageId3 = sendMessage3Result.message;
      console.log(
        "<- Effect: New message sent, and chat is restored for Bob.",
      );

      const bobThreadsAfterRestore = await concept._getThreadsForUser({
        user: userBob,
      });
      assertEquals(
        bobThreadsAfterRestore.length,
        1,
        "Bob should see the thread again after Alice's new message.",
      );
      assertEquals(
        bobThreadsAfterRestore[0]._id,
        threadId,
        "Restored thread ID should be correct.",
      );

      const bobMessages = await concept._getMessagesInThread({
        thread: threadId,
        user: userBob,
      });
      assertEquals(bobMessages.length, 3, "Bob should now see three messages.");
      console.log(
        "<- Verification: Principle demonstrated successfully. Chat is resilient to one-sided deletion.",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: startChat", async (t) => {
    console.log("\n=== ACTION TEST: startChat ===");
    await t.step("requires: userA and userB must be distinct", async () => {
      try {
        [db, client] = await testDb();
        const concept = new MessagingConcept(db);
        console.log(
          "-> Testing requirement: Cannot start chat with oneself.",
        );
        const result = await concept.startChat({
          userA: userAlice,
          userB: userAlice,
        });
        assert(
          "error" in result,
          "Expected an error when starting a chat with oneself.",
        );
        assertEquals(result.error, "Cannot start a chat with oneself.");
        console.log("<- Verified: Action failed as required.");
      } finally {
        await client?.close();
      }
    });

    await t.step("effects: creates a new thread on first attempt", async () => {
      try {
        [db, client] = await testDb();
        const concept = new MessagingConcept(db);
        console.log("-> Testing effect: Creates a new thread.");
        const result = await concept.startChat({
          userA: userAlice,
          userB: userBob,
        });
        assert("thread" in result, "Expected a thread to be created.");
        const thread = await concept.threads.findOne({ _id: result.thread });
        assertExists(thread, "Thread document was not found in the DB.");
        assert(
          (thread.userA === userAlice && thread.userB === userBob) ||
            (thread.userA === userBob && thread.userB === userAlice),
        );
        console.log("<- Verified: New thread created successfully.");
      } finally {
        await client?.close();
      }
    });

    await t.step(
      "effects: returns existing thread on subsequent attempts",
      async () => {
        try {
          [db, client] = await testDb();
          const concept = new MessagingConcept(db);
          console.log("-> Testing effect: Returns existing thread ID.");
          const result1 = await concept.startChat({
            userA: userAlice,
            userB: userBob,
          });
          assert("thread" in result1);
          const result2 = await concept.startChat({
            userA: userBob,
            userB: userAlice,
          }); // Swapped order
          assert("thread" in result2);
          assertEquals(
            result1.thread,
            result2.thread,
            "Should return the same thread ID.",
          );
          const count = await concept.threads.countDocuments();
          assertEquals(count, 1, "Should not create a duplicate thread.");
          console.log("<- Verified: Correctly returns existing thread.");
        } finally {
          await client?.close();
        }
      },
    );

    await t.step(
      "effects: restores a previously deleted thread",
      async () => {
        try {
          [db, client] = await testDb();
          const concept = new MessagingConcept(db);
          console.log("-> Testing effect: Restores deleted thread.");
          const { thread } = await concept.startChat({
            userA: userAlice,
            userB: userBob,
          }) as { thread: ID };
          await concept.deleteChat({ initiator: userAlice, thread });
          let threadState = await concept.threads.findOne({ _id: thread });
          assert(threadState?.deletedBy.includes(userAlice));

          await concept.startChat({ userA: userAlice, userB: userBob });
          threadState = await concept.threads.findOne({ _id: thread });
          assertEquals(
            threadState?.deletedBy.length,
            0,
            "deletedBy array should be empty after restore.",
          );
          console.log("<- Verified: Thread was restored successfully.");
        } finally {
          await client?.close();
        }
      },
    );
  });

  await test.step("Action: sendMessage", async (t) => {
    console.log("\n=== ACTION TEST: sendMessage ===");
    let threadId: ID;

    const setup = async () => {
      [db, client] = await testDb();
      const concept = new MessagingConcept(db);
      const result = await concept.startChat({
        userA: userAlice,
        userB: userBob,
      });
      threadId = (result as { thread: ID }).thread;
      return { concept, client };
    };

    await t.step(
      "requires: content must not be empty",
      async () => {
        let localClient: MongoClient | null = null;
        try {
          const { concept } = await setup();
          localClient = client;
          console.log("-> Testing requirement: Content must not be empty.");
          const result = await concept.sendMessage({
            content: " ",
            thread: threadId,
            sender: userAlice,
          });
          assert("error" in result);
          assertEquals(result.error, "Message content cannot be empty.");
          console.log("<- Verified: Action failed as required.");
        } finally {
          await localClient?.close();
        }
      },
    );

    await t.step(
      "requires: sender must be a participant",
      async () => {
        let localClient: MongoClient | null = null;
        try {
          const { concept } = await setup();
          localClient = client;
          console.log(
            "-> Testing requirement: Sender must be a participant.",
          );
          const result = await concept.sendMessage({
            content: "Intrusion",
            thread: threadId,
            sender: userCharlie,
          });
          assert("error" in result);
          assertEquals(
            result.error,
            "Sender is not a participant in this thread.",
          );
          console.log("<- Verified: Action failed as required.");
        } finally {
          await localClient?.close();
        }
      },
    );

    await t.step(
      "effects: creates message and updates thread",
      async () => {
        let localClient: MongoClient | null = null;
        try {
          const { concept } = await setup();
          localClient = client;
          console.log("-> Testing effect: Creates message and updates thread.");
          const result = await concept.sendMessage({
            content: "Test message",
            thread: threadId,
            sender: userAlice,
          });
          assert("message" in result);

          const message = await concept.messages.findOne({
            _id: result.message,
          });
          assertExists(message);
          assertEquals(message.content, "Test message");
          assertEquals(message.status, "delivered");

          const thread = await concept.threads.findOne({ _id: threadId });
          assert(
            thread?.messages.includes(result.message),
            "Thread's message list should be updated.",
          );
          console.log("<- Verified: Message created and linked.");
        } finally {
          await localClient?.close();
        }
      },
    );
  });

  await test.step("Action: readMessage", async (t) => {
    console.log("\n=== ACTION TEST: readMessage ===");
    let threadId: ID, messageId: ID;

    const setup = async () => {
      [db, client] = await testDb();
      const concept = new MessagingConcept(db);
      const chatRes = await concept.startChat({
        userA: userAlice,
        userB: userBob,
      });
      threadId = (chatRes as { thread: ID }).thread;
      const msgRes = await concept.sendMessage({
        content: "A message to be read",
        thread: threadId,
        sender: userAlice,
      });
      messageId = (msgRes as { message: ID }).message;
      return { concept, client };
    };

    await t.step(
      "requires: reader cannot be the sender",
      async () => {
        let localClient: MongoClient | null = null;
        try {
          const { concept } = await setup();
          localClient = client;
          console.log("-> Testing requirement: Reader cannot be sender.");
          const result = await concept.readMessage({
            message: messageId,
            reader: userAlice,
          });
          assert(!("error" in result)); // This is a no-op, not an error
          const msg = await concept.messages.findOne({ _id: messageId });
          assertEquals(msg?.status, "delivered", "Status should not change.");
          console.log("<- Verified: Action was a no-op as required.");
        } finally {
          await localClient?.close();
        }
      },
    );

    await t.step(
      "effects: sets message status to 'read'",
      async () => {
        let localClient: MongoClient | null = null;
        try {
          const { concept } = await setup();
          localClient = client;
          console.log("-> Testing effect: Sets status to 'read'.");
          const result = await concept.readMessage({
            message: messageId,
            reader: userBob,
          });
          assert(!("error" in result));
          const msg = await concept.messages.findOne({ _id: messageId });
          assertEquals(msg?.status, "read");
          console.log("<- Verified: Status updated successfully.");
        } finally {
          await localClient?.close();
        }
      },
    );
  });

  await test.step("Action: deleteChat", async (t) => {
    console.log("\n=== ACTION TEST: deleteChat ===");
    let threadId: ID;

    const setup = async () => {
      [db, client] = await testDb();
      const concept = new MessagingConcept(db);
      const result = await concept.startChat({
        userA: userAlice,
        userB: userBob,
      });
      threadId = (result as { thread: ID }).thread;
      return { concept, client };
    };

    await t.step(
      "requires: initiator must be a participant",
      async () => {
        let localClient: MongoClient | null = null;
        try {
          const { concept } = await setup();
          localClient = client;
          console.log(
            "-> Testing requirement: Initiator must be participant.",
          );
          const result = await concept.deleteChat({
            initiator: userCharlie,
            thread: threadId,
          });
          assert("error" in result);
          assertEquals(
            result.error,
            "User is not a participant in this thread.",
          );
          console.log("<- Verified: Action failed as required.");
        } finally {
          await localClient?.close();
        }
      },
    );

    await t.step(
      "effects: hides thread from initiator's view",
      async () => {
        let localClient: MongoClient | null = null;
        try {
          const { concept } = await setup();
          localClient = client;
          console.log("-> Testing effect: Hides thread from initiator.");
          await concept.deleteChat({ initiator: userAlice, thread: threadId });
          const threadState = await concept.threads.findOne({ _id: threadId });
          assert(threadState?.deletedBy.includes(userAlice));

          const userThreads = await concept._getThreadsForUser({
            user: userAlice,
          });
          assertEquals(userThreads.length, 0);
          console.log("<- Verified: Thread is no longer visible to initiator.");
        } finally {
          await localClient?.close();
        }
      },
    );
  });

  await test.step("Queries", async (t) => {
    console.log("\n=== QUERY TESTS ===");
    await t.step(
      "_getThreadsForUser: returns correct threads",
      async () => {
        try {
          [db, client] = await testDb();
          const concept = new MessagingConcept(db);
          console.log(
            "-> Testing query: _getThreadsForUser respects deletions.",
          );

          // Setup: Alice has chats with Bob and Charlie. Bob deletes his.
          const { thread: threadAB } = await concept.startChat({
            userA: userAlice,
            userB: userBob,
          }) as { thread: ID };
          const { thread: threadAC } = await concept.startChat({
            userA: userAlice,
            userB: userCharlie,
          }) as { thread: ID };
          await concept.deleteChat({ initiator: userBob, thread: threadAB });

          // Assertions
          const aliceThreads = await concept._getThreadsForUser({
            user: userAlice,
          });
          assertEquals(
            aliceThreads.length,
            2,
            "Alice should see both threads.",
          );
          const bobThreads = await concept._getThreadsForUser({
            user: userBob,
          });
          assertEquals(
            bobThreads.length,
            0,
            "Bob should see no threads.",
          );
          const charlieThreads = await concept._getThreadsForUser({
            user: userCharlie,
          });
          assertEquals(
            charlieThreads.length,
            1,
            "Charlie should see one thread.",
          );
          console.log("<- Verified: Query returns correct thread lists.");
        } finally {
          await client?.close();
        }
      },
    );

    await t.step(
      "_getMessagesInThread: returns ordered messages",
      async () => {
        try {
          [db, client] = await testDb();
          const concept = new MessagingConcept(db);
          console.log(
            "-> Testing query: _getMessagesInThread returns ordered messages.",
          );

          const { thread } = await concept.startChat({
            userA: userAlice,
            userB: userBob,
          }) as { thread: ID };
          await concept.sendMessage({
            content: "First",
            thread: thread,
            sender: userAlice,
          });
          await new Promise((r) => setTimeout(r, 10)); // Ensure timestamp difference
          await concept.sendMessage({
            content: "Second",
            thread: thread,
            sender: userBob,
          });

          const messages = await concept._getMessagesInThread({
            thread: thread,
            user: userAlice,
          });
          assert(!("error" in messages[0]));
          assertEquals(messages.length, 2);
          assertEquals((messages as any[])[0].content, "First");
          assertEquals((messages as any[])[1].content, "Second");
          console.log("<- Verified: Query returns messages in correct order.");
        } finally {
          await client?.close();
        }
      },
    );
  });
});
```

# prompt: Use the OneRunMatching test suite as an example of interesting test cases. Also follow the format of console output for readability of testing.

[@OneRunMatching](OneRunMatching.test.ts)
# response:

# file: src/concepts/Messaging/MessagingConcept.test.ts

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import MessagingConcept from "./MessagingConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("MessagingConcept", async (test) => {
  let client: MongoClient | null = null;
  let db: Db;

  // Define user IDs for testing clarity
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;

  await test.step("Principle: Full Messaging Lifecycle", async () => {
    console.log("\n--- Principle Test: A Full Messaging Lifecycle ---");
    try {
      [db, client] = await testDb();
      const concept = new MessagingConcept(db);
      let threadId: ID;
      let messageId1: ID;
      let messageId2: ID;

      console.log(
        " > Setup: Three users exist: Alice, Bob, and Charlie. The database is clean.",
      );

      // Step 1: Alice starts a chat with Bob. A new thread is created.
      console.log("\n[Step 1] Alice starts a chat with Bob.");
      const startChatResult = await concept.startChat({
        userA: userAlice,
        userB: userBob,
      });
      assert(
        "thread" in startChatResult,
        `Failed to start chat: ${JSON.stringify(startChatResult)}`,
      );
      threadId = startChatResult.thread;
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
      assert(
        "message" in sendMessage1Result,
        `Failed to send message: ${JSON.stringify(sendMessage1Result)}`,
      );
      messageId1 = sendMessage1Result.message;
      console.log(` > Action: sendMessage -> Message created: ${messageId1}`);
      const msg1State = await concept.messages.findOne({ _id: messageId1 });
      assertEquals(msg1State?.status, "delivered");
      console.log("   ✅ Effect Verified: Message is 'delivered'.");

      // Step 3: Bob sends a reply.
      console.log("\n[Step 3] Bob replies to Alice.");
      const sendMessage2Result = await concept.sendMessage({
        content: "Hi, Alice!",
        thread: threadId,
        sender: userBob,
      });
      assert("message" in sendMessage2Result);
      messageId2 = sendMessage2Result.message;
      console.log(` > Action: sendMessage -> Reply created: ${messageId2}`);
      const threadStateAfterMsgs = await concept.threads.findOne({ _id: threadId });
      assertEquals(threadStateAfterMsgs?.messages.length, 2);
      console.log("   ✅ Effect Verified: Thread now contains 2 messages.");

      // Step 4: Bob reads Alice's message.
      console.log("\n[Step 4] Bob reads Alice's initial message.");
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

      // Step 5: Bob deletes the chat. It should only disappear for him.
      console.log("\n[Step 5] Bob deletes the chat.");
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

      // Step 6: Alice sends another message, which should restore the chat for Bob.
      console.log("\n[Step 6] Alice sends another message, restoring the chat for Bob.");
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
      assertEquals(bobMessages.length, 3, "Bob should see all 3 messages.");
      console.log("   ✅ Effect Verified: Chat restored for Bob with full history.");

      console.log("\n--- Principle Test Completed Successfully ---");
    } finally {
      await client?.close();
    }
  });

  await test.step("Action: startChat requirements and effects", async (t) => {
    console.log("\n--- Test: 'startChat' Action ---");

    await t.step("FAIL: User cannot start a chat with themself", async () => {
      console.log("\n > Testing Requirement: Cannot start chat with oneself.");
      [db, client] = await testDb();
      try {
        const concept = new MessagingConcept(db);
        const result = await concept.startChat({ userA: userAlice, userB: userAlice });
        assert("error" in result);
        assertEquals(result.error, "Cannot start a chat with oneself.");
        console.log("   ✅ Correctly failed as required.");
      } finally {
        await client.close();
      }
    });

    await t.step("SUCCESS: Returns existing thread on subsequent calls", async () => {
      console.log("\n > Testing Effect: Subsequent calls return the same thread.");
      [db, client] = await testDb();
      try {
        const concept = new MessagingConcept(db);
        const res1 = await concept.startChat({ userA: userAlice, userB: userBob });
        assert("thread" in res1);
        const res2 = await concept.startChat({ userA: userBob, userB: userAlice }); // Order swapped
        assert("thread" in res2);

        assertEquals(res1.thread, res2.thread, "Should return the same thread ID.");
        const count = await concept.threads.countDocuments();
        assertEquals(count, 1, "Should not create a duplicate thread.");
        console.log("   ✅ Correctly returned existing thread without duplication.");
      } finally {
        await client.close();
      }
    });
  });

  await test.step("Action: sendMessage requirements and effects", async (t) => {
    console.log("\n--- Test: 'sendMessage' Action ---");

    await t.step("FAIL: Message content cannot be empty", async () => {
      console.log("\n > Testing Requirement: Message content cannot be empty.");
      [db, client] = await testDb();
      try {
        const concept = new MessagingConcept(db);
        const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
        const result = await concept.sendMessage({ content: "  ", thread, sender: userAlice });
        assert("error" in result);
        assertEquals(result.error, "Message content cannot be empty.");
        console.log("   ✅ Correctly failed as required.");
      } finally {
        await client.close();
      }
    });

    await t.step("FAIL: Sender must be a participant in the thread", async () => {
      console.log("\n > Testing Requirement: Sender must be a participant.");
      [db, client] = await testDb();
      try {
        const concept = new MessagingConcept(db);
        const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
        const result = await concept.sendMessage({ content: "I'm an outsider", thread, sender: userCharlie });
        assert("error" in result);
        assertEquals(result.error, "Sender is not a participant in this thread.");
        console.log("   ✅ Correctly failed as required.");
      } finally {
        await client.close();
      }
    });

    await t.step("FAIL: Cannot send message in a self-deleted chat", async () => {
      console.log("\n > Testing Requirement: Cannot send message in deleted chat.");
      [db, client] = await testDb();
      try {
        const concept = new MessagingConcept(db);
        const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
        await concept.deleteChat({ initiator: userAlice, thread });
        const result = await concept.sendMessage({ content: "Hello?", thread, sender: userAlice });
        assert("error" in result);
        assertEquals(result.error, "Cannot send message in a deleted chat. Please restore it first.");
        console.log("   ✅ Correctly failed as required.");
      } finally {
        await client.close();
      }
    });
  });

  await test.step("Action: readMessage effects", async (t) => {
    console.log("\n--- Test: 'readMessage' Action ---");

    await t.step("NO-OP: User cannot mark their own message as read", async () => {
      console.log("\n > Testing Effect: Reading own message is a no-op.");
      [db, client] = await testDb();
      try {
        const concept = new MessagingConcept(db);
        const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
        const { message } = await concept.sendMessage({ content: "To myself", thread, sender: userAlice }) as { message: ID };

        await concept.readMessage({ message, reader: userAlice });
        const msgState = await concept.messages.findOne({ _id: message });
        assertEquals(msgState?.status, "delivered", "Status should not change.");
        console.log("   ✅ Correctly had no effect.");
      } finally {
        await client.close();
      }
    });
  });

  await test.step("Query: _getMessagesInThread", async (t) => {
    console.log("\n--- Test: '_getMessagesInThread' Query ---");

    await t.step("SUCCESS: Returns messages in chronological order", async () => {
      console.log("\n > Testing Effect: Returns messages in correct order.");
      [db, client] = await testDb();
      try {
        const concept = new MessagingConcept(db);
        const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
        await concept.sendMessage({ content: "First", thread, sender: userAlice });
        await new Promise((r) => setTimeout(r, 10)); // Ensure timestamp difference
        await concept.sendMessage({ content: "Second", thread, sender: userBob });

        const messages = await concept._getMessagesInThread({ thread, user: userAlice });
        assert(!("error" in (messages[0] ?? {})));
        assertEquals(messages.length, 2);
        assertEquals((messages as any[])[0].content, "First");
        assertEquals((messages as any[])[1].content, "Second");
        console.log("   ✅ Correctly returned messages in chronological order.");
      } finally {
        await client.close();
      }
    });
  });
});
```

# prompt: Split into multiple deno test cases. Add any other relevant or interesting scenarios.
# response:

Here is a comprehensive Deno test suite for the `MessagingConcept`, split into multiple test cases for clarity and organization. It includes the principle test, action-specific tests for requirements and effects, and several interesting scenarios inspired by the examples.

# file: src/concepts/Messaging/MessagingConcept.test.ts

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import MessagingConcept from "./MessagingConcept.ts";
import { ID } from "@utils/types.ts";

// --- Test Suite Setup ---

// Define user IDs for testing clarity
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;

// --- Test Cases ---

Deno.test("Messaging: Principle Lifecycle of a Resilient Chat", async () => {
  console.log("\n--- Principle Test: A Full Messaging Lifecycle ---");
  const [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);
    let threadId: ID;
    let messageId1: ID;

    console.log(
      " > Setup: Three users exist: Alice, Bob, and Charlie. The database is clean.",
    );

    // Step 1: Alice starts a chat with Bob. A new thread is created.
    console.log("\n[Step 1] Alice starts a chat with Bob.");
    const startChatResult = await concept.startChat({
      userA: userAlice,
      userB: userBob,
    });
    assert("thread" in startChatResult);
    threadId = startChatResult.thread;
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
    messageId1 = sendMessage1Result.message;
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

      // Charlie re-initiates the chat
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
    console.log("\n > Setup: Alice and Bob start a chat and send messages.");
    const { thread } = await concept.startChat({ userA: userAlice, userB: userBob }) as { thread: ID };
    await concept.sendMessage({ content: "Hi", thread, sender: userAlice });

    console.log("\n[Step 1] Alice deletes the chat.");
    await concept.deleteChat({ initiator: userAlice, thread });
    let aliceThreads = await concept._getThreadsForUser({ user: userAlice });
    assertEquals(aliceThreads.length, 0);
    console.log("   ✅ Alice's thread list is empty.");

    console.log("\n[Step 2] Bob deletes the same chat.");
    await concept.deleteChat({ initiator: userBob, thread });
    let bobThreads = await concept._getThreadsForUser({ user: userBob });
    assertEquals(bobThreads.length, 0);
    console.log("   ✅ Bob's thread list is empty.");

    const threadState = await concept.threads.findOne({ _id: thread });
    assertEquals(threadState?.deletedBy.length, 2);
    console.log("   ✅ Database state shows both users have deleted the thread.");

    console.log("\n[Step 3] Alice sends a message to the 'deleted' chat.");
    const result = await concept.sendMessage({ content: "Trying to restore", thread, sender: userAlice });
    assert("error" in result, "Should fail because Alice deleted the chat for herself");
    console.log("   ✅ Alice cannot send a message because she deleted the chat first.");

    console.log("\n[Step 4] Alice re-initiates the chat via startChat.");
    await concept.startChat({ userA: userAlice, userB: userBob });
    aliceThreads = await concept._getThreadsForUser({ user: userAlice });
    bobThreads = await concept._getThreadsForUser({ user: userBob });
    assertEquals(aliceThreads.length, 1, "Chat should be restored for Alice.");
    assertEquals(bobThreads.length, 0, "Chat should remain hidden for Bob.");
    console.log("   ✅ Chat is restored for Alice, but not yet for Bob.");

    console.log("\n[Step 5] Alice sends a message, fully restoring the chat for Bob.");
    await concept.sendMessage({ content: "Now it should work", thread, sender: userAlice });
    bobThreads = await concept._getThreadsForUser({ user: userBob });
    assertEquals(bobThreads.length, 1, "Chat should now be restored for Bob.");
    console.log("   ✅ Chat is now visible to both users again.");
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
```

# prompt: Note that a user cannot start a chat. Change the tests to reflect that after mutual deletion, the thread can be mutually restored with history if startChat is called for the same 2 users.
# response:

Of course. Based on the new requirement that a `startChat` action can mutually restore a thread for two users who have both deleted it, I've updated the relevant test scenario. The other tests remain as they cover different, still-valid aspects of the concept's behavior.

Here is the complete, revised test suite with the updated scenario and clear console output.

# file: src/concepts/Messaging/MessagingConcept.test.ts

```typescript
import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import MessagingConcept from "./MessagingConcept.ts";
import { ID } from "@utils/types.ts";

// --- Test Suite Setup ---

// Define user IDs for testing clarity
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;

// --- Test Cases ---

Deno.test("Messaging: Principle Lifecycle of a Resilient Chat", async () => {
  console.log("\n--- Principle Test: A Full Messaging Lifecycle ---");
  const [db, client] = await testDb();
  try {
    const concept = new MessagingConcept(db);
    let threadId: ID;
    let messageId1: ID;

    console.log(
      " > Setup: Three users exist: Alice, Bob, and Charlie. The database is clean.",
    );

    // Step 1: Alice and Bob are connected, creating a thread.
    console.log("\n[Step 1] A chat thread is created for Alice and Bob.");
    const startChatResult = await concept.startChat({
      userA: userAlice,
      userB: userBob,
    });
    assert("thread" in startChatResult);
    threadId = startChatResult.thread;
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
    messageId1 = sendMessage1Result.message;
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
    assertEquals((messages as any[])[0].content, "Initial message");
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
```