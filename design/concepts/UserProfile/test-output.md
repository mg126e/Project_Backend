Principle: User creates profile and sets personal information ...
------- output -------
1. Creating user profile
   ✓ Profile created
   ✓ All profile fields set and tag added
----- output end -----
Principle: User creates profile and sets personal information ... ok (1s)
Action: createProfile enforces uniqueness ...
------- output -------
1. Creating user profile for uniqueness test
   ✓ Duplicate correctly rejected: Profile for user user:Alice already exists.
----- output end -----
Action: createProfile enforces uniqueness ... ok (804ms)
Action: setTag only allows allowed tags ...
------- output -------
   ✓ Disallowed tag correctly rejected: Tag type 'notAllowed' is not allowed.
----- output end -----
Action: setTag only allows allowed tags ... ok (821ms)

ok | 3 passed | 0 failed (2s)