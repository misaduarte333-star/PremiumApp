'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon | React.ReactNode
  color?: 'amber' | 'green' | 'red' | 'blue' | 'purple' | 'emerald'
  trend?: {
    value: number
    isPositive: boolean
  } | string
  status?: 'success' | 'warning'
  className?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  trend,
  status,
  className
}: KPICardProps) {
  const variants = {
    amber: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30",
    green: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30",
    emerald: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30",
    red: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30",
    blue: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
    purple: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30",
  }

  const colorStyles = variants[color] || variants.blue

  // Handle both LucideIcon component (function or forwardRef object) and passed-in React node
  const renderIcon = () => {
    if (!icon) return null
    
    // 1. If it's already a React element (e.g., <CalendarIcon />)
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, {
        className: cn("w-4 h-4", (icon.props as any)?.className)
      })
    }
    
    // 2. If it's a component type (e.g., CalendarIcon)
    const isComponent = typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as any))
    
    if (isComponent) {
      const IconComp = icon as any
      return <IconComp className="w-4 h-4" />
    }
    
    return icon as React.ReactNode
  }

  return (
    <Card className={cn(
      "glass-card border-border/10 rounded-2xl overflow-hidden group hover:bg-foreground/[0.02] transition-all duration-500",
      className
    )}>
      <CardContent className="p-3.5 sm:p-5">
        <div className="flex justify-between items-start mb-3 gap-1">
          <div className={cn(
            "w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] shrink-0",
            colorStyles
          )}>
            {renderIcon()}
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-black tracking-tight shrink-0",
              typeof trend === 'string' 
                ? "bg-emerald-500/10 text-emerald-500"
                : trend.isPositive 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-rose-500/10 text-rose-500"
            )}>
              {typeof trend === 'object' && (
                trend.isPositive ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              )}
              {typeof trend === 'string' ? trend : `${trend.value}%`}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[8px] xs:text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.12em] sm:tracking-[0.15em] leading-tight truncate" title={title}>
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-lg xs:text-xl sm:text-2xl font-black font-display text-foreground tracking-tight truncate" title={String(value)}>
              {value}
            </h3>
            {status === 'warning' && (
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 animate-pulse shrink-0" />
            )}
          </div>
          {subtitle && (
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider truncate" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}