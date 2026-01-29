import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "@client/context/GameContext";
import { HomePage } from "@client/pages/HomePage";
import { GamePage } from "@client/pages/GamePage";

export function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:code" element={<GamePage />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
