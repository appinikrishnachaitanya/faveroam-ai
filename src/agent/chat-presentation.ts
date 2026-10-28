/** Keep conversational context visible while showing grounded choices as cards. */
export function chatParagraphs(message: string, hasCards: boolean): string[] {
  let text = message.trim();
  if (hasCards) {
    text = text.replace(/\n\nHere are \d+ choices to consider:[\s\S]*$/i, "");
    text = text.replace(/\n\n1\. [\s\S]*$/i, "");
    if (/^Here are \d+ starting choices? from your .+ Passport:/i.test(text))
      text = text.replace(/:$/, ".");
  }
  return text.split(/\n\s*\n/).map(paragraph=>paragraph.trim()).filter(Boolean);
}
