🤖 AI Agent Platform

A plug-and-play platform for developers to create, train, and deploy custom AI chat agents in minutes, powered by Contentstack and modern LLMs.


Watch the  Video Demo  - https://youtu.be/3jo02-wN0uA



My Approach: How I Built This Site
When I started this project, I did not want to make just another chatbot. I wanted to build something that would be really useful for me as a developer. So, I decided to create it step by step, starting with the biggest challenge and then solving other problems one by one.

It all began with one big idea. In the problem statement, there was an example of a travel bot. I thought, “If I am a developer with a travel website on Contentstack, I don’t want to waste time copying all my tour details into an Excel sheet.” So, I focused on solving that problem first. I built the Live Contentstack Connector with an AI Analyzer. This tool could read a developer’s live content, understand it, and automatically create a smart bot from it. This was a big success and became the foundation of the platform.

Next, I wanted to give this “magic” to more people. I improved the system by creating the URL Scraper, which could read and understand any public webpage. I also added a CSV Upload option, so users with data in spreadsheets could use it too. This made the system flexible for everyone.

I then realized that people must trust their bots before making them live. Just adding an “embed code” was not enough. So, I built a Sandbox where users could test their bots safely. I also added an Analytics Dashboard so that after going live, owners could check performance and make improvements.

While testing with many bots, I found a big issue: my travel bot sometimes started talking about e-commerce products! To fix this, I redesigned the backend. I made sure each bot had its own separate knowledge base. I also made training additive, so new data would add to the bot’s brain instead of replacing old data. This was a tough task but made the platform stronger and ready for many users.

In the end, I turned one big idea into a complete, reliable platform by solving each problem step by step. That is how this AI Agent Platform was created.



Unique Features:
 
1) AI Analyst Pipeline: Automatically transforms unstructured content from any URL into a structured Q&A knowledge base using AI.
2) AI-Powered Configuration: Intelligently analyzes a developer's existing Contentstack models to auto-generate an expert persona and relevant suggested questions for the bot.
3) Self-Improving Knowledge Base: Turns real user questions from analytics into new knowledge with a single click, allowing the bot to learn from its conversations.
4) Multi-Source, Isolated Knowledge: Train bots on URLs, CSVs, and live Contentstack models. A robust "Knowledge Source" architecture guarantees data is never mixed between bots.


Challenges & Architectural Decisions: The Story Behind the Code

Building this platform was not just about writing code. It was about solving different problems step by step. Each major feature came with its own challenge, and the way I solved it shaped the final product.

The first big decision was about authentication: whether to use OAuth or an API Key system. The problem statement suggested OAuth (through Contentstack’s Developer Hub), which is common for multi-user apps. I started with that, but then I realized my main goal was to make the platform “plug-and-play,” where developers don’t need to deal with backend logic. OAuth would actually make things harder, because changing permissions would mean going back to Developer Hub each time.

So, I switched to a Management Token-based system. This way, developers have full control. They can create a token with exactly the permissions they want and just paste it into our UI. It keeps things simple, flexible, and truly “zero-touch.”

The next big problem was data isolation. In my tests, I created two bots: a “Swiggy Assistant” and a “Travel Bot.” To my surprise, the Travel Bot started answering questions about Swiggy’s CEO! This happened because all knowledge was stored together in one model.

To fix this, I used the “Knowledge Source” pattern. Now, every piece of knowledge is tagged with a unique ID, and each bot can only access the knowledge sources assigned to it. This solved the data leakage issue and made sure every bot’s “brain” stays private and secure.

The last challenge was about AI intelligence. The bot didn’t just need data; it needed to answer questions naturally. At first, my system prompts were too strict. The bot would answer questions from its knowledge base but would ignore simple ones like “What is the capital of France?”

The solution was better prompt engineering. I created a set of clear rules:

Always stay in your assigned persona.

If the answer is in your knowledge base, use it first.

If not, fall back to general AI knowledge.

These simple rules made the bot flexible and intelligent. It could combine its special knowledge with general information and give better answers.

In the end, these architectural decisions turned the project from a basic chatbot into a smart, reliable platform.


ARCHITECTURE DIAGRAM:
<img width="944" height="648" alt="image" src="https://github.com/user-attachments/assets/b4af4817-ffbf-4cea-aa81-83fa572649d9" />

WORKFLOW DIAGRAM:
<img width="5209" height="2189" alt="image" src="https://github.com/user-attachments/assets/b0d85fae-feb0-4335-bedf-d8770c032a91" />







Tech Stack:
1)Frontend: Vite, React, Tailwind CSS, Recharts
2)Backend: Node.js, Express.js
3)AI/LLM: Google Gemini 1.5, Groq, OpenAI
4)CMS & Backend: Contentstack

 How to Run Locally:
1)Prerequisites: Node.js (v18+), Contentstack Account, Gemini API Key.
2)Clone: git clone [your-repo-url] && cd ai-agent-platform-project
3)Backend:
    cd backend-api
    npm install
    cp .env.example .env (and fill with your keys)
    node index.js (starts on localhost:3001)
4)Frontend:
    (In a new terminal) cd frontend-dashboard
    npm install
    npm run dev (starts on localhost:5173)
   
