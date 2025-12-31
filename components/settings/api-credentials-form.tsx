'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Key, ExternalLink, AlertCircle } from 'lucide-react';

interface ApiCredentialsFormProps {
  walletAddress: string;
  onCredentialsSaved?: () => void;
}

/**
 * API Credentials Form
 * ⚠️ DISABLED: We no longer store API credentials for security reasons.
 */
export function ApiCredentialsForm({ walletAddress, onCredentialsSaved }: ApiCredentialsFormProps) {
  return (
    <Card className="border-yellow-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Credentials
        </CardTitle>
        <CardDescription>
          API credential storage has been disabled for security.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Disabled Notice */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm font-semibold text-yellow-900">Feature Disabled</p>
          </div>
          <p className="text-sm text-yellow-800">
            For security reasons, we no longer store API credentials or private keys on our servers.
            Please use Polymarket directly for trading operations.
          </p>
        </div>

        {/* Link to Polymarket */}
        <Button asChild variant="outline" className="w-full">
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer">
            Go to Polymarket
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>

        {/* Info about what still works */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">What still works:</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>View LP rewards and leaderboard</li>
            <li>Discover high-reward markets</li>
            <li>Calculate optimal order prices</li>
            <li>View your Wrapped stats</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
