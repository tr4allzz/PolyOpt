import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Users, MessageSquare, Share2, Sparkles } from 'lucide-react'

export default function CommunityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-6 p-4 rounded-full bg-primary/10">
            <Users className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-4xl font-bold mb-4">Community</h1>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Coming Soon</span>
          </div>

          <p className="text-muted-foreground max-w-md mb-8">
            We're building a space for liquidity providers to connect, share strategies, and discuss market insights.
          </p>

          <Card className="max-w-lg w-full">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">What to expect:</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Share and discover LP strategies</span>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Real-time market discussions</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Connect with top traders</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
