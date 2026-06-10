/**
 * Seed first admin and default pricing plans.
 * Run: ADMIN_EMAIL=admin@falarus.uz ADMIN_PASSWORD=yourpassword npx tsx server/scripts/seedAdmin.ts
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/dbFacadeClient';

const email = process.env.ADMIN_EMAIL || 'admin@falarus.uz';
const password = process.env.ADMIN_PASSWORD || 'admin123';

async function main() {
  const hash = await bcrypt.hash(password, 10);

  const { data: existing } = await supabase.from('admins').select('id').eq('email', email).maybeSingle();
  if (existing) {
    await supabase.from('admins').update({ password_hash: hash }).eq('email', email);
    console.log('Admin password updated for', email);
  } else {
    await supabase.from('admins').insert({ email, password_hash: hash });
    console.log('Admin created:', email);
  }

  const { count } = await supabase.from('pricing_plans').select('*', { count: 'exact', head: true });
  if ((count ?? 0) === 0) {
    await supabase.from('pricing_plans').insert([
      { plan_name: 'Monthly', duration_days: 30, price: 99000, discount_percent: 0, active: true },
      { plan_name: '3 Months', duration_days: 90, price: 249000, discount_percent: 15, active: true },
      { plan_name: 'Yearly', duration_days: 365, price: 799000, discount_percent: 30, active: true },
    ]);
    console.log('Pricing plans seeded.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
