'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignTypedData, useSwitchChain } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, CheckCircle2, AlertCircle, Sparkles, Network } from 'lucide-react';
import {
  CLOB_AUTH_DOMAIN,
  CLOB_AUTH_TYPES,
  createClobAuthValue,
  getCurrentTimestamp,
  POLYGON_CHAIN_ID,
} from '@/lib/polymarket/eip712-auth';

interface WalletCredentialsGeneratorProps {
  onCredentialsGenerated?: () => void;
}

export function WalletCredentialsGenerator({ onCredentialsGenerated }: WalletCredentialsGeneratorProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [generating, setGenerating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingGenerate, setPendingGenerate] = useState(false);

  // Get current chain ID from account (more reliable than useChainId)
  const chainId = chain?.id;

  // Check if user is on the correct network
  const isCorrectNetwork = chainId === POLYGON_CHAIN_ID;

  console.log('WalletCredentialsGenerator - Current chain:', {
    chainId,
    chainName: chain?.name,
    isCorrectNetwork,
    expectedChainId: POLYGON_CHAIN_ID,
    isConnected,
  });

  // Watch for successful network switch and auto-generate credentials
  useEffect(() => {
    if (pendingGenerate && isCorrectNetwork && !generating && !switching) {
      console.log('Network switched to Polygon! Auto-generating credentials...');
      setPendingGenerate(false);
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        handleGenerateAfterSwitch();
      }, 500);
    }
  }, [chainId, isCorrectNetwork, pendingGenerate, generating, switching]);

  const handleSwitchNetwork = async () => {
    setSwitching(true);
    setError(null);

    try {
      await switchChain({ chainId: POLYGON_CHAIN_ID });

      // Wait a moment for the connector to fully switch
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Network switched to Polygon successfully');
    } catch (err: any) {
      if (err.code === 4001) {
        setError('You rejected the network switch');
      } else {
        setError('Failed to switch network. Please switch to Polygon manually in your wallet.');
      }
      console.error('Error switching network:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleGenerate = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    console.log('handleGenerate called - chainId:', chainId);

    // If not on Polygon, trigger network switch and set pending flag
    if (!chainId || chainId !== POLYGON_CHAIN_ID) {
      try {
        console.log('Switching to Polygon...');
        setSwitching(true);
        setError(null);
        setPendingGenerate(true); // Flag to auto-generate after switch

        await switchChain({ chainId: POLYGON_CHAIN_ID });

        console.log('Network switch initiated, waiting for chain change...');
        // The useEffect will handle generating after the chain actually changes
        setSwitching(false);
      } catch (err: any) {
        setSwitching(false);
        setPendingGenerate(false);

        if (err.code === 4001 || err.message?.includes('rejected')) {
          setError('You rejected the network switch');
        } else {
          console.error('Network switch failed:', err);
          setError('Failed to switch network. Please switch to Polygon manually.');
        }
      }
      return;
    }

    // If already on Polygon, generate directly
    await handleGenerateAfterSwitch();
  };

  const handleGenerateAfterSwitch = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    // Final check
    if (!chainId || chainId !== POLYGON_CHAIN_ID) {
      setError('Must be on Polygon network');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      // Get current timestamp
      const timestamp = getCurrentTimestamp();
      const nonce = 0;

      // Create the typed data value
      const value = createClobAuthValue(address, timestamp, nonce);

      console.log('Signing typed data for CLOB authentication...', {
        domain: CLOB_AUTH_DOMAIN,
        types: CLOB_AUTH_TYPES,
        value,
        currentChainId: chainId,
      });

      // Ensure we're on the right network before signing
      if (chainId !== POLYGON_CHAIN_ID) {
        throw new Error(`Wrong network. Currently on chain ${chainId}, need chain ${POLYGON_CHAIN_ID}`);
      }

      // Sign the typed data using the user's wallet
      // wagmi expects specific types: address as `0x${string}` and nonce as bigint
      const signature = await signTypedDataAsync({
        domain: CLOB_AUTH_DOMAIN,
        types: CLOB_AUTH_TYPES,
        primaryType: 'ClobAuth',
        message: {
          address: address as `0x${string}`,
          timestamp,
          nonce: BigInt(nonce),
          message: value.message,
        },
      });

      console.log('Signature obtained:', signature);

      // Call our API to generate and store credentials
      const response = await fetch('/api/user/generate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          timestamp,
          nonce,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        if (onCredentialsGenerated) {
          onCredentialsGenerated();
        }
      } else {
        setError(data.error || 'Failed to generate credentials');
        console.error('API error:', data);
      }
    } catch (err: any) {
      // Check for various error types
      if (err.message?.includes('User rejected') || err.code === 4001) {
        setError('You rejected the signature request');
      } else if (err.message?.includes('chainId')) {
        setError('Wrong network detected. Please switch to Polygon network.');
      } else {
        setError(err.message || 'Failed to generate credentials');
      }
      console.error('Error generating credentials:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Get network name for display
  const getNetworkName = (id: number | undefined) => {
    if (!id) return 'Unknown';
    const networks: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
    };
    return networks[id] || `Chain ${id}`;
  };

  return (
    <Card className="border-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Automatic Credential Generation
        </CardTitle>
        <CardDescription>
          Generate API credentials instantly using your connected wallet. No manual entry required!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* How it works */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-purple-900">How it works:</p>
          <ol className="text-sm space-y-1 list-decimal list-inside text-purple-800">
            <li>Connect your Polygon wallet</li>
            <li>Sign a secure message (EIP-712) with your wallet</li>
            <li>Your API credentials are automatically generated and saved</li>
            <li>Start tracking your positions immediately</li>
          </ol>
        </div>

        {/* Wallet Status */}
        {!isConnected && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Please connect your wallet to use automatic generation
            </p>
          </div>
        )}

        {isConnected && address && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs text-muted-foreground">Connected Wallet</p>
              <p className="text-sm font-mono mt-1">{address}</p>
            </div>

            {/* Network Status */}
            <div className={`p-3 border rounded ${
              isCorrectNetwork
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className={`h-4 w-4 ${
                    isCorrectNetwork ? 'text-green-600' : 'text-orange-600'
                  }`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Current Network</p>
                    <p className={`text-sm font-medium ${
                      isCorrectNetwork ? 'text-green-800' : 'text-orange-800'
                    }`}>
                      {getNetworkName(chainId)}
                    </p>
                  </div>
                </div>

                {!isCorrectNetwork && (
                  <Button
                    onClick={handleSwitchNetwork}
                    disabled={switching}
                    size="sm"
                    variant="outline"
                  >
                    {switching ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      'Switch to Polygon'
                    )}
                  </Button>
                )}
              </div>

              {!isCorrectNetwork && (
                <p className="text-xs text-orange-700 mt-2">
                  ⚠️ Polymarket requires Polygon network for authentication
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status Messages */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">
              API credentials generated successfully! You can now scan for positions.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!isConnected || generating || switching || pendingGenerate}
          className="w-full"
          variant="default"
        >
          {switching || pendingGenerate ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {switching ? 'Switching Network...' : 'Waiting for Network Switch...'}
            </>
          ) : generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : !isCorrectNetwork ? (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Generate Credentials (Will Switch to Polygon)
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Generate Credentials with Wallet
            </>
          )}
        </Button>

        {/* Security Note */}
        <p className="text-xs text-muted-foreground">
          🔒 This uses EIP-712 signing - a secure, industry-standard method.
          You maintain full control of your wallet at all times.
        </p>
      </CardContent>
    </Card>
  );
}
