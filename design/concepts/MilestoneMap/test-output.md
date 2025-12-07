Principle: MilestoneMap creation and uniqueness ...
------- output -------
1. Creating a MilestoneMap for two users
   ✓ MilestoneMap created with ID: 019af9c6-6bdf-767e-bfe4-2811c544f924
2. Attempting to create duplicate MilestoneMap for same user set
   ✓ Duplicate correctly rejected: MilestoneMap already exists for this set of users.
3. Attempting to create MilestoneMap with reversed user order
   ✓ Reversed pair correctly rejected: MilestoneMap already exists for this set of users.
4. Creating MilestoneMap for a different user set
   ✓ Second MilestoneMap created with ID: 019af9c6-6c46-7110-aaf0-fd0fe6da4c54
5. Attempting to create MilestoneMap with only one user
   ✓ Single user correctly rejected: At least two users required for a MilestoneMap.
----- output end -----
Principle: MilestoneMap creation and uniqueness ... ok (890ms)
Action: Adding milestones to MilestoneMap ...
------- output -------
1. Creating a MilestoneMap
   ✓ MilestoneMap created with ID: 019af9c6-6f01-7a2b-ba0c-0e989646f716
2. Adding a milestone without photo
   ✓ Milestone added with ID: 019af9c6-6f3d-7de6-bed3-8171c07d568d
3. Adding a milestone with photo
   ✓ Milestone with photo added with ID: 019af9c6-6f73-7397-a3d4-7cd9e0923e3f
4. Verifying milestones are stored correctly
   ✓ Found 2 milestones
   ✓ Milestone with photo verified
5. Attempting to add milestone as non-member
   ✓ Unauthorized add correctly rejected: User is not a member of this MilestoneMap.
----- output end -----
Action: Adding milestones to MilestoneMap ... ok (792ms)
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
Action: Removing milestones from MilestoneMap ... ok (901ms)
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
Action: Closing MilestoneMap (idempotent) ... ok (739ms)

ok | 4 passed | 0 failed (3s)