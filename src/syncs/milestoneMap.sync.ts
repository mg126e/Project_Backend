import { actions, Sync } from "@engine";
import { Requesting, Sessioning, MilestoneMap } from "@concepts";
import { Frames } from "@engine";
import { ID } from "@utils/types.ts";

//-- Create MilestoneMap --//
export const CreateMilestoneMapRequest: Sync = ({ request, session, user, userB }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/createMilestoneMap", session, userB },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([MilestoneMap.createMilestoneMap, { userA: user, userB }]),
});

export const CreateMilestoneMapResponseSuccess: Sync = ({ request, milestoneMap }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/createMilestoneMap" }, { request }],
    [MilestoneMap.createMilestoneMap, {}, { milestoneMap }],
  ),
  then: actions([Requesting.respond, { request, milestoneMapId: milestoneMap }]),
});

export const CreateMilestoneMapResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/createMilestoneMap" }, { request }],
    [MilestoneMap.createMilestoneMap, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Add Milestone --//
export const AddMilestoneRequest: Sync = ({ 
  request, session, user, milestoneMapId, latitude, longitude, 
  title, description, photoFileId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/addMilestone", session, milestoneMapId, latitude, 
      longitude, title, description, photoFileId },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([MilestoneMap.addMilestone, { 
    milestoneMap: milestoneMapId, latitude, longitude, title, description, 
    addedBy: user, photoFileId 
  }]),
});

export const AddMilestoneResponseSuccess: Sync = ({ request, milestone }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/addMilestone" }, { request }],
    [MilestoneMap.addMilestone, {}, { milestone }],
  ),
  then: actions([Requesting.respond, { request, milestoneId: milestone }]),
});

export const AddMilestoneResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/addMilestone" }, { request }],
    [MilestoneMap.addMilestone, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Remove Milestone --//
export const RemoveMilestoneRequest: Sync = ({ request, session, user, milestoneId }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/removeMilestone", session, milestoneId },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([MilestoneMap.removeMilestone, { milestone: milestoneId, user }]),
});

export const RemoveMilestoneResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/removeMilestone" }, { request }],
    [MilestoneMap.removeMilestone, {}, {}],
  ),
  then: actions([Requesting.respond, { request, data: "Milestone removed successfully" }]),
});

export const RemoveMilestoneResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/removeMilestone" }, { request }],
    [MilestoneMap.removeMilestone, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Close MilestoneMap --//
export const CloseMilestoneMapRequest: Sync = ({ request, session, user, milestoneMapId }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/closeMilestoneMap", session, milestoneMapId },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([MilestoneMap.closeMilestoneMap, { milestoneMap: milestoneMapId, user }]),
});

export const CloseMilestoneMapResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/closeMilestoneMap" }, { request }],
    [MilestoneMap.closeMilestoneMap, {}, {}],
  ),
  then: actions([Requesting.respond, { request, data: "MilestoneMap closed successfully" }]),
});

export const CloseMilestoneMapResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/closeMilestoneMap" }, { request }],
    [MilestoneMap.closeMilestoneMap, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Get MilestoneMap --//
export const GetMilestoneMapRequest: Sync = ({ request, session, user, partnerUserId, milestoneMap }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/getMilestoneMap", session, partnerUserId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return new Frames();
    }
    
    const userIdFromFrame = frames[0][user];
    const partnerIdFromFrame = frames[0][partnerUserId];
    if (!userIdFromFrame || !partnerIdFromFrame) {
      return new Frames();
    }
    
    const mapData = await MilestoneMap._getMilestoneMap({ 
      userA: userIdFromFrame as ID, 
      userB: partnerIdFromFrame as ID 
    });
    return new Frames({ ...originalFrame, [milestoneMap]: mapData });
  },
  then: actions([Requesting.respond, { request, milestoneMap }]),
});

//-- Get Milestones --//
export const GetMilestonesRequest: Sync = ({ request, session, user, milestoneMapId, milestones }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/getMilestones", session, milestoneMapId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return new Frames();
    }
    
    const mapIdFromFrame = frames[0][milestoneMapId];
    if (!mapIdFromFrame) {
      return new Frames();
    }
    
    const milestonesArray = await MilestoneMap._getMilestones({ 
      milestoneMap: mapIdFromFrame as ID 
    });
    return new Frames({ ...originalFrame, [milestones]: milestonesArray });
  },
  then: actions([Requesting.respond, { request, milestones }]),
});

//-- Get All Maps For User --//
export const GetAllMapsForUserRequest: Sync = ({ request, session, user, maps }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/getAllMapsForUser", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return new Frames();
    }
    
    const userIdFromFrame = frames[0][user];
    if (!userIdFromFrame) {
      return new Frames();
    }
    
    const mapsArray = await MilestoneMap._getAllMapsForUser({ 
      user: userIdFromFrame as ID 
    });
    return new Frames({ ...originalFrame, [maps]: mapsArray });
  },
  then: actions([Requesting.respond, { request, maps }]),
});

