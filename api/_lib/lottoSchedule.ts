type LottoGame =
  | 'ultra_6_58'
  | 'grand_6_55'
  | 'super_6_49'
  | 'mega_6_45'
  | 'lotto_6_42'
  | '6d'
  | '4d'
  | '3d_2pm'
  | '3d_5pm'
  | '3d_9pm'
  | '2d_2pm'
  | '2d_5pm'
  | '2d_9pm';

type ScheduleRule = {
  daysOfWeek: number[];
  hour: number;
  minute: number;
};

const RULES: Record<LottoGame, ScheduleRule> = {
  ultra_6_58: { daysOfWeek: [2, 4, 6], hour: 21, minute: 0 },
  grand_6_55: { daysOfWeek: [1, 3, 6], hour: 21, minute: 0 },
  super_6_49: { daysOfWeek: [2, 4, 7], hour: 21, minute: 0 },
  mega_6_45: { daysOfWeek: [1, 3, 5], hour: 21, minute: 0 },
  lotto_6_42: { daysOfWeek: [2, 4, 6], hour: 21, minute: 0 },
  '6d': { daysOfWeek: [2, 4, 6], hour: 21, minute: 0 },
  '4d': { daysOfWeek: [1, 3, 5], hour: 21, minute: 0 },
  '3d_2pm': { daysOfWeek: [1, 2, 3, 4, 5, 6, 7], hour: 14, minute: 0 },
  '3d_5pm': { daysOfWeek: [1, 2, 3, 4, 5, 6, 7], hour: 17, minute: 0 },
  '3d_9pm': { daysOfWeek: [1, 2, 3, 4, 5, 6, 7], hour: 21, minute: 0 },
  '2d_2pm': { daysOfWeek: [1, 2, 3, 4, 5, 6, 7], hour: 14, minute: 0 },
  '2d_5pm': { daysOfWeek: [1, 2, 3, 4, 5, 6, 7], hour: 17, minute: 0 },
  '2d_9pm': { daysOfWeek: [1, 2, 3, 4, 5, 6, 7], hour: 21, minute: 0 },
};

const buildManilaDate = (parts: Intl.DateTimeFormatPart[]): { year: number; month: number; day: number; hour: number; minute: number } => {
  const getPart = (type: string): number => Number(parts.find(part => part.type === type)?.value || '0');
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
};

const getManilaParts = (date: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const base = buildManilaDate(parts);
  const weekdayText = parts.find(part => part.type === 'weekday')?.value || 'Mon';
  const dayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return {
    ...base,
    weekday: dayMap[weekdayText] || 1,
  };
};

export const getNextDrawDateForGame = (game: LottoGame, fromDate = new Date()): Date => {
  const rule = RULES[game];
  const cursor = new Date(fromDate);

  for (let i = 0; i < 14; i += 1) {
    const manila = getManilaParts(cursor);
    const isAllowedDay = rule.daysOfWeek.includes(manila.weekday);
    const drawAsUtc = new Date(Date.UTC(manila.year, manila.month - 1, manila.day, rule.hour - 8, rule.minute, 0));

    if (isAllowedDay && drawAsUtc.getTime() > fromDate.getTime()) {
      return drawAsUtc;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const fallback = new Date(fromDate);
  fallback.setUTCDate(fallback.getUTCDate() + 1);
  return fallback;
};
