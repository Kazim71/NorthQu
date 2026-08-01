import type { Visitor } from './queries';

/**
 * A visitor's priority score, 0-100, for sorting who to contact first.
 *
 * WHY THIS IS COMPUTED HERE AND NOT IN SQL: the inputs are all fields the
 * visitor row already carries, so scoring in the database would mean a
 * second query returning numbers nobody could audit. Here it is a pure
 * function over data already on screen — a user can look at the row and see
 * why it scored what it did, and changing the weights is a one-file change
 * with no migration.
 *
 * WHY IT REPORTS ITS REASONS: an unexplained "87" is not actionable, and
 * worse, it is unfalsifiable — nobody can tell whether it is measuring
 * anything real. Every component that contributes points also contributes a
 * human-readable reason, so the number is always defensible.
 *
 * DELIBERATELY NOT INCLUDED: anything derived from location or device. A
 * lead is not more valuable for being on a desktop in a big city, and
 * baking that in would encode a bias as if it were a finding.
 */

export interface LeadScore {
  /** 0-100. Higher means contact sooner. */
  score: number;
  band: 'hot' | 'warm' | 'cool';
  /** Human-readable drivers, highest-weighted first. Never empty. */
  reasons: string[];
}

/** Signals that a visitor got close to buying. Weighted highest. */
const INTENT_EVENTS = new Set(['addToCart', 'checkout', 'purchase']);
/** Signals genuine product interest, short of intent to buy. */
const INTEREST_EVENTS = new Set(['productDetail', 'product_view', 'productClick', 'search']);

const HOUR_MS = 60 * 60 * 1000;

export function scoreVisitor(visitor: Visitor, now: Date = new Date()): LeadScore {
  const reasons: string[] = [];
  let score = 0;

  // --- Reachability (0-30) -------------------------------------------
  // Weighted first because an unreachable lead cannot be acted on at all,
  // however engaged they were. A phone number outranks an email here
  // because the downstream action this product exists to enable is a call
  // or a WhatsApp message.
  if (visitor.phone) {
    score += 30;
    reasons.push('Phone number captured');
  } else if (visitor.email) {
    score += 20;
    reasons.push('Email captured');
  } else {
    reasons.push('Anonymous — no way to contact yet');
  }

  // --- Buying intent (0-30) ------------------------------------------
  const intentHits = visitor.recentEvents.filter((e) => INTENT_EVENTS.has(e.event_type));
  if (intentHits.length > 0) {
    const reachedCheckout = intentHits.some(
      (e) => e.event_type === 'checkout' || e.event_type === 'purchase',
    );
    score += reachedCheckout ? 30 : 20;
    reasons.push(reachedCheckout ? 'Reached checkout' : 'Added something to cart');
  }

  // --- Depth of engagement (0-25) ------------------------------------
  // Pages, not raw events: twenty events on one page is a stuck tab, while
  // eight distinct pages is someone genuinely looking around.
  const pageScore = Math.min(visitor.pageCount * 3, 25);
  if (pageScore > 0) {
    score += pageScore;
    reasons.push(`Viewed ${visitor.pageCount} ${visitor.pageCount === 1 ? 'page' : 'pages'}`);
  }

  const interestHits = visitor.recentEvents.filter((e) => INTEREST_EVENTS.has(e.event_type));
  if (interestHits.length > 0 && intentHits.length === 0) {
    // Only credited when there is no stronger intent signal, so browsing
    // and cart-adding don't double-count as separate achievements.
    score += 5;
    reasons.push('Browsed products or searched');
  }

  // --- Recency (0-15) ------------------------------------------------
  // Decays rather than cliff-edges: a lead does not become worthless at
  // midnight. Someone active in the last hour is the single most
  // contactable person on the list.
  const hoursAgo = (now.getTime() - new Date(visitor.lastSeen).getTime()) / HOUR_MS;
  if (Number.isFinite(hoursAgo)) {
    if (hoursAgo < 1) {
      score += 15;
      reasons.push('Active in the last hour');
    } else if (hoursAgo < 24) {
      score += 10;
      reasons.push('Active today');
    } else if (hoursAgo < 24 * 7) {
      score += 4;
      reasons.push('Active this week');
    }
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: clamped,
    band: clamped >= 70 ? 'hot' : clamped >= 40 ? 'warm' : 'cool',
    reasons,
  };
}

/**
 * Digits-only phone, suitable for a `tel:` or `wa.me` link.
 *
 * Returns null rather than a best guess when there is nothing usable: a
 * broken tel: link that silently dials the wrong number is worse than no
 * link. Callers render the plain text instead.
 */
export function toDialable(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  // Shortest plausible national number; below this it is a typo or an
  // extension fragment, not something to hand to a dialer.
  return digits.length >= 8 ? digits : null;
}
