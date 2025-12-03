# prompt: Implement the suggestMatch() action in the PartnerMatching concept specification. Follow the concept specification and the instructions closely. Use the BodyMapGeneration as an example implementation, and do NOT use unnecessary imports.

[@concept-design-overview](../../design/background/concept-design-overview.md)

[@concept-specifications](../background/concept-specifications.md)

[@implementing-concepts](../background/implementing-concepts.md)

[@PartnerMatching](PartnerMatching.md)

[@BodyMapGenerationConcept](../../src/concepts/BodyMapGeneration/BodyMapGenerationConcept.ts)


# response:

An implementation of the `suggestMatch()` action for the `PartnerMatching` concept.

# file: src/concepts/PartnerMatching/PartnerMatchingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "PartnerMatching" + ".";

// Generic type parameters
type User = ID;
type Recipient = User;
type Candidate = User;
type Suggestion = ID;
type Match = ID;

/**
 * @interface Preferences
 * Represents the running preferences for a user.
 *
 * a set of running Preferences with
 * a Pace selection
 * a distance Number
 * an experience Level
 * a preferred Time of day
 */
interface Preferences {
  pace: string;
  distance: number;
  experience: string;
  timeOfDay: string;
}

/**
 * @interface ProfileState
 * Represents a user's profile, containing their running preferences.
 * The profile's ID is the same as the user's ID.
 *
 * a set of Users with
 * a Profile
 *
 * a Profile with
 * a set of running Preferences
 */
interface ProfileState {
  _id: User;
  preferences: Preferences;
}

/**
 * @type SuggestionStatus
 * The possible states of a match suggestion.
 */
type SuggestionStatus = "pending" | "accepted" | "declined";

/**
 * @interface SuggestionState
 * Represents a match suggestion from a candidate to a recipient.
 *
 * a set of match Suggestions with
 * a Recipient user
 * a Candidate user
 * an acceptance Status (accepted, declined, pending)
 */
interface SuggestionState {
  _id: Suggestion;
  recipient: Recipient;
  candidate: Candidate;
  status: SuggestionStatus;
}

/**
 * @interface MatchState
 * Represents an active, confirmed match between two users.
 *
 * a set of active Matches with
 * a user UserA
 * a user UserB
 */
interface MatchState {
  _id: Match;
  users: [User, User];
}

/**
 * @concept PartnerMatching
 * @purpose match users with a long-term running partner based on running preferences and experience levels
 * @principle a user creates a profile with their personal details and preferences;
 * they are then presented with other users whose profiles indicate that they may align with theirs;
 * a user can accept or decline a match and a match only turns active when both users accept the other;
 * users can have multiple long-term running partner matches at the same time
 */
export default class PartnerMatchingConcept {
  // MongoDB collections for the concept's state
  profiles: Collection<ProfileState>;
  suggestions: Collection<SuggestionState>;
  matches: Collection<MatchState>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
    this.suggestions = this.db.collection(PREFIX + "suggestions");
    this.matches = this.db.collection(PREFIX + "matches");
  }

  /**
   * system suggestMatch (recipient: Recipient, candidate: Candidate): (suggestion: Suggestion)
   *
   * requires: the recipient and candidate exist and are distinct; both have profiles;
   * there is no active match and no existing suggestions with any combination of the users;
   * at least three preferences must be the same for both users
   *
   * effects: creates and returns a new match Suggestion with Candidate to Recipient,
   * sets Status to ‘pending’
   */
  async suggestMatch(
    { recipient, candidate }: { recipient: Recipient; candidate: Candidate },
  ): Promise<{ suggestion: Suggestion } | { error: string }> {
    try {
      // Precondition: recipient and candidate are distinct
      if (recipient === candidate) {
        return { error: "Recipient and candidate cannot be the same user." };
      }

      // Precondition: both have profiles (which implies they exist)
      const [recipientProfile, candidateProfile] = await Promise.all([
        this.profiles.findOne({ _id: recipient }),
        this.profiles.findOne({ _id: candidate }),
      ]);

      if (!recipientProfile || !candidateProfile) {
        return { error: "Recipient or candidate does not have a profile." };
      }

      // Precondition: there is no active match between them
      const existingMatch = await this.matches.findOne({
        users: { $all: [recipient, candidate] },
      });
      if (existingMatch) {
        return { error: "An active match already exists between these users." };
      }

      // Precondition: no existing suggestions between them in either direction
      const existingSuggestion = await this.suggestions.findOne({
        $or: [
          { recipient: recipient, candidate: candidate },
          { recipient: candidate, candidate: recipient },
        ],
      });
      if (existingSuggestion) {
        return { error: "A suggestion already exists between these users." };
      }

      // Precondition: at least three preferences match
      let matchingPreferences = 0;
      const p1 = recipientProfile.preferences;
      const p2 = candidateProfile.preferences;

      if (p1.pace === p2.pace) matchingPreferences++;
      if (p1.distance === p2.distance) matchingPreferences++;
      if (p1.experience === p2.experience) matchingPreferences++;
      if (p1.timeOfDay === p2.timeOfDay) matchingPreferences++;

      if (matchingPreferences < 3) {
        return { error: "Users do not have enough matching preferences to suggest a match." };
      }

      // Effects: create and return a new suggestion
      const newSuggestionId = freshID() as Suggestion;
      const newSuggestion: SuggestionState = {
        _id: newSuggestionId,
        recipient,
        candidate,
        status: "pending",
      };

      await this.suggestions.insertOne(newSuggestion);

      return { suggestion: newSuggestionId };
    } catch (e) {
      const errorMessage = `Failed to suggest match between ${recipient} and ${candidate}`;
      if (e instanceof Error) {
        console.error(`${errorMessage}:`, e);
        return { error: `${errorMessage}: ${e.message}` };
      } else {
        console.error(`${errorMessage} due to an unknown error:`, e);
        return { error: `${errorMessage} due to an unknown error` };
      }
    }
  }

  /**
   * acceptSuggestion (suggestion: Suggestion, recipient: Recipient, candidate: Candidate): (match: Match)
   *
   * requires: a Suggestion exists with recipient user being Recipient and candidate user being Candidate
   * effects: set Status to ‘accepted’,
   * creates and returns a new Match if Candidate has also accepted their suggestion of the Recipient
   */
  async acceptSuggestion(
    // deno-lint-ignore no-unused-vars
    { suggestion, recipient, candidate }: { suggestion: Suggestion; recipient: Recipient; candidate: Candidate },
  ): Promise<{ match: Match } | Empty | { error: string }> {
    return { error: "Not implemented" };
  }

  /**
   * declineSuggestion (suggestion: Suggestion, recipient: Recipient, candidate: Candidate)
   *
   * requires: a Suggestion exists with recipient user being Recipient and candidate user being Candidate
   * effects: set Status of suggestion to ‘declined’ and deletes it from recipient’s set of suggestions
   */
  async declineSuggestion(
    // deno-lint-ignore no-unused-vars
    { suggestion, recipient, candidate }: { suggestion: Suggestion; recipient: Recipient; candidate: Candidate },
  ): Promise<Empty | { error: string }> {
    return { error: "Not implemented" };
  }

  /**
   * unmatch (activeMatch: Match, user: UserA, user: UserB)
   *
   * requires: there exists an active Match between UserA and UserB
   * effects: deletes the Match from UserA and UserB’s set of Matches
   */
  async unmatch(
    // deno-lint-ignore no-unused-vars
    { activeMatch, userA, userB }: { activeMatch: Match; userA: User; userB: User },
  ): Promise<Empty | { error: string }> {
    return { error: "Not implemented" };
  }
}
```

# prompt: Implement the remaining actions following the specifications
# response:

An implementation of the `acceptSuggestion`, `declineSuggestion`, and `unmatch` actions for the `PartnerMatching` concept.

# file: src/concepts/PartnerMatching/PartnerMatchingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "PartnerMatching" + ".";

// Generic type parameters
type User = ID;
type Recipient = User;
type Candidate = User;
type Suggestion = ID;
type Match = ID;

/**
 * @interface Preferences
 * Represents the running preferences for a user.
 *
 * a set of running Preferences with
 * a Pace selection
 * a distance Number
 * an experience Level
 * a preferred Time of day
 */
interface Preferences {
  pace: string;
  distance: number;
  experience: string;
  timeOfDay: string;
}

/**
 * @interface ProfileState
 * Represents a user's profile, containing their running preferences.
 * The profile's ID is the same as the user's ID.
 *
 * a set of Users with
 * a Profile
 *
 * a Profile with
 * a set of running Preferences
 */
interface ProfileState {
  _id: User;
  preferences: Preferences;
}

/**
 * @type SuggestionStatus
 * The possible states of a match suggestion.
 */
type SuggestionStatus = "pending" | "accepted" | "declined";

/**
 * @interface SuggestionState
 * Represents a match suggestion from a candidate to a recipient.
 *
 * a set of match Suggestions with
 * a Recipient user
 * a Candidate user
 * an acceptance Status (accepted, declined, pending)
 */
interface SuggestionState {
  _id: Suggestion;
  recipient: Recipient;
  candidate: Candidate;
  status: SuggestionStatus;
}

/**
 * @interface MatchState
 * Represents an active, confirmed match between two users.
 *
 * a set of active Matches with
 * a user UserA
 * a user UserB
 */
interface MatchState {
  _id: Match;
  users: [User, User];
}

/**
 * @concept PartnerMatching
 * @purpose match users with a long-term running partner based on running preferences and experience levels
 * @principle a user creates a profile with their personal details and preferences;
 * they are then presented with other users whose profiles indicate that they may align with theirs;
 * a user can accept or decline a match and a match only turns active when both users accept the other;
 * users can have multiple long-term running partner matches at the same time
 */
export default class PartnerMatchingConcept {
  // MongoDB collections for the concept's state
  profiles: Collection<ProfileState>;
  suggestions: Collection<SuggestionState>;
  matches: Collection<MatchState>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
    this.suggestions = this.db.collection(PREFIX + "suggestions");
    this.matches = this.db.collection(PREFIX + "matches");
  }

  /**
   * system suggestMatch (recipient: Recipient, candidate: Candidate): (suggestion: Suggestion)
   *
   * requires: the recipient and candidate exist and are distinct; both have profiles;
   * there is no active match and no existing suggestions with any combination of the users;
   * at least three preferences must be the same for both users
   *
   * effects: creates and returns a new match Suggestion with Candidate to Recipient,
   * sets Status to ‘pending’
   */
  async suggestMatch(
    { recipient, candidate }: { recipient: Recipient; candidate: Candidate },
  ): Promise<{ suggestion: Suggestion } | { error: string }> {
    try {
      // Precondition: recipient and candidate are distinct
      if (recipient === candidate) {
        return { error: "Recipient and candidate cannot be the same user." };
      }

      // Precondition: both have profiles (which implies they exist)
      const [recipientProfile, candidateProfile] = await Promise.all([
        this.profiles.findOne({ _id: recipient }),
        this.profiles.findOne({ _id: candidate }),
      ]);

      if (!recipientProfile || !candidateProfile) {
        return { error: "Recipient or candidate does not have a profile." };
      }

      // Precondition: there is no active match between them
      const existingMatch = await this.matches.findOne({
        users: { $all: [recipient, candidate] },
      });
      if (existingMatch) {
        return { error: "An active match already exists between these users." };
      }

      // Precondition: no existing suggestions between them in either direction
      const existingSuggestion = await this.suggestions.findOne({
        $or: [
          { recipient: recipient, candidate: candidate },
          { recipient: candidate, candidate: recipient },
        ],
      });
      if (existingSuggestion) {
        return { error: "A suggestion already exists between these users." };
      }

      // Precondition: at least three preferences match
      let matchingPreferences = 0;
      const p1 = recipientProfile.preferences;
      const p2 = candidateProfile.preferences;

      if (p1.pace === p2.pace) matchingPreferences++;
      if (p1.distance === p2.distance) matchingPreferences++;
      if (p1.experience === p2.experience) matchingPreferences++;
      if (p1.timeOfDay === p2.timeOfDay) matchingPreferences++;

      if (matchingPreferences < 3) {
        return { error: "Users do not have enough matching preferences to suggest a match." };
      }

      // Effects: create and return a new suggestion
      const newSuggestionId = freshID() as Suggestion;
      const newSuggestion: SuggestionState = {
        _id: newSuggestionId,
        recipient,
        candidate,
        status: "pending",
      };

      await this.suggestions.insertOne(newSuggestion);

      return { suggestion: newSuggestionId };
    } catch (e) {
      const errorMessage = `Failed to suggest match between ${recipient} and ${candidate}`;
      if (e instanceof Error) {
        console.error(`${errorMessage}:`, e);
        return { error: `${errorMessage}: ${e.message}` };
      } else {
        console.error(`${errorMessage} due to an unknown error:`, e);
        return { error: `${errorMessage} due to an unknown error` };
      }
    }
  }

  /**
   * acceptSuggestion (suggestion: Suggestion, recipient: Recipient, candidate: Candidate): (match: Match)
   *
   * requires: a Suggestion exists with recipient user being Recipient and candidate user being Candidate
   * effects: set Status to ‘accepted’,
   * creates and returns a new Match if Candidate has also accepted their suggestion of the Recipient
   */
  async acceptSuggestion(
    { suggestion, recipient, candidate }: { suggestion: Suggestion; recipient: Recipient; candidate: Candidate },
  ): Promise<{ match: Match } | Empty | { error: string }> {
    try {
      const mySuggestion = await this.suggestions.findOne({
        _id: suggestion,
        recipient: recipient,
        candidate: candidate,
      });

      if (!mySuggestion) {
        return { error: "Suggestion not found or does not match the provided users." };
      }

      if (mySuggestion.status === "declined") {
        return { error: "Cannot accept a declined suggestion." };
      }

      // If already accepted, this is a no-op. Otherwise, update the status.
      if (mySuggestion.status !== "accepted") {
        await this.suggestions.updateOne(
          { _id: suggestion },
          { $set: { status: "accepted" } },
        );
      }

      // Check for mutual acceptance by finding the reverse suggestion.
      const otherSuggestion = await this.suggestions.findOne({
        recipient: candidate,
        candidate: recipient,
        status: "accepted",
      });

      if (otherSuggestion) {
        // Mutual acceptance is confirmed. Create a match if one doesn't already exist.
        const existingMatch = await this.matches.findOne({
          users: { $all: [recipient, candidate] },
        });

        if (existingMatch) {
          // A match was already created, possibly by the other user's acceptance action.
          return { match: existingMatch._id };
        }

        const newMatchId = freshID() as Match;
        const newMatch: MatchState = {
          _id: newMatchId,
          users: [recipient, candidate],
        };
        await this.matches.insertOne(newMatch);
        return { match: newMatchId };
      } else {
        // The other party has not accepted their suggestion yet.
        return {};
      }
    } catch (e) {
      const errorMessage = `Failed to accept suggestion ${suggestion}`;
      if (e instanceof Error) {
        console.error(`${errorMessage}:`, e);
        return { error: `${errorMessage}: ${e.message}` };
      } else {
        console.error(`${errorMessage} due to an unknown error:`, e);
        return { error: `${errorMessage} due to an unknown error` };
      }
    }
  }

  /**
   * declineSuggestion (suggestion: Suggestion, recipient: Recipient, candidate: Candidate)
   *
   * requires: a Suggestion exists with recipient user being Recipient and candidate user being Candidate
   * effects: set Status of suggestion to ‘declined’ and deletes it from recipient’s set of suggestions
   */
  async declineSuggestion(
    { suggestion, recipient, candidate }: { suggestion: Suggestion; recipient: Recipient; candidate: Candidate },
  ): Promise<Empty | { error: string }> {
    try {
      const updateResult = await this.suggestions.updateOne(
        {
          _id: suggestion,
          recipient: recipient,
          candidate: candidate,
        },
        { $set: { status: "declined" } },
      );

      if (updateResult.matchedCount === 0) {
        return { error: "Suggestion not found or does not match the provided users." };
      }

      return {};
    } catch (e) {
      const errorMessage = `Failed to decline suggestion ${suggestion}`;
      if (e instanceof Error) {
        console.error(`${errorMessage}:`, e);
        return { error: `${errorMessage}: ${e.message}` };
      } else {
        console.error(`${errorMessage} due to an unknown error:`, e);
        return { error: `${errorMessage} due to an unknown error` };
      }
    }
  }

  /**
   * unmatch (activeMatch: Match, userA: User, userB: User)
   *
   * requires: there exists an active Match between UserA and UserB
   * effects: deletes the Match from UserA and UserB’s set of Matches
   */
  async unmatch(
    { activeMatch, userA, userB }: { activeMatch: Match; userA: User; userB: User },
  ): Promise<Empty | { error: string }> {
    try {
      const deleteResult = await this.matches.deleteOne({
        _id: activeMatch,
        users: { $all: [userA, userB] },
      });

      if (deleteResult.deletedCount === 0) {
        return { error: "Active match not found or users do not match." };
      }
      return {};
    } catch (e) {
      const errorMessage = `Failed to unmatch match ${activeMatch}`;
      if (e instanceof Error) {
        console.error(`${errorMessage}:`, e);
        return { error: `${errorMessage}: ${e.message}` };
      } else {
        console.error(`${errorMessage} due to an unknown error:`, e);
        return { error: `${errorMessage} due to an unknown error` };
      }
    }
  }
}
```