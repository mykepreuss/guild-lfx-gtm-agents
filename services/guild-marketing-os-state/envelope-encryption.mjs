import crypto from "node:crypto";
import {
  StateContractError,
  requiredString,
} from "./contracts.mjs";

export class LocalAesEnvelopeEncryption {
  #wrappingKey;
  #keyReference;

  constructor({ wrappingKey, keyReference = "local-test-key" } = {}) {
    this.#wrappingKey = normalizeKey(wrappingKey, "wrappingKey");
    this.#keyReference = requiredString(keyReference, "keyReference");
  }

  async encrypt(plaintext, associatedData) {
    const dataKey = crypto.randomBytes(32);
    const encrypted = encryptWithKey(plaintext, dataKey, associatedData);
    const wrapped = encryptWithKey(
      dataKey,
      this.#wrappingKey,
      `${associatedData}:data-key`,
    );
    dataKey.fill(0);
    return {
      ...encrypted,
      wrapped_key_reference: JSON.stringify({
        provider: "local_aes_test_only",
        key_reference: this.#keyReference,
        initialization_vector: wrapped.initialization_vector.toString("base64"),
        authentication_tag: wrapped.authentication_tag.toString("base64"),
        ciphertext: wrapped.ciphertext.toString("base64"),
      }),
    };
  }

  async decrypt(record, associatedData) {
    const wrapped = parseWrappedReference(record.wrapped_key_reference);
    if (
      wrapped.provider !== "local_aes_test_only" ||
      wrapped.key_reference !== this.#keyReference
    ) {
      throw new StateContractError(
        "encryption_key_unavailable",
        "The source encryption key reference is unavailable.",
        503,
      );
    }
    const dataKey = decryptWithKey(
      {
        initialization_vector: Buffer.from(
          wrapped.initialization_vector,
          "base64",
        ),
        authentication_tag: Buffer.from(
          wrapped.authentication_tag,
          "base64",
        ),
        ciphertext: Buffer.from(wrapped.ciphertext, "base64"),
      },
      this.#wrappingKey,
      `${associatedData}:data-key`,
    );
    try {
      return decryptWithKey(record, dataKey, associatedData).toString("utf8");
    } finally {
      dataKey.fill(0);
    }
  }
}

export class GoogleKmsEnvelopeEncryption {
  #keyName;
  #client;

  constructor({ keyName, client } = {}) {
    this.#keyName = requiredString(keyName, "keyName");
    this.#client = client;
  }

  async encrypt(plaintext, associatedData) {
    const dataKey = crypto.randomBytes(32);
    const encrypted = encryptWithKey(plaintext, dataKey, associatedData);
    try {
      const client = await this.#kmsClient();
      const [response] = await client.encrypt({
        name: this.#keyName,
        plaintext: dataKey,
        additionalAuthenticatedData: Buffer.from(
          `${associatedData}:data-key`,
        ),
      });
      if (!response?.ciphertext) {
        throw new StateContractError(
          "kms_encrypt_failed",
          "Cloud KMS did not return a wrapped data key.",
          503,
        );
      }
      return {
        ...encrypted,
        wrapped_key_reference: JSON.stringify({
          provider: "google_cloud_kms",
          key_name: this.#keyName,
          ciphertext: Buffer.from(response.ciphertext).toString("base64"),
        }),
      };
    } finally {
      dataKey.fill(0);
    }
  }

  async decrypt(record, associatedData) {
    const wrapped = parseWrappedReference(record.wrapped_key_reference);
    if (
      wrapped.provider !== "google_cloud_kms" ||
      wrapped.key_name !== this.#keyName
    ) {
      throw new StateContractError(
        "encryption_key_unavailable",
        "The source Cloud KMS key reference is unavailable.",
        503,
      );
    }
    const client = await this.#kmsClient();
    const [response] = await client.decrypt({
      name: this.#keyName,
      ciphertext: Buffer.from(wrapped.ciphertext, "base64"),
      additionalAuthenticatedData: Buffer.from(
        `${associatedData}:data-key`,
      ),
    });
    if (!response?.plaintext) {
      throw new StateContractError(
        "kms_decrypt_failed",
        "Cloud KMS did not return the source data key.",
        503,
      );
    }
    const dataKey = Buffer.from(response.plaintext);
    try {
      if (dataKey.length !== 32) {
        throw new StateContractError(
          "kms_decrypt_failed",
          "Cloud KMS returned an invalid source data key.",
          503,
        );
      }
      return decryptWithKey(record, dataKey, associatedData).toString("utf8");
    } finally {
      dataKey.fill(0);
    }
  }

  async #kmsClient() {
    if (this.#client) return this.#client;
    this.#client = new GoogleKmsRestClient();
    return this.#client;
  }
}

export class GoogleKmsRestClient {
  #fetch;
  #tokenProvider;
  #apiOrigin;
  #timeoutMs;

  constructor({
    fetchImpl = globalThis.fetch,
    tokenProvider,
    apiOrigin = "https://cloudkms.googleapis.com",
    timeoutMs = 10_000,
  } = {}) {
    if (typeof fetchImpl !== "function") {
      throw new TypeError("GoogleKmsRestClient requires fetch.");
    }
    this.#fetch = fetchImpl;
    this.#tokenProvider =
      tokenProvider ?? createMetadataAccessTokenProvider({ fetchImpl });
    this.#apiOrigin = new URL(apiOrigin).origin;
    this.#timeoutMs = timeoutMs;
  }

  async encrypt({ name, plaintext, additionalAuthenticatedData }) {
    const response = await this.#call(name, "encrypt", {
      plaintext: Buffer.from(plaintext).toString("base64"),
      additionalAuthenticatedData: Buffer.from(
        additionalAuthenticatedData,
      ).toString("base64"),
    });
    return [
      {
        ...response,
        ciphertext: Buffer.from(response.ciphertext, "base64"),
      },
    ];
  }

  async decrypt({ name, ciphertext, additionalAuthenticatedData }) {
    const response = await this.#call(name, "decrypt", {
      ciphertext: Buffer.from(ciphertext).toString("base64"),
      additionalAuthenticatedData: Buffer.from(
        additionalAuthenticatedData,
      ).toString("base64"),
    });
    return [
      {
        ...response,
        plaintext: Buffer.from(response.plaintext, "base64"),
      },
    ];
  }

  async #call(name, operation, body) {
    const keyName = requiredString(name, "KMS key name");
    if (
      !/^projects\/[A-Za-z0-9._-]+\/locations\/[A-Za-z0-9._-]+\/keyRings\/[A-Za-z0-9._-]+\/cryptoKeys\/[A-Za-z0-9._-]+(?:\/cryptoKeyVersions\/[A-Za-z0-9._-]+)?$/.test(
        keyName,
      )
    ) {
      throw new StateContractError(
        "invalid_kms_key_name",
        "The Cloud KMS key resource name is invalid.",
      );
    }
    const token = await this.#tokenProvider();
    const response = await this.#fetch(
      `${this.#apiOrigin}/v1/${keyName}:${operation}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.#timeoutMs),
      },
    );
    if (!response.ok) {
      throw new StateContractError(
        `kms_${operation}_failed`,
        `Cloud KMS ${operation} failed with HTTP ${response.status}.`,
        503,
      );
    }
    const value = await response.json();
    if (
      !value ||
      typeof value !== "object" ||
      typeof value[operation === "encrypt" ? "ciphertext" : "plaintext"] !==
        "string"
    ) {
      throw new StateContractError(
        `kms_${operation}_failed`,
        `Cloud KMS ${operation} returned an invalid response.`,
        503,
      );
    }
    return value;
  }
}

export function createMetadataAccessTokenProvider({
  fetchImpl = globalThis.fetch,
  metadataUrl =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
  clock = () => Date.now(),
  timeoutMs = 3_000,
} = {}) {
  let cached;
  return async function metadataAccessToken() {
    if (cached && cached.expiresAt - 60_000 > clock()) {
      return cached.accessToken;
    }
    const response = await fetchImpl(metadataUrl, {
      headers: { "metadata-flavor": "Google" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new StateContractError(
        "cloud_service_identity_unavailable",
        `Cloud service identity token request failed with HTTP ${response.status}.`,
        503,
      );
    }
    const value = await response.json();
    if (
      typeof value?.access_token !== "string" ||
      !value.access_token ||
      !Number.isFinite(value.expires_in)
    ) {
      throw new StateContractError(
        "cloud_service_identity_unavailable",
        "Cloud service identity token response is invalid.",
        503,
      );
    }
    cached = {
      accessToken: value.access_token,
      expiresAt: clock() + Number(value.expires_in) * 1000,
    };
    return cached.accessToken;
  };
}

function encryptWithKey(value, key, associatedData) {
  const plaintext = Buffer.isBuffer(value)
    ? value
    : Buffer.from(requiredString(value, "plaintext"), "utf8");
  const initializationVector = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    initializationVector,
  );
  cipher.setAAD(Buffer.from(associatedData));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);
  return {
    ciphertext,
    initialization_vector: initializationVector,
    authentication_tag: cipher.getAuthTag(),
  };
}

function decryptWithKey(record, key, associatedData) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    record.initialization_vector,
  );
  decipher.setAAD(Buffer.from(associatedData));
  decipher.setAuthTag(record.authentication_tag);
  return Buffer.concat([
    decipher.update(record.ciphertext),
    decipher.final(),
  ]);
}

function normalizeKey(value, field) {
  if (Buffer.isBuffer(value) && value.length === 32) return Buffer.from(value);
  if (typeof value === "string") {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length === 32) return decoded;
  }
  throw new StateContractError(
    "invalid_encryption_key",
    `${field} must be 32 bytes or base64-encoded 32 bytes.`,
  );
}

function parseWrappedReference(value) {
  try {
    const parsed = JSON.parse(requiredString(value, "wrapped_key_reference"));
    if (!parsed || typeof parsed !== "object") throw new Error("invalid");
    return parsed;
  } catch {
    throw new StateContractError(
      "invalid_encryption_record",
      "The wrapped source key reference is invalid.",
      500,
    );
  }
}
