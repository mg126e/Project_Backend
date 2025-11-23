import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SessioningConcept from "./SessioningConcept.ts";

const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

Deno.test("Principle: User logs in, gets a session, can be identified by session, then logs out", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    console.log("1. Starting a session for user A");
    const startResult = await sessioning.start({ user: userA });
    assertNotEquals(
      "error" in startResult,
      true,
      "Starting session should succeed",
    );
    const { session } = startResult as { session: ID };
    assertExists(session, "Session ID should be returned");
    console.log(`   ✓ Session started: ${session}`);

    console.log("2. Getting user from session");
    const getUserResult = await sessioning._getUser({ session });
    assertEquals(
      Array.isArray(getUserResult),
      true,
      "Getting user should return an array",
    );
    assertNotEquals(
      "error" in getUserResult[0],
      true,
      "Getting user should succeed",
    );
    assertEquals(
      (getUserResult[0] as { user: ID }).user,
      userA,
      "Should return correct user",
    );
    console.log(`   ✓ Correct user retrieved from session`);

    console.log("4. Ending the session");
    const endResult = await sessioning.end({ session });
    assertNotEquals(
      "error" in endResult,
      true,
      "Ending session should succeed",
    );
    console.log(`   ✓ Session ended`);

    console.log("5. Verifying session no longer exists");
    const checkLoggedIn = await sessioning._getUser({ session });
    assertEquals(
      Array.isArray(checkLoggedIn),
      true,
      "Should return an array",
    );
    assertEquals(
      "error" in checkLoggedIn[0],
      true,
      "Should return error for invalid session",
    );
    console.log(`   ✓ Session no longer valid`);
    console.log(
      "6. Principle satisfied: Sessions track user identity across requests",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: Multiple users can have separate sessions", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    console.log("1. Starting sessions for two different users");
    const sessionA = await sessioning.start({ user: userA });
    const sessionB = await sessioning.start({ user: userB });

    assertNotEquals("error" in sessionA, true, "Session A should start");
    assertNotEquals("error" in sessionB, true, "Session B should start");

    const sessionAId = (sessionA as { session: ID }).session;
    const sessionBId = (sessionB as { session: ID }).session;
    console.log(`   ✓ Two sessions created`);

    console.log("2. Verifying each session returns correct user");
    const userFromA = await sessioning._getUser({ session: sessionAId });
    const userFromB = await sessioning._getUser({ session: sessionBId });

    assertEquals(
      (userFromA[0] as { user: ID }).user,
      userA,
      "Session A should return user A",
    );
    assertEquals(
      (userFromB[0] as { user: ID }).user,
      userB,
      "Session B should return user B",
    );
    console.log(`   ✓ Each session correctly identifies its user`);
    console.log("3. Multiple concurrent sessions work correctly");
  } finally {
    await client.close();
  }
});
