// NEXT_PUBLIC_-prefixed so this same check works in both server actions and
// client components (e.g. a shared Codespace set to view-only, kept separate
// from an always-editable local instance) without needing a context provider.
export function isReadOnly(): boolean {
  return process.env.NEXT_PUBLIC_READ_ONLY === 'true';
}

export function assertNotReadOnly(): void {
  if (isReadOnly()) {
    throw new Error('This is a read-only view — changes are disabled.');
  }
}
