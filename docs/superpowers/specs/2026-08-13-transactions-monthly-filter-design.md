# Transactions Monthly Filter — Design

Date: 2026-08-13
Status: Approved

## Goal

Let users view all their transactions for a specific calendar month on the Transactions page, using the same `<input type="month">` interaction found on the Report page.

## Scope

- Frontend only (`frontend/src/pages/Dashboard/Transactions.tsx`, `frontend/src/i18n.ts`, new test file).
- Backend unchanged — reuses the existing `period=custom` branch in `getExpenses`.
- No new dependencies.

## Current Behavior

`Transactions.tsx` has a filter row with preset pills (`Today`, `Week`, `Month`, `All`) plus a `Custom Range` button that reveals two `<input type="date">` fields. `fetchParams` sends `period` (or `period=custom` with `startDate`/`endDate`) to `fetchExpenses`. The existing `Month` pill means "last 30 days", not a calendar month — this stays as-is.

## Design

### Filter mode

Extend the existing type:

```ts
type FilterMode = 'preset' | 'custom' | 'month'
```

### State

```ts
const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})
```

### Helper (pure, exported for testing)

```ts
function monthToRange(month: string): { start: string; end: string } {
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNum, 0).getDate()
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}
```

Uses the same `new Date(year, month, 0).getDate()` trick as `Report.tsx` (handles Feb/leap years).

### Data flow

In the `fetchParams` memo, add a `'month'` branch:

```ts
if (filterMode === 'month') {
  if (!selectedMonth) {
    return { period: 'all', search: searchDebounced || undefined, limit: 500 }
  }
  const { start, end } = monthToRange(selectedMonth)
  return {
    period: 'custom',
    startDate: start,
    endDate: end,
    search: searchDebounced || undefined,
    limit: 500,
  }
}
```

Guard against an empty `selectedMonth`: some browsers let users clear `<input type="month">` to `""`, which would make `monthToRange` produce `NaN` dates. When empty, fall back to `period: 'all'`.

The backend's `custom` branch already does `match.date = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59.999Z') }`, so server-side totals are accurate for the whole month with no `limit` truncation.

### UI

Add a **Specific Month** button next to the `Custom Range` button (same pill styling, `border` style). Clicking it sets `filterMode('month')`. When `filterMode === 'month'`, render an `<input type="month">` styled like `Report.tsx:907-913`:

```tsx
<input
  type="month"
  value={selectedMonth}
  onChange={(e) => setSelectedMonth(e.target.value)}
  lang={i18n.language}
  className="px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200 w-full sm:w-auto"
/>
```

### i18n

- `en`: `"Specific Month": "Specific Month"`
- `ar`: `"Specific Month": "شهر محدد"`

## Edge Cases

- Empty months fall through to the existing "No transactions found" empty state.
- Search (server-side) and category pills (client-side) still compose with the month filter.
- Switching to a preset pill or `Custom Range` exits month mode.
- If the user clears the month input, the page falls back to `period: 'all'` (no `NaN` dates).
- The `Month` preset pill keeps its existing "last 30 days" meaning; only the new button selects a calendar month.

## Testing

- New `frontend/src/pages/Dashboard/Transactions.test.tsx` (mirrors `Report.test.tsx` structure):
  - Renders the "Specific Month" button.
  - `monthToRange('2026-02')` → `{ start: '2026-02-01', end: '2026-02-28' }`.
  - Leap year: `monthToRange('2028-02')` → `{ end: '2028-02-29' }`.
  - Long month: `monthToRange('2026-01')` → `{ end: '2026-01-31' }`.

## Out of Scope

- Replacing or renaming the existing preset pills.
- Backend changes.
- Filtering on the dashboard or income pages.
