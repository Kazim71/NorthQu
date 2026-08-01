const STORAGE_KEY = 'lp_attribution';

/**
 * Keys are flat and snake_cased to match exactly what the analytics SQL
 * reads (`metadata->>'utm_source'`, `metadata->>'referrer'` — see
 * 0009_analytics.sql's get_traffic_sources). Nesting them under an
 * `attribution` object would be tidier here and would silently break that
 * query, so they stay flat deliberately.
 */
export interface Attribution {
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

let memoized: Attribution | null = null;

/**
 * FIRST-TOUCH, and persisted: whatever brought this browser to the site the
 * very first time is what every later event reports.
 *
 * The alternative (recompute per page load) would overwrite the real source
 * with 'Direct' the moment the visitor opened a second tab or came back via
 * a bookmark — so a lead that Instagram genuinely earned would end up
 * credited to nobody. Persisting it costs one small localStorage read and
 * makes the attribution survive the entire customer journey, which is the
 * only version of this number worth showing a business.
 *
 * Consequence worth knowing: a returning visitor's source reflects their
 * ORIGINAL acquisition, not how they arrived today. That is intentional and
 * matches what get_traffic_sources() claims to report.
 */
export function getAttribution(): Attribution {
  if (memoized) return memoized;

  const stored = read();
  if (stored) {
    memoized = stored;
    return stored;
  }

  const fresh = capture();
  write(fresh);
  memoized = fresh;
  return fresh;
}

function capture(): Attribution {
  const out: Attribution = {};

  try {
    const params = new URLSearchParams(location.search);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) out[key] = value.slice(0, 255);
    }
  } catch {
    /* URLSearchParams unavailable or malformed query — UTMs simply absent */
  }

  try {
    const ref = document.referrer;
    // A same-host referrer is internal navigation, not a traffic source.
    // Recording it would make the site its own top referrer, which is both
    // wrong and useless.
    if (ref && !isSameHost(ref)) out.referrer = ref.slice(0, 500);
  } catch {
    /* referrer blocked by policy — absence is the honest answer */
  }

  return out;
}

/**
 * Regex rather than `new URL()`: this runs in a bundle with a hard size
 * budget, and the constructor plus its mandatory try/catch costs more bytes
 * than the match. An unparseable referrer falls through as external, which
 * is the safer default — dropping a real source is worse than keeping an
 * odd one.
 */
function isSameHost(url: string): boolean {
  const m = url.match(/^https?:\/\/([^/?#]+)/);
  return m ? m[1] === location.host : false;
}

/**
 * Storage is wrapped for the same reason visitorId.ts wraps it: localStorage
 * throws (not returns null) in Safari private mode and under some CSPs, and
 * an analytics script must never break the page it runs on.
 */
function read(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Attribution) : null;
  } catch {
    return null;
  }
}

function write(value: Attribution): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota/private mode — attribution degrades to per-load, still correct
       for this page view */
  }
}
