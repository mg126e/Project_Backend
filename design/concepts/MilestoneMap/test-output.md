Principle: MilestoneMap creation and uniqueness ...
------- output -------
1. Creating a MilestoneMap for two users
   ✓ MilestoneMap created with ID: 019af9ed-6dd9-722d-9dd6-4373b5fa9e79
2. Attempting to create duplicate MilestoneMap for same user set
   ✓ Duplicate correctly rejected: MilestoneMap already exists for this set of users.
3. Attempting to create MilestoneMap with reversed user order
   ✓ Reversed pair correctly rejected: MilestoneMap already exists for this set of users.
4. Creating MilestoneMap for a different user set
   ✓ Second MilestoneMap created with ID: 019af9ed-6e3d-7c2f-ad29-29c59acb23be
5. Attempting to create MilestoneMap with only one user
   ✓ Single user correctly rejected: At least two users required for a MilestoneMap.
----- output end -----
Principle: MilestoneMap creation and uniqueness ... ok (774ms)
Action: Adding milestones to MilestoneMap ...
------- output -------
1. Creating a MilestoneMap
   ✓ MilestoneMap created with ID: 019af9ed-7073-7cc5-b398-4df53752fda7
2. Adding a milestone without photo
   ✓ Milestone added with ID: 019af9ed-70ab-7b42-8fd3-5cd4940d10f8
3. Adding a milestone with photo
   ✓ Milestone with photo added with ID: 019af9ed-70e1-7826-8eff-d45f23d808c9
4. Verifying milestones are stored correctly
   ✓ Found 2 milestones
   ✓ Milestone with photo verified
5. Attempting to add milestone as non-member
   ✓ Unauthorized add correctly rejected: User is not a member of this MilestoneMap.
----- output end -----
Action: Adding milestones to MilestoneMap ... ok (713ms)
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
Action: Removing milestones from MilestoneMap ... ok (1s)

ok | 3 passed | 0 failed (2s)