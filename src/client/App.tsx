import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@client/context/AuthContext";
import { StudentProvider } from "@client/context/StudentContext";
import { GameProvider } from "@client/context/GameContext";
import { SessionGameLogProvider } from "@client/context/SessionGameLogContext";
import { HomePage } from "@client/pages/HomePage";
import { GamePage } from "@client/pages/GamePage";
import { InstructorPage } from "@client/pages/InstructorPage";
import { ResetPasswordPage } from "@client/pages/ResetPasswordPage";
import { InstructorProfilePage } from "@client/pages/InstructorProfilePage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudentProvider>
          <SessionGameLogProvider>
            <GameProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/instructor" element={<InstructorPage />} />
              <Route
                path="/instructor/profile"
                element={<InstructorProfilePage />}
              />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/game/:code" element={<GamePage />} />
            </Routes>
            </GameProvider>
          </SessionGameLogProvider>
        </StudentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
