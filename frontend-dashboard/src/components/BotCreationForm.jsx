import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { HexColorPicker } from "react-colorful";

// Safely compute initial UI settings from optional serialized data
function getInitialUiSettingsFrom(initialData) {
	try {
		const parsed = initialData?.ui_settings ? JSON.parse(initialData.ui_settings) : {};
		return {
			themeColor: parsed.themeColor || '#6366f1',
			position: parsed.position || 'bottom-right',
		};
	} catch {
		return { themeColor: '#6366f1', position: 'bottom-right' };
	}
}

export default function BotCreationForm({ initialData, onSubmit, isEditing = false }) {
    const navigate = useNavigate();

    // ✅ THIS IS THE MAIN FIX
    const [formData, setFormData] = useState({
        bot_name: initialData?.title || '',
        domain: initialData?.domain_bot || 'E-commerce',
        llm_provider: initialData?.llm_provider || 'Gemini',
        api_key: '',
        free_prompt_system_message: initialData?.free_prompt_system_message || '',
        ui_settings: getInitialUiSettingsFrom(initialData),
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    // ✅ NEW: Add state for the file
    const [knowledgeFile, setKnowledgeFile] = useState(null);

    // We don't even need the useEffect anymore with this approach. Let's remove it for simplicity.
    // useEffect(() => { ... }, [isEditing, initialData]); // DELETE THIS HOOK
    
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const requiredFields = isEditing ? ['bot_name'] : ['bot_name', 'api_key'];
        for (const field of requiredFields) {
            if (!formData[field]) {
                setError(`${field.replace('_', ' ')} is required.`);
                return;
            }
        }
        
        setIsSubmitting(true);
        setError(null);

        try {
            if (isEditing) {
                await onSubmit(formData);
            } else {
                // --- CREATE LOGIC ---
                // Step 1: Create the bot
                const response = await axios.post('http://localhost:3001/api/chatbots', formData);
                const newBotId = response.data.uid; // Get the new bot's ID

                // ✅ Step 2: If a file was selected, upload it
                if (knowledgeFile && newBotId) {
                    const fileData = new FormData();
                    fileData.append('knowledgeFile', knowledgeFile);
                    await axios.post(`http://localhost:3001/api/chatbots/${newBotId}/upload`, fileData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
                navigate('/');
            }
        } catch (err) {
            setError(`Failed to ${isEditing ? 'update' : 'create'} chatbot. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="bot_name" className="block text-sm font-medium text-slate-700 mb-2">Bot Name</label>
                    <input type="text" name="bot_name" id="bot_name" value={formData.bot_name} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label htmlFor="domain" className="block text-sm font-medium text-slate-700 mb-2">Domain</label>
                    <select name="domain" id="domain" value={formData.domain} onChange={handleChange} className="select-field">
                        <option>E-commerce</option> <option>Travel</option> <option>Education</option> <option>Free Prompt</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="llm_provider" className="block text-sm font-medium text-slate-700 mb-2">LLM Provider</label>
                    <select name="llm_provider" id="llm_provider" value={formData.llm_provider} onChange={handleChange} className="select-field">
                        <option>Gemini</option> <option>Groq</option> <option>OpenAI</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="api_key" className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
                    <input type="password" name="api_key" id="api_key" value={formData.api_key} onChange={handleChange} className="input-field" placeholder={isEditing ? "Leave blank to keep existing key" : "Paste your secret API key here"} />
                </div>
            </div>
			{/* ✅ NEW: Conditional Textarea for Free Prompt */}
			{formData.domain === 'Free Prompt' && (
				<div>
					<label htmlFor="free_prompt_system_message" className="block text-sm font-medium text-slate-300 mb-2">
						Bot Persona & Instructions
					</label>
					<textarea
						name="free_prompt_system_message"
						id="free_prompt_system_message"
						rows={5}
						value={formData.free_prompt_system_message}
						onChange={handleChange}
						className="w-full bg-slate-700 rounded-md p-2 text-white placeholder-slate-400"
						placeholder="Describe your bot's personality and purpose. e.g., 'You are a sarcastic pirate who is an expert on classic literature...'"
					/>
				</div>
			)}
            

            {/* ✅ NEW: Add this file input field for CREATE mode */}
            {!isEditing && (
                <div>
                    <label htmlFor="knowledgeFile" className="block text-sm font-medium text-slate-700 mb-2">Custom Knowledge (Optional)</label>
                    <input
                        type="file"
                        id="knowledgeFile"
                        accept=".csv"
                        onChange={(e) => setKnowledgeFile(e.target.files[0])}
                        className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-slate-200 file:text-sm file:font-semibold file:bg-white file:text-slate-900 hover:file:bg-slate-50 transition-colors cursor-pointer"
                    />
                    <p className="text-xs text-slate-500 mt-1">Upload a CSV with 'question' and 'answer' columns.</p>
                </div>
            )}

            <div className="pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Widget Customization</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">Position on Screen</label>
                        <div className="space-y-2">
                            {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
                                <label key={pos} className="flex items-center space-x-3 text-slate-800 cursor-pointer p-3 rounded-md hover:bg-slate-100 border border-slate-200">
                                    <input type="radio" name="position" value={pos} checked={formData.ui_settings.position === pos} onChange={handleChange} className="h-4 w-4" />
                                    <span>{pos.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">Theme Color</label>
                        <HexColorPicker color={formData.ui_settings.themeColor} onChange={handleColorChange} />
                        <div className="mt-3 w-full h-8 rounded border border-slate-200" style={{ backgroundColor: formData.ui_settings.themeColor }}></div>
                    </div>
                </div>
            </div>
            
            <div className="pt-4">
                {error && <p className="text-red-600 mb-4">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-3">
                    {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Chatbot')}
                </button>
            </div>
        </form>
    );
}