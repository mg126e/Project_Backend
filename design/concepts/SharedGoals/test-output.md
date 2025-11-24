Principle: Shared goal lifecycle and input validation ...
------- output -------
1. Creating a shared goal for two users
   ✓ Shared goal created with ID: d82efe57-4775-4270-b0b9-d51d931cddec
2. Attempting to create duplicate active goal for same users and description
   ✓ Duplicate correctly rejected: Active shared goal with these users and description already exists.
3. Creating another goal for same users with different description
   ✓ Second goal created with ID: 24f6558e-bfc1-4e48-902d-7f34266c40a5
4. Creating goal for a different group
   ✓ Group goal created with ID: 02173cec-34e0-4410-ab81-95279751a504
5. Querying all active goals for [userA, userB]
   ✓ Found 2 active goals for [userA, userB]
----- output end -----
Principle: Shared goal lifecycle and input validation ... ok (1s)
Action: addSharedStep/completeSharedStep manage steps and statuses ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: 7373778f-60c7-4b94-bbcb-b654e15c607f
2. Adding a step
   ✓ Step added with ID: 9005105f-e168-40e5-9ff3-49d07ead7a69
3. Completing the step as userB
   ✓ Step completed by userB
4. Attempting to re-complete the step
   ✓ Re-completion correctly rejected: Step already completed.
5. Attempting to remove completed step
   ✓ Removal correctly rejected: Cannot remove a completed step.
----- output end -----
Action: addSharedStep/completeSharedStep manage steps and statuses ... ok (1s)
Action: generateSharedSteps and regenerateSharedSteps ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: 2863ed5f-ccdb-4ea1-932b-c44341033ffd
2. Generating steps
   ✓ Generated 3 steps
3. Attempting to generate steps again
   ✓ Second generation correctly rejected: Shared steps already exist for this goal.
4. Regenerating steps
   ✓ Regenerated 3 steps
----- output end -----
Action: generateSharedSteps and regenerateSharedSteps ... ok (1s)
Action: error handling for invalid inputs and states ...
------- output -------
1. Attempting to add a step to a non-existent goal
   ✓ Error received: Shared goal not found or user not a member.
2. Attempting to complete a non-existent step
   ✓ Error received: Step not found.
3. Attempting to remove a non-existent step
   ✓ Error received: Step not found.
4. Attempting to close a non-existent goal
   ✓ Error received: Shared goal not found or user not a member.
5. Creating a valid goal
   ✓ Shared goal created with ID: 7b2f0e7f-ec66-4db2-ba10-22360cf1960e
6. Attempting to add a step with empty description
   ✓ Error received: Description must not be empty.
----- output end -----
Action: error handling for invalid inputs and states ... ok (1s)
Action: setInitialized sets and updates group initialization ... ok (908ms)

ok | 5 passed | 0 failed (5s)