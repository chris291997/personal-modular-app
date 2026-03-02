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

export type ScrapedDraw = {
  game: LottoGame;
  drawDate: Date;
  combination: number[];
  jackpot: number | null;
  winners: number | null;
};

const sanitizeHtml = (value: string): string =>
  value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const parseMoney = (value: string): number | null => {
  const numeric = value.replace(/[^0-9.]/g, '');
  if (!numeric) return null;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseWinners = (value: string): number | null => {
  const numeric = value.replace(/[^0-9]/g, '');
  if (!numeric) return null;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: string): Date | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toGame = (name: string): LottoGame | null => {
  const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalized.includes('ultra lotto 6/58')) return 'ultra_6_58';
  if (normalized.includes('grand lotto 6/55')) return 'grand_6_55';
  if (normalized.includes('superlotto 6/49') || normalized.includes('super lotto 6/49')) return 'super_6_49';
  if (normalized.includes('megalotto 6/45') || normalized.includes('mega lotto 6/45')) return 'mega_6_45';
  if (normalized.includes('lotto 6/42')) return 'lotto_6_42';
  if (normalized.includes('6d lotto')) return '6d';
  if (normalized.includes('4d lotto')) return '4d';
  if (normalized.includes('3d lotto 2pm')) return '3d_2pm';
  if (normalized.includes('3d lotto 5pm')) return '3d_5pm';
  if (normalized.includes('3d lotto 9pm')) return '3d_9pm';
  if (normalized.includes('2d lotto 2pm')) return '2d_2pm';
  if (normalized.includes('2d lotto 5pm')) return '2d_5pm';
  if (normalized.includes('2d lotto 9pm')) return '2d_9pm';
  return null;
};

const parseCombination = (raw: string): number[] =>
  raw
    .split(/[-\s]+/)
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item));

export const scrapeLatestPcsoResults = async (): Promise<ScrapedDraw[]> => {
  const response = await fetch('https://www.pcso.gov.ph/SearchLottoResult.aspx?user_id=root');
  if (!response.ok) {
    throw new Error(`Failed to fetch PCSO page: HTTP ${response.status}`);
  }

  const html = await response.text();
  const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const draws: ScrapedDraw[] = [];

  rowMatches.forEach(row => {
    const columns = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (!columns || columns.length < 5) return;

    const gameName = sanitizeHtml(columns[0]);
    const combinationRaw = sanitizeHtml(columns[1]);
    const drawDateRaw = sanitizeHtml(columns[2]);
    const jackpotRaw = sanitizeHtml(columns[3]);
    const winnersRaw = sanitizeHtml(columns[4]);

    const game = toGame(gameName);
    const drawDate = parseDate(drawDateRaw);
    if (!game || !drawDate) return;

    const combination = parseCombination(combinationRaw);
    if (!combination.length) return;

    draws.push({
      game,
      drawDate,
      combination,
      jackpot: parseMoney(jackpotRaw),
      winners: parseWinners(winnersRaw),
    });
  });

  return draws;
};
