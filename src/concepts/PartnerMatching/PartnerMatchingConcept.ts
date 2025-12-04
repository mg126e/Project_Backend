import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "PartnerMatching" + ".";

// Generic type parameters
type User = ID;
type Suggestion = ID;
type Match = ID;

// Enums for controlled vocabulary in preferences
export enum Pace {
  Under_8_min_mile = "Under 8 min/mile",
  _8_10_min_mile = "8-10 min/mile",
  _10_12_min_mile = "10-12 min/mile",
  Over_12_min_mile = "Over 12 min/mile",
}

export enum ExperienceLevel {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
}

export enum TimeOfDay {
  Morning = "Morning",
  Afternoon = "Afternoon",
  Evening = "Evening",
}

export enum AcceptanceStatus {
  Pending = "pending",
  Accepted = "accepted",
  Declined = "declined",
}

/**
 * a set of running Preferences with a Pace, a distance, an experience Level, a preferred Time of day
 */
interface Preferences {
  pace: Pace;
  distance: number;
  experience: ExperienceLevel;
  timeOfDay: TimeOfDay;
}

/**
 * a Profile with a set of running Preferences.
 * Stored in a 'profiles' collection where the _id is the User ID.
 */
interface ProfileState {
  _id: User;
  preferences: Preferences;
}

/**
 * a set of match Suggestions with a Recipient, a Candidate, an acceptance Status
 */
interface SuggestionState {
  _id: Suggestion;
  recipient: User;
  candidate: User;
  status: AcceptanceStatus;
}

/**
 * a set of active Matches with a user UserA and a user UserB
 */
interface MatchState {
  _id: Match;
  users: [User, User]; // Stored sorted to simplify queries
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
  profiles: Collection<ProfileState>;
  suggestions: Collection<SuggestionState>;
  matches: Collection<MatchState>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
    this.suggestions = this.db.collection(PREFIX + "suggestions");
    this.matches = this.db.collection(PREFIX + "matches");
  }

  /**
   * system suggestMatch (recipient: User, candidate: User): (suggestion: Suggestion)
   *
   * requires: the recipient and candidate exist and are distinct; both have profiles;
   * there is no active match between them; there is no existing suggestion from recipient to candidate;
   * at least three preferences must be the same for both users
   *
   * effects: creates and returns a new match Suggestion with Candidate to Recipient,
   * sets Status to ‘pending’
   */
  async suggestMatch(
    { recipient, candidate }: { recipient: User; candidate: User },
  ): Promise<{ suggestion: Suggestion } | { error: string }> {
    try {
      if (recipient === candidate) {
        return { error: "Recipient and candidate cannot be the same user." };
      }

      const recipientProfile = await this.profiles.findOne({ _id: recipient });
      const candidateProfile = await this.profiles.findOne({ _id: candidate });
      if (!recipientProfile || !candidateProfile) {
        return { error: "Both users must have a profile to be matched." };
      }

      const sortedUsers: [User, User] = recipient < candidate
        ? [recipient, candidate]
        : [candidate, recipient];
      const existingMatch = await this.matches.findOne({ users: sortedUsers });
      if (existingMatch) {
        return { error: "An active match already exists between these users." };
      }

      // FIX: Check for a suggestion in one direction only.
      // This allows the necessary reciprocal suggestion to be created.
      const existingSuggestion = await this.suggestions.findOne({
        recipient,
        candidate,
      });
      if (existingSuggestion) {
        return {
          error: "A suggestion from this recipient to this candidate already exists.",
        };
      }

      let score = 0;
      const rPref = recipientProfile.preferences;
      const cPref = candidateProfile.preferences;
      if (rPref.pace === cPref.pace) score++;
      if (Math.abs(rPref.distance - cPref.distance) <= 1) score++; // Match if distance is within 1 mile
      if (rPref.experience === cPref.experience) score++;
      if (rPref.timeOfDay === cPref.timeOfDay) score++;

      if (score < 3) {
        return { error: "Users do not have enough matching preferences." };
      }

      const newSuggestionId = freshID() as Suggestion;
      await this.suggestions.insertOne({
        _id: newSuggestionId,
        recipient: recipient,
        candidate: candidate,
        status: AcceptanceStatus.Pending,
      });

      return { suggestion: newSuggestionId };
    } catch (e) {
      console.error("Error in suggestMatch:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * acceptSuggestion (suggestion: Suggestion, recipient: User, candidate: User): (match: Match) | Empty
   *
   * requires: a Suggestion exists with recipient user being Recipient and candidate user being Candidate
   *
   * effects: set Status to ‘accepted’,
   * creates and returns a new Match if Candidate has also accepted their suggestion of the Recipient
   */
  async acceptSuggestion(
    { suggestion, recipient, candidate }: {
      suggestion: Suggestion;
      recipient: User;
      candidate: User;
    },
  ): Promise<{ match: Match } | Empty | { error: string }> {
    try {
      const suggestionDoc = await this.suggestions.findOne({
        _id: suggestion,
        recipient,
      });
      if (!suggestionDoc) {
        return { error: "Suggestion not found or user is not the recipient." };
      }
      if (suggestionDoc.status !== AcceptanceStatus.Pending) {
        return {
          error: `Suggestion has already been ${suggestionDoc.status}.`,
        };
      }

      await this.suggestions.updateOne(
        { _id: suggestion },
        { $set: { status: AcceptanceStatus.Accepted } },
      );

      const reverseSuggestion = await this.suggestions.findOne({
        recipient: candidate,
        candidate: recipient,
      });

      if (
        reverseSuggestion &&
        reverseSuggestion.status === AcceptanceStatus.Accepted
      ) {
        const sortedUsers: [User, User] = recipient < candidate
          ? [recipient, candidate]
          : [candidate, recipient];
        const newMatchId = freshID() as Match;
        await this.matches.insertOne({ _id: newMatchId, users: sortedUsers });
        await this.suggestions.deleteMany({
          $or: [{ _id: suggestion }, { _id: reverseSuggestion._id }],
        });
        return { match: newMatchId };
      }

      return {};
    } catch (e) {
      console.error("Error in acceptSuggestion:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * declineSuggestion (suggestion: Suggestion, recipient: User, candidate: User): Empty
   *
   * requires: a Suggestion exists with recipient user being Recipient and candidate user being Candidate
   *
   * effects: set Status of suggestion to ‘declined’ and deletes it from recipient’s set of suggestions
   */
  async declineSuggestion(
    { suggestion, recipient, candidate }: {
      suggestion: Suggestion;
      recipient: User;
      candidate: User;
    },
  ): Promise<Empty | { error: string }> {
    try {
      const suggestionDoc = await this.suggestions.findOne({
        _id: suggestion,
        recipient,
        candidate,
      });
      if (!suggestionDoc) {
        return { error: "Suggestion not found." };
      }

      // A decline from one user invalidates the potential match for both.
      await this.suggestions.deleteMany({
        $or: [
          { recipient, candidate },
          { recipient: candidate, candidate: recipient },
        ],
      });

      return {};
    } catch (e) {
      console.error("Error in declineSuggestion:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * unmatch (activeMatch: Match, userA: User, userB: User): Empty
   *
   * requires: there exists an active Match between UserA and UserB
   *
   * effects: deletes the Match from UserA and UserB’s set of Matches
   */
  async unmatch(
    { activeMatch, userA, userB }: {
      activeMatch: Match;
      userA: User;
      userB: User;
    },
  ): Promise<Empty | { error: string }> {
    try {
      const sortedUsers: [User, User] = userA < userB
        ? [userA, userB]
        : [userB, userA];
      const result = await this.matches.deleteOne({
        _id: activeMatch,
        users: sortedUsers,
      });

      if (result.deletedCount === 0) {
        return {
          error: "Active match not found between the specified users.",
        };
      }

      return {};
    } catch (e) {
      console.error("Error in unmatch:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  // --- Auxiliary actions for setup and usability ---

  /**
   * updateProfilePreferences (user: User, preferences: Preferences): { profile: ProfileState }
   * (Action implied by principle: "a user creates a profile with their personal details and preferences")
   * This action only handles updating preferences on an existing profile. Profile creation is assumed to be handled by another concept.
   *
   * requires: A profile for the given user ID must already exist.
   * effects: Updates the preferences of the user's existing profile.
   */
  async updateProfilePreferences(
    { user, preferences }: { user: User; preferences: Preferences },
  ): Promise<{ profile: ProfileState } | { error: string }> {
    try {
      const result = await this.profiles.updateOne(
        { _id: user },
        { $set: { preferences } },
      );

      if (result.matchedCount === 0) {
        return {
          error:
            "Profile not found for the given user. Cannot update preferences.",
        };
      }

      const updatedProfile = await this.profiles.findOne({ _id: user });
      if (!updatedProfile) {
        return { error: "Failed to retrieve profile after update." };
      }
      return { profile: updatedProfile };
    } catch (e) {
      console.error("Error in updateProfilePreferences:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  // --- Query Methods ---

  /**
   * _getProfile (user: User): { profiles: ProfileState[] }
   * effects: Returns the profile for a given user in an array.
   */
  async _getProfile(
    { user }: { user: User },
  ): Promise<{ profiles: ProfileState[] } | { error: string }> {
    try {
      const profile = await this.profiles.findOne({ _id: user });
      return { profiles: profile ? [profile] : [] };
    } catch (e) {
      console.error("Error in _getProfile:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * _getSuggestions (user: User): { suggestions: SuggestionState[] }
   * effects: Returns all pending suggestions for a given user where they are the recipient.
   */
  async _getSuggestions(
    { user }: { user: User },
  ): Promise<{ suggestions: SuggestionState[] } | { error: string }> {
    try {
      const suggestions = await this.suggestions.find({
        recipient: user,
        status: AcceptanceStatus.Pending,
      }).toArray();
      return { suggestions };
    } catch (e) {
      console.error("Error in _getSuggestions:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * _getActiveMatches (user: User): { matches: MatchState[] }
   * effects: Returns all active matches for a given user.
   */
  async _getActiveMatches(
    { user }: { user: User },
  ): Promise<{ matches: MatchState[] } | { error: string }> {
    try {
      const matches = await this.matches.find({ users: user }).toArray();
      return { matches };
    } catch (e) {
      console.error("Error in _getActiveMatches:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * _getPartners (user: User): { partners: User[] }
   * effects: Returns all user IDs of active match partners for a given user.
   * This is useful for creating shared goals with matched partners.
   */
  async _getPartners(
    { user }: { user: User },
  ): Promise<{ partners: User[] } | { error: string }> {
    try {
      const matches = await this.matches.find({ users: user }).toArray();
      const partners = matches.map(m => 
        m.users[0] === user ? m.users[1] : m.users[0]
      );
      return { partners };
    } catch (e) {
      console.error("Error in _getPartners:", e);
      return { error: "An unexpected server error occurred." };
    }
  }
}