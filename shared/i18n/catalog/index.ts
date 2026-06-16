import type { AppLocale } from '../languages';
import { deepMerge } from '../deepMerge';
import en from './en';
import hi from './hi';
import kk from './kk';
import ky from './ky';
import ru from './ru';
import tg from './tg';
import tk from './tk';
import type { DeepPartial, MessageCatalog } from './types';
import uz from './uz';

function mergeCatalog(overrides: DeepPartial<MessageCatalog>): MessageCatalog {
  return deepMerge(uz, overrides as Record<string, unknown>);
}

export const MESSAGE_CATALOGS: Record<AppLocale, MessageCatalog> = {
  uz,
  ru: mergeCatalog(ru),
  en: mergeCatalog(en),
  tg: mergeCatalog(tg),
  ky: mergeCatalog(ky),
  kk: mergeCatalog(kk),
  tk: mergeCatalog(tk),
  hi: mergeCatalog(hi),
};

export type { MessageCatalog, MessageValues } from './types';
