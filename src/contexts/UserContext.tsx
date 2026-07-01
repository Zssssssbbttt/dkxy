"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface UserInfo {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  role: string;
  departmentId: string | null;
}

const UserContext = createContext<UserInfo | null>(null);

const STORAGE_KEY = "user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): UserInfo | null {
  return useContext(UserContext);
}

export function setUserInfo(user: UserInfo) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("user-changed"));
}

export function clearUserInfo() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("user-changed"));
}