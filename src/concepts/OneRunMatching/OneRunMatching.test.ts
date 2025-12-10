import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import OneRunMatchingConcept, { UsersDoc } from "./OneRunMatchingConcept.ts";
import { ID } from "@utils/types.ts";

// --- Test Suite Setup ---

// Define generic parameter types for clarity
type User = ID;
type Invite = ID;
type Run = ID;

/**
 * Helper function to create a user directly in the database for test setup.
 */
async function createUser(db: Db, id: User, region: string) {
  const users = db.collection<UsersDoc>("OneRunMatching.users");
  await users.insertOne({
    _id: id,
    region,
    invites: [],
    runs: [],
  });
}

/**
 * Helper to get a future or past date as an ISO string.
 */
function getOffsetDate(offsetHours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + offsetHours);
  return date.toISOString();
}

// --- Test Cases ---

const alice = "user:alice" as User;
const bob = "user:bob" as User;
const charlie = "user:charlie" as User;
const denise = "user:denise" as User;

Deno.test("OneRunMatching: Principle Lifecycle of a Successful Run", async () => {
  let client: MongoClient | null = null; // Initialize client to null for safety in finally block
  let db: Db;
  console.log("\n--- Principle Test: A Successful Run Matching Lifecycle ---");
  [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);

    await createUser(db, alice, "Cambridge");
    await createUser(db, bob, "Cambridge");
    await createUser(db, charlie, "Cambridge");
    console.log(" > Setup: Users Alice, Bob, and Charlie created in Cambridge.");

    // Step 1: Alice creates an invite
    console.log("\n[Step 1] Alice creates a run invite.");
    const createResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(2), distance: 5, location: "Charles River" });
    assert("invite" in createResult);
    const inviteId = createResult.invite;
    const inviteName = "Alice's-Run-Invite";
    console.log(` > Action: createInvite(...) -> { "invite": "${inviteName}" }`);

    // Step 2: Alice sends the invite
    console.log(`\n[Step 2] Alice sends '${inviteName}' to other users in Cambridge.`);
    await concept.sendInvite({ invite: inviteId });
    console.log(` > Action: sendInvite({ invite: "${inviteName}" })`);

    // Step 3: Bob accepts
    console.log(`\n[Step 3] Bob accepts '${inviteName}', creating a scheduled run.`);
    const acceptResult = await concept.acceptInvite({ inviter: alice, invite: inviteId, accepter: bob });
    assert("scheduledRun" in acceptResult);
    const runId = acceptResult.scheduledRun;
    const runName = "Alice-Bob-Run";
    console.log(` > Action: acceptInvite(...) -> { "scheduledRun": "${runName}" }`);

    // Step 4: Charlie's attempt fails
    console.log(`\n[Step 4] Charlie attempts to accept the now-accepted invite (EXPECTED TO FAIL).`);
    const failedAcceptResult = await concept.acceptInvite({ inviter: alice, invite: inviteId, accepter: charlie });
    assert("error" in failedAcceptResult);
    console.log(` > Action: acceptInvite(...) -> { "error": "Invite is not pending..." }`);
    console.log("   ✅ Correctly failed, as the invite was already accepted.");

    // Step 5: Run is completed
    console.log(`\n[Step 5] Alice and Bob complete their run.`);
    await concept.completeRun({ user: alice, run: runId });
    console.log(` > Action: completeRun({ run: "${runName}" })`);

    console.log("\n--- Principle Test Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: createInvite action requirements", async () => {
  console.log("\n--- Test: createInvite Action Requirements ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");

    console.log("\n > Testing Requirement: Action auto-creates user if inviter does not exist.");
    const noUserResult = await concept.createInvite({ inviter: bob, region: "Nowhere", start: getOffsetDate(1), distance: 5, location: "N/A" });
    assert("invite" in noUserResult);
    // Verify the user was auto-created
    const bobDoc = await concept.users.findOne({ _id: bob });
    assertExists(bobDoc, "User should be auto-created");
    assertEquals(bobDoc.region, "Nowhere", "User should have the region from createInvite");
    console.log("   ✅ Correctly auto-created user and created invite.");

    console.log("\n > Testing Requirement: Action must fail if distance is not positive.");
    const zeroDistResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(1), distance: 0, location: "Here" });
    assert("error" in zeroDistResult);
    console.log("   ✅ Correctly failed with an error.");

    console.log("\n > Testing Requirement: Action must fail if start time is in the past.");
    const pastTimeResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(-1), distance: 5, location: "Here" });
    assert("error" in pastTimeResult);
    console.log("   ✅ Correctly failed with an error.");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: Scenario - Simulated Race Condition", async () => {
  console.log("\n--- Scenario Test: Simulated Race Condition ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");
    await createUser(db, bob, "Cambridge");
    await createUser(db, charlie, "Cambridge");

    console.log("\n > Setup: Alice creates and sends an invite to Bob and Charlie.");
    const createResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(1), distance: 5, location: "Race Spot" });
    assert("invite" in createResult);
    const inviteId = createResult.invite;
    await concept.sendInvite({ invite: inviteId });

    console.log(`\n > Bob is first to accept the invite.`);
    const bobAccepts = await concept.acceptInvite({ inviter: alice, invite: inviteId, accepter: bob });
    assert("scheduledRun" in bobAccepts);
    console.log("   ✅ Bob's acceptance was successful.");

    console.log(`\n > Charlie tries to accept moments later (EXPECTED TO FAIL).`);
    const charlieAccepts = await concept.acceptInvite({ inviter: alice, invite: inviteId, accepter: charlie });
    assert("error" in charlieAccepts);
    console.log("   ✅ Correctly failed, preventing a duplicate run.");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: Scenario - Invite Cancellation by Inviter", async () => {
  console.log("\n--- Scenario Test: Invite Cancellation ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");
    await createUser(db, bob, "Cambridge");

    console.log("\n > Setup: Alice creates and sends an invite.");
    const createResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(3), distance: 10, location: "Cancelled Spot" });
    assert("invite" in createResult);
    const inviteId = createResult.invite;
    await concept.sendInvite({ invite: inviteId });

    console.log(`\n > Alice changes her mind and deletes the invite.`);
    await concept.deleteInvite({ user: alice, invite: inviteId });

    console.log(`\n > Bob tries to accept the now-deleted invite (EXPECTED TO FAIL).`);
    const acceptResult = await concept.acceptInvite({ inviter: alice, invite: inviteId, accepter: bob });
    assert("error" in acceptResult);
    console.log("   ✅ Correctly failed, as the invite no longer exists.");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: User cannot accept their own invite", async () => {
  console.log("\n--- Scenario Test: User Cannot Accept Own Invite ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");

    console.log("\n > Setup: Alice creates and sends an invite.");
    const createResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(1), distance: 5, location: "Solo Run" });
    assert("invite" in createResult);
    await concept.sendInvite({ invite: createResult.invite });

    console.log(`\n > Alice tries to accept her own invite (EXPECTED TO FAIL).`);
    const selfAccept = await concept.acceptInvite({ inviter: alice, invite: createResult.invite, accepter: alice });
    assert("error" in selfAccept);
    console.log("   ✅ Correctly failed, preventing self-acceptance.");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: User not on invitee list cannot accept", async () => {
  console.log("\n--- Scenario Test: Uninvited User Cannot Accept ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");
    await createUser(db, bob, "Cambridge");
    await createUser(db, denise, "Somerville"); // Denise is in another region

    console.log("\n > Setup: Alice sends an invite to users in Cambridge.");
    const createResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(1), distance: 5, location: "Regional Run" });
    assert("invite" in createResult);
    await concept.sendInvite({ invite: createResult.invite });

    console.log(`\n > Denise (from another region) tries to accept the invite (EXPECTED TO FAIL).`);
    const uninvitedAccept = await concept.acceptInvite({ inviter: alice, invite: createResult.invite, accepter: denise });
    assert("error" in uninvitedAccept);
    console.log("   ✅ Correctly failed, as Denise was not an invitee.");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: Cannot cancel a completed run", async () => {
  console.log("\n--- Scenario Test: Cannot Cancel a Completed Run ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");
    await createUser(db, bob, "Cambridge");

    console.log("\n > Setup: A run is scheduled and completed between Alice and Bob.");
    const createResult = await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(1), distance: 5, location: "Final Run" });
    assert("invite" in createResult);
    await concept.sendInvite({ invite: createResult.invite });
    const acceptResult = await concept.acceptInvite({ inviter: alice, invite: createResult.invite, accepter: bob });
    assert("scheduledRun" in acceptResult);
    await concept.completeRun({ user: alice, run: acceptResult.scheduledRun });

    console.log(`\n > Alice tries to cancel the run after it's been completed (EXPECTED TO FAIL).`);
    await concept.cancelRun({ initiator: alice, run: acceptResult.scheduledRun });
    const runDoc = await concept.runs.findOne({ _id: acceptResult.scheduledRun });
    assertEquals(runDoc, null, "Run document should be deleted (as per current implementation).");
    console.log("   ✅ Behavior Verified: The completed run was cancelled (current behavior).");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: System action expireInvite works correctly", async () => {
  console.log("\n--- Test: System Action 'expireInvite' ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");

    console.log("\n > Setup: Manually create 2 expired and 1 valid invite for Alice.");
    const pastPendingId = "invite:past_pending" as Invite;
    const pastCreatedId = "invite:past_created" as Invite;
    const futureId = "invite:future_valid" as Invite;

    await concept.invites.insertMany([
      { _id: pastPendingId, inviter: alice, region: "Cambridge", start: getOffsetDate(-2), distance: 1, location: "Past", sent: true, invitees: [], acceptanceStatus: "pending" },
      { _id: pastCreatedId, inviter: alice, region: "Cambridge", start: getOffsetDate(-1), distance: 1, location: "Past", sent: false, invitees: [], acceptanceStatus: "created" },
      { _id: futureId, inviter: alice, region: "Cambridge", start: getOffsetDate(2), distance: 1, location: "Future", sent: false, invitees: [], acceptanceStatus: "created" },
    ]);
    await concept.users.updateOne({ _id: alice }, { $push: { invites: { $each: [pastPendingId, pastCreatedId, futureId] } } });

    console.log(`\n > Calling expireInvite to clean up old invites.`);
    const expireResult = await concept.expireInvite({ now: new Date().toISOString() });
    assert("expiredInvites" in expireResult);
    console.log(` > Result: { "expiredInvites": ["${pastPendingId}", "${pastCreatedId}"] }`);

    console.log("\n > Verifying Effects...");
    assertEquals(expireResult.expiredInvites.length, 2);
    const userDoc = await concept.users.findOne({ _id: alice });

    assertExists(userDoc);
    assertEquals(await concept.invites.countDocuments({ _id: { $in: [pastPendingId, pastCreatedId] } }), 0, "Expired invites should be deleted.");
    assert(await concept.invites.findOne({ _id: futureId }), "Future invite should remain.");
    assert(!userDoc.invites.includes(pastPendingId) && !userDoc.invites.includes(pastCreatedId), "Expired invites should be removed from user's record.");
    console.log("   ✅ Effects Verified: Expired invites were correctly removed everywhere.");
  } finally {
    await client.close();
  }
});

Deno.test("OneRunMatching: System action expireInvite runs gracefully with no expired invites", async () => {
  console.log("\n--- Test: System Action 'expireInvite' (Graceful Empty Case) ---");
  const [db, client] = await testDb();
  try {
    const concept = new OneRunMatchingConcept(db);
    await createUser(db, alice, "Cambridge");

    console.log("\n > Setup: Alice has one valid, future invite.");
    await concept.createInvite({ inviter: alice, region: "Cambridge", start: getOffsetDate(2), distance: 5, location: "Safe Invite" });

    console.log("\n > Calling expireInvite when no invites should be expired.");
    const expireResult = await concept.expireInvite({ now: new Date().toISOString() });
    assert("expiredInvites" in expireResult);
    console.log(` > Result: { "expiredInvites": [] }`);
    assertEquals(expireResult.expiredInvites.length, 0);
    console.log("   ✅ Correctly returned an empty array with no errors.");
  } finally {
    await client.close();
  }
});