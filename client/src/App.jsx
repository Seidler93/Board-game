import ControllerPage from "./pages/Controller/ControllerPage";
import GamePage from "./pages/Game/GamePage";
import "./App.css";

function App() {
  const path = window.location.pathname;

  if (path === "/controller") {
    return <ControllerPage />;
  }

  if (path === "/game") {
    return <GamePage />;
  }

  return <GamePage />;
}

export default App;
