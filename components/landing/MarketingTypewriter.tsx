"use client";

import { useEffect, useMemo, useState } from "react";

const phrases = [
  "Plan smarter campaigns.",
  "Create content that converts.",
  "Launch across every channel.",
  "Measure what drives growth.",
];

export function MarketingTypewriter() {
  const lines = useMemo(() => phrases, []);
  const [line, setLine] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = lines[line];
    const finished = text === target;
    const empty = text.length === 0;
    const delay = finished ? 1250 : deleting ? 34 : 62;

    const timer = window.setTimeout(() => {
      if (finished && !deleting) {
        setDeleting(true);
        return;
      }
      if (deleting && empty) {
        setDeleting(false);
        setLine((value) => (value + 1) % lines.length);
        return;
      }
      setText((value) =>
        deleting ? value.slice(0, -1) : target.slice(0, value.length + 1)
      );
    }, delay);

    return () => window.clearTimeout(timer);
  }, [deleting, line, lines, text]);

  return (
    <span className="marketing-typewriter" aria-label={lines[line]}>
      {text}
      <span className="marketing-caret" aria-hidden="true" />
    </span>
  );
}
