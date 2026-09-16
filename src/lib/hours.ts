/**
 * Hours helpers — turn per-day hours + current time into "open now" / "closed" status
 * and a formatted table for display.
 */

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
  lastEntry?: string;
  note?: string;
}

export interface WeekHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
type DayKey = (typeof DAY_KEYS)[number];

const DAY_LABELS: Record<DayKey, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

function parseHHMM(t: string, baseDate: Date): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export interface TodayStatus {
  status: 'open' | 'closed' | 'closing-soon' | 'opens-later';
  label: string;
  closesAt?: string;
  opensAt?: string;
}

export function todayStatus(week: WeekHours, now: Date = new Date()): TodayStatus {
  const dayKey = DAY_KEYS[now.getDay()];
  const today = week[dayKey];

  if (today.closed) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const futureDay = DAY_KEYS[(now.getDay() + i) % 7];
      if (!week[futureDay].closed) {
        const nextOpenLabel = i === 1 ? 'tomorrow' : DAY_LABELS[futureDay];
        return {
          status: 'closed',
          label: `Closed today · Opens ${nextOpenLabel}`,
        };
      }
    }
    return { status: 'closed', label: 'Closed' };
  }

  const openTime = parseHHMM(today.open, now);
  const closeTime = parseHHMM(today.close, now);

  if (now < openTime) {
    return {
      status: 'opens-later',
      label: `Closed · Opens ${formatTime(today.open)}`,
      opensAt: today.open,
    };
  }

  const minutesToClose = (closeTime.getTime() - now.getTime()) / 60000;
  if (minutesToClose <= 0) {
    return {
      status: 'closed',
      label: 'Closed for the day',
    };
  }

  if (minutesToClose <= 60) {
    return {
      status: 'closing-soon',
      label: `Closes in ${Math.round(minutesToClose)} min · ${formatTime(today.close)}`,
      closesAt: today.close,
    };
  }

  return {
    status: 'open',
    label: `Open · Closes ${formatTime(today.close)}`,
    closesAt: today.close,
  };
}

export interface HoursRow {
  day: string;
  hours: string;
  isToday: boolean;
  closed: boolean;
  note?: string;
}

export function formatHoursTable(week: WeekHours, now: Date = new Date()): HoursRow[] {
  const todayIdx = now.getDay();
  return DAY_KEYS.map((dayKey, idx) => {
    const day = week[dayKey];
    let hours: string;
    if (day.closed) {
      hours = 'Closed';
    } else {
      hours = `${formatTime(day.open)} – ${formatTime(day.close)}`;
      if (day.lastEntry) hours += ` · last entry ${formatTime(day.lastEntry)}`;
    }
    return {
      day: DAY_LABELS[dayKey],
      hours,
      isToday: idx === todayIdx,
      closed: day.closed,
      note: day.note,
    };
  });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hour12 = ((h ?? 0) + 11) % 12 + 1;
  const ampm = (h ?? 0) < 12 ? 'am' : 'pm';
  if (m === 0) return `${hour12}${ampm}`;
  return `${hour12}:${String(m).padStart(2, '0')}${ampm}`;
}
