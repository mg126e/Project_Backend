Principle: Shared goal lifecycle and input validation ...
------- output -------
1. Creating a shared goal for two users
   ✓ Shared goal created with ID: 5d79e6cd-fa55-441e-9498-b34ad73eb1a6
2. Attempting to create duplicate active goal for same users and description
   ✓ Duplicate correctly rejected: Active shared goal with these users and description already exists.
3. Creating another goal for same users with different description
   ✓ Second goal created with ID: c79be714-b9b7-4e95-945e-f65d6a0baae2
4. Creating goal for a different group
   ✓ Group goal created with ID: 352ab482-d8f3-411b-b494-41baabb6188a
5. Querying all active goals for [userA, userB]
   ✓ Found 2 active goals for [userA, userB]
----- output end -----
Principle: Shared goal lifecycle and input validation ... ok (1s)
Action: addSharedStep/completeSharedStep manage steps and statuses ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: 0eeacd65-d50a-4f45-a694-d2610c542e52
2. Adding a step
   ✓ Step added with ID: aaad1cbd-ced9-47d6-af16-045cbe693030
3. Completing the step as userB
   ✓ Step completed by userB
4. Attempting to re-complete the step
   ✓ Re-completion correctly rejected: Step already completed.
5. Attempting to remove completed step
   ✓ Removal correctly rejected: Cannot remove a completed step.
----- output end -----
Action: addSharedStep/completeSharedStep manage steps and statuses ... ok (885ms)
Action: generateSharedSteps and regenerateSharedSteps ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: d5df907a-20cc-4a98-9da7-f83d8170bdc7
2. Generating steps
   ✓ Generated 9 steps
3. Attempting to generate steps again
   ✓ Second generation correctly rejected: Shared steps already exist for this goal.
4. Regenerating steps
   ✓ Regenerated 7 steps
----- output end -----
Action: generateSharedSteps and regenerateSharedSteps ... ok (3s)
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
   ✓ Shared goal created with ID: 0ab4c7f9-a2d7-4271-a80c-fa2a026bab7b
6. Attempting to add a step with empty description
   ✓ Error received: Description must not be empty.
----- output end -----
Action: error handling for invalid inputs and states ... ok (761ms)

ok | 4 passed | 0 failed (6s)