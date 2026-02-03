import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@client/context/AuthContext";
import { GameProvider } from "@client/context/GameContext";
import { HomePage } from "@client/pages/HomePage";
import { GamePage } from "@client/pages/GamePage";
import { InstructorPage } from "@client/pages/InstructorPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/instructor" element={<InstructorPage />} />
            <Route path="/game/:code" element={<GamePage />} />
          </Routes>
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
