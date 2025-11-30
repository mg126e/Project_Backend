Principle: Shared goal lifecycle and input validation ...
------- output -------
1. Creating a shared goal for two users
   ✓ Shared goal created with ID: 96679c63-0388-45af-867d-aabcce384b03
2. Attempting to create duplicate active goal for same users and description
   ✓ Duplicate correctly rejected: Active shared goal with these users and description already exists.
3. Creating another goal for same users with different description
   ✓ Second goal created with ID: fe876947-a811-4efc-8299-ddda061bbb8e
4. Creating goal for a different group
   ✓ Group goal created with ID: 82ff2977-156a-4a51-8ff1-9e5b22ad18db
5. Querying all active goals for [userA, userB]
   ✓ Found 2 active goals for [userA, userB]
----- output end -----
Principle: Shared goal lifecycle and input validation ... ok (1s)
Action: addSharedStep/completeSharedStep manage steps and statuses ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: b60a42da-993e-42a9-935f-09589b51bdbb
2. Adding a step
   ✓ Step added with ID: f0a6ea8d-3b2e-4480-811e-616232ee63cb
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
   ✓ Shared goal created with ID: 21f372d0-3a62-42e2-ac90-eb8b825275b3
2. Generating steps
   ✓ Generated 9 steps
3. Attempting to generate steps again
   ✓ Second generation correctly rejected: Shared steps already exist for this goal.
4. Regenerating steps
   ✓ Regenerated 9 steps
----- output end -----
Action: generateSharedSteps and regenerateSharedSteps ... ok (8s)
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
   ✓ Shared goal created with ID: 09fa61bc-b394-461a-be7c-63475f4b12eb
6. Attempting to add a step with empty description
   ✓ Error received: Description must not be empty.
----- output end -----
Action: error handling for invalid inputs and states ... ok (956ms)
Action: setInitialized sets and updates group initialization ... ok (876ms)

ok | 5 passed | 0 failed (12s)