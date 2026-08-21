"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { groupsApi } from "@/lib/api";
import type { Group } from "@/lib/types";
import { useToast } from "./toast";

type GroupsValue = {
  groups: Group[];
  createGroup: (name: string) => Promise<Group | null>;
  renameGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
};

const GroupsContext = createContext<GroupsValue>({
  groups: [],
  createGroup: async () => null,
  renameGroup: async () => undefined,
  deleteGroup: async () => undefined,
});

export function GroupsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    groupsApi.list().then(setGroups).catch(() => undefined);
  }, []);

  const createGroup = useCallback(async (name: string) => {
    try {
      const group = await groupsApi.create(name);
      setGroups((items) => [...items, group]);
      toast(`Group “${group.name}” created`);
      return group;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create group", "error");
      return null;
    }
  }, [toast]);

  const renameGroup = useCallback(async (id: string, name: string) => {
    try {
      const group = await groupsApi.update(id, name);
      setGroups((items) => items.map((item) => (item.id === id ? group : item)));
      toast("Group renamed");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not rename group", "error");
    }
  }, [toast]);

  const deleteGroup = useCallback(async (id: string) => {
    try {
      await groupsApi.remove(id);
      setGroups((items) => items.filter((item) => item.id !== id));
      toast("Group deleted. Its tasks are now ungrouped.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete group", "error");
    }
  }, [toast]);

  const value = useMemo(
    () => ({ groups, createGroup, renameGroup, deleteGroup }),
    [groups, createGroup, renameGroup, deleteGroup],
  );

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export const useGroups = () => useContext(GroupsContext);
