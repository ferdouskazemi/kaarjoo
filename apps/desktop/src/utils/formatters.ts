import { format as formatJalali } from 'date-fns-jalali';
import { format as formatGregorian } from 'date-fns';

/**
 * Format a date string or Date object based on active app language.
 * Uses Jalali (Solar Hijri) calendar for Persian, and Gregorian for English.
 */
export function formatDate(date: string | Date | number, lang: 'fa' | 'en' | string = 'en'): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    if (lang?.startsWith('fa')) {
      return formatJalali(d, 'yyyy/MM/dd');
    }
    return formatGregorian(d, 'MMM d, yyyy');
  } catch {
    return String(date);
  }
}

/**
 * Format a date with time based on active app language.
 */
export function formatDateTime(date: string | Date | number, lang: 'fa' | 'en' | string = 'en'): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    if (lang?.startsWith('fa')) {
      return formatJalali(d, 'yyyy/MM/dd HH:mm');
    }
    return formatGregorian(d, 'MMM d, yyyy HH:mm');
  } catch {
    return String(date);
  }
}

/**
 * Format numbers with localized numeral digits (Persian digits for 'fa', Western for 'en').
 */
export function formatNumber(num: number, lang: 'fa' | 'en' | string = 'en'): string {
  try {
    return new Intl.NumberFormat(lang?.startsWith('fa') ? 'fa-IR' : 'en-US').format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format percentage values with localized numbers.
 */
export function formatPercent(num: number, lang: 'fa' | 'en' | string = 'en'): string {
  try {
    return new Intl.NumberFormat(lang?.startsWith('fa') ? 'fa-IR' : 'en-US').format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format currency amounts in USD or EUR with appropriate currency symbol placement.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  lang: 'fa' | 'en' | string = 'en'
): string {
  try {
    return new Intl.NumberFormat(lang?.startsWith('fa') ? 'fa-IR' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * Format relative time (e.g. "2 hours ago" or "۲ ساعت پیش")
 */
export function formatRelativeTime(
  date: string | Date | number,
  lang: 'fa' | 'en' | string = 'en'
): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat(lang?.startsWith('fa') ? 'fa-IR' : 'en-US', {
      numeric: 'auto',
    });

    if (Math.abs(diffDay) >= 1) {
      return rtf.format(-diffDay, 'day');
    }
    if (Math.abs(diffHour) >= 1) {
      return rtf.format(-diffHour, 'hour');
    }
    if (Math.abs(diffMin) >= 1) {
      return rtf.format(-diffMin, 'minute');
    }
    return rtf.format(-diffSec, 'second');
  } catch {
    return formatDate(date, lang);
  }
}
