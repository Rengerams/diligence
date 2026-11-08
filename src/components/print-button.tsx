"use client";

export function PrintButton({ label = "Afdrukken" }: { label?: string }) {
  return (
    <button className="btn btn-secondary no-print" type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
