import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { DefaultDateInterval } from './types';

dayjs.extend(customParseFormat);

const datesGenerator: Record<DefaultDateInterval, Dayjs[]> = {
  today: [dayjs(new Date())],
  yesterday: [dayjs().subtract(1, 'day')],
  this_week: [dayjs().startOf('week'), dayjs().endOf('week')],
  last_week: [
    dayjs().subtract(1, 'week').startOf('week'),
    dayjs().subtract(1, 'week').endOf('week'),
  ],
  this_month: [dayjs().startOf('month'), dayjs().endOf('month')],

  last_month: [
    dayjs().subtract(1, 'month').startOf('month'),
    dayjs().subtract(1, 'month').endOf('month'),
  ],
  this_year: [dayjs().startOf('year'), dayjs().endOf('year')],
  last_year: [
    dayjs().subtract(1, 'year').startOf('year'),
    dayjs().subtract(1, 'year').endOf('year'),
  ],
};

export const datesFor = (interval: DefaultDateInterval | string[]) => {
  if (Array.isArray(interval)) {
    return interval.map((dateString) => dayjs(dateString).format('YYYY-MM-DD'));
  }
  return datesGenerator[interval].map((date) => date.format('YYYY-MM-DD'));
};

export const isValidDateString = (param: string) => dayjs(param, 'YYYYMMDD', true).isValid();
