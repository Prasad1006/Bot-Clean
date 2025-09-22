import { Button } from "./ui/button";
import { Plus } from "lucide-react";

export function Header({ onCreateNew }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginBottom: '32px'
    }}>
      <div>
        <h1 style={{
          marginBottom: '8px',
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#0f172a'
        }}>My Chatbots</h1>
        <p style={{ color: '#64748b' }}>
          Create and manage your AI chat agents.
        </p>
      </div>
      <button 
        onClick={onCreateNew}
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          alignSelf: 'flex-start'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}
      >
        <Plus style={{ width: '20px', height: '20px' }} />
        Create New Chatbot
      </button>
    </div>
  );
}