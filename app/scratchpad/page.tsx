import Link from 'next/link';
import { getScratchpad } from '@/lib/db/scratchpad';
import { ScratchpadEditor } from '@/components/ScratchpadEditor';
import { isReadOnly } from '@/lib/readOnly';

export default async function ScratchpadPage() {
  const content = await getScratchpad();

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
          Scratchpad
        </h1>
        <Link href="/" className="btn-secondary">
          ← Back
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        Low-commitment listings — paste links here before they earn a full card.
      </p>
      <ScratchpadEditor initialContent={content} readOnly={isReadOnly()} />
    </main>
  );
}
