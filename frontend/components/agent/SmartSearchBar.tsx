"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 200;

export function SmartSearchBar({
  value,
  onChange,
  onDebounced,
  placeholder = "Shtyp pyetjen e qytetarit...",
}: {
  value: string;
  onChange: (next: string) => void;
  onDebounced: (next: string) => void;
  placeholder?: string;
}) {
  const [scheduled, setScheduled] = useState(value);

  useEffect(() => {
    setScheduled(value);
  }, [value]);

  useEffect(() => {
    const handle = setTimeout(() => onDebounced(scheduled), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [scheduled, onDebounced]);

  return (
    <div className="relative flex items-center bg-white ek-border border rounded-md px-4 py-2.5 shadow-sm">
      <Search className="h-4 w-4 ek-text-muted mr-3 shrink-0" />
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setScheduled(e.target.value);
        }}
        placeholder={placeholder}
        aria-label="Search"
        className="flex-1 bg-transparent outline-none text-sm"
      />
    </div>
  );
}
