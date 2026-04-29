/**
 * One-off backfill: legacy users.phone → phone_normalized / phone_raw / country_code / phone_invalid.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run: npx tsx scripts/normalize-phone-backfill.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { normalizePhoneInputToE164 } from '../shared/phoneE164.ts';

const BATCH = 200;

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  let lastId = 0;
  let updated = 0;
  let skipped = 0;
  let conflicts = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from('users')
      .select('id, phone')
      .not('phone', 'is', null)
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(BATCH);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!rows?.length) break;

    for (const row of rows) {
      lastId = Number(row.id);
      const raw = row.phone != null ? String(row.phone).trim() : '';
      if (!raw) continue;

      const norm = normalizePhoneInputToE164(raw);

      if (!norm.e164 || norm.invalid) {
        const { error: upErr } = await supabase
          .from('users')
          .update({
            phone_raw: raw,
            phone_normalized: null,
            country_code: null,
            phone_invalid: true,
          })
          .eq('id', row.id);
        if (upErr) {
          console.error(`id=${row.id}`, upErr.message);
          skipped++;
        } else {
          updated++;
        }
        continue;
      }

      const { data: dup } = await supabase
        .from('users')
        .select('id')
        .eq('phone_normalized', norm.e164)
        .neq('id', row.id)
        .maybeSingle();

      if (dup) {
        console.warn(`Conflict: id=${row.id} normalizes to ${norm.e164}, already claimed by another row`);
        conflicts++;
        await supabase
          .from('users')
          .update({
            phone_raw: raw,
            phone_normalized: null,
            country_code: null,
            phone_invalid: true,
          })
          .eq('id', row.id);
        continue;
      }

      const { error: upErr } = await supabase
        .from('users')
        .update({
          phone_raw: raw,
          phone_normalized: norm.e164,
          country_code: norm.countryIso,
          phone_invalid: false,
          phone: norm.e164,
        })
        .eq('id', row.id);

      if (upErr) {
        if (upErr.code === '23505') {
          conflicts++;
          console.warn(`Unique violation id=${row.id} e164=${norm.e164}`);
        } else {
          console.error(`id=${row.id}`, upErr.message);
        }
        skipped++;
      } else {
        updated++;
      }
    }
  }

  console.log(`Done. Updated/fixed rows: ${updated}, skipped/errors: ${skipped}, conflicts: ${conflicts}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
