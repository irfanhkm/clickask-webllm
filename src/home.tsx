import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Popup from "./pages/Popup";
import Settings from "./pages/Settings";
import ModelSelection from "./pages/ModelSelection";
import ChatList from "./pages/ChatList";
import ChatDetail from "./pages/ChatDetail";
import PromptList from "./pages/PromptList";
import PromptForm from "./pages/PromptForm";

// Get the root element
const rootElement = document.getElementById('root') || document.body;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Popup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/models" element={<ModelSelection />} />
        <Route path="/chats" element={<ChatList />} />
        <Route path="/chat/:roomId" element={<ChatDetail />} />
        <Route path="/prompts" element={<PromptList />} />
        <Route path="/prompts/new" element={<PromptForm />} />
        <Route path="/prompts/edit/:id" element={<PromptForm />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
