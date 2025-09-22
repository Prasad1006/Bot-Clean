import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeft, MessageSquare, Clock, ThumbsUp, Plus } from 'lucide-react';

export default function AnalyticsPage() {
    const { botId } = useParams();
    const [botName, setBotName] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('');

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const botsRes = await axios.get('http://localhost:3001/api/chatbots');
            const currentBot = botsRes.data.find(b => b.uid === botId);
            if(currentBot) setBotName(currentBot.title);

            const logsRes = await axios.get(`http://localhost:3001/api/analytics/${botId}`);
            setLogs(logsRes.data);
            setError(null);
        } catch (err) {
            setError("Failed to fetch analytics data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnalytics(); }, [botId]);

    // Handler to add a query to the knowledge base
    const handleAddToKnowledge = async (query) => {
        setStatus(`Adding "${query}" to knowledge base...`);
        try {
            const response = await axios.post(`http://localhost:3001/api/bots/${botId}/refine-and-add`, { user_query: query });
            setStatus(response.data.message);
        } catch (err) {
            setStatus("Error: Could not add to knowledge base.");
        }
    };

    // Data processing logic for stats and charts
    const totalQueries = logs.length;
    const avgResponseTime = totalQueries > 0
        ? (logs.reduce((acc, log) => acc + log.response_time_ms, 0) / totalQueries / 1000).toFixed(2)
        : 0;

    const feedbackScore = logs.reduce((acc, log) => acc + log.user_feedback, 0);

    const feedbackDistribution = [
        { name: 'Good', count: logs.filter(l => l.user_feedback === 1).length },
        { name: 'Bad', count: logs.filter(l => l.user_feedback === -1).length },
    ];

    const topQueries = logs.reduce((acc, log) => {
        acc[log.user_query] = (acc[log.user_query] || 0) + 1;
        return acc;
    }, {});
    const sortedTopQueries = Object.entries(topQueries).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #f3e8ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        animation: 'spin 1s linear infinite',
                        borderRadius: '50%',
                        height: '32px',
                        width: '32px',
                        borderBottom: '2px solid #2563eb',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#64748b' }}>Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #f3e8ff 100%)',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <div style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: '32px 24px'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#6366f1',
                            textDecoration: 'none',
                            fontWeight: '500',
                            marginBottom: '16px',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#4f46e5'}
                        onMouseLeave={(e) => e.target.style.color = '#6366f1'}
                    >
                        <ArrowLeft style={{ width: '16px', height: '16px' }} />
                        Back to Dashboard
                    </Link>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Analytics for <span style={{ color: '#2563eb' }}>{botName}</span>
                        </h1>
                        <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>
                            Monitor usage, performance, and user feedback
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        color: '#dc2626'
                    }}>
                        {error}
                    </div>
                )}

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
                    {/* Left Column - Stats Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Total Queries Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            padding: '24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e40af', marginBottom: '4px' }}>
                                        Total Queries
                                    </p>
                                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#1e3a8a', margin: 0 }}>
                                        {totalQueries.toLocaleString()}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '12px',
                                    background: '#93c5fd',
                                    borderRadius: '12px'
                                }}>
                                    <MessageSquare style={{ width: '24px', height: '24px', color: '#1e40af' }} />
                                </div>
                            </div>
                        </div>

                        {/* Avg Response Time Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            padding: '24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#065f46', marginBottom: '4px' }}>
                                        Avg. Response Time
                                    </p>
                                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#064e3b', margin: 0 }}>
                                        {avgResponseTime}s
                                    </p>
                                </div>
                                <div style={{
                                    padding: '12px',
                                    background: '#6ee7b7',
                                    borderRadius: '12px'
                                }}>
                                    <Clock style={{ width: '24px', height: '24px', color: '#065f46' }} />
                                </div>
                            </div>
                        </div>

                        {/* Feedback Score Card */}
                        <div style={{
                            background: feedbackScore >= 0 
                                ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                                : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            padding: '24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        color: feedbackScore >= 0 ? '#065f46' : '#dc2626', 
                                        marginBottom: '4px' 
                                    }}>
                                        Feedback Score
                                    </p>
                                    <p style={{ 
                                        fontSize: '32px', 
                                        fontWeight: '700', 
                                        color: feedbackScore >= 0 ? '#064e3b' : '#dc2626', 
                                        margin: 0 
                                    }}>
                                        {feedbackScore > 0 ? `+${feedbackScore}` : feedbackScore}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '12px',
                                    background: feedbackScore >= 0 ? '#6ee7b7' : '#fca5a5',
                                    borderRadius: '12px'
                                }}>
                                    <ThumbsUp style={{ 
                                        width: '24px', 
                                        height: '24px', 
                                        color: feedbackScore >= 0 ? '#065f46' : '#dc2626' 
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Chart and Questions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Feedback Distribution Chart */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            padding: '24px'
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                                    Feedback Distribution
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                                    User satisfaction breakdown
                                </p>
                            </div>
                            <div style={{ height: '320px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={feedbackDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                                        <XAxis 
                                            dataKey="name" 
                                            stroke="#64748b" 
                                            fontSize={12}
                                            fontWeight={500}
                                        />
                                        <YAxis 
                                            stroke="#64748b" 
                                            fontSize={12}
                                            fontWeight={500}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#ffffff', 
                                                border: 'none',
                                                borderRadius: '8px',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                                fontSize: '14px'
                                            }}
                                            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                        />
                                        <Bar 
                                            dataKey="count" 
                                            fill="url(#colorGradient)" 
                                            radius={[4, 4, 0, 0]}
                                            stroke="#3b82f6"
                                            strokeWidth={1}
                                        />
                                        <defs>
                                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#60a5fa" />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Questions Section */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            padding: '24px'
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                                    Top Questions Asked
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                                    Popular queries that might benefit from being added to your knowledge base
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {sortedTopQueries.map(([query, count], index) => (
                                    <div 
                                        key={query} 
                                        style={{
                                            padding: '16px',
                                            background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ 
                                                    color: '#374151', 
                                                    fontWeight: '500', 
                                                    lineHeight: '1.6', 
                                                    margin: 0 
                                                }}>
                                                    "{query}"
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                                <span style={{
                                                    background: '#e2e8f0',
                                                    color: '#374151',
                                                    fontWeight: '500',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px'
                                                }}>
                                                    {count} {count > 1 ? 'times' : 'time'}
                                                </span>
                                                <button
                                                    onClick={() => handleAddToKnowledge(query)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '8px 16px',
                                                        background: '#2563eb',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = '#1d4ed8';
                                                        e.target.style.transform = 'translateY(-1px)';
                                                        e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = '#2563eb';
                                                        e.target.style.transform = 'translateY(0)';
                                                        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                                    }}
                                                >
                                                    <Plus style={{ width: '16px', height: '16px' }} />
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {status && (
                                <div style={{
                                    marginTop: '24px',
                                    padding: '16px',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '12px'
                                }}>
                                    <p style={{ color: '#166534', fontWeight: '500', margin: 0 }}>
                                        {status}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}