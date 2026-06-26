import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Chatbot } from "./components/Chatbot";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Chatbot />
    </>
  );
}