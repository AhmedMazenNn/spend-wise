import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Plus,
  X,
  TrendingUp,
  PieChart as PieChartIcon,
} from 'lucide-react'
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
import { Sidebar } from '../../components/Sidebar'
import { useTranslation } from 'react-i18next'
import { LoadingScreen } from '../../components/LoadingScreen'
import { LottieIcon, LOTTIE_FILTERS } from '../../components/LottieIcon'
import editAnim from '../../assets/edit-icon.json'
import trashAnim from '../../assets/trash-icon.json'
import { fetchIncomes, createIncome, updateIncome, deleteIncome } from '../../api/incomes'
import type { Income } from '../../api/incomes'
import { fetchCategories, type Category } from '../../api/categories'
import { AddIncomeModal, type IncomeEntry } from '../../components/AddIncomeModal'

type TimePeriod = 'Today' | 'Week' | 'Month' | 'All'
type FilterMode = 'preset' | 'custom'

const PERIOD_MAP: Record<TimePeriod, 'today' | 'week' | 'month' | 'all'> = {
  Today: 'today',
  Week: 'week',
  Month: 'month',
  All: 'all',
}

export function IncomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'

  const [incomes, setIncomes] = useState<Income[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterMode, setFilterMode] = useState<FilterMode>('preset')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('All')
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editModal, setEditModal] = useState<Income | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [searchDebounced, setSearchDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

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
    return {
      period: PERIOD_MAP[selectedPeriod],
      search: searchDebounced || undefined,
      limit: 500,
    }
  }, [filterMode, selectedPeriod, customRange, searchDebounced])

  const loadIncomes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchIncomes(fetchParams)
      setIncomes(res.incomes)
      setTotal(res.total)
    } catch {
      setIncomes([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [fetchParams])

  useEffect(() => {
    loadIncomes()
  }, [loadIncomes])

  const categoryFilterOptions = useMemo(() => {
    const names = new Set(incomes.map((inc) => inc.category))
    return ['All', ...Array.from(names).sort()]
  }, [incomes])

  const filteredIncomes = useMemo(() => {
    if (selectedCategory === 'All') return incomes
    return incomes.filter((inc) => inc.category === selectedCategory)
  }, [incomes, selectedCategory])

  const stats = useMemo(() => {
    const totalReceived = filteredIncomes
      .filter((inc) => inc.status === 'received')
      .reduce((acc, curr) => acc + curr.amount, 0)
    const count = filteredIncomes.length
    const avgIncome = count > 0 ? totalReceived / count : 0
    const highest = Math.max(...filteredIncomes.map((t) => t.amount), 0)

    // Category breakdown for pie chart
    const categoryMap: Record<string, { name: string; value: number; color: string }> = {}
    filteredIncomes.forEach((inc) => {
      const name = t(inc.category)
      const color = inc.categoryColor || '#10B981'
      if (!categoryMap[name]) categoryMap[name] = { name, value: 0, color }
      categoryMap[name].value += inc.amount
    })
    const categoryData = Object.values(categoryMap).sort((a, b) => b.value - a.value)

    // Daily income for area chart
    const dailyMap: Record<string, number> = {}
    filteredIncomes.forEach((inc) => {
      const d = new Date(inc.date).toISOString().split('T')[0]
      dailyMap[d] = (dailyMap[d] || 0) + inc.amount
    })
    const dailyData = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return { totalReceived, count, avgIncome, highest, categoryData, dailyData }
  }, [filteredIncomes, t])

  const handleDelete = async (id: string) => {
    try {
      await deleteIncome(id)
      setDeleteConfirm(null)
      loadIncomes()
    } catch (e) {
      alert(e instanceof Error ? e.message : t('Delete failed'))
    }
  }

  const handleAddIncome = async (entry: IncomeEntry) => {
    try {
      await createIncome({
        title: entry.title,
        amount: entry.amount,
        category: entry.category,
        emoji: entry.emoji,
        date: entry.date,
        frequency: entry.frequency,
        note: entry.note,
        status: entry.status,
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        categoryIcon: entry.categoryIcon,
        categoryColor: entry.categoryColor,
      })
      loadIncomes()
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : t('Add failed'))
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  const isArabic = i18n.language === 'ar'

  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar />

      <main
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`flex-1 ${isArabic ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-6 lg:p-8 overflow-y-auto h-screen`}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto space-y-6 pt-16 lg:pt-0"
        >
          <motion.header
            variants={itemVariants}
            className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6 sm:mb-8"
          >
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white">
                {t('Income')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                {t('Track and manage all your revenue streams')}
              </p>
            </div>
          </motion.header>

          {/* Date Filter */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-2 sm:items-center">
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full overflow-x-auto scrollbar-hide w-full sm:w-auto">
                {(['Today', 'Week', 'Month', 'All'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setFilterMode('preset')
                      setSelectedPeriod(period)
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      filterMode === 'preset' && selectedPeriod === period
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t(period)}
                  </button>
                ))}
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center">
                <button
                  onClick={() => setFilterMode('custom')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    filterMode === 'custom'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t('Custom Range')}
                </button>

                {filterMode === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2"
                  >
                    <input
                      type="date"
                      value={customRange.start}
                      lang={i18n.language}
                      onChange={(e) =>
                        setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                      }
                      className="px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200 w-full sm:w-auto"
                    />
                   <span className="text-slate-400 text-sm hidden sm:inline">{t('to')}</span>
                    <input
                      type="date"
                      value={customRange.end}
                      lang={i18n.language}
                      onChange={(e) =>
                        setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                      }
                      className="px-3 py-2 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 dark:text-slate-200 w-full sm:w-auto"
                    />
                 </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Summary Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('Total Income')}</p>
              <h3 className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                $
                {stats.totalReceived.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                {t('Avg. Income')}
              </p>
              <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                $
                {stats.avgIncome.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                {t('Highest Income')}
              </p>
              <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                $
                {stats.highest.toLocaleString(locale, {
                  minimumFractionDigits: 2,
                })}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-5 rounded-2xl shadow-card">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                {t('Total Count')}
              </p>
              <h3 className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
                {stats.count.toLocaleString(locale)}
              </h3>
            </div>
          </motion.div>

          {/* Visualization Section */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl p-6 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold font-heading text-slate-800 dark:text-white">{t('Income by Category')}</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {stats.categoryData.slice(0, 4).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-slate-500 truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Income Trend Area Chart */}
            <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl p-6 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold font-heading text-slate-800 dark:text-white">{t('Income Trend')}</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      tickFormatter={(str) => {
                        const d = new Date(str)
                        return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#10B981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* Filter Bar */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-xl dark:border dark:border-slate-700/50 p-4 rounded-2xl shadow-card flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between sticky top-0 z-10"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('Search incomes...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white dark:placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-hide">
              {categoryFilterOptions.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t(cat)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Incomes List */}
          <motion.div variants={itemVariants} className="space-y-3 pb-12">
            {loading ? (
              <LoadingScreen />
            ) : (
              <AnimatePresence>
                {filteredIncomes.map((inc) => (
                  <motion.div
                    key={inc.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden"
                  >
                    <div
                      onClick={() =>
                        setExpandedId(expandedId === inc.id ? null : inc.id)
                      }
                      className="p-4 flex items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        style={{ 
                          backgroundColor: inc.categoryColor ? `${inc.categoryColor}20` : undefined,
                          color: inc.categoryColor 
                        }}
                      >
                        {inc.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold font-heading text-slate-900 dark:text-white truncate">
                              {inc.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span 
                                className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                style={{
                                  backgroundColor: inc.categoryColor ? `${inc.categoryColor}15` : undefined,
                                  color: inc.categoryColor
                                }}
                              >
                                {t(inc.category)}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                inc.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                                inc.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {t(inc.status)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="font-bold font-heading text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                              +${inc.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex flex-col text-sm text-slate-500 dark:text-slate-400 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(inc.date).toLocaleDateString(locale)}
                            <span className="mx-2">•</span>
                            {t('Frequency')}: {t(inc.frequency)}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-400 pt-1 sm:pt-0">
                        {expandedId === inc.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === inc.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/40"
                        >
                          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                  {t('Note')}
                                </label>
                                <p className="text-slate-700 dark:text-slate-300 mt-1 break-words">
                                  {inc.note || '—'}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t('Frequency')}
                                  </label>
                                  <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">
                                    {t(inc.frequency)}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {t('Date')}
                                  </label>
                                  <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">
                                    {new Date(inc.date).toLocaleDateString(locale)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col justify-end items-stretch md:items-end">
                              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditModal(inc)
                                  }}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
                                >
                                  <LottieIcon
                                    animationData={editAnim}
                                    size={18}
                                    colorFilter={LOTTIE_FILTERS.slate}
                                  />
                                  {t('Edit')}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirm(inc.id)
                                  }}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium"
                                >
                                  <LottieIcon
                                    animationData={trashAnim}
                                    size={18}
                                    colorFilter={LOTTIE_FILTERS.red}
                                  />
                                  {t('Delete')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {!loading && filteredIncomes.length > 0 && (
              <p className="text-slate-500 text-sm mt-4">
                {t('Showing')} {filteredIncomes.length.toLocaleString(locale)}
                {selectedCategory !== 'All' ? ` ${t('of_total')} ${incomes.length.toLocaleString(locale)}` : ` ${t('of_total')} ${total.toLocaleString(locale)}`}{' '}
                {t('incomes_records')}
              </p>
            )}

            {!loading && filteredIncomes.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('No incomes found')}
                </h3>
                <p className="text-slate-500">
                  {t('Try adjusting your filters or search terms')}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAddModalOpen(true)}
        className={`fixed bottom-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-500 sm:bottom-8 sm:h-16 sm:w-16 ${
          isArabic ? 'left-4 sm:left-8' : 'right-4 sm:right-8'
        }`}
        aria-label={t('Add Income')}
      >
        <Plus className="h-7 w-7 sm:h-8 sm:w-8" />
      </motion.button>

      <AddIncomeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(entry) => {
          handleAddIncome(entry)
          setIsAddModalOpen(false)
        }}
      />

      {/* Edit Modal Component */}
      <AnimatePresence>
        {editModal && (
          <EditIncomeModal
            income={editModal}
            onClose={() => setEditModal(null)}
            onSuccess={() => {
              setEditModal(null)
              loadIncomes()
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full dark:border dark:border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {t('Delete income?')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                  {t('This action cannot be undone.')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                  >
                    {t('Delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Error Message Toast/Alert */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]"
          >
            <span className="flex-1 text-sm font-medium">{errorMessage}</span>
            <button 
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EditIncomeModalProps {
  income: Income
  onClose: () => void
  onSuccess: () => void
}

function EditIncomeModal({
  income,
  onClose,
  onSuccess,
}: EditIncomeModalProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [amount, setAmount] = useState(String(income.amount))
  const [title, setTitle] = useState(income.title)
  const [note, setNote] = useState(income.note ?? '')
  const [date, setDate] = useState(income.date.split('T')[0])
  const [status, setStatus] = useState<Income['status']>(income.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCatId, setSelectedCatId] = useState(income.categoryId || '')
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchCategories('income')
        setCategories(res.categories)
      } catch (err) {
        console.error(err)
      }
    }
    loadCategories()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setError(t('Please enter a valid amount'))
      return
    }
    setSaving(true)
    setError(null)
    const selectedCategory = categories.find(c => c.id === selectedCatId)
    try {
      await updateIncome(income.id, {
        amount: amt,
        title: title.trim() || 'Untitled',
        note: note.trim() || undefined,
        date,
        status,
        categoryId: selectedCatId,
        categoryName: selectedCategory?.name,
        categoryIcon: selectedCategory?.icon,
        categoryColor: selectedCategory?.color,
        emoji: selectedCategory?.icon,
        category: selectedCategory?.name,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Update failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full dark:border dark:border-slate-700 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white">
              {t('Edit Income')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                {t('Amount')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                {t('Category')}
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm appearance-none"
              >
                <option value="" disabled>{t('Select Category')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                {t('Title')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                    {t('Date')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                    {t('Status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="received">{t('Received')}</option>
                    <option value="pending">{t('Pending')}</option>
                    <option value="expected">{t('Expected')}</option>
                  </select>
                </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                {t('Note')}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-all"
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
              >
                {saving ? t('Saving...') : t('Save Changes')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}

export default IncomePage
