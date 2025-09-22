import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ChatWidget from '../components/ChatWidget';

export default function SandboxPage() {
  const { botId } = useParams();
  const [uiSettings, setUiSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBotConfig = async () => {
      if (!botId) {
        setError("No Bot ID provided in URL.");
        setLoading(false);
        return;
      };
      
      try {
        // In a real app, a dedicated GET /api/chatbots/:botId endpoint is best.
        // For now, we find the bot from the full list.
        const response = await axios.get('http://localhost:3001/api/chatbots');
        const bot = response.data.find(b => b.uid === botId);

        if (bot && bot.ui_settings) {
          // The settings are stored as a string, so we must parse them into a JSON object.
          setUiSettings(JSON.parse(bot.ui_settings));
        } else if (bot) {
          // If settings are missing, use defaults
          setUiSettings({ position: 'bottom-right', themeColor: '#6366f1' });
        } else {
            setError("Could not find a bot with this ID.");
        }
      } catch (err) {
        console.error("Failed to fetch bot config", err);
        setError("Failed to load bot configuration.");
      } finally {
        setLoading(false);
      }
    };
    fetchBotConfig();
  }, [botId]);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading Preview...</div>;
  if (error) return <div className="h-screen text-red-600 flex items-center justify-center">{error}</div>;
  
  return (
    <ChatWidget botId={botId} uiSettings={uiSettings} variant="modal" />
  );
}