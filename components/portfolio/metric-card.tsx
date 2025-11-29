import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  tooltip?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'info'
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  tooltip,
  icon,
  trend,
  variant = 'default',
}: MetricCardProps) {
  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-green-500 bg-green-50/50',
    warning: 'border-yellow-500 bg-yellow-50/50',
    info: 'border-blue-500 bg-blue-50/50',
  }

  const variantTextColors = {
    default: 'text-foreground',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700',
  }

  return (
    <Card className={cn('transition-all hover:shadow-md', variantStyles[variant])}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold', variantTextColors[variant])}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={cn(
            'text-sm font-medium mt-2 flex items-center gap-1',
            trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : 'text-muted-foreground'
          )}>
            {trend.value > 0 ? '↑' : trend.value < 0 ? '↓' : '→'}
            {Math.abs(trend.value).toFixed(1)}% {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
