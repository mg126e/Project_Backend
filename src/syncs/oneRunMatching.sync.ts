import { OneRunMatching, Requesting, Sessioning, UserProfile } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

const SET_REGION_PATH = "/OneRunMatching/setRegion";
const REGISTER_USER_PATH = "/OneRunMatching/registerUser";

// Set Region - for users who already exist in OneRunMatching
export const HandleSetRegionRequest: Sync = ({ request, session, user, region }) => ({
  when: actions([
    Requesting.request,
    { path: SET_REGION_PATH, region, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([OneRunMatching.setRegion, { user, region }]),
});

export const RespondToSetRegionSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_REGION_PATH }, { request }],
    [OneRunMatching.setRegion, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetRegionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_REGION_PATH }, { request }],
    [OneRunMatching.setRegion, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Register User - for new users who don't exist in OneRunMatching yet
export const HandleRegisterUserRequest: Sync = ({ request, session, user, region }) => ({
  when: actions([
    Requesting.request,
    { path: REGISTER_USER_PATH, region, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([OneRunMatching.registerUser, { user, region }]),
});

export const RespondToRegisterUserSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: REGISTER_USER_PATH }, { request }],
    [OneRunMatching.registerUser, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToRegisterUserError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: REGISTER_USER_PATH }, { request }],
    [OneRunMatching.registerUser, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Cancel Run
const CANCEL_RUN_PATH = "/OneRunMatching/cancelRun";

export const HandleCancelRunRequest: Sync = ({ request, session, user, run }) => ({
  when: actions([
    Requesting.request,
    { path: CANCEL_RUN_PATH, run, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([OneRunMatching.cancelRun, { initiator: user, run }]),
});

export const RespondToCancelRunSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: CANCEL_RUN_PATH }, { request }],
    [OneRunMatching.cancelRun, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToCancelRunError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: CANCEL_RUN_PATH }, { request }],
    [OneRunMatching.cancelRun, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Get Run
const GET_RUN_PATH = "/OneRunMatching/_getRun";

export const HandleGetRunRequest: Sync = ({ request, session, user, run, runDoc }) => ({
  when: actions([
    Requesting.request,
    { path: GET_RUN_PATH, run, session },
    { request },
  ]),
  where: async (frames) => {
    console.log(`[HandleGetRunRequest] Matching sync for path: ${GET_RUN_PATH}`);
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    // Check if session query returned an error
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      console.log(`[HandleGetRunRequest] Session query failed or returned error`);
      return new Frames(); // Block the sync if session is invalid
    }
    
    const userIdFromFrame = frames[0][user];
    if (!userIdFromFrame) {
      console.log(`[HandleGetRunRequest] User ID not found in frames`);
      return new Frames(); // Block if user is missing
    }
    
    const runId = originalFrame[run] as ID;
    if (!runId) {
      console.log(`[HandleGetRunRequest] Run ID not found in request`);
      return new Frames(); // Block if run ID is missing
    }
    
    console.log(`[HandleGetRunRequest] Fetching run ${runId} for user ${userIdFromFrame}`);
    try {
      const runData = await OneRunMatching._getRun({ run: runId });
      if (!runData) {
        console.log(`[HandleGetRunRequest] Run ${runId} not found`);
        return new Frames({ ...originalFrame, [runDoc]: null });
      }
      
      // Verify the user is a participant in the run
      if (runData.userA !== userIdFromFrame && runData.userB !== userIdFromFrame) {
        console.log(`[HandleGetRunRequest] User ${userIdFromFrame} is not a participant in run ${runId}`);
        return new Frames({ ...originalFrame, [runDoc]: null }); // User not a participant
      }
      
      console.log(`[HandleGetRunRequest] Successfully fetched run ${runId} for user ${userIdFromFrame}`);
      return new Frames({ ...originalFrame, [runDoc]: runData });
    } catch (error) {
      console.error(`[HandleGetRunRequest] Error fetching run:`, error);
      return new Frames({ ...originalFrame, [runDoc]: null });
    }
  },
  then: actions([Requesting.respond, { request, runDoc }]),
});

// Respond with error if session is invalid for GetRun
export const HandleGetRunRequestError: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: GET_RUN_PATH, session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, {});
    // If session query fails or returns empty, this sync matches
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return frames;
    }
    return new Frames(); // Don't match if session is valid
  },
  then: actions([Requesting.respond, { request, error: "Invalid session" }]),
});

// Get Invite For Run
const GET_INVITE_FOR_RUN_PATH = "/OneRunMatching/_getInviteForRun";

export const HandleGetInviteForRunRequest: Sync = ({ request, session, user, run, invite }) => ({
  when: actions([
    Requesting.request,
    { path: GET_INVITE_FOR_RUN_PATH, run, session },
    { request },
  ]),
  where: async (frames) => {
    console.log(`[HandleGetInviteForRunRequest] Matching sync for path: ${GET_INVITE_FOR_RUN_PATH}`);
    const originalFrame = frames[0];
    console.log(`[HandleGetInviteForRunRequest] Original frame keys:`, Object.keys(originalFrame));
    console.log(`[HandleGetInviteForRunRequest] Original frame run value:`, originalFrame[run]);
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    // Check if session query returned an error
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      console.log(`[HandleGetInviteForRunRequest] Session query failed or returned error`);
      return new Frames(); // Block the sync if session is invalid
    }
    
    const userIdFromFrame = frames[0][user];
    if (!userIdFromFrame) {
      console.log(`[HandleGetInviteForRunRequest] User ID not found in frames`);
      return new Frames(); // Block if user is missing
    }
    
    const runId = originalFrame[run] as ID;
    console.log(`[HandleGetInviteForRunRequest] Extracted runId:`, runId);
    if (!runId) {
      console.log(`[HandleGetInviteForRunRequest] Run ID not found in request. Original frame:`, JSON.stringify(originalFrame, null, 2));
      return new Frames(); // Block if run ID is missing
    }
    
    console.log(`[HandleGetInviteForRunRequest] Fetching invite for run ${runId} for user ${userIdFromFrame}`);
    try {
      // First verify the user is a participant in the run
      const runData = await OneRunMatching._getRun({ run: runId });
      if (!runData) {
        console.log(`[HandleGetInviteForRunRequest] Run ${runId} not found`);
        return new Frames({ ...originalFrame, [invite]: null });
      }
      
      if (runData.userA !== userIdFromFrame && runData.userB !== userIdFromFrame) {
        console.log(`[HandleGetInviteForRunRequest] User ${userIdFromFrame} is not a participant in run ${runId}`);
        return new Frames({ ...originalFrame, [invite]: null }); // User not a participant
      }
      
      // Get the invite associated with this run
      const inviteData = await OneRunMatching._getInviteForRun({ run: runId });
      console.log(`[HandleGetInviteForRunRequest] Successfully fetched invite for run ${runId}`);
      return new Frames({ ...originalFrame, [invite]: inviteData });
    } catch (error) {
      console.error(`[HandleGetInviteForRunRequest] Error fetching invite for run:`, error);
      return new Frames({ ...originalFrame, [invite]: null });
    }
  },
  then: actions([Requesting.respond, { request, invite }]),
});

// Respond with error if session is invalid for GetInviteForRun
export const HandleGetInviteForRunRequestError: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: GET_INVITE_FOR_RUN_PATH, session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, {});
    // If session query fails or returns empty, this sync matches
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return frames;
    }
    return new Frames(); // Don't match if session is valid
  },
  then: actions([Requesting.respond, { request, error: "Invalid session" }]),
});

// Get Active Invites For User
const GET_ACTIVE_INVITES_FOR_USER_PATH = "/OneRunMatching/getActiveInvitesForUser";

export const HandleGetActiveInvitesForUserRequest: Sync = ({ request, session, user, invites }) => ({
  when: actions([
    Requesting.request,
    { path: GET_ACTIVE_INVITES_FOR_USER_PATH, session },
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
    
    try {
      let userDoc = await OneRunMatching._getUser({ user: userIdFromFrame as ID });
      if (!userDoc) {
        // User not in OneRunMatching - check if they have a location in their profile and auto-register
        console.log(`[HandleGetActiveInvitesForUserRequest] User ${userIdFromFrame} not found in OneRunMatching. Checking profile for location...`);
        const profile = await UserProfile._getProfile({ user: userIdFromFrame as ID });
        if (profile && !('error' in profile) && profile.location) {
          // Extract state from location (e.g., "Wellesley, MA" -> "MA")
          const extractState = (loc: string): string => {
            if (!loc) return "";
            const parts = loc.split(",").map(p => p.trim());
            return parts.length > 1 ? parts[parts.length - 1] : loc;
          };
          const region = extractState(profile.location);
          if (region) {
            console.log(`[HandleGetActiveInvitesForUserRequest] Auto-registering user ${userIdFromFrame} with region: ${region}`);
            const result = await OneRunMatching.registerUser({ user: userIdFromFrame as ID, region });
            if ('error' in result) {
              console.error(`[HandleGetActiveInvitesForUserRequest] Error auto-registering user: ${result.error}`);
              return new Frames({ ...originalFrame, [invites]: [] });
            }
            // Re-fetch user doc after registration
            userDoc = await OneRunMatching._getUser({ user: userIdFromFrame as ID });
          } else {
            console.log(`[HandleGetActiveInvitesForUserRequest] Could not extract state from location: ${profile.location}`);
            return new Frames({ ...originalFrame, [invites]: [] });
          }
        } else {
          console.log(`[HandleGetActiveInvitesForUserRequest] User ${userIdFromFrame} has no location set in profile. They need to set their location first.`);
          return new Frames({ ...originalFrame, [invites]: [] });
        }
      }
      if (!userDoc || !userDoc.region) {
        console.log(`[HandleGetActiveInvitesForUserRequest] User ${userIdFromFrame} has no region set. Region: ${userDoc?.region}`);
        return new Frames({ ...originalFrame, [invites]: [] });
      }
      if (!userDoc.region) {
        console.log(`[HandleGetActiveInvitesForUserRequest] User ${userIdFromFrame} has no region set. Region: ${userDoc.region}`);
        return new Frames({ ...originalFrame, [invites]: [] });
      }
      console.log(`[HandleGetActiveInvitesForUserRequest] Fetching invites for user ${userIdFromFrame} with region: ${userDoc.region}`);
      const userInvites = await OneRunMatching._getActiveInvitesForUser({ user: userIdFromFrame as ID });
      console.log(`[HandleGetActiveInvitesForUserRequest] Found ${userInvites.length} invites for user ${userIdFromFrame}`);
      return new Frames({ ...originalFrame, [invites]: userInvites });
    } catch (error) {
      console.error(`[HandleGetActiveInvitesForUserRequest] Error fetching invites:`, error);
      return new Frames({ ...originalFrame, [invites]: [] });
    }
  },
  then: actions([Requesting.respond, { request, invites }]),
});

// Respond with error if session is invalid for GetActiveInvitesForUser
export const HandleGetActiveInvitesForUserRequestError: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: GET_ACTIVE_INVITES_FOR_USER_PATH, session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, {});
    // If session query fails or returns empty, this sync matches
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      return frames;
    }
    return new Frames(); // Don't match if session is valid
  },
  then: actions([Requesting.respond, { request, error: "Invalid session" }]),
});

