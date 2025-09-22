import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Bot, Settings, Palette, Upload, Save, Eye, Search, Trash2 } from 'lucide-react';

export default function EditBotPage() {
    const { botId } = useParams();
    const [botData, setBotData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [saveStatus, setSaveStatus] = useState('');
    const navigate = useNavigate();

    // Form states
    const [formData, setFormData] = useState({
        bot_name: '',
        domain: 'Free Prompt',
        llm_provider: 'Gemini',
        api_key: '',
        themeColor: '#6366f1',
        fontStyle: 'Inter',
        avatarUrl: '',
        free_prompt_system_message: ''
    });

    // Knowledge files state
    const [knowledgeFiles, setKnowledgeFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Knowledge Source State
    const [knowledgeFile, setKnowledgeFile] = useState(null);
    const [scrapeUrl, setScrapeUrl] = useState('');
    const [activeKnowledgeTab, setActiveKnowledgeTab] = useState('csv');
    
    // Contentstack Connector State
    const [connectorCreds, setConnectorCreds] = useState({
        apiKey: '',
        deliveryToken: '',
        managementToken: '',
        environment: 'production',
    });
    const [fetchedModels, setFetchedModels] = useState([]);
    const [selectedModelUid, setSelectedModelUid] = useState('');
    const [importOptions, setImportOptions] = useState({
        deleteOld: true,
        maxEntries: 20,
        fields: '',
        chunkChars: 900,
        titleField: ''
    });

    const fetchBotData = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/chatbots');
            const foundBot = response.data.find(bot => bot.uid === botId);
            if (foundBot) {
                setBotData(foundBot);
                setFormData({
                    bot_name: foundBot.title || '',
                    domain: foundBot.domain_bot || 'Free Prompt',
                    llm_provider: foundBot.llm_provider || 'Gemini',
                    api_key: '',
                    themeColor: '#6366f1',
                    fontStyle: 'Inter',
                    avatarUrl: '',
                    free_prompt_system_message: foundBot.free_prompt_system_message || ''
                });
            } else {
                setError(`Bot with ID ${botId} not found.`);
            }
        } catch (err) {
            setError('Failed to fetch bot data from the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchBotData();
    }, [botId]);

    // Pre-fill form when botData loads from the parent component
    useEffect(() => {
        if (botData) {
            setConnectorCreds(prev => ({
                ...prev,
                apiKey: botData.connected_stack_api_key || '',
                deliveryToken: botData.connected_stack_delivery_token || '',
                environment: botData.connected_stack_environment || 'production',
            }));
            setSelectedModelUid(botData.connected_model_uid || '');
        }
    }, [botData]);

    const handleSave = async () => {
        setSaveStatus('Saving...');
        try {
            // Prepare the data to send to the API
            const saveData = {
                bot_name: formData.bot_name,
                domain: formData.domain,
                llm_provider: formData.llm_provider,
                api_key: formData.api_key,
                free_prompt_system_message: formData.free_prompt_system_message
            };
            
            await axios.put(`http://localhost:3001/api/chatbots/${botId}`, saveData);
            setSaveStatus('Changes saved successfully!');
            setTimeout(() => setSaveStatus(''), 3000);
            fetchBotData();
        } catch (err) {
            setSaveStatus('Failed to save settings.');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleFileUpload = (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files).map((file, index) => ({
                id: knowledgeFiles.length + index + 1,
                name: file.name,
                size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                uploadDate: new Date().toISOString().split('T')[0],
                type: file.name.split('.').pop().toUpperCase()
            }));
            setKnowledgeFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleFileDelete = (fileId) => {
        setKnowledgeFiles(prev => prev.filter(file => file.id !== fileId));
    };

    const filteredFiles = knowledgeFiles.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Knowledge management functions
    const handleKnowledgeFileUpload = async () => {
        if (!knowledgeFile) {
            setSaveStatus("Please select a file first.");
            return;
        }
        const fileData = new FormData();
        fileData.append('knowledgeFile', knowledgeFile);
        setSaveStatus('Uploading CSV...');
        try {
            const response = await axios.post(`http://localhost:3001/api/chatbots/${botId}/upload`, fileData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSaveStatus(response.data.message);
            setTimeout(() => setSaveStatus(''), 3000);
            fetchBotData();
            setKnowledgeFile(null);
            document.getElementById('knowledge-file-input').value = '';
        } catch (err) {
            setSaveStatus(`Upload failed: ${err.response?.data?.error || 'Check console.'}`);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleUrlScrape = async () => {
        if (!scrapeUrl) {
            setSaveStatus("Please enter a URL to scrape.");
            return;
        }
        setSaveStatus('Scraping URL...');
        try {
            const response = await axios.post(`http://localhost:3001/api/chatbots/${botId}/scrape`, { url: scrapeUrl });
            setSaveStatus(response.data.message);
            setTimeout(() => setSaveStatus(''), 3000);
            fetchBotData();
            setScrapeUrl('');
        } catch (err) {
            setSaveStatus(`Scrape failed: ${err.response?.data?.error || 'Check console.'}`);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleGenerateQuestions = async () => {
        setSaveStatus('AI is generating questions...');
        try {
            const response = await axios.post(`http://localhost:3001/api/bots/${botId}/generate-questions`);
            setSaveStatus(response.data.message);
            setTimeout(() => setSaveStatus(''), 3000);
            fetchBotData();
        } catch (err) {
            setSaveStatus(`Error: ${err.response?.data?.error || 'Failed to generate.'}`);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };
    
    const handleCredsChange = (e) => setConnectorCreds({ ...connectorCreds, [e.target.name]: e.target.value });

    const handleFetchModels = async () => {
        setSaveStatus('Verifying credentials and fetching models...');
        setFetchedModels([]);
        setSelectedModelUid('');
        try {
            const res = await axios.post('http://localhost:3001/api/external-models', { 
                apiKey: connectorCreds.apiKey, 
                managementToken: connectorCreds.managementToken 
            });
            setFetchedModels(res.data);
            setSaveStatus(`Found ${res.data.length} models! Please select one below.`);
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (err) { 
            setSaveStatus('Failed to fetch models. Please check your API Key and Management Token.');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleSaveConnection = async () => {
        if (!selectedModelUid) {
            alert("Please select a content model to connect.");
            return;
        }
        setSaveStatus('Saving connection...');
        try {
            const connectionDetails = {
                bot_name: botData.title,
                domain: botData.domain_bot,
                llm_provider: botData.llm_provider,
                connected_stack_api_key: connectorCreds.apiKey,
                connected_stack_delivery_token: connectorCreds.deliveryToken,
                connected_stack_environment: connectorCreds.environment,
                connected_model_uid: selectedModelUid,
            };
            await axios.put(`http://localhost:3001/api/chatbots/${botId}`, connectionDetails);
            
            setSaveStatus('Connection saved! Analyzing model with AI...');
            const analysisResponse = await axios.post(`http://localhost:3001/api/bots/${botId}/analyze-model`, {
                connected_model: {
                    stack_api_key: connectorCreds.apiKey,
                    delivery_token: connectorCreds.deliveryToken,
                    environment: connectorCreds.environment,
                    model_uid: selectedModelUid,
                }
            });
            setSaveStatus(analysisResponse.data.message);
            setTimeout(() => setSaveStatus(''), 3000);
            fetchBotData();
        } catch (err) {
            setSaveStatus(`An error occurred: ${err.response?.data?.error || 'Check console.'}`);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleImportFromModel = async () => {
        if (!selectedModelUid) {
            setSaveStatus('Please select a model first.');
            return;
        }
        setSaveStatus('Importing content from model...');
        try {
            const fieldsArray = (importOptions.fields || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            const body = {
                connected_model: {
                    stack_api_key: connectorCreds.apiKey,
                    delivery_token: connectorCreds.deliveryToken,
                    environment: connectorCreds.environment,
                    model_uid: selectedModelUid
                },
                deleteOld: !!importOptions.deleteOld,
                maxEntries: Number(importOptions.maxEntries) || 20,
                fields: fieldsArray.length > 0 ? fieldsArray : null,
                chunkChars: Number(importOptions.chunkChars) || 900,
                titleField: importOptions.titleField || null
            };
            const response = await axios.post(`http://localhost:3001/api/bots/${botId}/import-model-entries`, body);
            setSaveStatus(response.data.message);
            setTimeout(() => setSaveStatus(''), 3000);
            fetchBotData();
        } catch (err) {
            setSaveStatus(`Import failed: ${err.response?.data?.error || 'Check console.'}`);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleClearSource = async (sourceName) => {
        if (!sourceName) return;
        if (!window.confirm(`Detach and delete all knowledge items from source: ${sourceName}?`)) return;
        setSaveStatus('Detaching source...');
        try {
            const res = await axios.delete(`http://localhost:3001/api/chatbots/${botId}/knowledge/${encodeURIComponent(sourceName)}`);
            const msg = res?.data?.message || 'Source detached.';
            setSaveStatus(msg);
            setTimeout(() => setSaveStatus(''), 3000);
            await fetchBotData();
        } catch (err) {
            setSaveStatus('Failed to detach source.');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleClearKnowledge = async () => {
        if (window.confirm("Are you sure you want to delete this bot's entire knowledge base? This cannot be undone.")) {
            setSaveStatus("Clearing knowledge...");
            try {
                const response = await axios.delete(`http://localhost:3001/api/chatbots/${botId}/knowledge`);
                setSaveStatus(response.data.message);
                setTimeout(() => setSaveStatus(''), 3000);
                fetchBotData();
            } catch (err) {
                setSaveStatus("Failed to clear knowledge.");
                setTimeout(() => setSaveStatus(''), 3000);
            }
        }
    };

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
                    <p style={{ color: '#64748b' }}>Loading Bot Settings...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #f3e8ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
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
        );
    }

    const GeneralTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Settings style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>General Settings</h3>
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Configure your bot's basic information and behavior
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Bot Name
                            </label>
                            <input
                                type="text"
                                value={formData.bot_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, bot_name: e.target.value }))}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#6366f1';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Domain / Persona
                            </label>
                            <select
                                value={formData.domain}
                                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none',
                                    background: 'white'
                                }}
                            >
                                <option value="Free Prompt">Free Prompt</option>
                                <option value="E-commerce">E-commerce</option>
                                <option value="Customer Support">Customer Support</option>
                                <option value="Education">Education</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Finance">Finance</option>
                                <option value="Travel">Travel</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                            LLM Provider
                        </label>
                        <select
                            value={formData.llm_provider}
                            onChange={(e) => setFormData(prev => ({ ...prev, llm_provider: e.target.value }))}
                            style={{
                                width: '50%',
                                height: '40px',
                                padding: '0 12px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px',
                                outline: 'none',
                                background: 'white'
                            }}
                        >
                            <option value="Gemini">Gemini</option>
                            <option value="Groq">Groq</option>
                            <option value="OpenAI">OpenAI</option>
                        </select>
                    </div>
                    {formData.domain === 'Free Prompt' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Bot Persona & Instructions
                            </label>
                            <textarea
                                value={formData.free_prompt_system_message}
                                onChange={(e) => setFormData(prev => ({ ...prev, free_prompt_system_message: e.target.value }))}
                                placeholder="e.g., 'You are a helpful brand assistant ...'"
                                rows={7}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none',
                                    resize: 'vertical',
                                    minHeight: '120px',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#6366f1';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Bot style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Security</h3>
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                    Manage API keys and security settings
                </p>
                <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                        API Key
                    </label>
                    <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                        placeholder="Leave blank to keep existing"
                        style={{
                            width: '100%',
                            height: '40px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#6366f1';
                            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                        🔒 We encrypt and store your API keys securely using industry-standard encryption protocols.
                    </p>
                </div>
            </div>
        </div>
    );

    const AppearanceTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Palette style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Widget Appearance</h3>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                        Customize how your chatbot looks and feels
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Theme Color
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                    type="color"
                                    value={formData.themeColor}
                                    onChange={(e) => setFormData(prev => ({ ...prev, themeColor: e.target.value }))}
                                    style={{
                                        width: '48px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        cursor: 'pointer'
                                    }}
                                />
                                <input
                                    type="text"
                                    value={formData.themeColor}
                                    onChange={(e) => setFormData(prev => ({ ...prev, themeColor: e.target.value }))}
                                    placeholder="#6366f1"
                                    style={{
                                        flex: 1,
                                        height: '40px',
                                        padding: '0 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Font Style
                            </label>
                            <select
                                value={formData.fontStyle}
                                onChange={(e) => setFormData(prev => ({ ...prev, fontStyle: e.target.value }))}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none',
                                    background: 'white'
                                }}
                            >
                                <option value="Inter">Inter</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Open Sans">Open Sans</option>
                                <option value="Lato">Lato</option>
                                <option value="Poppins">Poppins</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Avatar Image
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {formData.avatarUrl && (
                                    <img
                                        src={formData.avatarUrl}
                                        alt="Bot avatar"
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '1px solid #d1d5db'
                                        }}
                                    />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files && e.target.files[0];
                                        if (file) {
                                            const url = URL.createObjectURL(file);
                                            setFormData(prev => ({ ...prev, avatarUrl: url }));
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        height: '40px',
                                        padding: '0 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Eye style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Live Preview</h3>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                        See how your chatbot will appear to users
                    </p>
                    <div style={{
                        background: '#f9fafb',
                        borderRadius: '12px',
                        padding: '16px',
                        minHeight: '200px',
                        position: 'relative'
                    }}>
                        <div style={{
                            position: 'absolute',
                            bottom: '16px',
                            right: '16px',
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: formData.themeColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        >
                            {formData.avatarUrl ? (
                                <img
                                    src={formData.avatarUrl}
                                    alt="Bot"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <Bot style={{ width: '24px', height: '24px' }} />
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '12px',
                                maxWidth: '200px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}>
                                <p style={{ fontSize: '14px', margin: 0, fontFamily: formData.fontStyle }}>
                                    Hello! I'm {formData.bot_name}. How can I help you today?
                                </p>
                            </div>
                            
                            <div style={{
                                background: '#e5e7eb',
                                borderRadius: '12px',
                                padding: '12px',
                                maxWidth: '150px',
                                marginLeft: 'auto'
                            }}>
                                <p style={{ fontSize: '14px', margin: 0 }}>What are your hours?</p>
                            </div>
                            
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '12px',
                                maxWidth: '200px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}>
                                <p style={{ fontSize: '14px', margin: 0, fontFamily: formData.fontStyle }}>
                                    We're open 24/7! Is there anything specific I can help you with?
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // KnowledgeSources component
    const KnowledgeSources = ({ botData, onClearSource }) => {
        const sources = botData?.active_knowledge_sources || [];
        if (sources.length === 0) return <p style={{ color: '#6b7280' }}>No active knowledge sources.</p>;

        const groupedSources = sources.reduce((acc, item) => {
            const sourceName = item.source_name || "Untitled Source";
            if (!acc[sourceName]) acc[sourceName] = 0;
            acc[sourceName]++;
            return acc;
        }, {});

        return (
            <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Active Knowledge Sources:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(groupedSources).map(([name, count]) => (
                        <div
                            key={name}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#f3f4f6',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb'
                            }}
                        >
                            <span style={{ fontSize: '14px', color: '#374151' }}>{name} ({count} items)</span>
                            <button
                                onClick={() => onClearSource(name)}
                                style={{
                                    fontSize: '12px',
                                    color: '#dc2626',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    transition: 'background-color 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#fef2f2';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                }}
                            >
                                Detach
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const KnowledgeTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Training Summary */}
            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Training Summary</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                            Total Knowledge Items: {botData?.active_knowledge_sources?.length || 0}
                        </p>
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                            Last Updated: {botData?.updated_at ? new Date(botData.updated_at).toLocaleDateString() : 'Never'}
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateQuestions}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #6366f1',
                            background: 'white',
                            color: '#6366f1',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#6366f1';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.color = '#6366f1';
                        }}
                    >
                        <Upload style={{ width: '16px', height: '16px' }} />
                        Generate Questions
                    </button>
                </div>
                <KnowledgeSources botData={botData} onClearSource={handleClearSource} />
            </div>

            {/* Knowledge Management Tabs */}
            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px'
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Add or Replace Knowledge</h3>
                
                {/* Knowledge Source Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: '24px'
                }}>
                    {[
                        { id: 'csv', label: 'Upload CSV', icon: Upload },
                        { id: 'url', label: 'Scrape from URL', icon: Search },
                        { id: 'cms', label: 'Connect Contentstack', icon: Settings }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveKnowledgeTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 16px',
                                border: 'none',
                                background: 'transparent',
                                color: activeKnowledgeTab === tab.id ? '#6366f1' : '#6b7280',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                borderBottom: activeKnowledgeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (activeKnowledgeTab !== tab.id) {
                                    e.target.style.color = '#374151';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeKnowledgeTab !== tab.id) {
                                    e.target.style.color = '#6b7280';
                                }
                            }}
                        >
                            <tab.icon style={{ width: '16px', height: '16px' }} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* CSV Upload Tab */}
                {activeKnowledgeTab === 'csv' && (
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Upload a CSV File</h4>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                            File must contain 'question' and 'answer' columns. Re-uploading will replace existing knowledge.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input
                                type="file"
                                id="knowledge-file-input"
                                accept=".csv"
                                onChange={(e) => setKnowledgeFile(e.target.files[0])}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleKnowledgeFileUpload}
                                disabled={!knowledgeFile || saveStatus.includes('Uploading')}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: !knowledgeFile || saveStatus.includes('Uploading') ? '#9ca3af' : '#6366f1',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: !knowledgeFile || saveStatus.includes('Uploading') ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    alignSelf: 'flex-start'
                                }}
                            >
                                {saveStatus.includes('Uploading') ? 'Uploading...' : 'Upload CSV'}
                            </button>
                        </div>
                    </div>
                )}

                {/* URL Scraping Tab */}
                {activeKnowledgeTab === 'url' && (
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Scrape Knowledge from a Web Page</h4>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                            Enter a public URL to a page with good text content (like an FAQ). This will replace the bot's existing knowledge.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input
                                type="url"
                                value={scrapeUrl}
                                onChange={(e) => setScrapeUrl(e.target.value)}
                                placeholder="https://example.com/faq"
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleUrlScrape}
                                disabled={!scrapeUrl || saveStatus.includes('Scraping')}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: !scrapeUrl || saveStatus.includes('Scraping') ? '#9ca3af' : '#6366f1',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: !scrapeUrl || saveStatus.includes('Scraping') ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    alignSelf: 'flex-start'
                                }}
                            >
                                {saveStatus.includes('Scraping') ? 'Scraping...' : 'Scrape & Add'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Contentstack Tab */}
                {activeKnowledgeTab === 'cms' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Connect to a Live Contentstack Model</h4>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                                Point your bot to a content model in another Stack to use as its primary brain. The bot will intelligently adapt to its structure.
                            </p>
                        </div>
                        
                        {/* Step 1: Credentials */}
                        <div style={{
                            background: '#f9fafb',
                            borderRadius: '12px',
                            padding: '20px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Step 1: Provide Credentials for the external Stack</h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                <input
                                    name="apiKey"
                                    value={connectorCreds.apiKey}
                                    onChange={handleCredsChange}
                                    placeholder="Stack API Key"
                                    style={{
                                        height: '40px',
                                        padding: '0 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                <input
                                    name="deliveryToken"
                                    value={connectorCreds.deliveryToken}
                                    onChange={handleCredsChange}
                                    placeholder="Delivery Token"
                                    style={{
                                        height: '40px',
                                        padding: '0 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                <input
                                    name="managementToken"
                                    type="password"
                                    value={connectorCreds.managementToken}
                                    onChange={handleCredsChange}
                                    placeholder="Management Token (to list models)"
                                    style={{
                                        height: '40px',
                                        padding: '0 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                <input
                                    name="environment"
                                    value={connectorCreds.environment}
                                    onChange={handleCredsChange}
                                    placeholder="Environment Name"
                                    style={{
                                        height: '40px',
                                        padding: '0 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <button
                                onClick={handleFetchModels}
                                style={{
                                    marginTop: '16px',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#6366f1',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Verify & Fetch Models
                            </button>
                        </div>

                        {/* Step 2: Model Selection */}
                        {fetchedModels.length > 0 && (
                            <div style={{
                                background: '#f9fafb',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '1px solid #e5e7eb'
                            }}>
                                <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Step 2: Select the Content Model</h5>
                                <select
                                    value={selectedModelUid}
                                    onChange={(e) => setSelectedModelUid(e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '40px',
                                        padding: '0 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        background: 'white'
                                    }}
                                >
                                    <option value="" disabled>-- Select a Model --</option>
                                    {fetchedModels.map(m => <option key={m.uid} value={m.uid}>{m.title}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Step 3: Import Options and Actions */}
                        {selectedModelUid && (
                            <div style={{
                                background: '#f9fafb',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '1px solid #e5e7eb'
                            }}>
                                <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Step 3: Import Options and Actions</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                    <div>
                                        <h6 style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>Import Options</h6>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={importOptions.deleteOld}
                                                    onChange={(e) => setImportOptions({ ...importOptions, deleteOld: e.target.checked })}
                                                    style={{ margin: 0 }}
                                                />
                                                Replace existing knowledge
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={importOptions.maxEntries}
                                                    onChange={(e) => setImportOptions({ ...importOptions, maxEntries: e.target.value })}
                                                    placeholder="Max entries (20)"
                                                    style={{
                                                        height: '40px',
                                                        padding: '0 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #d1d5db',
                                                        fontSize: '14px',
                                                        outline: 'none'
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    min="200"
                                                    value={importOptions.chunkChars}
                                                    onChange={(e) => setImportOptions({ ...importOptions, chunkChars: e.target.value })}
                                                    placeholder="Chunk size (900 chars)"
                                                    style={{
                                                        height: '40px',
                                                        padding: '0 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #d1d5db',
                                                        fontSize: '14px',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={importOptions.fields}
                                                onChange={(e) => setImportOptions({ ...importOptions, fields: e.target.value })}
                                                placeholder="Fields to include (comma-separated)"
                                                style={{
                                                    height: '40px',
                                                    padding: '0 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #d1d5db',
                                                    fontSize: '14px',
                                                    outline: 'none'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                value={importOptions.titleField}
                                                onChange={(e) => setImportOptions({ ...importOptions, titleField: e.target.value })}
                                                placeholder="Title field (optional)"
                                                style={{
                                                    height: '40px',
                                                    padding: '0 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #d1d5db',
                                                    fontSize: '14px',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={handleSaveConnection}
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: '#6366f1',
                                                color: 'white',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            Save Connection & Configure Bot with AI
                                        </button>
                                        <button
                                            onClick={handleImportFromModel}
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #6366f1',
                                                background: 'white',
                                                color: '#6366f1',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            Import Model Entries as Knowledge
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setSaveStatus('Syncing new entries...');
                                                try {
                                                    const res = await axios.post(`http://localhost:3001/api/bots/${botId}/sync-new-model-entries`);
                                                    const msg = res?.data?.message || 'Sync completed.';
                                                    setSaveStatus(msg);
                                                    setTimeout(() => setSaveStatus(''), 3000);
                                                    fetchBotData();
                                                } catch (err) {
                                                    const apiErr = err?.response?.data?.error || err?.message || 'Unknown error';
                                                    setSaveStatus(`Sync failed: ${apiErr}`);
                                                    setTimeout(() => setSaveStatus(''), 3000);
                                                }
                                            }}
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #6366f1',
                                                background: 'white',
                                                color: '#6366f1',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            Sync New Entries
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Clear Knowledge Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleClearKnowledge}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #dc2626',
                        background: 'white',
                        color: '#dc2626',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#dc2626';
                        e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'white';
                        e.target.style.color = '#dc2626';
                    }}
                >
                    Clear All Knowledge
                </button>
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #f3e8ff 100%)',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Header */}
            <div style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <div style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    padding: '24px'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                        <Link
                            to="/"
                            style={{
                                color: '#2563eb',
                                fontWeight: '600',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.color = '#1d4ed8';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.color = '#2563eb';
                            }}
                        >
                            <ArrowLeft style={{ width: '16px', height: '16px' }} />
                            Back to Dashboard
                        </Link>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: '#dbeafe',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Bot style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>Bot Settings</h1>
                            <p style={{ color: '#6b7280', margin: 0 }}>{botData?.title}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: '32px 24px'
            }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '32px',
                    background: 'white',
                    borderRadius: '12px',
                    padding: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    width: 'fit-content'
                }}>
                    {[
                        { id: 'general', label: 'General', icon: Settings },
                        { id: 'appearance', label: 'Appearance', icon: Palette },
                        { id: 'knowledge', label: 'Knowledge', icon: Upload }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === tab.id ? '#6366f1' : 'transparent',
                                color: activeTab === tab.id ? 'white' : '#6b7280',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.id) {
                                    e.target.style.background = '#f3f4f6';
                                    e.target.style.color = '#374151';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.id) {
                                    e.target.style.background = 'transparent';
                                    e.target.style.color = '#6b7280';
                                }
                            }}
                        >
                            <tab.icon style={{ width: '16px', height: '16px' }} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'appearance' && <AppearanceTab />}
                {activeTab === 'knowledge' && <KnowledgeTab />}

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                    <button
                        onClick={handleSave}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.3s ease'
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
                        <Save style={{ width: '16px', height: '16px' }} />
                        Save Changes
                    </button>
                </div>

                {/* Save Status */}
                {saveStatus && (
                    <div style={{
                        position: 'fixed',
                        bottom: '16px',
                        right: '16px',
                        background: saveStatus.includes('successfully') ? '#10b981' : '#ef4444',
                        color: 'white',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        fontSize: '14px',
                        fontWeight: '500',
                        animation: 'slideInFromRight 0.3s ease'
                    }}>
                        {saveStatus}
                    </div>
                )}
            </div>
        </div>
    );
}
