import { useState, useRef, useEffect } from 'react';
import { useHelpChat, type HelpChatInputPriorTurnsItem } from '@workspace/api-client-react';
import { MessageSquare, AlertTriangle, Send, LoaderCircle, Info, LifeBuoy } from 'lucide-react';
import { Link } from 'wouter';
import { Header, Footer } from '@/components/layout';

export default function HelpPage() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<HelpChatInputPriorTurnsItem[]>([]);
  const chat = useHelpChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, chat.isPending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || chat.isPending) return;

    const newHistory = [...history, { role: 'user' as const, content: question.trim() }].slice(-12);
    setHistory(newHistory);
    setQuestion('');

    chat.mutate(
      { data: { question: question.trim(), priorTurns: history.slice(-6) } },
      {
        onSuccess: (data) => {
          setHistory(prev => [...prev, { role: 'assistant' as const, content: data.answer }].slice(-12));
        },
      }
    );
  };

  const starterQuestions = [
    "How do I understand my repair quote?",
    "Is my uploaded evidence private?",
    "How do I choose an engineer?",
  ];

  return (
    <div className="fixmate-app flex flex-col min-h-screen">
      <Header />
      <main className="fixmate-shell flex-1 max-w-4xl mx-auto py-8 w-full">
        <div className="hero text-center mx-auto mb-8 px-4 pt-0">
          <div className="eyebrow justify-center"><span className="eyebrow-line" />Help Center</div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#17232d] mt-4 mb-4 font-medium tracking-tight">How can we help?</h1>
          <p className="hero-copy mx-auto">Ask our intelligent assistant for immediate guidance on your repair process.</p>
        </div>

        <div className="panel p-4 md:p-8 flex flex-col gap-6 h-[600px] max-h-[70vh]">
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 flex flex-col">
            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#536671]">
                <LifeBuoy size={48} className="text-[#f2b94b] mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-[#17232d] mb-2">I am ready to assist</h3>
                <p className="text-sm max-w-md mx-auto mb-6">This is an automated AI assistant. I can help with platform guidance, diagnosing issues, and understanding quotes.</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {starterQuestions.map((q, i) => (
                    <button 
                      key={i} 
                      className="text-xs bg-[#eef3f0] hover:bg-[#d9ede5] text-[#2c6f60] px-4 py-2 rounded-full font-bold transition-colors"
                      onClick={() => setQuestion(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              history.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] md:max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#17232d] text-[#f7f3e9] rounded-br-sm' : 'bg-[#fffdf7] border border-[#dfe5df] text-[#17232d] rounded-bl-sm'}`}>
                    {msg.role === 'assistant' && <div className="flex items-center gap-2 mb-2 text-xs font-mono font-bold text-[#b0711d]"><MessageSquare size={12} /> FixMate Assistant</div>}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="bg-[#fffdf7] border border-[#dfe5df] text-[#17232d] p-4 rounded-2xl rounded-bl-sm flex items-center gap-3 text-sm">
                  <LoaderCircle size={16} className="animate-spin text-[#c48527]" />
                  Thinking...
                </div>
              </div>
            )}
            {chat.isError && (
              <div className="error-box mt-0">
                <AlertTriangle size={16} />
                <p>Failed to connect to the help assistant. Please try again.</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[#dfe5df] pt-4">
            <form onSubmit={submit} className="relative flex items-center">
              <input
                type="text"
                maxLength={2000}
                className="w-full bg-[#f8faf5] border border-[#cad8d2] text-[#17232d] rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-[#c99030] focus:ring-2 focus:ring-[rgba(242,185,75,0.18)]"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={chat.isPending}
              />
              <button 
                type="submit" 
                disabled={!question.trim() || chat.isPending}
                className="absolute right-2 p-2 bg-[#f2b94b] text-[#17232d] rounded-lg disabled:opacity-50 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center h-9 w-9"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="mt-3 flex flex-col md:flex-row items-center justify-between text-xs text-[#8a9b97] gap-2">
              <div className="flex items-center gap-1.5">
                <Info size={12} className="flex-shrink-0" /> AI assistant may produce inaccurate information.
              </div>
              <Link href="/contact" className="text-[#b0711d] font-bold hover:underline">Escalate to Contact Us</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
