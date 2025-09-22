import { Button } from "./ui/button";
import { Bot, Plus } from "lucide-react";

export function EmptyState({ onCreateNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-6">
        <Bot className="w-12 h-12 text-blue-600" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-slate-700">No chatbots yet</h3>
      <p className="text-slate-500 mb-6 max-w-md">
        Create your first AI chat agent to start engaging with your users and automating conversations.
      </p>
      <Button 
        onClick={onCreateNew}
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3 transform hover:scale-105"
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Your First Chatbot
      </Button>
    </div>
  );
}