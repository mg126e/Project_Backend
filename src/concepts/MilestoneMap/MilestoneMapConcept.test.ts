import { assertEquals, assertNotEquals } from "@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MilestoneMapConcept from "./MilestoneMapConcept.ts";

const userA = "user:alice" as ID;
const userB = "user:bob" as ID;
const userC = "user:carol" as ID;
const fileId1 = "file:photo1" as ID;
const fileId2 = "file:photo2" as ID;

Deno.test("Principle: MilestoneMap creation and uniqueness", async () => {
  const [db, client] = await testDb();
  const milestoneMap = new MilestoneMapConcept(db);
  
  try {
    console.log("1. Creating a MilestoneMap for two users");
    const result1 = await milestoneMap.createMilestoneMap({
      userA,
      userB,
    });
    assertNotEquals("error" in result1, true, "Should create MilestoneMap for two users");
    const mapId1 = (result1 as { milestoneMap: ID }).milestoneMap;
    console.log(`   ✓ MilestoneMap created with ID: ${mapId1}`);

    console.log("2. Attempting to create duplicate MilestoneMap for same user pair");
    const duplicate = await milestoneMap.createMilestoneMap({
      userA,
      userB,
    });
    assertEquals("error" in duplicate, true, "Should not allow duplicate MilestoneMap");
    if ("error" in duplicate) {
      console.log(`   ✓ Duplicate correctly rejected: ${duplicate.error}`);
    }

    console.log("3. Attempting to create MilestoneMap with reversed user order");
    const reversed = await milestoneMap.createMilestoneMap({
      userA: userB,
      userB: userA,
    });
    assertEquals("error" in reversed, true, "Should not allow duplicate even with reversed users");
    if ("error" in reversed) {
      console.log(`   ✓ Reversed pair correctly rejected: ${reversed.error}`);
    }

    console.log("4. Creating MilestoneMap for a different user pair");
    const result2 = await milestoneMap.createMilestoneMap({
      userA,
      userB: userC,
    });
    assertNotEquals("error" in result2, true, "Should create MilestoneMap for different pair");
    const mapId2 = (result2 as { milestoneMap: ID }).milestoneMap;
    console.log(`   ✓ Second MilestoneMap created with ID: ${mapId2}`);

    // Clean up
    await milestoneMap.closeMilestoneMap({ milestoneMap: mapId1, user: userA });
    await milestoneMap.closeMilestoneMap({ milestoneMap: mapId2, user: userA });
  } finally {
    await client.close();
  }
});

Deno.test("Action: Adding milestones to MilestoneMap", async () => {
  const [db, client] = await testDb();
  const milestoneMap = new MilestoneMapConcept(db);
  
  try {
    console.log("1. Creating a MilestoneMap");
    const createResult = await milestoneMap.createMilestoneMap({
      userA,
      userB,
    });
    assertNotEquals("error" in createResult, true, "MilestoneMap creation should succeed");
    const mapId = (createResult as { milestoneMap: ID }).milestoneMap;
    console.log(`   ✓ MilestoneMap created with ID: ${mapId}`);

    console.log("2. Adding a milestone without photo");
    const milestone1 = await milestoneMap.addMilestone({
      milestoneMap: mapId,
      latitude: 42.3601,
      longitude: -71.0589,
      title: "Boston Marathon Finish",
      description: "We finished our first marathon!",
      addedBy: userA,
    });
    assertNotEquals("error" in milestone1, true, "Adding milestone should succeed");
    const milestoneId1 = (milestone1 as { milestone: ID }).milestone;
    console.log(`   ✓ Milestone added with ID: ${milestoneId1}`);

    console.log("3. Adding a milestone with photo");
    const milestone2 = await milestoneMap.addMilestone({
      milestoneMap: mapId,
      latitude: 40.7580,
      longitude: -73.9855,
      title: "Times Square Run",
      description: "5k run through Times Square",
      addedBy: userB,
      photoFileId: fileId1,
    });
    assertNotEquals("error" in milestone2, true, "Adding milestone with photo should succeed");
    const milestoneId2 = (milestone2 as { milestone: ID }).milestone;
    console.log(`   ✓ Milestone with photo added with ID: ${milestoneId2}`);

    console.log("4. Verifying milestones are stored correctly");
    const milestones = await milestoneMap._getMilestones({ milestoneMap: mapId });
    assertEquals(milestones.length, 2, "Should have 2 milestones");
    console.log(`   ✓ Found ${milestones.length} milestones`);
    
    const withPhoto = milestones.find(m => m.photoFileId === fileId1);
    assertNotEquals(withPhoto, undefined, "Should find milestone with photo");
    assertEquals(withPhoto?.title, "Times Square Run", "Photo milestone has correct title");
    console.log(`   ✓ Milestone with photo verified`);

    console.log("5. Attempting to add milestone as non-member");
    const unauthorized = await milestoneMap.addMilestone({
      milestoneMap: mapId,
      latitude: 41.8781,
      longitude: -87.6298,
      title: "Chicago Run",
      description: "Should fail",
      addedBy: userC,
    });
    assertEquals("error" in unauthorized, true, "Should reject milestone from non-member");
    if ("error" in unauthorized) {
      console.log(`   ✓ Unauthorized add correctly rejected: ${unauthorized.error}`);
    }

    // Clean up
    await milestoneMap.closeMilestoneMap({ milestoneMap: mapId, user: userA });
  } finally {
    await client.close();
  }
});

Deno.test("Action: Removing milestones from MilestoneMap", async () => {
  const [db, client] = await testDb();
  const milestoneMap = new MilestoneMapConcept(db);
  
  try {
    console.log("1. Creating a MilestoneMap with milestones");
    const createResult = await milestoneMap.createMilestoneMap({
      userA,
      userB,
    });
    const mapId = (createResult as { milestoneMap: ID }).milestoneMap;
    
    const milestone1 = await milestoneMap.addMilestone({
      milestoneMap: mapId,
      latitude: 42.3601,
      longitude: -71.0589,
      title: "Test Milestone 1",
      description: "First milestone",
      addedBy: userA,
    });
    const milestoneId1 = (milestone1 as { milestone: ID }).milestone;
    
    const milestone2 = await milestoneMap.addMilestone({
      milestoneMap: mapId,
      latitude: 40.7580,
      longitude: -73.9855,
      title: "Test Milestone 2",
      description: "Second milestone",
      addedBy: userB,
      photoFileId: fileId2,
    });
    const milestoneId2 = (milestone2 as { milestone: ID }).milestone;
    console.log(`   ✓ Created map with 2 milestones`);

    console.log("2. Removing first milestone as userB (map member)");
    const removeResult = await milestoneMap.removeMilestone({
      milestone: milestoneId1,
      user: userB,
    });
    assertNotEquals("error" in removeResult, true, "Map member should be able to remove milestone");
    console.log(`   ✓ Milestone removed by userB`);

    console.log("3. Verifying milestone was removed");
    const milestones = await milestoneMap._getMilestones({ milestoneMap: mapId });
    assertEquals(milestones.length, 1, "Should have 1 milestone remaining");
    assertEquals(milestones[0].id, milestoneId2, "Remaining milestone should be the second one");
    console.log(`   ✓ Only 1 milestone remains`);

    console.log("4. Attempting to remove milestone as non-member");
    const unauthorized = await milestoneMap.removeMilestone({
      milestone: milestoneId2,
      user: userC,
    });
    assertEquals("error" in unauthorized, true, "Should reject removal by non-member");
    if ("error" in unauthorized) {
      console.log(`   ✓ Unauthorized removal correctly rejected: ${unauthorized.error}`);
    }

    console.log("5. Attempting to remove non-existent milestone");
    const nonExistent = await milestoneMap.removeMilestone({
      milestone: "fake:milestone" as ID,
      user: userA,
    });
    assertEquals("error" in nonExistent, true, "Should reject removal of non-existent milestone");
    if ("error" in nonExistent) {
      console.log(`   ✓ Non-existent milestone correctly rejected: ${nonExistent.error}`);
    }

    // Clean up
    await milestoneMap.closeMilestoneMap({ milestoneMap: mapId, user: userA });
  } finally {
    await client.close();
  }
});

Deno.test("Action: Closing MilestoneMap (idempotent)", async () => {
  const [db, client] = await testDb();
  const milestoneMap = new MilestoneMapConcept(db);
  
  try {
    console.log("1. Creating a MilestoneMap");
    const createResult = await milestoneMap.createMilestoneMap({
      userA,
      userB,
    });
    const mapId = (createResult as { milestoneMap: ID }).milestoneMap;
    console.log(`   ✓ MilestoneMap created`);

    console.log("2. Verifying map is active");
    const mapBefore = await milestoneMap._getMilestoneMap({ userA, userB });
    assertNotEquals(mapBefore, null, "Map should exist");
    assertEquals(mapBefore?.isActive, true, "Map should be active");
    console.log(`   ✓ Map is active`);

    console.log("3. Closing the MilestoneMap as userA");
    const closeResult1 = await milestoneMap.closeMilestoneMap({
      milestoneMap: mapId,
      user: userA,
    });
    assertNotEquals("error" in closeResult1, true, "Closing should succeed");
    console.log(`   ✓ Map closed by userA`);

    console.log("4. Verifying map is inactive");
    const mapAfter = await milestoneMap._getMilestoneMap({ userA, userB });
    assertNotEquals(mapAfter, null, "Map should still exist");
    assertEquals(mapAfter?.isActive, false, "Map should be inactive");
    console.log(`   ✓ Map is inactive`);

    console.log("5. Closing again (idempotent check)");
    const closeResult2 = await milestoneMap.closeMilestoneMap({
      milestoneMap: mapId,
      user: userB,
    });
    assertNotEquals("error" in closeResult2, true, "Closing again should succeed (idempotent)");
    console.log(`   ✓ Second close succeeded (idempotent behavior)`);

    console.log("6. Attempting to close as non-member");
    const unauthorized = await milestoneMap.closeMilestoneMap({
      milestoneMap: mapId,
      user: userC,
    });
    assertEquals("error" in unauthorized, true, "Should reject close by non-member");
    if ("error" in unauthorized) {
      console.log(`   ✓ Unauthorized close correctly rejected: ${unauthorized.error}`);
    }
  } finally {
    await client.close();
  }
});
