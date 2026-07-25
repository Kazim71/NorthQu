import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a Shopify webhook signature.
 *
 * Shopify signs every webhook with HMAC-SHA256 over the EXACT raw request
 * body, keyed by the shared webhook secret, and sends the result
 * base64-encoded in the `X-Shopify-Hmac-Sha256` header. Verification must
 * therefore run on the untouched raw bytes — a re-serialized
 * `JSON.stringify(req.body)` reorders/reformats and will not match, which is
 * why the route parses with `express.raw`, not `express.json`.
 *
 * The comparison is constant-time (`timingSafeEqual`) so an attacker cannot
 * recover a valid signature byte-by-byte from response timing. Length is
 * checked first because `timingSafeEqual` throws on unequal-length buffers —
 * and that length check is itself safe to short-circuit, since the digest
 * length is fixed and public (32 bytes / SHA-256), not secret.
 */
export function verifyShopifyHmac(
  rawBody: Buffer,
  headerHmac: string | undefined,
  secret: string,
): boolean {
  if (!headerHmac) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(headerHmac, 'base64');
  } catch {
    return false;
  }

  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
