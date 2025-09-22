import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  Bot, 
  BarChart3, 
  Play, 
  Edit, 
  Code, 
  Trash2, 
  MessageCircle, 
  Users, 
  TrendingUp 
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function ChatbotCard({
  name,
  model,
  lastUpdated,
  status,
  totalConversations,
  activeUsers,
  successRate,
  chartData,
  onAnalytics,
  onTest,
  onEdit,
  onEmbed,
  onDelete
}) {
  const statusColors = {
    Active: "bg-green-100 text-green-800 border-green-200",
    Draft: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    Offline: "bg-gray-100 text-gray-800 border-gray-200"
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    }}>
      <div style={{ padding: '24px', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Bot style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <h3 style={{ marginBottom: '4px', fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>{name}</h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>{model}</p>
            </div>
          </div>
          <div style={{
            background: status === 'Active' ? '#dcfce7' : status === 'Draft' ? '#fef3c7' : '#f3f4f6',
            color: status === 'Active' ? '#166534' : status === 'Draft' ? '#92400e' : '#374151',
            border: '1px solid',
            borderColor: status === 'Active' ? '#bbf7d0' : status === 'Draft' ? '#fde68a' : '#d1d5db',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {status}
          </div>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
          Updated {lastUpdated}
        </p>
      </div>

      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
              <MessageCircle style={{ width: '12px', height: '12px', color: '#3b82f6' }} />
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>{totalConversations}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Conversations</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
              <Users style={{ width: '12px', height: '12px', color: '#10b981' }} />
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>{activeUsers}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Active Users</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
              <TrendingUp style={{ width: '12px', height: '12px', color: '#8b5cf6' }} />
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>{successRate}%</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Success Rate</p>
          </div>
        </div>
        
        <div style={{ height: '64px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button 
            onClick={onAnalytics}
            style={{
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#dbeafe';
              e.target.style.borderColor = '#93c5fd';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f1f5f9';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <BarChart3 style={{ width: '16px', height: '16px' }} />
            Analytics
          </button>
          <button 
            onClick={onTest}
            style={{
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#dcfce7';
              e.target.style.borderColor = '#bbf7d0';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f1f5f9';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <Play style={{ width: '16px', height: '16px' }} />
            Test
          </button>
          <button 
            onClick={onEdit}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#fef3c7';
              e.target.style.borderColor = '#fde68a';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f1f5f9';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <Edit style={{ width: '16px', height: '16px' }} />
          </button>
          <button 
            onClick={onEmbed}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f3e8ff';
              e.target.style.borderColor = '#e9d5ff';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f1f5f9';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <Code style={{ width: '16px', height: '16px' }} />
          </button>
          <button 
            onClick={onDelete}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#dc2626',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#fef2f2';
              e.target.style.borderColor = '#fecaca';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f1f5f9';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <Trash2 style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}