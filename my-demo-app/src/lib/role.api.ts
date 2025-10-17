const API_BASE = (import.meta as any).env.VITE_API_BASE || "http://localhost:4000";

export type Role = { id: number; name: string };

async function safeJson(resp: Response) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

export async function fetchRoles(): Promise<Role[]> {
  const r = await fetch(`${API_BASE}/roles`, { credentials: "include" });
  if (!r.ok) {
    const body = await safeJson(r);
    throw new Error(body?.error || `Failed to fetch roles (${r.status})`);
  }
  return (await r.json()) as Role[];
}

export async function addRoleToUser(
  userId: number | string,
  roleId: number | string
): Promise<void> {
  const uid = Number(userId);
  const rid = Number(roleId);
  if (Number.isNaN(uid) || Number.isNaN(rid)) throw new Error("Invalid ids");
  const r = await fetch(`${API_BASE}/users/${uid}/roles/${rid}`, {
    method: "PUT",
    credentials: "include",
  });
  if (!r.ok) {
    const body = await safeJson(r);
    throw new Error(body?.error || `Failed to add role (${r.status})`);
  }
}

export async function removeRoleFromUser(
  userId: number | string,
  roleId: number | string
): Promise<void> {
  const uid = Number(userId);
  const rid = Number(roleId);
  if (Number.isNaN(uid) || Number.isNaN(rid)) throw new Error("Invalid ids");
  const r = await fetch(`${API_BASE}/users/${uid}/roles/${rid}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) {
    const body = await safeJson(r);
    throw new Error(body?.error || `Failed to remove role (${r.status})`);
  }
}
