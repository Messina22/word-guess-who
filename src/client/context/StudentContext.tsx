import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Student, StudentLoginInput } from "@shared/types";
import {
  api,
  setStudentAuthToken,
  clearStudentAuthToken,
  getStudentAuthToken,
} from "@client/lib/api";

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

export function StudentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudentState>({
    student: null,
    className: null,
    isStudentAuthenticated: false,
    isLoading: true,
  });

  const refreshStudent = useCallback(async () => {
    const token = getStudentAuthToken();
    if (!token) {
      setState({
        student: null,
        className: null,
        isStudentAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    const response = await api.auth.studentMe();
    if (response.success && response.data) {
      setState({
        student: response.data.student,
        className: response.data.className,
        isStudentAuthenticated: true,
        isLoading: false,
      });
    } else {
      clearStudentAuthToken();
      setState({
        student: null,
        className: null,
        isStudentAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshStudent();
  }, [refreshStudent]);

  const studentLogin = useCallback(
    async (input: StudentLoginInput) => {
      const response = await api.auth.studentLogin(input);
      if (response.success && response.data) {
        setStudentAuthToken(response.data.token);
        setState({
          student: response.data.student,
          className: response.data.className,
          isStudentAuthenticated: true,
          isLoading: false,
        });
        return { success: true as const };
      }
      return {
        success: false as const,
        error: response.error || "Failed to join class",
      };
    },
    []
  );

  const studentLogout = useCallback(() => {
    clearStudentAuthToken();
    setState({
      student: null,
      className: null,
      isStudentAuthenticated: false,
      isLoading: false,
    });
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
