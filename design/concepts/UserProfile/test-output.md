Principle: User creates profile and sets personal information ...
------- output -------
1. Creating user profile
   ✓ Profile created
   ✓ All profile fields set and tag added/removed
----- output end -----
Principle: User creates profile and sets personal information ... ok (1s)
Action: createProfile enforces uniqueness ...
------- output -------
1. Creating user profile for uniqueness test
   ✓ Duplicate correctly rejected: Profile for user user:Alice already exists.
----- output end -----
Action: createProfile enforces uniqueness ... ok (809ms)
Action: setTag only allows allowed tags ...
------- output -------
   ✓ Disallowed tag correctly rejected: Tag type 'notAllowed' is not allowed.
----- output end -----
Action: setTag only allows allowed tags ... ok (823ms)
Action: removeTag fails for missing tag ...
------- output -------
   ✓ Removing non-existent tag correctly rejected: Tag type 'runningLevel' not found for user user:Alice.
----- output end -----
Action: removeTag fails for missing tag ... ok (839ms)

ok | 4 passed | 0 failed (3s)