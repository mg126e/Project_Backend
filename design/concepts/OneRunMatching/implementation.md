# prompt: Implement the createInvite(), sendInvite(), and deleteInvite() actions in the OneRunMatching concept specification. Follow the concept specification and the instructions closely. Use the BodyMapGeneration as an example implementation, and do NOT use unnecessary imports.

[@concept-design-overview](../../design/background/concept-design-overview.md)

[@concept-specifications](../background/concept-specifications.md)

[@implementing-concepts](../background/implementing-concepts.md)

[@OneRunMatching](../concepts/OneRunMatching/OneRunMatching.md)

# response:

An implementation of the `OneRunMatching` concept, focusing on the `createInvite`, `sendInvite`, and `deleteInvite` actions as requested.

# file: src/concepts/OneRunMatching/OneRunMatchingConcept.ts

```typescript
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
interface UsersDoc {
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
interface InvitesDoc {
  _id: Invite;
  sent: boolean;
  start: Time;
  inviter: User;
  invitees: User[];
  location: string;
  distance: number;
  acceptanceStatus: "created" | "pending" | "accepted" | "declined";
  region: string; // Inferred from createInvite, needed for sendInvite
}

/**
 * a set of scheduled Runs with
 *   a user UserA
 *   a user UserB
 * a Completed flag
 */
interface RunsDoc {
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
   * createInvite (inviter: User, region: String, start: Time, distance: Number, location: String): (invite: Invite)
   *
   * requires: inviter exists, region and location are valid, start is a future time, and distance is greater than zero
   * effects: creates a new run Invite with given details and Sent flag set to false, and associates it with the inviter
   */
  async createInvite({ inviter, region, start, distance, location }: { inviter: User; region: string; start: Time; distance: number; location: string }): Promise<{ invite: Invite } | { error: string }> {
    // Requires: inviter exists
    const inviterDoc = await this.users.findOne({ _id: inviter });
    if (!inviterDoc) {
      return { error: `User with id ${inviter} does not exist.` };
    }
    // Requires: distance is greater than zero
    if (distance <= 0) {
      return { error: "Distance must be greater than zero." };
    }
    // Requires: start is a future time
    if (new Date(start) <= new Date()) {
      return { error: "Start time must be in the future." };
    }
    // Requires: region and location are valid (interpreted as non-empty)
    if (!region || !location) {
      return { error: "Region and location cannot be empty." };
    }

    // Effects: creates a new run Invite
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
    // Effects: associates invite with the inviter
    await this.users.updateOne({ _id: inviter }, { $push: { invites: newInviteId } });

    return { invite: newInviteId };
  }

  /**
   * sendInvite (invite: Invite, invitees: Users)
   * Note: The spec's `invitees: Users` argument is ignored in favor of the behavior described in the
   * 'effects' clause and concept 'principle', which state that invites are sent to all users in the associated region.
   * This makes the concept more self-contained and robust.
   *
   * requires: the invite exists, and its Sent flag is set to False
   * effects: sends Invite to all invitees (users in its associated region), sets Sent flag to True, sets Status to ‘pending’
   */
  async sendInvite({ invite }: { invite: Invite }): Promise<Empty | { error: string }> {
    // Requires: invite exists
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      return { error: `Invite with id ${invite} does not exist.` };
    }
    // Requires: Sent flag is set to False
    if (inviteDoc.sent) {
      return { error: `Invite ${invite} has already been sent.` };
    }

    // Effects: sends Invite to all invitees (users in its associated region)
    const invitees = await this.users
      .find({
        region: inviteDoc.region,
        _id: { $ne: inviteDoc.inviter }, // Exclude the inviter from the invitees list
      })
      .map((u) => u._id)
      .toArray();

    // Effects: sets Sent flag to True, sets Status to ‘pending’
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
      // This can happen in a race condition where another process sends the invite.
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
    // Requires: the invite exists
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      // If the invite doesn't exist, it can be considered successfully deleted.
      return {};
    }

    // Requires: the user is the Inviter for that invite
    if (inviteDoc.inviter !== user) {
      return { error: "Permission denied: User is not the inviter." };
    }

    // Effects: remove Invite
    await this.invites.deleteOne({ _id: invite });
    // Effects: remove Invite from the Inviter’s set of invites
    await this.users.updateOne({ _id: user }, { $pull: { invites: invite } });

    return {};
  }
}
```

# prompt: Implement the acceptInvite() and declineInvite() actions in the OneRunMatching concept specification. Follow the concept specification and the instructions closely. Use the BodyMapGeneration as an example implementation, and do NOT use unnecessary imports.

[@concept-design-overview](../../design/background/concept-design-overview.md)

[@concept-specifications](../background/concept-specifications.md)

[@implementing-concepts](../background/implementing-concepts.md)

[@OneRunMatching](../concepts/OneRunMatching/OneRunMatching.md)
# response:

An implementation of the `OneRunMatching` concept, focusing on the `acceptInvite` and `declineInvite` actions as requested.

# file: src/concepts/OneRunMatching/OneRunMatchingConcept.ts

```typescript
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
interface UsersDoc {
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
interface InvitesDoc {
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
interface RunsDoc {
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
   * createInvite (inviter: User, region: String, start: Time, distance: Number, location: String): (invite: Invite)
   *
   * requires: inviter exists, region and location are valid, start is a future time, and distance is greater than zero
   * effects: creates a new run Invite with given details and Sent flag set to false, and associates it with the inviter
   */
  async createInvite({ inviter, region, start, distance, location }: { inviter: User; region: string; start: Time; distance: number; location: string }): Promise<{ invite: Invite } | { error: string }> {
    const inviterDoc = await this.users.findOne({ _id: inviter });
    if (!inviterDoc) {
      return { error: `User with id ${inviter} does not exist.` };
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
   * Note: `inviter` is a redundant parameter as it is stored on the invite, but is kept for spec compliance.
   *
   * requires: the invite exists, its Sent flag is true, and its acceptance status is 'pending'
   * effects: creates a new Run and the Status of the invite is set to ‘accepted’
   */
  async acceptInvite({ invite, accepter }: { inviter: User; invite: Invite; accepter: User }): Promise<{ scheduledRun: Run } | { error: string }> {
    // Requires: the invite exists
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      return { error: `Invite with id ${invite} does not exist.` };
    }
    // Requires: its Sent flag is true
    if (!inviteDoc.sent) {
      return { error: `Invite ${invite} has not been sent.` };
    }
    // Requires: its acceptance status is 'pending'
    if (inviteDoc.acceptanceStatus !== "pending") {
      return { error: `Invite ${invite} is not pending acceptance. Current status: ${inviteDoc.acceptanceStatus}.` };
    }
    // Additional check: accepter cannot be the inviter.
    if (inviteDoc.inviter === accepter) {
      return { error: "Users cannot accept their own invites." };
    }
    // Additional check: accepter must be one of the invitees.
    if (!inviteDoc.invitees.includes(accepter)) {
      return { error: `User ${accepter} was not invited to this run.` };
    }

    // Effects: creates a new Run
    const newRunId = freshID() as Run;
    const newRun: RunsDoc = {
      _id: newRunId,
      userA: inviteDoc.inviter,
      userB: accepter,
      completed: false,
    };
    await this.runs.insertOne(newRun);

    // Effects: associate the new run with both users
    await this.users.updateOne({ _id: inviteDoc.inviter }, { $push: { runs: newRunId } });
    await this.users.updateOne({ _id: accepter }, { $push: { runs: newRunId } });

    // Effects: the Status of the invite is set to ‘accepted’
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
    // Requires: the invite exists
    const inviteDoc = await this.invites.findOne({ _id: invite });
    if (!inviteDoc) {
      return { error: `Invite with id ${invite} does not exist.` };
    }
    // Requires: its Sent flag is true
    if (!inviteDoc.sent) {
      return { error: `Invite ${invite} has not been sent.` };
    }
    // Requires: its acceptance Status is 'pending'
    if (inviteDoc.acceptanceStatus !== "pending") {
      return { error: `Invite ${invite} is not pending acceptance. Current status: ${inviteDoc.acceptanceStatus}.` };
    }
    // Additional check: decliner must be one of the invitees.
    if (!inviteDoc.invitees.includes(decliner)) {
      return { error: `User ${decliner} was not invited to this run.` };
    }

    // Effects: sets invite Status to ‘declined’
    // Note: This makes the invite unavailable for other potential accepters.
    await this.invites.updateOne({ _id: invite }, { $set: { acceptanceStatus: "declined" } });

    return {};
  }
}
```

# prompt: Implement the completeRun(), cancelRun(), and expireInvite() actions in the OneRunMatching concept specification. Follow the concept specification and the instructions closely. Use the BodyMapGeneration as an example implementation, and do NOT use unnecessary imports. Note that expireInvite is an automatic system action and NOT  a user-initiated one.

[@concept-design-overview](../../design/background/concept-design-overview.md)

[@concept-specifications](../background/concept-specifications.md)

[@implementing-concepts](../background/implementing-concepts.md)

[@OneRunMatching](../concepts/OneRunMatching/OneRunMatching.md)
# response:

An implementation of the `OneRunMatching` concept, focusing on the `completeRun`, `cancelRun`, and `expireInvite` actions as requested.

# file: src/concepts/OneRunMatching/OneRunMatchingConcept.ts

```typescript
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
interface UsersDoc {
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
interface InvitesDoc {
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
interface RunsDoc {
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
   * createInvite (inviter: User, region: String, start: Time, distance: Number, location: String): (invite: Invite)
   *
   * requires: inviter exists, region and location are valid, start is a future time, and distance is greater than zero
   * effects: creates a new run Invite with given details and Sent flag set to false, and associates it with the inviter
   */
  async createInvite({ inviter, region, start, distance, location }: { inviter: User; region: string; start: Time; distance: number; location: string }): Promise<{ invite: Invite } | { error: string }> {
    const inviterDoc = await this.users.findOne({ _id: inviter });
    if (!inviterDoc) {
      return { error: `User with id ${inviter} does not exist.` };
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
    // Requires: the run exists
    const runDoc = await this.runs.findOne({ _id: run });
    if (!runDoc) {
      return { error: `Run with id ${run} does not exist.` };
    }

    // Requires: the user is part of the run
    if (runDoc.userA !== user && runDoc.userB !== user) {
      return { error: `User ${user} is not a participant in run ${run}.` };
    }

    // Requires: has not already been marked Completed
    if (runDoc.completed) {
      return { error: `Run ${run} has already been marked as completed.` };
    }

    // Effects: sets the Completed flag of the run to true
    await this.runs.updateOne({ _id: run }, { $set: { completed: true } });

    return {};
  }

  /**
   * cancelRun (initiator: User, run: Run)
   * Note: The original spec includes `userB` and `time` parameters, which are redundant or unimplementable
   * with the current state schema. This implementation requires only the initiator and the run ID.
   *
   * requires: the run exists for the initiator user
   * effects: deletes the run from the set of runs for all users associated with that Run
   */
  async cancelRun({ initiator, run }: { initiator: User; run: Run }): Promise<Empty | { error: string }> {
    // Requires: the run exists
    const runDoc = await this.runs.findOne({ _id: run });
    if (!runDoc) {
      // If the run doesn't exist, it's already gone.
      return {};
    }

    // Requires: the initiator is part of the run
    const { userA, userB } = runDoc;
    if (userA !== initiator && userB !== initiator) {
      return { error: `User ${initiator} is not a participant and cannot cancel run ${run}.` };
    }

    // Effects: deletes the run
    await this.runs.deleteOne({ _id: run });

    // Effects: remove run from both users' sets of runs
    await this.users.updateOne({ _id: userA }, { $pull: { runs: run } });
    await this.users.updateOne({ _id: userB }, { $pull: { runs: run } });

    return {};
  }

  /**
   * system expireInvite (now: Time): (expiredInvites: Invite[])
   * Note: This is a system action. It finds and expires all invites whose start time has passed.
   * It takes the current time 'now' as input to determine which invites are in the past.
   *
   * requires: Start time for any 'pending' or 'created' invite is in the past (relative to 'now')
   * effects: returns expired invites and removes them from the system
   */
  async expireInvite({ now }: { now: Time }): Promise<{ expiredInvites: Invite[] } | { error: string }> {
    // Requires: find invites where start time is in the past and status is not final.
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

    // Effects: remove invites from the invites collection
    await this.invites.deleteMany({ _id: { $in: expiredInviteIds } });

    // Group invites by inviter to perform bulk updates
    const inviterToInvitesMap = new Map<User, Invite[]>();
    for (const invite of invitesToExpire) {
      if (!inviterToInvitesMap.has(invite.inviter)) {
        inviterToInvitesMap.set(invite.inviter, []);
      }
      inviterToInvitesMap.get(invite.inviter)!.push(invite._id);
    }

    // Effects: remove invites from each inviter's set of invites
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

    // Effects: returns expired invites
    return { expiredInvites: expiredInviteIds };
  }
}
```