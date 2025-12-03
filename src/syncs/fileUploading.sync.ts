import { FileUploading, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

// Request Upload URL
export const RequestUploadURLRequest: Sync = ({ request, session, user, filename }) => ({
  when: actions([
    Requesting.request,
    { path: "/FileUploading/requestUploadURL", session, filename },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([FileUploading.requestUploadURL, { owner: user, filename }]),
});

export const RequestUploadURLResponseSuccess: Sync = ({ request, file, uploadURL }) => {
  return {
    when: actions(
      [Requesting.request, { path: "/FileUploading/requestUploadURL" }, { request }],
      [FileUploading.requestUploadURL, {}, { file, uploadURL }],
    ),
    where: (frames) => {
      return frames;
    },
    then: actions([Requesting.respond, { request, file, uploadURL }]),
  };
};

export const RequestUploadURLResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/requestUploadURL" }, { request }],
    [FileUploading.requestUploadURL, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Confirm Upload
export const ConfirmUploadRequest: Sync = ({ request, file }) => ({
  when: actions([
    Requesting.request,
    { path: "/FileUploading/confirmUpload", file },
    { request },
  ]),
  then: actions([FileUploading.confirmUpload, { file }]),
});

export const ConfirmUploadResponseSuccess: Sync = ({ request, file }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/confirmUpload" }, { request }],
    [FileUploading.confirmUpload, {}, { file }],
  ),
  then: actions([Requesting.respond, { request, msg: { file } }]),
});

export const ConfirmUploadResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/confirmUpload" }, { request }],
    [FileUploading.confirmUpload, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});

// Delete File
export const DeleteFileRequest: Sync = ({ request, session, user, file }) => ({
  when: actions([
    Requesting.request,
    { path: "/FileUploading/delete", session, file },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([FileUploading.delete, { file }]),
});

export const DeleteFileResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/delete" }, { request }],
    [FileUploading.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: {} }]),
});

export const DeleteFileResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/delete" }, { request }],
    [FileUploading.delete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, msg: { error } }]),
});
