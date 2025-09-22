import { useState, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import axios from 'axios';
import { HexColorPicker } from "react-colorful";

export default function AppearanceSettingsPage() {
    const { botData, fetchBotData } = useOutletContext();
    const { botId } = useParams();
    const [settings, setSettings] = useState({ themeColor: '#6366f1', position: 'bottom-right' });
    const [status, setStatus] = useState({ message: '', error: false });

    useEffect(() => {
        if (botData?.ui_settings) {
            try {
                const parsed = JSON.parse(botData.ui_settings);
                setSettings({
                    themeColor: parsed.themeColor || '#6366f1',
                    position: parsed.position || 'bottom-right'
                });
            } catch (e) { console.error("Could not parse UI settings"); }
        }
    }, [botData]);

    const handlePositionChange = (e) => setSettings({ ...settings, position: e.target.value });

    const handleSave = async (e) => {
        e.preventDefault();
        setStatus({ message: 'Saving...', error: false });
        try {
            // Send back all existing botData to avoid erasing it
            await axios.put(`http://localhost:3001/api/chatbots/${botId}`, {
                bot_name: botData.title,
                domain: botData.domain_bot,
                llm_provider: botData.llm_provider,
                ui_settings: settings 
            });
            setStatus({ message: 'Appearance saved successfully!', error: false });
            fetchBotData();
        } catch (err) {
            setStatus({ message: 'Failed to save appearance.', error: true });
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Widget Appearance</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Position on Screen</label>
                            <div className="space-y-3">
                                {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
                                    <label key={pos} className="flex items-center space-x-3 text-slate-800 cursor-pointer p-3 rounded-md hover:bg-slate-100 border border-slate-200">
                                        <input type="radio" name="position" value={pos} checked={settings.position === pos} onChange={handlePositionChange} className="h-4 w-4"/>
                                        <span>{pos.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Theme Color</label>
                            <HexColorPicker color={settings.themeColor} onChange={(color) => setSettings({...settings, themeColor: color})} style={{ width: '100%' }} />
                            <div className="mt-3 w-full h-10 rounded border border-slate-200" style={{ backgroundColor: settings.themeColor }}></div>
                        </div>
                    </div>
                </div>
                <aside className="card p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Preview</h3>
                    <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">Your widget will appear with this color and position.</div>
                </aside>
            </div>
            <div className="flex justify-end items-center gap-4">
                {status.message && <p className={`text-sm ${status.error ? 'text-red-600' : 'text-green-600'}`}>{status.message}</p>}
                <button type="submit" className="btn-primary">Save Changes</button>
            </div>
        </form>
    );
}