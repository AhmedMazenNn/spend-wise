# Transactions Monthly Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users view all transactions for a specific calendar month on the Transactions page via a "Specific Month" button and `<input type="month">`.

**Architecture:** Frontend-only. A new `'month'` filter mode computes `startDate`/`endDate` from the selected `YYYY-MM` via a pure `monthToRange` helper and sends them through the existing `period: 'custom'` API path — no backend changes.

**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS 4, react-i18next, framer-motion, Vitest + Testing Library.

## Global Constraints

- Frontend only: `frontend/src/pages/Dashboard/Transactions.tsx`, `frontend/src/i18n.ts`, `frontend/src/pages/Dashboard/Transactions.test.tsx`.
- Backend untouched. Existing `Month` preset pill keeps its "last 30 days" meaning.
- i18n keys: en `"Specific Month"`, ar `"شهر محدد"`.
- Tests run via Vitest (`npm test` = `vitest run`), globals enabled (`describe`/`it`/`expect`/`vi` available without import, but import explicitly per codebase convention in `Report.test.tsx`).
- KNOWN PRE-EXISTING FAILURES (fail on unmodified `main`, out of scope): `Report.test.tsx` crashes at `lottie-web` module evaluation in jsdom (`Cannot set properties of null (setting 'fillStyle')`); `src/api/auth.test.ts` fails on localStorage assertions. The new `Transactions.test.tsx` must mock `../../components/LottieIcon` and `../../components/LoadingScreen` so the same crash doesn't affect it.
- No new dependencies.

---

### Task 1: `monthToRange` helper with unit tests

**Files:**
- Modify: `frontend/src/pages/Dashboard/Transactions.tsx` (add exported helper after `PERIOD_MAP`, line ~32)
- Test: `frontend/src/pages/Dashboard/Transactions.test.tsx` (create)

**Interfaces:**
- Consumes: nothing
- Produces: `export function monthToRange(month: string): { start: string; end: string }`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/Dashboard/Transactions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { monthToRange } from './Transactions'

vi.mock('../../components/LottieIcon', () => ({
  LottieIcon: () => null,
  LOTTIE_FILTERS: {
    slate: '',
    red: '',
    emerald: '',
    slate600: '',
    slate300: '',
    white: '',
    emerald600: '',
  },
}))

vi.mock('../../components/LoadingScreen', () => ({
  LoadingScreen: () => null,
}))

describe('monthToRange', () => {
  it('returns the full range for a normal month', () => {
    expect(monthToRange('2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    })
  })

  it('handles leap years', () => {
    expect(monthToRange('2028-02')).toEqual({
      start: '2028-02-01',
      end: '2028-02-29',
    })
  })

  it('handles 31-day months', () => {
    expect(monthToRange('2026-01')).toEqual({
      start: '2026-01-01',
      end: '2026-01-31',
    })
  })
})
```

Note: the two `vi.mock` calls are REQUIRED. `Transactions.tsx` transitively imports `lottie-web` (via `LoadingScreen` and `LottieIcon`/`Sidebar`), which throws `Cannot set properties of null (setting 'fillStyle')` at module evaluation time in jsdom — this is why `Report.test.tsx` currently fails. Mocking these two modules prevents `lottie-web` from ever being loaded.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/Dashboard/Transactions.test.tsx`
Expected: FAIL — `monthToRange` is not exported from `./Transactions`.

- [ ] **Step 3: Write minimal implementation**

In `Transactions.tsx`, immediately after the `PERIOD_MAP` object (after line 32), add:

```ts
export function monthToRange(month: string): { start: string; end: string } {
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNum, 0).getDate()
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/Dashboard/Transactions.test.tsx`
Expected: PASS — all 3 assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Dashboard/Transactions.tsx frontend/src/pages/Dashboard/Transactions.test.tsx
git commit -m "feat(transactions): add monthToRange helper"
```

---

### Task 2: Monthly filter mode, UI, and i18n

**Files:**
- Modify: `frontend/src/pages/Dashboard/Transactions.tsx` (type, state, fetchParams, UI)
- Modify: `frontend/src/i18n.ts` (en + ar keys)
- Test: `frontend/src/pages/Dashboard/Transactions.test.tsx` (add component tests)

**Interfaces:**
- Consumes: `monthToRange(month: string): { start: string; end: string }` from Task 1.
- Produces: `FilterMode = 'preset' | 'custom' | 'month'`, `selectedMonth: string` state, `fetchExpenses` called with `{ period: 'custom', startDate, endDate, search?, limit: 500 }` when month mode active.

- [ ] **Step 1: Write the failing component test**

Replace the entire contents of `frontend/src/pages/Dashboard/Transactions.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '../../context/AuthContext'
import { ThemeProvider } from '../../context/ThemeContext'
import '../../i18n'
import { monthToRange, TransactionsPage } from './Transactions'

vi.mock('../../components/LottieIcon', () => ({
  LottieIcon: () => null,
  LOTTIE_FILTERS: {
    slate: '',
    red: '',
    emerald: '',
    slate600: '',
    slate300: '',
    white: '',
    emerald600: '',
  },
}))

vi.mock('../../components/LoadingScreen', () => ({
  LoadingScreen: () => null,
}))

const { fetchExpensesMock } = vi.hoisted(() => ({
  fetchExpensesMock: vi.fn(),
}))

vi.mock('../../api/expenses', () => ({
  fetchExpenses: fetchExpensesMock,
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

vi.mock('../../api/categories', () => ({
  fetchCategories: vi.fn().mockResolvedValue({ categories: [] }),
}))

function renderTransactions() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <TransactionsPage />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('monthToRange', () => {
  it('returns the full range for a normal month', () => {
    expect(monthToRange('2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    })
  })

  it('handles leap years', () => {
    expect(monthToRange('2028-02')).toEqual({
      start: '2028-02-01',
      end: '2028-02-29',
    })
  })

  it('handles 31-day months', () => {
    expect(monthToRange('2026-01')).toEqual({
      start: '2026-01-01',
      end: '2026-01-31',
    })
  })
})

describe('TransactionsPage monthly filter', () => {
  beforeEach(() => {
    fetchExpensesMock.mockResolvedValue({ expenses: [], total: 0 })
  })

  it('renders the Specific Month button', () => {
    renderTransactions()
    expect(screen.getByText('Specific Month')).toBeInTheDocument()
  })

  it('reveals a month input when clicked', () => {
    renderTransactions()
    fireEvent.click(screen.getByText('Specific Month'))
    expect(document.querySelector('input[type="month"]')).toBeInTheDocument()
  })

  it('fetches the selected month as a custom date range', async () => {
    renderTransactions()
    fireEvent.click(screen.getByText('Specific Month'))
    const input = document.querySelector('input[type="month"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2026-02' } })
    await waitFor(() => {
      expect(fetchExpensesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          period: 'custom',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        }),
      )
    })
  })
})
```

The `vi.mock('../../components/LottieIcon', ...)` and `vi.mock('../../components/LoadingScreen', ...)` calls are REQUIRED — without them, importing `TransactionsPage` loads `lottie-web`, which throws `Cannot set properties of null (setting 'fillStyle')` at module evaluation in jsdom (the same pre-existing failure that breaks `Report.test.tsx`).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/Dashboard/Transactions.test.tsx`
Expected: FAIL — the `TransactionsPage monthly filter` describe block fails (`Specific Month` button not found; `filterMode === 'month'` does not exist yet). The 3 `monthToRange` tests still pass.

- [ ] **Step 3: Implement filter mode + UI in Transactions.tsx**

**3a.** Change the type on line 25:

```ts
type FilterMode = 'preset' | 'custom' | 'month'
```

**3b.** Add `selectedMonth` state after `customRange` state (after line 51):

```ts
const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})
```

**3c.** Update the `fetchParams` memo (lines 62-77) to add a `'month'` branch:

```ts
  const fetchParams = useMemo(() => {
    if (filterMode === 'custom') {
      return {
        period: 'custom' as const,
        startDate: customRange.start,
        endDate: customRange.end,
        search: searchDebounced || undefined,
        limit: 500,
      }
    }
    if (filterMode === 'month') {
      if (!selectedMonth) {
        return {
          period: 'all' as const,
          search: searchDebounced || undefined,
          limit: 500,
        }
      }
      const { start, end } = monthToRange(selectedMonth)
      return {
        period: 'custom' as const,
        startDate: start,
        endDate: end,
        search: searchDebounced || undefined,
        limit: 500,
      }
    }
    return {
      period: PERIOD_MAP[selectedPeriod],
      search: searchDebounced || undefined,
      limit: 500,
    }
  }, [filterMode, selectedPeriod, customRange, selectedMonth, searchDebounced])
```

**3d.** Add the **Specific Month** button and month input in the filter row. After the `Custom Range` button's closing `</button>` (after line 214), insert:

```tsx
                <button
                  onClick={() => setFilterMode('month')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    filterMode === 'month'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('Specific Month')}
                </button>

                {filterMode === 'month' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <input
                      type="month"
                      value={selectedMonth}
                      lang={i18n.language}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200 w-full sm:w-auto"
                    />
                  </motion.div>
                )}
```

- [ ] **Step 4: Add i18n keys in i18n.ts**

In the `en` translation block, after `"Custom Range": "Custom Range",` (line 26) add:

```json
"Specific Month": "Specific Month",
```

In the `ar` translation block, after `"Custom Range": "نطاق مخصص",` (line 294) add:

```json
"Specific Month": "شهر محدد",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/Dashboard/Transactions.test.tsx`
Expected: PASS — all 6 assertions (3 monthToRange + 3 component) green.

- [ ] **Step 6: Run lint and typecheck**

Run: `cd frontend && npm run lint`
Expected: no errors.

Run: `cd frontend && npx tsc -b`
Expected: no errors (typecheck only, no dist output).

- [ ] **Step 7: Run the full test suite**

Run: `cd frontend && npm test`
Expected: `Transactions.test.tsx` PASS. Two PRE-EXISTING failures will remain — `Report.test.tsx` (lottie-web crash) and `src/api/auth.test.ts` (localStorage) — both fail on the unmodified `main` branch before this feature. Do NOT fix them here; they are out of scope. If `Transactions.test.tsx` passes while exactly those two fail, the change is correct.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Dashboard/Transactions.tsx frontend/src/i18n.ts frontend/src/pages/Dashboard/Transactions.test.tsx
git commit -m "feat(transactions): add monthly filter with month picker"
```
