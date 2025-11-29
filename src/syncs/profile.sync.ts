import { UserProfile, PasswordAuthentication, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

const CREATE_PROFILE_PATH = "/UserProfile/createProfile";
const SET_NAME_PATH = "/UserProfile/setName";
const SET_BIO_PATH = "/UserProfile/setBio";
const SET_LOCATION_PATH = "/UserProfile/setLocation";
const SET_EMERGENCY_CONTACT_PATH = "/UserProfile/setEmergencyContact";
const SET_TAG_PATH = "/UserProfile/setTag";
const SET_PROFILE_IMAGE_PATH = "/UserProfile/setProfileImage";
const SET_IS_ACTIVE_PATH = "/UserProfile/setIsActive";
const CLOSE_PROFILE_PATH = "/UserProfile/closeProfile";
const GET_PROFILE_PATH = "/UserProfile/_getProfile";

// Create Profile
export const HandleCreateProfileRequest: Sync = ({ request, user }) => ({
  when: actions([
    Requesting.request,
    { path: CREATE_PROFILE_PATH, user },
    { request },
  ]),
  then: actions([UserProfile.createProfile, { user }]),
});

export const RespondToCreateProfileSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: CREATE_PROFILE_PATH }, { request }],
    [UserProfile.createProfile, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToCreateProfileError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: CREATE_PROFILE_PATH }, { request }],
    [UserProfile.createProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Set Name
export const HandleSetNameRequest: Sync = ({ request, user, displayname }) => ({
  when: actions([
    Requesting.request,
    { path: SET_NAME_PATH, user, displayname },
    { request },
  ]),
  then: actions([UserProfile.setName, { user, displayname }]),
});

export const RespondToSetNameSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_NAME_PATH }, { request }],
    [UserProfile.setName, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToSetNameError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_NAME_PATH }, { request }],
    [UserProfile.setName, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Set Bio
export const HandleSetBioRequest: Sync = ({ request, user, bio }) => ({
  when: actions([
    Requesting.request,
    { path: SET_BIO_PATH, user, bio },
    { request },
  ]),
  then: actions([UserProfile.setBio, { user, bio }]),
});

export const RespondToSetBioSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_BIO_PATH }, { request }],
    [UserProfile.setBio, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToSetBioError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_BIO_PATH }, { request }],
    [UserProfile.setBio, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Set Location
export const HandleSetLocationRequest: Sync = ({ request, user, location }) => ({
  when: actions([
    Requesting.request,
    { path: SET_LOCATION_PATH, user, location },
    { request },
  ]),
  then: actions([UserProfile.setLocation, { user, location }]),
});

export const RespondToSetLocationSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_LOCATION_PATH }, { request }],
    [UserProfile.setLocation, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToSetLocationError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_LOCATION_PATH }, { request }],
    [UserProfile.setLocation, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Set Emergency Contact
export const HandleSetEmergencyContactRequest: Sync = ({ request, user, name, phone }) => ({
  when: actions([
    Requesting.request,
    { path: SET_EMERGENCY_CONTACT_PATH, user, name, phone },
    { request },
  ]),
  then: actions([UserProfile.setEmergencyContact, { user, name, phone }]),
});

export const RespondToSetEmergencyContactSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_EMERGENCY_CONTACT_PATH }, { request }],
    [UserProfile.setEmergencyContact, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToSetEmergencyContactError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_EMERGENCY_CONTACT_PATH }, { request }],
    [UserProfile.setEmergencyContact, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Set Tag
export const HandleSetTagRequest: Sync = ({ request, user, tagType, value }) => ({
  when: actions([
    Requesting.request,
    { path: SET_TAG_PATH, user, tagType, value },
    { request },
  ]),
  then: actions([UserProfile.setTag, { user, tagType, value }]),
});

export const RespondToSetTagSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_TAG_PATH }, { request }],
    [UserProfile.setTag, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToSetTagError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_TAG_PATH }, { request }],
    [UserProfile.setTag, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Set Profile Image
export const HandleSetProfileImageRequest: Sync = ({ request, user, image }) => ({
  when: actions([
    Requesting.request,
    { path: SET_PROFILE_IMAGE_PATH, user, image },
    { request },
  ]),
  then: actions([UserProfile.setProfileImage, { user, image }]),
});

export const RespondToSetProfileImageSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_PROFILE_IMAGE_PATH }, { request }],
    [UserProfile.setProfileImage, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToSetProfileImageError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_PROFILE_IMAGE_PATH }, { request }],
    [UserProfile.setProfileImage, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Set Is Active (Close Profile) - When a profile is closed, delete the user
export const HandleSetIsActiveRequest: Sync = ({ request, user, isActive }) => ({
  when: actions([
    Requesting.request,
    { path: SET_IS_ACTIVE_PATH, user, isActive },
    { request },
  ]),
  then: actions([UserProfile.setIsActive, { user, isActive }]),
});

export const RespondToSetIsActiveSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: SET_IS_ACTIVE_PATH }, { request }],
    [UserProfile.setIsActive, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToSetIsActiveError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: SET_IS_ACTIVE_PATH }, { request }],
    [UserProfile.setIsActive, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// When profile is closed (isActive explicitly set to false), delete the user from PasswordAuthentication
export const DeleteUserOnProfileClose: Sync = ({ user }) => ({
  when: actions(
    [UserProfile.setIsActive, { user, isActive: false }, {}],
  ),
  then: actions([PasswordAuthentication.deleteUser, { user }]),
});

// Close Account - Delete both profile and user authentication
export const HandleCloseAccountRequest: Sync = ({ request, user }) => ({
  when: actions([
    Requesting.request,
    { path: CLOSE_PROFILE_PATH, user },
    { request },
  ]),
  then: actions([UserProfile.closeProfile, { user }]),
});

export const RespondToCloseAccountSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: CLOSE_PROFILE_PATH }, { request }],
    [UserProfile.closeProfile, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RespondToCloseAccountError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: CLOSE_PROFILE_PATH }, { request }],
    [UserProfile.closeProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// When account is closed, also delete the user from PasswordAuthentication
export const DeleteUserOnAccountClose: Sync = ({ user }) => ({
  when: actions(
    [UserProfile.closeProfile, { user }, {}],
  ),
  then: actions([PasswordAuthentication.deleteUser, { user }]),
});

// Get Profile
export const HandleGetProfileRequest: Sync = ({ request, user }) => ({
  when: actions([
    Requesting.request,
    { path: GET_PROFILE_PATH, user },
    { request },
  ]),
  then: actions([UserProfile._getProfile, { user }]),
});

export const RespondToGetProfileSuccess: Sync = ({ request, profile }) => ({
  when: actions(
    [Requesting.request, { path: GET_PROFILE_PATH }, { request }],
    [UserProfile._getProfile, {}, { profile }],
  ),
  then: actions([Requesting.respond, { request, profile }]),
});

export const RespondToGetProfileError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: GET_PROFILE_PATH }, { request }],
    [UserProfile._getProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
