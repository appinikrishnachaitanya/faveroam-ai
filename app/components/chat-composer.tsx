"use client";

import { memo, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Icon } from "./passport";

export default memo(function ChatComposer({
  prompt,
  draftRef,
  disabled,
  onSend,
  processing,
  onStop,
}: {
  prompt: { text: string; version: number };
  draftRef?: MutableRefObject<string>;
  disabled: boolean;
  onSend: (text: string) => void;
  processing: boolean;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState(() => draftRef?.current || prompt.text);
  const promptVersion = useRef(prompt.version);

  useEffect(() => {
    if (promptVersion.current === prompt.version) return;
    promptVersion.current = prompt.version;
    setDraft(prompt.text);
    if (draftRef) draftRef.current = prompt.text;
  }, [prompt.version, prompt.text, draftRef]);

  return (
    <form
      className="composer"
      aria-busy={processing}
      onSubmit={(event) => {
        event.preventDefault();
        const text = draft.trim();
        if (!text || disabled || processing) return;
        setDraft("");
        if (draftRef) draftRef.current = "";
        onSend(text);
      }}
    >
      <label htmlFor="conversation-input" className="sr-only">
        Ask FaveRoam
      </label>
      <textarea
        id="conversation-input"
        autoComplete="off"
        placeholder="Show me something quieter…"
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          if (draftRef) draftRef.current = value;
        }}
        disabled={disabled}
        maxLength={1000}
        rows={2}
      />
      <div className="composer-footer">
        <span>Ask a question or change your suggestions</span>
        <button type={processing ? "button" : "submit"} aria-label={processing ? "Stop response" : "Send message"}
          disabled={!processing && (disabled || !draft.trim())} onClick={processing ? onStop : undefined}>
          {processing ? <><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg> Stop</> : <><Icon name="send" size={17} /> Send</>}
        </button>
      </div>
    </form>
  );
});
