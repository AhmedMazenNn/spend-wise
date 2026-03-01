import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Search,
  Calendar,
} from 'lucide-react'
import { Sidebar } from '../../components/Sidebar'
import { fetchExpenses } from '../../api/expenses'
import type { Expense } from '../../api/expenses'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Shopping: '#ec4899',
  Bills: '#a855f7',
  Health: '#10b981',
  Fun: '#f59e0b',
}

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    Food: 'bg-orange-100',
    Transport: 'bg-blue-100',
    Shopping: 'bg-pink-100',
    Bills: 'bg-purple-100',
    Health: 'bg-emerald-100',
    Fun: 'bg-amber-100',
  }
  return map[category] ?? 'bg-slate-100'
}

const DUMMY_EXPENSES: Expense[] = [
  { id: 'd1', amount: 45.5, title: 'Lunch at Cafe', category: 'Food', date: '', emoji: '🍔', note: 'Team lunch' },
  { id: 'd2', amount: 28, title: 'Uber to office', category: 'Transport', date: '', emoji: '🚗', note: '' },
  { id: 'd3', amount: 120, title: 'Grocery shopping', category: 'Shopping', date: '', emoji: '🛒', note: 'Weekly groceries' },
  { id: 'd4', amount: 89, title: 'Electric bill', category: 'Bills', date: '', emoji: '💡', note: '' },
  { id: 'd5', amount: 55, title: 'Gym membership', category: 'Health', date: '', emoji: '💪', note: 'Monthly' },
  { id: 'd6', amount: 35, title: 'Movie tickets', category: 'Fun', date: '', emoji: '🎬', note: '' },
  { id: 'd7', amount: 15.99, title: 'Coffee & pastry', category: 'Food', date: '', emoji: '☕', note: '' },
  { id: 'd8', amount: 42, title: 'Gas station', category: 'Transport', date: '', emoji: '⛽', note: '' },
]

function getDummyExpensesForPeriod(start: string, end: string): Expense[] {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const days: string[] = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().split('T')[0])
  }
  return DUMMY_EXPENSES.map((e, i) => ({
    ...e,
    id: `dummy-${i}-${e.id}`,
    date: days[Math.min(i, days.length - 1)] || days[0],
  }))
}

type ReportFilterMode = 'month' | 'date' | 'range'

function getStartEndDates(
  filterMode: ReportFilterMode,
  selectedMonth: string,
  selectedDate: string,
  dateRange: { start: string; end: string },
): { start: string; end: string } {
  switch (filterMode) {
    case 'month': {
      const [year, month] = selectedMonth.split('-').map(Number)
      const lastDay = new Date(year, month, 0).getDate()
      return {
        start: `${year}-${String(month).padStart(2, '0')}-01`,
        end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      }
    }
    case 'date':
      return { start: selectedDate, end: selectedDate }
    case 'range':
      return dateRange
    default:
      return { start: '', end: '' }
  }
}

function getPeriodLabel(
  filterMode: ReportFilterMode,
  selectedMonth: string,
  selectedDate: string,
  dateRange: { start: string; end: string },
): string {
  switch (filterMode) {
    case 'month':
      return new Date(selectedMonth + '-01').toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    case 'date':
      return new Date(selectedDate).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    case 'range':
      return `${new Date(dateRange.start).toLocaleDateString()} – ${new Date(dateRange.end).toLocaleDateString()}`
    default:
      return ''
  }
}

export function Report() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const defaultDate = now.toISOString().split('T')[0]
  const firstOfMonth = `${defaultMonth}-01`
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const defaultEnd = `${defaultMonth}-${String(lastOfMonth).padStart(2, '0')}`

  const [filterMode, setFilterMode] = useState<ReportFilterMode>('month')
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [dateRange, setDateRange] = useState({ start: firstOfMonth, end: defaultEnd })
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [exportDropdown, setExportDropdown] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')

  const { start, end } = getStartEndDates(filterMode, selectedMonth, selectedDate, dateRange)

  const loadExpenses = useCallback(async () => {
    if (!start || !end) {
      setLoading(false)
      setExpenses([])
      return
    }

    setLoading(true)
    try {
      const res = await fetchExpenses({
        period: 'custom',
        startDate: start,
        endDate: end,
        limit: 5000,
      })
      setExpenses(res.expenses)
    } catch {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [start, end])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const displayExpenses = useMemo(() => {
    if (expenses.length > 0) return expenses
    if (!start || !end) return []
    return getDummyExpensesForPeriod(start, end)
  }, [expenses, start, end])

  const isDemoData = expenses.length === 0 && !loading

  const filteredTransactions = useMemo(() => {
    let list = displayExpenses
    if (selectedCategory !== 'All') {
      list = list.filter((tx) => tx.category === selectedCategory)
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter(
        (tx) =>
          tx.title.toLowerCase().includes(q) ||
          (tx.note?.toLowerCase().includes(q) ?? false) ||
          tx.category.toLowerCase().includes(q),
      )
    }
    return list
  }, [displayExpenses, selectedCategory, searchTerm])

  const categoryOptions = useMemo(() => {
    const names = new Set(displayExpenses.map((e) => e.category))
    return ['All', ...Array.from(names).sort()]
  }, [displayExpenses])

  const stats = useMemo(() => {
    const totalSpent = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0)
    const count = filteredTransactions.length

    let daysInPeriod = 1
    if (filterMode === 'month') {
      const [year, month] = selectedMonth.split('-')
      daysInPeriod = new Date(parseInt(year), parseInt(month), 0).getDate()
    } else if (filterMode === 'range') {
      const startD = new Date(dateRange.start)
      const endD = new Date(dateRange.end)
      const diffTime = Math.abs(endD.getTime() - startD.getTime())
      daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    }

    const dailyAvg = totalSpent / (count > 0 ? Math.min(count, daysInPeriod) : 1)

    const dailyTotals: Record<string, number> = {}
    filteredTransactions.forEach((tx) => {
      dailyTotals[tx.date] = (dailyTotals[tx.date] || 0) + tx.amount
    })

    let highestDay = { date: '', amount: 0 }
    Object.entries(dailyTotals).forEach(([date, amount]) => {
      if (amount > highestDay.amount) highestDay = { date, amount }
    })

    const categories: Record<string, number> = {}
    filteredTransactions.forEach((tx) => {
      categories[tx.category] = (categories[tx.category] || 0) + tx.amount
    })

    const topCategoryEntry = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]
    const topCategory = topCategoryEntry ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] } : null

    const categoryList = Object.entries(categories)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        color:
          name === 'Food'
            ? 'bg-orange-400'
            : name === 'Transport'
              ? 'bg-blue-500'
              : name === 'Shopping'
                ? 'bg-pink-500'
                : name === 'Bills'
                  ? 'bg-purple-500'
                  : name === 'Health'
                    ? 'bg-emerald-500'
                    : 'bg-slate-400',
      }))
      .sort((a, b) => b.amount - a.amount)

    const dailyMap: Record<string, number> = {}
    filteredTransactions.forEach((tx) => {
      dailyMap[tx.date] = (dailyMap[tx.date] || 0) + tx.amount
    })

    const dailySpending = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const categoryData = categoryList.map((c) => ({
      name: c.name,
      value: c.amount,
      color: CATEGORY_COLORS[c.name] ?? '#94A3B8',
    }))

    return { totalSpent, dailyAvg, highestDay, topCategory, categoryList, dailySpending, categoryData }
  }, [filteredTransactions, filterMode, selectedMonth, dateRange])

  const periodLabel = getPeriodLabel(filterMode, selectedMonth, selectedDate, dateRange)

  const handleExportPDF = async () => {
    setExporting('pdf')
    setExportDropdown(false)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 20

      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('Expense Report', margin, 20)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(periodLabel, margin, 28)
      doc.setTextColor(0, 0, 0)

      doc.setFontSize(10)
      doc.text(
        `Generated on ${new Date().toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        margin,
        35,
      )

      let y = 45

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Summary', margin, y)
      y += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Total Spent: $${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, margin, y)
      y += 6
      doc.text(`Daily Average: $${stats.dailyAvg.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, y)
      y += 6
      doc.text(
        `Highest Day: $${stats.highestDay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}${
          stats.highestDay.date ? ` (${new Date(stats.highestDay.date).toLocaleDateString()})` : ''
        }`,
        margin,
        y,
      )
      y += 6
      doc.text(
        `Top Category: ${stats.topCategory?.name || '-'}${
          stats.topCategory ? ` ($${stats.topCategory.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})` : ''
        }`,
        margin,
        y,
      )
      y += 15

      if (filteredTransactions.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Transactions', margin, y)
        y += 5

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Title', 'Category', 'Amount ($)', 'Note']],
          body: filteredTransactions.map((tx) => [tx.date, tx.title, tx.category, tx.amount.toFixed(2), tx.note || '']),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], textColor: 255 },
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
        })

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
      }

      if (stats.categoryList.length > 0) {
        if (y > 250) {
          doc.addPage()
          y = 20
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text('Category Breakdown', margin, y)
        y += 5

        autoTable(doc, {
          startY: y,
          head: [['Category', 'Amount ($)', 'Percentage']],
          body: stats.categoryList.map((cat) => [cat.name, cat.amount.toFixed(2), `${cat.percentage.toFixed(1)}%`]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], textColor: 255 },
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
        })
      }

      doc.save(`expense-report-${start}-to-${end}.pdf`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF export failed')
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    setExporting('excel')
    setExportDropdown(false)
    try {
      const wb = XLSX.utils.book_new()

      const summaryData = [
        ['Expense Report'],
        ['Period', periodLabel],
        ['Generated', new Date().toLocaleDateString()],
        [],
        ['Summary'],
        ['Total Spent', `$${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['Daily Average', `$${stats.dailyAvg.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
        ['Highest Day', `$${stats.highestDay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['Highest Day Date', stats.highestDay.date || '-'],
        ['Top Category', stats.topCategory?.name || '-'],
        ['Top Category Amount', stats.topCategory ? `$${stats.topCategory.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'],
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary')

      const txData = [
        ['Date', 'Title', 'Category', 'Amount', 'Note'],
        ...filteredTransactions.map((tx) => [tx.date, tx.title, tx.category, tx.amount, tx.note || '']),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txData), 'Transactions')

      if (stats.categoryList.length > 0) {
        const catData = [
          ['Category', 'Amount', 'Percentage'],
          ...stats.categoryList.map((cat) => [cat.name, cat.amount, `${cat.percentage.toFixed(1)}%`]),
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catData), 'Categories')
      }

      XLSX.writeFile(wb, `expense-report-${start}-to-${end}.xlsx`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Excel export failed')
    } finally {
      setExporting(null)
    }
  }

  // ✅ These variants are now used ONLY for the "loaded content" container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/30">
      <Sidebar />

      {/* ✅ responsive left spacing so layout doesn't break */}
      <main className="flex-1 ml-0 md:ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header stays visible always */}
          <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold font-heading text-slate-900 drop-shadow-sm">Expense Report</h1>
                  {isDemoData && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      Demo data
                    </span>
                  )}
                </div>
                <p className="text-slate-600 mt-1 font-medium">Detailed analysis of your spending habits</p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setExportDropdown((v) => !v)}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  {exporting ? (exporting === 'pdf' ? 'Exporting PDF...' : 'Exporting Excel...') : 'Export'}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {exportDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportDropdown(false)} />
                    <div className="absolute right-0 mt-1 py-1 bg-white rounded-xl shadow-lg border border-slate-200 z-20 min-w-[180px]">
                      <button
                        onClick={handleExportPDF}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-red-500" />
                        Export as PDF
                      </button>
                      <button
                        onClick={handleExportExcel}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Export as Excel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-wrap gap-4 items-center">
              <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setFilterMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterMode === 'month' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setFilterMode('date')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterMode === 'date' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Specific Date
                </button>
                <button
                  onClick={() => setFilterMode('range')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterMode === 'range' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date Range
                </button>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              {filterMode === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                />
              )}

              {filterMode === 'date' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                />
              )}

              {filterMode === 'range' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                  />
                </div>
              )}
            </div>
          </motion.header>

          {loading ? (
            <div className="text-center py-16 text-slate-600 font-medium">Loading report...</div>
          ) : (
            // ✅ Key part: loaded content has its own motion container, so it animates correctly on mount
            <motion.div
              key={`${start}-${end}`} // re-run animation when period changes
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-8"
            >
              {/* Summary Stats */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    label: 'Total Spent',
                    value: `$${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    color: 'text-slate-900',
                  },
                  {
                    label: 'Daily Average',
                    value: `$${stats.dailyAvg.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    color: 'text-slate-900',
                  },
                  {
                    label: 'Highest Day',
                    value: `$${stats.highestDay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    sub: stats.highestDay.date
                      ? new Date(stats.highestDay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : '-',
                    color: 'text-red-500',
                  },
                  {
                    label: 'Top Category',
                    value: stats.topCategory?.name || '-',
                    sub: stats.topCategory ? `${Math.round((stats.topCategory.amount / stats.totalSpent) * 100)}%` : '-',
                    color: 'text-emerald-600',
                  },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80">
                    <p className="text-slate-500 text-sm font-medium mb-2">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className={`text-2xl font-bold font-heading ${stat.color}`}>{stat.value}</h3>
                      {stat.sub && <span className="text-sm text-slate-400 font-medium">{stat.sub}</span>}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-200/80"
                >
                  <h3 className="text-lg font-bold font-heading text-slate-900 mb-6">Spending Over Time</h3>
                  <div className="h-[260px] w-full">
                    {stats.dailySpending.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.dailySpending}>
                          <defs>
                            <linearGradient id="reportColorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11 }}
                            tickFormatter={(v) =>
                              new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            }
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94A3B8', fontSize: 11 }}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '12px',
                              border: 'none',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            labelFormatter={(v) =>
                              new Date(v).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                            }
                            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Spent']}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#reportColorAmount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">No spending data for this period</div>
                    )}
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-200/80">
                  <h3 className="text-lg font-bold font-heading text-slate-900 mb-2">By Category</h3>
                  <div className="h-[220px] w-full relative">
                    {stats.categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {stats.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            formatter={(v) => [`$${Number(v).toFixed(2)}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">No categories</div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 max-h-24 overflow-y-auto">
                    {stats.categoryData.slice(0, 5).map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 truncate">{item.name}</span>
                        <span className="text-slate-400 ml-auto">
                          {stats.totalSpent > 0 ? Math.round((item.value / stats.totalSpent) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Category Breakdown Bars */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-200/80">
                <h3 className="text-lg font-bold font-heading text-slate-900 mb-6">Category Breakdown</h3>
                <div className="space-y-6">
                  {stats.categoryList.length > 0 ? (
                    stats.categoryList.map((cat) => (
                      <div key={cat.name}>
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-slate-700">{cat.name}</span>
                          <span className="text-slate-900">
                            ${cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${cat.percentage}%` }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${cat.color}`}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">No expenses found for this period.</div>
                  )}
                </div>
              </motion.div>

              {/* Filters + Transactions List */}
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                  <h3 className="text-lg font-bold font-heading text-slate-900">Transactions</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 sm:flex-initial sm:w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 outline-none transition-colors"
                      />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {categoryOptions.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            selectedCategory === cat
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
                  <div className="divide-y divide-slate-200 max-h-[400px] overflow-y-auto">
                    {filteredTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-emerald-50/50 transition-colors">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${getCategoryBg(tx.category)}`}>
                          {tx.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{tx.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {tx.date}
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{tx.category}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-slate-900">-${tx.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      {displayExpenses.length === 0 ? 'No expenses found for this period.' : 'No transactions match your filters.'}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}