import { UAParser } from 'ua-parser-js';

/**
 * User-Agent -> browser / OS / device type, for enriching ingested events.
 *
 * LIBRARY CHOICE: `ua-parser-js` pinned to ^1.0.39.
 *
 * The major-version pin is a licensing decision, not inertia: 1.x is MIT,
 * whereas 2.x relicensed to AGPL-3.0-or-later (both verified against the
 * registry). AGPL on a dependency of a commercial multi-tenant SaaS backend
 * is a real hazard, so 1.x is the correct line to sit on. It has no runtime
 * dependencies of its own.
 *
 * Rejected writing a hand-rolled regex parser: UA strings are a moving
 * target that a maintained library tracks and a bespoke 60-line matcher
 * silently rots against.
 */

export interface DeviceInfo {
  browser: string | null;
  os: string | null;
  /** 'desktop' | 'mobile' | 'tablet' | 'smarttv' | 'wearable' | 'console' | 'embedded' */
  type: string | null;
}

export const EMPTY_DEVICE: DeviceInfo = Object.freeze({
  browser: null,
  os: null,
  type: null,
});

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * Parse a User-Agent header. Never throws; an absent or unrecognizable UA
 * yields all-null, which the dashboard renders as "Unknown".
 */
export function parseUserAgent(userAgent: string | undefined): DeviceInfo {
  const ua = str(userAgent);
  if (!ua) return EMPTY_DEVICE;

  try {
    const parsed = new UAParser(ua).getResult();

    const browser = str(parsed.browser?.name);
    const os = str(parsed.os?.name);
    const rawType = str(parsed.device?.type);

    return {
      browser,
      os,
      // ua-parser-js leaves device.type UNDEFINED for desktop browsers —
      // it only labels the exceptions (mobile/tablet/smarttv/...). So an
      // absent type alongside a recognized browser means desktop. That is a
      // documented property of the library's output, not a guess; but if we
      // couldn't even identify a browser, we genuinely don't know, and null
      // (-> "Unknown") is the honest answer rather than defaulting to
      // 'desktop' and inflating the desktop share of the breakdown.
      type: rawType ?? (browser ? 'desktop' : null),
    };
  } catch {
    return EMPTY_DEVICE;
  }
}
