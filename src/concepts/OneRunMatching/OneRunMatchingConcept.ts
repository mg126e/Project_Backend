import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Define generic parameter types from the concept specification
type User = ID;
type Invite = ID;
type Run = ID;
type Time = string; // Representing time as a string, e.g., ISO 8601 format

const PREFIX = "OneRunMatching" + ".";

// Define interfaces for state collections based on the concept specification.

/**
 * a set of Users with
 * a region String
 * a set of run Invites
 * a set of scheduled Runs
 */
export interface UsersDoc {
  _id: User;
  region: string;
  invites: Invite[];
  runs: Run[];
}

/**
 * a set of run Invites with
 *   a Sent flag
 * a start Time
 * an Inviter user
 * a set of invitee Users
 * a meeting location String
 * a running distance Number
 * an acceptance Status (accepted, declined, pending)
 */
export interface InvitesDoc {
  _id: Invite;
  sent: boolean;
  start: Time;
  inviter: User;
  invitees: User[];
  location: string;
  distance: number;
  acceptanceStatus: "created" | "pending" | "accepted" | "declined";
  region: string;
}

/**
 * a set of scheduled Runs with
 *   a user UserA
 *   a user UserB
 * a Completed flag
 */
export interface RunsDoc {
  _id: Run;
  userA: User;
  userB: User;
  completed: boolean;
}

/**
 * concept: OneRunMatching
 * purpose: find a running partner for a one-time run in the near or immediate future
 */
export default class OneRunMatchingConcept {
  users: Collection<UsersDoc>;
  invites: Collection<InvitesDoc>;
  runs: Collection<RunsDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.invites = this.db.collection(PREFIX + "invites");
    this.runs = this.db.collection(PREFIX + "runs");
  }

  /**
   * registerUser (user: User, region: String): ()
   *
   * @requires The user does not already exist in OneRunMatching.users
   * @effects Creates a new user in OneRunMatching.users with the given region, empty invites and runs arrays
   */
  async registerUser({ user, region }: { user: User; region: string }): Promise<Empty | { error: string }> {
    if (!region || region.trim() === "") {
      return { error: "Region cannot be empty." };
    }
    const existingUser = await this.users.findOne({ _id: user });
    if (existingUser) {
      return { error: `User with id ${user} already exists in OneRunMatching.` };
    }
    await this.users.insertOne({
      _id: user,
      region,
      invites: [],
      runs: [],
    });
    return {};
  }

  /**
   * setRegion (user: User, region: String): ()
   *
   * @requires user exists and the String is a valid region
   * @effects sets the user's region to the given region String
   */
  async setRegion({ user, region }: { user: User; region: string }): Promise<Empty | { error: string }> {
    if (!region || region.trim() === "") {
      return { error: "Region cannot be empty." };
    }
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User with id ${user} does not exist.` };
    }
    await this.users.updateOne({ _id: user }, { $set: { region } });
    return {};
  }

  /**
   * createInvite (inviter: User, region: String, start: Time, distance: Number, location: String): (invite: Invite)
   *
   * requires: inviter exists, region and location are valid, start is a future time, and distance is greater than zero
   * effects: creates a new run Invite with given details and Sent flag set to false, and associates it with the inviter
   * 
   * Note: If the inviter doesn't exist, they will be auto-created with the given region.
   */
  async createInvite({ inviter, region, start, distance, location }: { inviter: User; region: string; start: Time; distance: number; location: string }): Promise<{ invite: Invite } | { error: string }> {
    let inviterDoc = await this.users.findOne({ _id: inviter });
    if (!inviterDoc) {
      // Auto-create user if they don't exist
      await this.users.insertOne({
        _id: inviter,
        region,
        invites: [],
        runs: [],
      });
      inviterDoc = { _id: inviter, region, invites: [], runs: [] };
    }
    if (distance <= 0) {
      return { error: "Distance must be greater than zero." };
    }
    if (new Date(start) <= new Date()) {
      return { error: "Start time must be in the future." };
    }
    if (!region || !location) {
      return { error: "Region and location cannot be empty." };
    }
    const newInviteId = freshID() as Invite;
    const newInvite: InvitesDoc = {
      _id: newInviteId,
      inviter,
      region,
      start,
      distance,
      location,
      sent: false,
      invitees: [],
      acceptanceStatus: "created",
    };
    await this.invites.insertOne(newInvite);
    await this.users.updateOne({ _id: inviter }, { $push: { invites: newInviteId } });
    return { invite: newInviteId };
  }

  /**
   * sendInvite (invite: Invite)
   *
   * requires: the invite exists, and its Sent flag is set to False
   * effects: sends Invite to all invitees (users in its associated region), sets Sent flag to True, sets Status to ‘pending’
   */
  async sendInvite({ invite }: { invite: Invite }): Promise<Empty | { error: string }> {
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      return { error: `Invite with id ${invite} does not exist.` };
    }
    if (inviteDoc.sent) {
      return { error: `Invite ${invite} has already been sent.` };
    }
    const invitees = await this.users
      .find({
        region: inviteDoc.region,
        _id: { $ne: inviteDoc.inviter },
      })
      .map((u) => u._id)
      .toArray();
    const updateResult = await this.invites.updateOne(
      { _id: invite, sent: false },
      {
        $set: {
          sent: true,
          acceptanceStatus: "pending",
          invitees: invitees,
        },
      },
    );
    if (updateResult.matchedCount === 0) {
      return { error: `Invite ${invite} could not be updated, it may have been sent already.` };
    }
    return {};
  }

  /**
   * deleteInvite (user: User, invite: Invite)
   *
   * requires: the invite exists and the user is the Inviter for that invite
   * effects: remove Invite from the Inviter’s set of invites
   */
  async deleteInvite({ user, invite }: { user: User; invite: Invite }): Promise<Empty | { error: string }> {
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      return {};
    }
    if (inviteDoc.inviter !== user) {
      return { error: "Permission denied: User is not the inviter." };
    }
    await this.invites.deleteOne({ _id: invite });
    await this.users.updateOne({ _id: user }, { $pull: { invites: invite } });
    return {};
  }

  /**
   * acceptInvite (inviter: UserA, invite: Invite, accepter: UserB): (scheduledRun: Run)
   *
   * requires: the invite exists, its Sent flag is true, and its acceptance status is 'pending'
   * effects: creates a new Run and the Status of the invite is set to ‘accepted’
   */
  async acceptInvite({ invite, accepter }: { inviter: User; invite: Invite; accepter: User }): Promise<{ scheduledRun: Run } | { error: string }> {
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      return { error: `Invite with id ${invite} does not exist.` };
    }
    if (!inviteDoc.sent) {
      return { error: `Invite ${invite} has not been sent.` };
    }
    if (inviteDoc.acceptanceStatus !== "pending") {
      return { error: `Invite ${invite} is not pending acceptance. Current status: ${inviteDoc.acceptanceStatus}.` };
    }
    if (inviteDoc.inviter === accepter) {
      return { error: "Users cannot accept their own invites." };
    }
    if (!inviteDoc.invitees.includes(accepter)) {
      return { error: `User ${accepter} was not invited to this run.` };
    }
    const newRunId = freshID() as Run;
    const newRun: RunsDoc = {
      _id: newRunId,
      userA: inviteDoc.inviter,
      userB: accepter,
      completed: false,
    };
    await this.runs.insertOne(newRun);
    await this.users.updateOne({ _id: inviteDoc.inviter }, { $push: { runs: newRunId } });
    await this.users.updateOne({ _id: accepter }, { $push: { runs: newRunId } });
    await this.invites.updateOne({ _id: invite }, { $set: { acceptanceStatus: "accepted" } });
    return { scheduledRun: newRunId };
  }

  /**
   * declineInvite (invite: Invite, decliner: User)
   *
   * requires: the invite exists, its Sent flag is true, and its acceptance Status is 'pending'
   * effects: sets invite Status to ‘declined’
   */
  async declineInvite({ invite, decliner }: { invite: Invite; decliner: User }): Promise<Empty | { error: string }> {
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      return { error: `Invite with id ${invite} does not exist.` };
    }
    if (!inviteDoc.sent) {
      return { error: `Invite ${invite} has not been sent.` };
    }
    if (inviteDoc.acceptanceStatus !== "pending") {
      return { error: `Invite ${invite} is not pending acceptance. Current status: ${inviteDoc.acceptanceStatus}.` };
    }
    if (!inviteDoc.invitees.includes(decliner)) {
      return { error: `User ${decliner} was not invited to this run.` };
    }
    await this.invites.updateOne({ _id: invite }, { $set: { acceptanceStatus: "declined" } });
    return {};
  }

  /**
   * completeRun (user: User, run: Run)
   *
   * requires: the run exists for the user and has not already been marked Completed
   * effects: sets the Completed flag of the run to true
   */
  async completeRun({ user, run }: { user: User; run: Run }): Promise<Empty | { error: string }> {
    const runDoc = await this.runs.findOne({ _id: run });
    if (!runDoc) {
      return { error: `Run with id ${run} does not exist.` };
    }
    if (runDoc.userA !== user && runDoc.userB !== user) {
      return { error: `User ${user} is not a participant in run ${run}.` };
    }
    if (runDoc.completed) {
      return { error: `Run ${run} has already been marked as completed.` };
    }
    await this.runs.updateOne({ _id: run }, { $set: { completed: true } });
    return {};
  }

  /**
   * cancelRun (initiator: User, run: Run)
   *
   * requires: the run exists for the initiator user
   * effects: deletes the run from the set of runs for all users associated with that Run
   */
  async cancelRun({ initiator, run }: { initiator: User; run: Run }): Promise<Empty | { error: string }> {
    const runDoc = await this.runs.findOne({ _id: run });
    if (!runDoc) {
      return {};
    }
    const { userA, userB } = runDoc;
    if (userA !== initiator && userB !== initiator) {
      return { error: `User ${initiator} is not a participant and cannot cancel run ${run}.` };
    }
    await this.runs.deleteOne({ _id: run });
    await this.users.updateOne({ _id: userA }, { $pull: { runs: run } });
    await this.users.updateOne({ _id: userB }, { $pull: { runs: run } });
    return {};
  }

  /**
   * system expireInvite (now: Time): (expiredInvites: Invite[])
   *
   * requires: Start time for any 'pending' or 'created' invite is in the past (relative to 'now')
   * effects: returns expired invites and removes them from the system
   */
  async expireInvite({ now }: { now: Time }): Promise<{ expiredInvites: Invite[] } | { error: string }> {
    const invitesToExpire = await this.invites
      .find({
        start: { $lte: now },
        acceptanceStatus: { $in: ["created", "pending"] },
      })
      .toArray();
    if (invitesToExpire.length === 0) {
      return { expiredInvites: [] };
    }
    const expiredInviteIds = invitesToExpire.map((i) => i._id);
    await this.invites.deleteMany({ _id: { $in: expiredInviteIds } });
    const inviterToInvitesMap = new Map<User, Invite[]>();
    for (const invite of invitesToExpire) {
      if (!inviterToInvitesMap.has(invite.inviter)) {
        inviterToInvitesMap.set(invite.inviter, []);
      }
      inviterToInvitesMap.get(invite.inviter)!.push(invite._id);
    }
    const bulkUserUpdates = [];
    for (const [inviter, invites] of inviterToInvitesMap.entries()) {
      bulkUserUpdates.push({
        updateOne: {
          filter: { _id: inviter },
          update: { $pull: { invites: { $in: invites } } },
        },
      });
    }
    if (bulkUserUpdates.length > 0) {
      await this.users.bulkWrite(bulkUserUpdates);
    }
    return { expiredInvites: expiredInviteIds };
  }

  /**
   * _getNumberOfMatches (user: User): (count: Number)
   *
   * Returns the number of runs (matches) for a given user
   */
  async _getNumberOfMatches({ user }: { user: User }): Promise<number> {
    if (!user) {
      return 0;
    }
    const count = await this.runs.countDocuments({
      $or: [{ userA: user }, { userB: user }],
    });
    return count;
  }

  /**
   * _getMatches (user: User): (matches: RunsDoc[])
   *
   * Returns all runs (matches) for a given user
   */
  async _getMatches({ user }: { user: User }): Promise<RunsDoc[]> {
    if (!user) {
      return [];
    }
    const matches = await this.runs
      .find({
        $or: [{ userA: user }, { userB: user }],
      })
      .toArray();
    return matches;
  }

  /**
   * _getInvitesForUser (user: User): (invites: InvitesDoc[])
   *
   * Returns all invites for a given user (both as inviter and as invitee)
   */
  async _getInvitesForUser({ user }: { user: User }): Promise<InvitesDoc[]> {
    if (!user) {
      return [];
    }
    const invites = await this.invites
      .find({
        $or: [{ inviter: user }, { invitees: user }],
      })
      .toArray();
    return invites;
  }

  /**
   * _getInvite (invite: Invite): (invite: InvitesDoc | null)
   *
   * Returns a specific invite by its ID, or null if not found
   */
  async _getInvite({ invite }: { invite: Invite }): Promise<InvitesDoc | null> {
    if (!invite) {
      return null;
    }
    const inviteDoc = await this.invites.findOne({ _id: invite });
    return inviteDoc || null;
  }
}
