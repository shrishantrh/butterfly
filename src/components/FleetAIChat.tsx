import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2, AlertTriangle, TrendingUp, Wrench, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const QUICK_PROMPTS = [
  { icon: AlertTriangle, label: 'Critical machines', prompt: 'Which machines need immediate attention right now? List them with severity and recommended actions.' },
  { icon: TrendingUp, label: 'Fleet performance', prompt: 'Give me a comprehensive fleet performance summary including utilization, availability, and production metrics across all sites.' },
  { icon: Wrench, label: 'Maintenance forecast', prompt: 'What are the upcoming predicted failures across the fleet? Prioritize by urgency and estimated cost impact.' },
  { icon: MapPin, label: 'Site comparison', prompt: 'Compare all operational sites by production efficiency, machine health, and cost per tonne. Which site is underperforming?' },
];

export function FleetAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('fleet-ai-chat', {
        body: { messages: newMessages },
      });

      if (error) throw error;

      const assistantContent = data?.choices?.[0]?.message?.content
        || data?.content
        || data?.response
        || 'I apologize, I was unable to process that request. Please try again.';

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (e) {
      console.error('Fleet AI error:', e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please check your connection and try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-6"
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'hsl(var(--primary) / 0.15)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="ios-headline text-foreground mb-1">Fleet Intelligence</h3>
              <p className="ios-caption text-muted-foreground">Ask anything about your {20}-machine global fleet</p>
            </div>

            <div className="space-y-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => sendMessage(qp.prompt)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 ios-card active:scale-[0.98] transition-transform"
                >
                  <qp.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="ios-subhead text-foreground">{qp.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1"
                  style={{ background: 'hsl(var(--primary) / 0.15)' }}>
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'ios-card'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:text-foreground [&_p]:ios-subhead [&_li]:text-foreground [&_li]:ios-caption [&_strong]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h3]:text-[14px] [&_h2]:text-[15px]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="ios-subhead">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1"
                  style={{ background: 'hsl(var(--muted))' }}>
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'hsl(var(--primary) / 0.15)' }}>
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="ios-card px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="ios-caption text-muted-foreground">Analyzing fleet data...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 pb-4 pt-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask about your fleet..."
            className="flex-1 rounded-2xl px-4 py-3 ios-subhead text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20 glass-input"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
