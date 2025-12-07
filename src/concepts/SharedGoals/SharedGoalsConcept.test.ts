import { assertEquals, assertNotEquals } from "@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SharedGoalsConcept from "./SharedGoalsConcept.ts";

const userA = "user:alice" as ID;
const userB = "user:bob" as ID;
const userC = "user:carol" as ID;

Deno.test("Principle: Shared goal lifecycle and input validation", async () => {
  const [db, client] = await testDb();
  const sharedGoals = new SharedGoalsConcept(db);
  try {
    console.log("1. Creating a shared goal for two users");
    const result1 = await sharedGoals.createSharedGoal({
      users: [userA, userB],
      description: "Run a marathon together",
    });
    assertNotEquals("error" in result1, true, "Should create shared goal for two users");
    const goalId1 = (result1 as { sharedGoalId: ID }).sharedGoalId;
    console.log(`   ✓ Shared goal created with ID: ${goalId1}`);

    console.log("2. Attempting to create duplicate active goal for same users and description");
    const duplicate = await sharedGoals.createSharedGoal({
      users: [userA, userB],
      description: "Run a marathon together",
    });
    assertEquals("error" in duplicate, true, "Should not allow duplicate active goal for same users and description");
    if ("error" in duplicate) {
      console.log(`   ✓ Duplicate correctly rejected: ${duplicate.error}`);
    }

    console.log("3. Creating another goal for same users with different description");
    const result2 = await sharedGoals.createSharedGoal({
      users: [userA, userB],
      description: "Train for a 10k",
    });
    assertNotEquals("error" in result2, true, "Should create another goal for same users with different description");
    const goalId2 = (result2 as { sharedGoalId: ID }).sharedGoalId;
    console.log(`   ✓ Second goal created with ID: ${goalId2}`);

    console.log("4. Creating goal for a different group");
    const result3 = await sharedGoals.createSharedGoal({
      users: [userA, userC],
      description: "Run a marathon together",
    });
    assertNotEquals("error" in result3, true, "Should create goal for a different group");
    const goalId3 = (result3 as { sharedGoalId: ID }).sharedGoalId;
    console.log(`   ✓ Group goal created with ID: ${goalId3}`);

    console.log("5. Querying all active goals for [userA, userB]");
    const allGoals = await sharedGoals._getSharedGoals({ users: [userA, userB] });
    assertEquals(allGoals.length, 2, "Should have 2 active goals for [userA, userB]");
    console.log(`   ✓ Found ${allGoals.length} active goals for [userA, userB]`);

    // Clean up
    await sharedGoals.closeSharedGoal({ sharedGoal: goalId1, user: userA });
    await sharedGoals.closeSharedGoal({ sharedGoal: goalId2, user: userA });
    await sharedGoals.closeSharedGoal({ sharedGoal: goalId3, user: userA });
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSharedStep/completeSharedStep manage steps and statuses", async () => {
  const [db, client] = await testDb();
  const sharedGoals = new SharedGoalsConcept(db);

  try {
    console.log("1. Creating a shared goal");
    const createResult = await sharedGoals.createSharedGoal({
      users: [userA, userB],
      description: "Climb a mountain",
    });
    assertNotEquals("error" in createResult, true, "Goal creation should succeed");
    const goalId = (createResult as { sharedGoalId: ID }).sharedGoalId;
    console.log(`   ✓ Shared goal created with ID: ${goalId}`);

    console.log("2. Adding a step");
    const stepDesc = "Buy hiking boots";
    const addStepResult = await sharedGoals.addSharedStep({
      sharedGoal: goalId,
      description: stepDesc,
      user: userA,
    });
    assertNotEquals("error" in addStepResult, true, "Adding step should succeed");
    const stepId = (addStepResult as { step: { _id: ID } }).step._id;
    console.log(`   ✓ Step added with ID: ${stepId}`);

    console.log("3. Completing the step as userB");
    const completeResult = await sharedGoals.completeSharedStep({
      step: stepId,
      user: userB,
    });
    assertNotEquals("error" in completeResult, true, "Completing step should succeed");
    console.log(`   ✓ Step completed by userB`);

    console.log("4. Attempting to re-complete the step");
    const completeAgain = await sharedGoals.completeSharedStep({
      step: stepId,
      user: userA,
    });
    assertEquals("error" in completeAgain, true, "Re-completing should fail");
    if ("error" in completeAgain) {
      console.log(`   ✓ Re-completion correctly rejected: ${completeAgain.error}`);
    }

    console.log("5. Attempting to remove completed step");
    const removeResult = await sharedGoals.removeSharedStep({
      step: stepId,
      user: userA,
    });
    assertEquals("error" in removeResult, true, "Removing completed step should fail");
    if ("error" in removeResult) {
      console.log(`   ✓ Removal correctly rejected: ${removeResult.error}`);
    }

    // Clean up
    await sharedGoals.closeSharedGoal({ sharedGoal: goalId, user: userA });
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateSharedSteps and regenerateSharedSteps", async () => {
  const [db, client] = await testDb();
  const sharedGoals = new SharedGoalsConcept(db);
  try {
    console.log("1. Creating a shared goal");
    const createResult = await sharedGoals.createSharedGoal({
      users: [userA, userB],
      description: "Train for a triathlon",
    });
    assertNotEquals("error" in createResult, true, "Goal creation should succeed");
    const goalId = (createResult as { sharedGoalId: ID }).sharedGoalId;
    console.log(`   ✓ Shared goal created with ID: ${goalId}`);

    console.log("2. Generating steps");
    const genResult = await sharedGoals.generateSharedSteps({ sharedGoal: goalId, user: userA });
    assertNotEquals("error" in genResult, true, "Step generation should succeed");
    const steps = (genResult as { steps: any[] }).steps;
    assertEquals(steps.length > 0, true, "Should generate at least 1 step");
    console.log(`   ✓ Generated ${steps.length} steps`);

    console.log("3. Attempting to generate steps again");
    const genAgain = await sharedGoals.generateSharedSteps({ sharedGoal: goalId, user: userA });
    assertEquals("error" in genAgain, true, "Should not generate steps if already exist");
    if ("error" in genAgain) {
      console.log(`   ✓ Second generation correctly rejected: ${genAgain.error}`);
    }

    console.log("4. Regenerating steps");
    const regenResult = await sharedGoals.regenerateSharedSteps({ sharedGoal: goalId, user: userA });
    assertNotEquals("error" in regenResult, true, "Regeneration should succeed");
    const regenSteps = (regenResult as { steps: any[] }).steps;
    assertEquals(regenSteps.length > 0, true, "Should regenerate at least 1 step");
    console.log(`   ✓ Regenerated ${regenSteps.length} steps`);

    // Clean up
    await sharedGoals.closeSharedGoal({ sharedGoal: goalId, user: userA });
  } finally {
    await client.close();
  }
});

Deno.test("Action: error handling for invalid inputs and states", async () => {
  const [db, client] = await testDb();
  const sharedGoals = new SharedGoalsConcept(db);
  try {
    console.log("1. Attempting to add a step to a non-existent goal");
    const invalidGoalResult = await sharedGoals.addSharedStep({
      sharedGoal: "goal:nonexistent" as ID,
      description: "This should fail",
      user: userA,
    });
    assertEquals("error" in invalidGoalResult, true, "Adding step to non-existent goal should fail");
    if ("error" in invalidGoalResult) {
      console.log(`   ✓ Error received: ${invalidGoalResult.error}`);
    }

    console.log("2. Attempting to complete a non-existent step");
    const completeNonExistent = await sharedGoals.completeSharedStep({
      step: "step:nonexistent" as ID,
      user: userA,
    });
    assertEquals("error" in completeNonExistent, true, "Completing non-existent step should fail");
    if ("error" in completeNonExistent) {
      console.log(`   ✓ Error received: ${completeNonExistent.error}`);
    }

    console.log("3. Attempting to remove a non-existent step");
    const removeNonExistent = await sharedGoals.removeSharedStep({
      step: "step:nonexistent" as ID,
      user: userA,
    });
    assertEquals("error" in removeNonExistent, true, "Removing non-existent step should fail");
    if ("error" in removeNonExistent) {
      console.log(`   ✓ Error received: ${removeNonExistent.error}`);
    }

    console.log("4. Attempting to close a non-existent goal");
    const closeNonExistent = await sharedGoals.closeSharedGoal({
      sharedGoal: "goal:nonexistent" as ID,
      user: userA,
    });
    assertEquals("error" in closeNonExistent, true, "Closing non-existent goal should fail");
    if ("error" in closeNonExistent) {
      console.log(`   ✓ Error received: ${closeNonExistent.error}`);
    }

    console.log("5. Creating a valid goal");
    const createResult = await sharedGoals.createSharedGoal({
      users: [userA, userB],
      description: "Swim across the lake",
    });
    assertNotEquals("error" in createResult, true, "Goal creation should succeed");
    const goalId = (createResult as { sharedGoalId: ID }).sharedGoalId;
    console.log(`   ✓ Shared goal created with ID: ${goalId}`);

    console.log("6. Attempting to add a step with empty description");
    const emptyStepResult = await sharedGoals.addSharedStep({
      sharedGoal: goalId,
      description: "",
      user: userA,
    });
    assertEquals("error" in emptyStepResult, true, "Empty step description should fail");
    if ("error" in emptyStepResult) {
      console.log(`   ✓ Error received: ${emptyStepResult.error}`);
    }

    // Clean up
    await sharedGoals.closeSharedGoal({ sharedGoal: goalId, user: userA });
  } finally {
    await client.close();
  }
});
