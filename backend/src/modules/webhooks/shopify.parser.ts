/**
 * Pulls the fields we care about out of a Shopify `orders/create` or
 * `checkouts/create` webhook payload. Both share the shape used below
 * (top-level `email`/`phone`, a `customer` object, `shipping_address` /
 * `billing_address`, and the `note_attributes` array).
 *
 * This is deliberately defensive rather than a strict Zod schema: the real
 * payload is large, versioned by Shopify, and outside our control, so we
 * read the handful of fields we need and ignore everything else instead of
 * rejecting a document that has an extra key. The EXTRACTED result is what
 * gets validated downstream (against identifyPayloadSchema), where a missing
 * phone/email or visitor_id is a meaningful, handled outcome.
 *
 * THE VISITOR_ID PROBLEM: Shopify's webhook payload does NOT contain our
 * first-party `visitor_id` cookie — Shopify has no knowledge of it. The only
 * way it reaches this webhook is if the storefront copies it into a cart
 * attribute / checkout note attribute before checkout, which Shopify then
 * echoes back in `note_attributes`. We look for it there under
 * `VISITOR_ID_ATTRIBUTE`. If it's absent, correlation to prior anonymous
 * behavior is impossible for that order — see
 * tracking-snippet/shopify-webhook-integration.md for the full rationale and
 * the storefront wiring that makes it present.
 */

/** The note_attributes key the storefront must set (see the integration doc). */
export const VISITOR_ID_ATTRIBUTE = 'leadpulse_visitor_id';

export interface ExtractedIdentity {
  visitor_id?: string;
  phone?: string;
  email?: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

interface ShopifyAddress {
  name?: string;
  phone?: string;
  city?: string;
  province?: string;
  province_code?: string;
  country?: string;
  country_code?: string;
  zip?: string;
}

interface ShopifyNoteAttribute {
  name?: string;
  value?: unknown;
}

interface ShopifyCheckoutPayload {
  email?: string;
  phone?: string;
  customer?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    default_address?: ShopifyAddress;
  };
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  note_attributes?: ShopifyNoteAttribute[];
}

/** Trim to a non-empty string, or undefined. Keeps empty strings out of the RPC. */
function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function findVisitorId(noteAttributes: ShopifyNoteAttribute[] | undefined): string | undefined {
  if (!Array.isArray(noteAttributes)) return undefined;
  const match = noteAttributes.find((attr) => attr?.name === VISITOR_ID_ATTRIBUTE);
  return clean(match?.value);
}

export function extractIdentity(payload: ShopifyCheckoutPayload): ExtractedIdentity {
  const customer = payload.customer;
  // Prefer the shipping address (where the buyer actually is), fall back to
  // billing, then to the customer's saved default.
  const address = payload.shipping_address ?? payload.billing_address ?? customer?.default_address;

  const name =
    clean([customer?.first_name, customer?.last_name].filter(Boolean).join(' ')) ??
    clean(address?.name);

  return {
    visitor_id: findVisitorId(payload.note_attributes),
    phone:
      clean(payload.phone) ??
      clean(customer?.phone) ??
      clean(payload.shipping_address?.phone) ??
      clean(payload.billing_address?.phone),
    email: clean(payload.email) ?? clean(customer?.email),
    name,
    city: clean(address?.city),
    // province_code (e.g. "KA") is more stable than the free-text province;
    // fall back to the full name when the code isn't present.
    state: clean(address?.province) ?? clean(address?.province_code),
    country: clean(address?.country_code) ?? clean(address?.country),
    pincode: clean(address?.zip),
  };
}
