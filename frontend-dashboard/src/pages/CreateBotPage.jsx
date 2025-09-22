import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Bot, Settings, Palette, Upload, Save } from 'lucide-react';
import { HexColorPicker } from "react-colorful";

export default function CreateBotPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [saveStatus, setSaveStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        bot_name: '',
        domain: 'Free Prompt',
        llm_provider: 'Gemini',
        api_key: '',
        free_prompt_system_message: '',
        ui_settings: {
            themeColor: '#6366f1',
            position: 'bottom-right'
        }
    });

    // Knowledge file state
    const [knowledgeFile, setKnowledgeFile] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'position') {
            setFormData(prev => ({ ...prev, ui_settings: { ...prev.ui_settings, position: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleColorChange = (newColor) => {
        setFormData(prev => ({ ...prev, ui_settings: { ...prev.ui_settings, themeColor: newColor } }));
    };

    const handleSubmit = async () => {
        const requiredFields = ['bot_name', 'api_key'];
        for (const field of requiredFields) {
            if (!formData[field]) {
                setError(`${field.replace('_', ' ')} is required.`);
                return;
            }
        }
        
        setIsSubmitting(true);
        setError(null);
        setSaveStatus('Creating chatbot...');

        try {
            // Step 1: Create the bot
            const response = await axios.post('http://localhost:3001/api/chatbots', formData);
            const newBotId = response.data.uid;

            // Step 2: If a file was selected, upload it
            if (knowledgeFile && newBotId) {
                const fileData = new FormData();
                fileData.append('knowledgeFile', knowledgeFile);
                await axios.post(`http://localhost:3001/api/chatbots/${newBotId}/upload`, fileData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            setSaveStatus('Chatbot created successfully!');
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (err) {
            setError('Failed to create chatbot. Please try again.');
            setSaveStatus('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const GeneralTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Settings style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>General Settings</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>Configure your bot's basic information and behavior</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                            Bot Name
                        </label>
                        <input
                            type="text"
                            name="bot_name"
                            value={formData.bot_name}
                            onChange={handleChange}
                            placeholder="Enter bot name"
                            style={{
                                width: '100%',
                                height: '40px',
                                padding: '0 12px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px',
                                outline: 'none',
                                background: 'white',
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
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Domain / Persona
                            </label>
                            <select
                                name="domain"
                                value={formData.domain}
                                onChange={handleChange}
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
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                LLM Provider
                            </label>
                            <select
                                name="llm_provider"
                                value={formData.llm_provider}
                                onChange={handleChange}
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
                                <option value="Gemini">Gemini</option>
                                <option value="Groq">Groq</option>
                                <option value="OpenAI">OpenAI</option>
                            </select>
                        </div>
                    </div>
                    
                    {formData.domain === 'Free Prompt' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Bot Persona & Instructions
                            </label>
                            <textarea
                                name="free_prompt_system_message"
                                value={formData.free_prompt_system_message}
                                onChange={handleChange}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Bot style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Security</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>Manage API keys and security settings</p>
                
                <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                        API Key
                    </label>
                    <input
                        type="password"
                        name="api_key"
                        value={formData.api_key}
                        onChange={handleChange}
                        placeholder="Paste your secret API key here"
                        style={{
                            width: '100%',
                            height: '40px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px',
                            outline: 'none',
                            background: 'white',
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
            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Palette style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Widget Appearance</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>Customize how your chatbot looks and feels</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>
                            Theme Color
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="color"
                                value={formData.ui_settings.themeColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                style={{
                                    width: '48px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            />
                            <input
                                type="text"
                                value={formData.ui_settings.themeColor}
                                onChange={(e) => handleColorChange(e.target.value)}
                                placeholder="#6366f1"
                                style={{
                                    flex: 1,
                                    height: '40px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    outline: 'none',
                                    background: 'white'
                                }}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>
                            Position on Screen
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
                                <label key={pos} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    cursor: 'pointer',
                                    background: formData.ui_settings.position === pos ? '#f3f4f6' : 'white',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <input
                                        type="radio"
                                        name="position"
                                        value={pos}
                                        checked={formData.ui_settings.position === pos}
                                        onChange={handleChange}
                                        style={{ margin: 0 }}
                                    />
                                    <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                                        {pos.replace('-', ' ')}
                                    </span>
                                </label>
                            ))}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Bot style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Live Preview</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>See how your chatbot will appear to users</p>
                
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
                        [formData.ui_settings.position.includes('right') ? 'right' : 'left']: '16px',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        backgroundColor: formData.ui_settings.themeColor
                    }}>
                        <Bot style={{ width: '24px', height: '24px' }} />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '12px',
                            maxWidth: '200px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>
                            <p style={{ fontSize: '14px', margin: 0, color: '#374151' }}>
                                Hello! I'm {formData.bot_name || 'your bot'}. How can I help you today?
                            </p>
                        </div>
                        <div style={{
                            background: '#e5e7eb',
                            borderRadius: '12px',
                            padding: '12px',
                            maxWidth: '150px',
                            marginLeft: 'auto'
                        }}>
                            <p style={{ fontSize: '14px', margin: 0, color: '#374151' }}>What are your hours?</p>
                        </div>
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '12px',
                            maxWidth: '200px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>
                            <p style={{ fontSize: '14px', margin: 0, color: '#374151' }}>
                                We're open 24/7! Is there anything specific I can help you with?
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const KnowledgeTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Upload style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>Custom Knowledge (Optional)</h3>
                </div>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>Upload a CSV file to give your bot custom knowledge</p>
                
                <div>
                    <input
                        type="file"
                        id="knowledgeFile"
                        accept=".csv"
                        onChange={(e) => setKnowledgeFile(e.target.files[0])}
                        style={{ display: 'none' }}
                    />
                    <label
                        htmlFor="knowledgeFile"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '16px',
                            border: '2px dashed #d1d5db',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: '#f9fafb'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.borderColor = '#6366f1';
                            e.target.style.background = '#f0f4ff';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.background = '#f9fafb';
                        }}
                    >
                        <Upload style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                        <span style={{ color: '#6b7280', fontWeight: '500' }}>
                            {knowledgeFile ? knowledgeFile.name : 'Choose CSV file or drag and drop'}
                        </span>
                    </label>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
                        Upload a CSV with 'question' and 'answer' columns. Max file size: 10 MB
                    </p>
                </div>
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
                borderBottom: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    padding: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <Link
                                to="/"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#6366f1',
                                    textDecoration: 'none',
                                    fontWeight: '500',
                                    transition: 'color 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#4f46e5'}
                                onMouseLeave={(e) => e.target.style.color = '#6366f1'}
                            >
                                <ArrowLeft style={{ width: '16px', height: '16px' }} />
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Bot style={{ width: '24px', height: '24px', color: 'white' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                                Create New Chatbot
                            </h1>
                            <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
                                Configure your agent's basics and appearance
                            </p>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Tabs */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        padding: '8px',
                        display: 'flex',
                        gap: '4px'
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
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: activeTab === tab.id ? '#6366f1' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : '#6b7280',
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

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '12px',
                            padding: '16px',
                            color: '#dc2626'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Save Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: isSubmitting ? '#9ca3af' : '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                    e.target.style.background = '#4f46e5';
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 6px 8px -1px rgba(0, 0, 0, 0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSubmitting) {
                                    e.target.style.background = '#6366f1';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                }
                            }}
                        >
                            <Save style={{ width: '16px', height: '16px' }} />
                            {isSubmitting ? 'Creating...' : 'Create Chatbot'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Status */}
            {saveStatus && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: saveStatus.includes('successfully') ? '#10b981' : '#6366f1',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    fontWeight: '500',
                    zIndex: 1000
                }}>
                    {saveStatus}
                </div>
            )}
        </div>
    );
}