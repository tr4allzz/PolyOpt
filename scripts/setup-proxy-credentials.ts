/**
 * Setup API credentials for POLY_PROXY wallet usage
 * This script uses the official @polymarket/clob-client to derive credentials
 * that work with proxy wallets.
 *
 * Usage:
 *   PRIVATE_KEY=0x... PROXY_ADDRESS=0x... npx tsx scripts/setup-proxy-credentials.ts
 */

import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { prisma } from '../lib/prisma';
import { encryptCredentials } from '../lib/crypto/encryption';

const CLOB_URL = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon

async function main() {
  console.log('🔐 Polymarket Proxy Wallet Credential Setup\n');

  // Get credentials from environment
  const privateKey = process.env.PRIVATE_KEY;
  // Remove any accidental = prefix from proxy address
  let proxyAddress = process.env.PROXY_ADDRESS || '0x0327530C9B02E72Bcaf1dF09BECE3100d6b75e15';
  if (proxyAddress.startsWith('=')) {
    proxyAddress = proxyAddress.substring(1);
  }

  if (!privateKey) {
    console.error('❌ Missing PRIVATE_KEY environment variable');
    console.log('\nUsage:');
    console.log('  PRIVATE_KEY=0x... PROXY_ADDRESS=0x... npx tsx scripts/setup-proxy-credentials.ts');
    console.log('\nExample:');
    console.log('  PRIVATE_KEY=0xabc123... PROXY_ADDRESS=0x0327530C9B02E72Bcaf1dF09BECE3100d6b75e15 npx tsx scripts/setup-proxy-credentials.ts');
    process.exit(1);
  }

  // Add 0x prefix if not present
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

  // Create wallet from private key
  const wallet = new Wallet(formattedKey);
  const eoaAddress = await wallet.getAddress();
  console.log('📍 EOA Address:', eoaAddress);
  console.log('📍 Proxy Address:', proxyAddress);

  try {
    // Step 1: First, try to delete existing API keys
    console.log('\n🗑️ Attempting to revoke existing API keys...');
    const tempClient = new ClobClient(CLOB_URL, CHAIN_ID, wallet);

    try {
      // Try to get and delete existing keys
      const existingKeys = await tempClient.getApiKeys();
      console.log('   Existing keys:', existingKeys?.length || 0);

      if (existingKeys && existingKeys.length > 0) {
        for (const key of existingKeys) {
          try {
            await tempClient.deleteApiKey();
            console.log('   Deleted key:', key.apiKey?.substring(0, 10) + '...');
          } catch (e) {
            // Ignore deletion errors
          }
        }
      }
    } catch (e: any) {
      console.log('   Could not list/delete existing keys:', e.message);
    }

    // Step 2: Derive API key (retrieves existing or creates new)
    console.log('\n🔄 Deriving API credentials...');

    let creds: any;
    try {
      creds = await tempClient.deriveApiKey();
      console.log('✅ API credentials derived!');
    } catch (e: any) {
      console.log('   Derive failed:', e.message);
      console.log('   Trying to create new...');
      try {
        creds = await tempClient.createApiKey();
        console.log('✅ New API key created!');
      } catch (e2: any) {
        console.error('❌ Both derive and create failed');
        console.error('   Error:', e2.response?.data?.error || e2.message);
        process.exit(1);
      }
    }

    if (!creds || !creds.key) {
      console.error('❌ Failed to get API credentials');
      process.exit(1);
    }

    console.log('✅ API Credentials obtained:');
    console.log('   API Key:', creds.key);
    console.log('   Passphrase:', creds.passphrase?.substring(0, 20) + '...');

    // Step 3: Initialize proxy client with NEW credentials
    // signatureType: 0=EOA, 1=Magic/Email, 2=Browser Wallet (Metamask)
    console.log('\n🧪 Testing NEW credentials with proxy configuration...');
    const proxyClient = new ClobClient(
      CLOB_URL,
      CHAIN_ID,
      wallet,
      {
        key: creds.key,
        secret: creds.secret,
        passphrase: creds.passphrase,
      },
      2, // signatureType = Browser Wallet (Metamask, Coinbase Wallet)
      proxyAddress
    );

    // Test by fetching open orders
    try {
      const openOrders = await proxyClient.getOpenOrders();
      console.log('✅ Proxy client working! Open orders:', openOrders?.length || 0);
    } catch (e: any) {
      console.log('⚠️ Could not fetch open orders:', e.message);
    }

    // Step 4: Test placing a small order
    console.log('\n📦 Testing order placement with proxy...');
    try {
      // Get a token ID from database
      const dbMarket = await prisma.market.findFirst({
        where: { active: true },
        select: { clobTokenIds: true, question: true },
      });

      if (dbMarket?.clobTokenIds) {
        const tokenIds = JSON.parse(dbMarket.clobTokenIds);
        const tokenId = tokenIds[0];

        console.log('   Market:', dbMarket.question?.substring(0, 40) + '...');

        const order = await proxyClient.createOrder({
          tokenID: tokenId,
          price: 0.01, // Very low price, won't fill
          size: 1,
          side: 'BUY',
          feeRateBps: 0,
        });

        console.log('   Order created, posting...');
        const result = await proxyClient.postOrder(order);

        if (result.error) {
          console.log('❌ Order failed:', result.error);
        } else {
          console.log('✅ Order posted successfully!');
          // Cancel it
          if (result.orderID) {
            await proxyClient.cancelOrder({ orderID: result.orderID });
            console.log('   Order cancelled');
          }
        }
      }
    } catch (e: any) {
      console.log('❌ Order test failed:', e.message);
      if (e.response?.data) {
        console.log('   API error:', e.response.data.error);
      }
    }

    // Step 4: Save to database (including encrypted private key for server-side signing)
    console.log('\n💾 Saving credentials to database...');
    const encrypted = encryptCredentials({
      apiKey: creds.key,
      apiSecret: creds.secret,
      apiPassphrase: creds.passphrase,
    });

    // Also encrypt and store private key for server-side order signing
    const { encrypt } = await import('../lib/crypto/encryption');
    const encryptedPrivateKey = encrypt(formattedKey);

    await prisma.user.upsert({
      where: { walletAddress: eoaAddress.toLowerCase() },
      create: {
        walletAddress: eoaAddress.toLowerCase(),
        apiKey: encrypted.apiKey,
        apiSecret: encrypted.apiSecret,
        apiPassphrase: encrypted.apiPassphrase,
        encryptedPrivateKey: encryptedPrivateKey,
        funderAddress: proxyAddress.toLowerCase(),
        apiCreatedAt: new Date(),
      },
      update: {
        apiKey: encrypted.apiKey,
        apiSecret: encrypted.apiSecret,
        apiPassphrase: encrypted.apiPassphrase,
        encryptedPrivateKey: encryptedPrivateKey,
        funderAddress: proxyAddress.toLowerCase(),
        apiCreatedAt: new Date(),
      },
    });

    console.log('✅ Credentials saved to database!');

    console.log('\n🎉 Setup complete!');
    console.log('You can now place orders using your proxy wallet.');
    console.log('\nCredentials:');
    console.log('   API Key:', creds.key);
    console.log('   Funder:', proxyAddress);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
