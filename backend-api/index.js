require('dotenv').config();
const express = require('express');
const cors = require('cors');
const contentstackManagement = require('@contentstack/management');
const ContentstackDelivery = require('contentstack');
const axios = require('axios');
const cheerio = require('cheerio');
const { encrypt, decrypt } = require('./encryption');
const multer = require('multer');
const Papa = require('papaparse');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });
// Configurable analytics content type (fallback to chatanalyticslog)
const ANALYTICS_CONTENT_TYPE_UID = process.env.ANALYTICS_CONTENT_TYPE_UID || 'chatanalyticslog';

// --- ✅ FINAL, CORRECTED AUTHENTICATION ARCHITECTURE ---

// Create a single, stateless client. It has NO token information.
const genericClient = contentstackManagement.client({
    host: process.env.CONTENTSTACK_API_HOST,
    timeout: 15000,
    retryLimit: 5,
});

// Helper function to get a fully authenticated stack object for our main platform.
const getManagementStack = () => {
    return genericClient.stack({
        api_key: process.env.CONTENTSTACK_API_KEY,
        management_token: process.env.CONTENTSTACK_MANAGEMENT_TOKEN
    });
};

// Helper: Add knowledge items and update bot metadata with active source
async function addKnowledgeAndUpdateBot(botId, qaPairs, sourceName) {
    const stack = getManagementStack();
    const sourceId = `knowledge_${Date.now()}`;

    const createPromises = qaPairs.map(pair => {
        const payload = {
            title: `[${sourceId}] Q: ${String(pair.question || '').substring(0, 30)}...`,
            source_text: `Question: ${pair.question}\nAnswer: ${pair.answer}`,
            source_id: sourceId,
            chatbot_config_reference: [{ uid: botId, _content_type_uid: 'chatbot_config' }]
        };
        return stack.contentType('customknowledge').entry().create({ entry: payload });
    });
    await Promise.all(createPromises);

    const botToUpdate = await stack.contentType('chatbot_config').entry(botId).fetch();
    botToUpdate.last_trained_at = new Date().toISOString();
    botToUpdate.knowledge_source = sourceName;
    botToUpdate.active_knowledge_source_id = sourceId;
    return await botToUpdate.update();
}

// Helper: Create knowledge entries and add their references to bot.active_knowledge_sources
async function addKnowledgeSource(botId, qaPairs, sourceName) {
    const stack = getManagementStack();
    const sourceId = `knowledge_${Date.now()}`;

    const createPromises = qaPairs.map(pair => {
        const uniqueTitle = `[${sourceName}] Q: ${String(pair.question || '').substring(0, 20)}... [${Date.now()}${Math.random()}]`;
        const payload = {
            title: uniqueTitle,
            source_text: `Question: ${pair.question}\nAnswer: ${pair.answer}`,
            source_id: sourceId,
            source_name: sourceName,
            chatbot_config_reference: [{ uid: botId, _content_type_uid: 'chatbot_config' }]
        };
        return stack.contentType('customknowledge').entry().create({ entry: payload });
    });
    const newKnowledgeEntries = await Promise.all(createPromises);

    const botToUpdate = await stack.contentType('chatbot_config').entry(botId).fetch();
    const newSourceReferences = newKnowledgeEntries.map(entry => ({ uid: entry.uid, _content_type_uid: 'customknowledge' }));
    botToUpdate.active_knowledge_sources = [
        ...(Array.isArray(botToUpdate.active_knowledge_sources) ? botToUpdate.active_knowledge_sources : []),
        ...newSourceReferences
    ];
    botToUpdate.last_trained_at = new Date().toISOString();
    return await botToUpdate.update();
}

// -----------------------------------------------------------------------------
// --- 3. API ROUTES -----------------------------------------------------------
// -----------------------------------------------------------------------------

/** @route   GET /api/chatbots */
app.get('/api/chatbots', async (req, res) => {
    try {
        const response = await getManagementStack().contentType('chatbot_config').entry().query().find();
        res.json(response.items);
    } catch (error) {
        console.error("Error in GET /api/chatbots:", error);
        res.status(500).json({ message: "Failed to fetch chatbots", details: error.errorMessage });
    }
});

// ✅ DEFINITIVE FIX: Fetch Content Models from an external stack (sandboxed client)
app.post('/api/external-models', async (req, res) => {
    const { apiKey, managementToken } = req.body;
    if (!apiKey || !managementToken) {
        return res.status(400).json({ error: 'API Key and Management Token are required.' });
    }
    
    try {
        // ✅ DEFINITIVE FIX: Create a generic client with no auth details.
        const genericClient = contentstackManagement.client({
            host: process.env.CONTENTSTACK_API_HOST,
            timeout: 10000,
            retryLimit: 3,
        });

        // ✅ Provide ALL auth details when selecting the stack.
        // This creates a fully sandboxed, temporary connection to the external stack.
        const externalStack = genericClient.stack({
            api_key: apiKey,
            management_token: managementToken 
        });
        
        const response = await externalStack.contentType().query().find();
        
        const models = response.items.map(ct => ({ title: ct.title, uid: ct.uid }));
        res.status(200).json(models);
    } catch (error) {
        console.error("Failed to fetch external models:", error);
        if (error.status === 401 || error.errorCode === 105) {
             res.status(401).json({ error: "Unauthorized. The provided Management Token or API Key is invalid for the external stack." });
        } else {
             res.status(500).json({ error: "Could not connect to the external stack. Please check credentials and token permissions." });
        }
    }
});

// ✅ NEW ROUTE: Advanced Scrape + AI Q&A Generation
app.post('/api/chatbots/:botId/scrape', async (req, res) => {
    const { botId } = req.params;
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required.' });
    console.log(`Phase 1: Scraping URL for bot ${botId}: ${url}`);

    try {
        // --- STEP 1: SMART SCRAPER ---
        const axiosConfig = { headers: { 'User-Agent': 'Mozilla/5.0 ...' } };
        const { data: html } = await axios.get(url, axiosConfig);
        const $ = cheerio.load(html);
        let contentContainer = $('main, article, #content, #main, #main-content').first();
        if (contentContainer.length === 0) contentContainer = $('body');
        
        let rawText = '';
        contentContainer.find('h1, h2, h3, p, li').each((_idx, el) => {
            $(el).find('script, style').remove();
            const text = $(el).text().trim();
            if (text) rawText += text + '\n\n';
        });

        // --- STEP 2: AI ANALYST (using Gemini) ---
        console.log("Phase 2: Sending scraped text to AI Analyst for Q&A generation...");
        // For this step, we need an API key. We can use a key from our .env for this internal process.
        const internalGeminiKey = process.env.GEMINI_API_KEY_INTERNAL;
        if (!internalGeminiKey) {
            return res.status(500).json({ error: "Internal Gemini API key is not configured on the server." });
        }
        
        const genAI = new GoogleGenerativeAI(internalGeminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const instructionPrompt = `You are an AI data analyst. Read the following text and generate a JSON array of concise Question/Answer pairs summarizing the key information. Questions should be what a user is likely to ask. Answers must be based ONLY on the text. Example format: [{"question": "Q1", "answer": "A1"}, {"question": "Q2", "answer": "A2"}]. Text to analyze: \n\n---START---\n${rawText.substring(0, 10000)}\n---END---`;
        
        const result = await model.generateContent(instructionPrompt);
        const responseText = result.response.text();
        
        // Clean up the JSON response from the LLM
        const jsonString = responseText.match(/\[.*\]/s)[0];
        const qaPairs = JSON.parse(jsonString);

        console.log(`Phase 3: AI Analyst generated ${qaPairs.length} Q&A pairs. Committing as a new knowledge source...`);
        const finalBotData = await addKnowledgeSource(botId, qaPairs, `URL: ${url}`);
        res.status(200).json({ message: `Success! Added ${qaPairs.length} items from source '${url}'.`, bot: finalBotData });
    } catch (error) {
        console.error(`Error in advanced scrape for bot ${botId}:`, error);
        res.status(500).json({ message: 'An advanced scraping error occurred.' });
    }
});

/** @route   POST /api/chatbots */
app.post('/api/chatbots', async (req, res) => {
  const { bot_name, domain, llm_provider, api_key, free_prompt_system_message } = req.body;
  if (!bot_name || !domain || !llm_provider || !api_key) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    const encryptedApiKey = encrypt(api_key);
    const entryPayload = {
      title: bot_name,
      bot_name: bot_name,
      domain_bot: domain,
      llm_provider: llm_provider,
      api_key_encrypted: encryptedApiKey,
      free_prompt_system_message: free_prompt_system_message || '',
      ui_settings: JSON.stringify({ position: 'bottom-right', themeColor: '#4f46e5', historyEnabled: true })
    };
    const newEntry = await getManagementStack().contentType('chatbot_config').entry().create({ entry: entryPayload });
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error in POST /api/chatbots:', error);
    res.status(500).json({ message: 'Failed to create chatbot.', details: error.errorMessage || 'Unknown error' });
  }
});

/** @route   PUT /api/chatbots/:botId */
app.put('/api/chatbots/:botId', async (req, res) => {
    const { botId } = req.params;
    const { 
        bot_name, domain, llm_provider, api_key, ui_settings,
        connected_stack_api_key, connected_stack_delivery_token,
        connected_stack_environment, connected_model_uid,
        free_prompt_system_message
    } = req.body;

    if (!bot_name || !domain || !llm_provider) {
        return res.status(400).json({ error: 'Name, domain, and provider are required.' });
    }

    try {
        const entry = await getManagementStack().contentType('chatbot_config').entry(botId).fetch();
        entry.title = bot_name;
        entry.bot_name = bot_name;
        entry.domain_bot = domain;
        entry.llm_provider = llm_provider;
        if (api_key) entry.api_key_encrypted = encrypt(api_key);
        if (ui_settings) entry.ui_settings = JSON.stringify(ui_settings);
        if (typeof connected_stack_api_key !== 'undefined') entry.connected_stack_api_key = connected_stack_api_key;
        if (typeof connected_stack_delivery_token !== 'undefined') entry.connected_stack_delivery_token = connected_stack_delivery_token;
        if (typeof connected_stack_environment !== 'undefined') entry.connected_stack_environment = connected_stack_environment;
        if (typeof connected_model_uid !== 'undefined') entry.connected_model_uid = connected_model_uid;
        if (typeof free_prompt_system_message !== 'undefined') {
            entry.free_prompt_system_message = free_prompt_system_message || '';
        }
        const updatedEntry = await entry.update();
        res.status(200).json(updatedEntry);
    } catch (error) {
        console.error(`Error updating bot ${botId}:`, error);
        res.status(500).json({ message: 'Failed to update chatbot.', details: error.errorMessage });
    }
});

/** @route   DELETE /api/chatbots/:botId (cascading delete) */
app.delete('/api/chatbots/:botId', async (req, res) => {
    const { botId } = req.params;
    try {
        const stack = getManagementStack();

        // Step 1: Delete associated knowledge
        const knowledgeQuery = stack.contentType('customknowledge').entry().query({ "chatbot_config_reference.uid": botId });
        const knowledgeEntries = await knowledgeQuery.find();
        if (knowledgeEntries.items && knowledgeEntries.items.length > 0) {
            await Promise.all(knowledgeEntries.items.map(entry => stack.contentType('customknowledge').entry(entry.uid).delete()));
        }
        console.log(`Deleted ${knowledgeEntries.items?.length || 0} associated knowledge entries.`);

        // Step 2: Delete associated analytics
        const analyticsQuery = stack.contentType(ANALYTICS_CONTENT_TYPE_UID).entry().query({ "chatbot_config_reference.uid": botId });
        const analyticsEntries = await analyticsQuery.find();
        if (analyticsEntries.items && analyticsEntries.items.length > 0) {
            await Promise.all(analyticsEntries.items.map(entry => stack.contentType(ANALYTICS_CONTENT_TYPE_UID).entry(entry.uid).delete()));
        }
        console.log(`Deleted ${analyticsEntries.items?.length || 0} associated analytics entries.`);

        // Step 3: Delete the bot itself
        await stack.contentType('chatbot_config').entry(botId).delete();
        console.log(`Deleted bot ${botId}.`);

        res.status(200).json({ message: 'Chatbot and all associated data deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting bot ${botId}:`, error);
        res.status(500).json({ message: 'Failed to delete chatbot and associated data.', details: error.errorMessage || error.message });
    }
});

// ✅ NEW: The AI Analyzer to create a bot's brain
app.post('/api/bots/:botId/analyze-model', async (req, res) => {
    const { botId } = req.params;
    const { connected_model } = req.body; // Expects the connection object

    try {
        // Step 1: Fetch sample data from the developer's stack
        const externalDeliveryClient = ContentstackDelivery.Stack({
            api_key: connected_model.stack_api_key,
            delivery_token: connected_model.delivery_token,
            environment: connected_model.environment,
        });
        const query = externalDeliveryClient.ContentType(connected_model.model_uid).Query();
        const results = await query.limit(3).toJSON().find();
        const sampleData = results[0];

        if (!sampleData || sampleData.length === 0) {
            return res.status(400).json({ error: "Could not find any published entries in the selected model to analyze." });
        }

        // Step 2: Send to the AI Analyst (Gemini)
        const internalGeminiKey = process.env.GEMINI_API_KEY_INTERNAL;
        const genAI = new GoogleGenerativeAI(internalGeminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const instructionPrompt = `Analyze the following JSON data from a Contentstack model. Generate a new system prompt for a chatbot that will be an expert on this content. Also generate 3 relevant suggested questions a user might ask. Respond ONLY with a valid JSON object containing "system_prompt" and "suggested_questions".\n\nDATA:\n${JSON.stringify(sampleData)}`;
        
        const result = await model.generateContent(instructionPrompt);
        const responseText = result.response.text().match(/\{.*\}/s)[0];
        const aiConfig = JSON.parse(responseText);

        // ✅ NEW: Step 3: Format the questions for Modular Blocks
        const questionsForContentstack = aiConfig.suggested_questions.map(q => {
            return {
                "suggested_question": { // This must match the Block UID
                    "question": q // This must match the field UID inside the block
                }
            };
        });

        // Step 4: Save this AI-generated config to our bot
        const stack = getManagementStack();
        const botToUpdate = await stack.contentType('chatbot_config').entry(botId).fetch();
        botToUpdate.ai_generated_system_prompt = aiConfig.system_prompt;
        botToUpdate.ai_generated_questions = questionsForContentstack; // Assign the new block structure
        await botToUpdate.update();

        res.status(200).json({ message: "Successfully analyzed model and configured bot!" });

    } catch (error) {
        console.error("Error in AI Analyzer:", error);
        res.status(500).json({ error: "Failed to analyze the content model." });
    }
});

// ✅ NEW ROUTE: Import Contentstack model entries as raw paragraphs into custom knowledge
app.post('/api/bots/:botId/import-model-entries', async (req, res) => {
    const { botId } = req.params;
    const {
        connected_model, // { stack_api_key, delivery_token, environment, model_uid }
        mode = 'paragraphs', // future-proof; currently supports 'paragraphs'
        deleteOld = true,
        maxEntries = 20,
        fields = null, // optional array of field uids to include
        chunkChars = 900, // max characters per paragraph chunk
        titleField = null // optional field to use for title seed
    } = req.body;

    if (!connected_model || !connected_model.stack_api_key || !connected_model.delivery_token || !connected_model.environment || !connected_model.model_uid) {
        return res.status(400).json({ error: "connected_model with stack_api_key, delivery_token, environment, and model_uid is required." });
    }

    try {
        // Step 0: Optionally delete existing knowledge for this bot
        if (deleteOld) {
            const oldKnowledgeQuery = getManagementStack().contentType('customknowledge').entry().query({ "chatbot_config_reference.uid": botId });
            const oldEntries = await oldKnowledgeQuery.find();
            if (oldEntries.items.length > 0) {
                await Promise.all(oldEntries.items.map(entry => getManagementStack().contentType('customknowledge').entry(entry.uid).delete()));
            }
        }

        // Step 1: Fetch entries from external Contentstack Delivery API
        const externalDeliveryClient = ContentstackDelivery.Stack({
            api_key: connected_model.stack_api_key,
            delivery_token: connected_model.delivery_token,
            environment: connected_model.environment,
        });
        const query = externalDeliveryClient.ContentType(connected_model.model_uid).Query();
        if (maxEntries && Number.isInteger(maxEntries)) query.limit(maxEntries);
        const results = await query.toJSON().find();
        const items = results[0] || [];
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "No published entries found in the selected model." });
        }

        // Helper to safely collect text from arbitrary nested structures
        const shouldIncludeKey = (key) => {
            if (fields && Array.isArray(fields)) return fields.includes(key);
            const excluded = new Set(['uid', 'created_at', 'updated_at', '_version', 'locale', 'publish_details', 'url']);
            return !excluded.has(key);
        };

        const collectText = (value, out) => {
            if (value == null) return;
            const type = typeof value;
            if (type === 'string') {
                const s = value.trim();
                if (s) out.push(s);
                return;
            }
            if (Array.isArray(value)) {
                for (const v of value) collectText(v, out);
                return;
            }
            if (type === 'object') {
                for (const k of Object.keys(value)) {
                    if (!shouldIncludeKey(k)) continue;
                    collectText(value[k], out);
                }
            }
        };

        const splitIntoChunks = (text) => {
            const normalized = String(text || '').replace(/\s+/g, ' ').trim();
            if (!normalized) return [];
            const sentences = normalized.split(/(?<=\.)\s+/);
            const chunks = [];
            let current = '';
            for (const sentence of sentences) {
                if ((current + ' ' + sentence).trim().length > chunkChars) {
                    if (current) chunks.push(current.trim());
                    current = sentence;
                } else {
                    current = (current ? current + ' ' : '') + sentence;
                }
            }
            if (current) chunks.push(current.trim());
            return chunks;
        };

        let createdCount = 0;

        // Step 2: Transform and upload as raw paragraphs
        for (const entry of items) {
            const textParts = [];
            if (titleField && entry[titleField] && typeof entry[titleField] === 'string') {
                // Prefer using titleField value at the start
                textParts.push(String(entry[titleField]));
            }
            collectText(entry, textParts);
            const combined = textParts.join('\n');
            const chunks = splitIntoChunks(combined);

            for (const chunk of chunks) {
                if (!chunk || chunk.length < 40) continue; // skip overly short fragments
                const titleSeed = chunk.substring(0, 40);
                const entryPayload = {
                    title: `[bot:${botId}] Doc: ${titleSeed}...`,
                    source_text: chunk,
                    chatbot_config_reference: [{ uid: botId, _content_type_uid: 'chatbot_config' }]
                };

                const created = await getManagementStack().contentType('customknowledge').entry().create({ entry: entryPayload });
                // Publish for visibility wherever needed (keeps parity with CSV route)
                try {
                    await created.publish({
                        publish_details: {
                            locales: ['en-us'],
                            environments: [process.env.CONTENTSTACK_ENVIRONMENT]
                        }
                    });
                } catch (_) { /* ignore publish failures for now */ }
                createdCount++;
            }
        }

        // Step 3: Update bot timestamp
        const stack = getManagementStack();
        const botToUpdate = await stack.contentType('chatbot_config').entry(botId).fetch();
        botToUpdate.last_trained_at = new Date().toISOString();
        await botToUpdate.update();

        return res.status(200).json({ message: `Imported ${createdCount} knowledge chunks from model '${connected_model.model_uid}'.` });
    } catch (error) {
        console.error("Error importing model entries:", error);
        return res.status(500).json({ error: "Failed to import model entries into knowledge base." });
    }
});

// ✅ NEW ROUTE: Sync only new entries from the connected model (since last_trained_at)
app.post('/api/bots/:botId/sync-new-model-entries', async (req, res) => {
    const { botId } = req.params;
    try {
        console.log(`Sync (new entries) started for bot ${botId}`);
        // Load bot to get connection details and last_trained_at
        const stack = getManagementStack();
        const bot = await stack.contentType('chatbot_config').entry(botId).fetch();

        const apiKey = bot.connected_stack_api_key;
        const deliveryToken = bot.connected_stack_delivery_token;
        const environment = bot.connected_stack_environment;
        const modelUid = bot.connected_model_uid;
        const lastTrainedAt = bot.last_trained_at;

        if (!apiKey || !deliveryToken || !environment || !modelUid) {
            return res.status(400).json({ error: "Bot is not connected to an external model. Save connection first." });
        }

        const externalDeliveryClient = ContentstackDelivery.Stack({
            api_key: apiKey,
            delivery_token: deliveryToken,
            environment: environment,
        });
        const query = externalDeliveryClient.ContentType(modelUid).Query();
        // Keep it simple and robust for hackathon: fetch recent entries and filter locally
        const results = await query.limit(100).toJSON().find();
        const items = results[0] || [];

        const lastDate = lastTrainedAt ? new Date(lastTrainedAt) : null;

        const getEntryTimestamp = (entry) => {
            try {
                const publishTime = entry?.publish_details?.time || entry?.publish_details?.published_at;
                const updated = entry?.updated_at;
                const created = entry?.created_at;
                const ts = publishTime || updated || created;
                return ts ? new Date(ts) : null;
            } catch (_) { return null; }
        };

        const candidates = lastDate
            ? items.filter(it => {
                const ts = getEntryTimestamp(it);
                return ts ? ts > lastDate : true; // if no ts, include to be safe
            })
            : items; // if never trained, treat as initial import

        if (candidates.length === 0) {
            return res.status(200).json({ message: "No new entries to sync." });
        }

        const shouldIncludeKey = (key) => {
            const excluded = new Set(['uid', 'created_at', 'updated_at', '_version', 'locale', 'publish_details', 'url']);
            return !excluded.has(key);
        };

        const collectText = (value, out) => {
            if (value == null) return;
            const type = typeof value;
            if (type === 'string') {
                const s = value.trim();
                if (s) out.push(s);
                return;
            }
            if (Array.isArray(value)) {
                for (const v of value) collectText(v, out);
                return;
            }
            if (type === 'object') {
                for (const k of Object.keys(value)) {
                    if (!shouldIncludeKey(k)) continue;
                    collectText(value[k], out);
                }
            }
        };

        const splitIntoChunks = (text, chunkChars = 900) => {
            const normalized = String(text || '').replace(/\s+/g, ' ').trim();
            if (!normalized) return [];
            const sentences = normalized.split(/(?<=\.)\s+/);
            const chunks = [];
            let current = '';
            for (const sentence of sentences) {
                if ((current + ' ' + sentence).trim().length > chunkChars) {
                    if (current) chunks.push(current.trim());
                    current = sentence;
                } else {
                    current = (current ? current + ' ' : '') + sentence;
                }
            }
            if (current) chunks.push(current.trim());
            return chunks;
        };

        let createdCount = 0;

        for (const entry of candidates) {
            const textParts = [];
            collectText(entry, textParts);
            const combined = textParts.join('\n');
            const chunks = splitIntoChunks(combined);
            for (const chunk of chunks) {
                if (!chunk || chunk.length < 40) continue;
                const titleSeed = chunk.substring(0, 40);
                const payload = {
                    title: `[bot:${botId}] Doc: ${titleSeed}...`,
                    source_text: chunk,
                    chatbot_config_reference: [{ uid: botId, _content_type_uid: 'chatbot_config' }]
                };
                const created = await stack.contentType('customknowledge').entry().create({ entry: payload });
                try {
                    await created.publish({
                        publish_details: {
                            locales: ['en-us'],
                            environments: [process.env.CONTENTSTACK_ENVIRONMENT]
                        }
                    });
                } catch (_) { }
                createdCount++;
            }
        }

        // Update timestamp only if we added something
        bot.last_trained_at = new Date().toISOString();
        await bot.update();

        return res.status(200).json({ message: `Synced ${createdCount} new knowledge chunks.` });
        } catch (error) {
        console.error('Error syncing new model entries:', error);
        return res.status(500).json({ error: error?.errorMessage || error?.message || 'Failed to sync new entries.' });
    }
});

// in backend-api/index.js

app.post('/api/chatbots/:botId/upload', upload.single('knowledgeFile'), async (req, res) => {
    const { botId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
        // Additive ingestion: do not delete existing knowledge
        // Step 1 - Parse and upload the new knowledge (existing logic)
        const csvString = req.file.buffer.toString('utf-8');
        
        let parsedRows = [];
        let parsingErrors = [];
        
        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            step: function(row) {
                // We collect all successfully parsed rows that have data.
                if (row.data) {
                    parsedRows.push(row.data);
                }
                // We also collect any non-critical errors.
                if (row.errors.length > 0) {
                    parsingErrors.push(...row.errors);
                }
            },
            complete: async function() {
                // ✅ CORRECTED AND MORE ROBUST HEADER CHECK
                // Check if we parsed any rows and if the first row has the keys we need.
                if (parsedRows.length === 0 || !parsedRows[0].hasOwnProperty('question') || !parsedRows[0].hasOwnProperty('answer')) {
                     // Check for critical errors that are NOT TooManyFields
                    const criticalErrors = parsingErrors.filter(e => e.code !== 'TooManyFields');
                    if(criticalErrors.length > 0) {
                        console.error("Critical CSV Parsing errors:", criticalErrors);
                        return res.status(400).json({ error: 'Failed to parse CSV file due to critical errors.', details: criticalErrors });
                    }
                    // If no critical errors but still no valid data, it's a header issue.
                    return res.status(400).json({ error: "Parsing failed. Please ensure your CSV contains 'question' and 'answer' columns." });
                }

                console.log(`Successfully parsed ${parsedRows.length} valid rows from CSV.`);

                try {
                    const qaPairs = parsedRows
                        .filter(row => row.question && row.answer)
                        .map(row => ({ question: row.question, answer: row.answer }));
                    const finalBotData = await addKnowledgeSource(botId, qaPairs, `CSV: ${req.file.originalname}`);
                    res.status(200).json({ message: `Success! Added ${qaPairs.length} items from source '${req.file.originalname}'.`, bot: finalBotData });
                } catch (contentstackError) {
                    console.error(`Error creating Contentstack entries for bot ${botId}:`, contentstackError);
                    res.status(500).json({ message: 'Failed to save knowledge to Contentstack.', details: contentstackError.errorMessage });
                }
            }
        });
        
    } catch (error) {
        console.error(`Error in upload process for bot ${botId}:`, error);
        res.status(500).json({ message: 'Failed to process knowledge file.', details: error.errorMessage });
    }
});

// ✅ NEW: Dedicated route to clear a bot's knowledge base (additive ingestion companion)
app.delete('/api/chatbots/:botId/knowledge', async (req, res) => {
    const { botId } = req.params;
    try {
        const stack = getManagementStack();
        const query = stack.contentType('customknowledge').entry().query({ "chatbot_config_reference.uid": botId });
        const entries = await query.find();
        if (!entries || !Array.isArray(entries.items) || entries.items.length === 0) {
            return res.status(200).json({ message: 'No knowledge items to clear.' });
        }
        await Promise.all(entries.items.map(item => stack.contentType('customknowledge').entry(item.uid).delete()));
        res.status(200).json({ message: `Cleared ${entries.items.length} knowledge items.` });
    } catch (error) {
        console.error(`Error clearing knowledge for bot ${botId}:`, error);
        res.status(500).json({ message: 'Failed to clear knowledge base.' });
    }
});

// ✅ NEW: Detach and clear a specific knowledge source by name
app.delete('/api/chatbots/:botId/knowledge/:sourceName', async (req, res) => {
    const { botId, sourceName } = req.params;
    try {
        const stack = getManagementStack();

        // Find knowledge entries for this bot and source
        const query = stack.contentType('customknowledge').entry().query({
            "chatbot_config_reference.uid": botId,
            "source_name": sourceName
        });
        const entries = await query.find();
        const items = Array.isArray(entries.items) ? entries.items : [];
        const uidsToDelete = items.map(it => it.uid);

        // Delete all matching knowledge entries
        if (uidsToDelete.length > 0) {
            await Promise.all(uidsToDelete.map(uid => stack.contentType('customknowledge').entry(uid).delete()));
        }

        // Remove references from bot.active_knowledge_sources
        const bot = await stack.contentType('chatbot_config').entry(botId).fetch();
        if (Array.isArray(bot.active_knowledge_sources) && bot.active_knowledge_sources.length > 0) {
            const uidSet = new Set(uidsToDelete);
            bot.active_knowledge_sources = bot.active_knowledge_sources.filter(ref => !ref?.uid || !uidSet.has(ref.uid));
            await bot.update();
        }

        return res.status(200).json({ message: `Detached '${sourceName}' and deleted ${uidsToDelete.length} knowledge items.` });
    } catch (error) {
        console.error(`Error detaching source '${req.params.sourceName}' for bot ${req.params.botId}:`, error);
        return res.status(500).json({ error: "Failed to detach knowledge source." });
    }
});

// ✅ CORRECTED /api/chat/:botId
app.post('/api/chat/:botId', async (req, res) => {
    const { botId } = req.params;
    const { message, history = [], sessionId } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required.' });

    try {
        // Use managementStack for all Contentstack Management API calls in this route
        const managementStack = getManagementStack();
        const botConfigEntry = await managementStack.contentType('chatbot_config').entry(botId).fetch();
        if (!botConfigEntry) return res.status(404).json({ error: 'Bot configuration not found.' });

        // ✅ --- DEFINITIVE ISOLATION: Manual join to fetch only linked knowledge sources ---
        let customKnowledgeContext = "";
        const activeSourceUids = (botConfigEntry.active_knowledge_sources || []).map(ref => ref.uid);
        if (activeSourceUids.length > 0) {
            console.log(`Bot has ${activeSourceUids.length} active knowledge sources. Fetching them...`);
            // ✅ THE FIX: Pass the filter object directly to the .query() method.
            const knowledgeEntries = await managementStack.contentType('customknowledge').entry()
                .query({ "uid": { "$in": activeSourceUids } })
                .find();
            if (knowledgeEntries && knowledgeEntries.items.length > 0) {
                customKnowledgeContext = knowledgeEntries.items
                    .map(item => item.source_text)
                    .join('\n\n');
                console.log(`SUCCESS: Found and loaded ${knowledgeEntries.items.length} active knowledge items.`);
            }
        } else {
            console.log(`INFO: Bot ${botId} has no active knowledge sources.`);
        }

        // --- Persona and prompt generation ---
        let basePersonality;
        let suggestedQuestions = [];
        switch (botConfigEntry.domain_bot) {
            case 'E-commerce':
                basePersonality = "You are a world-class e-commerce assistant...";
                suggestedQuestions = ["Tell me about your laptops", "What is the return policy?"];
                break;
            case 'Travel':
                basePersonality = "You are 'Wanderlust AI', a vibrant travel agent...";
                suggestedQuestions = ["Find me a beach vacation", "Show me deals for Japan"];
                break;
            case 'Education':
                basePersonality = "You are a patient and knowledgeable University Advisor...";
                suggestedQuestions = ["Tell me about Stanford", "What are the partner universities?"];
                break;
            case 'Free Prompt':
                basePersonality = botConfigEntry.free_prompt_system_message || "You are a helpful general-purpose assistant.";
                suggestedQuestions = [];
                break;
            default:
                basePersonality = "You are a helpful general-purpose assistant.";
        }

        let finalSystemPrompt;
        if (customKnowledgeContext) {
            finalSystemPrompt = `Rule #1: You MUST strictly follow your persona: "${basePersonality}".
Rule #2: You have a specialized Knowledge Base. If the user's question can be answered using the Knowledge Base below, you MUST use it as your primary source.
Rule #3: If the question is outside your Knowledge Base, use your general AI knowledge to answer, but ALWAYS remain in your persona. Never refuse to answer a general question.

--- KNOWLEDGE BASE ---
${customKnowledgeContext}
--- END KNOWLEDGE BASE ---`;
        } else {
            finalSystemPrompt = `Rule #1: You MUST strictly follow your persona: "${basePersonality}".
Rule #2: You do not have a specialized knowledge base. Use your general AI knowledge to answer all questions to the best of your ability, while always remaining in your persona. Never refuse to answer.`;
        }

        const metadata = { suggestedQuestions };

        // --- LLM streaming and chat logic (unchanged) ---
        let fullResponse = '';
        const decryptedApiKey = decrypt(String(botConfigEntry.api_key_encrypted || '').trim());
        res.setHeader('Content-Type', 'text/event-stream');

        if ((botConfigEntry.llm_provider || '').toLowerCase() === 'gemini') {
            const genAI = new GoogleGenerativeAI(decryptedApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: { role: "model", parts: [{ text: finalSystemPrompt }] } });
            const chat = model.startChat({ history: history.map(msg => ({ role: msg.sender === 'bot' ? 'model' : 'user', parts: [{ text: msg.text }] })) });
            const result = await chat.sendMessageStream(message);
            for await (const chunk of result.stream) {
                const content = chunk.text() || "";
                if (content) { fullResponse += content; res.write(`data: ${JSON.stringify({ content })}\n\n`); }
            }
        } else if ((botConfigEntry.llm_provider || '').toLowerCase() === 'openai') {
            const fullMessageHistory = [
                { role: "system", content: finalSystemPrompt },
                ...(history || []).map(msg => ({ role: (msg.sender === 'bot' ? 'assistant' : 'user'), content: msg.text })),
                { role: "user", content: message }
            ];
            const openai = new OpenAI({ apiKey: decryptedApiKey });
            const stream = await openai.chat.completions.create({ model: "gpt-3.5-turbo", messages: fullMessageHistory, stream: true });
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) { fullResponse += content; res.write(`data: ${JSON.stringify({ content })}\n\n`); }
            }
        } else if ((botConfigEntry.llm_provider || '').toLowerCase() === 'groq') {
            const fullMessageHistory = [
                { role: "system", content: finalSystemPrompt },
                ...(history || []).map(msg => ({ role: (msg.sender === 'bot' ? 'assistant' : 'user'), content: msg.text })),
                { role: "user", content: message }
            ];
            const groq = new Groq({ apiKey: decryptedApiKey });
            const stream = await groq.chat.completions.create({ model: "llama3-8b-8192", messages: fullMessageHistory, stream: true });
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) { fullResponse += content; res.write(`data: ${JSON.stringify({ content })}\n\n`); }
            }
        } else {
            res.write(`data: ${JSON.stringify({ content: `Error: Provider '${botConfigEntry.llm_provider}' not supported.` })}\n\n`);
            res.write(`data: ${JSON.stringify({ finished: true, error: true })}\n\n`);
            return res.end();
        }

        res.write(`data: ${JSON.stringify({ finished: true, metadata })}\n\n`);
        res.end();

        // --- Save chat history (unchanged) ---
        if (sessionId) {
            try {
                const updatedHistory = [...history, { sender: 'user', text: message }, { sender: 'bot', text: fullResponse }];
                const messagesForContentstack = updatedHistory.map(msg => ({
                    message: { sender: msg.sender, text: msg.text }
                }));

                const query = managementStack.contentType('chat_history').entry().query({ "session_id": sessionId });
                const found = await query.find();
                if (found && found.items.length > 0) {
                    const historyEntry = await managementStack.contentType('chat_history').entry(found.items[0].uid).fetch();
                    historyEntry.messages = messagesForContentstack;
                    await historyEntry.update();
                } else {
                    const payload = {
                        title: `Session: ${sessionId}`,
                        session_id: sessionId,
                        messages: messagesForContentstack,
                        chatbot_config_reference: [{ uid: botId, _content_type_uid: 'chatbot_config' }]
                    };
                    await managementStack.contentType('chat_history').entry().create({ entry: payload });
                }
            } catch (historyError) {
                console.error('Error saving chat history:', historyError);
            }
        }

    } catch (error) {
        console.error("Error in chat processing:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'An error occurred during chat processing.' });
        } else {
            res.end();
        }
    }
});

app.post('/api/analytics/log', async (req, res) => {
    const { botId, user_query, response_text, response_time_ms } = req.body;
    if (!botId || !user_query) return res.status(400).json({ error: 'Missing botId or query.' });
    try {
        const entryPayload = {
            // ✅ FIX: Add a timestamp and bot tag to ensure it is always unique and scoped
            title: `[bot:${botId}] Query at ${Date.now()}: ${user_query.substring(0, 20)}...`,
            user_query, response_text, response_time_ms: response_time_ms || 0, user_feedback: 0,
            chatbot_config_reference: [{ uid: botId, _content_type_uid: 'chatbot_config' }]
        };
        const newLogEntry = await getManagementStack().contentType(ANALYTICS_CONTENT_TYPE_UID).entry().create({ entry: entryPayload });
        res.status(201).json({ logId: newLogEntry.uid });
    } catch (error) {
        console.error('Error logging analytics:', error);
        res.status(500).json({ message: 'Failed to log analytics.', details: error.errorMessage });
    }
});

// =====================================================================
// --- NEW: GET /api/analytics/:botId (Fetch Analytics Logs) ---
// =====================================================================
app.get('/api/analytics/:botId', async (req, res) => {
    const { botId } = req.params;
    try {
        const query = getManagementStack().contentType(ANALYTICS_CONTENT_TYPE_UID).entry()
            .query({ "chatbot_config_reference.uid": botId });
        const entries = await query.find();

        // Filter for entries that are actual analytics logs (user_query present) and not knowledge (source_text present)
        const analyticsLogs = (entries.items || []).filter(item => typeof item.user_query === 'string' && item.user_query.trim().length > 0);

        res.status(200).json(analyticsLogs);
    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ message: "Failed to fetch analytics data." });
    }
});

// =====================================================================
// --- NEW: PUT /api/analytics/feedback/:logId (Update with Feedback) ---
// =====================================================================
app.put('/api/analytics/feedback/:logId', async (req, res) => {
    const { logId } = req.params;
    const { feedback } = req.body; // should be 1 for up, -1 for down

    if (typeof feedback === 'undefined') {
        return res.status(400).json({ error: 'Feedback value is required.' });
    }

    try {
        const entry = await getManagementStack().contentType(ANALYTICS_CONTENT_TYPE_UID).entry(logId).fetch();
        // Safety: do not accidentally set feedback on knowledge entries
        if (!entry.user_query) {
            return res.status(400).json({ error: 'The specified entry is not an analytics log.' });
        }
        entry.user_feedback = feedback;
        const updatedEntry = await entry.update();
        res.status(200).json(updatedEntry);
    } catch (error) {
        console.error(`Error updating feedback for log ${logId}:`, error);
        res.status(500).json({ message: 'Failed to update feedback.', details: error.errorMessage });
    }
});

// ✅ NEW ROUTE: Analyzes the bot's current knowledge and generates new questions
app.post('/api/bots/:botId/generate-questions', async (req, res) => {
    const { botId } = req.params;
    console.log(`AI is generating smart questions for bot ${botId}`);
    try {
        // Step 1: Fetch ALL current knowledge for this bot
        const knowledgeEntries = await getManagementStack().contentType('customknowledge').entry()
            .query({ "chatbot_config_reference.uid": botId })
            .find();
        
        if (!knowledgeEntries || knowledgeEntries.items.length === 0) {
            return res.status(400).json({ error: "No knowledge base found to analyze. Please upload knowledge first." });
        }
        
        const knowledgeText = knowledgeEntries.items.map(item => item.source_text).join('\n\n');

        // Step 2: Send the knowledge to the AI Analyst (Gemini)
        const internalGeminiKey = process.env.GEMINI_API_KEY_INTERNAL;
        const genAI = new GoogleGenerativeAI(internalGeminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const instructionPrompt = `Read the following knowledge base text. Based ONLY on this text, generate a JSON array of 3 concise, user-facing questions that the text can answer. The questions should be varied and interesting. Respond ONLY with the raw JSON array.\n\nKNOWLEDGE:\n${knowledgeText.substring(0, 10000)}`;
        
        const result = await model.generateContent(instructionPrompt);
        const responseText = result.response.text().match(/\[.*\]/s)[0];
        const suggested_questions = JSON.parse(responseText);

        // Step 3: Format and save these questions to our bot's config
        const questionsForContentstack = suggested_questions.map(q => ({
            "suggested_question": { "question": q }
        }));

        const botToUpdate = await getManagementStack().contentType('chatbot_config').entry(botId).fetch();
        botToUpdate.ai_generated_questions = questionsForContentstack;
        await botToUpdate.update();

        res.status(200).json({ message: "Successfully generated and saved new suggested questions!" });

    } catch (error) {
        console.error("Error in AI question generation:", error);
        res.status(500).json({ error: "Failed to generate smart questions." });
    }
});

// -----------------------------------------------------------------------------
// --- 4. AUTHENTICATION ROUTES ------------------------------------------------
// -----------------------------------------------------------------------------

/**
 * @route   GET /api/auth/contentstack/callback
 * @desc    Handles the callback from Contentstack after user approves the app.
 */
app.get('/api/auth/contentstack/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("Error: Authorization code is missing.");
    
    console.log("Received authorization code, attempting to exchange for access token...");

    try {
        const clientId = process.env.CS_OAUTH_CLIENT_ID;
        const clientSecret = process.env.CS_OAUTH_CLIENT_SECRET;
        const redirectUri = process.env.CS_OAUTH_REDIRECT_URI;
        const authHost = process.env.CONTENTSTACK_AUTH_HOST;

        // ✅ THE DEFINITIVE FIX: Construct the full URL and use URLSearchParams
        const tokenUrl = `https://${authHost}/token`;

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('redirect_uri', redirectUri);

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token } = response.data;
        console.log("✅ SUCCESS! Received access token.");
        
        res.send(`<h1>Authentication Successful!</h1><p>You can close this tab.</p>`);

    } catch (error) {
        console.error("--- ERROR EXCHANGING TOKEN ---");
        if (error.response) {
            console.error("DATA:", error.response.data);
            console.error("STATUS:", error.response.status);
            console.error("HEADERS:", error.response.headers);
        } else {
            console.error("MESSAGE:", error.message);
        }
        res.status(500).send("An error occurred during authentication. Check server logs.");
    }
});

// ✅ LOCAL TEST ROUTE: Test OAuth callback locally without tunnel
app.get('/api/test-oauth', async (req, res) => {
    console.log("🧪 Testing OAuth locally...");
    
    // Simulate a test authorization code
    const testCode = "test_code_12345";
    
    try {
        const clientId = process.env.CS_OAUTH_CLIENT_ID;
        const clientSecret = process.env.CS_OAUTH_CLIENT_SECRET;
        const redirectUri = "http://localhost:3001/api/auth/contentstack/callback";
        const authHost = "api.contentstack.io"; // Use correct host directly

        console.log("Using auth host:", authHost);
        console.log("Client ID:", clientId);
        console.log("Redirect URI:", redirectUri);

        // ✅ THE DEFINITIVE FIX: Construct the full URL and use URLSearchParams
        const tokenUrl = `https://${authHost}/token`;

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', testCode);
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('redirect_uri', redirectUri);

        console.log("Making request to:", tokenUrl);
        console.log("Request params:", params.toString());

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token } = response.data;
        console.log("✅ SUCCESS! Received access token.");
        
        res.json({
            success: true,
            message: "OAuth test successful!",
            access_token: access_token ? "Received" : "Not received",
            refresh_token: refresh_token ? "Received" : "Not received"
        });

    } catch (error) {
        console.error("--- ERROR IN LOCAL TEST ---");
        if (error.response) {
            console.error("DATA:", error.response.data);
            console.error("STATUS:", error.response.status);
            console.error("HEADERS:", error.response.headers);
        } else {
            console.error("MESSAGE:", error.message);
        }
        res.status(500).json({
            success: false,
            error: "OAuth test failed",
            details: error.response ? error.response.data : error.message
        });
    }
});

// ✅ NEW ROUTE: Takes a raw user query and adds it to the knowledge base
app.post('/api/bots/:botId/refine-and-add', async (req, res) => {
    const { botId } = req.params;
    const { user_query } = req.body;

    if (!user_query) return res.status(400).json({ error: 'User query is required.' });

    try {
        // Step 1: Fetch the bot's config to understand its persona
        const botConfig = await getManagementStack().contentType('chatbot_config').entry(botId).fetch();
        const persona = botConfig.domain_bot || 'a helpful assistant';

        // Step 2: Use an AI to generate an ideal answer for the query
        const internalGeminiKey = process.env.GEMINI_API_KEY_INTERNAL;
        const genAI = new GoogleGenerativeAI(internalGeminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const instructionPrompt = `You are ${persona}. A user has asked the following question. Provide a clear, concise, and helpful answer for it. QUESTION: "${user_query}"`;
        const result = await model.generateContent(instructionPrompt);
        const refinedAnswer = result.response.text();

        // Step 3: Create a new knowledge entry with the refined Q&A
        const entryPayload = {
            title: `Q: ${user_query.substring(0, 30)}...`,
            source_text: `Question: ${user_query}\nAnswer: ${refinedAnswer}`,
            chatbot_config_reference: [{ uid: botId, _content_type_uid: 'chatbot_config' }]
        };
        await getManagementStack().contentType('customknowledge').entry().create({ entry: entryPayload });
        
        res.status(200).json({ message: `Successfully added '${user_query}' to the knowledge base.` });

    } catch (error) {
        console.error("Error in refine-and-add:", error);
        res.status(500).json({ error: "Failed to add to knowledge base." });
    }
});

// -----------------------------------------------------------------------------
// --- 5. START THE SERVER -----------------------------------------------------
// -----------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});

// Keep the server running
server.on('error', (error) => {
  console.error('Server error:', error);
});

console.log('Server setup complete, keeping process alive...');

// Add error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});