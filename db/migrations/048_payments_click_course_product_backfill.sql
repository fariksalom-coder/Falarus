-- Click Shop kurs (Patent / VNZH) to‘lovlari ba‘zan `product_code = 'russian'` va `tariff_type = 'month'`
-- qolib ketgan (legacy insert + 032 migration NULL -> russian).
-- Admin va resolve uchun `product_code` ni to‘g‘rilaymiz (faqat my.click.uz havolasi + kurs summasi).

UPDATE payments
SET product_code = 'patent'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount = 67500
  AND payment_proof_url ILIKE '%my.click.uz/services/pay%';

UPDATE payments
SET product_code = 'vnzh'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount IN (435000, 1000)
  AND payment_proof_url ILIKE '%my.click.uz/services/pay%';
