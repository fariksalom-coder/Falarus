import { Capacitor } from '@capacitor/core';

/** Play Market Android (yoki iOS) qobig‘ida ishlayaptimi. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}
