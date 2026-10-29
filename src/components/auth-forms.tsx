"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { createAdmin, signIn } from "@/app/actions/auth";
import type { ActionState } from "@/lib/types";

const fieldClass =
  "h-12 w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink outline-none transition placeholder:text-[#98a0aa] focus:border-copper focus:ring-4 focus:ring-copper/15";

const buttonClass =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl bg-copper-deep text-[15px] font-medium text-white transition hover:bg-[#9b0c18] disabled:cursor-wait disabled:opacity-70";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <FormShell
      eyebrow="Welcome back"
      title="Sign in"
      lede="Admins run the catalog. Employees sign in with the access they were given."
      notice={
        notice === "profile"
          ? "Signed out. That Supabase user has no GP Inventory profile."
          : undefined
      }
      state={state}
    >
      <form action={action} className="mt-8 grid gap-4">
        <Field label="Email" name="email" type="email" autoComplete="username" />
        <PasswordField autoComplete="current-password" />
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </FormShell>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState(createAdmin, null);

  return (
    <FormShell
      eyebrow="First account"
      title="Create the admin"
      lede="This shop has no admin yet. The first account runs the catalog and can hire floor staff."
      state={state}
    >
      <form action={action} className="mt-8 grid gap-4">
        <Field label="Full name" name="full_name" autoComplete="name" />
        <Field label="Email" name="email" type="email" autoComplete="username" />
        <PasswordField autoComplete="new-password" />
        <button type="submit" className={buttonClass} disabled={pending}>
          {pending ? "Creating…" : "Create admin account"}
        </button>
      </form>
    </FormShell>
  );
}

export function AuthFallback() {
  return (
    <div className="w-full max-w-[420px] animate-pulse">
      <div className="h-3 w-24 rounded-full bg-paper-deep" />
      <div className="mt-4 h-10 w-48 rounded-2xl bg-paper-deep" />
      <div className="mt-8 grid gap-4">
        <div className="h-12 rounded-2xl bg-white" />
        <div className="h-12 rounded-2xl bg-white" />
        <div className="h-12 rounded-2xl bg-paper-deep" />
      </div>
    </div>
  );
}

function FormShell({
  eyebrow,
  title,
  lede,
  notice,
  state,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  notice?: string;
  state: ActionState;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-[420px]">
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl tracking-tight text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{lede}</p>
      {notice ? <Banner tone="danger">{notice}</Banner> : null}
      {state?.error ? <Banner tone="danger">{state.error}</Banner> : null}
      {state?.message ? <Banner tone="ok">{state.message}</Banner> : null}
      {children}
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "danger" | "ok";
  children: ReactNode;
}) {
  const className =
    tone === "danger"
      ? "border-danger/20 bg-danger/5 text-danger"
      : "border-moss/20 bg-moss/10 text-moss";

  return (
    <p className={`mt-6 rounded-2xl border px-4 py-3 text-sm leading-6 ${className}`}>
      {children}
    </p>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-ink">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        spellCheck={false}
        className={fieldClass}
      />
    </label>
  );
}

function PasswordField({ autoComplete }: { autoComplete: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-2 text-sm text-ink">
      Password
      <span className="relative">
        <input
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          className={`${fieldClass} pr-16`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

export function useResetOnMessage(state: ActionState) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) formRef.current?.reset();
  }, [state]);

  return formRef;
}
