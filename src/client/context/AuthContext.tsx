import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@client/lib/supabase";

interface Instructor {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  instructor: Instructor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (input: { email: string; password: string }) => Promise<{ success: true } | { success: false; error: string }>;
  register: (input: { email: string; password: string; name: string }) => Promise<{ success: true } | { success: false; errors: string[] }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: true } | { success: false; error: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function userToInstructor(user: User): Instructor {
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.name as string) ?? user.email ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    instructor: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setState({ instructor: userToInstructor(session.user), isAuthenticated: true, isLoading: false });
      } else {
        setState({ instructor: null, isAuthenticated: false, isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState({ instructor: userToInstructor(session.user), isAuthenticated: true, isLoading: false });
      } else {
        setState({ instructor: null, isAuthenticated: false, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  }, []);

  const register = useCallback(async (input: { email: string; password: string; name: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name } },
    });
    if (error || !data.user) {
      return { success: false as const, errors: [error?.message ?? 'Registration failed'] };
    }
    const { error: profileError } = await supabase.from('instructors').insert({
      id: data.user.id,
      email: input.email,
      name: input.name,
    });
    if (profileError) {
      return { success: false as const, errors: [profileError.message] };
    }
    return { success: true as const };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
