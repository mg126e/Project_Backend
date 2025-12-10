import { actions, Sync } from "@engine";
import { Requesting, Sessioning, MilestoneMap } from "@concepts";
import { Frames } from "@engine";
import { ID } from "@utils/types.ts";

//-- Create MilestoneMap --//
export const CreateMilestoneMapRequest: Sync = ({ request, session, user, users }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/createMilestoneMap", session, users },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return new Frames();
    }
    
    const userIdFromFrame = frames[0][user];
    const usersFromFrame = originalFrame[users] as ID[];
    
    // Ensure the authenticated user is included in the users array
    if (!usersFromFrame || !usersFromFrame.includes(userIdFromFrame as ID)) {
      return new Frames();
    }
    
    return new Frames({ ...originalFrame, [user]: userIdFromFrame, [users]: usersFromFrame });
  },
  then: actions([MilestoneMap.createMilestoneMap, { users }]),
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

//-- Add Milestone (without photo) --//
export const AddMilestoneNoPhotoRequest: Sync = ({ 
  request, session, user, milestoneMapId, latitude, longitude, 
  title, description
}) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/addMilestone", session, milestoneMapId, latitude, 
      longitude, title, description },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([MilestoneMap.addMilestone, { 
    milestoneMap: milestoneMapId, latitude, longitude, title, description, 
    addedBy: user
  }]),
});

export const AddMilestoneNoPhotoResponseSuccess: Sync = ({ request, milestone }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/addMilestone" }, { request }],
    [MilestoneMap.addMilestone, {}, { milestone }],
  ),
  then: actions([Requesting.respond, { request, milestoneId: milestone }]),
});

export const AddMilestoneNoPhotoResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/addMilestone" }, { request }],
    [MilestoneMap.addMilestone, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Add Milestone (with photo) --//
export const AddMilestoneWithPhotoRequest: Sync = ({ 
  request, session, user, milestoneMapId, latitude, longitude, 
  title, description, photoFileId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/addMilestoneWithPhoto", session, milestoneMapId, latitude, 
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

export const AddMilestoneWithPhotoResponseSuccess: Sync = ({ request, milestone }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/addMilestoneWithPhoto" }, { request }],
    [MilestoneMap.addMilestone, {}, { milestone }],
  ),
  then: actions([Requesting.respond, { request, milestoneId: milestone }]),
});

export const AddMilestoneWithPhotoResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MilestoneMap/addMilestoneWithPhoto" }, { request }],
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

//-- Get MilestoneMap --//
export const GetMilestoneMapRequest: Sync = ({ request, session, user, users, milestoneMap }) => ({
  when: actions([
    Requesting.request,
    { path: "/MilestoneMap/getMilestoneMap", session, users },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return new Frames();
    }
    
    const usersFromFrame = frames[0][users] as ID[];
    if (!usersFromFrame) {
      return new Frames();
    }
    
    const mapData = await MilestoneMap._getMilestoneMap({ users: usersFromFrame });
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

