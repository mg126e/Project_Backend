import { FileUploading, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

const REQUEST_UPLOAD_URL_PATH = "/files/request-upload-url";

// Request Upload URL
export const HandleRequestUploadURLRequest: Sync = ({ request, owner, filename }) => ({
  when: actions([
    Requesting.request,
    { path: REQUEST_UPLOAD_URL_PATH, owner, filename },
    { request },
  ]),
  then: actions([FileUploading.requestUploadURL, { owner, filename }]),
});

export const RespondToRequestUploadURLSuccess: Sync = ({ request, file, uploadURL }) => ({
  when: actions(
    [Requesting.request, { path: REQUEST_UPLOAD_URL_PATH }, { request }],
    [FileUploading.requestUploadURL, {}, { file, uploadURL }],
  ),
  then: actions([Requesting.respond, { request, response: { file, uploadURL } }]),
});

export const RespondToRequestUploadURLError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: REQUEST_UPLOAD_URL_PATH }, { request }],
    [FileUploading.requestUploadURL, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
