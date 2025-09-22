import { useState, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import axios from 'axios';

export default function GeneralSettingsPage() {
    const { botData, fetchBotData } = useOutletContext();
    const { botId } = useParams();
    const [formData, setFormData] = useState({
        bot_name: '', domain: 'Free Prompt', llm_provider: 'Gemini', 
        free_prompt_system_message: '', api_key: ''
    });
    const [status, setStatus] = useState({ message: '', error: false });

    useEffect(() => {
        if (botData) {
            setFormData({
                bot_name: botData.title || '',
                domain: botData.domain_bot || 'Free Prompt',
                llm_provider: botData.llm_provider || 'Gemini',
                free_prompt_system_message: botData.free_prompt_system_message || '',
                api_key: ''
            });
        }
    }, [botData]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleSave = async (e) => {
        e.preventDefault();
        setStatus({ message: 'Saving...', error: false });
        try {
            await axios.put(`http://localhost:3001/api/chatbots/${botId}`, formData);
            setStatus({ message: 'General settings saved successfully!', error: false });
            fetchBotData();
        } catch (err) {
            setStatus({ message: 'Failed to save settings.', error: true });
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">General Settings</h2>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="bot_name" className="block text-sm font-medium text-slate-700 mb-2">Bot Name</label>
                            <input type="text" name="bot_name" value={formData.bot_name} onChange={handleChange} className="input-field"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="domain" className="block text-sm font-medium text-slate-700 mb-2">Domain / Persona</label>
                                <select name="domain" value={formData.domain} onChange={handleChange} className="input-field">
                                    <option>Free Prompt</option><option>E-commerce</option><option>Travel</option><option>Education</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="llm_provider" className="block text-sm font-medium text-slate-700 mb-2">LLM Provider</label>
                                <select name="llm_provider" value={formData.llm_provider} onChange={handleChange} className="input-field">
                                    <option>Gemini</option><option>Groq</option><option>OpenAI</option>
                                </select>
                            </div>
                        </div>
                        {formData.domain === 'Free Prompt' && (
                            <div>
                                <label htmlFor="free_prompt_system_message" className="block text-sm font-medium text-slate-700 mb-2">Bot Persona & Instructions</label>
                                <textarea name="free_prompt_system_message" rows={7} value={formData.free_prompt_system_message} onChange={handleChange} className="textarea-field" placeholder="e.g., 'You are a helpful brand assistant ...'"/>
                            </div>
                        )}
                    </div>
                </div>
                <aside className="card p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Security</h3>
                    <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
                    <input type="password" name="api_key" value={formData.api_key} onChange={handleChange} className="input-field" placeholder="Leave blank to keep existing key"/>
                    <p className="text-xs text-slate-500 mt-2">We’ll encrypt and store your key securely.</p>
                </aside>
            </div>
            <div className="flex justify-end items-center gap-4">
                {status.message && <p className={`text-sm ${status.error ? 'text-red-600' : 'text-green-600'}`}>{status.message}</p>}
                <button type="submit" className="btn-primary">Save Changes</button>
            </div>
        </form>
    );
}