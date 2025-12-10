import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure isolation within the database
const PREFIX = "PartnerMatching" + ".";
const USER_PROFILE_COLLECTION = "Userprofile.userProfiles";

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
// UserProfile types for accessing UserProfile collection
type TimeOfDayCategory = "All Times" | "Morning (5am - 12pm)" | "Afternoon (12pm - 5pm)" | "Evening (5pm - 9pm)" | "Night (9pm - 5am)";
type AllowedTag = "runningPace" | "gender" | "age" | "runningLevel" | "personality";
interface UserProfileDoc {
  _id: User;
  tags?: Partial<Record<AllowedTag, string | number>>;
  timeOfDayCategory?: TimeOfDayCategory;
}

export default class PartnerMatchingConcept {
  profiles: Collection<ProfileState>;
  suggestions: Collection<SuggestionState>;
  matches: Collection<MatchState>;
  private userProfiles: Collection<UserProfileDoc>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
    this.suggestions = this.db.collection(PREFIX + "suggestions");
    this.matches = this.db.collection(PREFIX + "matches");
    this.userProfiles = this.db.collection(USER_PROFILE_COLLECTION);
  }

  /**
   * Helper function to convert UserProfile data to PartnerMatching preferences
   */
  private convertUserProfileToPreferences(userProfile: UserProfileDoc): Preferences | null {
    const tags = userProfile.tags || {};
    const runningPace = tags.runningPace as string | undefined;
    const runningLevel = tags.runningLevel as string | undefined;
    const timeOfDayCategory = userProfile.timeOfDayCategory;

    // Map runningPace to Pace enum
    let pace: Pace | undefined;
    if (runningPace) {
      const paceLower = runningPace.toLowerCase();
      if (paceLower.includes("under 8") || paceLower.includes("< 8")) {
        pace = Pace.Under_8_min_mile;
      } else if (paceLower.includes("8-10") || paceLower.includes("8 to 10")) {
        pace = Pace._8_10_min_mile;
      } else if (paceLower.includes("10-12") || paceLower.includes("10 to 12")) {
        pace = Pace._10_12_min_mile;
      } else if (paceLower.includes("over 12") || paceLower.includes("> 12")) {
        pace = Pace.Over_12_min_mile;
      }
    }

    // Map runningLevel to ExperienceLevel enum
    let experience: ExperienceLevel | undefined;
    if (runningLevel) {
      const levelLower = runningLevel.toLowerCase();
      if (levelLower.includes("beginner")) {
        experience = ExperienceLevel.Beginner;
      } else if (levelLower.includes("intermediate")) {
        experience = ExperienceLevel.Intermediate;
      } else if (levelLower.includes("advanced")) {
        experience = ExperienceLevel.Advanced;
      }
    }

    // Map timeOfDayCategory to TimeOfDay enum
    let timeOfDay: TimeOfDay | undefined;
    if (timeOfDayCategory) {
      if (timeOfDayCategory.includes("Morning")) {
        timeOfDay = TimeOfDay.Morning;
      } else if (timeOfDayCategory.includes("Afternoon")) {
        timeOfDay = TimeOfDay.Afternoon;
      } else if (timeOfDayCategory.includes("Evening")) {
        timeOfDay = TimeOfDay.Evening;
      }
    }

    // Check if we have all required fields (distance defaults to 5 if not provided)
    if (pace && experience && timeOfDay) {
      return {
        pace,
        distance: 5, // Default distance if not in UserProfile
        experience,
        timeOfDay,
      };
    }

    return null;
  }

  /**
   * Helper function to create PartnerMatching profile from UserProfile if it doesn't exist
   */
  private async ensurePartnerMatchingProfile(user: User): Promise<ProfileState | null> {
    // Check if profile already exists
    let profile = await this.profiles.findOne({ _id: user });
    if (profile) {
      return profile;
    }

    // Try to create from UserProfile
    const userProfile = await this.userProfiles.findOne({ _id: user });
    if (!userProfile) {
      return null;
    }

    const preferences = this.convertUserProfileToPreferences(userProfile);
    if (!preferences) {
      return null;
    }
    // Create the PartnerMatching profile
    profile = {
      _id: user,
      preferences,
    };
    await this.profiles.insertOne(profile);
    return profile;
  }

  /**
   * system suggestMatch (recipient: User, candidate: User): (suggestion: Suggestion)
   *
   * requires: the recipient and candidate exist and are distinct;
   * there is no active match between them; there is no existing suggestion from recipient to candidate;
   * if both users have profiles with preferences, at least three preferences must be the same
   *
   * effects: creates and returns a new match Suggestion with Candidate to Recipient,
   * sets Status to 'pending'. Preference matching is optional - if profiles exist, matching is performed.
   */
  async suggestMatch(
    { recipient, candidate }: { recipient: User; candidate: User },
  ): Promise<{ suggestion: Suggestion } | { error: string }> {
    try {
      if (recipient === candidate) {
        return { error: "Recipient and candidate cannot be the same user." };
      }

      const sortedUsers: [User, User] = recipient < candidate
        ? [recipient, candidate]
        : [candidate, recipient];
      const existingMatch = await this.matches.findOne({ users: sortedUsers });
      if (existingMatch) {
        return { error: "An active match already exists between these users." };
      }

      // Check for a suggestion in one direction only.
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

      // Optional: Try to get profiles for preference matching, but don't require them
      const recipientProfile = await this.ensurePartnerMatchingProfile(recipient);
      const candidateProfile = await this.ensurePartnerMatchingProfile(candidate);
      
      // If both profiles exist with preferences, perform preference matching
      // Otherwise, allow the suggestion to be created without preference matching
      if (recipientProfile?.preferences && candidateProfile?.preferences) {
        const recipientPrefs = recipientProfile.preferences;
        const candidatePrefs = candidateProfile.preferences;
        
        // Validate that preferences have all required fields
        if (recipientPrefs.pace && recipientPrefs.distance && recipientPrefs.experience && recipientPrefs.timeOfDay &&
            candidatePrefs.pace && candidatePrefs.distance && candidatePrefs.experience && candidatePrefs.timeOfDay) {
          // Perform preference matching
          let score = 0;
          if (recipientPrefs.pace === candidatePrefs.pace) score++;
          if (Math.abs(recipientPrefs.distance - candidatePrefs.distance) <= 1) score++; // Match if distance is within 1 mile
          if (recipientPrefs.experience === candidatePrefs.experience) score++;
          if (recipientPrefs.timeOfDay === candidatePrefs.timeOfDay) score++;

          if (score < 3) {
            return { error: "Users do not have enough matching preferences." };
          }
        }
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
   * effects: set Status of suggestion to 'declined' and deletes it from recipient's set of suggestions
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
   * checkAndCreateMatchFromMutualRequests (recipient: User, candidate: User): (match: Match) | Empty
   *
   * requires: both users exist and are distinct
   *
   * effects: if both users have sent pending requests to each other (mutual requests),
   * creates a new Match between them and deletes both suggestions. Otherwise returns Empty.
   */
  async checkAndCreateMatchFromMutualRequests(
    { recipient, candidate }: { recipient: User; candidate: User },
  ): Promise<{ match: Match } | Empty | { error: string }> {
    try {
      if (recipient === candidate) {
        return { error: "Recipient and candidate cannot be the same user." };
      }

      // Check if both users have sent requests to each other
      const suggestionAB = await this.suggestions.findOne({
        recipient,
        candidate,
        status: AcceptanceStatus.Pending,
      });

      const suggestionBA = await this.suggestions.findOne({
        recipient: candidate,
        candidate: recipient,
        status: AcceptanceStatus.Pending,
      });

      // If both suggestions exist and are pending, create a match
      if (suggestionAB && suggestionBA) {
        const sortedUsers: [User, User] = recipient < candidate
          ? [recipient, candidate]
          : [candidate, recipient];

        // Check if a match already exists
        const existingMatch = await this.matches.findOne({ users: sortedUsers });
        if (existingMatch) {
          return { error: "A match already exists between these users." };
        }

        // Create the match
        const newMatchId = freshID() as Match;
        await this.matches.insertOne({ _id: newMatchId, users: sortedUsers });

        // Delete both suggestions
        await this.suggestions.deleteMany({
          $or: [{ _id: suggestionAB._id }, { _id: suggestionBA._id }],
        });

        return { match: newMatchId };
      }

      return {};
    } catch (e) {
      console.error("Error in checkAndCreateMatchFromMutualRequests:", e);
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
   * This action creates a profile if it doesn't exist, or updates preferences if it does.
   *
   * requires: None (profile will be created if it doesn't exist)
   * effects: Creates or updates the preferences of the user's profile.
   */
  async updateProfilePreferences(
    { user, preferences }: { user: User; preferences: Preferences },
  ): Promise<{ profile: ProfileState } | { error: string }> {
    try {
      // Use upsert to create profile if it doesn't exist, or update if it does
      await this.profiles.updateOne(
        { _id: user },
        { $set: { preferences } },
        { upsert: true },
      );

      const profile = await this.profiles.findOne({ _id: user });
      if (!profile) {
        return { error: "Failed to retrieve profile after update." };
      }
      return { profile };
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

  /**
   * _getThumbsUpsSent (user: User): { userIds: User[] }
   * effects: Returns all user IDs that the given user has sent requests to (thumbs-upped).
   * A request is sent when suggestMatch is called with candidate = user.
   */
  async _getThumbsUpsSent(
    { user }: { user: User },
  ): Promise<{ userIds: User[] } | { error: string }> {
    try {
      const suggestions = await this.suggestions.find({
        candidate: user,
        status: AcceptanceStatus.Pending,
      }).toArray();
      const userIds = suggestions.map(s => s.recipient);
      return { userIds };
    } catch (e) {
      console.error("Error in _getThumbsUpsSent:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * _getThumbsUpsSentWithIds (user: User): { suggestions: Array<{ suggestionId: Suggestion, recipientId: User }> }
   * effects: Returns all suggestions that the given user has sent (thumbs-upped), including suggestion IDs.
   * This is useful for canceling requests, as the suggestion ID is needed for declineSuggestion.
   */
  async _getThumbsUpsSentWithIds(
    { user }: { user: User },
  ): Promise<{ suggestions: Array<{ suggestionId: Suggestion; recipientId: User }> } | { error: string }> {
    try {
      const suggestions = await this.suggestions.find({
        candidate: user,
        status: AcceptanceStatus.Pending,
      }).toArray();
      const result = suggestions.map(s => ({
        suggestionId: s._id,
        recipientId: s.recipient,
      }));
      return { suggestions: result };
    } catch (e) {
      console.error("Error in _getThumbsUpsSentWithIds:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * _getSuggestionIdForUser (candidate: User, recipient: User): { suggestionId: Suggestion | null }
   * effects: Returns the suggestion ID for a pending suggestion from candidate to recipient, if it exists.
   * This is useful for canceling a specific request.
   */
  async _getSuggestionIdForUser(
    { candidate, recipient }: { candidate: User; recipient: User },
  ): Promise<{ suggestionId: Suggestion | null } | { error: string }> {
    try {
      const suggestion = await this.suggestions.findOne({
        candidate,
        recipient,
        status: AcceptanceStatus.Pending,
      });
      return { suggestionId: suggestion?._id || null };
    } catch (e) {
      console.error("Error in _getSuggestionIdForUser:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * _getThumbsUpsReceived (user: User): { userIds: User[] }
   * effects: Returns all user IDs that have sent requests to the given user (thumbs-upped them).
   * A request is received when suggestMatch is called with recipient = user.
   */
  async _getThumbsUpsReceived(
    { user }: { user: User },
  ): Promise<{ userIds: User[] } | { error: string }> {
    try {
      const suggestions = await this.suggestions.find({
        recipient: user,
        status: AcceptanceStatus.Pending,
      }).toArray();
      const userIds = suggestions.map(s => s.candidate);
      return { userIds };
    } catch (e) {
      console.error("Error in _getThumbsUpsReceived:", e);
      return { error: "An unexpected server error occurred." };
    }
  }

  /**
   * _hasMutualMatch (userA: User, userB: User): { hasMutualMatch: boolean }
   * effects: Returns true if both users have sent requests to each other (mutual match).
   * This checks if there are pending suggestions in both directions.
   */
  async _hasMutualMatch(
    { userA, userB }: { userA: User; userB: User },
  ): Promise<{ hasMutualMatch: boolean } | { error: string }> {
    try {
      if (userA === userB) {
        return { hasMutualMatch: false };
      }

      // Check if userA sent a request to userB
      const suggestionAB = await this.suggestions.findOne({
        recipient: userB,
        candidate: userA,
        status: AcceptanceStatus.Pending,
      });

      // Check if userB sent a request to userA
      const suggestionBA = await this.suggestions.findOne({
        recipient: userA,
        candidate: userB,
        status: AcceptanceStatus.Pending,
      });

      // Also check if they're already matched
      const sortedUsers: [User, User] = userA < userB
        ? [userA, userB]
        : [userB, userA];
      const existingMatch = await this.matches.findOne({ users: sortedUsers });

      const hasMutualMatch = !!(suggestionAB && suggestionBA) || !!existingMatch;
      return { hasMutualMatch };
    } catch (e) {
      console.error("Error in _hasMutualMatch:", e);
      return { error: "An unexpected server error occurred." };
    }
  }
}