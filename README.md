🤖 AI Agent Platform - A Contentstack Hackathon Project
The problem: Building a custom, intelligent AI chatbot is complex. Developers need to juggle LLM APIs, manage content, engineer prompts, and build a user-facing interface.
Our solution: A plug-and-play platform where developers can create, train, and deploy powerful, domain-specific AI chat agents in minutes. We built this as a complete solution that leverages Contentstack not just as a data source, but as the core backend engine for a scalable SaaS application.
▶️ Watch our 5-Minute Video Demo Here
✨ What Makes Our Platform Unique?
Most chatbot builders are just thin wrappers around an LLM API. We went deeper, building an intelligent system that understands and adapts to a developer's content.
1. The AI Analyst: An Automated RAG Pipeline
Instead of forcing developers to manually format data, our platform uses an AI Analyst, powered by Google's Gemini 1.5. A developer can simply provide a URL to their existing website (like an "About Us" or "FAQ" page).
Our Smart Scraper extracts the clean, meaningful text.
The AI Analyst then reads this unstructured text, reasons about its content, and automatically generates a high-quality, structured Question/Answer knowledge base.
This transforms unstructured web content into a reliable, indexed "brain" for the bot, creating a powerful Retrieval-Augmented Generation (RAG) pipeline with zero manual effort.
2. The AI Configurator: Live Contentstack Model Integration
For developers already using Contentstack, we offer a groundbreaking integration. A developer can connect their bot to one of their existing Content Models (e.g., "Products" or "Tours").
Our AI Analyzer fetches a sample of the entries from the developer's model.
It analyzes the data structure (title, price, description, etc.).
It then auto-generates a new expert persona (a system prompt) and a set of relevant suggested questions specifically tailored to that content model.
The platform doesn't just read the data; it reconfigures the bot's entire personality to become an instant expert on the developer's content.
3. A Self-Improving Ecosystem
A bot should get smarter over time. Our platform is built on a continuous feedback loop.
Analytics Dashboard: Provides clear insights into what real users are asking.
"Refine & Add" to Knowledge: A developer can see a popular, unanswered question in the analytics and, with a single click, command the AI to generate a perfect answer and permanently add it to the bot's knowledge base. The bot learns from its own conversations.
🚀 Key Features
Multi-Source Knowledge Ingestion:
AI-Powered URL Scraper: Train a bot from any public webpage.
CSV Upload: For structured Q&A data.
Live Contentstack Model Connector: The bot intelligently adapts to a developer's existing content models.
Multi-LLM Support: Developers can choose their preferred LLM (Gemini, Groq, OpenAI) and provide their own API keys for full control.
Dynamic Personas: Use pre-built domain personas (E-commerce, Travel) or the powerful "Free Prompt" mode for complete creative control.
Live UI Customization: A "what you see is what you get" editor to change the chat widget's theme color and on-screen position.
Actionable Analytics: A dashboard to track usage, user feedback, and identify knowledge gaps.
Plug-and-Play Embed: A simple <iframe> snippet to deploy the finished chatbot on any website.
Isolated & Non-Destructive Training: Our "Knowledge Source" architecture ensures that each bot's knowledge is perfectly isolated and that training from a new source adds to, rather than replaces, existing knowledge.
🛠️ Tech Stack & Architecture
We built this project as a modern, full-stack application.
Frontend: Vite + React, Tailwind CSS for styling, Recharts for data visualization.
Backend: Node.js + Express.js for the core API.
AI/LLM: Google Gemini 1.5 Flash, Groq, OpenAI.
Core Backend & CMS: Contentstack. We made a strategic decision to use Contentstack as the entire backend for our platform. All bot configurations, knowledge bases, analytics logs, and chat histories are stored as structured entries, managed via the Contentstack Management API.
A Note on Our Architectural Choice: API Keys vs. OAuth
The problem statement mentions using the Developer Hub and OAuth. We deeply considered this.
We initially implemented an OAuth flow but made a strategic pivot to a Management Token-based approach for a superior developer experience. A traditional OAuth flow can create friction, requiring developers to re-scope and re-authorize the application whenever their content models change.
Our current architecture provides a true "zero-touch backend experience." It empowers the developer with full control within their own stack. They can generate a token with the precise permissions needed and paste it into our UI. This aligns perfectly with the "plug-and-play" and "no backend logic required" vision of the challenge, putting all the power and flexibility in the hands of the developer.
🏃 How to Run Locally
Prerequisites:
Node.js (v18+)
A Contentstack account.
A Google Gemini API Key.
Clone the repository:
code
Bash
git clone [your-repo-url]
cd ai-agent-platform-project
Setup Backend:
code
Bash
cd backend-api
npm install
cp .env.example .env
Fill in your Contentstack and Gemini credentials in the .env file.
Run node index.js. The server will start on localhost:3001.
Setup Frontend:
Open a new terminal.
code
Bash
cd frontend-dashboard
npm install
npm run dev
The application will be available at http://localhost:5173.
Thank you for the opportunity to build this project
