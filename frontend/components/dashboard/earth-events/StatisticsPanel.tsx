'use client'
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle, Globe, Calendar, Activity, BarChart3, Eye, X, Expand, ChevronLeft, ChevronRight } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from 'recharts'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
export default function StatisticsPanel() {
  const { events, loading } = useEarthEventsStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState('overview')
  const totalEvents = events.length
  const activeEvents = useMemo(() => {
    return events.filter(event => {
      if (!event?.created_date) return false
      try {
        const eventDate = new Date(event.created_date)
        if (isNaN(eventDate.getTime())) return false
        const daysSinceEvent = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceEvent <= 7
      } catch {
        return false
      }
    }).length
  }, [events])
  const categoryData = useMemo(() => {
    return events.reduce((acc: { [key: string]: number }, event) => {
      const category = event.categories?.[0]?.title || 'Unknown'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
  }, [events])
  const pieData = useMemo(() => {
    return Object.entries(categoryData).map(([name, value]) => ({
      name,
      value: value as number,
      color: getCategoryColor(name)
    }))
  }, [categoryData])
  const trendData = useMemo(() => generateTrendData(events), [events])
  const trendDirection = useMemo(() => getTrendDirection(trendData), [trendData])
  function getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Wildfires': '#FF6B35',
      'Volcanoes': '#D32F2F',
      'Severe Storms': '#7B68EE',
      'Floods': '#1E88E5',
      'Drought': '#FFB74D',
      'Earthquakes': '#8D6E63'
    }
    return colors[category] || '#FFA726'
  }
  function generateTrendData(events: any[]) {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return {
        day: date.toLocaleDateString("tr-TR", { weekday: "short" }),
        events: 0,
        date: date.toISOString().split("T")[0]
      }
    })
    events.forEach(event => {
      if (!event?.created_date) return
      try {
        const createdDate = new Date(event.created_date)
        if (isNaN(createdDate.getTime())) {
          console.warn('Invalid date detected:', event.created_date, 'for event:', event.id)
          return
        }
        const eventDate = createdDate.toISOString().split("T")[0]
        const dayData = last7Days.find(d => d.date === eventDate)
        if (dayData) {
          dayData.events++
        }
      } catch (error) {
        console.warn('Error processing event date:', event.id, error)
      }
    })
    return last7Days
  }
  function getTrendDirection(data: any[]) {
    if (data.length < 2) return 'stable'
    const recent = data.slice(-3).reduce((sum, d) => sum + d.events, 0)
    const previous = data.slice(-6, -3).reduce((sum, d) => sum + d.events, 0)
    if (recent > previous) return 'up'
    if (recent < previous) return 'down'
    return 'stable'
  }
  if (loading) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center z-40"
      >
        <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </motion.div>
    )
  }
  return (
    <>
      {}
      <motion.button
        initial={{ scale: 0, x: 100 }}
        animate={{ scale: 1, x: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed right-4 top-4 bg-gradient-to-br from-black/80 via-black/70 to-black/80 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 shadow-2xl z-40 overflow-hidden group"
      >
        {}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500" />
        <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 animate-pulse blur-sm" />
        <div className="relative z-10 p-4 flex items-center gap-4">
          {}
          <div className="flex items-center gap-3">
            {}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 rounded-xl flex items-center justify-center">
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white leading-none">{totalEvents}</div>
                <div className="text-emerald-400 text-xs font-medium">Events</div>
              </div>
            </div>
            {}
            <div className="w-px h-8 bg-white/10" />
            {}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white leading-none">{activeEvents}</div>
                <div className="text-orange-400 text-xs font-medium">Active</div>
              </div>
            </div>
            {}
            <div className="w-px h-8 bg-white/10" />
            {}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl flex items-center justify-center">
                {trendDirection === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : trendDirection === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <Activity className="w-4 h-4 text-yellow-400" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-none capitalize">{trendDirection}</div>
                <div className={`text-xs font-medium ${
                  trendDirection === 'up' ? 'text-emerald-400' :
                  trendDirection === 'down' ? 'text-red-400' : 'text-yellow-400'
                }`}>Trend</div>
              </div>
            </div>
          </div>
          {}
          <div className="ml-2 flex items-center">
            <div className="w-8 h-8 bg-white/10 group-hover:bg-emerald-500/20 rounded-lg flex items-center justify-center transition-colors">
              <BarChart3 className="w-4 h-4 text-white/60 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
        </div>
      </motion.button>
      {}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, x: -100 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.8, opacity: 0, x: -100 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-gradient-to-br from-black/95 via-black/90 to-black/95 backdrop-blur-2xl rounded-3xl border border-emerald-500/30 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {}
              <div className="sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/10 p-6 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                      </div>
                      Event Statistics Dashboard
                    </h2>
                    <p className="text-white/60 text-sm mt-1">Comprehensive analysis of global events</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors group"
                  >
                    <X className="w-6 h-6 text-white group-hover:text-red-400 transition-colors" />
                  </button>
                </div>
                {}
                <div className="flex gap-2 mt-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: Globe },
                    { id: 'trends', label: 'Trends', icon: TrendingUp },
                    { id: 'categories', label: 'Categories', icon: BarChart3 },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setModalTab(id)}
                      className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                        modalTab === id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {}
              <div className="p-6">
                {modalTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <Globe className="w-8 h-8 text-emerald-400" />
                        <TrendingUp className="w-5 h-5 text-emerald-400/60" />
                      </div>
                      <div className="text-3xl font-bold text-white mb-2">{totalEvents}</div>
                      <div className="text-emerald-400 font-medium">Total Events</div>
                      <div className="text-white/60 text-sm mt-1">Worldwide monitoring</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-2xl p-6 border border-orange-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <AlertTriangle className="w-8 h-8 text-orange-400" />
                        <Activity className="w-5 h-5 text-orange-400/60" />
                      </div>
                      <div className="text-3xl font-bold text-white mb-2">{activeEvents}</div>
                      <div className="text-orange-400 font-medium">Active Events</div>
                      <div className="text-white/60 text-sm mt-1">Last 7 days</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <BarChart3 className="w-8 h-8 text-blue-400" />
                        {trendDirection === 'up' ? (
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        ) : trendDirection === 'down' ? (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        ) : (
                          <Activity className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                      <div className="text-2xl font-bold text-white mb-2 capitalize">{trendDirection}ward</div>
                      <div className="text-blue-400 font-medium">Weekly Trend</div>
                      <div className="text-white/60 text-sm mt-1">7-day analysis</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl p-6 border border-purple-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <Activity className="w-8 h-8 text-purple-400" />
                        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-2">Online</div>
                      <div className="text-purple-400 font-medium">System Status</div>
                      <div className="text-white/60 text-sm mt-1">All systems operational</div>
                    </div>
                  </div>
                )}
                {modalTab === 'trends' && (
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <h3 className="text-xl font-bold text-white mb-4">Weekly Trend Analysis</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              dataKey="day"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 14, fill: '#9CA3AF' }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 14, fill: '#9CA3AF' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                color: 'white'
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="events"
                              stroke="#10b981"
                              strokeWidth={3}
                              fill="url(#trendGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
                {modalTab === 'categories' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <h3 className="text-xl font-bold text-white mb-4">Distribution Chart</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={120}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white">Category Breakdown</h3>
                      {pieData.map((item, index) => (
                        <div
                          key={index}
                          className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-6 h-6 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="flex-1">
                              <div className="text-white font-medium">{item.name}</div>
                              <div className="text-white/60 text-sm">{item.value} events</div>
                            </div>
                            <div className="text-white/80 font-mono text-lg font-bold">
                              {Math.round((item.value / totalEvents) * 100)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}