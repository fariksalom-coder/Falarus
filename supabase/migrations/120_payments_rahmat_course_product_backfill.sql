-- Rahmat kurs (Patent / VNZH) to‘lovlari ba‘zan `product_code = 'russian'` qolib ketgan
-- (legacy insert default yoki 032 migration). Click uchun 048 mavjud; Rahmat uchun alohida.

UPDATE payments
SET product_code = 'patent'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount = 67500
  AND payment_channel = 'rahmat';

UPDATE payments
SET product_code = 'patent'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount = 67500
  AND payment_proof_url ILIKE '%rhmt.uz%';

UPDATE payments
SET product_code = 'patent'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount = 67500
  AND payment_proof_url ILIKE '%multicard.uz%';

UPDATE payments
SET product_code = 'vnzh'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount IN (435000, 1000)
  AND payment_channel = 'rahmat';

UPDATE payments
SET product_code = 'vnzh'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount IN (435000, 1000)
  AND payment_proof_url ILIKE '%rhmt.uz%';

UPDATE payments
SET product_code = 'vnzh'
WHERE product_code = 'russian'
  AND currency = 'UZS'
  AND amount IN (435000, 1000)
  AND payment_proof_url ILIKE '%multicard.uz%';
