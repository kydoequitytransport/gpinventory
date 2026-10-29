"use client";

import { useActionState } from "react";
import { registerEmployee } from "@/app/actions/team";
import { useResetOnMessage } from "@/components/auth-forms";
import type { Profile } from "@/lib/types";
import { initials, shortDate } from "@/lib/format";

const fieldClass =
  "h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink outline-none transition placeholder:text-[#98a0aa] focus:border-copper focus:ring-4 focus:ring-copper/15";

export function TeamPanel({
  people,
  currentId,
}: {
  people: Profile[];
  currentId: string;
}) {
  const [state, action, pending] = useActionState(registerEmployee, null);
  const formRef = useResetOnMessage(state);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
      <section className="desk-card rounded-[28px] p-6 sm:p-7">
        <h2 className="font-display text-3xl tracking-tight">Hire someone</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          They sign in as floor staff. Hiring and the rest of the shop stay with you.
        </p>
        {state?.error ? (
          <p className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state?.message ? (
          <p className="mt-5 rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">
            {state.message}
          </p>
        ) : null}
        <form ref={formRef} action={action} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            Full name
            <input name="full_name" autoComplete="name" required className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm">
            Email
            <input
              name="email"
              type="email"
              autoComplete="off"
              required
              spellCheck={false}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Temporary password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={fieldClass}
            />
          </label>
          <p className="text-xs leading-5 text-muted">
            At least 8 characters. Give it to them through a channel you trust.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-copper-deep text-sm font-medium text-white transition hover:bg-[#9b0c18] disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? "Adding…" : "Register employee"}
          </button>
        </form>
      </section>

      <section className="desk-card rounded-[28px] p-6 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl tracking-tight">People</h2>
          <p className="text-sm text-muted">{people.length} on staff</p>
        </div>
        <ul className="mt-6 divide-y divide-line">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-4 py-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-deep text-xs font-medium text-ink">
                {initials(person.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {person.full_name}
                  {person.id === currentId ? (
                    <span className="ml-2 text-xs font-normal text-muted">You</span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted">{person.email}</p>
              </div>
              <div className="hidden text-right sm:block">
                <RolePill role={person.role} />
                <p className="mt-1 text-xs text-muted">{shortDate(person.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RolePill({ role }: { role: Profile["role"] }) {
  const admin = role === "admin";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase ${
        admin ? "bg-copper/10 text-copper-deep" : "bg-moss/10 text-moss"
      }`}
    >
      {admin ? "Admin" : "Employee"}
    </span>
  );
}
