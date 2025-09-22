import { useState, useRef, useEffect } from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { BotIcon, SendIcon, CloseIcon, ThumbsUpIcon, ThumbsDownIcon } from './icons';

export const useStreamingChat = (botId) => {
    const [messages, setMessages] = useState([]);
    const [suggestedQuestions, setSuggestedQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    // This effect runs only ONCE to set the initial state
    useEffect(() => {
        const getInitialData = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(`http://localhost:3001/api/chatbots`);
                const bot = response.data.find(b => b.uid === botId);
                let greeting = 'Hello! How can I assist you today?';
                let initialQuestions = [];

                if (bot) {
                    switch (bot.domain_bot) { // ✅ Use correct field name 'domain_bot'
                        case 'E-commerce':
                            greeting = 'Welcome to our store! I can help with product info, policies, and orders.';
                            initialQuestions = ["Tell me about your laptops", "What is the return policy?"];
                            break;
                        case 'Travel':
                            greeting = 'Adventure is calling! Where can I help you explore today?';
                            initialQuestions = ["Find me a beach vacation", "Show me deals for Japan"];
                            break;
                        case 'Education':
                            greeting = 'Welcome to your learning space! What topic can I help you with?';
                            initialQuestions = ["What are the partner universities?", "Tell me about Stanford", "What are the tuition fees?"];
                            break;
                    }
                }

                // Prefer AI-generated questions saved on the bot
                if (bot && Array.isArray(bot.ai_generated_questions) && bot.ai_generated_questions.length > 0) {
                    initialQuestions = bot.ai_generated_questions
                        .map(q => q?.suggested_question?.question)
                        .filter(Boolean)
                        .map(q => ({ suggested_question: { question: q } }));
                } else {
                    // fallback to domain defaults -> normalize to same shape
                    initialQuestions = (initialQuestions || []).map(q => ({ suggested_question: { question: q } }));
                }

                setMessages([{ sender: 'bot', text: greeting }]);
                setSuggestedQuestions(initialQuestions);
            } catch (e) {
                setMessages([{ sender: 'bot', text: 'Hello! How can I assist you today?' }]);
            } finally {
                setIsLoading(false);
            }
        };
        getInitialData();
    }, [botId]);

    const handleFeedback = async (logId, feedback) => {
        if (!logId) return;
        try {
            await axios.put(`http://localhost:3001/api/analytics/feedback/${logId}`, { feedback });
            setMessages(prev => prev.map(msg => msg.logId === logId ? { ...msg, feedbackGiven: true } : msg));
        } catch (err) {
            console.error("Failed to submit feedback:", err);
        }
    };

    const sendMessage = async (messageText) => {
        const startTime = Date.now();
        
        setIsLoading(true);
        setSuggestedQuestions([]); // Clear suggestions as soon as the user acts
        
        const currentMessages = [...messages];
        const historyToSend = currentMessages.length > 1 ? currentMessages.slice(1) : [];
        setMessages(prev => [...prev, { sender: 'user', text: messageText }]);
        
        // Use a function for the state update to get the latest state
        setMessages(prev => [...prev, { sender: 'bot', text: '' }]);

        let fullResponse = '';
        try {
            const response = await fetch(`http://localhost:3001/api/chat/${botId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, history: historyToSend, sessionId: sessionId.current }),
            });

            if (!response.ok) throw new Error(`Network response was not ok`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.content) {
                                fullResponse += data.content;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1].text = fullResponse;
                                    return newMessages;
                                });
                            }
                            if (data.finished) {
                                setIsLoading(false);
                                // ✅ Set new suggested questions from the backend
                                if (data.metadata?.suggestedQuestions?.length > 0) {
                                    setSuggestedQuestions(data.metadata.suggestedQuestions);
                                }
									// ✅ NEW: Check for images and add them to the last message
									if (data.metadata?.images) {
										setMessages(prev => {
											const newMessages = [...prev];
											newMessages[newMessages.length - 1].images = data.metadata.images;
											return newMessages;
										});
									}
                            }
                        } catch (e) {}
                    }
                }
            }
            
            // Analytics logging logic
            const responseTime = Date.now() - startTime;
            const logPayload = { botId, user_query: messageText, response_text: fullResponse, response_time_ms: responseTime };
            const logResponse = await axios.post('http://localhost:3001/api/analytics/log', logPayload);
            const currentLogId = logResponse.data.logId;
            setMessages(prev => prev.map((msg, index) => index === prev.length - 1 ? { ...msg, logId: currentLogId } : msg));

        } catch (error) {
            setIsLoading(false);
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].text = "Sorry, an error occurred.";
                return newMessages;
            });
        }
    };

    return { messages, suggestedQuestions, isLoading, sendMessage, handleFeedback };
};

export default function ChatWidget({ botId, uiSettings, variant = 'widget' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const { messages, suggestedQuestions, isLoading, sendMessage, handleFeedback } = useStreamingChat(botId);
    const inputRef = useRef(null);

    // ✅ NEW: Function to toggle open state and notify the parent window
    const toggleChat = (openState) => {
        setIsOpen(openState);
        try {
            window.parent.postMessage({ type: 'CHAT_WIDGET_TOGGLE', isOpen: openState }, '*');
        } catch (_err) {
            // no-op if parent is not accessible
        }
    };

    // Define settings with defaults in case props are not provided
    const settings = {
        position: uiSettings?.position || 'bottom-right',
        themeColor: uiSettings?.themeColor || '#6366f1',
    };

    // Helper function to generate Tailwind CSS classes for positioning
    const getPositionClasses = (type) => {
        let classes = '';
        const isBubble = type === 'bubble';
        if (settings.position.includes('bottom')) classes += isBubble ? 'bottom-5 ' : 'bottom-24 ';
        if (settings.position.includes('top')) classes += isBubble ? 'top-5 ' : 'top-24 ';
        if (settings.position.includes('right')) classes += 'right-5 ';
        if (settings.position.includes('left')) classes += 'left-5 ';
        return classes;
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = () => {
        if (inputValue.trim() && !isLoading) {
            sendMessage(inputValue);
            setInputValue('');
            if (inputRef.current) {
                inputRef.current.style.height = '56px';
            }
        }
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Allow clicking a suggestion to auto-send
    const handleSuggestedQuestion = (questionText) => {
        if (!questionText || isLoading) return;
        setInputValue('');
        sendMessage(questionText);
    };

    // Page variant: full-screen ChatGPT-like layout
    if (variant === 'page') {
        const handleInputChange = (e) => {
            setInputValue(e.target.value);
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                const nextHeight = Math.min(160, e.target.scrollHeight);
                inputRef.current.style.height = `${nextHeight}px`;
            }
        };
        return (
            <div className="min-h-screen flex flex-col bg-slate-50">
                <header className="w-full" style={{ background: `linear-gradient(to right, ${settings.themeColor}, #4f46e5)` }}>
                    <div className="max-w-7xl mx-auto w-full px-8 py-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                                <BotIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-semibold">AI Assistant</h1>
                                <p className="text-xs opacity-85">Online</p>
                            </div>
                        </div>
                    </div>
                </header>
                
                <ScrollToBottom className="flex-grow overflow-y-auto" followButtonClassName="hidden">
                    <div className="max-w-7xl mx-auto w-full px-8 py-10 pb-56">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${msg.sender === 'user' ? '' : 'bg-white border border-slate-200'}`} style={{ backgroundColor: msg.sender === 'user' ? settings.themeColor : undefined }}>
                                    <div className={`prose prose-sm ${msg.sender === 'user' ? 'prose-invert text-white' : 'text-slate-900'} prose-p:my-2`}>
                                        <ReactMarkdown>{msg.text + (isLoading && index === messages.length - 1 ? '▍' : '')}</ReactMarkdown>
                                    </div>
                                    {msg.images && msg.images.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {msg.images.map((imgUrl, i) => (
                                                <img key={i} src={imgUrl} alt="Chatbot content" className="max-w-full h-auto rounded-lg" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!isLoading && messages.length > 0 && suggestedQuestions.length > 0 && (
                            <div className="mt-4">
                                <div className="flex flex-wrap gap-2">
                                    {suggestedQuestions.map((q_object, i) => (
                                        <button key={i} onClick={() => handleSuggestedQuestion(q_object.suggested_question.question)} className="px-3 py-1.5 bg-slate-200 text-sm text-slate-800 rounded-full hover:bg-slate-300 transition-colors">
                                            {q_object.suggested_question.question}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollToBottom>

                {/* Bottom-center big composer (ChatGPT style) */}
                <div className="fixed bottom-6 left-1/2 z-[9999]" style={{ transform: 'translateX(-50%)' }}>
                    <div className="mx-auto" style={{ width: 'min(92vw, 1100px)' }}>
                        <div className="flex items-end gap-3 rounded-3xl p-4"
                             style={{ background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyPress}
                                placeholder="Ask anything..."
                                className="flex-grow bg-transparent resize-none text-slate-900 placeholder-slate-500 focus:outline-none text-lg leading-7"
                                rows={1}
                                disabled={isLoading}
                                style={{ minHeight: '72px', maxHeight: '240px', overflowY: 'auto' }}
                            />
                            <button onClick={handleSend} disabled={isLoading || !inputValue.trim()} className="px-6 py-4 rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-semibold" style={{ backgroundColor: settings.themeColor }}>
                                <SendIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">AI can make mistakes. Consider checking important info.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Modal variant: centered popup chat (like reference)
    if (variant === 'modal') {
        const containerStyle = {
            width: '420px',
            height: '640px',
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(2,6,23,0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        };
        return (
            <div className="fixed inset-0 z-[9998]" style={{ background: 'rgba(2,6,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={containerStyle}>
                    {/* Header */}
                    <div style={{ background: settings.themeColor, color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BotIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>AI Assistant</div>
                                <div style={{ fontSize: 11, opacity: 0.9 }}>Online Now</div>
                            </div>
                        </div>
                        <button onClick={() => window.history.back()} title="Close" style={{ color: '#fff' }}>
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{ padding: 16, background: '#ffffff', flex: 1, overflowY: 'auto' }}>
                        {messages.map((msg, index) => (
                            <div key={index} style={{ marginBottom: 12 }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '10px 14px',
                                    borderRadius: 18,
                                    background: msg.sender === 'user' ? settings.themeColor : '#f1f5f9',
                                    color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                                    fontSize: 14,
                                    marginLeft: msg.sender === 'user' ? 'auto' : 0
                                }}>
                                    <ReactMarkdown>{msg.text + (isLoading && index === messages.length - 1 ? '▍' : '')}</ReactMarkdown>
                                </div>
                                {msg.sender === 'bot' && msg.logId && !msg.feedbackGiven && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                        <button onClick={() => handleFeedback(msg.logId, 1)} title="Helpful" style={{ padding: 6, borderRadius: 9999, background: '#e2e8f0', color: '#16a34a', border: 'none' }}>
                                            <ThumbsUpIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleFeedback(msg.logId, -1)} title="Not helpful" style={{ padding: 6, borderRadius: 9999, background: '#e2e8f0', color: '#dc2626', border: 'none' }}>
                                            <ThumbsDownIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {msg.sender === 'bot' && msg.feedbackGiven && (
                                    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Feedback received!</div>
                                )}
                            </div>
                        ))}

                        {/* Suggested questions pills right after first bot message OR when there are no user messages yet */}
                        {!isLoading && suggestedQuestions.length > 0 && (messages.filter(m => m.sender === 'user').length === 0) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                {suggestedQuestions.map((q_object, i) => {
                                    const q = q_object?.suggested_question?.question || q_object?.question || q_object;
                                    return (
                                        <button key={i} onClick={() => handleSuggestedQuestion(q)} style={{ padding: '8px 12px', borderRadius: 22, border: `1px solid ${settings.themeColor}`, color: settings.themeColor, background: '#ffffff', fontSize: 13 }}>
                                            {q}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Composer */}
                    <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', borderRadius: 18, padding: 8 }}>
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Reply to Assistant..."
                                style={{ flex: 1, background: 'transparent', resize: 'none', border: 'none', outline: 'none', color: '#0f172a', fontSize: 14, lineHeight: '20px', maxHeight: 120, overflowY: 'auto' }}
                                rows={1}
                                disabled={isLoading}
                            />
                            <button onClick={handleSend} disabled={isLoading || !inputValue.trim()} style={{ padding: '8px 12px', borderRadius: 12, color: '#ffffff', background: settings.themeColor, fontWeight: 600, fontSize: 13 }}>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Widget variant: floating bubble + panel
    return (
      <>
        {/* Chat Bubble Button */}
        <button
          onClick={() => toggleChat(!isOpen)}
          className={`fixed ${getPositionClasses('bubble')} text-white p-3.5 rounded-full shadow-lg hover:scale-110 transition-all duration-300 ease-in-out transform z-50`}
          style={{ backgroundColor: settings.themeColor }}
        >
          {isOpen ? <CloseIcon className="w-7 h-7" /> : <BotIcon className="w-7 h-7" />}
        </button>

        {/* Chat Window Pane */}
        <div className={`fixed ${getPositionClasses('window')} w-full max-w-sm h-[80vh] max-h-[40rem] bg-slate-900 rounded-2xl shadow-2xl flex flex-col text-white transition-all duration-300 ease-in-out origin-bottom-right z-40 border border-slate-700/50 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
          
          {/* Header */}
          <div className="flex justify-between items-center p-4 rounded-t-2xl border-b border-white/10" style={{ background: `linear-gradient(to right, ${settings.themeColor}, #4f46e5)` }}>
            <div className='flex items-center gap-3'>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <BotIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-md">AI Assistant</h3>
                    <p className="text-xs text-white/80">Online</p>
                </div>
            </div>
            <button onClick={() => toggleChat(false)} className="opacity-80 hover:opacity-100 transition-opacity"><CloseIcon className="w-6 h-6"/></button>
          </div>
          
          <ScrollToBottom className="flex-grow p-4 overflow-y-auto" followButtonClassName="hidden">
              {messages.map((msg, index) => (
                  <div key={index} className={`flex flex-col mb-4 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-xl px-4 py-3 max-w-[85%] ${msg.sender === 'user' ? 'rounded-br-lg' : 'bg-slate-700 rounded-bl-lg'}`} style={{ backgroundColor: msg.sender === 'user' ? settings.themeColor : undefined }}>
                          <div className="prose prose-sm prose-invert text-white prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                            <ReactMarkdown>{msg.text + (isLoading && index === messages.length - 1 ? '▍' : '')}</ReactMarkdown>
                          </div>
                            {/* Images below message content */}
                            {msg.images && msg.images.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {msg.images.map((imgUrl, i) => (
                                        <img key={i} src={imgUrl} alt="Chatbot content" className="max-w-full h-auto rounded-lg" />
                                    ))}
                                </div>
                            )}
                      </div>
                      
                      {/* Feedback Buttons */}
                      {msg.sender === 'bot' && msg.logId && !msg.feedbackGiven && (
                          <div className="flex space-x-2 mt-2">
                              <button onClick={() => handleFeedback(msg.logId, 1)} className="p-1.5 bg-slate-700/50 rounded-full text-slate-400 hover:bg-green-500 hover:text-white transition-colors"><ThumbsUpIcon /></button>
                              <button onClick={() => handleFeedback(msg.logId, -1)} className="p-1.5 bg-slate-700/50 rounded-full text-slate-400 hover:bg-red-500 hover:text-white transition-colors"><ThumbsDownIcon /></button>
                          </div>
                      )}
                      {msg.feedbackGiven && <p className="text-xs text-slate-500 mt-2 italic">Feedback received!</p>}
                  </div>
              ))}
          </ScrollToBottom>
          
          {/* ✅ FINAL Suggested Questions UI */}
          {!isLoading && messages.length > 0 && suggestedQuestions.length > 0 && (
            <div className="p-3 border-t border-slate-700/50">
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q_object, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleSuggestedQuestion(q_object.suggested_question.question)} 
                        className="px-3 py-1.5 bg-slate-700/80 text-sm text-slate-200 rounded-full hover:bg-slate-600 transition-colors"
                    >
                        {q_object.suggested_question.question}
                    </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-slate-700/50 bg-slate-800/50 rounded-b-2xl">
              <div className="flex items-center bg-slate-700 rounded-lg p-1.5">
                  <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-grow bg-transparent resize-none p-2 text-white placeholder-slate-400 focus:outline-none max-h-24"
                      rows={1}
                      disabled={isLoading}
                  />
                  <button onClick={handleSend} disabled={isLoading || !inputValue.trim()} className="p-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ backgroundColor: settings.themeColor }}>
                      <SendIcon className="w-5 h-5" />
                  </button>
              </div>
          </div>
        </div>
      </>
    );
}