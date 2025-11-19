# Functional Design

## Problem Framing (Revised)
We made the huge design change of going from a run club based app to partnerships based on feedback from our initial submission. This was a big shift and we thought about what features would most make sense with this type of app, which also affected which features we ended up with in our revised problem framing. Our initial version is [here](https://github.com/mg126e/Project_Backend/blob/8da22449ad7daee908d551b518a69d6533af1b25/problem_framing.md) and Friday's revised version with our updated problem is [here](https://github.com/mg126e/Project_Backend/blob/main/design/problem_framing.md).

## Concept Design
- **EmailVerification**
   - **Purpose:** Ensure that only users with a valid Boston-area college .edu email address can complete registration and access the app.
   - **Principle:** When a user registers, a verification code is sent to their email. The user must enter the correct code to activate their account.
   - **State:**
       - A set of `EmailVerifications`, each with:
           - `user`: User (reference)
           - `email`: String
           - `verificationCode`: String (randomly generated)
           - `isVerified`: Boolean
           - `codeSentAt`: DateTime
   - **Actions:**
       - `register(user: User, email: String): ()`
           - *Requires:* The user exists in PasswordAuthentication. The email domain is a valid Boston-area .edu domain. No active verification exists for this user.
           - *Effects:* Generates a verification code, sends it to the user's email, and stores the code and timestamp.
       - `verifyCode(user: User, code: String): ({ success: Boolean, error?: String })`
           - *Requires:* A verification code was sent to the user and not expired. The code matches the stored code.
           - *Effects:* Sets `isVerified` to true if the code matches. Returns success or error.
       - `resendCode(user: User): ()`
           - *Requires:* The user has a pending verification and is not yet verified.
           - *Effects:* Generates and sends a new code, updates the stored code and timestamp.
   - **Notes:**
       - When `register` is called in PasswordAuthentication, it also triggers `register` in EmailVerification to send the verification email.
       - The user cannot become active or log in until their email is verified.


- **PasswordAuthentication**
   - **Purpose:** Associate usernames and passwords with user identities for authentication, limiting access to known users.
   - **Principle:** If a user registers with a unique username and password, they can subsequently authenticate with those credentials and will consistently be treated as the same user.
       - **State:**
           - A set of `Users`, each with:
               - `username`: String
               - `passwordHash`: String (hashed using SHA-256)
       - **Actions:**
           - `register(username: String, password: String): ({ user: User } | { error: String })`
               - *Requires:* No User with the given username already exists.
               - *Effects:* Creates a new User, stores a hash of the password, and returns the new user's ID. On failure, returns an error.
           - `authenticate(username: String, password: String): ({ user: User } | { error: String })`
               - *Requires:* A User with the given username exists AND the hash of the password matches the stored passwordHash.
               - *Effects:* Returns the identifier of the authenticated User. On failure, returns an error.
           - `deleteUser(user: User): ({} | { error: String })`
               - *Requires:* A User with the given user ID exists.
               - *Effects:* Permanently deletes the User and their stored credentials. On failure, returns an error.
    - **Notes:**
       - deleteUser and closeProfile will work in a sync together

- **UserProfile** [User]
   - **Purpose:** Allow users to share their personal info, including a real profile image and key tags for access to running partner features.
   - **Principle:** After setting a display name, uploading a profile image from their device, and adding tags (running level, age, gender, etc.), users can be discovered and matched more effectively.
   - **State:**
       - A set of `Users`, each with:
           - `displayname`: String
           - `profileImage`: Image (uploaded from user's device; e.g., file upload or photo)
           - `location`: String
           - `tags`: Object with allowed keys: "gender", "age", "runningLevel", "personality" (e.g., "introvert"/"extrovert"), etc. Each key maps to a single value (String or Number as appropriate).
           - `isActive`: Boolean
   - **Actions:**
       - `createProfile(user: User, location: String): ()`
           - *Requires:* No profile for the given user already exists. `location` must be provided.
           - *Effects:* Creates a new user profile record for the given user with no initial display name, profile image, or tags, and sets the user's location. The profile is not active (not visible) until all required fields are filled out and setActive is called.
       - `setActive(user: User): ()`
           - *Requires:* The user exists in the set of users. All required fields (displayname, profileImage, location, and all required tags) must be filled out.
           - *Effects:* Sets the user's profile to active (visible to others).
       - `setLocation(user: User, location: String): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Updates the user's location.
       - `setName(user: User, displayname: String): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Sets the user's display name.
       - `setProfileImage(user: User, image: Image): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Sets the user's profile image to the uploaded image (from file/photo).
       - `setTag(user: User, tagType: String, value: String|Number): ()`
           - *Requires:* The user exists in the set of users. `tagType` must be one of the allowed types: "gender", "age", "runningLevel", "personality" (e.g., "introvert"/"extrovert"), or other relevant factors as defined by the system. `location` cannot be set or changed with this action.
           - *Effects:* Sets or updates the tag of the specified type for the user's profile. Only one value per tag type is allowed per user.
       - `removeTag(user: User, tagType: String): ()`
           - *Requires:* The user exists in the set of users and the tag type exists for the user.
           - *Effects:* Removes the tag of the specified type from the user's profile.
       - `closeProfile(user: User): ()`
           - *Requires:* The user exists in the set of users.
           - *Effects:* Permanently deletes the user's profile and all associated data.
    - **Notes:**
        - By requiring that a user must be fully filled in, this helps users feel safer when they are looking for long-term matches


- **SharedGoals** [User, User]
   - **Purpose:** Allow two users to collaboratively monitor and achieve a shared running goal by breaking it into actionable steps.
   - **Principle:** After two users agree on a shared goal, they can either have an LLM generate recommended steps or input their own. Both can mark steps as complete, view progress, and see which steps remain.
   - **State:**
       - A set of `SharedGoals`, each with:
           - `userA`: User (one partner)
           - `userB`: User (the other partner)
           - `description`: String (goal description)
           - `isActive`: Boolean (true if the goal is currently being tracked)
       - A set of `SharedSteps`, each with:
           - `sharedGoalId`: SharedGoal (reference to the parent shared goal)
           - `description`: String
           - `start`: Date
           - `completion`: Date? (optional, when the step was completed)
       - `isInitialized`: Boolean (true if the shared goals instance has been set up for this partnership)
   - **Actions:**
       - `createSharedGoal(userA: User, userB: User, description: String): (sharedGoalId: SharedGoal)`
           - *Requires:* No active `SharedGoal` for this user pair with the same description already exists. `description` is not empty.
           - *Effects:* Creates a new `SharedGoal` with `userA`, `userB`, and `description`; sets `isActive` to `true`; returns `sharedGoalId`. Multiple active shared goals are allowed for the same user pair as long as each has a unique description.
       - `generateSharedSteps(sharedGoal: SharedGoal, user: User): (steps: SharedStep[])`
           - *Requires:* `sharedGoal` exists and is active; no `SharedSteps` are currently associated with this `sharedGoal`.
           - *Effects:* Uses an internal LLM to generate step descriptions based on the shared goal's description; creates new `SharedSteps` for each; returns the array of created steps.
       - `regenerateSharedSteps(sharedGoal: SharedGoal, user: User): (steps: SharedStep[])`
           - *Requires:* `sharedGoal` exists and is active.
           - *Effects:* Deletes all existing `SharedSteps` for the shared goal, then generates new steps as above; returns the array of new steps.
       - `addSharedStep(sharedGoal: SharedGoal, description: String, user: User): (step: SharedStep)`
           - *Requires:* `sharedGoal` exists and is active; `description` is not empty.
           - *Effects:* Creates a new `SharedStep` for the shared goal; returns the new step.
       - `completeSharedStep(step: SharedStep, user: User): Empty`
           - *Requires:* `step` exists and does not have a completion date. The `SharedGoal` is active. Either user may complete a step.
           - *Effects:* Sets the completion date for the step.
       - `removeSharedStep(step: SharedStep, user: User): Empty`
           - *Requires:* `step` exists; no completion date; `SharedGoal` is active. Either user may remove a step.
           - *Effects:* Deletes the step from storage.
       - `closeSharedGoal(sharedGoal: SharedGoal, user: User): Empty`
           - *Requires:* `sharedGoal` exists and is active. Either user may close the goal.
           - *Effects:* Sets `isActive` of the shared goal to `false`.
       - `setInitialized(sharedGoals: SharedGoals, isInitialized: Boolean): Empty`
           - *Effects:* Sets the `isInitialized` flag of the shared goal instance (for both partners) to the provided value (`true` or `false`).
   - **Notes:**
       - Assuming that for the actions other than setInitialized, the SharedGoals instance being initialized would also be required. Initialized essentially just means if the shared goals feature is now active for the partners
       - We are allowing for LLM generation and manual creation of steps


- **MilestoneMap** [User, User]
   - **Purpose:** Provide a private, shared map using Google Maps API for two running partners to commemorate milestones by dropping pins at specific locations and optionally uploading photos.
   - **Principle:** After becoming running partners, users can mark locations where they achieved milestones together (e.g., first 5K), add descriptions, and upload photos (e.g., a selfie at the milestone spot). Only the two partners can view and edit their shared map.
   - **State:**
       - A set of `MilestoneMaps`, each with:
           - `userA`: User (one partner)
           - `userB`: User (the other partner)
           - `mapUrl`: String (the unique Google My Maps URL or ID for the shared map)
           - `createdAt`: Date
           - `isActive`: Boolean
   - **Actions:**
       - `createMilestoneMap(userA: User, userB: User): (milestoneMap: MilestoneMap)`
           - *Requires:* No existing MilestoneMap for this user pair.
           - *Effects:* Stores a reference to a new shared Google My Map for the two users; returns the map's ID.
       - `closeMilestoneMap(milestoneMap: MilestoneMap): ()`
           - *Requires:* `milestoneMap` exists.
           - *Effects:* Closes the MilestoneMap reference for the two users.
   - **Notes:**
       - The actual milestone data (pins, photos, descriptions) is managed within Google My Maps, and this concept primarily stores the reference to the shared map and handles its lifecycle for the duo.
       - closeMileStoneMap would still preserve the map for the user's archive  
        - An issue to resolve with this would be perfecting the manner we will go about a full history reset, including with shared goals if the two users end their partnership and either does not want a saved history


## Syncs

> sync emailVerificationOnRegister
>> when PasswordAuthentication.register(username, password, email): (user)\
>> then EmailVerification.register(user, email)

- **Notes: After Registration → Send Verification Email**:
   - In **PasswordAuthentication**, `register` adds/logs the user and password.
   - In **EmailVerification**, `register` is triggered, after the user makes that attempt to register, to send a verification email to the user.


> sync createProfileOnRegister
>> when PasswordAuthentication.register(username, password, email): (user) and EmailVerification._isEmailVerified(user): true\
>> then UserProfile.createProfile(user)

- **Notes: After Completed Registration → Create Profile**
   - When a user successfully registers, an empty **UserProfile** is automatically created for them.


> sync createGoalsAndMapOnPartnership
>> when Partnership.agree(userA, userB)\
>> then SharedGoals.setInitialized(sharedGoals, true) and MilestoneMap.createMilestoneMap(userA, userB)

- **Notes: Partnership Agreement → SharedGoals & MilestoneMap Setup**
   - If both users agree to continue running together and start their partnership, a **SharedGoals** instance and a **MilestoneMap** are automatically set up for the pair.


> sync archiveOnPartnershipEnd
>> when Partnership.end(userA, userB)\
>> then SharedGoals.setInitialized(sharedGoals, false) and MilestoneMap.closeMilestoneMap(milestoneMap)

- **Notes: Partnership End → Delete SharedGoals & MilestoneMap**
   - If two users decide to end their partnership, the **PartnerMatching** page is reset for both so they can move on to other matches, and their **SharedGoals** and **MilestoneMap** are erased from active use but remain accessible in an archive/history page for future reference.


> sync deleteUserOnCloseProfile
>> when UserProfile.closeProfile(user)
>> then PasswordAuthentication.deleteUser(user)

- **Notes:**
   - Ensures that when a user closes their profile, their authentication credentials are also deleted, which prevents them from trying to log in again and then seeing an empty profile and running into the errors that would lead to


## User Journey
After moving to a new city for her first year of college, a student feels uncertain about how to find her community on campus and in her city while prioritizing her safety. Reflecting on her past hobbies, she remembers her interest in running, which she had never committed to as she did not want to run alone for safety related reasons. She comes across our website, and upon registering and verifying her student ID, she personalizes her profile by adding a photo of herself, a short bio, and preferences for a running partner. She then decides she wants to go for a run at that moment and heads over to the real-time running partner finder where she finds that others are in the area. She matches with a runner, and has a good time and later decides to look for a longer-term partner. 

After filtering profiles by age, gender, and running level, she connects with someone and they meet up for a run. After running together, they indicate that they want to continue running together. This act unlocks new features that allow them to create shared goals together and have access to a milestone map where they can add photos and captions celebrating their achievements and memorable moments. Their partnership will ensure they remain committed to their goals and feel safer while doing so.


## UI Sketches


## Visual Design Study

### Color

![Color](./images/color.png)

### Typography

![Typography](./images/typography.png)


## Design Summary


## Development Plan

We will aim for a timeline similar to the individual projects where we first created our backend, then our frontend, and then introduced syncs. This will ensure we are working incrementally and thoroughly. The table below provides more detailed information for each stage.  

| Stage | Features | Responsibilities | Key Risks |
| :---- | :---- | :---- | :---- |
| November 25th, Checkpoint: Alpha | Password authentication <br> User profile <br> Real-time matching <br> Messaging | Gloria: User profile, password authentication, start email verification  <br> Ananya: Real-time matching <br>Marin: Messaging <br>ALL: collaborate to connect our concepts to our frontend | If we find that we are having difficulties with the real-time runner matching, as a fallback, we may decide to combine this feature and the long-term runner matching. This would mean making it so that once a user goes on a run through the real-time matching, the long-term aspect would kick in immediately after they complete their run by asking if they want to be long-term partners.  |
| December 2nd, Checkpoint: Beta | EmailVerification <br> Long-term matching <br> Shared goals <br> Milestone map  | Gloria: SharedGoals <br>Ananya: Long-term matching <br>Marin: Milestone map<br>ALL: collaborate to connect our concepts to our frontend | A potential key risk would be incorporating LLM generation of potential steps for the duo to work toward as the steps may be irrelevant or in the wrong format. We will mitigate this risk by working on perfecting our prompt, testing out step generation, and improving our error handling. As a fallback, we will allow users to manually create their own steps for their shared goals. Another key risk would be perfecting the long-term matching but as mentioned in the row above, we will be sure to deeply evaluate what structure of the matching features ends up working best. |
| December 9th, Full Demo | Based on user testing, we will refine our features based on the feedback we receive. We will also include our syncs. We will also deploy using Render. | ALL: work on syncs & complete extensive testing on our backend and frontend | A potential key risk would be the feedback we get during user testing. For instance, if users find that an additional feature would be best to include but would be impossible to implement under the time frame, we will evaluate how aspects of the feature could be included within our existing concepts. Additionally, since we now have experience incorporating syncs, we do not expect there to be as many risks here but do we plan to ask questions on Piazza or to our TA Erin if huge issues arise that we would need another perspective on. |