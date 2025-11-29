import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Settings, Scan, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'completed' | 'current' | 'upcoming'
  action?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
}

interface OnboardingStepperProps {
  isConnected: boolean
  hasCredentials: boolean
  hasPositions: boolean
  onSetupCredentials: () => void
  onScanPositions: () => void
  scanning: boolean
}

export function OnboardingStepper({
  isConnected,
  hasCredentials,
  hasPositions,
  onSetupCredentials,
  onScanPositions,
  scanning,
}: OnboardingStepperProps) {
  const steps: Step[] = [
    {
      id: 'connect',
      title: 'Connect Wallet',
      description: 'Link your wallet to track positions',
      icon: <Circle className="h-5 w-5" />,
      status: isConnected ? 'completed' : 'current',
    },
    {
      id: 'credentials',
      title: 'Setup API Credentials',
      description: 'Configure Polymarket API access',
      icon: <Settings className="h-5 w-5" />,
      status: !isConnected ? 'upcoming' : hasCredentials ? 'completed' : 'current',
      action: !hasCredentials && isConnected ? {
        label: 'Setup Now',
        onClick: onSetupCredentials,
      } : undefined,
    },
    {
      id: 'scan',
      title: 'Scan Positions',
      description: 'Find your active market positions',
      icon: <Scan className="h-5 w-5" />,
      status: !hasCredentials ? 'upcoming' : hasPositions ? 'completed' : 'current',
      action: hasCredentials && !hasPositions ? {
        label: scanning ? 'Scanning...' : 'Scan Now',
        onClick: onScanPositions,
        disabled: scanning,
      } : undefined,
    },
    {
      id: 'optimize',
      title: 'Optimize Portfolio',
      description: 'Get personalized recommendations',
      icon: <TrendingUp className="h-5 w-5" />,
      status: !hasPositions ? 'upcoming' : 'completed',
    },
  ]

  const allComplete = steps.every(s => s.status === 'completed')

  if (allComplete) return null

  return (
    <Card className="mb-8 border-blue-500 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
      <CardContent className="pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Getting Started</h3>
          <p className="text-sm text-muted-foreground">
            Follow these steps to set up your portfolio tracking
          </p>
        </div>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg transition-all",
                step.status === 'current' && "bg-white border border-blue-200",
                step.status === 'upcoming' && "opacity-50"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                step.status === 'completed' && "bg-green-100 text-green-600",
                step.status === 'current' && "bg-blue-100 text-blue-600",
                step.status === 'upcoming' && "bg-gray-100 text-gray-400"
              )}>
                {step.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {step.action && (
                <Button
                  size="sm"
                  onClick={step.action.onClick}
                  disabled={step.action.disabled}
                  className="flex-shrink-0"
                >
                  {step.action.label}
                </Button>
              )}
              {step.status === 'completed' && (
                <span className="text-xs text-green-600 font-medium flex-shrink-0">
                  Complete
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
