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
import { useTranslation } from 'react-i18next'
import { LoadingScreen } from '../../components/LoadingScreen'
import { fetchExpenses } from '../../api/expenses'
import type { Expense } from '../../api/expenses'
import { fetchCategories } from '../../api/categories'
import type { Category } from '../../api/categories'
import { fetchIncomes } from '../../api/incomes'
import type { Income } from '../../api/incomes'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import arabicReshaper from 'arabic-reshaper'
import { arabicFontBase64 } from '../../assets/fonts/arabic-font'
import { fetchCategoryBudgets, fetchActiveBudget, type CategoryBudget, type Budget } from '../../api/budgets'
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
  locale: string,
  t: (key: string) => string
): string {
  switch (filterMode) {
    case 'month':
      return new Date(selectedMonth + '-01').toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      })
    case 'date':
      return new Date(selectedDate).toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    case 'range':
      return `${new Date(dateRange.start).toLocaleDateString(locale)} ${t('to')} ${new Date(dateRange.end).toLocaleDateString(locale)}`
    default:
      return ''
  }
}

function getFriendlyFilename(
  filterMode: ReportFilterMode,
  selectedMonth: string,
  selectedDate: string,
  dateRange: { start: string; end: string },
  t: (key: string) => string,
  ext: 'pdf' | 'xlsx'
): string {
  const locale = 'en-US'
  let label = ''
  
  if (filterMode === 'month') {
    label = new Date(selectedMonth + '-01').toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    })
  } else if (filterMode === 'date') {
    label = new Date(selectedDate).toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
  } else if (filterMode === 'range') {
    label = `${new Date(dateRange.start).toLocaleDateString(locale)}_${t('to')}_${new Date(dateRange.end).toLocaleDateString(locale)}`
  }
  
  const baseName = t('Expense Report')
  return `${baseName}_${label}.${ext}`.replace(/[/\\?%*:|"<>]/g, '-')
}

const isArabicText = (value: string) => /[\u0600-\u06FF]/.test(value)

const fixArabic = (value: unknown) => {
  if (value === null || value === undefined) return ''
  const str = String(value)

  if (!isArabicText(str)) return str

  try {
    const reshaped = arabicReshaper.reshape(str)
    return reshaped
  } catch {
    return str
  }
}


export function Report() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const isArabic = i18n.language === 'ar'

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
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [exportDropdown, setExportDropdown] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [allBudgets, setAllBudgets] = useState<CategoryBudget[]>([])
  const [overallBudget, setOverallBudget] = useState<Budget | null>(null)

  const { start, end } = getStartEndDates(filterMode, selectedMonth, selectedDate, dateRange)

  const loadData = useCallback(async () => {
    if (!start || !end) {
      setLoading(false)
      setExpenses([])
      setIncomes([])
      return
    }

    setLoading(true)
    try {
      const [expRes, incRes] = await Promise.all([
        fetchExpenses({
          period: 'custom',
          startDate: start,
          endDate: end,
          limit: 5000,
        }),
        fetchIncomes({
          period: 'custom',
          startDate: start,
          endDate: end,
          limit: 5000,
        })
      ])
      setExpenses(expRes.expenses ?? [])
      setIncomes(incRes.incomes ?? [])
    } catch {
      setExpenses([])
      setIncomes([])
    } finally {
      setLoading(false)
    }
  }, [start, end])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    fetchCategories('expense')
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]))

    fetchCategoryBudgets().then(r => setAllBudgets(r.budgets)).catch(() => {})
    fetchActiveBudget().then(r => setOverallBudget(r.budget)).catch(() => {})
  }, [])

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((c) => {
      if (c.color) map[c.name] = c.color
    })
    return map
  }, [categories])

  // ✅ no demo fallback — only real data
  const displayExpenses = expenses

  const filteredExpenses = useMemo(() => {
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

  const filteredIncomes = useMemo(() => {
    let list = incomes

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
  }, [incomes, searchTerm])

  const categoryOptions = useMemo(() => {
    const names = new Set(displayExpenses.map((e) => e.category))
    return ['All', ...Array.from(names).sort()]
  }, [displayExpenses])

  const stats = useMemo(() => {
    const totalSpent = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    
    // Status-based income totaling
    const receivedIncome = filteredIncomes
      .filter(inc => inc.status === 'received')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    
    const pendingIncome = filteredIncomes
      .filter(inc => inc.status === 'pending')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    
    const expectedIncome = filteredIncomes
      .filter(inc => inc.status === 'expected')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    
    const totalIncome = receivedIncome
    const netBalance = totalIncome - totalSpent
    const count = filteredExpenses.length

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
    filteredExpenses.forEach((tx) => {
      dailyTotals[tx.date] = (dailyTotals[tx.date] || 0) + Number(tx.amount || 0)
    })

    let highestDay = { date: '', amount: 0 }
    Object.entries(dailyTotals).forEach(([date, amount]) => {
      if (amount > highestDay.amount) highestDay = { date, amount }
    })

    const categoryTotals: Record<string, number> = {}
    filteredExpenses.forEach((tx) => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Number(tx.amount || 0)
    })

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    const topCategory = topCategoryEntry ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] } : null

    const categoryList = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        color: categoryColorMap[name] || '#94A3B8',
      }))
      .sort((a, b) => b.amount - a.amount)

    const categoryData = categoryList.map((c) => ({
      name: c.name,
      value: c.amount,
      color: c.color,
    }))

    const dailyMap: Record<string, number> = {}
    filteredExpenses.forEach((tx) => {
      dailyMap[tx.date] = (dailyMap[tx.date] || 0) + Number(tx.amount || 0)
    })

    const dailySpending = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const budgetPerformance = allBudgets
      .filter(b => {
        const catExists = categories.some(c => c.id === b.categoryId)
        if (!catExists) return false
        
        // Only show budgets that overlap with the report period [start, end]
        const budgetStart = new Date(b.startDate).toISOString().split('T')[0]
        const budgetEnd = new Date(b.endDate).toISOString().split('T')[0]
        return budgetStart <= end && budgetEnd >= start
      })
      .map(b => {
        const cat = categories.find(c => c.id === b.categoryId)!
        const catName = cat.name
        
        // Calculate spent strictly within this budget's timeframe
        const budgetStart = new Date(b.startDate).toISOString().split('T')[0]
        const budgetEnd = new Date(b.endDate).toISOString().split('T')[0]
        
        const spent = displayExpenses
          .filter(e => e.category === catName && e.date >= budgetStart && e.date <= budgetEnd)
          .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

        const remaining = b.amount > 0 ? b.amount - spent : 0
        const isExpired = new Date(b.endDate) < now
        let status: 'Normal' | 'Warning' | 'Over' | 'Inactive' = 'Normal'
        
        if (isExpired) {
          status = 'Inactive'
        } else if (b.amount > 0) {
          const threshold = b.warningThreshold || 70
          if (spent > b.amount) status = 'Over'
          else if (spent >= b.amount * (threshold / 100)) status = 'Warning'
        }

        return { 
          name: catName, 
          limit: b.amount, 
          amount: spent, 
          remaining, 
          status,
          startDate: b.startDate,
          endDate: b.endDate,
          warningThreshold: b.warningThreshold || 70,
          isExpired
        }
      })

    const overallBudgetLimit = overallBudget?.amount || 0
    let overallBudgetSpent = 0
    let overallBudgetRemaining = 0
    let overallIsExpired = false
    let overallThreshold = 70
    let overallStatus: 'Normal' | 'Warning' | 'Over' | 'Inactive' = 'Normal'

    if (overallBudget) {
      const bStart = new Date(overallBudget.startDate).toISOString().split('T')[0]
      const bEnd = new Date(overallBudget.endDate).toISOString().split('T')[0]
      
      // Check if overall budget overlaps with report period
      const overlaps = bStart <= end && bEnd >= start
      
      if (overlaps) {
        overallBudgetSpent = displayExpenses
          .filter(e => e.date >= bStart && e.date <= bEnd)
          .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
        
        overallBudgetRemaining = overallBudgetLimit > 0 ? overallBudgetLimit - overallBudgetSpent : 0
        overallIsExpired = new Date(overallBudget.endDate) < now
        overallThreshold = overallBudget.warningThreshold || 70
        
        if (overallIsExpired) {
          overallStatus = 'Inactive'
        } else if (overallBudgetLimit > 0) {
          if (overallBudgetSpent > overallBudgetLimit) overallStatus = 'Over'
          else if (overallBudgetSpent >= overallBudgetLimit * (overallThreshold / 100)) overallStatus = 'Warning'
        }
      }
    }

    return { 
      totalSpent, 
      totalIncome,
      receivedIncome,
      pendingIncome,
      expectedIncome,
      netBalance,
      dailyAvg, 
      highestDay, 
      topCategory, 
      categoryList, 
      dailySpending, 
      categoryData,
      budgetPerformance,
      overallBudgetLimit,
      overallBudgetRemaining,
      overallBudgetSpent,
      overallBudgetStart: overallBudget?.startDate,
      overallBudgetEnd: overallBudget?.endDate,
      overallStatus,
      overallThreshold,
      overallIsExpired
    }
  }, [displayExpenses, filteredExpenses, filteredIncomes, filterMode, selectedMonth, dateRange, allBudgets, categories, overallBudget, now, categoryColorMap, end, start])


  const handleExportPDF = async () => {
    setExporting('pdf')
    setExportDropdown(false)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 20
      
      const tEn = i18n.getFixedT('en')
      const enLocale = 'en-US'

      doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64)
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'Identity-H')
      doc.setFont('Amiri', 'normal')

      const localizedPeriodLabel = getPeriodLabel(filterMode, selectedMonth, selectedDate, dateRange, enLocale, tEn)

      // Header
      doc.setFontSize(22)
      doc.setTextColor(15, 23, 42)
      doc.text(fixArabic(tEn('Financial Report')), margin, 20)

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text(fixArabic(`${tEn('Period')}: ${localizedPeriodLabel}`), margin, 28)
      doc.text(fixArabic(`${tEn('Generated on')}: ${new Date().toLocaleDateString(enLocale)}`), margin, 34)

      // Financial Summary Rect
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, 45, 170, 30, 3, 3, 'F')
      
      const statsX = [margin + 10, margin + 65, margin + 120]
      const labels = [tEn('Total Income'), tEn('Total Spent'), tEn('Net Balance')]
      const values = [
        `$${Number(stats.totalIncome).toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
        `$${Number(stats.totalSpent).toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
        `${stats.netBalance < 0 ? '-' : ''}$${Math.abs(stats.netBalance).toLocaleString(enLocale, { minimumFractionDigits: 2 })}`
      ]

      doc.setFontSize(9)
      labels.forEach((label, i) => {
        doc.setTextColor(100, 116, 139)
        doc.text(fixArabic(label), statsX[i], 55)
        doc.setTextColor(15, 23, 42)
        doc.setFontSize(11)
        doc.text(fixArabic(values[i]), statsX[i], 63)
      })

      // Pending/Expected Note
      if (stats.pendingIncome > 0 || stats.expectedIncome > 0) {
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        const note: string[] = []
        if (stats.pendingIncome > 0) note.push(`$${Number(stats.pendingIncome).toLocaleString(enLocale)} ${tEn('pending')}`)
        if (stats.expectedIncome > 0) note.push(`$${Number(stats.expectedIncome).toLocaleString(enLocale)} ${tEn('expected')}`)
        doc.text(fixArabic(note.join('  •  ')), margin + 10, 71)
      }

      // --- OVERALL BUDGET SECTION ---
      let currentY = 85
      if (stats.overallBudgetLimit > 0) {
        doc.setFillColor(241, 245, 249)
        doc.roundedRect(margin, 80, 170, 28, 3, 3, 'F')
        
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        doc.text(fixArabic(tEn('Overall Budget Performance')), margin + 8, 88)
        
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        const bStart = stats.overallBudgetStart ? new Date(stats.overallBudgetStart).toLocaleDateString(enLocale) : '-'
        const bEnd = stats.overallBudgetEnd ? new Date(stats.overallBudgetEnd).toLocaleDateString(enLocale) : '-'
        doc.text(fixArabic(`${tEn('Period')}: ${bStart} - ${bEnd}`), margin + 8, 93)

        const budgetStatsX = [margin + 8, margin + 48, margin + 88, margin + 128]
        const budgetLabels = [tEn('Limit'), tEn('Spent'), tEn('Remaining'), tEn('Status')]
        const budgetValues = [
          `$${stats.overallBudgetLimit.toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
          `$${stats.overallBudgetSpent.toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
          `$${stats.overallBudgetRemaining.toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
          tEn(stats.overallStatus)
        ]

        budgetLabels.forEach((label, i) => {
          doc.setFontSize(7)
          doc.setTextColor(100, 116, 139)
          doc.text(fixArabic(label), budgetStatsX[i], 100)
          doc.setFontSize(9)
          if (i === 3) {
            const statusColor = stats.overallStatus === 'Over' ? [239, 68, 68] : stats.overallStatus === 'Warning' ? [245, 158, 11] : [16, 185, 129]
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
          } else {
            doc.setTextColor(15, 23, 42)
          }
          doc.text(fixArabic(budgetValues[i]), budgetStatsX[i], 105)
        })
        currentY = 118
      }

      // --- INCOMES TABLE (if any) ---
      if (filteredIncomes.length > 0) {
        if (currentY > 240) {
          doc.addPage()
          currentY = 20
        }
        doc.setFontSize(14)
        doc.setTextColor(15, 23, 42)
        doc.text(fixArabic(tEn('Incomes')), margin, currentY)

        autoTable(doc, {
          startY: currentY + 5,
          head: [[tEn('Date'), tEn('Title'), tEn('Category'), tEn('Amount'), tEn('Status')].map(fixArabic)],
          body: filteredIncomes.map((inc: Income) => [
            new Date(inc.date).toLocaleDateString(enLocale),
            fixArabic(inc.title),
            fixArabic(tEn(inc.category)),
            `+$${inc.amount.toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
            fixArabic(tEn(inc.status)),
          ]),
          headStyles: { fillColor: [16, 185, 129], font: 'Amiri' },
          bodyStyles: { font: 'Amiri' },
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
        })
        const finalY = (doc as any).lastAutoTable?.finalY;
        currentY = finalY ? finalY + 15 : currentY + 40;
      }

      // --- EXPENSES TABLE ---
      if (currentY > 240) {
        doc.addPage()
        currentY = 20
      }
      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text(fixArabic(tEn('Expenses')), margin, currentY)

      autoTable(doc, {
        startY: currentY + 5,
        head: [[tEn('Date'), tEn('Title'), tEn('Category'), tEn('Amount'), tEn('Note')].map(fixArabic)],
        body: filteredExpenses.map((tx: Expense) => [
          new Date(tx.date).toLocaleDateString(enLocale),
          fixArabic(tx.title),
          fixArabic(tEn(tx.category)),
          `$${Number(tx.amount || 0).toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
          fixArabic(tx.note || ''),
        ]),
        headStyles: { fillColor: [15, 23, 42], textColor: 255, font: 'Amiri' },
        bodyStyles: { font: 'Amiri' },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      })

      // --- CATEGORY BREAKDOWN TABLE & PIE CHART ---
      const finalY = (doc as any).lastAutoTable?.finalY;
      currentY = finalY ? finalY + 15 : currentY + 60;
      if (currentY > 210) {
        doc.addPage()
        currentY = 20
      }
      
      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text(fixArabic(tEn('Category Breakdown & Budgets')), margin, currentY)

      // Draw Pie Chart
      const pieRadius = 25;
      const pieCenterX = margin + 30;
      const pieCenterY = currentY + 10 + pieRadius;
      
      let startAngle = -Math.PI / 2;
      stats.categoryList.forEach((item) => {
        if (item.percentage === 0) return;
        
        doc.setFillColor(item.color || '#94A3B8');
        const sliceAngle = (item.percentage / 100) * (2 * Math.PI);
        const endAngle = startAngle + sliceAngle;
        
        const steps = Math.max(10, Math.floor((sliceAngle / (2 * Math.PI)) * 100));
        let currentAngle = startAngle;
        const stepSize = sliceAngle / steps;
        
        for (let i = 0; i < steps; i++) {
          const nextAngle = currentAngle + stepSize;
          const x2 = pieCenterX + Math.cos(currentAngle) * pieRadius;
          const y2 = pieCenterY + Math.sin(currentAngle) * pieRadius;
          const x3 = pieCenterX + Math.cos(nextAngle) * pieRadius;
          const y3 = pieCenterY + Math.sin(nextAngle) * pieRadius;
          doc.triangle(pieCenterX, pieCenterY, x2, y2, x3, y3, 'F');
          currentAngle = nextAngle;
        }
        startAngle = endAngle;
      });

      // Draw Legend to the right of the Pie Chart
      let legendX = pieCenterX + pieRadius + 15;
      let legendY = currentY + 15;
      doc.setFontSize(9);
      stats.categoryList.slice(0, 10).forEach((item) => {
        if (legendY > currentY + 10 + pieRadius * 2) {
            legendX += 45;
            legendY = currentY + 15;
        }
        doc.setFillColor(item.color || '#94A3B8');
        doc.rect(legendX, legendY - 3, 4, 4, 'F');
        doc.setTextColor(15, 23, 42);
        const text = `${fixArabic(tEn(item.name))} (${item.percentage.toFixed(1)}%)`;
        doc.text(text, legendX + 6, legendY);
        legendY += 6;
      });

      currentY = pieCenterY + pieRadius + 15;

      autoTable(doc, {
        startY: currentY,
        head: [[
          tEn('Category'), 
          tEn('Percentage'), 
          tEn('Total Paid'), 
          tEn('Budget Limit'), 
          tEn('Spent in Budget'), 
          tEn('Budget Status'), 
          tEn('Start Date'), 
          tEn('End Date')
        ].map(fixArabic)],
        body: [
          ...stats.categoryList.map((c) => {
            const bdg = stats.budgetPerformance.find((b) => b.name === c.name);
            return [
              { content: fixArabic(tEn(c.name)), styles: { textColor: c.color || '#333333', fontStyle: 'bold' as const } },
              `${c.percentage.toFixed(1)}%`,
              `$${c.amount.toLocaleString(enLocale, { minimumFractionDigits: 2 })}`,
              bdg && bdg.limit > 0 ? `$${bdg.limit.toLocaleString(enLocale, { minimumFractionDigits: 2 })}` : '-',
              bdg ? `$${bdg.amount.toLocaleString(enLocale, { minimumFractionDigits: 2 })}` : '-',
              bdg ? ({
                content: fixArabic(tEn(bdg.status)),
                styles: { 
                  textColor: bdg.status === 'Over' ? '#EF4444' : bdg.status === 'Warning' ? '#F59E0B' : '#10B981',
                  fontStyle: 'bold' as const
                }
              }) : '-',
              bdg ? new Date(bdg.startDate).toLocaleDateString(enLocale) : '-',
              bdg ? new Date(bdg.endDate).toLocaleDateString(enLocale) : '-',
            ];
          }),
          // Add Overall Budget row at the end
          [
            { content: fixArabic(tEn('Overall Budget')), styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' as const } },
            { content: '-', styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: `$${stats.totalSpent.toLocaleString(enLocale, { minimumFractionDigits: 2 })}`, styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' as const } },
            { content: stats.overallBudgetLimit > 0 ? `$${stats.overallBudgetLimit.toLocaleString(enLocale, { minimumFractionDigits: 2 })}` : '-', styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: stats.overallBudgetLimit > 0 ? `$${stats.overallBudgetSpent.toLocaleString(enLocale, { minimumFractionDigits: 2 })}` : '-', styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            stats.overallBudgetLimit > 0 ? ({
              content: fixArabic(tEn(stats.overallStatus)),
              styles: { 
                textColor: stats.overallStatus === 'Over' ? '#EF4444' : stats.overallStatus === 'Warning' ? '#F59E0B' : '#10B981',
                fontStyle: 'bold' as const,
                fillColor: [241, 245, 249]
              }
            }) : { content: '-', styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: stats.overallBudgetStart ? new Date(stats.overallBudgetStart).toLocaleDateString(enLocale) : '-', styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: stats.overallBudgetEnd ? new Date(stats.overallBudgetEnd).toLocaleDateString(enLocale) : '-', styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
          ]
        ],
        headStyles: { fillColor: [59, 130, 246], textColor: 255, font: 'Amiri' },
        bodyStyles: { font: 'Amiri' },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
      })

      const fileName = getFriendlyFilename(filterMode, selectedMonth, selectedDate, dateRange, tEn, 'pdf')
      doc.save(fileName)
    } catch (err) {
      console.error('PDF Export failed:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = () => {
    setExporting('excel')
    setExportDropdown(false)
    try {
      const enLocale = 'en-US'
      const tEn = i18n.getFixedT('en')

      // Use English-only period label
      const localizedPeriodLabel = getPeriodLabel(filterMode, selectedMonth, selectedDate, dateRange, enLocale, tEn)

      // 1. Overview data
      const overviewHeader = [tEn('Report Overview'), '']
      const overviewData = [
        [tEn('Period'), localizedPeriodLabel],
        [tEn('Generated on'), new Date().toLocaleString(enLocale)],
        [],
        [tEn('Summary Statistics'), ''],
        [tEn('Total Income'), stats.totalIncome],
        [tEn('Total Spent'), stats.totalSpent],
        [tEn('Net Balance'), stats.netBalance],
        [tEn('Daily Average'), stats.dailyAvg],
        [tEn('Pending Income'), stats.pendingIncome],
        [tEn('Expected Income'), stats.expectedIncome],
        [],
        [tEn('Overall Budget'), stats.overallBudgetLimit > 0 ? `${stats.overallBudgetRemaining.toLocaleString(enLocale)} ${tEn('remaining of')} ${stats.overallBudgetLimit.toLocaleString(enLocale)}` : tEn('None')],
        [tEn('Overall Budget Status'), tEn(stats.overallStatus)],
        [tEn('Overall Budget Warning Threshold'), stats.overallBudgetLimit > 0 ? `${stats.overallThreshold}%` : '-'],
        [tEn('Overall Budget Start Date'), stats.overallBudgetStart ? new Date(stats.overallBudgetStart).toLocaleDateString(enLocale) : '-'],
        [tEn('Overall Budget End Date'), stats.overallBudgetEnd ? new Date(stats.overallBudgetEnd).toLocaleDateString(enLocale) : '-'],
        [tEn('Top Category'), stats.topCategory ? tEn(stats.topCategory.name) : '-'],
        [tEn('Top Category Amount'), stats.topCategory ? stats.topCategory.amount : '-'],
        ...(stats.overallStatus === 'Inactive' ? [[tEn('Note'), tEn('This budget is now INACTIVE and will not track new expenses.')]] : []),
      ]

      // 2. Expenses data
      const expensesHeader = [tEn('Date'), tEn('Title'), tEn('Category'), tEn('Amount'), tEn('Note')]
      const expensesRows = filteredExpenses.map((tx: Expense) => [
        new Date(tx.date).toLocaleDateString(enLocale),
        tx.title,
        tEn(tx.category),
        tx.amount,
        tx.note || '',
      ])

      // 3. Incomes data
      const incomesHeader = [tEn('Date'), tEn('Title'), tEn('Category'), tEn('Amount'), tEn('Status')]
      const incomesRows = filteredIncomes.map((inc: Income) => [
        new Date(inc.date).toLocaleDateString(enLocale),
        inc.title,
        tEn(inc.category),
        inc.amount,
        tEn(inc.status),
      ])

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([overviewHeader, ...overviewData]), tEn('Overview'))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([expensesHeader, ...expensesRows]), tEn('Expenses'))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([incomesHeader, ...incomesRows]), tEn('Incomes'))

      // 4. Category Breakdown sheet
      const catHeader = [tEn('Category'), tEn('Amount'), tEn('Percentage')]
      const catRows = stats.categoryList.map(c => [tEn(c.name), c.amount, `${c.percentage.toFixed(1)}%`])
      const wsCategories = XLSX.utils.aoa_to_sheet([catHeader, ...catRows])
      XLSX.utils.book_append_sheet(wb, wsCategories, tEn('Categories'))

      // 4. Daily Spending sheet
      const dailyHeader = [tEn('Date'), tEn('Amount')]
      const dailyRows = stats.dailySpending.map(d => [d.date, d.amount])
      const wsDaily = XLSX.utils.aoa_to_sheet([dailyHeader, ...dailyRows])
      XLSX.utils.book_append_sheet(wb, wsDaily, tEn('Daily Spending'))

      const fileName = getFriendlyFilename(filterMode, selectedMonth, selectedDate, dateRange, tEn, 'xlsx')
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('Excel Export failed:', err)
      alert('Failed to generate Excel. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-900/10">
      <Sidebar />

      {/* ✅ responsive left spacing so layout doesn't break */}
      <main
  dir={isArabic ? 'rtl' : 'ltr'}
  className={`flex-1 ${isArabic ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen`}
>
        <div className="max-w-7xl mx-auto space-y-8 pt-16 lg:pt-0">
          {/* Header stays visible always */}
          <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center ">
                  <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white">{t('Expense Report')}</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium">{t('Detailed analysis of your spending habits')}</p>
              </div>

              <div className="relative mt-10 lg:mt-0">
                <button
                  onClick={() => setExportDropdown((v) => !v)}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  {exporting ? (exporting === 'pdf' ? t('Exporting PDF...') : t('Exporting Excel...')) : t('Export')}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {exportDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportDropdown(false)} />
                    <div className="absolute right-0 mt-1 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-20 min-w-[180px]">
                      <button
                        onClick={handleExportPDF}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-red-500" />
                        {t('Export as PDF')}
                      </button>
                      <button
                        onClick={handleExportExcel}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        {t('Export as Excel')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl p-5 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700/50 flex flex-wrap gap-4 items-center">
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                <button
                  onClick={() => setFilterMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterMode === 'month' ? 'bg-white dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('Month')}
                </button>
                <button
                  onClick={() => setFilterMode('date')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterMode === 'date' ? 'bg-white dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('Specific Date')}
                </button>
                <button
                  onClick={() => setFilterMode('range')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filterMode === 'range' ? 'bg-white dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('Date Range')}
                </button>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

              {filterMode === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200"
                />
              )}

              {filterMode === 'date' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200"
                />
              )}

              {filterMode === 'range' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200"
                  />
                  <span className="text-slate-400">{t('to')}</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </motion.header>

          {loading ? (
            <LoadingScreen />
          ) : (
            // ✅ Key part: loaded content has its own motion container, so it animates correctly on mount
            <motion.div
              key={`${start}-${end}`} // re-run animation when period changes
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-8"
            >
                    {/* Financial Summary */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    label: t('Total Income'),
                    value: `$${stats.totalIncome.toLocaleString(locale, { minimumFractionDigits: 2 })}`,
                    color: 'text-emerald-600 dark:text-emerald-400',
                    sub: stats.pendingIncome > 0 || stats.expectedIncome > 0 ? (
                      <div className="text-[10px] mt-1 text-slate-400 font-normal leading-relaxed">
                        {stats.pendingIncome > 0 && <div>${stats.pendingIncome.toLocaleString(locale)} {t('pending')}</div>}
                        {stats.expectedIncome > 0 && <div>${stats.expectedIncome.toLocaleString(locale)} {t('expected')}</div>}
                      </div>
                    ) : null
                  },
                  {
                    label: t('Total Spent'),
                    value: `$${stats.totalSpent.toLocaleString(locale, { minimumFractionDigits: 2 })}`,
                    color: 'text-rose-600 dark:text-rose-400',
                  },
                  {
                    label: t('Net Balance'),
                    value: `$${stats.netBalance.toLocaleString(locale, { minimumFractionDigits: 2 })}`,
                    color: stats.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                  },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl p-6 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/50">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">{stat.label}</p>
                    <div className="flex flex-col">
                      <h3 className={`text-2xl font-bold font-heading ${stat.color}`}>{stat.value}</h3>
                      {stat.sub}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Overall Budget Overview Section */}
              {stats.overallBudgetLimit > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/50 mb-8"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">{t('Overall Budget Overview')}</h2>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          stats.overallStatus === 'Over' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          stats.overallStatus === 'Warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          stats.overallStatus === 'Inactive' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {t(stats.overallStatus)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(stats.overallBudgetStart!).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(stats.overallBudgetEnd!).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400 font-medium mb-1">{t('Warning Threshold')}</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{stats.overallThreshold}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mb-1">{t('Total Limit')}</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">${stats.overallBudgetLimit.toLocaleString(locale)}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mb-1">{t('Spent')}</p>
                      <p className={`text-2xl font-black ${stats.overallStatus === 'Over' ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                        ${stats.overallBudgetSpent.toLocaleString(locale, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mb-1">{t('Remaining')}</p>
                      <p className={`text-2xl font-black ${stats.overallBudgetRemaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        ${stats.overallBudgetRemaining.toLocaleString(locale, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                          {t('Budget Progress')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-slate-600 dark:text-slate-400">
                          {Math.round((stats.overallBudgetSpent / stats.overallBudgetLimit) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100 dark:bg-slate-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.overallBudgetSpent / stats.overallBudgetLimit) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          stats.overallStatus === 'Over' ? 'bg-red-500' :
                          stats.overallStatus === 'Warning' ? 'bg-amber-500' :
                          stats.overallStatus === 'Inactive' ? 'bg-slate-400' :
                          'bg-emerald-500'
                        }`}
                      />
                    </div>
                    {stats.overallStatus === 'Inactive' && (
                      <p className="text-xs text-red-500 font-medium italic mt-2">
                        * {t('Note: This budget is now INACTIVE and will not track new expenses.')}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                  variants={itemVariants}
                  className="lg:col-span-2 bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/50"
                >
                  <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-6">{t('Spending Over Time')}</h3>
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
                              new Date(v).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
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
                              new Date(v).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
                            }
                            formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString(locale, { minimumFractionDigits: 2 })}`, t('Spent')]}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#reportColorAmount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">{t('No spending data for this period')}</div>
                    )}
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/50">
                  <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-2">{t('By Category')}</h3>
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
                            formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString(locale, { minimumFractionDigits: 2 })}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">{t('No categories')}</div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 max-h-24 overflow-y-auto">
                    {stats.categoryData.slice(0, 5).map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 dark:text-slate-300 truncate">{t(item.name)}</span>
                        <span className="text-slate-400 ml-auto">
                          {stats.totalSpent > 0 ? Math.round((item.value / stats.totalSpent) * 100).toLocaleString(locale) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Category Breakdown Bars */}
              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/50">
                <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-6">{t('Category Breakdown')}</h3>
                <div className="space-y-6">
                  {stats.categoryList.length > 0 ? (
                    stats.categoryList.map((cat) => (
                      <div key={cat.name}>
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-slate-700 dark:text-slate-300">{t(cat.name)}</span>
                          <span className="text-slate-900 dark:text-white">
                            ${cat.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${cat.percentage}%` }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">{t('No expenses found for this period.')}</div>
                  )}
                </div>
              </motion.div>

              {/* Filters + Transactions List */}
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                  <h3 className="text-lg font-bold font-heading text-slate-900 dark:text-white">{t('Transactions')}</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 sm:flex-initial sm:w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder={t('Search transactions...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 dark:focus:border-emerald-500 outline-none transition-colors text-slate-900 dark:text-white dark:placeholder-slate-500"
                      />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {categoryOptions.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                            selectedCategory === cat
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                              : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {t(cat)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                  <div className="divide-y divide-slate-200 dark:divide-slate-700/50 max-h-[400px] overflow-y-auto">
                    {filteredExpenses.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-emerald-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                          style={{
                            backgroundColor: categoryColorMap[tx.category]
                              ? `${categoryColorMap[tx.category]}33`
                              : undefined,
                            color: categoryColorMap[tx.category] || undefined,
                          }}
                        >
                          {tx.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-white truncate">{tx.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(tx.date).toLocaleDateString(locale)}
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">{t(tx.category)}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white">-${tx.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredExpenses.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      {displayExpenses.length === 0 ? t('No expenses found for this period.') : t('No transactions match your filters.')}
                    </div>
                  )}
                </div>

                {/* Incomes Section */}
                {filteredIncomes.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pt-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-500/20">
                         <div className="text-xl">💰</div>
                      </div>
                      <h2 className="text-xl font-bold font-heading text-slate-800 dark:text-white">
                        {t('Incomes')}
                      </h2>
                    </div>

                    <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-700/50 overflow-hidden">
                      <div className="divide-y divide-slate-200 dark:divide-slate-700/50 max-h-[400px] overflow-y-auto">
                        {filteredIncomes.map((inc) => (
                          <div key={inc.id} className="flex items-center gap-4 p-4 hover:bg-emerald-50/50 dark:hover:bg-slate-700/50 transition-colors">
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                              style={{ 
                                backgroundColor: inc.categoryColor ? `${inc.categoryColor}33` : '#10B98133', 
                                color: inc.categoryColor || '#10B981' 
                              }}
                            >
                              {inc.emoji || '✨'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 dark:text-white truncate">{inc.title}</h4>
                              <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(inc.date).toLocaleDateString(locale)}
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">{t(inc.category)}</span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end flex-shrink-0">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                +${inc.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                                inc.status === 'received' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                inc.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
                              }`}>
                                {t(inc.status)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}