'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  QUICK_RANGES,
  formatRangeLabel,
  matchingPreset,
  parseDateRangeFromSearchParams,
  rangeFromDays,
  toDateParam,
  type DateRange,
  type QuickRangeDays,
} from '@/lib/dateRange';

/**
 * Interactive date-range control: quick-select pills (1/7/30/90 days) plus a
 * calendar popover for an arbitrary custom range. Drives the URL's
 * `?days=N` or `?from=...&to=...` — the server page (a Server Component)
 * re-fetches with the new range on navigation, so this component owns no
 * data itself, only the range selection UI.
 *
 * LIBRARY CHOICE: no calendar package. Nothing lightweight already lived in
 * package.json (verified — no date-fns/dayjs/react-day-picker), and every
 * common option (react-day-picker, react-calendar, MUI's picker) pulls in
 * either a date-math library or a chunk of unrelated UI framework for what
 * is, here, a single-month grid with two clicks. A hand-built grid using
 * native `Date` + `Intl.DateTimeFormat` covers "click to open a calendar,
 * select a range visually" with zero added dependencies and zero added
 * bytes beyond this file — the genuinely minimal-footprint option, not just
 * the cheapest-sounding one.
 */
export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentRange = useMemo(
    () => parseDateRangeFromSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const activePreset = matchingPreset(currentRange);

  // Draft selection inside the popover — applied on "Apply", not live, so a
  // half-made selection never triggers a page refetch.
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => new Date(currentRange.to));

  useEffect(() => {
    if (open) {
      setDraftStart(currentRange.from);
      setDraftEnd(currentRange.to);
      setVisibleMonth(new Date(currentRange.to));
    }
    // Only re-sync when the popover transitions to open — a click inside
    // must not be reset by currentRange changing after Apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pushRange(range: DateRange, days?: QuickRangeDays) {
    const params = new URLSearchParams();
    if (days) {
      params.set('days', String(days));
    } else {
      params.set('from', toDateParam(range.from));
      params.set('to', toDateParam(range.to));
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function selectPreset(days: QuickRangeDays) {
    setOpen(false);
    pushRange(rangeFromDays(days), days);
  }

  function pickDay(day: Date) {
    // First click of a new selection, or a click before the current start:
    // start a fresh range. Otherwise this is the end of the range.
    if (!draftStart || draftEnd || day.getTime() < draftStart.getTime()) {
      setDraftStart(day);
      setDraftEnd(null);
    } else {
      setDraftEnd(day);
    }
  }

  function applyCustom() {
    if (!draftStart) return;
    const end = draftEnd ?? draftStart;
    setOpen(false);
    pushRange({ from: draftStart, to: end }, undefined);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_RANGES.map((days) => (
          <button
            key={days}
            onClick={() => selectPreset(days)}
            className={
              activePreset === days
                ? 'rounded-full bg-cinnamon-600 px-3.5 py-1.5 text-xs font-medium text-white'
                : 'rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-cinnamon-400 dark:border-neutral-700 dark:text-neutral-300'
            }
          >
            {days === 1 ? '24h' : `${days}d`}
          </button>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={
            activePreset === null
              ? 'flex items-center gap-1.5 rounded-full bg-cinnamon-600 px-3.5 py-1.5 text-xs font-medium text-white'
              : 'flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-cinnamon-400 dark:border-neutral-700 dark:text-neutral-300'
          }
        >
          <CalendarGlyph />
          {activePreset === null ? formatRangeLabel(currentRange) : 'Custom'}
        </button>
      </div>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[300px] rounded-xl border border-neutral-200 bg-white p-4 shadow-pop dark:border-neutral-800 dark:bg-neutral-900">
          <MonthGrid
            visibleMonth={visibleMonth}
            onVisibleMonthChange={setVisibleMonth}
            rangeStart={draftStart}
            rangeEnd={draftEnd}
            onPick={pickDay}
          />
          <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {draftStart ? toDateParam(draftStart) : '—'} → {draftEnd ? toDateParam(draftEnd) : draftStart ? toDateParam(draftStart) : '—'}
            </p>
            <button
              onClick={applyCustom}
              disabled={!draftStart}
              className="rounded-full bg-cinnamon-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:opacity-40 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function MonthGrid({
  visibleMonth,
  onVisibleMonthChange,
  rangeStart,
  rangeEnd,
  onPick,
}: {
  visibleMonth: Date;
  onVisibleMonthChange: (d: Date) => void;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onPick: (d: Date) => void;
}) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = toDateParam(today);

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const startKey = rangeStart ? toDateParam(rangeStart) : null;
  const endKey = rangeEnd ? toDateParam(rangeEnd) : null;

  function inRange(d: Date): boolean {
    if (!rangeStart || !rangeEnd) return false;
    return d.getTime() >= rangeStart.getTime() && d.getTime() <= rangeEnd.getTime();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onVisibleMonthChange(new Date(year, month - 1, 1))}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-black dark:text-white">
          {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => onVisibleMonthChange(new Date(year, month + 1, 1))}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-2xs text-neutral-400 dark:text-neutral-500">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = toDateParam(d);
          const isStart = key === startKey;
          const isEnd = key === endKey;
          const isToday = key === todayKey;
          const selected = isStart || isEnd || inRange(d);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(d)}
              className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                selected
                  ? 'bg-cinnamon-600 text-white'
                  : isToday
                    ? 'font-semibold text-cinnamon-600 hover:bg-cinnamon-50 dark:text-cinnamon-400 dark:hover:bg-neutral-800'
                    : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
