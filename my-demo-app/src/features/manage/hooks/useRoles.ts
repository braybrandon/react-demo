import { useEffect, useState, useCallback } from "react";
import { fetchRoles } from "../../../lib/role.api";
import type { Role } from "../../../lib/role.api";

export type RoleOption = { label: string; value: string };

export function useRoles(userRoles: Array<{ id: number }> | undefined) {
  const initial = (userRoles || []).map((r) => String(r.id));
  const [rolesOptions, setRolesOptions] = useState<RoleOption[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initial);
  const [initialRoles, setInitialRoles] = useState<string[]>(initial);

  const reloadRoles = useCallback(async () => {
    try {
      const list = await fetchRoles();
      setRolesOptions(list.map((r: Role) => ({ label: r.name, value: String(r.id) })));
    } catch (err) {
      // ignore - caller can show notifications
    }
  }, []);

  useEffect(() => {
    const ids = (userRoles || []).map((r) => String(r.id));
    setSelectedRoles(ids);
    setInitialRoles(ids);
  }, [userRoles]);

  useEffect(() => {
    reloadRoles();
  }, [reloadRoles]);

  const added = selectedRoles.filter((r) => !initialRoles.includes(r));
  const removed = initialRoles.filter((r) => !selectedRoles.includes(r));

  return {
    rolesOptions,
    selectedRoles,
    setSelectedRoles,
    initialRoles,
    setInitialRoles,
    added,
    removed,
    reloadRoles,
  } as const;
}
