"use client";

import { useState } from "react";

export function SchemaSetup({
  sql,
  editorUrl,
}: {
  sql: string;
  editorUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copySql() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      return;
    } catch {
      const area = document.createElement("textarea");
      area.value = sql;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      if (copied) setCopied(true);
    }
  }

  return (
    <div className="w-full max-w-[460px]">
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">One step left</p>
      <h2 className="mt-3 font-display text-4xl tracking-tight text-ink">
        Prepare the tables
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        GP Inventory keeps its own tables, all named with <span className="text-ink">gp_</span>,
        inside the connected Supabase project. Run the migration once in the SQL editor,
        then come back and create the admin.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={editorUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center rounded-2xl bg-copper-deep px-4 text-sm text-white hover:bg-[#9b0c18]"
        >
          Open SQL editor
        </a>
        <button
          type="button"
          onClick={copySql}
          className="inline-flex h-11 items-center rounded-2xl border border-line bg-white px-4 text-sm text-ink hover:border-copper"
        >
          {copied ? "Copied" : "Copy migration"}
        </button>
      </div>
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-muted">Show the SQL</summary>
        <pre className="mt-3 max-h-64 overflow-auto rounded-2xl bg-ink p-4 text-xs leading-5 text-[#e7eaee]">
          {sql}
        </pre>
      </details>
    </div>
  );
}

export function ConnectionIssue({ message }: { message: string }) {
  return (
    <div className="w-full max-w-[420px]">
      <p className="text-[11px] tracking-[0.2em] text-muted uppercase">Connection</p>
      <h2 className="mt-3 font-display text-4xl tracking-tight text-ink">
        Supabase did not answer
      </h2>
      <p className="mt-3 text-sm leading-6 text-danger">{message}</p>
    </div>
  );
}
