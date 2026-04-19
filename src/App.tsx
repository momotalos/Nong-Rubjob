/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  BarChart2, 
  Calendar, 
  Building2, 
  LogOut, 
  Send, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Brain,
  ShieldCheck,
  Library,
  Moon,
  Zap,
  User as UserIcon,
  ChevronRight,
  Plus
} from 'lucide-react';
import { User, Message, Role, SignalData } from './types';
import { getGeminiResponse } from './lib/gemini';

import { getSessions, createSession, saveMessage, updateSessionMetadata, getMessages } from './lib/firebaseService';

const CREDS: Record<string, { role: Role; name: string; id: string; avatar: string; password?: string }> = {
  'abc123@gmail.com': { role: 'employee', name: 'Alex Chen', id: 'EMP-4729', avatar: 'A', password: '12345678' },
  'admin999@gmail.com': { role: 'hr', name: 'Admin (HR)', id: 'HR-001', avatar: 'H', password: '99999999' }
};

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'employee' | 'hr'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [empTab, setEmpTab] = useState<'chat' | 'data' | 'sessions'>('chat');
  const [mascotVisible, setMascotVisible] = useState(false);
  const [mascotMood, setMascotMood] = useState<'happy' | 'neutral' | 'stressed' | 'sad'>('neutral');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm N'Rub Job 💙\n\nI'm here as a quiet companion — whether you want to talk something through, vent, or just check in. No judgment, no pressure.\n\nWhat's on your mind today?" }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'employee' && view === 'employee') {
      setMascotVisible(true);
    } else {
      setMascotVisible(false);
    }
  }, [user, view]);

  const handleLogin = async (email: string) => {
    const userData = CREDS[email];
    if (userData) {
      const newUser = { email, ...userData };
      setUser(newUser);
      
      if (userData.role === 'employee') {
        // Find latest session or create new one
        try {
          const sessions = await getSessions(userData.id);
          if (sessions.length > 0) {
            setCurrentSessionId(sessions[0].id);
            const history = await getMessages(sessions[0].id);
            if (history.length > 0) {
              setMessages(history);
            }
          } else {
            const sid = await createSession(userData.id);
            setCurrentSessionId(sid);
          }
        } catch (e) {
          console.error("Firebase fetch failed, falling back to local state");
        }
        setView('employee');
        setEmpTab('chat');
      } else {
        setView('hr');
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('landing');
    setMascotVisible(false);
  };

  return (
    <div className="min-h-screen font-sans text-brand-ink selection:bg-brand-blue/10">
      {/* Top Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-bottom border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="w-9 h-9 bg-linear-to-br from-brand-blue to-brand-sky rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-blue/30 group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="font-serif font-semibold text-xl tracking-tight">MindHub</span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="hidden md:flex gap-1">
                  {user.role === 'employee' ? (
                    <>
                      <NavBtn active={view === 'employee' && empTab === 'chat'} onClick={() => { setView('employee'); setEmpTab('chat'); }}>
                        <MessageCircle size={18} /> Chat
                      </NavBtn>
                      <NavBtn active={view === 'employee' && empTab === 'data'} onClick={() => { setView('employee'); setEmpTab('data'); }}>
                        <BarChart2 size={18} /> Data
                      </NavBtn>
                      <NavBtn active={view === 'employee' && empTab === 'sessions'} onClick={() => { setView('employee'); setEmpTab('sessions'); }}>
                        <Calendar size={18} /> Sessions
                      </NavBtn>
                    </>
                  ) : (
                    <NavBtn active={view === 'hr'} onClick={() => setView('hr')}>
                      <Building2 size={18} /> Org Dashboard
                    </NavBtn>
                  )}
                </div>
                
                <div className="flex items-center gap-3 pl-4 border-l border-black/5">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                      {user.role === 'hr' ? 'HR Administrator' : `#${user.id}`}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-brand-blue/10 to-brand-sky/10 border-2 border-brand-blue flex items-center justify-center font-bold text-brand-blue">
                    {user.name[0]}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </>
            )}
            {!user && view !== 'login' && (
              <button 
                onClick={() => setView('login')}
                className="px-5 py-2 bg-brand-blue text-white rounded-xl font-semibold shadow-lg shadow-brand-blue/20 hover:bg-brand-blue/90 transition-all active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative">
        <AnimatePresence mode="wait">
          {view === 'landing' && <LandingView key="landing" onStart={() => setView('login')} />}
          {view === 'login' && <LoginView key="login" onLogin={handleLogin} />}
          {view === 'employee' && (
            <EmployeeView 
              key="employee" 
              activeTab={empTab} 
              setActiveTab={setEmpTab} 
              onMoodChange={setMascotMood}
              messages={messages}
              setMessages={setMessages}
              user={user!}
              sessionId={currentSessionId}
            />
          )}
          {view === 'hr' && <HRDashboard key="hr" />}
        </AnimatePresence>
      </main>

      {/* Floating Mascot */}
      <AnimatePresence>
        {mascotVisible && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 cursor-pointer group"
            onClick={() => { setView('employee'); setEmpTab('chat'); }}
          >
            <div className="absolute bottom-full right-0 mb-4 px-3 py-1.5 bg-brand-ink text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none after:content-[''] after:absolute after:top-full after:right-4 after:border-[6px] after:border-transparent after:border-t-brand-ink">
              Talk with me 💙
            </div>
            <div className="animate-mascot-float">
              <Mascot mood={mascotMood} size={80} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-zinc-400 text-sm border-t border-black/5 mt-12">
        <p className="font-serif italic text-zinc-500 mb-2">MindHub</p>
        <p>© 2026 · Powered by Gemini Flash · N'Rub Job listens first, advises second</p>
      </footer>
    </div>
  );
}

function NavBtn({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
        active 
          ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
          : 'text-zinc-500 hover:bg-brand-blue/5 hover:text-brand-blue'
      }`}
    >
      {children}
    </button>
  );
}

// --- Views ---

function LandingView({ onStart }: { onStart: () => void, key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto px-4 py-20"
    >
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-brand-blue bg-brand-blue/5 px-3 py-1.5 rounded-full mb-8 before:content-[''] before:w-1.5 before:h-1.5 before:bg-brand-blue before:rounded-full before:animate-pulse">
            Mental Wellness Platform
          </span>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
            Meet <span className="italic font-light text-brand-blue">N'Rub Job</span><br />
            Your quiet companion<br />
            at work
          </h1>
          <p className="text-lg text-zinc-500 max-w-lg mb-10 leading-relaxed">
            MindHub helps employees manage stress and emotions through private AI conversations —
            while giving HR organization-level insights without breaking anyone's trust.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-blue/30 hover:bg-brand-blue/90 transition-all hover:-translate-y-1 active:scale-95"
            >
              Get Started →
            </button>
            <button className="px-8 py-4 bg-white border border-black/10 rounded-2xl font-bold text-lg hover:border-brand-blue hover:text-brand-blue transition-all">
              Learn more
            </button>
          </div>
        </div>
        
        <div className="relative flex justify-center items-center">
          <div className="absolute top-0 left-0 bg-white p-4 rounded-2xl rounded-bl-sm shadow-xl shadow-brand-ink/5 border border-black/5 max-w-[200px] text-sm text-zinc-600 animate-float-bubble">
            Hi there! I'm <strong className="text-brand-blue">N'Rub Job</strong>. How are you feeling today?
          </div>
          <div className="scale-125 md:scale-150">
            <Mascot mood="neutral" size={240} />
          </div>
        </div>
      </div>

      <div className="mt-32">
        <h2 className="text-center font-serif text-3xl mb-12">Three ways MindHub <span className="italic text-brand-blue font-light">supports</span> you</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<MessageCircle className="text-brand-blue" />}
            title="Talk with N'Rub Job"
            description="A private, judgment-free AI companion that listens, reflects, and gently helps you work through stress and emotions."
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-brand-green" />}
            title="Privacy by Design"
            description="Your conversations stay private. HR only sees aggregated trends — mood scores, topic themes — never your actual messages."
          />
          <FeatureCard 
            icon={<Library className="text-brand-blue" />}
            title="Resource Library"
            description="Articles and exercises on mindset, stress management, and work-life balance — curated and always available."
          />
        </div>
      </div>
    </motion.div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-black/5 hover:border-brand-blue/30 transition-all hover:-translate-y-1 shadow-sm hover:shadow-xl hover:shadow-brand-blue/5">
      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="font-serif text-xl mb-3">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: (email: string) => void, key?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (CREDS[email] && CREDS[email].password === password) {
      onLogin(email);
    } else {
      setError(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto px-4 py-20"
    >
      <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-brand-ink/5 border border-black/5">
        <h2 className="font-serif text-3xl mb-2 text-center">Welcome back</h2>
        <p className="text-zinc-500 text-center mb-10">Sign in to continue your wellness journey</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-xl text-sm flex items-center gap-3">
            <AlertTriangle size={18} />
            Invalid email or password
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-hidden focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-zinc-50 border border-black/5 rounded-2xl outline-hidden focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>
          <button className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-blue/30 hover:bg-brand-blue/90 transition-all hover:scale-[1.02] active:scale-95">
            Sign In →
          </button>
        </form>

        <div className="mt-10 p-5 bg-brand-blue/5 rounded-3xl border border-dashed border-brand-blue/20">
          <div className="text-xs font-bold text-brand-blue mb-3 uppercase tracking-wider">Test Credentials</div>
          <div className="space-y-2 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span>Employee:</span>
              <code className="bg-white px-2 py-0.5 rounded">abc123@gmail.com / 12345678</code>
            </div>
            <div className="flex justify-between">
              <span>HR Admin:</span>
              <code className="bg-white px-2 py-0.5 rounded">admin999@gmail.com / 99999999</code>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmployeeView({ activeTab, setActiveTab, onMoodChange, messages, setMessages, user, sessionId }: { 
  activeTab: 'chat' | 'data' | 'sessions', 
  setActiveTab: (t: 'chat' | 'data' | 'sessions') => void,
  onMoodChange: (mood: 'happy' | 'neutral' | 'stressed' | 'sad') => void,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  user: User,
  sessionId: string | null,
  key?: string
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[240px_1fr] gap-8">
      <aside className="lg:sticky lg:top-24 self-start flex flex-col gap-1">
        <TabBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle size={20} />}>Talk with N'Rub Job</TabBtn>
        <TabBtn active={activeTab === 'data'} onClick={() => setActiveTab('data')} icon={<BarChart2 size={20} />}>Personal Data</TabBtn>
        <TabBtn active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={<Calendar size={20} />}>Sessions</TabBtn>
      </aside>

      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && <ChatTab key="chat" onMoodChange={onMoodChange} messages={messages} setMessages={setMessages} sessionId={sessionId} />}
          {activeTab === 'data' && <DataTab key="data" />}
          {activeTab === 'sessions' && <SessionsTab key="sessions" user={user} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabBtn({ children, active, onClick, icon }: { children: React.ReactNode, active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
        active 
          ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
          : 'text-zinc-500 hover:bg-white hover:text-brand-blue border border-transparent hover:border-black/5'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ChatTab({ onMoodChange, messages, setMessages, sessionId }: { 
  onMoodChange: (mood: 'happy' | 'neutral' | 'stressed' | 'sad') => void, 
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  sessionId: string | null,
  key?: string 
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (sessionId) {
      saveMessage(sessionId, userMessage).catch(console.error);
    }

    try {
      const fullResponse = await getGeminiResponse(newMessages);
      if (fullResponse) {
        const visibleText = fullResponse.replace(/<SIGNAL>[\s\S]*?<\/SIGNAL>/, '').trim();
        const signalMatch = fullResponse.match(/<SIGNAL>([\s\S]*?)<\/SIGNAL>/);
        
        const assistantMessage: Message = { role: 'assistant', content: visibleText };
        if (sessionId) {
          saveMessage(sessionId, assistantMessage).catch(console.error);
        }

        if (signalMatch) {
          try {
            const signal: SignalData = JSON.parse(signalMatch[1].trim());
            onMoodChange(signal.mascot_mood);
            if (sessionId) {
              updateSessionMetadata(sessionId, {
                summary: signal.session_summary_update,
                riskLevel: signal.risk_level,
                primaryEmotion: signal.primary_emotion,
                topicTags: signal.topic_tags
              }).catch(console.error);
            }
          } catch (e) {
            console.error("Failed to parse signal:", e);
          }
        }

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-[32px] border border-black/5 shadow-xl shadow-brand-ink/5 flex flex-col h-[75vh] min-h-[600px] overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-black/5 bg-linear-to-b from-brand-blue/5 to-white flex items-center gap-4">
        <div className="w-11 h-11 bg-linear-to-br from-brand-blue to-brand-sky rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-blue/20">
          N
        </div>
        <div>
          <h3 className="font-serif text-lg leading-tight">N'Rub Job</h3>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse shadow-xs shadow-brand-green/50"></span>
            Online · Replies instantly
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50">
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] px-5 py-3 rounding-lg text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-brand-blue text-white rounded-2xl rounded-br-sm shadow-md shadow-brand-blue/10' 
                : 'bg-white border border-black/5 text-brand-ink rounded-2xl rounded-bl-sm shadow-xs'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white border border-black/5 px-5 py-3 rounded-2xl rounded-bl-sm shadow-xs flex gap-1">
                <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:0.4s]"></span>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-black/5 space-y-4">
        <div className="flex flex-wrap gap-2 px-2">
          <Chip onClick={() => handleSend("I had back-to-back meetings today and I'm drained")}>Drained from meetings</Chip>
          <Chip onClick={() => handleSend("I feel burned out lately")}>Feeling burned out</Chip>
          <Chip onClick={() => handleSend("My manager is putting too much pressure on me")}>Manager pressure</Chip>
        </div>
        <div className="flex gap-3 items-end p-2 bg-zinc-50 rounded-2xl border border-black/5 focus-within:border-brand-blue focus-within:bg-white transition-all">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSend(); 
              } 
            }}
            placeholder="Share what's on your mind..."
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-hidden resize-none min-h-[44px] max-h-32"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-3 bg-brand-blue text-white rounded-xl disabled:opacity-30 transition-all hover:bg-brand-blue/90"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-3 py-1.5 bg-brand-blue/5 border border-brand-blue/10 rounded-full text-[11px] font-bold text-brand-blue hover:bg-brand-blue hover:text-white transition-all whitespace-nowrap"
    >
      {children}
    </button>
  );
}

function DataTab({ key }: { key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="space-y-1">
        <h2 className="font-serif text-3xl">Your Personal Data</h2>
        <p className="text-zinc-500 text-sm">A private view of how you've been doing — only you can see this</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Mental Health Score" value="68" trend="-5 vs last week" color="text-yellow-500" />
        <StatCard label="Avg Mood" value="6.2" trend="+0.3 vs last week" color="text-brand-blue" />
        <StatCard label="Stress Level" value="7.1" trend="+1.2 vs last week" color="text-red-500" />
        <StatCard label="Sessions" value="14" trend="+4 vs last month" color="text-zinc-700" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
          <h3 className="font-serif text-lg mb-1">Mood & Stress</h3>
          <p className="text-zinc-400 text-xs mb-6 font-mono uppercase tracking-wider">Last 14 Days · Private</p>
          <div className="h-48 flex items-end gap-1.5">
            {[4,6,5,7,4,8,7,6,5,7,8,7,6,4].map((v, i) => (
              <div key={i} className="flex-1 bg-brand-blue/10 rounded-t-lg relative group h-full flex flex-col justify-end">
                <div 
                  className="bg-brand-blue rounded-t-lg transition-all" 
                  style={{ height: `${(v / 8) * 100}%` }}
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-zinc-400">
                  {['M','T','W','T','F','S','S'][i % 7]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
          <h3 className="font-serif text-lg mb-1">Top Topics</h3>
          <p className="text-zinc-400 text-xs mb-6 font-mono uppercase tracking-wider">What you talk about</p>
          <div className="space-y-4">
            <TopicRow label="Workload" value={85} count="18" />
            <TopicRow label="Sleep" value={62} count="13" />
            <TopicRow label="Manager" value={48} count="10" />
            <TopicRow label="Work-life" value={38} count="8" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm space-y-6">
        <h3 className="font-serif text-lg">Insights & Suggestions</h3>
        <div className="grid gap-4">
          <InsightCard 
            icon={<Moon className="text-brand-blue" size={18} />}
            title="Sleep pattern noticed"
            text="Your mood scores dip significantly on days after poor sleep. Consider wind-down routines before bed."
          />
          <InsightCard 
            icon={<Zap className="text-yellow-500" size={18} />}
            title="Monday stress spike"
            text="Stress levels are 40% higher on Mondays. Planning ahead on Fridays might ease the transition."
          />
          <InsightCard 
            icon={<Brain className="text-brand-green" size={18} />}
            title="You're resilient"
            text="Despite high stress, you've been consistently checking in. That self-awareness is a strength."
          />
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, trend, color }: { label: string, value: string, trend: string, color: string }) {
  const isUp = trend.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-xs">
      <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-4xl font-serif font-medium mb-2 ${color}`}>
        {value}
        {label === 'Mental Health Score' && <span className="text-sm text-zinc-300 ml-1">/100</span>}
      </div>
      <div className={`text-[10px] font-mono font-bold flex items-center gap-1 ${isUp ? 'text-brand-green' : 'text-red-500'}`}>
        {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {trend}
      </div>
    </div>
  );
}

function TopicRow({ label, value, count }: { label: string, value: number, count: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr_30px] gap-4 items-center">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <div className="h-1.5 bg-zinc-50 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className="h-full bg-linear-to-r from-brand-blue to-brand-sky"
        />
      </div>
      <span className="text-[10px] text-right font-mono font-bold text-zinc-700">{count}</span>
    </div>
  );
}

function InsightCard({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) {
  return (
    <div className="flex gap-4 p-5 bg-zinc-50 rounded-2xl border border-black/5">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-black/5">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-bold">{title}</div>
        <p className="text-xs text-zinc-500 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function SessionsTab({ user, key }: { user: User, key?: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions(user.id).then(data => {
      setSessions(data);
      setLoading(false);
    });
  }, [user.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="space-y-1">
        <h2 className="font-serif text-3xl">Your Sessions</h2>
        <p className="text-zinc-500 text-sm">Conversations with N'Rub Job · Private to you</p>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-10 text-zinc-400 font-mono text-xs uppercase tracking-widest">Loading history...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">No sessions found. Start talking to see your history!</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} className="group bg-white p-6 rounded-3xl border border-black/5 hover:border-brand-blue/30 transition-all cursor-pointer flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <div className="font-serif text-lg">
                  {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() + ' · ' + s.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Session ID: ' + s.id}
                </div>
                <p className="text-zinc-500 text-sm">{s.summary || 'An ongoing conversation...'}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                  s.riskLevel <= 1 ? 'bg-brand-green/10 text-brand-green' :
                  s.riskLevel <= 2 ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-red-500/10 text-red-600'
                }`}>
                  {s.primaryEmotion || 'Neutral'}
                </div>
                <ChevronRight size={18} className="text-zinc-300 group-hover:text-brand-blue transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function HRDashboard({ key }: { key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-4 py-8 space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h2 className="font-serif text-4xl leading-tight">Organizational Mental Health <span className="italic text-brand-blue font-light">Intelligence</span></h2>
          <p className="text-zinc-500">From reactive to proactive people management · anonymized aggregate data</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1">Last Refreshed</div>
          <div className="text-sm font-semibold">April 19, 2026 · 14:32</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-4 border-b border-black/5">
        <select className="bg-white border border-black/10 rounded-xl px-4 py-2 text-sm outline-hidden focus:border-brand-blue transition-all cursor-pointer">
          <option>All departments</option>
          <option>Engineering</option>
          <option>Sales</option>
        </select>
        <select className="bg-white border border-black/10 rounded-xl px-4 py-2 text-sm outline-hidden focus:border-brand-blue transition-all cursor-pointer">
          <option>Last 14 days</option>
          <option>Last 30 days</option>
        </select>
        <select className="bg-white border border-black/10 rounded-xl px-4 py-2 text-sm outline-hidden focus:border-brand-blue transition-all cursor-pointer">
          <option>All risk levels</option>
          <option>High risk only</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Org Health" value="72" trend="+2 WoW" color="text-brand-green" />
        <KpiCard label="High-risk Emps" value="12" trend="-3 WoW" color="text-red-500" />
        <KpiCard label="Burnout Risk" value="28" trend="+5 WoW" color="text-yellow-600" />
        <KpiCard label="Active Users" value="247" trend="+18% WoW" color="text-brand-blue" />
        <KpiCard label="Retention Risk" value="7" trend="+2 WoW" color="text-orange-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
          <h3 className="font-serif text-xl mb-1">Daily Sessions</h3>
          <p className="text-zinc-400 text-xs mb-8 font-mono uppercase tracking-wider">Risk classification trends · 14 days</p>
          <div className="h-48 flex items-end gap-2">
            {[45,52,65,72,58,32,28,62,75,82,88,80,45,38].map((v, i) => (
              <div key={i} className="flex-1 bg-zinc-50 rounded-t-xl relative group h-full flex flex-col justify-end overflow-hidden">
                <div className="bg-red-500/80 w-full" style={{ height: `${(v * 0.1) / 100 * 100}%` }} />
                <div className="bg-yellow-500/80 w-full" style={{ height: `${(v * 0.3) / 100 * 100}%` }} />
                <div className="bg-brand-green/80 w-full" style={{ height: `${(v * 0.6) / 100 * 100}%` }} />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-zinc-400">
                  {['M','T','W','T','F','S','S'][i % 7]}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex gap-4 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-brand-green rounded-full"></span> Low risk</div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Medium risk</div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> High risk</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm space-y-6">
          <h3 className="font-serif text-xl">Priority Alerts</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AlertItem 
              id="#EMP-4729" 
              dept="Engineering" 
              time="10m ago" 
              urgent 
              text="Red flag detected · references to self-harm · hotline shared" 
            />
            <AlertItem 
              id="#EMP-2103" 
              dept="Sales" 
              time="2h ago" 
              text="Sustained medium risk · 5 sessions · topics: manager, workload" 
            />
            <AlertItem 
              id="Team: Ops" 
              dept="Operations" 
              time="yesterday" 
              text="Team avg stress ↑ 40% this week · consider workshop" 
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KpiCard({ label, value, trend, color }: { label: string, value: string, trend: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-black/5 shadow-xs relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-full h-1 bg-current ${color} opacity-40`} />
      <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-3xl font-serif font-medium ${color}`}>{value}</div>
      <div className="text-[10px] font-mono font-bold text-zinc-400 mt-2">{trend}</div>
    </div>
  );
}

function AlertItem({ id, dept, time, text, urgent }: { id: string, dept: string, time: string, text: string, urgent?: boolean }) {
  return (
    <div className={`p-5 rounded-3xl border ${urgent ? 'bg-red-50 border-red-100' : 'bg-zinc-50 border-black/5'} space-y-3`}>
      <div className="flex justify-between items-center">
        <div className="text-xs font-bold text-brand-ink">{id} · {dept}</div>
        <div className="text-[10px] font-mono text-zinc-400">{time}</div>
      </div>
      <p className="text-xs text-zinc-600 leading-relaxed">{text}</p>
      <div className="flex gap-2">
        <button className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
          urgent ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-white border border-black/10 hover:border-brand-blue hover:text-brand-blue'
        }`}>
          {urgent ? 'Notify EAP' : 'Review Details'}
        </button>
      </div>
    </div>
  );
}

// --- Icons & Graphics ---

function Mascot({ mood, size = 320 }: { mood: 'happy' | 'neutral' | 'stressed' | 'sad', size?: number }) {
  const getColors = () => {
    switch(mood) {
      case 'happy': return ['#86efac', '#10b981'];
      case 'stressed': return ['#fdba74', '#ea580c'];
      case 'sad': return ['#cbd5e1', '#64748b'];
      default: return ['#60a5fa', '#2563eb'];
    }
  };
  const [c1, c2] = getColors();

  return (
    <svg width={size} height={size * 1.14} viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
      <defs>
        <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={c1}/>
          <stop offset="100%" stopColor={c2}/>
        </radialGradient>
        <radialGradient id="cheekGrad">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#f87171" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="295" rx="80" ry="10" fill="#2563eb" opacity="0.15"/>
      <motion.path 
        animate={{ d: "M140,60 C200,60 235,110 235,170 C235,225 195,275 140,275 C85,275 45,225 45,170 C45,110 80,60 140,60 Z" }}
        fill="url(#bodyGrad)"
      />
      <ellipse cx="110" cy="120" rx="22" ry="15" fill="white" opacity="0.3"/>
      <ellipse cx="110" cy="165" rx="9" ry="12" fill="#0f1e3a"/>
      <ellipse cx="170" cy="165" rx="9" ry="12" fill="#0f1e3a"/>
      <circle cx="113" cy="161" r="3" fill="white"/>
      <circle cx="173" cy="161" r="3" fill="white"/>
      <circle cx="85" cy="195" r="12" fill="url(#cheekGrad)"/>
      <circle cx="195" cy="195" r="12" fill="url(#cheekGrad)"/>
      <path d="M125,200 Q140,215 155,200" stroke="#0f1e3a" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="60" cy="95" r="3" fill="#fbbf24" className="animate-pulse" />
      <circle cx="220" cy="105" r="2.5" fill="#fbbf24" className="animate-pulse [animation-delay:0.5s]" />
      <circle cx="225" cy="230" r="3" fill="#fbbf24" className="animate-pulse [animation-delay:1s]" />
    </svg>
  );
}
