import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Instructor, RegisterInput, LoginInput } from "@shared/types";
import { api, setAuthToken, clearAuthToken, getAuthToken } from "@client/lib/api";

interface AuthState {
  instructor: Instructor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (input: LoginInput) => Promise<{ success: true } | { success: false; error: string }>;
  register: (input: RegisterInput) => Promise<{ success: true } | { success: false; errors: string[] }>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    instructor: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setState({ instructor: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const response = await api.auth.me();
    if (response.success && response.data) {
      setState({
        instructor: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      clearAuthToken();
      setState({ instructor: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(async (input: LoginInput) => {
    const response = await api.auth.login(input);
    if (response.success && response.data) {
      setAuthToken(response.data.token);
      setState({
        instructor: response.data.instructor,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true as const };
    }
    return {
      success: false as const,
      error: response.error || "Login failed",
    };
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await api.auth.register(input);
    if (response.success && response.data) {
      setAuthToken(response.data.token);
      setState({
        instructor: response.data.instructor,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true as const };
    }
    return {
      success: false as const,
      errors: response.errors || [response.error || "Registration failed"],
    };
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setState({ instructor: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
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
