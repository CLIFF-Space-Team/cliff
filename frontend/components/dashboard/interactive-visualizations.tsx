"use client"
import React, { useState, useEffect, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown, Activity, BarChart3,
  PieChart, LineChart, Zap, Globe, Shield, Target
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
interface ChartData {
  name: string
  value: number
  category?: string
  color?: string
}
interface VisualizationProps {
  className?: string
  data?: any
  title?: string
  subtitle?: string
}
const CustomAreaChart: React.FC<{
  data: Array<{ date: string; critical: number; high: number; medium: number; low: number }>
  height?: number
}> = ({ data, height = 200 }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    if (!canvasRef.current || !data.length) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const maxValue = Math.max(...data.map(d => d.critical + d.high + d.medium + d.low))
    const xStep = canvas.width / (data.length - 1)
    const yScale = (canvas.height - 40) / maxValue
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = (canvas.height - 40) * (i / 5) + 20
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    const drawArea = (values: number[], color: string, opacity: number) => {
      ctx.fillStyle = color
      ctx.globalAlpha = opacity
      ctx.beginPath()
      ctx.moveTo(0, canvas.height)
      values.forEach((value, i) => {
        const x = i * xStep
        const y = canvas.height - (value * yScale + 20)
        if (i === 0) {
          ctx.lineTo(x, y)
        } else {
          const prevX = (i - 1) * xStep
          const prevY = canvas.height - (values[i - 1] * yScale + 20)
          const cp1x = prevX + xStep / 3
          const cp1y = prevY
          const cp2x = x - xStep / 3
          const cp2y = y
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
        }
      })
      ctx.lineTo(canvas.width, canvas.height)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }
    const criticalValues = data.map(d => d.critical)
    const highValues = data.map((d, i) => criticalValues[i] + d.high)
    const mediumValues = data.map((d, i) => highValues[i] + d.medium)
    const lowValues = data.map((d, i) => mediumValues[i] + d.low)
    drawArea(lowValues, "#22c55e", 0.6)
    drawArea(mediumValues, "#eab308", 0.6)
    drawArea(highValues, "#f97316", 0.6)
    drawArea(criticalValues, "#ef4444", 0.6)
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
    ctx.font = "10px Inter"
    ctx.textAlign = "center"
    data.forEach((d, i) => {
      const x = i * xStep
      ctx.fillText(d.date.split("-").pop() || "", x, canvas.height - 5)
    })
  }, [data, height])

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(() => draw())
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [draw])

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full" 
      style={{ height }}
    />
  )
}
const CustomRadarChart: React.FC<{
  data: Array<{ axis: string; value: number }>
  size?: number
}> = ({ data, size = 200 }) => {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 20
  const angleStep = (2 * Math.PI) / data.length
  const points = useMemo(() => {
    return data.map((item, index) => {
      const angle = angleStep * index - Math.PI / 2
      const x = centerX + (radius * item.value / 100) * Math.cos(angle)
      const y = centerY + (radius * item.value / 100) * Math.sin(angle)
      return { x, y, label: item.axis, value: item.value }
    })
  }, [data, angleStep, centerX, centerY, radius])
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(" ")
  return (
    <svg ref={svgRef} width={size} height={size} className="w-full h-full">
      {}
      {[20, 40, 60, 80, 100].map((level) => (
        <circle
          key={level}
          cx={centerX}
          cy={centerY}
          r={radius * level / 100}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      ))}
      {}
      {data.map((_, index) => {
        const angle = angleStep * index - Math.PI / 2
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        return (
          <line
            key={index}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        )
      })}
      {}
      <polygon
        points={polygonPoints}
        fill="rgba(99, 102, 241, 0.3)"
        stroke="rgba(99, 102, 241, 0.8)"
        strokeWidth="2"
      />
      {}
      {points.map((point, index) => (
        <g key={index}>
          <circle
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#6366f1"
            stroke="#fff"
            strokeWidth="1"
          />
          <text
            x={point.x}
            y={point.y - 10}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.7)"
            fontSize="10"
          >
            {point.value}%
          </text>
        </g>
      ))}
      {}
      {data.map((item, index) => {
        const angle = angleStep * index - Math.PI / 2
        const labelX = centerX + (radius + 15) * Math.cos(angle)
        const labelY = centerY + (radius + 15) * Math.sin(angle)
        return (
          <text
            key={index}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255, 255, 255, 0.8)"
            fontSize="11"
          >
            {item.axis}
          </text>
        )
      })}
    </svg>
  )
}
const CustomDonutChart: React.FC<{
  data: Array<{ name: string; value: number; color: string }>
  size?: number
}> = ({ data, size = 200 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = -Math.PI / 2
  const arcs = data.map(item => {
    const percentage = item.value / total
    const startAngle = currentAngle
    const endAngle = currentAngle + (2 * Math.PI * percentage)
    currentAngle = endAngle
    const innerRadius = size / 4
    const outerRadius = size / 2 - 10
    const centerX = size / 2
    const centerY = size / 2
    const x1 = centerX + Math.cos(startAngle) * innerRadius
    const y1 = centerY + Math.sin(startAngle) * innerRadius
    const x2 = centerX + Math.cos(startAngle) * outerRadius
    const y2 = centerY + Math.sin(startAngle) * outerRadius
    const x3 = centerX + Math.cos(endAngle) * outerRadius
    const y3 = centerY + Math.sin(endAngle) * outerRadius
    const x4 = centerX + Math.cos(endAngle) * innerRadius
    const y4 = centerY + Math.sin(endAngle) * innerRadius
    const largeArcFlag = percentage > 0.5 ? 1 : 0
    const path = `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}
    `
    return { path, color: item.color, name: item.name, value: item.value, percentage }
  })
  return (
    <div className="relative">
      <svg width={size} height={size} className="w-full h-full">
        {arcs.map((arc, index) => (
          <g key={index}>
            <path
              d={arc.path}
              fill={arc.color}
              stroke="rgba(0, 0, 0, 0.5)"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          </g>
        ))}
      </svg>
      {}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-cliff-white">{total}</div>
          <div className="text-xs text-cliff-light-gray">Toplam</div>
        </div>
      </div>
      {}
      <div className="mt-4 space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-cliff-light-gray">{item.name}</span>
            </div>
            <span className="text-cliff-white font-mono">
              {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
export const InteractiveVisualizations: React.FC<VisualizationProps> = ({
  className,
  data,
  title = "İnteraktif Veri Görselleştirme",
  subtitle = "Gerçek zamanlı tehdit analizi ve istatistikler"
}) => {
  const [activeChart, setActiveChart] = useState<"area" | "radar" | "donut">("area")

  const areaChartData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      return {
        date: dateStr,
        critical: Math.floor(Math.random() * 4) + 1,
        high: Math.floor(Math.random() * 5) + 3,
        medium: Math.floor(Math.random() * 6) + 7,
        low: Math.floor(Math.random() * 8) + 10,
      }
    })
  }, [])
  const radarChartData = [
    { axis: "Asteroidler", value: 75 },
    { axis: "Solar Fırtınalar", value: 60 },
    { axis: "Uzay Enkazı", value: 45 },
    { axis: "Dünya Olayları", value: 80 },
    { axis: "Radyasyon", value: 55 },
    { axis: "Manyetik Alan", value: 70 }
  ]
  const donutChartData = [
    { name: "Kritik", value: 5, color: "#ef4444" },
    { name: "Yüksek", value: 12, color: "#f97316" },
    { name: "Orta", value: 28, color: "#eab308" },
    { name: "Düşük", value: 45, color: "#22c55e" }
  ]
  return (
    <div className={cn("h-full bg-pure-black rounded-xl overflow-hidden", className)}>
      {}
      <div className="border-b border-cliff-light-gray/10 bg-gradient-to-r from-pure-black via-almost-black to-pure-black p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-cliff-white">{title}</h2>
            <p className="text-xs text-cliff-light-gray mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeChart === "area" ? "default" : "ghost"}
              onClick={() => setActiveChart("area")}
              className="text-xs"
            >
              <LineChart className="w-3 h-3 mr-1" />
              Trend
            </Button>
            <Button
              size="sm"
              variant={activeChart === "radar" ? "default" : "ghost"}
              onClick={() => setActiveChart("radar")}
              className="text-xs"
            >
              <Target className="w-3 h-3 mr-1" />
              Radar
            </Button>
            <Button
              size="sm"
              variant={activeChart === "donut" ? "default" : "ghost"}
              onClick={() => setActiveChart("donut")}
              className="text-xs"
            >
              <PieChart className="w-3 h-3 mr-1" />
              Dağılım
            </Button>
          </div>
        </div>
      </div>
      {}
      <div className="p-4">
        <motion.div
          key={activeChart}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {activeChart === "area" && (
            <Card className="bg-almost-black border-cliff-light-gray/20 p-6">
              <h3 className="text-sm font-semibold text-cliff-white mb-4">
                Tehdit Trendi (Son 7 Gün)
              </h3>
              <CustomAreaChart data={areaChartData} height={250} />
              {}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center">
                  <div className="text-xs text-cliff-light-gray">Kritik</div>
                  <div className="text-lg font-bold text-red-400">15</div>
                  <Badge className="text-xs bg-red-950/50 text-red-400 border-red-500/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +25%
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xs text-cliff-light-gray">Yüksek</div>
                  <div className="text-lg font-bold text-orange-400">41</div>
                  <Badge className="text-xs bg-orange-950/50 text-orange-400 border-orange-500/30">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -10%
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xs text-cliff-light-gray">Orta</div>
                  <div className="text-lg font-bold text-yellow-400">73</div>
                  <Badge className="text-xs bg-yellow-950/50 text-yellow-400 border-yellow-500/30">
                    <Activity className="w-3 h-3 mr-1" />
                    0%
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xs text-cliff-light-gray">Düşük</div>
                  <div className="text-lg font-bold text-green-400">112</div>
                  <Badge className="text-xs bg-green-950/50 text-green-400 border-green-500/30">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -5%
                  </Badge>
                </div>
              </div>
            </Card>
          )}
          {activeChart === "radar" && (
            <Card className="bg-almost-black border-cliff-light-gray/20 p-6">
              <h3 className="text-sm font-semibold text-cliff-white mb-4">
                Tehdit Kategorileri Analizi
              </h3>
              <div className="flex justify-center">
                <CustomRadarChart data={radarChartData} size={300} />
              </div>
              {}
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {radarChartData.map((item, index) => (
                  <Badge 
                    key={index}
                    variant="outline"
                    className="text-xs"
                  >
                    {item.axis}: {item.value}%
                  </Badge>
                ))}
              </div>
            </Card>
          )}
          {activeChart === "donut" && (
            <Card className="bg-almost-black border-cliff-light-gray/20 p-6">
              <h3 className="text-sm font-semibold text-cliff-white mb-4">
                Risk Dağılımı
              </h3>
              <div className="flex justify-center">
                <CustomDonutChart data={donutChartData} size={250} />
              </div>
            </Card>
          )}
        </motion.div>
        {}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card className="bg-almost-black border-cliff-light-gray/20 p-3">
            <div className="flex items-center justify-between">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-cliff-light-gray">Global</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-cliff-white">247</div>
              <div className="text-xs text-cliff-light-gray">Aktif Tehdit</div>
            </div>
          </Card>
          <Card className="bg-almost-black border-cliff-light-gray/20 p-3">
            <div className="flex items-center justify-between">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-xs text-cliff-light-gray">Güvenlik</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-cliff-white">92%</div>
              <div className="text-xs text-cliff-light-gray">Koruma Oranı</div>
            </div>
          </Card>
          <Card className="bg-almost-black border-cliff-light-gray/20 p-3">
            <div className="flex items-center justify-between">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-cliff-light-gray">Performans</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-cliff-white">1.2s</div>
              <div className="text-xs text-cliff-light-gray">Yanıt Süresi</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default InteractiveVisualizations