'use client';

import { useActionState } from 'react';
import { createTeamAction } from './actions';
import type { CreateTeamResult } from './actions';

const ERROR_MESSAGES: Record<string, string> = {
  name_taken: 'ეს სახელი უკვე დაკავებულია. სცადე სხვა.',
  team_exists: 'შენ უკვე გყავს გუნდი.',
  unauthenticated: 'გთხოვ შედი სისტემაში.',
  unknown: 'შეცდომა. სცადე კიდევ ერთხელ.',
};

export default function CreateTeamPage() {
  const [state, action, pending] = useActionState<CreateTeamResult | null, FormData>(
    createTeamAction,
    null,
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">⚽</div>
          <h1 className="text-2xl font-bold text-white">PlayManager</h1>
          <p className="text-sm text-white/50">შეარქვი სახელი შენს გუნდს</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="team_name" className="text-xs text-white/60 uppercase tracking-wider">
              გუნდის სახელი
            </label>
            <input
              id="team_name"
              name="team_name"
              type="text"
              required
              minLength={3}
              maxLength={30}
              placeholder="FC თბილისი..."
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20
                         text-white placeholder:text-white/30 focus:outline-none
                         focus:border-green-500 transition"
            />
          </div>

          {state && !state.success && (
            <p className="text-sm text-red-400">
              {ERROR_MESSAGES[state.error] ?? ERROR_MESSAGES.unknown}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500
                       text-white font-semibold transition disabled:opacity-50"
          >
            {pending ? 'იქმნება...' : 'გუნდის შექმნა'}
          </button>
        </form>

        <p className="text-center text-xs text-white/30">
          გუნდთან ერთად მიიღებ 15 მოთამაშეს და 1 000 PM₾
        </p>
      </div>
    </div>
  );
}
