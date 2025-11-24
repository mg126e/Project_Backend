import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";

// Types for this concept
type User = ID;
type SharedGoal = ID;
type SharedStep = ID;

interface SharedGoalDoc {
  _id: SharedGoal;
  users: User[]; // Set of users sharing the goal
  description: string;
  isActive: boolean;
}

interface SharedStepDoc {
  _id: SharedStep;
  sharedGoalId: SharedGoal;
  description: string;
  start: Date;
  completion?: Date;
}

/**
 * @concept SharedGoals
 */
export default class SharedGoalsConcept {
  private sharedGoals: Collection<SharedGoalDoc>;
  private sharedSteps: Collection<SharedStepDoc>;

  // Now includes groupKey for deterministic group identity
  private sharedGoalsInstance: Collection<{ groupKey: string; users: User[]; isInitialized: boolean }>;

  constructor(private readonly db: Db) {
    this.sharedGoals = this.db.collection<SharedGoalDoc>("SharedGoals.sharedGoals");
    this.sharedSteps = this.db.collection<SharedStepDoc>("SharedGoals.sharedSteps");
    this.sharedGoalsInstance = this.db.collection<{ groupKey: string; users: User[]; isInitialized: boolean }>("SharedGoals.sharedGoalsInstance");
  }

  // Helper to generate a deterministic group key from users
  private static groupKey(users: User[]): string {
    return users.slice().sort().join("|");
  }

  /**
   * createSharedGoal(users: Set<User>, description: String): (sharedGoalId: SharedGoal)
   */
  async createSharedGoal({ users, description }: { users: User[]; description: string }): Promise<{ sharedGoalId: SharedGoal } | { error: string }> {
    if (!description || users.length < 2) {
      return { error: "Description must not be empty and at least two users required." };
    }
    // Check for existing active goal with same users and description
    const existing = await this.sharedGoals.findOne({
      users: { $all: users, $size: users.length },
      description,
      isActive: true,
    });
    if (existing) {
      return { error: "Active shared goal with these users and description already exists." };
    }
    const _id = crypto.randomUUID() as SharedGoal;
    await this.sharedGoals.insertOne({ _id, users, description, isActive: true });
    return { sharedGoalId: _id };
  }

  /**
   * generateSharedSteps(sharedGoal: SharedGoal, user: User): (steps: SharedStep[])
   * (Stub: LLM generation not implemented)
   */
  async generateSharedSteps({ sharedGoal, user }: { sharedGoal: SharedGoal; user: User }): Promise<{ steps: SharedStepDoc[] } | { error: string }> {
    const goal = await this.sharedGoals.findOne({ _id: sharedGoal, isActive: true });
    if (!goal || !goal.users.includes(user)) {
      return { error: "Shared goal not found or user not a member." };
    }
    const existingSteps = await this.sharedSteps.find({ sharedGoalId: sharedGoal }).toArray();
    if (existingSteps.length > 0) {
      return { error: "Shared steps already exist for this goal." };
    }
    // Stub: generate 3 dummy steps
    const now = new Date();
    const steps: SharedStepDoc[] = [
      { _id: crypto.randomUUID() as SharedStep, sharedGoalId: sharedGoal, description: "Step 1", start: now },
      { _id: crypto.randomUUID() as SharedStep, sharedGoalId: sharedGoal, description: "Step 2", start: now },
      { _id: crypto.randomUUID() as SharedStep, sharedGoalId: sharedGoal, description: "Step 3", start: now },
    ];
    await this.sharedSteps.insertMany(steps);
    return { steps };
  }

  /**
   * regenerateSharedSteps(sharedGoal: SharedGoal, user: User): (steps: SharedStep[])
   */
  async regenerateSharedSteps({ sharedGoal, user }: { sharedGoal: SharedGoal; user: User }): Promise<{ steps: SharedStepDoc[] } | { error: string }> {
    const goal = await this.sharedGoals.findOne({ _id: sharedGoal, isActive: true });
    if (!goal || !goal.users.includes(user)) {
      return { error: "Shared goal not found or user not a member." };
    }
    await this.sharedSteps.deleteMany({ sharedGoalId: sharedGoal });
    return this.generateSharedSteps({ sharedGoal, user });
  }

  /**
   * addSharedStep(sharedGoal: SharedGoal, description: String, user: User): (step: SharedStep)
   */
  async addSharedStep({ sharedGoal, description, user }: { sharedGoal: SharedGoal; description: string; user: User }): Promise<{ step: SharedStepDoc } | { error: string }> {
    const goal = await this.sharedGoals.findOne({ _id: sharedGoal, isActive: true });
    if (!goal || !goal.users.includes(user)) {
      return { error: "Shared goal not found or user not a member." };
    }
    if (!description) {
      return { error: "Description must not be empty." };
    }
    const step: SharedStepDoc = {
      _id: crypto.randomUUID() as SharedStep,
      sharedGoalId: sharedGoal,
      description,
      start: new Date(),
    };
    await this.sharedSteps.insertOne(step);
    return { step };
  }

  /**
   * completeSharedStep(step: SharedStep, user: User): Empty
   */
  async completeSharedStep({ step, user }: { step: SharedStep; user: User }): Promise<Empty | { error: string }> {
    const stepDoc = await this.sharedSteps.findOne({ _id: step });
    if (!stepDoc) return { error: "Step not found." };
    const goal = await this.sharedGoals.findOne({ _id: stepDoc.sharedGoalId, isActive: true });
    if (!goal || !goal.users.includes(user)) return { error: "Shared goal not found or user not a member." };
    if (stepDoc.completion) return { error: "Step already completed." };
    await this.sharedSteps.updateOne({ _id: step }, { $set: { completion: new Date() } });
    return {};
  }

  /**
   * removeSharedStep(step: SharedStep, user: User): Empty
   */
  async removeSharedStep({ step, user }: { step: SharedStep; user: User }): Promise<Empty | { error: string }> {
    const stepDoc = await this.sharedSteps.findOne({ _id: step });
    if (!stepDoc) return { error: "Step not found." };
    const goal = await this.sharedGoals.findOne({ _id: stepDoc.sharedGoalId, isActive: true });
    if (!goal || !goal.users.includes(user)) return { error: "Shared goal not found or user not a member." };
    if (stepDoc.completion) return { error: "Cannot remove a completed step." };
    await this.sharedSteps.deleteOne({ _id: step });
    return {};
  }

  /**
   * closeSharedGoal(sharedGoal: SharedGoal, user: User): Empty
   */
  async closeSharedGoal({ sharedGoal, user }: { sharedGoal: SharedGoal; user: User }): Promise<Empty | { error: string }> {
    const goal = await this.sharedGoals.findOne({ _id: sharedGoal, isActive: true });
    if (!goal || !goal.users.includes(user)) return { error: "Shared goal not found or user not a member." };
    await this.sharedGoals.updateOne({ _id: sharedGoal }, { $set: { isActive: false } });
    return {};
  }


  /**
   * setInitialized(users: User[], isInitialized: boolean): Empty
   * Sets the isInitialized flag for the shared goals instance (group of users)
   */
  async setInitialized({ users, isInitialized }: { users: User[]; isInitialized: boolean }): Promise<Empty> {
    const groupKey = SharedGoalsConcept.groupKey(users);
    await this.sharedGoalsInstance.updateOne(
      { groupKey },
      { $set: { isInitialized, users, groupKey } },
      { upsert: true },
    );
    return {};
  }

  /**
   * _getSharedGoals(users: User[], isActive?: Boolean)
   */
  async _getSharedGoals({ users, isActive }: { users: User[]; isActive?: boolean }): Promise<{ id: SharedGoal; description: string; isActive: boolean }[]> {
    const query: any = { users: { $all: users, $size: users.length } };
    if (typeof isActive === "boolean") query.isActive = isActive;
    const goals = await this.sharedGoals.find(query).toArray();
    return goals.map(g => ({ id: g._id, description: g.description, isActive: g.isActive }));
  }

  /**
   * _getSharedGoalById(users: User[], sharedGoalId: SharedGoal)
   */
  async _getSharedGoalById({ users, sharedGoalId }: { users: User[]; sharedGoalId: SharedGoal }): Promise<{ id: SharedGoal; description: string; isActive: boolean } | null> {
    const goal = await this.sharedGoals.findOne({ _id: sharedGoalId, users: { $all: users, $size: users.length } });
    if (!goal) return null;
    return { id: goal._id, description: goal.description, isActive: goal.isActive };
  }

  /**
   * _getSharedSteps(sharedGoal: SharedGoal)
   */
  async _getSharedSteps({ sharedGoal }: { sharedGoal: SharedGoal }): Promise<{ id: SharedStep; description: string; start: Date; completion?: Date }[]> {
    const steps = await this.sharedSteps.find({ sharedGoalId: sharedGoal }).toArray();
    return steps.map(s => ({ id: s._id, description: s.description, start: s.start, completion: s.completion }));
  }
}
