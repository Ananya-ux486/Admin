import { isIP } from "node:net";

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  return (
    parts.length === 4 &&
    parts.every(Number.isInteger) &&
    (parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 0)
  );
}

export function isSafePublicUrl(input, { allowRelative = false } = {}) {
  const raw = String(input || "").trim();
  if (!raw) return true;
  if (allowRelative && /^\/(?!\/)/.test(raw)) {
    return !raw.includes("\\") && !raw.toLowerCase().includes("%2f%2f");
  }
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return false;
    }
    if (
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }
    const ipVersion = isIP(hostname);
    if (ipVersion === 4 && isPrivateIpv4(hostname)) return false;
    if (
      ipVersion === 6 &&
      (hostname === "::1" ||
        hostname === "::" ||
        hostname.startsWith("fc") ||
        hostname.startsWith("fd") ||
        /^fe[89ab]/.test(hostname))
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
