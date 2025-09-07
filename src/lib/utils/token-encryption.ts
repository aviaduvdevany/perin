import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

// Runtime check for encryption key
if (!ENCRYPTION_KEY) {
  throw new Error(
    "OAUTH_TOKEN_ENCRYPTION_KEY environment variable is required for secure token storage"
  );
}

// Validate key format (should be 64 hex characters for AES-256)
if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error(
    "OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string (256-bit key)"
  );
}

// Key rotation support - optional KID (Key ID) for future key rotation
export interface EncryptedToken {
  data: string;
  kid?: string; // Key ID for rotation support
}

export const encryptToken = (token: string): string => {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  cipher.setAAD(Buffer.from("perin-oauth-token"));

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
};

export const decryptToken = (encryptedToken: string): string => {
  // Handle null, undefined, or empty tokens
  if (!encryptedToken || typeof encryptedToken !== "string") {
    throw new Error(`Invalid encrypted token: ${encryptedToken}`);
  }

  const parts = encryptedToken.split(":");

  // Check if token has the expected format (iv:authTag:encrypted)
  if (parts.length !== 3) {
    // This might be an old unencrypted token - return as-is for now
    // TODO: Remove this fallback after migration is complete
    console.warn(
      `Token appears to be unencrypted (${parts.length} parts instead of 3). Returning as-is.`
    );
    return encryptedToken;
  }

  const [ivHex, authTagHex, encrypted] = parts;

  // Validate that all parts exist and are not empty
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error(
      `Invalid encrypted token parts. IV: ${ivHex}, AuthTag: ${authTagHex}, Encrypted: ${
        encrypted ? "present" : "missing"
      }`
    );
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );
    decipher.setAAD(Buffer.from("perin-oauth-token"));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // If decryption fails, this might be an old unencrypted token
    console.warn(
      `Failed to decrypt token, returning as-is: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return encryptedToken;
  }
};

// Key rotation support - for future use when implementing key rotation
export const encryptTokenWithKid = (
  token: string,
  kid?: string
): EncryptedToken => {
  const encryptedData = encryptToken(token);
  return {
    data: encryptedData,
    kid: kid || "default", // Default key ID
  };
};

// Hook for key rotation - can be extended to support multiple keys
export const getKeyForKid = (kid: string): string => {
  if (kid === "default" || !kid) {
    return ENCRYPTION_KEY;
  }

  // Future: support multiple keys based on KID
  // For now, all tokens use the default key
  throw new Error(`Key rotation not yet implemented for KID: ${kid}`);
};
