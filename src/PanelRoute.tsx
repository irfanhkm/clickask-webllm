import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import ModelSelection from "./pages/ModelManagement/ModelSelection";
import ChatList from "./pages/ChatManagement/ChatList";
import ChatDetail from "./pages/ChatManagement/ChatDetail";
import PromptList from "./pages/PromptManagement/PromptList";
import PromptForm from "./pages/PromptManagement/PromptForm";
import PanelLayout from './components/PanelLayout';
import ErrorPage from './components/ErrorPage';

// Get the root element
const rootElement = document.getElementById('root') || document.body;

const router = createBrowserRouter([
  {
    path: "/",
    element: <PanelLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "*",
        element: <Navigate to="/chats" replace />,
      },
      {
        path: "/",
        element: <Navigate to="/chats" replace />,
      },
      {
        path: "chats",
        element: <ChatList />,
      },
      {
        path: "chat/:roomId",
        element: <ChatDetail />,
      },
      {
        path: "models",
        element: <ModelSelection />,
      },
      {
        path: "prompts",
        element: <PromptList />,
      },
      {
        path: "prompts/new",
        element: <PromptForm />,
      },
      {
        path: "prompts/edit/:id",
        element: <PromptForm />,
      },
      {
        path: "settings",
        element: <div>Settings Page</div>,
      },
    ],
  },
]);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
