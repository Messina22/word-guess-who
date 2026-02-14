import type {
  ApiResponse,
  GameConfig,
  GameConfigInput,
  CreateGameInput,
  CreateGameResponse,
  PublicGameSession,
  AuthResponse,
  Instructor,
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  StudentLoginInput,
  StudentAuthResponse,
  Student,
  Class,
  ClassWithRoster,
} from "@shared/types";

const API_BASE = "/api";
const AUTH_TOKEN_KEY = "authToken";
const STUDENT_TOKEN_KEY = "studentToken";

/** Get the stored auth token */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Set the auth token */
export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Clear the auth token */
export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/** Get the stored student auth token */
export function getStudentAuthToken(): string | null {
  return localStorage.getItem(STUDENT_TOKEN_KEY);
}

/** Set the student auth token */
export function setStudentAuthToken(token: string): void {
  localStorage.setItem(STUDENT_TOKEN_KEY, token);
}

/** Clear the student auth token */
export function clearStudentAuthToken(): void {
  localStorage.removeItem(STUDENT_TOKEN_KEY);
}

/** Get auth headers if token exists */
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options?: RequestInit & { authenticated?: boolean }
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.authenticated !== false ? getAuthHeaders() : {}),
      ...(options?.headers as Record<string, string> | undefined),
    };

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    return (await response.json()) as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/** Get student auth headers if token exists */
function getStudentAuthHeaders(): Record<string, string> {
  const token = getStudentAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
        authenticated: false,
      }),

    login: (input: LoginInput) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
        authenticated: false,
      }),

    me: () => request<Instructor>("/auth/me"),

    listInstructors: () => request<Instructor[]>("/auth/instructors"),

    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        authenticated: false,
      }),

    resetPassword: (token: string, password: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        authenticated: false,
      }),

    changePassword: (input: ChangePasswordInput) =>
      request<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    studentLogin: (input: StudentLoginInput) =>
      request<StudentAuthResponse>("/auth/student-login", {
        method: "POST",
        body: JSON.stringify(input),
        authenticated: false,
      }),

    studentMe: () =>
      request<{ student: Student; className: string }>("/auth/student-me", {
        authenticated: false,
        headers: getStudentAuthHeaders(),
      }),
  },

  configs: {
    list: (classId?: string) => {
      const params = classId ? `?classId=${encodeURIComponent(classId)}` : "";
      return request<GameConfig[]>(`/configs${params}`);
    },

    get: (id: string) =>
      request<GameConfig>(`/configs/${encodeURIComponent(id)}`, {
        authenticated: false,
      }),

    create: (input: GameConfigInput & { isPublic?: boolean }) =>
      request<GameConfig>("/configs", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (id: string, input: GameConfigInput & { isPublic?: boolean }) =>
      request<GameConfig>(`/configs/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      request<null>(`/configs/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  classes: {
    create: (input: { name: string }) =>
      request<Class>("/classes", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    list: () =>
      request<(Class & { studentCount: number })[]>("/classes"),

    get: (id: string) =>
      request<ClassWithRoster>(`/classes/${encodeURIComponent(id)}`),

    update: (id: string, input: { name: string }) =>
      request<Class>(`/classes/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      request<null>(`/classes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),

    removeStudent: (classId: string, studentId: string) =>
      request<null>(
        `/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`,
        { method: "DELETE" }
      ),
  },

  games: {
    create: (input: CreateGameInput) =>
      request<CreateGameResponse>("/games", {
        method: "POST",
        body: JSON.stringify(input),
        authenticated: false,
      }),

    get: (code: string) =>
      request<PublicGameSession>(`/games/${encodeURIComponent(code)}`, {
        authenticated: false,
      }),
  },
};
