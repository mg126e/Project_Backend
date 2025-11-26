
import { assertEquals, assertNotEquals } from "@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserProfileConcept from "./UserProfileConcept.ts";

const userA = "user:Alice" as ID;

	Deno.test("Principle: User creates profile and sets personal information", async () => {
		const [db, client] = await testDb();
		const concept = new UserProfileConcept(db);
		try {
			console.log("1. Creating user profile");
			const createResult = await concept.createProfile({ user: userA });
			assertNotEquals("error" in createResult, true, "Profile creation should succeed");
			console.log("   ✓ Profile created");

			const setNameResult = await concept.setName({ user: userA, displayname: "RunnerAlice" });
			assertNotEquals("error" in setNameResult, true, "Setting display name should succeed");
			const setBioResult = await concept.setBio({ user: userA, bio: "Love running marathons!" });
			assertNotEquals("error" in setBioResult, true, "Setting bio should succeed");
			const setLocationResult = await concept.setLocation({ user: userA, location: "NYC" });
			assertNotEquals("error" in setLocationResult, true, "Setting location should succeed");
			const setECResult = await concept.setEmergencyContact({ user: userA, name: "Alice Mom", phone: "555-1234" });
			assertNotEquals("error" in setECResult, true, "Setting emergency contact should succeed");
			const setImageResult = await concept.setProfileImage({ user: userA, image: "file:imgid123" as ID });
			assertNotEquals("error" in setImageResult, true, "Setting profile image should succeed");
			const setTagResult = await concept.setTag({ user: userA, tagType: "runningPace", value: "fast" });
			assertNotEquals("error" in setTagResult, true, "Setting tag should succeed");
			const removeTagResult = await concept.removeTag({ user: userA, tagType: "runningPace" });
			assertNotEquals("error" in removeTagResult, true, "Removing tag should succeed");
			console.log("   ✓ All profile fields set and tag added/removed");
		} finally {
			await client.close();
		}
	});

	Deno.test("Action: createProfile enforces uniqueness", async () => {
		const [db, client] = await testDb();
		const concept = new UserProfileConcept(db);
		try {
			console.log("1. Creating user profile for uniqueness test");
			const createResult = await concept.createProfile({ user: userA });
			assertNotEquals("error" in createResult, true, "Profile creation should succeed");
			const duplicateResult = await concept.createProfile({ user: userA });
			assertEquals("error" in duplicateResult, true, "Duplicate profile creation should fail");
			if ("error" in duplicateResult) {
				console.log(`   ✓ Duplicate correctly rejected: ${duplicateResult.error}`);
			}
		} finally {
			await client.close();
		}
	});

	Deno.test("Action: setTag only allows allowed tags", async () => {
		const [db, client] = await testDb();
		const concept = new UserProfileConcept(db);
		try {
			await concept.createProfile({ user: userA });
			const allowed = await concept.setTag({ user: userA, tagType: "gender", value: "female" });
			assertNotEquals("error" in allowed, true, "Allowed tag should succeed");
			const disallowed = await concept.setTag({ user: userA, tagType: "notAllowed" as any, value: "x" });
			assertEquals("error" in disallowed, true, "Disallowed tag should fail");
			if ("error" in disallowed) {
				console.log(`   ✓ Disallowed tag correctly rejected: ${disallowed.error}`);
			}
		} finally {
			await client.close();
		}
	});

	Deno.test("Action: removeTag fails for missing tag", async () => {
		const [db, client] = await testDb();
		const concept = new UserProfileConcept(db);
		try {
			await concept.createProfile({ user: userA });
			const result = await concept.removeTag({ user: userA, tagType: "runningLevel" });
			assertEquals("error" in result, true, "Removing non-existent tag should fail");
			if ("error" in result) {
				console.log(`   ✓ Removing non-existent tag correctly rejected: ${result.error}`);
			}
		} finally {
			await client.close();
		}
	});
