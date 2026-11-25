'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const FAQ = [
  {
    question: 'How do I add a new society?',
    answer:
      'Open Society Setup from the sidebar, then choose “Register a society”. Once the society exists, open it to add buildings, floors and flats.',
  },
  {
    question: 'How do I give a teammate access?',
    answer:
      'Platform administrators can open a company from Companies and use Company users to create users, assign roles and reset passwords. Company administrators can manage users and roles inside their own company workspace.',
  },
  {
    question: 'Why is a module not available?',
    answer:
      'Business modules are enabled per company. A platform administrator can open the company, go to Module entitlements and enable the module. Core modules are always enabled.',
  },
  {
    question: 'What happens when I enable or disable a module?',
    answer:
      'Module changes are dependency-checked and audited. A module can only be enabled when the modules it requires are enabled, and it cannot be disabled while other enabled modules depend on it.',
  },
  {
    question: 'How do I reset a user password?',
    answer:
      'Open Company users, find the user, enter a new password with a reason and choose Reset password. All active sessions for that user are revoked immediately.',
  },
  {
    question: 'Where can I review who changed something?',
    answer:
      'Platform administrators can open Audit logs from the sidebar and filter by company, action or result. Company administrators can review audit history for their own workspace.',
  },
  {
    question: 'Is company data separated?',
    answer:
      'Yes. Every request is resolved against a server-derived company context. Permissions and module entitlements are evaluated before any record is read or changed.',
  },
  {
    question: 'What should I do if a page says Access denied?',
    answer:
      'Ask your administrator to confirm your role and the company module entitlements. Platform roles and company roles are separate, and company users cannot access the platform console.',
  },
];

export function HelpFaq() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return FAQ;
    return FAQ.filter((item) =>
      `${item.question} ${item.answer}`.toLowerCase().includes(term),
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search help topics…"
          className="pl-9"
          aria-label="Search help topics"
        />
      </div>

      {results.length === 0 ? (
        <div className="society-empty">
          <h3>No matching topics</h3>
          <p>Try a different word, such as “module”, “password” or “society”.</p>
        </div>
      ) : (
        <div className="landing-faq-list">
          {results.map((item) => (
            <details className="landing-faq-item" key={item.question}>
              <summary className="landing-faq-question">
                {item.question}
                <span className="text-ink-400" aria-hidden="true">+</span>
              </summary>
              <p className="landing-faq-answer">{item.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
