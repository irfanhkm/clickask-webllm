import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Popup from "./pages/Popup";
import ModelSelection from "./pages/ModelManagement/ModelSelection";
import ChatList from "./pages/ChatManagement/ChatList";
import ChatDetail from "./pages/ChatManagement/ChatDetail";
import PromptList from "./pages/PromptManagement/PromptList";
import PromptForm from "./pages/PromptManagement/PromptForm";

// Get the root element
const rootElement = document.getElementById('root') || document.body;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Popup />} />
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
