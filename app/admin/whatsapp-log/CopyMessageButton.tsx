"use client";

import { useState } from "react";
import styles from "./whatsapp-log.module.css";

export default function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied/unavailable - silently ignore, nothing else to do here
    }
  }

  return (
    <button type="button" className={styles.copyButton} onClick={handleCopy}>
      {copied ? "הועתק ✓" : "העתק טקסט"}
    </button>
  );
}
