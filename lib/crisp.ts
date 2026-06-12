/** Ouvre le widget Crisp si chargé (dashboard). */
export function openCrispChat(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { $crisp?: { push: (args: unknown[]) => void } };
  try {
    w.$crisp?.push(["do", "chat:open"]);
  } catch {
    /* widget non chargé */
  }
}

export function isCrispConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID?.trim());
}
