-- Polymarket Liquidity Rewards - Individual Transactions
--
-- This query fetches INDIVIDUAL reward transactions with dates from Polygon.
-- Use this query for the import script, NOT the aggregated totals query.
--
-- To use:
-- 1. Create a new query on Dune Analytics (https://dune.com)
-- 2. Paste this SQL
-- 3. Execute and save the query
-- 4. Note the Query ID from the URL (dune.com/queries/YOUR_ID)
-- 5. Update scripts/import-from-dune.ts with your Query ID

SELECT
  blocks.time AS block_time,
  CONCAT('0x', SUBSTRING(LOWER(TRY_CAST(logs.topic2 AS VARCHAR)), 27, 40)) AS recipient,
  CAST(varbinary_to_uint256(logs.data) AS decimal(38,0)) / POWER(10, 6) AS amount,
  logs.transaction_hash AS tx_hash,
  logs.block_number
FROM polygon.logs logs
INNER JOIN polygon.blocks blocks ON logs.block_number = blocks.number
WHERE
  logs.contract_address = FROM_HEX('2791Bca1f2de4661ED88A30C99A7a9449Aa84174')  -- USDC Contract
  AND logs.topic0 = FROM_HEX('ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')  -- Transfer Event
  AND logs.topic1 = FROM_HEX('000000000000000000000000c288480574783bd7615170660d71753378159c47')  -- Polymarket Rewards
ORDER BY blocks.time DESC;
