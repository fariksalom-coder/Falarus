/**
 * Retries referral rewards for confirmed payments and operator receipts that
 * have no final event (missed or failed), and reports ledger mismatches.
 * Idempotent; does nothing while the program is off.
 *
 *   node --import tsx server/scripts/reconcileReferralRewards.ts
 */
import 'dotenv/config';
import { pool } from '../lib/db.js';
import { ledgerMismatches, reconcileReferralRewards } from '../services/referralProgram.service.js';

const result = await reconcileReferralRewards(500);
const mismatches = await ledgerMismatches();
console.log(JSON.stringify({ at: new Date().toISOString(), ...result, ledger_mismatches: mismatches.length }));
if (mismatches.length) console.error('[referral] balance/ledger mismatch', mismatches.map((m) => ({ user: m.user_id, currency: m.currency })));
await pool?.end();
process.exit(mismatches.length || result.failed ? 1 : 0);
