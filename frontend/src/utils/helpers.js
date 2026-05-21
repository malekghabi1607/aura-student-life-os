/**
 * Format a number as currency (DZD)
 */
export function formatCurrency(amount) {
  if (amount == null) return '0.00 DA';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' DA';
}

/**
 * Format a date string as readable French date
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format date for input[type=date] value
 */
export function toInputDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
}

/**
 * Download a blob as file
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Default category colors palette
 */
export const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#14b8a6', '#f97316', '#84cc16', '#a855f7',
];
