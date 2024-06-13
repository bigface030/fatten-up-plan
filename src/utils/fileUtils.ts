import { readFileSync } from 'fs';
import { TagConfig } from '../types';
import { DefaultDateInterval } from '../services/types';

export const dictionary: Record<string, string> = JSON.parse(
  readFileSync('static/dictionary.json', 'utf-8'),
);

export const tags: Record<string, TagConfig> = JSON.parse(
  readFileSync('static/tags.json', 'utf-8'),
);

export const intervals: Record<string, DefaultDateInterval> = JSON.parse(
  readFileSync('static/intervals.json', 'utf-8'),
);

export const localization: Record<string, string> = JSON.parse(
  readFileSync('static/localization.json', 'utf-8'),
);

export const help = readFileSync('static/help.txt', 'utf-8');
