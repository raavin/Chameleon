/**
 * InterviewChat - Chat-style interactive interview component
 * Allows user to converse with AI agent during ideation phase
 */

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  category?: string;
  timestamp: string;
}

interface InterviewChatProps {
  modulePackId: string;
  onComplete: () => void;
  apiBase: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  requirements: 'bg-blue-500/20 text-blue-300',
  constraints: 'bg-red-500/20 text-red-300',
  preferences: 'bg-purple-500/20 text-purple-300',
  priorities: 'bg-amber-500/20 text-amber-300',
  edge_cases: 'bg-orange-500/20 text-orange-300',
  integration: 'bg-cyan-500/20 text-cyan-300',
  users: 'bg-green-500/20 text-green-300',
  workflows: 'bg-indigo-500/20 text-indigo-300',
};

export default function InterviewChat({ modulePackId, onComplete, apiBase }: InterviewChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start interview on mount - get first question
  useEffect(() => {
    sendMessage(null);
  }, []);

  const sendMessage = async (userMessage: string | null) => {
    setSending(true);

    // Add user message to display
    if (userMessage) {
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);
    }

    try {
      const res = await fetch(`${apiBase}/${modulePackId}/interview-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.done) {
                // Stream done
              } else if (event.type === 'question' || event.status === 'question') {
                // New agent question
                const agentMsg: ChatMessage = {
                  id: event.question_id || `agent_${Date.now()}`,
                  role: 'agent',
                  content: event.question,
                  category: event.category,
                  timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, agentMsg]);
                setProgress(event.interview_progress || 0);
              } else if (event.status === 'interview_complete' || event.type === 'synthesis_complete') {
                setIsComplete(true);
                setSynthesizing(event.status === 'interview_complete');
                if (event.type === 'synthesis_complete') {
                  setSynthesizing(false);
                  onComplete();
                }
              } else if (event.error) {
                setMessages(prev => [...prev, {
                  id: `error_${Date.now()}`,
                  role: 'system',
                  content: `Error: ${event.error}`,
                  timestamp: new Date().toISOString()
                }]);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'system',
        content: `Connection error: ${err}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    sendMessage(msg);
  };

  const handleSkipRemaining = async () => {
    setSynthesizing(true);
    try {
      const res = await fetch(`${apiBase}/${modulePackId}/interview-skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.done) {
                setSynthesizing(false);
                setIsComplete(true);
                onComplete();
              }
            } catch (e) {
              // Skip
            }
          }
        }
      }
    } catch (err) {
      console.error('Skip remaining error:', err);
      setSynthesizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center py-4 border-b border-white/10">
        <h2 className="text-xl font-black text-white">Interactive Interview</h2>
        <p className="text-xs text-slate-400 mt-1">Chat with the AI to refine your requirements</p>

        {/* Progress Bar */}
        <div className="mt-3 px-8">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-emerald-400 font-bold">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'agent'
                ? 'bg-blue-500/10 border border-blue-500/20 text-slate-200'
                : msg.role === 'user'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-slate-200'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}>
              {msg.category && (
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-2 ${
                  CATEGORY_COLORS[msg.category] || 'bg-slate-500/20 text-slate-300'
                }`}>
                  {msg.category.replace(/_/g, ' ')}
                </span>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-blue-400">
                <span className="animate-spin text-sm">&#8635;</span>
                <span className="text-xs">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {synthesizing && (
          <div className="flex justify-center">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 text-center">
              <div className="flex items-center gap-2 text-purple-400">
                <span className="animate-spin text-sm">&#8635;</span>
                <span className="text-xs font-bold">Synthesizing requirements from conversation...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isComplete && !synthesizing && (
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your answer..."
              rows={2}
              disabled={sending}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 disabled:opacity-50"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-30 transition-all text-sm"
              >
                Send
              </button>
              <button
                onClick={handleSkipRemaining}
                disabled={sending || messages.length < 2}
                className="px-4 py-2 bg-white/10 text-slate-400 font-bold rounded-xl hover:bg-white/20 disabled:opacity-30 transition-all text-[10px] uppercase tracking-wider"
              >
                Skip All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
