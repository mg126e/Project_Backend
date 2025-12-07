Principle: MilestoneMap creation and uniqueness ...
------- output -------
1. Creating a MilestoneMap for two users
   ✓ MilestoneMap created with ID: 019af752-b099-7eaf-a9b5-6210bc79e7b3
2. Attempting to create duplicate MilestoneMap for same user pair
   ✓ Duplicate correctly rejected: MilestoneMap already exists for this user pair.
3. Attempting to create MilestoneMap with reversed user order
   ✓ Reversed pair correctly rejected: MilestoneMap already exists for this user pair.
4. Creating MilestoneMap for a different user pair
   ✓ Second MilestoneMap created with ID: 019af752-b10c-7722-9770-e17d00db7b7c
----- output end -----
Principle: MilestoneMap creation and uniqueness ... ok (914ms)
Action: Adding milestones to MilestoneMap ...
------- output -------
1. Creating a MilestoneMap
   ✓ MilestoneMap created with ID: 019af752-b3a1-7e3f-8889-f3a52590bfa8
2. Adding a milestone without photo
   ✓ Milestone added with ID: 019af752-b3ea-74c0-8ff0-7d37fb2b9a6d
3. Adding a milestone with photo
   ✓ Milestone with photo added with ID: 019af752-b422-7625-9dd7-1da62f65ccea
4. Verifying milestones are stored correctly
   ✓ Found 2 milestones
   ✓ Milestone with photo verified
5. Attempting to add milestone as non-member
   ✓ Unauthorized add correctly rejected: User is not a member of this MilestoneMap.
----- output end -----
Action: Adding milestones to MilestoneMap ... ok (756ms)
Action: Removing milestones from MilestoneMap ...
------- output -------
1. Creating a MilestoneMap with milestones
   ✓ Created map with 2 milestones
2. Removing first milestone as userB (map member)
   ✓ Milestone removed by userB
3. Verifying milestone was removed
   ✓ Only 1 milestone remains
4. Attempting to remove milestone as non-member
   ✓ Unauthorized removal correctly rejected: User is not a member of this MilestoneMap.
5. Attempting to remove non-existent milestone
   ✓ Non-existent milestone correctly rejected: Milestone not found.
----- output end -----
Action: Removing milestones from MilestoneMap ... ok (894ms)
Action: Closing MilestoneMap (idempotent) ...
------- output -------
1. Creating a MilestoneMap
   ✓ MilestoneMap created
2. Verifying map is active
   ✓ Map is active
3. Closing the MilestoneMap as userA
   ✓ Map closed by userA
4. Verifying map is inactive
   ✓ Map is inactive
5. Closing again (idempotent check)
   ✓ Second close succeeded (idempotent behavior)
6. Attempting to close as non-member
   ✓ Unauthorized close correctly rejected: User is not a member of this MilestoneMap.
----- output end -----
Action: Closing MilestoneMap (idempotent) ... ok (797ms)

ok | 4 passed | 0 failed (3s)