PartnerMatching: Principle Lifecycle of a Successful Match ...
------- output -------

--- Principle Test: A Successful Partner Matching Lifecycle ---
 > Setup: Profiles created for compatible users (Alice, Bob) and an incompatible one (Dave).

[Step 1] System suggests Bob to Alice.
[ensurePartnerMatchingProfile] Profile already exists for user: user:alice
[ensurePartnerMatchingProfile] Profile already exists for user: user:bob
 > Action: suggestMatch(alice, bob) -> { suggestion: "s_alice_bob" }

[Step 2] System suggests Alice to Bob.
[ensurePartnerMatchingProfile] Profile already exists for user: user:bob
[ensurePartnerMatchingProfile] Profile already exists for user: user:alice
 > Action: suggestMatch(bob, alice) -> { suggestion: "s_bob_alice" }

[Step 3] System attempts to match Alice and Dave (EXPECTED TO FAIL).
[ensurePartnerMatchingProfile] Profile already exists for user: user:alice
[ensurePartnerMatchingProfile] Profile already exists for user: user:dave
 > Action: suggestMatch(alice, dave) -> { error: "Users do not have enough matching preferences." }
   ✅ Correctly failed, as their preference score is too low.

[Step 4] Alice accepts her suggestion. No match is formed yet.
 > Action: acceptSuggestion("s_alice_bob") -> {}
   ✅ Alice's suggestion status is now 'accepted'.

[Step 5] Bob accepts his suggestion, forming the final match.
 > Action: acceptSuggestion("s_bob_alice") -> { match: "m_ab" }
   ✅ A match has been successfully created!

[Step 6] Verifying the effects of the match creation.
   ✅ Match document exists in the database.
   ✅ Both suggestions have been deleted.

[Step 7] Alice and Bob decide to unmatch.
 > Action: unmatch("m_ab") -> {}
   ✅ Match document has been deleted.

--- Principle Test Completed Successfully ---
----- output end -----
PartnerMatching: Principle Lifecycle of a Successful Match ... ok (1s)
PartnerMatching: suggestMatch action requirements ...
------- output -------

--- Test: suggestMatch Action Requirements ---

 > Testing: Cannot create the same suggestion twice.
[ensurePartnerMatchingProfile] Profile already exists for user: user:alice
[ensurePartnerMatchingProfile] Profile already exists for user: user:bob
   ✅ Correctly failed.
----- output end -----
PartnerMatching: suggestMatch action requirements ... ok (889ms)
PartnerMatching: Scenario - Declining a Suggestion ...
------- output -------

--- Scenario Test: Declining a Suggestion ---
 > Setup: Two-way suggestions are created for Alice and Bob.
[ensurePartnerMatchingProfile] Profile already exists for user: user:alice
[ensurePartnerMatchingProfile] Profile already exists for user: user:bob
[ensurePartnerMatchingProfile] Profile already exists for user: user:bob
[ensurePartnerMatchingProfile] Profile already exists for user: user:alice

 > Alice declines her suggestion from Bob.
 > Action: declineSuggestion(...) -> {}
   ✅ Correctly deleted both reciprocal suggestions.
----- output end -----
PartnerMatching: Scenario - Declining a Suggestion ... ok (1s)
PartnerMatching: Scenario - Accepting a Non-Pending Suggestion ...
------- output -------

--- Scenario Test: Accepting a Non-Pending Suggestion ---
 > Setup: A suggestion is created and accepted by Alice.
[ensurePartnerMatchingProfile] Profile already exists for user: user:alice
[ensurePartnerMatchingProfile] Profile already exists for user: user:bob

 > Alice tries to accept the same suggestion again (EXPECTED TO FAIL).
 > Action: acceptSuggestion(...) -> { error: "Suggestion has already been accepted." }
----- output end -----
PartnerMatching: Scenario - Accepting a Non-Pending Suggestion ... ok (854ms)
PartnerMatching: unmatch action requirements ...
------- output -------

--- Test: unmatch Action Requirements ---
 > Setup: An active match exists between Alice and Bob.

 > Testing unmatch with incorrect users (EXPECTED TO FAIL).
 > Action: unmatch(alice, carol) -> { error: "Active match not found..." }
----- output end -----
PartnerMatching: unmatch action requirements ... ok (599ms)
PartnerMatching: updateProfilePreferences action ...
------- output -------

--- Test: updateProfilePreferences Action ---

 > Testing updating a non-existent profile (auto-creates).
   ✅ Profile was auto-created with upsert.

 > Testing a valid profile update.

 > Testing a valid profile update.
 > Action: updateProfilePreferences(...) -> { profile: ... }
   ✅ Preferences were successfully updated in the database.
----- output end -----
PartnerMatching: updateProfilePreferences action ... ok (726ms)

ok | 6 passed | 0 failed (5s)