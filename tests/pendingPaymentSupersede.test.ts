import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExpiredClickPending,
  isExpiredGatewayPending,
  isExpiredRahmatPending,
  isGatewayCheckoutChannel,
} from '../shared/clickPayments';

const soatOldin = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
const daqiqaOldin = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString();

describe('tugatilmagan shlyuz to‘lovi foydalanuvchini qamab qo‘ymaydi', () => {
  describe('isGatewayCheckoutChannel', () => {
    it('Rahmat va Click kanallarini shlyuz deb biladi', () => {
      for (const ch of ['rahmat', 'click_button', 'click_auto_token', 'click_auto_cron']) {
        assert.equal(isGatewayCheckoutChannel(ch), true, `${ch} shlyuz bo‘lishi kerak`);
      }
    });

    it('chek yuklangan `manual` yozuvni shlyuz demaydi', () => {
      // Bu muhim: `manual` pending ortida adminning ko‘rishi kerak bo‘lgan
      // haqiqiy hujjat bor, uni yangi so‘rov bilan bekor qilib bo‘lmaydi.
      assert.equal(isGatewayCheckoutChannel('manual'), false);
      assert.equal(isGatewayCheckoutChannel(null), false);
      assert.equal(isGatewayCheckoutChannel(''), false);
    });
  });

  describe('isExpiredGatewayPending', () => {
    it('eski Rahmat checkoutini muddati o‘tgan deb belgilaydi (24 soatdan keyin)', () => {
      const row = { payment_channel: 'rahmat', created_at: soatOldin(50 * 24) };
      // Aynan shu yerda eski kod adashardi.
      assert.equal(isExpiredClickPending(row), false, 'click tekshiruvi rahmat’ni tanimaydi');
      assert.equal(isExpiredRahmatPending(row), true);
      assert.equal(isExpiredGatewayPending(row), true);
    });

    it('yangi Rahmat checkoutiga tegmaydi (24 soat ichida)', () => {
      const row = { payment_channel: 'rahmat', created_at: soatOldin(2) };
      assert.equal(isExpiredGatewayPending(row), false);
    });

    it('eski Click checkoutini muddati o‘tgan deb belgilaydi (5 daqiqadan keyin)', () => {
      const row = { payment_channel: 'click_button', created_at: daqiqaOldin(30) };
      assert.equal(isExpiredGatewayPending(row), true);
    });

    it('yangi Click checkoutiga tegmaydi', () => {
      const row = { payment_channel: 'click_button', created_at: daqiqaOldin(1) };
      assert.equal(isExpiredGatewayPending(row), false);
    });

    it('chek yuklangan `manual` to‘lovni hech qachon muddati o‘tgan demaydi', () => {
      const row = { payment_channel: 'manual', created_at: soatOldin(100 * 24) };
      assert.equal(isExpiredGatewayPending(row), false);
    });

    it('sana buzuq bo‘lsa yozuvni o‘chirmaydi', () => {
      assert.equal(isExpiredGatewayPending({ payment_channel: 'rahmat', created_at: 'axlat' }), false);
      assert.equal(isExpiredGatewayPending({ payment_channel: 'rahmat', created_at: null }), false);
    });

    it('created_at bo‘lmasa payment_time ga tayanadi', () => {
      const row = { payment_channel: 'rahmat', created_at: null, payment_time: soatOldin(48) };
      assert.equal(isExpiredGatewayPending(row), true);
    });
  });

  describe('prodda uchragan holat', () => {
    it('50 kun turgan Rahmat pending yangi chek yuklashni to‘smaydi', () => {
      // Prod yozuvi: id 353, user 1586, 299 000 so‘m, rahmat, 50 kun pending.
      const pending = { payment_channel: 'rahmat', created_at: soatOldin(50 * 24) };
      const chekYuklandi = true;

      const supersede = chekYuklandi && isGatewayCheckoutChannel(pending.payment_channel);
      assert.equal(supersede, true, 'chek eski shlyuz yozuvidan ustun bo‘lishi kerak');
    });

    it('adminda ko‘rilmagan chek turgan bo‘lsa ikkinchi chek qabul qilinmaydi', () => {
      const pending = { payment_channel: 'manual', created_at: soatOldin(1) };
      const chekYuklandi = true;

      const supersede = chekYuklandi && isGatewayCheckoutChannel(pending.payment_channel);
      assert.equal(supersede, false, 'manual chek ustidan o‘tilmasligi kerak');
    });
  });
});
