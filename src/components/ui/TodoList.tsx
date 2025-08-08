"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TodoItem {
  id: string;
  title: string;
  status: "todo" | "done";
}

interface TodoListProps {
  className?: string;
  initialItems?: TodoItem[];
}

export default function TodoList({
  className = "",
  initialItems = [
    { id: "t1", title: "Review today’s agenda", status: "todo" },
    { id: "t2", title: "Confirm lunch meeting", status: "todo" },
    { id: "t3", title: "Draft follow‑up email", status: "todo" },
  ],
}: TodoListProps) {
  const [items, setItems] = useState<TodoItem[]>(initialItems);
  const [input, setInput] = useState("");

  const addItem = () => {
    const title = input.trim();
    if (!title) return;
    setItems((prev) => [
      { id: `t-${Date.now()}`, title, status: "todo" },
      ...prev,
    ]);
    setInput("");
  };

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, status: it.status === "todo" ? "done" : "todo" }
          : it
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const todos = items.filter((i) => i.status === "todo");
  const done = items.filter((i) => i.status === "done");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Add input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add a task…"
          className="flex-1 px-3 py-2 rounded-xl bg-[var(--card-background)] border border-[var(--card-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
        />
        <button
          onClick={addItem}
          className="px-3 py-2 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium hover:bg-[var(--accent-primary)]/15"
        >
          Add
        </button>
      </div>

      {/* Todo items */}
      <div className="space-y-2">
        <p className="text-xs text-[var(--foreground-muted)]">To‑do</p>
        <AnimatePresence initial={false}>
          {todos.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)]"
            >
              <button
                aria-label="Toggle task"
                onClick={() => toggleItem(item.id)}
                className="w-5 h-5 rounded-full border border-[var(--card-border)] bg-white/5 hover:bg-white/10"
              />
              <p className="text-sm text-[var(--cta-text)] flex-1">
                {item.title}
              </p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--cta-text)]"
              >
                Remove
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {todos.length === 0 && (
          <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)] text-xs text-[var(--foreground-muted)]">
            Nothing yet. Suggestion: &quot;Block a 45‑min focus session&quot;
          </div>
        )}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--foreground-muted)]">Completed</p>
          <div className="space-y-2">
            {done.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-background)] opacity-60"
              >
                <div className="w-5 h-5 rounded-full bg-green-500/70" />
                <p className="text-sm line-through flex-1">{item.title}</p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-[var(--foreground-muted)] hover:text-[var(--cta-text)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
