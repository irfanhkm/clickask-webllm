import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Popup.css";

export default function() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Hello from the popup!");
  }, []);

  return (
    <div className="p-4">
      <img src="/icon-with-shadow.svg" />
      <h1>vite-plugin-web-extension</h1>
      <p>
        Welcome to the popup!
      </p>
      <div className="flex flex-col gap-2 mt-4">
        <button 
          onClick={() => navigate('/models')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Select Model
        </button>
        <button 
          onClick={() => navigate('/prompts')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Build prompts
        </button>
        <button 
          onClick={() => navigate('/chats')}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Open Chat
        </button>
      </div>
    </div>
  )
}
