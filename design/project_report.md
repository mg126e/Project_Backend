# Project Report

## Design Summary

Our design evolved significantly from our original functional design submission in response to TA feedback, implementation challenges, and user testing insights. The major changes include:

### Run Clubs to Partnerships
The most significant change was our shift from a run club-based application to a partnership-focused platform. This huge shift, made after our initial submission and guided by Professor Jackson, made us rethink our main features and concept structure to better support one-on-one running partnerships rather than large club management. It also helped differentiate our application more. 

### Concept Improvements

**PasswordAuthentication & EmailVerification:**
- Originally, we struggled with how to organize user authentication and verification. After meeting with our TA, we separated these into two distinct concepts connected via syncs.
- Requiring successful email verification before the registration process is completed since this avoided errors where users could bypass the verification by refreshing their page and then logging in

**UserProfile:**
- Removed the `removeTag` action after realizing that allowing tag removal went against our safety principle since we want complete active profiles for better matching, so these tags should be required
- Changed emergency contact from one simple string to a structured object with `name` and `phone` fields for better data organization

**MilestoneMaps:**
- We originally were going to use the Google Maps API but decided on using Leaflet to support the map feature! We liked the setup and customization of it. 
- We also switched our concept parameters from having a UserA and UserB to instead be a set of users, which was suggested as feedback on our functional design assignment
- Implemented file upload support for milestone photos using Google Cloud Storage, allowing users to also document their running achievements visually as well

**SharedGoals:**
- Similar to MilestoneMaps, we switched our concept parameters to be a set of users
- Removed unnecessary actions such as setInitialized since the creation of a shared goal already implies the goal was initialized, so it was repetitive

**Messaging:**
- Implemented automatic message thread creation and management to ensure users can only message those they have an active match with (PartnerMatching, OneRunMatching)

### Key Learnings

Overall, our concepts and code went through many changes in order to best support our fundamental idea, which is to support college students in finding compatible running partners. We continued to develop our skills with creating syncs, writing concept specs, and learning best design practices.