import { useState, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import axios from 'axios';
import TrainingSummary from '../components/TrainingSummary';

export default function KnowledgeSettingsPage() {
    // useOutletContext allows us to get props from the parent route (EditBotPage)
    const { botData, fetchBotData } = useOutletContext();
    const { botId } = useParams();
    
    // UI State
    const [activeTab, setActiveTab] = useState('csv');
    const [status, setStatus] = useState({ message: '', error: false });

    // Knowledge Source State
    const [knowledgeFile, setKnowledgeFile] = useState(null);
    const [scrapeUrl, setScrapeUrl] = useState('');
    
    // Contentstack Connector State
    const [connectorCreds, setConnectorCreds] = useState({
        apiKey: '',
        deliveryToken: '',
        managementToken: '',
        environment: 'production', // Default to production
    });
    const [fetchedModels, setFetchedModels] =useState([]);
    const [selectedModelUid, setSelectedModelUid] = useState('');
    const [importOptions, setImportOptions] = useState({
        deleteOld: true,
        maxEntries: 20,
        fields: '',
        chunkChars: 900,
        titleField: ''
    });

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

    // --- Handler Functions ---

    const handleFileUpload = async () => {
        if (!knowledgeFile) {
            setStatus({ message: "Please select a file first.", error: true });
            return;
        }
        const fileData = new FormData();
        fileData.append('knowledgeFile', knowledgeFile);
        setStatus({ message: 'Uploading CSV...', error: false });
        try {
            const response = await axios.post(`http://localhost:3001/api/chatbots/${botId}/upload`, fileData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus({ message: response.data.message, error: false });
            fetchBotData(); // Refresh the bot data to update the summary
            setKnowledgeFile(null);
            document.getElementById('knowledge-file-input').value = '';
        } catch (err) {
            setStatus({ message: `Upload failed: ${err.response?.data?.error || 'Check console.'}`, error: true });
        }
    };

    const handleUrlScrape = async () => {
        if (!scrapeUrl) {
            setStatus({ message: "Please enter a URL to scrape.", error: true });
            return;
        }
        setStatus({ message: 'Scraping URL...', error: false });
        try {
            const response = await axios.post(`http://localhost:3001/api/chatbots/${botId}/scrape`, { url: scrapeUrl });
            setStatus({ message: response.data.message, error: false });
            fetchBotData(); // Refresh the bot data to update the summary
            setScrapeUrl('');
        } catch (err) {
            setStatus({ message: `Scrape failed: ${err.response?.data?.error || 'Check console.'}`, error: true });
        }
    };

    const handleGenerateQuestions = async () => {
        setStatus({ message: 'AI is generating questions...', error: false });
        try {
            const response = await axios.post(`http://localhost:3001/api/bots/${botId}/generate-questions`);
            setStatus({ message: response.data.message, error: false });
            fetchBotData(); // Refresh the bot data to update the summary
        } catch (err) {
            setStatus({ message: `Error: ${err.response?.data?.error || 'Failed to generate.'}`, error: true });
        }
    };
    
    const handleCredsChange = (e) => setConnectorCreds({ ...connectorCreds, [e.target.name]: e.target.value });

    const handleFetchModels = async () => {
        setStatus({ message: 'Verifying credentials and fetching models...', error: false });
        setFetchedModels([]);
        setSelectedModelUid('');
        try {
            const res = await axios.post('http://localhost:3001/api/external-models', { 
                apiKey: connectorCreds.apiKey, 
                managementToken: connectorCreds.managementToken 
            });
            setFetchedModels(res.data);
            setStatus({ message: `Found ${res.data.length} models! Please select one below.`, error: false });
        } catch (err) { 
            setStatus({ message: 'Failed to fetch models. Please check your API Key and Management Token.', error: true });
        }
    };

    const handleSaveConnection = async () => {
        if (!selectedModelUid) {
            alert("Please select a content model to connect.");
            return;
        }
        setStatus({ message: 'Saving connection...', error: false });
        try {
            const connectionDetails = {
                // We need to send the other bot data back as well so it doesn't get erased on update
                bot_name: botData.title,
                domain: botData.domain_bot,
                llm_provider: botData.llm_provider,
                // New connection details
                connected_stack_api_key: connectorCreds.apiKey,
                connected_stack_delivery_token: connectorCreds.deliveryToken,
                connected_stack_environment: connectorCreds.environment,
                connected_model_uid: selectedModelUid,
            };
            await axios.put(`http://localhost:3001/api/chatbots/${botId}`, connectionDetails);
            
            setStatus({ message: 'Connection saved! Analyzing model with AI...', error: false });
            const analysisResponse = await axios.post(`http://localhost:3001/api/bots/${botId}/analyze-model`, {
                connected_model: {
                    stack_api_key: connectorCreds.apiKey,
                    delivery_token: connectorCreds.deliveryToken,
                    environment: connectorCreds.environment,
                    model_uid: selectedModelUid,
                }
            });
            setStatus({ message: analysisResponse.data.message, error: false });
            fetchBotData(); // Refresh all bot data
        } catch (err) {
            setStatus({ message: `An error occurred: ${err.response?.data?.error || 'Check console.'}`, error: true });
        }
    };

    const handleImportFromModel = async () => {
        if (!selectedModelUid) {
            setStatus({ message: 'Please select a model first.', error: true });
            return;
        }
        setStatus({ message: 'Importing content from model...', error: false });
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
            setStatus({ message: response.data.message, error: false });
            fetchBotData();
        } catch (err) {
            setStatus({ message: `Import failed: ${err.response?.data?.error || 'Check console.'}`, error: true });
        }
    };

    function KnowledgeSources({ botData, onClearSource }) {
        const sources = botData?.active_knowledge_sources || [];
        if (sources.length === 0) return <p>No active knowledge sources.</p>;

        const groupedSources = sources.reduce((acc, item) => {
            const sourceName = item.source_name || "Untitled Source";
            if (!acc[sourceName]) acc[sourceName] = 0;
            acc[sourceName]++;
            return acc;
        }, {});

        return (
            <div>
                <h4 className="font-semibold text-white mb-2">Active Knowledge Sources:</h4>
                <ul className="space-y-2">
                    {Object.entries(groupedSources).map(([name, count]) => (
                        <li key={name} className="flex justify-between items-center bg-slate-700 p-2 rounded-md">
                            <span className="text-sm text-slate-200">{name} ({count} items)</span>
                            <button onClick={() => onClearSource(name)} className="text-xs text-red-400 hover:text-red-300">Detach</button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    const handleClearSource = async (sourceName) => {
        if (!sourceName) return;
        if (!window.confirm(`Detach and delete all knowledge items from source: ${sourceName}?`)) return;
        setStatus({ message: 'Detaching source...', error: false });
        try {
            const res = await axios.delete(`http://localhost:3001/api/chatbots/${botId}/knowledge/${encodeURIComponent(sourceName)}`);
            const msg = res?.data?.message || 'Source detached.';
            setStatus({ message: msg, error: false });
            await fetchBotData();
        } catch (err) {
            setStatus({ message: 'Failed to detach source.', error: true });
        }
    };

    const handleClearKnowledge = async () => {
        if (window.confirm("Are you sure you want to delete this bot's entire knowledge base? This cannot be undone.")) {
            setStatus({ message: "Clearing knowledge...", error: false });
            try {
                const response = await axios.delete(`http://localhost:3001/api/chatbots/${botId}/knowledge`);
                setStatus({ message: response.data.message, error: false });
                fetchBotData();
            } catch (err) {
                setStatus({ message: "Failed to clear knowledge.", error: true });
            }
        }
    };
    
    return (
        <div className="space-y-8">
            <TrainingSummary botData={botData} onGenerateQuestions={handleGenerateQuestions} />
            <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Current Training Status</h3>
                <KnowledgeSources botData={botData} onClearSource={handleClearSource} />
            </div>
            
            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Add or Replace Knowledge</h2>
                <div className="flex border-b border-slate-200 overflow-x-auto">
                    <button onClick={() => setActiveTab('csv')} className={`px-4 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === 'csv' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>Upload CSV</button>
                    <button onClick={() => setActiveTab('url')} className={`px-4 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === 'url' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>Scrape from URL</button>
                    <button onClick={() => setActiveTab('cms')} className={`px-4 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === 'cms' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>Connect Contentstack</button>
                </div>

                <div className="card p-6 sm:p-8 rounded-b-lg min-h-[16rem] flex flex-col justify-center">
                    {activeTab === 'csv' && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload a CSV File</h3>
                            <p className="text-slate-600 mb-4 text-sm">File must contain 'question' and 'answer' columns. Re-uploading will replace existing knowledge.</p>
                            <div className="flex flex-col sm:flex-row items-center sm:space-x-4">
                                <input type="file" id="knowledge-file-input" accept=".csv" onChange={(e) => setKnowledgeFile(e.target.files[0])} className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-slate-200 file:text-sm file:font-semibold file:bg-white file:text-slate-900 hover:file:bg-slate-50 transition-colors cursor-pointer"/>
                                <button onClick={handleFileUpload} disabled={!knowledgeFile || status.message.includes('Uploading...')} className="mt-4 sm:mt-0 w-full sm:w-auto btn-primary whitespace-nowrap">{status.message.includes('Uploading...') ? 'Uploading...' : 'Upload'}</button>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'url' && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Scrape Knowledge from a Web Page</h3>
                            <p className="text-slate-600 mb-4 text-sm">Enter a public URL to a page with good text content (like an FAQ). This will replace the bot's existing knowledge.</p>
                            <div className="flex flex-col sm:flex-row items-center sm:space-x-4">
                                <input type="url" value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} placeholder="https://example.com/faq" className="input-field"/>
                                <button onClick={handleUrlScrape} disabled={!scrapeUrl || status.message.includes('Scraping...')} className="mt-4 sm:mt-0 w-full sm:w-auto btn-primary whitespace-nowrap">{status.message.includes('Scraping...') ? 'Scraping...' : 'Scrape & Add'}</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cms' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect to a Live Contentstack Model</h3>
                                <p className="text-slate-600 mb-4 text-sm">Point your bot to a content model in another Stack to use as its primary brain. The bot will intelligently adapt to its structure.</p>
                            </div>
                            
                            <div className="card p-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Step 1: Provide Credentials for the external Stack</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input name="apiKey" value={connectorCreds.apiKey} onChange={handleCredsChange} placeholder="Stack API Key" className="input-field"/>
                                    <input name="deliveryToken" value={connectorCreds.deliveryToken} onChange={handleCredsChange} placeholder="Delivery Token" className="input-field"/>
                                    <input name="managementToken" type="password" value={connectorCreds.managementToken} onChange={handleCredsChange} placeholder="Management Token (to list models)" className="input-field"/>
                                    <input name="environment" value={connectorCreds.environment} onChange={handleCredsChange} placeholder="Environment Name" className="input-field"/>
                                </div>
                                <button onClick={handleFetchModels} className="mt-4 btn-primary text-sm">Verify & Fetch Models</button>
                            </div>

                            {fetchedModels.length > 0 && (
                                <div className="card p-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Step 2: Select the Content Model</label>
                                    <select value={selectedModelUid} onChange={(e) => setSelectedModelUid(e.target.value)} className="input-field">
                                        <option value="" disabled>-- Select a Model --</option>
                                        {fetchedModels.map(m => <option key={m.uid} value={m.uid}>{m.title}</option>)}
                                    </select>
                                </div>
                            )}

                            {selectedModelUid && (
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="card p-4">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Import Options</label>
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                                    <input type="checkbox" checked={importOptions.deleteOld} onChange={(e) => setImportOptions({ ...importOptions, deleteOld: e.target.checked })} />
                                                    Replace existing knowledge
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="number" min="1" value={importOptions.maxEntries} onChange={(e) => setImportOptions({ ...importOptions, maxEntries: e.target.value })} placeholder="Max entries (20)" className="input-field"/>
                                                    <input type="number" min="200" value={importOptions.chunkChars} onChange={(e) => setImportOptions({ ...importOptions, chunkChars: e.target.value })} placeholder="Chunk size (900 chars)" className="input-field"/>
                                                </div>
                                                <input type="text" value={importOptions.fields} onChange={(e) => setImportOptions({ ...importOptions, fields: e.target.value })} placeholder="Fields to include (comma-separated)" className="input-field"/>
                                                <input type="text" value={importOptions.titleField} onChange={(e) => setImportOptions({ ...importOptions, titleField: e.target.value })} placeholder="Title field (optional)" className="input-field"/>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-end gap-3">
                                            <button onClick={handleSaveConnection} className="btn-primary py-3">Save Connection & Configure Bot with AI</button>
                                            <button onClick={handleImportFromModel} className="btn-secondary py-3">Import Model Entries as Knowledge</button>
                                            <button onClick={async () => {
                                                setStatus({ message: 'Syncing new entries...', error: false });
                                                try {
                                                    const res = await axios.post(`http://localhost:3001/api/bots/${botId}/sync-new-model-entries`);
                                                    const msg = res?.data?.message || 'Sync completed.';
                                                    setStatus({ message: msg, error: false });
                                                    fetchBotData();
                                                } catch (err) {
                                                    const apiErr = err?.response?.data?.error || err?.message || 'Unknown error';
                                                    setStatus({ message: `Sync failed: ${apiErr}`, error: true });
                                                }
                                            }} className="btn-secondary py-3">Sync New Entries</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {status.message && (
                <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white transition-all duration-300 ${status.error ? 'bg-red-600' : 'bg-green-600'}`}>
                    {status.message}
                </div>
            )}
        </div>
    );
}