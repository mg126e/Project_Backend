Principle: Shared goal lifecycle and input validation ...
------- output -------
1. Creating a shared goal for two users
   ✓ Shared goal created with ID: 14535253-8561-4c35-9f2b-ce3516209a9b
2. Attempting to create duplicate active goal for same users and description
   ✓ Duplicate correctly rejected: Active shared goal with these users and description already exists.
3. Creating another goal for same users with different description
   ✓ Second goal created with ID: 54cc3329-1880-4b1e-b4e2-305ce9d9c9c5
4. Creating goal for a different group
   ✓ Group goal created with ID: 394da4ed-c906-4151-94ed-403f9d1e69e8
5. Querying all active goals for [userA, userB]
   ✓ Found 2 active goals for [userA, userB]
----- output end -----
Principle: Shared goal lifecycle and input validation ... ok (1s)
Action: addSharedStep/completeSharedStep manage steps and statuses ...
------- output -------
1. Creating a shared goal
   ✓ Shared goal created with ID: 939ae85a-bf67-425b-b229-eb8a607a46cf
2. Adding a step
   ✓ Step added with ID: c6c7e3e7-00f5-486a-9002-34011c529645
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
   ✓ Shared goal created with ID: c0a2b617-492e-4d58-8a51-4599188e3c0a
2. Generating steps
   ✓ Generated 6 steps
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
   ✓ Shared goal created with ID: 2ea28932-4ffd-4498-a8fd-f1c742edf627
6. Attempting to add a step with empty description
   ✓ Error received: Description must not be empty.
----- output end -----
Action: error handling for invalid inputs and states ... ok (947ms)
Action: setInitialized sets and updates group initialization ... ok (866ms)

ok | 5 passed | 0 failed (7s)