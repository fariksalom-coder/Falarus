import { useEffect } from 'react';
import { rememberKunlikOpenedDay } from '../utils/kunlikLastDay';

/** Kunlik ichki sahifaga kirganingizda oxirgi kun saqlansin — rejaga «назад» da ochiladi. */
export function useRememberKunlikDay(dayNum: number): void {
  useEffect(() => {
    rememberKunlikOpenedDay(dayNum);
  }, [dayNum]);
}
