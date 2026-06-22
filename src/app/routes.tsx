import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import Results from "./pages/Results";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/results",
    element: <Results />,
  },
]);
