import { UserProfile, PasswordAuthentication, Requesting, Sessioning, OneRunMatching, PartnerMatching } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

const CREATE_PROFILE_PATH = "/UserProfile/createProfile";
const SET_NAME_PATH = "/UserProfile/setName";
const SET_BIO_PATH = "/UserProfile/setBio";
const SET_LOCATION_PATH = "/UserProfile/setLocation";
const SET_EMERGENCY_CONTACT_PATH = "/UserProfile/setEmergencyContact";
const SET_TAG_PATH = "/UserProfile/setTag";
const SET_TIME_OF_DAY_CATEGORY_PATH = "/UserProfile/setTimeOfDayCategory";
const SET_PROFILE_IMAGE_PATH = "/UserProfile/setProfileImage";
const SET_IS_ACTIVE_PATH = "/UserProfile/setIsActive";
const CLOSE_PROFILE_PATH = "/UserProfile/closeProfile";
const GET_PROFILE_PATH = "/UserProfile/_getProfile";
const SUGGEST_MATCH_PATH = "/UserProfile/suggestMatch";

// Create Profile
export const HandleCreateProfileRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: CREATE_PROFILE_PATH, session },
    { request },
  ]),
  where: async (frames) => 
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.createProfile, { user }]),
});

export const RespondToCreateProfileSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: CREATE_PROFILE_PATH }, { request }],
    [UserProfile.createProfile, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToCreateProfileError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: CREATE_PROFILE_PATH }, { request }],
    [UserProfile.createProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Name
export const HandleSetNameRequest: Sync = ({ request, session, user, displayname }) => ({
  when: actions([
    Requesting.request,
    { path: SET_NAME_PATH, displayname, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setName, { user, displayname }]),
});

export const RespondToSetNameSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_NAME_PATH }, { request }],
    [UserProfile.setName, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetNameError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_NAME_PATH }, { request }],
    [UserProfile.setName, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Bio
export const HandleSetBioRequest: Sync = ({ request, session, user, bio }) => ({
  when: actions([
    Requesting.request,
    { path: SET_BIO_PATH, bio, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setBio, { user, bio }]),
});

export const RespondToSetBioSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_BIO_PATH }, { request }],
    [UserProfile.setBio, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetBioError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_BIO_PATH }, { request }],
    [UserProfile.setBio, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Location
export const HandleSetLocationRequest: Sync = ({ request, session, user, location }) => ({
  when: actions([
    Requesting.request,
    { path: SET_LOCATION_PATH, location, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setLocation, { user, location }]),
});

export const RespondToSetLocationSuccess: Sync = ({ request, user, location, session }) => ({
  when: actions(
    [Requesting.request, { path: SET_LOCATION_PATH, location, session }, { request }],
    [UserProfile.setLocation, { user }, {}],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    // Query user from session since UserProfile.setLocation doesn't output the user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0 || ('error' in frames[0] && frames[0].error)) {
      console.error(`[RespondToSetLocationSuccess] Could not get user from session`);
      return new Frames(originalFrame);
    }
    const userId = frames[0][user] as ID;
    const locationValue = originalFrame[location] as string;
    // Auto-register or update user in OneRunMatching when they set their location
    // Extract state from location (e.g., "Wellesley, MA" -> "MA")
    const extractState = (loc: string): string => {
      if (!loc) return "";
      // Split by comma and take the last part (state), trim whitespace
      const parts = loc.split(",").map(p => p.trim());
      return parts.length > 1 ? parts[parts.length - 1] : loc;
    };
    
    const region = extractState(locationValue);
    
    if (!region) {
      console.warn(`[RespondToSetLocationSuccess] Could not extract state from location: ${locationValue}`);
      return frames;
    }
    
    try {
      const existingUser = await OneRunMatching._getUser({ user: userId });
      if (!existingUser) {
        // User doesn't exist in OneRunMatching, register them
        const result = await OneRunMatching.registerUser({ user: userId, region });
        if ('error' in result) {
          console.error(`[RespondToSetLocationSuccess] Error registering user: ${result.error}`);
        }
      } else {
        // User exists, update their region
        const result = await OneRunMatching.setRegion({ user: userId, region });
        if ('error' in result) {
          console.error(`[RespondToSetLocationSuccess] Error setting region: ${result.error}`);
        }
      }
    } catch (error) {
      console.error(`[RespondToSetLocationSuccess] Error in where clause:`, error);
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetLocationError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_LOCATION_PATH }, { request }],
    [UserProfile.setLocation, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Emergency Contact
export const HandleSetEmergencyContactRequest: Sync = ({ request, session, user, name, phone }) => ({
  when: actions([
    Requesting.request,
    { path: SET_EMERGENCY_CONTACT_PATH, name, phone, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setEmergencyContact, { user, name, phone }]),
});

export const RespondToSetEmergencyContactSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_EMERGENCY_CONTACT_PATH }, { request }],
    [UserProfile.setEmergencyContact, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetEmergencyContactError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_EMERGENCY_CONTACT_PATH }, { request }],
    [UserProfile.setEmergencyContact, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Tag
export const HandleSetTagRequest: Sync = ({ request, session, user, tagType, value }) => ({
  when: actions([
    Requesting.request,
    { path: SET_TAG_PATH, tagType, value, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setTag, { user, tagType, value }]),
});

export const RespondToSetTagSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_TAG_PATH }, { request }],
    [UserProfile.setTag, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetTagError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_TAG_PATH }, { request }],
    [UserProfile.setTag, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Time of Day Category
export const HandleSetTimeOfDayCategoryRequest: Sync = ({ request, session, user, timeOfDayCategory }) => ({
  when: actions([
    Requesting.request,
    { path: SET_TIME_OF_DAY_CATEGORY_PATH, timeOfDayCategory, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setTimeOfDayCategory, { user, timeOfDayCategory }]),
});

export const RespondToSetTimeOfDayCategorySuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_TIME_OF_DAY_CATEGORY_PATH }, { request }],
    [UserProfile.setTimeOfDayCategory, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetTimeOfDayCategoryError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_TIME_OF_DAY_CATEGORY_PATH }, { request }],
    [UserProfile.setTimeOfDayCategory, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Profile Image
export const HandleSetProfileImageRequest: Sync = ({ request, session, user, image }) => ({
  when: actions([
    Requesting.request,
    { path: SET_PROFILE_IMAGE_PATH, image, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setProfileImage, { user, image }]),
});

export const RespondToSetProfileImageSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_PROFILE_IMAGE_PATH }, { request }],
    [UserProfile.setProfileImage, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetProfileImageError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_PROFILE_IMAGE_PATH }, { request }],
    [UserProfile.setProfileImage, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Set Is Active (Close Profile) - When a profile is closed, delete the user
export const HandleSetIsActiveRequest: Sync = ({ request, session, user, isActive }) => ({
  when: actions([
    Requesting.request,
    { path: SET_IS_ACTIVE_PATH, isActive, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.setIsActive, { user, isActive }]),
});

export const RespondToSetIsActiveSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_IS_ACTIVE_PATH }, { request }],
    [UserProfile.setIsActive, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSetIsActiveError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_IS_ACTIVE_PATH }, { request }],
    [UserProfile.setIsActive, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// When profile is closed (isActive explicitly set to false), delete the user from PasswordAuthentication
export const DeleteUserOnProfileClose: Sync = ({ user }) => ({
  when: actions(
    [UserProfile.setIsActive, { user, isActive: false }, {}],
  ),
  then: actions([PasswordAuthentication.deleteUser, { user }]),
});

// Close Account - Delete both profile and user authentication
export const HandleCloseAccountRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: CLOSE_PROFILE_PATH, session },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([UserProfile.closeProfile, { user }]),
});

export const RespondToCloseAccountSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: CLOSE_PROFILE_PATH }, { request }],
    [UserProfile.closeProfile, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToCloseAccountError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: CLOSE_PROFILE_PATH }, { request }],
    [UserProfile.closeProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// When account is closed, also delete the user from PasswordAuthentication
export const DeleteUserOnAccountClose: Sync = ({ user }) => ({
  when: actions(
    [UserProfile.closeProfile, { user }, {}],
  ),
  then: actions([PasswordAuthentication.deleteUser, { user }]),
});

// Get Profile
export const HandleGetProfileRequest: Sync = ({ request, session, user, profile }) => ({
  when: actions([
    Requesting.request,
    { path: GET_PROFILE_PATH, session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    const userIdFromFrame = frames[0][user];
    const profileData = await UserProfile._getProfile({ user: userIdFromFrame as ID });
    return new Frames({ ...originalFrame, [profile]: profileData });
  },
  then: actions([Requesting.respond, { request, profile }]),
});

// Get Profile Image Download URL
export const HandleGetProfileImageDownloadURLRequest: Sync = ({ request, session, user, downloadURL }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/getProfileImageDownloadURL", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    const userIdFromFrame = frames[0][user];
    const result = await UserProfile.getProfileImageDownloadURL(userIdFromFrame as ID);
    console.log("[HandleGetProfileImageDownloadURLRequest] UserProfile.getProfileImageDownloadURL result:", result);
    if ('error' in result) {
      return new Frames({ ...originalFrame, error: Symbol('error'), [Symbol('error')]: result.error });
    }
    console.log("[HandleGetProfileImageDownloadURLRequest] Setting downloadURL:", result.downloadURL);
    return new Frames({ ...originalFrame, [downloadURL]: result.downloadURL });
  },
  then: actions([Requesting.respond, { request, downloadURL }]),
});

// Suggest Match (Thumbs-up)
export const HandleSuggestMatchRequest: Sync = ({ request, session, user, otherUser }) => ({
  when: actions([
    Requesting.request,
    { path: SUGGEST_MATCH_PATH, session, otherUser },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([PartnerMatching.suggestMatch, { recipient: otherUser, candidate: user }]),
});

export const RespondToSuggestMatchSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SUGGEST_MATCH_PATH }, { request }],
    [PartnerMatching.suggestMatch, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const RespondToSuggestMatchError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SUGGEST_MATCH_PATH }, { request }],
    [PartnerMatching.suggestMatch, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});
