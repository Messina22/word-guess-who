import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Student, StudentLoginInput } from "@shared/types";
import { api } from "@client/lib/api";
import { supabase } from "@client/lib/supabase";

interface StudentState {
  student: Student | null;
  className: string | null;
  isStudentAuthenticated: boolean;
  isLoading: boolean;
}

interface StudentContextType extends StudentState {
  studentLogin: (
    input: StudentLoginInput
  ) => Promise<{ success: true } | { success: false; error: string }>;
  studentLogout: () => void;
}

const StudentContext = createContext<StudentContextType | null>(null);

function studentFromSession(
  userId: string,
  metadata: Record<string, unknown>
): Student {
  return {
    id: userId,
    username: metadata.username as string,
    classId: metadata.class_id as string,
    lastSeenAt: null,
    createdAt: "",
    updatedAt: "",
  };
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudentState>({
    student: null,
    className: null,
    isStudentAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const metadata = session?.user?.user_metadata ?? {};
      if (session && metadata.role === "student") {
        const student = studentFromSession(session.user.id, metadata);
        setState({
          student,
          className: student.classId,
          isStudentAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          student: null,
          className: null,
          isStudentAuthenticated: false,
          isLoading: false,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const metadata = session?.user?.user_metadata ?? {};
      if (session && metadata.role === "student") {
        const student = studentFromSession(session.user.id, metadata);
        setState({
          student,
          className: student.classId,
          isStudentAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          student: null,
          className: null,
          isStudentAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const studentLogin = useCallback(async (input: StudentLoginInput) => {
    const response = await api.auth.studentLogin(
      input.classCode,
      input.username
    );
    if (response.success && response.data) {
      const session = response.data.session as {
        access_token: string;
        refresh_token: string;
      };
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) {
        return { success: false as const, error: error.message };
      }
      return { success: true as const };
    }
    return {
      success: false as const,
      error: response.error || "Failed to join class",
    };
  }, []);

  const studentLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <StudentContext.Provider
      value={{
        ...state,
        studentLogin,
        studentLogout,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent(): StudentContextType {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error("useStudent must be used within a StudentProvider");
  }
  return context;
}
