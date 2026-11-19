/**
 * Copies text in every browser, including a phone that opened Satr over the local network
 * (plain http), where the Clipboard API is not available. Returns whether it really copied,
 * so the button never claims "copied" when nothing happened.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the older method */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Whether this browser can open the phone's own share sheet (WhatsApp, Messages, email). */
export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function" && window.isSecureContext;
}
