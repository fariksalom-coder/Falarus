import { readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import type { DbClient } from '../types/dbClient';
import { invalidateAccessCache } from './subscription.service';
import { revokeAppleGrants } from './appleSignIn.service';

export function ownedAccountDirectories(userId: number, communityGroups: string[]): string[] {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('Invalid account id');
  const owned = ['user-avatars', 'teacher-videos', 'help-chat-media', 'community-reels', 'payment-proofs']
    .map(bucket => `${bucket}/${userId}`);
  for (const group of communityGroups) {
    if (!/^[a-z\d_-]+$/i.test(group)) throw new Error('Invalid community group');
    owned.push(`community-media/${group}/${userId}`);
  }
  return owned;
}

export async function purgeAccountFiles(storageRoot: string, userId: number): Promise<void> {
  let groups: string[] = [];
  try { groups = (await readdir(path.join(storageRoot, 'community-media'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  for (const relative of ownedAccountDirectories(userId, groups)) {
    const directory = path.resolve(storageRoot, relative);
    try {
      const actual = await realpath(directory);
      const root = await realpath(storageRoot);
      if (!actual.startsWith(root + path.sep)) throw new Error('Storage path escapes root');
      await rm(directory, { recursive: true, force: true });
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}

export async function processAccountDeletionJobs(db: DbClient, storageRoot: string): Promise<void> {
  const { data, error } = await db.from('account_file_deletion_jobs').select('user_id').order('created_at').limit(20);
  if (error) throw new Error('Account deletion queue unavailable');
  for (const job of data ?? []) {
    await purgeAccountFiles(storageRoot, Number(job.user_id));
    const { error: removeError } = await db.from('account_file_deletion_jobs').delete().eq('user_id', job.user_id);
    if (removeError) throw new Error('Account deletion queue update failed');
  }
}

export async function deleteAccount(db: DbClient, storageRoot: string, userId: number): Promise<void> {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('Invalid account id');
  await revokeAppleGrants(db, userId);
  // DB deletion + durable disk cleanup job commit atomically. A foreign-key
  // failure rolls both back; disk cleanup survives server restarts.
  const result = await db.rpc<boolean>('delete_own_account', { p_user_id: userId });
  if (result.error || !result.data) throw new Error('Account could not be deleted');
  invalidateAccessCache(userId);
  try { await processAccountDeletionJobs(db, storageRoot); }
  catch { console.error('[account deletion] File cleanup queued for retry'); }
}
