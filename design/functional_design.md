# Functional Design

## Problem Framing (Revised)


## Concept Design
- **PasswordAuthentication**
	- **Purpose:** Associate usernames and passwords with user identities for authentication, limiting access to known users.
	- **Principle:** If a user registers with a unique username and password, they can subsequently authenticate with those credentials and will consistently be treated as the same user.
	- **State:**
		- A set of Users, each with:
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

- UserProfile
- RunClubs
- Messaging
- LeadershipBoard
- Challenges
- Matches

## User Journey

After moving to a new city for her first year of college, a student feels uncertain about how to find her community on campus and in her city while prioritizing her safety. Reflecting on her past hobbies, she remembers her interest in running, which she had never committed to as she did not want to run alone for safety related reasons. She comes across our website, and upon registering and verifying her student ID, she personalizes her profile by adding a photo of herself, a short bio, and preferences for a running partner. She then decides she wants to go for a run at that moment and heads over to the real-time running partner finder where she finds that others are in the area. She matches with a runner, and has a good time and later decides to look for a longer-term partner. 

After filtering profiles by age, gender, and running level, she connects with someone and they meet up for a run. After running together, they indicate that they want to continue running together. This act unlocks new features that allow them to create shared goals together and have access to a milestone map where they can add photos and captions celebrating their achievements and memorable moments. Their partnership will ensure they remain committed to their goals and feel safer while doing so.


## UI Sketches


## Visual Design Study


## Design Summary


## Development Plan

