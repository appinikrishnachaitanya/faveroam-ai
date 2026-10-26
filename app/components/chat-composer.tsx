"use client";

import { memo, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Icon } from "./passport";

export default memo(function ChatComposer({
  prompt,
  draftRef,
  disabled,
  onSend,
}: {
  prompt: { text: string; version: number };
  draftRef?: MutableRefObject<string>;
  disabled: boolean;
  onSend: (text: string) => void;
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
      onSubmit={(event) => {
        event.preventDefault();
        const text = draft.trim();
        if (!text || disabled) return;
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
        <span>Updates your current suggestions</span>
        <button type="submit" aria-label="Send message" disabled={disabled || !draft.trim()}>
          <Icon name="send" size={17} /> Send
        </button>
      </div>
    </form>
  );
});
