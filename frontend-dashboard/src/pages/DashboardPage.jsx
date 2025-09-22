import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Copy } from 'lucide-react';
import Modal from '../components/Modal';
import { Header } from '../components/Header';
import { SearchAndFilters } from '../components/SearchAndFilters';
import { ChatbotCard } from '../components/ChatbotCard';
import { EmptyState } from '../components/EmptyState';

export default function DashboardPage() {
    const [chatbots, setChatbots] = useState([]);
    const [filteredChatbots, setFilteredChatbots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [embedCode, setEmbedCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const navigate = useNavigate();

    const fetchChatbots = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:3001/api/chatbots');
            setChatbots(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to connect to the backend API. Is it running?');
            console.error("Error fetching chatbots:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChatbots();
    }, []);

    // Filter and search logic
    useEffect(() => {
        let filtered = [...chatbots];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(bot => 
                (bot.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (Array.isArray(bot.llm_provider) ? bot.llm_provider[0] : bot.llm_provider || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter - for now treating all as "Active" since we don't have status in API
        // You can modify this based on your actual status logic
        if (statusFilter !== 'all') {
            // Implement status filtering based on your data structure
            // filtered = filtered.filter(bot => bot.status === statusFilter);
        }

        // Sort logic
        if (sortBy === 'date') {
            filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        }
        // Add more sorting options as needed

        setFilteredChatbots(filtered);
    }, [chatbots, searchQuery, statusFilter, sortBy]);

    const handleGetCode = (botId) => {
        const sandboxUrl = `${window.location.origin}/sandbox/${botId}`;
        const code = `<iframe
  src="${sandboxUrl}"
  style="border:none; position:fixed; bottom:20px; right:20px; width:400px; height:600px; z-index: 9999;"
  title="Chatbot">
</iframe>`;
        setEmbedCode(code);
        setIsModalOpen(true);
    };

    const handleDelete = async (botId, botName) => {
        if (window.confirm(`Are you sure you want to delete the chatbot "${botName}"? This action cannot be undone.`)) {
            try {
                await axios.delete(`http://localhost:3001/api/chatbots/${botId}`);
                fetchChatbots(); 
            } catch (err) {
                alert("Failed to delete the chatbot. Please try again.");
                console.error("Delete failed:", err);
            }
        }
    };

    const handleCreateNew = () => {
        navigate('/create-bot');
    };

    const handleAnalytics = (botId) => {
        navigate(`/analytics/${botId}`);
    };

    const handleTest = (botId) => {
        window.open(`/sandbox/${botId}`, '_blank', 'noopener,noreferrer');
    };

    const handleEdit = (botId) => {
        navigate(`/edit-bot/${botId}`);
    };

    // Transform your data to match the modern card component structure
    const transformChatbotData = (bot) => {
        const provider = Array.isArray(bot.llm_provider) ? bot.llm_provider[0] : bot.llm_provider || 'N/A';
        return {
            id: bot.uid,
            name: bot.title || 'Untitled Bot',
            model: provider,
            lastUpdated: new Date(bot.updated_at).toLocaleDateString(),
            status: 'Active', // You can implement actual status logic here
            // Mock analytics data - replace with real data from your API
            totalConversations: Math.floor(Math.random() * 1000) + 100,
            activeUsers: Math.floor(Math.random() * 200) + 50,
            successRate: Math.floor(Math.random() * 20) + 80,
            chartData: Array.from({ length: 7 }, () => ({ value: Math.floor(Math.random() * 50) + 10 })),
            onAnalytics: () => handleAnalytics(bot.uid),
            onTest: () => handleTest(bot.uid),
            onEdit: () => handleEdit(bot.uid),
            onEmbed: () => handleGetCode(bot.uid),
            onDelete: () => handleDelete(bot.uid, bot.title)
        };
    };

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
                <Header onCreateNew={handleCreateNew} />
                
                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            padding: '32px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                animation: 'spin 1s linear infinite',
                                borderRadius: '50%',
                                height: '32px',
                                width: '32px',
                                borderBottom: '2px solid #2563eb',
                                margin: '0 auto 16px'
                            }}></div>
                            <p style={{ color: '#64748b' }}>Loading your chatbots...</p>
                                            </div>
                    </div>
                )}
                
                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            padding: '32px',
                            textAlign: 'center',
                            borderLeft: '4px solid #ef4444'
                        }}>
                            <p style={{ color: '#dc2626' }}>{error}</p>
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {chatbots.length > 0 ? (
                            <>
                                <SearchAndFilters 
                                    searchQuery={searchQuery}
                                    onSearchChange={setSearchQuery}
                                    statusFilter={statusFilter}
                                    onStatusFilterChange={setStatusFilter}
                                    sortBy={sortBy}
                                    onSortChange={setSortBy}
                                />
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                                    gap: '24px',
                                    marginTop: '24px'
                                }}>
                                    {filteredChatbots.map((bot) => (
                                        <ChatbotCard 
                                            key={bot.uid} 
                                            {...transformChatbotData(bot)} 
                                        />
                                    ))}
                                </div>
                                {filteredChatbots.length === 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
                                        <div style={{
                                            background: 'white',
                                            borderRadius: '16px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                            padding: '32px',
                                            textAlign: 'center'
                                        }}>
                                            <h3 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: '600', color: '#374151' }}>No chatbots found</h3>
                                            <p style={{ color: '#64748b' }}>Try adjusting your search or filters.</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptyState onCreateNew={handleCreateNew} />
                        )}
                    </>
                )}
            </div>

            <Modal title="Embed Your Chatbot" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                        border: '1px solid #93c5fd'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: '#3b82f6',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                i
                            </div>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                                Integration Instructions
                            </h4>
                        </div>
                        <p style={{ 
                            color: '#1e40af', 
                            margin: 0, 
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}>
                            Copy and paste this code into your website's HTML, just before the closing <code style={{ 
                                background: 'rgba(59, 130, 246, 0.1)', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '12px'
                            }}>&lt;/body&gt;</code> tag.
                        </p>
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                            <label style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Embed Code
                            </label>
                            <button
                                onClick={() => {
                                    const textarea = document.querySelector('textarea');
                                    if (textarea) {
                                        textarea.select();
                                        document.execCommand('copy');
                                        // You could add a toast notification here
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: '#6366f1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#4f46e5';
                                    e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#6366f1';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                <Copy style={{ width: '14px', height: '14px' }} />
                                Copy Code
                            </button>
                        </div>
                        
                        <textarea 
                            readOnly 
                            value={embedCode} 
                            style={{
                                width: '100%',
                                height: '180px',
                                padding: '16px',
                                background: '#f8fafc',
                                color: '#1e293b',
                                borderRadius: '12px',
                                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                border: '2px solid #e2e8f0',
                                outline: 'none',
                                resize: 'none',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={(e) => e.target.select()}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#6366f1';
                                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>

                <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '12px',
                    padding: '16px'
                }}>
                    <h4 style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#0369a1', 
                        margin: '0 0 8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            background: '#0ea5e9',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold'
                        }}>
                            !
                        </div>
                        Preview
                    </h4>
                    <p style={{ 
                        color: '#0369a1', 
                        margin: 0, 
                        fontSize: '13px',
                        lineHeight: '1.5'
                    }}>
                        The chatbot will appear as a floating widget in the bottom-right corner of your website. 
                        Users can click on it to start a conversation.
                    </p>
                </div>
            </Modal>
        </div>
    );
}




