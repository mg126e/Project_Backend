import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import PartnerMatchingConcept, { AcceptanceStatus, ExperienceLevel, Pace, TimeOfDay } from "./PartnerMatchingConcept.ts";
import { ID } from "@utils/types.ts";

// --- Test Suite Setup ---

// Define generic parameter types for clarity in tests
type User = ID;
type Match = ID;

// Define interfaces for state to be used in helper functions
interface Preferences {
  pace: Pace;
  distance: number;
  experience: ExperienceLevel;
  timeOfDay: TimeOfDay;
}
interface ProfileState {
  _id: User;
  preferences: Preferences;
}

/**
 * Helper function to create a user profile directly in the database for test setup.
 */
async function createProfile(db: Db, user: User, preferences: Preferences) {
  const profiles = db.collection<ProfileState>("PartnerMatching.profiles");
  await profiles.insertOne({ _id: user, preferences });
}

// --- Test Users and Profiles ---

const alice = "user:alice" as User;
const bob = "user:bob" as User;
const carol = "user:carol" as User;
const dave = "user:dave" as User;

const alicePrefs: Preferences = {
  pace: Pace._10_12_min_mile,
  distance: 3,
  experience: ExperienceLevel.Beginner,
  timeOfDay: TimeOfDay.Morning,
};

// Bob is highly compatible with Alice (score=4)
const bobPrefs: Preferences = {
  pace: Pace._10_12_min_mile, // Match
  distance: 4, // Match (within 1 mile)
  experience: ExperienceLevel.Beginner, // Match
  timeOfDay: TimeOfDay.Morning, // Match
};

// Dave is partially compatible with Alice, but not enough to match (score=2)
const davePrefs: Preferences = {
  pace: Pace._8_10_min_mile, // No match
  distance: 3, // Match
  experience: ExperienceLevel.Intermediate, // No match
  timeOfDay: TimeOfDay.Morning, // Match
};

// --- Test Cases ---

Deno.test("PartnerMatching: Principle Lifecycle of a Successful Match", async () => {
  let client: MongoClient | null = null;
  let db: Db;
  console.log("\n--- Principle Test: A Successful Partner Matching Lifecycle ---");

  try {
    [db, client] = await testDb();
    const concept = new PartnerMatchingConcept(db);

    await createProfile(db, alice, alicePrefs);
    await createProfile(db, bob, bobPrefs);
    await createProfile(db, dave, davePrefs);
    console.log(
      " > Setup: Profiles created for compatible users (Alice, Bob) and an incompatible one (Dave).",
    );

    // Step 1: System suggests a match to Alice
    console.log("\n[Step 1] System suggests Bob to Alice.");
    const suggestAliceBob = await concept.suggestMatch({
      recipient: alice,
      candidate: bob,
    });
    assert("suggestion" in suggestAliceBob);
    const suggestionAliceToBobId = suggestAliceBob.suggestion;
    console.log(
      ` > Action: suggestMatch(alice, bob) -> { suggestion: "s_alice_bob" }`,
    );

    // Step 2: System suggests the reciprocal match to Bob
    console.log("\n[Step 2] System suggests Alice to Bob.");
    const suggestBobAlice = await concept.suggestMatch({
      recipient: bob,
      candidate: alice,
    });
    assert("suggestion" in suggestBobAlice);
    const suggestionBobToAliceId = suggestBobAlice.suggestion;
    console.log(
      ` > Action: suggestMatch(bob, alice) -> { suggestion: "s_bob_alice" }`,
    );

    // Step 3: System fails to suggest incompatible matches
    console.log(
      "\n[Step 3] System attempts to match Alice and Dave (EXPECTED TO FAIL).",
    );
    const suggestAliceDave = await concept.suggestMatch({
      recipient: alice,
      candidate: dave,
    });
    assert("error" in suggestAliceDave);
    console.log(
      ` > Action: suggestMatch(alice, dave) -> { error: "Users do not have enough matching preferences." }`,
    );
    console.log("   ✅ Correctly failed, as their preference score is too low.");

    // Step 4: Users accept suggestions
    console.log(
      `\n[Step 4] Alice accepts her suggestion. No match is formed yet.`,
    );
    const aliceAccepts = await concept.acceptSuggestion({
      suggestion: suggestionAliceToBobId,
      recipient: alice,
      candidate: bob,
    });
    assert(!("error" in aliceAccepts) && !("match" in aliceAccepts));
    console.log(` > Action: acceptSuggestion("s_alice_bob") -> {}`);

    const suggestionInDb = await concept.suggestions.findOne({
      _id: suggestionAliceToBobId,
    });
    assertEquals(suggestionInDb?.status, AcceptanceStatus.Accepted);
    console.log("   ✅ Alice's suggestion status is now 'accepted'.");

    console.log(
      "\n[Step 5] Bob accepts his suggestion, forming the final match.",
    );
    const bobAccepts = await concept.acceptSuggestion({
      suggestion: suggestionBobToAliceId,
      recipient: bob,
      candidate: alice,
    });
    assert("match" in bobAccepts);
    const matchId = bobAccepts.match;
    console.log(` > Action: acceptSuggestion("s_bob_alice") -> { match: "m_ab" }`);
    console.log("   ✅ A match has been successfully created!");

    // Step 6: Verify effects
    console.log("\n[Step 6] Verifying the effects of the match creation.");
    const matchInDb = await concept.matches.findOne({ _id: matchId });
    assertExists(matchInDb);
    assertEquals(matchInDb.users.sort(), [alice, bob].sort());
    console.log("   ✅ Match document exists in the database.");

    const suggestionsCount = await concept.suggestions.countDocuments({});
    assertEquals(suggestionsCount, 0);
    console.log("   ✅ Both suggestions have been deleted.");

    // Step 7: Unmatching
    console.log("\n[Step 7] Alice and Bob decide to unmatch.");
    const unmatchResult = await concept.unmatch({
      activeMatch: matchId,
      userA: alice,
      userB: bob,
    });
    assert(!("error" in unmatchResult));
    console.log(` > Action: unmatch("m_ab") -> {}`);

    const matchAfterUnmatch = await concept.matches.findOne({ _id: matchId });
    assertEquals(matchAfterUnmatch, null);
    console.log("   ✅ Match document has been deleted.");

    console.log("\n--- Principle Test Completed Successfully ---");
  } finally {
    await client?.close();
  }
});

Deno.test("PartnerMatching: suggestMatch action requirements", async () => {
  let client: MongoClient | null = null;
  let db: Db;
  console.log("\n--- Test: suggestMatch Action Requirements ---");
  try {
    [db, client] = await testDb();
    const concept = new PartnerMatchingConcept(db);
    await createProfile(db, alice, alicePrefs);
    await createProfile(db, bob, bobPrefs);

    console.log("\n > Testing: Cannot create the same suggestion twice.");
    const firstSugg = await concept.suggestMatch({ recipient: alice, candidate: bob });
    assert("suggestion" in firstSugg);
    const secondSugg = await concept.suggestMatch({ recipient: alice, candidate: bob });
    assert("error" in secondSugg);
    assertEquals(
      secondSugg.error,
      "A suggestion from this recipient to this candidate already exists.",
    );
    console.log("   ✅ Correctly failed.");
  } finally {
    await client?.close();
  }
});

Deno.test("PartnerMatching: Scenario - Declining a Suggestion", async () => {
  let client: MongoClient | null = null;
  let db: Db;
  console.log("\n--- Scenario Test: Declining a Suggestion ---");
  try {
    [db, client] = await testDb();
    const concept = new PartnerMatchingConcept(db);
    await createProfile(db, alice, alicePrefs);
    await createProfile(db, bob, bobPrefs);

    console.log(" > Setup: Two-way suggestions are created for Alice and Bob.");
    const res1 = await concept.suggestMatch({ recipient: alice, candidate: bob });
    assert("suggestion" in res1);
    const res2 = await concept.suggestMatch({ recipient: bob, candidate: alice });
    assert("suggestion" in res2);

    console.log("\n > Alice declines her suggestion from Bob.");
    const declineResult = await concept.declineSuggestion({
      suggestion: res1.suggestion,
      recipient: alice,
      candidate: bob,
    });
    assert(!("error" in declineResult));
    console.log(` > Action: declineSuggestion(...) -> {}`);

    const suggestionCount = await concept.suggestions.countDocuments({});
    assertEquals(suggestionCount, 0);
    console.log("   ✅ Correctly deleted both reciprocal suggestions.");
  } finally {
    await client?.close();
  }
});

Deno.test("PartnerMatching: Scenario - Accepting a Non-Pending Suggestion", async () => {
  let client: MongoClient | null = null;
  let db: Db;
  console.log("\n--- Scenario Test: Accepting a Non-Pending Suggestion ---");
  try {
    [db, client] = await testDb();
    const concept = new PartnerMatchingConcept(db);
    await createProfile(db, alice, alicePrefs);
    await createProfile(db, bob, bobPrefs);
    console.log(" > Setup: A suggestion is created and accepted by Alice.");
    const res = await concept.suggestMatch({ recipient: alice, candidate: bob });
    assert("suggestion" in res);
    await concept.acceptSuggestion({
      suggestion: res.suggestion,
      recipient: alice,
      candidate: bob,
    });

    console.log(
      "\n > Alice tries to accept the same suggestion again (EXPECTED TO FAIL).",
    );
    const secondAccept = await concept.acceptSuggestion({
      suggestion: res.suggestion,
      recipient: alice,
      candidate: bob,
    });
    assert("error" in secondAccept);
    assertEquals(secondAccept.error, "Suggestion has already been accepted.");
    console.log(
      ` > Action: acceptSuggestion(...) -> { error: "Suggestion has already been accepted." }`,
    );
  } finally {
    await client?.close();
  }
});

Deno.test("PartnerMatching: unmatch action requirements", async () => {
  let client: MongoClient | null = null;
  let db: Db;
  console.log("\n--- Test: unmatch Action Requirements ---");
  try {
    [db, client] = await testDb();
    const concept = new PartnerMatchingConcept(db);

    const matchId = "match1" as Match;
    await concept.matches.insertOne({ _id: matchId, users: [alice, bob].sort() as [User, User] });
    console.log(" > Setup: An active match exists between Alice and Bob.");

    console.log("\n > Testing unmatch with incorrect users (EXPECTED TO FAIL).");
    const wrongUsersResult = await concept.unmatch({
      activeMatch: matchId,
      userA: alice,
      userB: carol,
    });
    assert("error" in wrongUsersResult);
    assertEquals(
      wrongUsersResult.error,
      "Active match not found between the specified users.",
    );
    console.log(
      ` > Action: unmatch(alice, carol) -> { error: "Active match not found..." }`,
    );
  } finally {
    await client?.close();
  }
});

Deno.test("PartnerMatching: updateProfilePreferences action", async () => {
  let client: MongoClient | null = null;
  let db: Db;
  console.log("\n--- Test: updateProfilePreferences Action ---");
  try {
    [db, client] = await testDb();
    const concept = new PartnerMatchingConcept(db);

    console.log(
      "\n > Testing updating a non-existent profile (auto-creates).",
    );
    const noProfileResult = await concept.updateProfilePreferences({
      user: alice,
      preferences: alicePrefs,
    });
    assert("profile" in noProfileResult);
    console.log("   ✅ Profile was auto-created with upsert.");

    console.log("\n > Testing a valid profile update.");
    const newPreferences: Preferences = { ...alicePrefs, distance: 5 };
    console.log("\n > Testing a valid profile update.");
    const updateResult = await concept.updateProfilePreferences({ user: alice, preferences: newPreferences });
    assert("profile" in updateResult);
    assertEquals(updateResult.profile.preferences.distance, 5);
    console.log(` > Action: updateProfilePreferences(...) -> { profile: ... }`);

    const profileInDb = await concept.profiles.findOne({ _id: alice });
    assertEquals(profileInDb?.preferences.distance, 5);
    console.log("   ✅ Preferences were successfully updated in the database.");
  } finally {
    await client?.close();
  }
});