Principle: Shared goal lifecycle and input validation ...
------- output -------
1. Creating a shared goal for two users
   ✓ Shared goal created with ID: e6911d49-6192-46df-a1e1-48166bdf6ff1
2. Attempting to create duplicate active goal for same users and description
   ✓ Duplicate correctly rejected: Active shared goal with these users and description already exists.
3. Creating another goal for same users with different description
   ✓ Second goal created with ID: 4ffcc247-8ba6-4b97-8cf3-c3577b4c3dac
4. Creating goal for a different group
   ✓ Group goal created with ID: a7c01beb-d8c3-45dd-abc2-4c026ea06274
5. Querying all active goals for [userA, userB]
   ✓ Found 2 active goals for [userA, userB]
----- output end -----
Principle: Shared goal lifecycle and input validation ... ok (940ms)
Action: addSharedStep/completeSharedStep manage steps and statuses ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: b45f4ffa-2aa7-4dae-8d33-0c6cdc87fad4
2. Adding a step
   ✓ Step added with ID: beeb641f-3e2c-46f1-9a12-71726e2cac79
3. Completing the step as userB
   ✓ Step completed by userB
4. Attempting to re-complete the step
   ✓ Re-completion correctly rejected: Step already completed.
5. Attempting to remove completed step
   ✓ Removal correctly rejected: Cannot remove a completed step.
----- output end -----
Action: addSharedStep/completeSharedStep manage steps and statuses ... ok (871ms)
Action: generateSharedSteps and regenerateSharedSteps ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: f06cdd69-66bd-4624-ab57-20110df48ca1
2. Generating steps
   ✓ Generated 8 steps
3. Attempting to generate steps again
   ✓ Second generation correctly rejected: Shared steps already exist for this goal.
4. Regenerating steps
   ✓ Regenerated 10 steps
----- output end -----
Action: generateSharedSteps and regenerateSharedSteps ... ok (4s)
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
   ✓ Shared goal created with ID: c6c560a2-d88c-4d70-8006-a736409219fd
6. Attempting to add a step with empty description
   ✓ Error received: Description must not be empty.
----- output end -----
Action: error handling for invalid inputs and states ... ok (841ms)

ok | 4 passed | 0 failed (7s)