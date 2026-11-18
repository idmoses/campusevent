export function downloadCsv(name, rows) {
  if (!rows.length) return false;
  const keys = Object.keys(rows[0]);
  // Prefix risky leading characters so spreadsheets do not run them as formulas.
  const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: name });
  a.click(); URL.revokeObjectURL(a.href);
  return true;
}
