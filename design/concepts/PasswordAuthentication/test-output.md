Principle: User registers with unique credentials and authenticates as the same user ...
------- output -------
1. Creating a new user account with username and password
   ✓ User registered successfully with ID: 019ad611-37b0-7c28-9612-a19f4d19b786
2. Verifying email before authentication
   ✓ Email verified
3. Authenticating with the same username and password
   ✓ User authenticated successfully with the same ID: 019ad611-37b0-7c28-9612-a19f4d19b786
4. Principle satisfied: User can register and authenticate as the same identity
----- output end -----
Principle: User registers with unique credentials and authenticates as the same user ... ok (932ms)
Action: register enforces username uniqueness ...
------- output -------
1. Testing username uniqueness requirement
   • Registering first user with username "uniqueuser"
   ✓ First registration succeeded as expected
   • Attempting to register a second user with the same username "uniqueuser"
   ✓ Second registration failed with error: "Username 'uniqueuser' is already taken."
2. Username uniqueness requirement satisfied
----- output end -----
Action: register enforces username uniqueness ... ok (791ms)
Action: authentication validates credentials and returns appropriate errors ...
------- output -------
1. Testing authentication credential validation
   • Registering test user "secureuser" for authentication tests
   ✓ Test user registered successfully
   • Attempting to authenticate without email verification
   ✓ Authentication correctly blocked for unverified email
   • Verifying email
   ✓ Email verified
   • Attempting to authenticate with correct username but wrong password
   ✓ Authentication correctly failed with wrong password
   • Attempting to authenticate with non-existent username
   ✓ Authentication correctly failed with non-existent username
2. Authentication validation requirements satisfied
----- output end -----
Action: authentication validates credentials and returns appropriate errors ... ok (834ms)
Action: deleteUser permanently removes user and prevents authentication ...
------- output -------
1. Creating a user to test deletion
   ✓ User registered with ID: 019ad611-4162-72b6-a4d6-f2c057e41a00
2. Verifying email and testing authentication before deletion
   ✓ User authenticated successfully
3. Deleting the user
   ✓ User deleted successfully
4. Verifying user cannot authenticate after deletion
   ✓ Authentication correctly failed after deletion
5. Testing deletion of non-existent user
   ✓ Correctly failed with error: "User 019ad611-4162-72b6-a4d6-f2c057e41a00 not found."
6. Action requirements satisfied: deleteUser removes credentials permanently
----- output end -----
Action: deleteUser permanently removes user and prevents authentication ... ok (905ms)
Action: changePassword updates password and enforces old password ... ok (950ms)

ok | 5 passed | 0 failed (4s)