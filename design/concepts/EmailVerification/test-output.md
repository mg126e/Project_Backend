Principle: User requests email verification, then verifies it successfully ...
------- output -------
1. Registering baseline user for principle scenario
   ✓ Registered alice_ev_test with id 019abe4c-0a9e-7cd8-9552-7fdba72bb2b5
2. Requesting verification code for email1
   ✓ Received verification record 019abe4c-0b6f-781f-aebf-875d0bf35898 with code 622603
3. Submitted correct code and email marked verified
4. Principle scenario complete: email1 verified and reflected in records
----- output end -----
Principle: User requests email verification, then verifies it successfully ... ok (2s)
Action: requestVerification successfully creates a new pending record for a new email ...
------- output -------
1. Registering userA and initiating first verification request
   ✓ Verification record 019abe4c-13f8-7fd4-9765-ea64f907dd6c stored for test1@example.com
2. Pending record confirmed and no verified emails yet
----- output end -----
Action: requestVerification successfully creates a new pending record for a new email ... ok (2s)
Action: requestVerification replaces existing pending verification for the same user and email ...
------- output -------
1. Registering user and issuing first verification code
   ✓ First record 019abe4c-1cb6-788f-a749-e7ad94cdba02 created with code 241154
2. Requesting second verification code to replace first
   ✓ Replacement succeeded with new record 019abe4c-1da4-7899-a73f-e66480b0ff98 and code 305257
----- output end -----
Action: requestVerification replaces existing pending verification for the same user and email ... ok (2s)
Action: requestVerification allows new pending record even if email is already verified (re-verification) ...
------- output -------
1. Performing initial verification of email1
   ✓ Email1 verified the first time
2. Requesting a new verification code for the already verified email1
   ✓ Replacement record 019abe4c-26cd-7358-b18f-f9e49f524d52 created with new code 163108
3. Verified list remains at one entry while new pending request exists
----- output end -----
Action: requestVerification allows new pending record even if email is already verified (re-verification) ... ok (2s)
Action: verifyEmail successfully verifies an email ...
------- output -------
1. Requesting verification code and completing verification
   ✓ Verified email1 using record 019abe4c-2e3d-74b0-8c11-4638399848c0
2. Pending list cleared and verified list updated
----- output end -----
Action: verifyEmail successfully verifies an email ... ok (2s)
Action: verifyEmail fails with invalid verification ID ...
------- output -------
1. Attempting verification with invalid record id
   ✓ Received not-found error as expected
----- output end -----
Action: verifyEmail fails with invalid verification ID ... ok (1s)
Action: verifyEmail fails with incorrect token ...
------- output -------
1. Obtaining valid verification record then sending wrong token
   ✓ Invalid token rejected and error returned
----- output end -----
Action: verifyEmail fails with incorrect token ... ok (2s)
Action: verifyEmail fails if record is not pending (already verified) ...
------- output -------
1. Verifying once and attempting to reuse same code
   ✓ First verification consumed the record
   ✓ Second attempt correctly rejected
----- output end -----
Action: verifyEmail fails if record is not pending (already verified) ... ok (2s)
Action: verifyEmail fails if record is not pending (already replaced) ...
------- output -------
1. Creating two verification records to force replacement
   ✓ Reused code rejected because record was replaced
----- output end -----
Action: verifyEmail fails if record is not pending (already replaced) ... ok (2s)
Query: _getVerificationRecord retrieves a pending record by ID ...
------- output -------
1. Creating pending verification record to query directly
   ✓ Retrieved pending record 019abe4c-567c-7a1c-80d7-496c24f4f130
----- output end -----
Query: _getVerificationRecord retrieves a pending record by ID ... ok (1s)
Query: _getVerificationRecord retrieves a verified record by ID ...
------- output -------
1. Verifying email then fetching record in verified state
   ✓ Verified record 019abe4c-5e7b-76b9-843f-97d30835f7d6 shows isVerified=true
----- output end -----
Query: _getVerificationRecord retrieves a verified record by ID ... ok (2s)
Query: _getVerificationRecord returns null for a non-existent ID ...
------- output -------
1. Querying record by non-existent id
   ✓ Null returned as expected
----- output end -----
Query: _getVerificationRecord returns null for a non-existent ID ... ok (1s)
Query: _getPendingVerificationForUserEmail retrieves a pending record for user and email ...
------- output -------
1. Creating pending record to test lookup helper
   ✓ Pending lookup returned record 019abe4c-6d44-77e1-b83c-0e211b692349
----- output end -----
Query: _getPendingVerificationForUserEmail retrieves a pending record for user and email ... ok (1s)
Query: _getPendingVerificationForUserEmail returns null if no pending record exists for user/email ...
------- output -------
1. Confirming pending lookup returns null when no requests exist
   ✓ Null returned when no requests exist
   ✓ Null returned when only other emails are pending
----- output end -----
Query: _getPendingVerificationForUserEmail returns null if no pending record exists for user/email ... ok (2s)
Query: _getPendingVerificationForUserEmail returns null if email is already verified ...
------- output -------
1. Verifying email then checking pending lookup returns null
   ✓ Pending lookup empty after verification
----- output end -----
Query: _getPendingVerificationForUserEmail returns null if email is already verified ... ok (2s)
Query: _getPendingVerificationForUserEmail returns null for a different user ...       
------- output -------
1. Ensuring pending lookup is scoped per user
   ✓ UserB sees no pending record for UserA's email
----- output end -----
Query: _getPendingVerificationForUserEmail returns null for a different user ... ok (2s)
Query: _getVerifiedEmailsForUser returns an empty array for a user with no verified emails ...
------- output -------
1. Checking verified emails before any verification occurs
   ✓ Verified list empty
----- output end -----
Query: _getVerifiedEmailsForUser returns an empty array for a user with no verified emails ... ok (1s)
Query: _getVerifiedEmailsForUser returns an empty array for a user with only pending verifications ...
------- output -------
1. Creating multiple pending requests without verifying
   ✓ Verified list still empty with pending requests
----- output end -----
Query: _getVerifiedEmailsForUser returns an empty array for a user with only pending verifications ... ok (2s)
Query: _getVerifiedEmailsForUser returns one verified email ...
------- output -------
1. Verifying a single email and reading verified list
   ✓ Verified list contains exactly one email
----- output end -----
Query: _getVerifiedEmailsForUser returns one verified email ... ok (2s)
Query: _getVerifiedEmailsForUser returns multiple verified emails for a user ...       
------- output -------
1. Verifying two emails to ensure both appear in list
   ✓ Verified list contains email1 and email2 only
----- output end -----
Query: _getVerifiedEmailsForUser returns multiple verified emails for a user ... ok (2s)
Query: _getVerifiedEmailsForUser distinguishes between users ...
------- output -------
1. Verifying different emails for userA and userB
   ✓ UserA verified emails list correct
   ✓ UserB verified emails list correct
----- output end -----
Query: _getVerifiedEmailsForUser distinguishes between users ... ok (2s)

ok | 21 passed | 0 failed (44s)