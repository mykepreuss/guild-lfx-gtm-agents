#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  GoogleKmsEnvelopeEncryption,
  GoogleKmsRestClient,
  LocalAesEnvelopeEncryption,
  createMetadataAccessTokenProvider,
} from "./envelope-encryption.mjs";

const local = new LocalAesEnvelopeEncryption({
  wrappingKey: crypto.createHash("sha256").update("local-test-key").digest(),
});
const associatedData = "org-a:workspace-a:source-a:1";
const encrypted = await local.encrypt("Confidential source", associatedData);
assert.equal(
  JSON.stringify(encrypted).includes("Confidential source"),
  false,
);
assert.equal(
  await local.decrypt(encrypted, associatedData),
  "Confidential source",
);
await assert.rejects(() =>
  local.decrypt(encrypted, `${associatedData}:wrong`),
);

let encryptedDataKey;
const fakeKms = {
  async encrypt(request) {
    assert.equal(request.name, "projects/test/locations/global/keyRings/r/cryptoKeys/k");
    encryptedDataKey = Buffer.concat([
      Buffer.from("wrapped:"),
      Buffer.from(request.plaintext),
    ]);
    return [{ ciphertext: encryptedDataKey }];
  },
  async decrypt(request) {
    assert.deepEqual(Buffer.from(request.ciphertext), encryptedDataKey);
    return [{ plaintext: Buffer.from(request.ciphertext).subarray(8) }];
  },
};
const kms = new GoogleKmsEnvelopeEncryption({
  keyName: "projects/test/locations/global/keyRings/r/cryptoKeys/k",
  client: fakeKms,
});
const kmsEncrypted = await kms.encrypt("KMS source", associatedData);
assert.equal(kmsEncrypted.wrapped_key_reference.includes("google_cloud_kms"), true);
assert.equal(await kms.decrypt(kmsEncrypted, associatedData), "KMS source");

let metadataCalls = 0;
const metadataTokenProvider = createMetadataAccessTokenProvider({
  clock: () => 1_000,
  fetchImpl: async (url, options) => {
    metadataCalls += 1;
    assert.match(url, /metadata\.google\.internal/);
    assert.equal(options.headers["metadata-flavor"], "Google");
    return new Response(
      JSON.stringify({ access_token: "service-token", expires_in: 3600 }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
});
assert.equal(await metadataTokenProvider(), "service-token");
assert.equal(await metadataTokenProvider(), "service-token");
assert.equal(metadataCalls, 1);

const kmsCalls = [];
const restClient = new GoogleKmsRestClient({
  tokenProvider: async () => "service-token",
  fetchImpl: async (url, options) => {
    kmsCalls.push({ url, options });
    const request = JSON.parse(options.body);
    if (url.endsWith(":encrypt")) {
      return new Response(
        JSON.stringify({
          ciphertext: Buffer.from(`wrapped:${request.plaintext}`).toString(
            "base64",
          ),
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        plaintext: Buffer.from(
          Buffer.from(request.ciphertext, "base64")
            .toString("utf8")
            .replace(/^wrapped:/, ""),
          "base64",
        ).toString("base64"),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
});
const restEncrypted = await restClient.encrypt({
  name: "projects/test/locations/global/keyRings/r/cryptoKeys/k",
  plaintext: Buffer.from("data-key"),
  additionalAuthenticatedData: Buffer.from("aad"),
});
const restDecrypted = await restClient.decrypt({
  name: "projects/test/locations/global/keyRings/r/cryptoKeys/k",
  ciphertext: restEncrypted[0].ciphertext,
  additionalAuthenticatedData: Buffer.from("aad"),
});
assert.equal(Buffer.from(restDecrypted[0].plaintext).toString(), "data-key");
assert.equal(kmsCalls.length, 2);
assert.equal(
  kmsCalls.every(
    (call) => call.options.headers.authorization === "Bearer service-token",
  ),
  true,
);

console.log("Marketing OS envelope encryption test OK.");
