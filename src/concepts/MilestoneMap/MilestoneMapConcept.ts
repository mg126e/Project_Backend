import { Collection, Database } from "@deps/mongo";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "MilestoneMap.";

// Generic types for this concept
type User = ID;
type MilestoneMap = ID;
type Milestone = ID;
type File = ID;

/**
 * State:
 * A set of MilestoneMaps, each with:
 *   users: User[] (set of users sharing the map)
 *   createdAt: Date
 * 
 * A set of Milestones, each with:
 *   milestoneMapId: MilestoneMap
 *   latitude: Number
 *   longitude: Number
 *   title: String
 *   description: String
 *   addedBy: User (which user added this milestone)
 *   photoFileId: File (optional, reference to FileUploading concept)
 *   createdAt: Date
 */

interface MilestoneMapDoc {
  _id: MilestoneMap;
  users: User[];
  createdAt: Date;
}

interface MilestoneDoc {
  _id: Milestone;
  milestoneMapId: MilestoneMap;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  addedBy: User;
  photoFileId?: File;
  createdAt: Date;
}

/**
 * @concept MilestoneMap
 * @purpose Provide a private, shared map for two running partners to commemorate 
 * milestones by dropping pins at specific locations with optional photos.
 */
export default class MilestoneMapConcept {
  private milestoneMaps: Collection<MilestoneMapDoc>;
  private milestones: Collection<MilestoneDoc>;

  constructor(private readonly db: Database) {
    this.milestoneMaps = this.db.collection<MilestoneMapDoc>(PREFIX + "milestoneMaps");
    this.milestones = this.db.collection<MilestoneDoc>(PREFIX + "milestones");
  }

  /**
   * createMilestoneMap (users: User[]): (milestoneMap: MilestoneMap)
   *
   * @requires no existing MilestoneMap for this set of users, at least 2 users
   * @effects creates a new shared MilestoneMap for the users
   */
  async createMilestoneMap(
    { users }: { users: User[] }
  ): Promise<{ milestoneMap: MilestoneMap } | { error: string }> {
    if (users.length < 2) {
      return { error: "At least two users required for a MilestoneMap." };
    }

    // Check if a map already exists for this set of users
    const existing = await this.milestoneMaps.findOne({
      users: { $all: users, $size: users.length }
    });

    if (existing) {
      return { error: "MilestoneMap already exists for this set of users." };
    }

    const milestoneMapId = freshID() as MilestoneMap;
    await this.milestoneMaps.insertOne({
      _id: milestoneMapId,
      users,
      createdAt: new Date()
    });

    return { milestoneMap: milestoneMapId };
  }

  /**
   * addMilestone (milestoneMap: MilestoneMap, latitude: Number, longitude: Number, 
   *              title: String, description: String, addedBy: User, photoFileId?: File): 
   *              (milestone: Milestone)
   *
   * @requires milestoneMap exists and addedBy is a member of the map
   * @effects adds a new milestone pin to the shared map
   */
  async addMilestone(
    { milestoneMap, latitude, longitude, title, description, addedBy, photoFileId }:
    { milestoneMap: MilestoneMap; latitude: number; longitude: number; 
      title: string; description: string; addedBy: User; photoFileId?: File }
  ): Promise<{ milestone: Milestone } | { error: string }> {
    // Verify the map exists and user is a member
    const map = await this.milestoneMaps.findOne({ _id: milestoneMap });
    if (!map) {
      return { error: "MilestoneMap not found." };
    }

    if (!map.users.some(u => u.toString() === addedBy.toString())) {
      return { error: "User is not a member of this MilestoneMap." };
    }

    const milestoneId = freshID() as Milestone;
    await this.milestones.insertOne({
      _id: milestoneId,
      milestoneMapId: milestoneMap,
      latitude,
      longitude,
      title,
      description,
      addedBy,
      photoFileId,
      createdAt: new Date()
    });

    return { milestone: milestoneId };
  }

  /**
   * removeMilestone (milestone: Milestone, user: User): ()
   *
   * @requires milestone exists and user is a member of the associated map
   * @effects removes the milestone from the map
   */
  async removeMilestone(
    { milestone, user }: { milestone: Milestone; user: User }
  ): Promise<Empty | { error: string }> {
    // Get the milestone
    const milestoneDoc = await this.milestones.findOne({ _id: milestone });
    if (!milestoneDoc) {
      return { error: "Milestone not found." };
    }

    // Verify user is a member of the map
    const map = await this.milestoneMaps.findOne({ _id: milestoneDoc.milestoneMapId });
    if (!map) {
      return { error: "Associated MilestoneMap not found." };
    }

    if (!map.users.some(u => u.toString() === user.toString())) {
      return { error: "User is not a member of this MilestoneMap." };
    }

    await this.milestones.deleteOne({ _id: milestone });
    return {};
  }

  /**
   * _getMilestoneMap (users: User[]): 
   *   (milestoneMap: {id: MilestoneMap, users: User[], createdAt: Date})?
   *
   * @effects returns the MilestoneMap reference for the set of users, or null if none exists
   */
  async _getMilestoneMap(
    { users }: { users: User[] }
  ): Promise<{ id: MilestoneMap; users: User[]; createdAt: Date } | null> {
    const map = await this.milestoneMaps.findOne({
      users: { $all: users, $size: users.length }
    });

    if (!map) return null;

    return {
      id: map._id,
      users: map.users,
      createdAt: map.createdAt
    };
  }

  /**
   * _getMilestones (milestoneMap: MilestoneMap): 
   *   (milestones: {id: Milestone, latitude: Number, longitude: Number, title: String, 
   *                 description: String, addedBy: User, photoFileId?: File, createdAt: Date}[])
   *
   * @effects returns all milestones for the given map
   */
  async _getMilestones(
    { milestoneMap }: { milestoneMap: MilestoneMap }
  ): Promise<Array<{
    id: Milestone;
    latitude: number;
    longitude: number;
    title: string;
    description: string;
    addedBy: User;
    photoFileId?: File;
    createdAt: Date;
  }>> {
    const milestones = await this.milestones.find({ milestoneMapId: milestoneMap }).toArray();
    
    return milestones.map(m => ({
      id: m._id,
      latitude: m.latitude,
      longitude: m.longitude,
      title: m.title,
      description: m.description,
      addedBy: m.addedBy,
      ...(m.photoFileId && { photoFileId: m.photoFileId }),
      createdAt: m.createdAt
    }));
  }

  /**
   * _getAllMapsForUser (user: User): 
   *   (maps: {id: MilestoneMap, users: User[], createdAt: Date}[])
   *
   * @effects returns all milestone maps where user is a member
   */
  async _getAllMapsForUser(
    { user }: { user: User }
  ): Promise<Array<{
    id: MilestoneMap;
    users: User[];
    createdAt: Date;
  }>> {
    const maps = await this.milestoneMaps.find({
      users: user
    }).toArray();

    return maps.map((m) => {
      return {
        id: m._id,
        users: m.users,
        createdAt: m.createdAt,
      };
    });
  }
}
