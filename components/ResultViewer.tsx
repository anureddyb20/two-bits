"use client";

import React, { useState } from "react";

interface ResultViewerProps {
  result: string;
}

/**
 * Formats inline markdown syntax such as **bold** and `code`.
 */
function formatInlineText(text: string): React.ReactNode {
  // Regex to split by bold (**...**) and inline code (`...`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="code-tag">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Parses markdown pipe tables into structured rows.
 */
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (tableLines.length < 2) return null;

  // Header line
  const headerLine = tableLines[0];
  const headers = headerLine
    .slice(1, -1)
    .split("|")
    .map((h) => h.trim());

  // Check if second line is a separator line (e.g. |---|---|)
  const separatorLine = tableLines[1];
  const isSeparator = /^\|(\s*[-:]+[-|\s:]*)\|$/.test(separatorLine);

  const dataLines = isSeparator ? tableLines.slice(2) : tableLines.slice(1);
  const rows = dataLines.map((line) =>
    line
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim())
  );

  return { headers, rows };
}

export function ResultViewer({ result }: ResultViewerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  // Check if result contains pipe table
  const hasPipeTable = result.includes("|") && result.includes("\n|");

  if (!hasPipeTable) {
    // Normal text formatting with paragraph splits
    const paragraphs = result.split(/\n\s*\n/);
    const isLong = result.length > 500;
    const displayParagraphs = isLong && !expanded ? [paragraphs[0]] : paragraphs;

    return (
      <div className="space-y-2 mt-1">
        {displayParagraphs.map((p, idx) => (
          <p key={idx} className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {formatInlineText(p)}
          </p>
        ))}
        {isLong && (
          <button
            type="button"
            className="text-xs text-[var(--accent-blue)] hover:underline mt-1 cursor-pointer font-medium"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show full output"}
          </button>
        )}
      </div>
    );
  }

  // Handle markdown table + surrounding text
  const rawLines = result.split("\n");
  const preTableLines: string[] = [];
  const tableLines: string[] = [];
  const postTableLines: string[] = [];

  let state: "pre" | "table" | "post" = "pre";

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      state = "table";
      tableLines.push(trimmed);
    } else if (state === "table") {
      state = "post";
      postTableLines.push(trimmed);
    } else if (state === "pre") {
      preTableLines.push(trimmed);
    } else {
      postTableLines.push(trimmed);
    }
  }

  const tableData = parseMarkdownTable(tableLines.join("\n"));

  return (
    <div className="mt-2 space-y-3">
      {/* Preamble */}
      {preTableLines.filter(Boolean).length > 0 && (
        <div className="space-y-1">
          {preTableLines.filter(Boolean).map((line, idx) => (
            <p key={idx} className="text-sm text-[var(--text-secondary)]">
              {formatInlineText(line)}
            </p>
          ))}
        </div>
      )}

      {/* Rendered Table */}
      {tableData && tableData.headers.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                {tableData.headers.map((h, i) => (
                  <th
                    key={i}
                    className="p-2.5 font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]"
                  >
                    {formatInlineText(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {tableData.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[var(--bg-hover)] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-[var(--text-secondary)] align-top leading-relaxed">
                      {formatInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Postamble / Key Takeaway */}
      {postTableLines.filter(Boolean).length > 0 && (
        <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
          {postTableLines.filter(Boolean).map((line, idx) => (
            <p key={idx} className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {formatInlineText(line)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
