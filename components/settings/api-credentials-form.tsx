'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Key, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApiCredentialsFormProps {
  walletAddress: string;
  onCredentialsSaved?: () => void;
}

export function ApiCredentialsForm({ walletAddress, onCredentialsSaved }: ApiCredentialsFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiPassphrase, setApiPassphrase] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!apiKey || !apiSecret || !apiPassphrase) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/user/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          apiKey,
          apiSecret,
          apiPassphrase,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Clear form
        setApiKey('');
        setApiSecret('');
        setApiPassphrase('');

        if (onCredentialsSaved) {
          onCredentialsSaved();
        }
      } else {
        setError(data.error || 'Failed to save credentials');
      }
    } catch (err) {
      setError('Failed to save credentials');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Polymarket API Credentials
        </CardTitle>
        <CardDescription>
          Configure your Polymarket API credentials to automatically fetch your open orders and calculate Q-scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-sm font-semibold">How to get your API credentials:</p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Visit Polymarket Settings</li>
            <li>Navigate to the API section</li>
            <li>Create a new API key</li>
            <li>Copy the Key, Secret, and Passphrase</li>
            <li>Paste them below</li>
          </ol>
          <Button asChild variant="outline" size="sm" className="w-full mt-2">
            <a href="https://polymarket.com/settings/api" target="_blank" rel="noopener noreferrer">
              Open Polymarket Settings
              <ExternalLink className="ml-2 h-3 w-3" />
            </a>
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your Polymarket API Key"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Your Polymarket API Secret"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="apiPassphrase">API Passphrase</Label>
            <Input
              id="apiPassphrase"
              type="password"
              value={apiPassphrase}
              onChange={(e) => setApiPassphrase(e.target.value)}
              placeholder="Your Polymarket API Passphrase"
              className="mt-1"
            />
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">
              API credentials saved successfully! You can now scan for positions.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Key className="mr-2 h-4 w-4" />
              Save Credentials
            </>
          )}
        </Button>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground">
          ⚠️ Your API credentials are stored securely and used only to fetch your order data from Polymarket.
          Never share your credentials with anyone.
        </p>
      </CardContent>
    </Card>
  );
}
