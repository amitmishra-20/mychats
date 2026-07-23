"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/chat";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  demoLoginAvailable: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  dummyLogin: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoLoginAvailable, setDemoLoginAvailable] = useState(false);
  const router = useRouter();
  const mountedRef = useRef(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (mountedRef.current) setUser(data.user);
    } catch {
      if (mountedRef.current) setUser(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    Promise.all([
      fetch("/api/auth/me").then((res) => res.json()),
      fetch("/api/auth/dummy-login").then((res) => res.json()),
    ])
      .then(([meData, demoData]) => {
        if (!cancelled && mountedRef.current) {
          setUser(meData.user);
          setDemoLoginAvailable(demoData.available === true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled && mountedRef.current) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return data.error || "Login failed";
        setUser(data.user);
        router.push("/");
        return null;
      } catch {
        return "Failed to connect to server";
      }
    },
    [router]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) return data.error || "Signup failed";
        setUser(data.user);
        router.push("/");
        return null;
      } catch {
        return "Failed to connect to server";
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  const dummyLogin = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/dummy-login", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return data.error || "Login failed";
      setUser(data.user);
      router.push("/");
      return null;
    } catch {
      return "Failed to connect to server";
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, loading, demoLoginAvailable, login, signup, logout, dummyLogin, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
