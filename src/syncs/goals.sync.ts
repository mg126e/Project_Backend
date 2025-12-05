import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, SharedGoals } from "@concepts";
import { ID } from "@utils/types.ts";

//-- Create Shared Goal --//
export const CreateSharedGoalRequest: Sync = ({ request, session, user, users, description }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/createSharedGoal", session, users, description },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.createSharedGoal, { users, description }]),
});

export const CreateSharedGoalResponseSuccess: Sync = ({ request, sharedGoalId }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/createSharedGoal" }, { request }],
    [SharedGoals.createSharedGoal, {}, { sharedGoalId }],
  ),
  then: actions([Requesting.respond, { request, sharedGoalId }]),
});

export const CreateSharedGoalResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/createSharedGoal" }, { request }],
    [SharedGoals.createSharedGoal, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Generate Shared Steps --//
export const GenerateSharedStepsRequest: Sync = ({ request, session, user, sharedGoal }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/generateSharedSteps", session, sharedGoal },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.generateSharedSteps, { sharedGoal, user }]),
});

export const GenerateSharedStepsResponseSuccess: Sync = ({ request, steps }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/generateSharedSteps" }, { request }],
    [SharedGoals.generateSharedSteps, {}, { steps }],
  ),
  then: actions([Requesting.respond, { request, steps }]),
});

export const GenerateSharedStepsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/generateSharedSteps" }, { request }],
    [SharedGoals.generateSharedSteps, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Regenerate Shared Steps --//
export const RegenerateSharedStepsRequest: Sync = ({ request, session, user, sharedGoal }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/regenerateSharedSteps", session, sharedGoal },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.regenerateSharedSteps, { sharedGoal, user }]),
});

export const RegenerateSharedStepsResponseSuccess: Sync = ({ request, steps }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/regenerateSharedSteps" }, { request }],
    [SharedGoals.regenerateSharedSteps, {}, { steps }],
  ),
  then: actions([Requesting.respond, { request, steps }]),
});

export const RegenerateSharedStepsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/regenerateSharedSteps" }, { request }],
    [SharedGoals.regenerateSharedSteps, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Add Shared Step --//
export const AddSharedStepRequest: Sync = ({ request, session, user, sharedGoal, description }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/addSharedStep", session, sharedGoal, description },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.addSharedStep, { sharedGoal, description, user }]),
});

export const AddSharedStepResponseSuccess: Sync = ({ request, step }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/addSharedStep" }, { request }],
    [SharedGoals.addSharedStep, {}, { step }],
  ),
  then: actions([Requesting.respond, { request, step }]),
});

export const AddSharedStepResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/addSharedStep" }, { request }],
    [SharedGoals.addSharedStep, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Complete Shared Step --//
export const CompleteSharedStepRequest: Sync = ({ request, session, user, step }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/completeSharedStep", session, step },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.completeSharedStep, { step, user }]),
});

export const CompleteSharedStepResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/completeSharedStep" }, { request }],
    [SharedGoals.completeSharedStep, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CompleteSharedStepResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/completeSharedStep" }, { request }],
    [SharedGoals.completeSharedStep, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Remove Shared Step --//
export const RemoveSharedStepRequest: Sync = ({ request, session, user, step }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/removeSharedStep", session, step },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.removeSharedStep, { step, user }]),
});

export const RemoveSharedStepResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/removeSharedStep" }, { request }],
    [SharedGoals.removeSharedStep, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RemoveSharedStepResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/removeSharedStep" }, { request }],
    [SharedGoals.removeSharedStep, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Close Shared Goal --//
export const CloseSharedGoalRequest: Sync = ({ request, session, user, sharedGoal }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/closeSharedGoal", session, sharedGoal },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.closeSharedGoal, { sharedGoal, user }]),
});

export const CloseSharedGoalResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/closeSharedGoal" }, { request }],
    [SharedGoals.closeSharedGoal, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CloseSharedGoalResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/closeSharedGoal" }, { request }],
    [SharedGoals.closeSharedGoal, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Set Initialized --//
export const SetInitializedRequest: Sync = ({ request, session, user, users, isInitialized }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/setInitialized", session, users, isInitialized },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([SharedGoals.setInitialized, { users, isInitialized }]),
});

export const SetInitializedResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SharedGoals/setInitialized" }, { request }],
    [SharedGoals.setInitialized, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

//-- Get All Goals For User --//
export const GetAllGoalsForUserRequest: Sync = ({ request, session, user, goals }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/_getAllGoalsForUser", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    // Check if session query returned an error
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return new Frames(); // Block the sync if session is invalid
    }
    
    const userIdFromFrame = frames[0][user];
    if (!userIdFromFrame) {
      return new Frames(); // Block the sync if user is missing
    }
    
    const goalsArray = await SharedGoals._getAllGoalsForUser({ user: userIdFromFrame as ID });
    return new Frames({ ...originalFrame, [goals]: goalsArray });
  },
  then: actions([Requesting.respond, { request, goals }]),
});

// Respond with error if session is invalid for GetAllGoalsForUser
export const GetAllGoalsForUserRequestError: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/_getAllGoalsForUser", session },
    { request },
  ]),
  where: async (frames) => {
    // Check if session query fails
    const sessionFrames = await frames.query(Sessioning._getUser, { session }, { user: Symbol('user') });
    if (sessionFrames.length === 0 || ('error' in sessionFrames[0] && sessionFrames[0].error)) {
      return frames; // Match this sync to return error
    }
    return new Frames(); // Don't match if session is valid (handled by GetAllGoalsForUserRequest)
  },
  then: actions([Requesting.respond, { request, error: "Invalid or expired session. Please log in again." }]),
});

//-- Get Shared Goals --//
export const GetSharedGoalsRequest: Sync = ({ request, session, user, users, isActive, goals }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/_getSharedGoals", session, users },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    const goalsArray = await SharedGoals._getSharedGoals({ 
      users: originalFrame[users] as ID[], 
      isActive: originalFrame[isActive] as boolean | undefined
    });
    return new Frames({ ...originalFrame, [goals]: goalsArray });
  },
  then: actions([Requesting.respond, { request, goals }]),
});

//-- Get Shared Goal By Id --//
export const GetSharedGoalByIdRequest: Sync = ({ request, session, user, users, sharedGoalId, goal }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/_getSharedGoalById", session, users, sharedGoalId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    const goalResult = await SharedGoals._getSharedGoalById({ 
      users: originalFrame[users] as ID[], 
      sharedGoalId: originalFrame[sharedGoalId] as ID
    });
    return new Frames({ ...originalFrame, [goal]: goalResult });
  },
  then: actions([Requesting.respond, { request, goal }]),
});

//-- Get Shared Steps --//
export const GetSharedStepsRequest: Sync = ({ request, session, user, sharedGoal, steps }) => ({
  when: actions([
    Requesting.request,
    { path: "/SharedGoals/_getSharedSteps", session, sharedGoal },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    const stepsArray = await SharedGoals._getSharedSteps({ sharedGoal: originalFrame[sharedGoal] as ID });
    return new Frames({ ...originalFrame, [steps]: stepsArray });
  },
  then: actions([Requesting.respond, { request, steps }]),
});
