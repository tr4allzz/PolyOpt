/**
 * Compare order format between official ClobClient and our browser implementation
 * This helps debug why browser-signed orders get "invalid signature"
 */

import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { prisma } from '../lib/prisma';
import { decryptCredentials, decrypt } from '../lib/crypto/encryption';

const CLOB_URL = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

async function main() {
  console.log('🔍 Comparing order formats...\n');

  // Get user credentials
  const walletAddress = '0x581b80994f768da1bd793cC32FB8B3581E3422D1'.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: {
      apiKey: true,
      apiSecret: true,
      apiPassphrase: true,
      funderAddress: true,
      encryptedPrivateKey: true,
    },
  });

  if (!user?.apiKey || !user?.encryptedPrivateKey) {
    console.error('❌ No credentials found for', walletAddress);
    process.exit(1);
  }

  // Decrypt credentials
  const creds = decryptCredentials({
    apiKey: user.apiKey,
    apiSecret: user.apiSecret!,
    apiPassphrase: user.apiPassphrase!,
  });
  const privateKey = decrypt(user.encryptedPrivateKey);

  // Get a test market
  const market = await prisma.market.findFirst({
    where: { active: true },
    select: { clobTokenIds: true, question: true },
  });

  if (!market?.clobTokenIds) {
    console.error('❌ No active market found');
    process.exit(1);
  }

  const tokenIds = JSON.parse(market.clobTokenIds);
  const tokenId = tokenIds[0]; // YES token

  console.log('📍 EOA Address:', walletAddress);
  console.log('📍 Proxy Address:', user.funderAddress);
  console.log('📍 Market:', market.question?.substring(0, 50) + '...');
  console.log('📍 Token ID:', tokenId);
  console.log();

  // Create wallet and ClobClient
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new Wallet(formattedKey);
  const eoaAddress = await wallet.getAddress();

  console.log('🔑 Wallet address from private key:', eoaAddress);
  console.log();

  // Initialize ClobClient with proxy configuration
  // signatureType: 0=EOA, 1=Magic, 2=Browser Wallet
  const client = new ClobClient(
    CLOB_URL,
    CHAIN_ID,
    wallet,
    {
      key: creds.apiKey,
      secret: creds.apiSecret,
      passphrase: creds.apiPassphrase,
    },
    2, // Browser Wallet signature type
    user.funderAddress! // Proxy/funder address
  );

  // Test order parameters
  const price = 0.50;
  const size = 5;
  const side = 'BUY';

  console.log('📦 Creating order with OFFICIAL ClobClient...');
  console.log('   Price:', price);
  console.log('   Size:', size);
  console.log('   Side:', side);
  console.log();

  try {
    // Get tick size and neg risk
    const tickSize = await client.getTickSize(tokenId);
    console.log('   Tick size:', tickSize);

    // Check neg risk
    const negRisk = await client.getNegRisk(tokenId);
    console.log('   Neg risk:', negRisk);
    console.log();

    // Create order using official client
    const officialOrder = await client.createOrder({
      tokenID: tokenId,
      price: price,
      size: size,
      side: side as 'BUY' | 'SELL',
      feeRateBps: 0,
    });

    console.log('📋 OFFICIAL ORDER:');
    console.log(JSON.stringify(officialOrder, null, 2));
    console.log();

    // Now compare with what our browser implementation would create
    console.log('📋 BROWSER IMPLEMENTATION COMPARISON:');

    // Calculate amounts the way our browser implementation does
    const DECIMALS = 1e6;
    const roundedPrice = Math.round(price * 100) / 100;
    const priceInUnits = Math.round(roundedPrice * DECIMALS);
    const sizeInUnits = Math.round(size * DECIMALS);

    const browserMakerAmount = Math.round(priceInUnits * size).toString();
    const browserTakerAmount = sizeInUnits.toString();

    console.log('   Browser makerAmount:', browserMakerAmount);
    console.log('   Official makerAmount:', officialOrder.makerAmount);
    console.log('   Match:', browserMakerAmount === officialOrder.makerAmount);
    console.log();
    console.log('   Browser takerAmount:', browserTakerAmount);
    console.log('   Official takerAmount:', officialOrder.takerAmount);
    console.log('   Match:', browserTakerAmount === officialOrder.takerAmount);
    console.log();

    // Check addresses
    console.log('   Browser maker would be:', user.funderAddress);
    console.log('   Official maker:', officialOrder.maker);
    console.log('   Maker match:', user.funderAddress?.toLowerCase() === officialOrder.maker.toLowerCase());
    console.log();
    console.log('   Browser signer would be:', eoaAddress);
    console.log('   Official signer:', officialOrder.signer);
    console.log('   Signer match:', eoaAddress.toLowerCase() === officialOrder.signer.toLowerCase());
    console.log();

    // Show the domain/contract info
    console.log('📍 Contract addresses:');
    console.log('   Our negRiskExchange:', '0xC5d563A36AE78145C45a50134d48A1215220f80a');
    console.log('   Regular exchange:', '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E');
    console.log('   Market uses negRisk:', negRisk);
    console.log();

    // Try to post and cancel to verify signature works
    console.log('🧪 Testing signature by posting order...');
    const result = await client.postOrder(officialOrder);
    console.log('✅ Order posted:', result);

    if (result.orderID) {
      await client.cancelOrder({ orderID: result.orderID });
      console.log('✅ Order cancelled');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   API error:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
