"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatCalendarDate, formatWeekdayDate } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  WEEKDAY_SHORT,
  compareYmd,
  dayOfMonth,
  isYearMonth,
  isYmd,
  monthDays,
  monthOf,
  scheduleToday,
  shiftMonth,
  weekdayOf,
} from "@/lib/schedule";

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const fieldClass =
  "flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-card px-3 py-2 text-left text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper disabled:text-muted";

type CalendarView = "days" | "months" | "years";

function ymdBound(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match && isYmd(match[1]) ? match[1] : undefined;
}

function dateOutOfRange(date: string, minDate?: string, maxDate?: string): boolean {
  if (minDate && compareYmd(date, minDate) < 0) return true;
  if (maxDate && compareYmd(date, maxDate) > 0) return true;
  return false;
}

function monthOutOfRange(month: string, minDate?: string, maxDate?: string): boolean {
  const days = monthDays(month);
  const start = days[0];
  const end = days[days.length - 1];
  if (!start || !end) return false;
  if (minDate && compareYmd(end, minDate) < 0) return true;
  if (maxDate && compareYmd(start, maxDate) > 0) return true;
  return false;
}

function yearOutOfRange(year: number, minDate?: string, maxDate?: string): boolean {
  if (minDate && compareYmd(`${year}-12-31`, minDate) < 0) return true;
  if (maxDate && compareYmd(`${year}-01-01`, maxDate) > 0) return true;
  return false;
}

function yearLimits(today: string, displayedYear: number, minDate?: string, maxDate?: string) {
  const todayYear = Number(today.slice(0, 4));
  const minYear = Math.min(minDate ? Number(minDate.slice(0, 4)) : 1900, displayedYear);
  const maxYear = Math.max(maxDate ? Number(maxDate.slice(0, 4)) : todayYear + 30, displayedYear);
  return { minYear, maxYear };
}

function withParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 ${up ? "rotate-180" : ""}`} aria-hidden>
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" aria-hidden>
      <rect x="2" y="3.25" width="12" height="10.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.5h12M5.25 2v2.5M10.75 2v2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function choiceClass(selected: boolean, disabled: boolean, today: boolean): string {
  const tone = selected
    ? "bg-pine text-white"
    : disabled
      ? "cursor-not-allowed text-muted/40"
      : "text-ink hover:bg-moss";
  const ring = today && !selected ? "ring-1 ring-inset ring-pine" : "";
  return `rounded-lg px-2 py-2 text-sm font-semibold transition ${tone} ${ring}`;
}

function Popover({
  open,
  anchor,
  label,
  onClose,
  children,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", zIndex: 80 });

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const panel = panelRef.current;
    if (!panel) return;

    function place() {
      const rect = anchor!.getBoundingClientRect();
      const width = Math.max(rect.width, 336);
      const height = panel!.offsetHeight;
      const gap = 6;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < height + gap && rect.top > spaceBelow;
      const top = above ? Math.max(8, rect.top - gap - height) : rect.bottom + gap;
      setStyle((current) => {
        if (current.top === top && current.left === left && current.width === width) return current;
        return { position: "fixed", zIndex: 80, top, left, width };
      });
    }

    place();
    const observer = new ResizeObserver(place);
    observer.observe(panel);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target || anchor?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
      anchor?.focus({ preventScroll: true });
    }
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, anchor, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panelRef}
      style={style}
      role="dialog"
      aria-label={label}
      className="rounded-xl border border-line bg-card p-3 shadow-xl shadow-ink/10"
    >
      {children}
    </div>,
    document.body,
  );
}

export function CalendarPanel({
  month,
  onMonthChange,
  minDate,
  maxDate,
  today,
  initialView = "days",
  focusDate,
  autoFocusSelection = false,
  onToday,
  onPickMonth,
  onPickYear,
  gridLabel = "Choose a date",
  renderDay,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  minDate?: string;
  maxDate?: string;
  today: string;
  initialView?: CalendarView;
  /** Day to focus when the day grid is shown. */
  focusDate?: string;
  /** Move focus into the open view. Popovers use this; inline calendars do not, so a form does not steal focus on load. */
  autoFocusSelection?: boolean;
  onToday?: () => void;
  /** When set, choosing a month commits it instead of returning to the day grid. */
  onPickMonth?: (month: string) => void;
  /** When set, choosing a year commits it instead of returning to the previous view. */
  onPickYear?: (month: string) => void;
  gridLabel?: string;
  renderDay: (date: string) => ReactNode;
}) {
  const min = ymdBound(minDate);
  const max = ymdBound(maxDate);
  const safeMonth = isYearMonth(month) ? month : monthOf(today);
  const displayedYear = Number(safeMonth.slice(0, 4));
  const displayedMonth = Number(safeMonth.slice(5, 7));
  const { minYear, maxYear } = yearLimits(today, displayedYear, min, max);
  const jumpsOnly = onPickMonth != null || onPickYear != null;
  const [view, setView] = useState<CalendarView>(initialView);
  const [yearReturn, setYearReturn] = useState<CalendarView>("days");
  const yearListRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  useLayoutEffect(() => {
    const first = !opened.current;
    opened.current = true;
    if (view === "years" && yearListRef.current) {
      const current = yearListRef.current.querySelector<HTMLElement>("[data-current='true']");
      if (current) {
        yearListRef.current.scrollTop = current.offsetTop - yearListRef.current.clientHeight / 2 + current.clientHeight / 2;
      }
    }
    if (first && !autoFocusSelection) return;
    const current = rootRef.current?.querySelector<HTMLElement>("[data-current='true']");
    const inside = current?.matches("button") ? current : current?.querySelector<HTMLButtonElement>("button");
    const focusTarget =
      inside instanceof HTMLButtonElement && !inside.disabled
        ? inside
        : rootRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])");
    focusTarget?.focus({ preventScroll: true });
  }, [view, autoFocusSelection]);

  function canShow(value: string): boolean {
    if (!isYearMonth(value)) return false;
    const year = Number(value.slice(0, 4));
    if (year < minYear || year > maxYear) return false;
    return !monthOutOfRange(value, min, max);
  }

  function showMonths() {
    setView((current) => (current === "months" && !jumpsOnly ? "days" : "months"));
  }

  function showYears() {
    if (view === "years" && !jumpsOnly) {
      setView(yearReturn);
      return;
    }
    if (view !== "years") setYearReturn(view === "months" ? "months" : "days");
    setView("years");
  }

  function chooseMonth(monthNumber: number) {
    const next = withParts(displayedYear, monthNumber);
    if (!canShow(next)) return;
    onMonthChange(next);
    if (onPickMonth) onPickMonth(next);
    else setView("days");
  }

  function chooseYear(year: number) {
    if (yearOutOfRange(year, min, max) || year < minYear || year > maxYear) return;
    let next = withParts(year, displayedMonth);
    if (!canShow(next)) {
      const fallback = Array.from({ length: 12 }, (_, index) => withParts(year, index + 1)).find((item) => canShow(item));
      if (!fallback) return;
      next = fallback;
    }
    onMonthChange(next);
    if (onPickYear) onPickYear(next);
    else setView(yearReturn === "years" ? "days" : yearReturn);
  }

  function step(delta: number) {
    if (view === "years") {
      const list = yearListRef.current;
      list?.scrollBy({ top: delta * Math.max(list.clientHeight * 0.75, 120), behavior: "smooth" });
      return;
    }
    const next = shiftMonth(safeMonth, view === "months" ? delta * 12 : delta);
    if (!canShow(next)) return;
    onMonthChange(next);
  }

  function goToday() {
    if (!isYmd(today) || dateOutOfRange(today, min, max)) return;
    if (onToday) {
      onToday();
      return;
    }
    const next = monthOf(today);
    onMonthChange(next);
    if (onPickMonth) onPickMonth(next);
    else setView("days");
  }

  const todayAvailable = isYmd(today) && !dateOutOfRange(today, min, max);
  const backDisabled = view !== "years" && !canShow(shiftMonth(safeMonth, view === "months" ? -12 : -1));
  const forwardDisabled = view !== "years" && !canShow(shiftMonth(safeMonth, view === "months" ? 12 : 1));
  const days = monthDays(safeMonth);
  const leading = days.length > 0 ? weekdayOf(days[0]) : 0;
  const markedDay = focusDate && days.includes(focusDate) ? focusDate : today;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
  const navClass =
    "rounded-md px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:text-muted/30 disabled:hover:bg-transparent";
  const headerClass = (active: boolean) =>
    `inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-semibold ${active ? "bg-moss text-pine" : "text-ink hover:bg-moss"}`;

  return (
    <div ref={rootRef}>
      <div className="mb-3 flex items-center justify-between gap-1">
        <button type="button" className={navClass} aria-label={SCHEDULE_TEXT.previous} disabled={backDisabled} onClick={() => step(-1)}>
          ‹
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
          <button
            type="button"
            className={`${headerClass(view === "months")} min-w-0`}
            aria-expanded={view === "months"}
            aria-label={`Choose month, ${MONTH_LONG[displayedMonth - 1] ?? ""}`}
            onClick={showMonths}
          >
            <span className="truncate">{MONTH_LONG[displayedMonth - 1]}</span>
            <Chevron up={view === "months"} />
          </button>
          <button
            type="button"
            className={`${headerClass(view === "years")} shrink-0`}
            aria-expanded={view === "years"}
            aria-label={`Choose year, ${displayedYear}`}
            onClick={showYears}
          >
            {displayedYear}
            <Chevron up={view === "years"} />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {todayAvailable ? (
            <button type="button" className="rounded-md px-2 py-1.5 text-sm font-semibold text-pine hover:bg-moss" onClick={goToday}>
              {SCHEDULE_TEXT.today}
            </button>
          ) : null}
          <button type="button" className={navClass} aria-label={SCHEDULE_TEXT.next} disabled={forwardDisabled} onClick={() => step(1)}>
            ›
          </button>
        </div>
      </div>

      {view === "months" ? (
        <div role="group" aria-label="Choose a month" className="grid grid-cols-3 gap-1">
          {MONTH_SHORT.map((label, index) => {
            const value = withParts(displayedYear, index + 1);
            const disabled = !canShow(value);
            const selected = value === safeMonth;
            const isCurrent = value === monthOf(today);
            return (
              <button
                key={label}
                type="button"
                data-current={selected ? "true" : undefined}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => chooseMonth(index + 1)}
                className={choiceClass(selected, disabled, isCurrent)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "years" ? (
        <div ref={yearListRef} role="listbox" aria-label="Choose a year" className="max-h-56 overflow-y-auto">
          {years.map((year) => {
            const disabled = yearOutOfRange(year, min, max) || year < minYear || year > maxYear;
            const selected = year === displayedYear;
            const isCurrent = year === Number(today.slice(0, 4));
            return (
              <button
                key={year}
                type="button"
                role="option"
                aria-selected={selected}
                data-current={selected ? "true" : undefined}
                disabled={disabled}
                onClick={() => chooseYear(year)}
                className={`w-full ${choiceClass(selected, disabled, isCurrent)}`}
              >
                {year}
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "days" ? (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {WEEKDAY_SHORT.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={gridLabel}>
            {Array.from({ length: leading }, (_, index) => (
              <div key={`pad-${safeMonth}-${index}`} />
            ))}
            {days.map((date) => (
              <div key={date} role="gridcell" data-current={date === markedDay ? "true" : undefined}>
                {renderDay(date)}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function DatePicker({
  id,
  value,
  onValueChange,
  min,
  max,
  disabled,
  required,
  autoFocus,
  name,
  placeholder = "Select a date",
  label,
  appearance = "field",
  className = "",
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  name?: string;
  placeholder?: string;
  /** Replaces the formatted date on the trigger, for ranges such as a week. */
  label?: string;
  appearance?: "field" | "heading";
  className?: string;
  "aria-label"?: string;
}) {
  const today = scheduleToday();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [month, setMonth] = useState(() => monthOf(isYmd(value) ? value : today));
  const minDate = ymdBound(min);
  const maxDate = ymdBound(max);
  const shown = label ?? (isYmd(value) ? formatCalendarDate(value) : value);
  const todayOk = !dateOutOfRange(today, minDate, maxDate);

  useEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  function close() {
    setOpen(false);
  }

  function commit(next: string) {
    onValueChange(next);
    setOpen(false);
  }

  function toggle() {
    if (disabled) return;
    setAnchor(buttonRef.current);
    setMonth(monthOf(isYmd(value) ? value : today));
    setOpen((current) => !current);
  }

  const triggerClass =
    appearance === "heading"
      ? `inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-left hover:bg-moss ${className}`
      : `${fieldClass} ${shown ? "" : "text-muted"} ${className}`;

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={triggerClass}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        onClick={toggle}
      >
        <span className="min-w-0 truncate">{shown || placeholder}</span>
        {appearance === "field" ? <CalendarIcon /> : <Chevron up={open} />}
      </button>
      <Popover open={open} anchor={anchor} label={ariaLabel || "Choose a date"} onClose={close}>
        <CalendarPanel
          month={month}
          onMonthChange={setMonth}
          minDate={minDate}
          maxDate={maxDate}
          today={today}
          focusDate={isYmd(value) ? value : undefined}
          autoFocusSelection
          onToday={todayOk ? () => commit(today) : undefined}
          renderDay={(date) => {
            const selected = date === value;
            const blocked = dateOutOfRange(date, minDate, maxDate);
            const isToday = date === today;
            const tone = selected
              ? "bg-pine text-white"
              : blocked
                ? "cursor-not-allowed text-muted/40"
                : "text-ink hover:bg-moss";
            const ring = isToday && !selected ? "ring-1 ring-inset ring-pine" : "";
            return (
              <button
                type="button"
                aria-pressed={selected}
                aria-label={formatWeekdayDate(date)}
                disabled={blocked}
                onClick={() => commit(date)}
                className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition ${tone} ${ring}`}
              >
                {dayOfMonth(date)}
              </button>
            );
          }}
        />
        {appearance === "field" && value && !required ? (
          <div className="mt-2 flex justify-end">
            <button type="button" className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-paper hover:text-ink" onClick={() => commit("")}>
              Clear
            </button>
          </div>
        ) : null}
      </Popover>
    </>
  );
}

/** Month and year shown as the calendar title. Each opens its own picker. */
export function MonthYearButtons({
  month,
  onChange,
  minDate,
  maxDate,
}: {
  month: string;
  onChange: (month: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const today = scheduleToday();
  const safeMonth = isYearMonth(month) ? month : monthOf(today);
  const year = safeMonth.slice(0, 4);
  const monthName = MONTH_LONG[Number(safeMonth.slice(5, 7)) - 1] ?? "";
  const [mode, setMode] = useState<null | "months" | "years">(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState(safeMonth);

  useEffect(() => {
    if (mode) setDraft(safeMonth);
  }, [mode, safeMonth]);

  function toggle(next: "months" | "years", element: HTMLElement) {
    setAnchor(element);
    setMode((current) => (current === next ? null : next));
  }

  function commit(next: string) {
    onChange(next);
    setMode(null);
  }

  const buttonClass = "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 hover:bg-moss";

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        className={buttonClass}
        aria-haspopup="dialog"
        aria-expanded={mode === "months"}
        aria-label={`Choose month, ${monthName}`}
        onClick={(event) => toggle("months", event.currentTarget)}
      >
        {monthName}
        <Chevron up={mode === "months"} />
      </button>
      <button
        type="button"
        className={buttonClass}
        aria-haspopup="dialog"
        aria-expanded={mode === "years"}
        aria-label={`Choose year, ${year}`}
        onClick={(event) => toggle("years", event.currentTarget)}
      >
        {year}
        <Chevron up={mode === "years"} />
      </button>
      <Popover open={mode != null} anchor={anchor} label={mode === "years" ? "Choose a year" : "Choose a month"} onClose={() => setMode(null)}>
        {mode ? (
          <CalendarPanel
            key={mode}
            month={isYearMonth(draft) ? draft : safeMonth}
            onMonthChange={setDraft}
            minDate={minDate}
            maxDate={maxDate}
            today={today}
            initialView={mode}
            autoFocusSelection
            onPickMonth={commit}
            onPickYear={commit}
            renderDay={() => null}
          />
        ) : null}
      </Popover>
    </span>
  );
}
