import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { MessageSquare, FileText, Settings, Code } from 'lucide-react';
import ModelSelection from "./pages/ModelManagement/ModelSelection";
import SystemPromptManager from "./pages/ModelManagement/SystemPromptManager";
import ChatList from "./pages/ChatManagement/ChatList";
import ChatDetail from "./pages/ChatManagement/ChatDetail";
import PromptList from "./pages/PromptManagement/PromptList";
import PromptForm from "./pages/PromptManagement/PromptForm";
import PanelLayout from './components/PanelLayout';
import ErrorPage from './components/ErrorPage';
import { MenuItem } from './components/PanelLayout';

// Get the root element
const rootElement = document.getElementById('root') || document.body;

const menuItems: MenuItem[] = [
  {
    name: 'Chats',
    path: 'chats',
    icon: MessageSquare,
  },
  {
    name: 'Prompts',
    path: 'prompts',
    icon: FileText,
  },
  {
    name: 'Models',
    path: 'models',
    icon: Settings,
  },
  {
    name: 'System Prompts',
    path: 'system-prompts',
    icon: Code,
  },
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <PanelLayout menuItems={menuItems} />,
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
        path: "chats/:roomId",
        element: <ChatDetail />,
      },
      {
        path: "models",
        element: <ModelSelection />,
      },
      {
        path: "system-prompts",
        element: <SystemPromptManager />,
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
    ],
  },
]);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
