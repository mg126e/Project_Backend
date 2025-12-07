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
 *   userA: User (one partner)
 *   userB: User (the other partner)
 *   createdAt: Date
 *   isActive: Boolean
 * 
 * A set of Milestones, each with:
 *   milestoneMapId: MilestoneMap
 *   latitude: Number
 *   longitude: Number
 *   title: String
 *   description: String
 *   addedBy: User (which partner added this milestone)
 *   photoFileId: File (optional, reference to FileUploading concept)
 *   createdAt: Date
 */

interface MilestoneMapDoc {
  _id: MilestoneMap;
  userA: User;
  userB: User;
  createdAt: Date;
  isActive: boolean;
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
   * createMilestoneMap (userA: User, userB: User): (milestoneMap: MilestoneMap)
   *
   * @requires no existing MilestoneMap for this user pair
   * @effects creates a new shared MilestoneMap for the two users
   */
  async createMilestoneMap(
    { userA, userB }: { userA: User; userB: User }
  ): Promise<{ milestoneMap: MilestoneMap } | { error: string }> {
    // Check if a map already exists for this pair
    const existing = await this.milestoneMaps.findOne({
      $or: [
        { userA, userB },
        { userA: userB, userB: userA }
      ]
    });

    if (existing) {
      return { error: "MilestoneMap already exists for this user pair." };
    }

    const milestoneMapId = freshID() as MilestoneMap;
    await this.milestoneMaps.insertOne({
      _id: milestoneMapId,
      userA,
      userB,
      createdAt: new Date(),
      isActive: true
    });

    return { milestoneMap: milestoneMapId };
  }

  /**
   * addMilestone (milestoneMap: MilestoneMap, latitude: Number, longitude: Number, 
   *              title: String, description: String, addedBy: User, photoFileId?: File): 
   *              (milestone: Milestone)
   *
   * @requires milestoneMap exists and addedBy is one of the two users
   * @effects adds a new milestone pin to the shared map
   */
  async addMilestone(
    { milestoneMap, latitude, longitude, title, description, addedBy, photoFileId }:
    { milestoneMap: MilestoneMap; latitude: number; longitude: number; 
      title: string; description: string; addedBy: User; photoFileId?: File }
  ): Promise<{ milestone: Milestone } | { error: string }> {
    // Verify the map exists and user is a member
    const map = await this.milestoneMaps.findOne({ _id: milestoneMap, isActive: true });
    if (!map) {
      return { error: "MilestoneMap not found or inactive." };
    }

    if (map.userA.toString() !== addedBy.toString() && 
        map.userB.toString() !== addedBy.toString()) {
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

    if (map.userA.toString() !== user.toString() && 
        map.userB.toString() !== user.toString()) {
      return { error: "User is not a member of this MilestoneMap." };
    }

    await this.milestones.deleteOne({ _id: milestone });
    return {};
  }

  /**
   * closeMilestoneMap (milestoneMap: MilestoneMap, user: User): ()
   *
   * @requires milestoneMap exists and user is one of the two users
   * @effects closes the MilestoneMap reference for the two users (map data is preserved)
   */
  async closeMilestoneMap(
    { milestoneMap, user }: { milestoneMap: MilestoneMap; user: User }
  ): Promise<Empty | { error: string }> {
    const map = await this.milestoneMaps.findOne({ _id: milestoneMap });
    if (!map) {
      return { error: "MilestoneMap not found." };
    }

    if (map.userA.toString() !== user.toString() && 
        map.userB.toString() !== user.toString()) {
      return { error: "User is not a member of this MilestoneMap." };
    }

    // If already closed, return success (idempotent)
    if (!map.isActive) return {};

    await this.milestoneMaps.updateOne(
      { _id: milestoneMap },
      { $set: { isActive: false } }
    );

    return {};
  }

  /**
   * _getMilestoneMap (userA: User, userB: User): 
   *   (milestoneMap: {id: MilestoneMap, createdAt: Date, isActive: Boolean})?
   *
   * @effects returns the MilestoneMap reference for the user pair, or null if none exists
   */
  async _getMilestoneMap(
    { userA, userB }: { userA: User; userB: User }
  ): Promise<{ id: MilestoneMap; createdAt: Date; isActive: boolean } | null> {
    const map = await this.milestoneMaps.findOne({
      $or: [
        { userA, userB },
        { userA: userB, userB: userA }
      ]
    });

    if (!map) return null;

    return {
      id: map._id,
      createdAt: map.createdAt,
      isActive: map.isActive
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
   *   (maps: {id: MilestoneMap, partnerA: User, partnerB: User, createdAt: Date, isActive: Boolean}[])
   *
   * @effects returns all milestone maps where user is a member
   */
  async _getAllMapsForUser(
    { user }: { user: User }
  ): Promise<Array<{
    id: MilestoneMap;
    partnerA: User;
    partnerB: User;
    createdAt: Date;
    isActive: boolean;
  }>> {
    const maps = await this.milestoneMaps.find({
      $or: [
        { userA: user },
        { userB: user }
      ]
    }).toArray();

    return maps.map((m) => {
      return {
        id: m._id,
        partnerA: m.userA,
        partnerB: m.userB,
        createdAt: m.createdAt,
        isActive: m.isActive,
      };
    });
  }
}
