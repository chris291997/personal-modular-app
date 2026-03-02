import { LottoGame } from '../../../types';

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

export const getNextDrawDate = (game: LottoGame, fromDate = new Date()): Date => {
  const rule = RULES[game];
  const candidate = new Date(fromDate);

  for (let i = 0; i < 14; i += 1) {
    const day = candidate.getDay() === 0 ? 7 : candidate.getDay();
    const isAllowed = rule.daysOfWeek.includes(day);
    const drawDate = new Date(candidate);
    drawDate.setHours(rule.hour, rule.minute, 0, 0);

    if (isAllowed && drawDate.getTime() > fromDate.getTime()) {
      return drawDate;
    }
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(0, 0, 0, 0);
  }

  const fallback = new Date(fromDate);
  fallback.setDate(fallback.getDate() + 1);
  return fallback;
};
