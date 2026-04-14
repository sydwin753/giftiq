import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, signIn, logOut } from './firebase';
import { Person, Gift, Idea, Occasion } from './types';
import confetti from 'canvas-confetti';
import { 
  Gift as GiftIcon, 
  User as UserIcon, 
  Plus, 
  Camera, 
  Mail, 
  History, 
  Lightbulb, 
  Trash2, 
  ChevronRight, 
  Search,
  LogOut,
  Calendar,
  Heart,
  Package,
  X,
  Check,
  BarChart3,
  LayoutDashboard,
  Sparkles,
  Receipt,
  AlertCircle,
  Link as LinkIcon,
  Tag,
  Printer,
  MessageSquare
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { identifyItem, getGiftRecommendations, extractInterestsFromBio, detectGiftConflicts, generateThankYouNote, scanReceipt, scanEmailsForGifts, extractWishlistIdeas } from './services/geminiService';

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-[40px] shadow-xl border border-red-100">
            <h1 className="text-2xl font-serif text-red-600 mb-4">Something went wrong</h1>
            <p className="text-stone-600 mb-6 font-light">The application encountered an error. Please try refreshing the page.</p>
            <pre className="bg-stone-50 p-4 rounded-2xl text-xs overflow-auto max-h-40 text-stone-400 mb-6">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-stone-900 text-white rounded-2xl font-medium hover:bg-stone-800 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [activeTab, setActiveTab] = useState<'people' | 'history' | 'ideas' | 'calendar' | 'dashboard'>('dashboard');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddGift, setShowAddGift] = useState(false);
  const [showEmailSync, setShowEmailSync] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState<Person | null>(null);
  const [showThankYou, setShowThankYou] = useState<{ person: Person, gift: Gift } | null>(null);
  const [showGiftTag, setShowGiftTag] = useState<{ person: Person, gift: Gift } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const handleWishlistImport = async () => {
    if (!wishlistUrl) return;
    setImporting(true);
    try {
      const extracted = await extractWishlistIdeas(wishlistUrl);
      alert(`Extracted ${extracted.length} ideas! Please assign them to people in your profile.`);
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImporting(false);
      setWishlistUrl('');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qPeople = query(collection(db, 'people'), where('ownerId', '==', user.uid));
    const unsubPeople = onSnapshot(qPeople, (snapshot) => {
      setPeople(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Person)));
    });

    const qGifts = query(collection(db, 'gifts'), where('ownerId', '==', user.uid));
    const unsubGifts = onSnapshot(qGifts, (snapshot) => {
      setGifts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Gift)));
    });

    const qIdeas = query(collection(db, 'ideas'), where('ownerId', '==', user.uid));
    const unsubIdeas = onSnapshot(qIdeas, (snapshot) => {
      setIdeas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Idea)));
    });

    const qOccasions = query(collection(db, 'occasions'), where('ownerId', '==', user.uid));
    const unsubOccasions = onSnapshot(qOccasions, (snapshot) => {
      setOccasions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Occasion)));
    });

    return () => {
      unsubPeople();
      unsubGifts();
      unsubIdeas();
      unsubOccasions();
    };
  }, [user]);

  if (loading) return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-16 h-16 bg-brand-pink rounded-3xl flex items-center justify-center shadow-xl shadow-brand-pink/20">
          <GiftIcon className="w-8 h-8 text-brand-deep-purple" />
        </div>
      </motion.div>
    </div>
  );

  if (!user) return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-pink/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-purple/40 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-pastel-gold/30 rounded-full blur-[120px]" />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md relative z-10"
      >
        <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl border border-pink-50">
          <GiftIcon className="w-12 h-12 text-brand-luxury-gold" />
        </div>
        <h1 className="text-5xl font-serif text-brand-deep-purple mb-4">Gift IQ</h1>
        <p className="text-stone-400 text-lg mb-12 font-light">The art of thoughtful giving, simplified.</p>
        <button 
          onClick={signIn}
          className="luxury-button-primary w-full"
        >
          <UserIcon className="w-5 h-5" />
          Begin Your Journey
        </button>
      </motion.div>
    </div>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-cream text-brand-slate pb-24 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="fixed -top-20 -left-20 w-80 h-80 bg-brand-pink/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed -bottom-20 -right-20 w-80 h-80 bg-brand-purple/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-pastel-gold/10 rounded-full blur-[150px] pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-brand-cream/80 backdrop-blur-xl border-b border-pink-50 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-deep-purple rounded-2xl flex items-center justify-center shadow-xl shadow-purple-900/10 relative overflow-hidden group">
            <div className="absolute inset-0 ribbon-gradient opacity-0 group-hover:opacity-20 transition-opacity" />
            <GiftIcon className="w-6 h-6 text-white relative z-10" />
          </div>
          <div>
            <span className="font-serif text-2xl tracking-tight block text-brand-deep-purple">Gift IQ</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-brand-luxury-gold font-bold">Premium Edition</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-stone-100 shadow-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-stone-500">{user.email}</span>
          </div>
          <button onClick={logOut} className="p-3 hover:bg-stone-100 rounded-2xl transition-all active:scale-90">
            <LogOut className="w-5 h-5 text-stone-400" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="spending-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-serif mb-2 text-brand-deep-purple">Welcome back, {user.displayName?.split(' ')[0]}</h2>
                  <p className="text-stone-400 font-light">You have {occasions.filter(o => {
                    const d = new Date(o.date);
                    const now = new Date();
                    return d.getMonth() === now.getMonth();
                  }).length} occasions this month.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAddPerson(true)} className="luxury-button-secondary">
                    <Plus className="w-4 h-4" />
                    Add Person
                  </button>
                  <button onClick={() => setShowAddGift(true)} className="luxury-button-gold">
                    <Sparkles className="w-4 h-4" />
                    New Gift
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="luxury-card p-8">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                    <BarChart3 className="w-6 h-6 text-brand-deep-purple" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-1">Total Investment</p>
                  <p className="text-3xl font-serif text-brand-deep-purple">${gifts.reduce((acc, g) => acc + (g.cost || 0), 0).toLocaleString()}</p>
                </div>
                <div className="luxury-card p-8">
                  <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mb-6">
                    <Heart className="w-6 h-6 text-pink-400" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-pink-300 mb-1">Moments Created</p>
                  <p className="text-3xl font-serif text-brand-deep-purple">{gifts.length}</p>
                </div>
                <div className="luxury-card p-8">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                    <Lightbulb className="w-6 h-6 text-brand-deep-blue" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-deep-blue/50 mb-1">Active Ideas</p>
                  <p className="text-3xl font-serif text-brand-deep-purple">{ideas.filter(i => i.status === 'pending').length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Upcoming Occasions */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif">Upcoming Occasions</h3>
                    <button onClick={() => setActiveTab('calendar')} className="text-xs font-bold text-brand-luxury-gold uppercase tracking-widest hover:underline">View Calendar</button>
                  </div>
                  <div className="space-y-4">
                    {occasions
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .filter(o => new Date(o.date) >= new Date())
                      .slice(0, 4)
                      .map(occasion => {
                        const person = people.find(p => p.id === occasion.personId);
                        return (
                          <div key={occasion.id} className="luxury-card p-6 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-brand-deep-purple">{occasion.title}</p>
                                <p className="text-sm text-purple-300">For {person?.name} • {new Date(occasion.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setSelectedPerson(person || null)}
                              className="w-10 h-10 rounded-xl border border-stone-100 flex items-center justify-center hover:bg-stone-50 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-stone-300" />
                            </button>
                          </div>
                        );
                      })}
                    {occasions.length === 0 && (
                      <div className="p-12 text-center bg-stone-50 rounded-[32px] border border-dashed border-stone-200">
                        <p className="text-stone-400 font-light">No upcoming occasions tracked.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity Timeline */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif">Recent Gifts</h3>
                    <button onClick={() => setActiveTab('history')} className="text-xs font-bold text-brand-luxury-gold uppercase tracking-widest hover:underline">Full History</button>
                  </div>
                  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-z-10 before:h-full before:w-0.5 before:bg-stone-100">
                    {gifts
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 3)
                      .map(gift => {
                        const person = people.find(p => p.id === gift.personId);
                        return (
                          <div key={gift.id} className="relative flex items-start gap-6 group">
                            <div className="w-12 h-12 bg-white rounded-2xl border-2 border-stone-100 flex items-center justify-center shadow-sm group-hover:border-brand-luxury-gold transition-colors">
                              <Package className="w-5 h-5 text-stone-300 group-hover:text-brand-luxury-gold" />
                            </div>
                            <div className="luxury-card p-6 flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-brand-slate">{gift.itemName}</h4>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-300">{new Date(gift.date).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-stone-400">Gifted to {person?.name}</p>
                              {gift.cost && <p className="text-sm font-bold text-brand-luxury-gold mt-2">${gift.cost}</p>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'people' && (
            <motion.div 
              key="people"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-serif mb-2">Inner Circle</h2>
                  <p className="text-stone-400 font-light">Manage profiles for the people who matter most.</p>
                </div>
                <button 
                  onClick={() => setShowAddPerson(true)}
                  className="luxury-button-gold"
                >
                  <Plus className="w-5 h-5" />
                  Add New
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {people.length === 0 ? (
                  <div className="col-span-full text-center py-24 bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                    <UserIcon className="w-16 h-16 text-stone-200 mx-auto mb-6" />
                    <p className="text-stone-400 text-lg font-light">Your inner circle is empty.</p>
                  </div>
                ) : (
                  people.map(person => (
                    <button 
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      className="luxury-card p-8 flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center text-3xl font-serif text-brand-deep-blue shadow-inner group-hover:scale-105 transition-transform">
                          {person.name[0]}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-brand-slate mb-1">{person.name}</h3>
                          <p className="text-sm text-stone-400 font-light tracking-wide uppercase">{person.relationship}</p>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl border border-stone-100 flex items-center justify-center group-hover:bg-brand-luxury-gold group-hover:border-brand-luxury-gold transition-all">
                        <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-white" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-serif mb-2">Gift Timeline</h2>
                  <p className="text-stone-400 font-light">A curated history of thoughtful moments.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowEmailSync(true)} className="luxury-button-secondary">
                    <Mail className="w-4 h-4" />
                    Sync
                  </button>
                  <button onClick={() => setShowAddGift(true)} className="luxury-button-gold">
                    <Plus className="w-4 h-4" />
                    Record Gift
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {gifts.length === 0 ? (
                  <div className="text-center py-24 bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                    <History className="w-16 h-16 text-stone-200 mx-auto mb-6" />
                    <p className="text-stone-400 text-lg font-light">Your history is a blank canvas.</p>
                  </div>
                ) : (
                  gifts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(gift => {
                    const person = people.find(p => p.id === gift.personId);
                    return (
                      <div key={gift.id} className="luxury-card p-8 flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-deep-blue group-hover:scale-110 transition-transform">
                            <Package className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-brand-slate mb-1">{gift.itemName}</h3>
                            <div className="flex items-center gap-2 text-sm text-stone-400">
                              <span>For {person?.name}</span>
                              <span>•</span>
                              <span>{new Date(gift.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {gift.cost && <p className="text-xl font-serif text-brand-slate mb-1">${gift.cost.toLocaleString()}</p>}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-deep-purple bg-purple-50 px-3 py-1 rounded-full">
                            {gift.occasion || 'General'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'ideas' && (
            <motion.div 
              key="ideas"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-serif mb-2">Inspiration</h2>
                  <p className="text-stone-400 font-light">Curated ideas for future gifting moments.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowScanner(true)} className="luxury-button-secondary">
                    <Camera className="w-4 h-4" />
                    Scan
                  </button>
                  <button onClick={() => setShowAddGift(true)} className="luxury-button-gold">
                    <Plus className="w-4 h-4" />
                    New Idea
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ideas.filter(i => i.status === 'pending').length === 0 ? (
                  <div className="col-span-full text-center py-24 bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                    <Lightbulb className="w-16 h-16 text-stone-200 mx-auto mb-6" />
                    <p className="text-stone-400 text-lg font-light">No ideas saved yet. Start exploring!</p>
                  </div>
                ) : (
                  ideas.filter(i => i.status === 'pending').map(idea => {
                    const person = people.find(p => p.id === idea.personId);
                    return (
                      <div key={idea.id} className="luxury-card overflow-hidden group">
                        {idea.image && (
                          <div className="h-48 overflow-hidden relative">
                            <img src={idea.image} alt={idea.itemName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                          </div>
                        )}
                        <div className="p-8">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-brand-slate mb-1">{idea.itemName}</h3>
                              <p className="text-sm text-stone-400">For {person?.name}</p>
                            </div>
                            {idea.price && <p className="text-lg font-serif text-brand-luxury-gold">${idea.price}</p>}
                          </div>
                          <p className="text-stone-500 text-sm font-light leading-relaxed mb-6 line-clamp-2">{idea.description}</p>
                          <div className="flex gap-3">
                            {idea.buyLink && (
                              <a 
                                href={idea.buyLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="luxury-button-secondary flex-1 py-3 text-xs"
                              >
                                <LinkIcon className="w-3 h-3" />
                                View Item
                              </a>
                            )}
                            <button 
                              onClick={async () => {
                                await updateDoc(doc(db, 'ideas', idea.id), { status: 'purchased' });
                                await addDoc(collection(db, 'gifts'), {
                                  personId: idea.personId,
                                  itemName: idea.itemName,
                                  date: new Date().toISOString().split('T')[0],
                                  cost: idea.price,
                                  ownerId: user.uid,
                                  source: 'idea'
                                });
                                confetti({
                                  particleCount: 150,
                                  spread: 70,
                                  origin: { y: 0.6 },
                                  colors: ['#C5A059', '#D4AF37', '#2C3E50']
                                });
                              }}
                              className="luxury-button-gold flex-1 py-3 text-xs"
                            >
                              <Check className="w-3 h-3" />
                              Purchased
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-serif mb-2">Occasions</h2>
                  <p className="text-stone-400 font-light">Never miss a moment that matters.</p>
                </div>
                <button className="luxury-button-gold">
                  <Plus className="w-5 h-5" />
                  Add Occasion
                </button>
              </div>

              <div className="grid gap-6">
                {occasions.length === 0 ? (
                  <div className="text-center py-24 bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                    <Calendar className="w-16 h-16 text-stone-200 mx-auto mb-6" />
                    <p className="text-stone-400 text-lg font-light">Your calendar is waiting for memories.</p>
                  </div>
                ) : (
                  occasions
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(occasion => {
                      const person = people.find(p => p.id === occasion.personId);
                      const isUpcoming = new Date(occasion.date) >= new Date();
                      return (
                        <div key={occasion.id} className={`luxury-card p-8 flex items-center justify-between ${!isUpcoming ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl font-serif ${
                              occasion.type === 'birthday' ? 'bg-pink-50 text-pink-400' :
                              occasion.type === 'anniversary' ? 'bg-purple-50 text-brand-deep-purple' :
                              'bg-blue-50 text-brand-deep-blue'
                            }`}>
                              {new Date(occasion.date).getDate()}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-brand-slate mb-1">{occasion.title}</h3>
                              <p className="text-sm text-stone-400 font-light">
                                {person?.name} • {new Date(occasion.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300 border border-stone-100 px-4 py-2 rounded-full">
                              {occasion.type}
                            </span>
                            <button className="w-12 h-12 rounded-2xl border border-stone-100 flex items-center justify-center hover:bg-stone-50 transition-colors">
                              <ChevronRight className="w-5 h-5 text-stone-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="spending-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-2xl font-display text-purple-900 mb-6">Spending Dashboard</h2>
              
              <div className="grid gap-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[32px] border border-purple-100 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-1">Total Spent</p>
                    <p className="text-2xl font-display text-purple-900">${gifts.reduce((acc, g) => acc + (g.cost || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-purple-100 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-1">Gifts Given</p>
                    <p className="text-2xl font-display text-purple-900">{gifts.length}</p>
                  </div>
                </div>

                {/* Upcoming Birthdays & AI Suggestions */}
                <div className="bg-white p-6 rounded-[40px] border border-purple-100 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 mb-6">Upcoming Birthdays</h3>
                  <div className="grid gap-4">
                    {people
                      .filter(p => p.birthday)
                      .sort((a, b) => {
                        const today = new Date();
                        const nextA = new Date(a.birthday!);
                        nextA.setFullYear(today.getFullYear());
                        if (nextA < today) nextA.setFullYear(today.getFullYear() + 1);
                        const nextB = new Date(b.birthday!);
                        nextB.setFullYear(today.getFullYear());
                        if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
                        return nextA.getTime() - nextB.getTime();
                      })
                      .slice(0, 3)
                      .map(person => (
                        <div key={person.id} className="p-4 bg-pink-50 rounded-2xl border border-pink-100 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-purple-900">{person.name}</p>
                            <p className="text-xs text-pink-500 font-medium">{person.birthday}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedPerson(person);
                              setActiveTab('people');
                            }}
                            className="p-2 bg-white text-pink-500 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Spending by Person Chart */}
                <div className="bg-white p-6 rounded-[40px] border border-purple-100 shadow-sm h-80">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 mb-6">Spending by Person</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={people.map(p => ({
                      name: p.name,
                      spent: gifts.filter(g => g.personId === p.id).reduce((acc, g) => acc + (g.cost || 0), 0)
                    })).filter(d => d.spent > 0)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8ff" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a855f7', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a855f7', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f3e8ff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#9333ea', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="spent" fill="#9333ea" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Spending by Year Chart */}
                <div className="bg-white p-6 rounded-[40px] border border-purple-100 shadow-sm h-80">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 mb-6">Spending by Year</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(gifts.reduce((acc, g) => {
                      const year = new Date(g.date).getFullYear();
                      acc[year] = (acc[year] || 0) + (g.cost || 0);
                      return acc;
                    }, {} as Record<number, number>)).map(([year, spent]) => ({ year, spent }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8ff" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#ec4899', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ec4899', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f3e8ff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#db2777', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="spent" fill="#ec4899" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Gift Season Planner */}
                <div className="bg-white p-6 rounded-[40px] border border-purple-100 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 mb-6">Gift Season Planner</h3>
                  <div className="grid gap-4">
                    {people.map(person => {
                      const spent = gifts.filter(g => g.personId === person.id).reduce((acc, g) => acc + (g.cost || 0), 0);
                      const budget = person.budget || 0;
                      const percent = budget > 0 ? (spent / budget) * 100 : 0;
                      
                      return (
                        <div key={person.id} className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-purple-900">{person.name}</span>
                            <span className="text-xs font-bold text-purple-400">${spent.toFixed(0)} / ${budget.toFixed(0)}</span>
                          </div>
                          <div className="h-2 bg-white rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(percent, 100)}%` }}
                              className={`h-full ${percent > 100 ? 'bg-red-400' : 'bg-purple-500'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'ideas' && (
            <motion.div 
              key="ideas"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display text-purple-900">Gift Ideas</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowScanner(true)}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowAddGift(true)}
                    className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Wishlist Import */}
              <div className="mb-8 p-6 bg-white rounded-[40px] border border-purple-100 shadow-sm">
                <label className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2 block">Import Wishlist</label>
                <div className="flex gap-2">
                  <input 
                    value={wishlistUrl}
                    onChange={e => setWishlistUrl(e.target.value)}
                    className="flex-1 p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                    placeholder="Paste Amazon wishlist link..."
                  />
                  <button 
                    onClick={handleWishlistImport}
                    disabled={importing || !wishlistUrl}
                    className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    {importing ? <Sparkles className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {ideas.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[40px] border border-purple-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 ribbon-gradient" />
                    <Lightbulb className="w-12 h-12 text-purple-200 mx-auto mb-4" />
                    <p className="text-purple-400">No ideas saved yet.</p>
                  </div>
                ) : (
                  ideas.filter(i => i.status === 'pending').map(idea => {
                    const person = people.find(p => p.id === idea.personId);
                    return (
                      <div key={idea.id} className="bg-white p-6 rounded-[32px] border border-purple-100 flex items-center justify-between shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                        <div>
                          <h3 className="font-bold text-purple-900">{idea.itemName}</h3>
                          <p className="text-sm text-purple-400">For {person?.name || 'Unknown'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              await updateDoc(doc(db, 'ideas', idea.id), { status: 'purchased' });
                              await addDoc(collection(db, 'gifts'), {
                                personId: idea.personId,
                                itemName: idea.itemName,
                                date: new Date().toISOString().split('T')[0],
                                ownerId: user.uid
                              });
                            }}
                            className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-colors"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => deleteDoc(doc(db, 'ideas', idea.id))}
                            className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="luxury-card px-4 py-3 flex items-center gap-2 shadow-2xl shadow-brand-slate/20 border-white/50 bg-white/90 backdrop-blur-xl">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
            { id: 'people', icon: UserIcon, label: 'Inner Circle' },
            { id: 'history', icon: History, label: 'Timeline' },
            { id: 'ideas', icon: Lightbulb, label: 'Inspiration' },
            { id: 'calendar', icon: Calendar, label: 'Occasions' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-500 group relative ${
                activeTab === tab.id 
                  ? 'bg-brand-slate text-white shadow-lg shadow-brand-slate/20' 
                  : 'text-stone-400 hover:text-brand-slate hover:bg-stone-50'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              {activeTab === tab.id && (
                <motion.span 
                  layoutId="activeTabLabel"
                  className="text-xs font-bold uppercase tracking-widest"
                >
                  {tab.label}
                </motion.span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showAddPerson && (
          <Modal onClose={() => setShowAddPerson(false)} title="Add Person">
            <AddPersonForm 
              onClose={() => setShowAddPerson(false)} 
              userId={user.uid} 
            />
          </Modal>
        )}

        {selectedPerson && (
          <Modal onClose={() => setSelectedPerson(null)} title="Person Profile">
            <PersonDetail 
              person={selectedPerson} 
              gifts={gifts.filter(g => g.personId === selectedPerson.id)}
              ideas={ideas.filter(i => i.personId === selectedPerson.id)}
              onClose={() => setSelectedPerson(null)}
              onShowRecs={(p) => setShowRecommendations(p)}
              onShowThankYou={(p, g) => setShowThankYou({ person: p, gift: g })}
              onShowGiftTag={(p, g) => setShowGiftTag({ person: p, gift: g })}
            />
          </Modal>
        )}

        {showAddGift && (
          <Modal onClose={() => setShowAddGift(false)} title="Add Gift">
            <AddGiftForm 
              people={people}
              gifts={gifts}
              onClose={() => setShowAddGift(false)}
              userId={user.uid}
            />
          </Modal>
        )}

        {showRecommendations && (
          <Modal onClose={() => setShowRecommendations(null)} title={`Gift Ideas for ${showRecommendations.name}`}>
            <AIRecommendations 
              person={showRecommendations} 
              pastGifts={gifts.filter(g => g.personId === showRecommendations.id)}
              onClose={() => setShowRecommendations(null)}
              userId={user.uid}
            />
          </Modal>
        )}

        {showGiftTag && (
          <Modal onClose={() => setShowGiftTag(null)} title="Gift Tag">
            <GiftTag 
              person={showGiftTag.person}
              gift={showGiftTag.gift}
              onClose={() => setShowGiftTag(null)}
            />
          </Modal>
        )}

        {showThankYou && (
          <Modal onClose={() => setShowThankYou(null)} title="Thank You Note">
            <ThankYouDraft 
              person={showThankYou.person}
              gift={showThankYou.gift}
              onClose={() => setShowThankYou(null)}
            />
          </Modal>
        )}

        {showReceiptScanner && (
          <Modal onClose={() => setShowReceiptScanner(false)} title="Receipt Scanner">
            <ReceiptScanner 
              people={people}
              userId={user.uid}
              onClose={() => setShowReceiptScanner(false)}
            />
          </Modal>
        )}

        {showEmailSync && (
          <Modal onClose={() => setShowEmailSync(false)} title="Sync from Email">
            <EmailSync 
              people={people}
              userId={user.uid}
              onClose={() => setShowEmailSync(false)}
            />
          </Modal>
        )}

        {showScanner && (
          <Modal onClose={() => setShowScanner(false)} title="Scan Idea">
            <Scanner 
              people={people}
              userId={user.uid}
              onClose={() => setShowScanner(false)}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-brand-slate/60 backdrop-blur-md"
    >
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-brand-cream w-full max-w-2xl rounded-t-[40px] sm:rounded-[48px] overflow-hidden shadow-2xl relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 ribbon-gradient" />
        <div className="px-10 pt-10 pb-6 flex items-center justify-between">
          <h2 className="text-3xl font-serif text-brand-slate">{title}</h2>
          <button onClick={onClose} className="p-3 hover:bg-stone-100 rounded-2xl text-stone-400 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="px-10 pb-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddPersonForm({ onClose, userId }: { onClose: () => void, userId: string }) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [birthday, setBirthday] = useState('');
  const [budget, setBudget] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [extracting, setExtracting] = useState(false);

  const handleExtract = async () => {
    if (!bio) return;
    setExtracting(true);
    try {
      const profile = await extractInterestsFromBio(bio);
      setInterests(profile.interests || []);
      setDislikes(profile.dislikes || []);
      setBrands(profile.favoriteBrands || []);
      setSizes(profile.sizes || {});
    } catch (err) {
      console.error("Extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'people'), {
      name,
      relationship,
      birthday,
      budget: parseFloat(budget) || 0,
      bio,
      interests,
      dislikes,
      favoriteBrands: brands,
      sizes,
      ownerId: userId,
      createdAt: serverTimestamp()
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-brand-luxury-gold">Basic Information</label>
          <input 
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full Name"
            className="luxury-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input 
            required
            value={relationship}
            onChange={e => setRelationship(e.target.value)}
            placeholder="Relationship"
            className="luxury-input"
          />
          <input 
            type="date"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            className="luxury-input"
          />
        </div>
        <input 
          type="number"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          placeholder="Annual Budget ($)"
          className="luxury-input"
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-luxury-gold">Smart Profile Extraction</label>
        <div className="relative">
          <textarea 
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Paste social bio or 'About' page text here..."
            className="luxury-input min-h-[120px] resize-none"
          />
          <button 
            type="button"
            onClick={handleExtract}
            disabled={extracting || !bio}
            className="absolute bottom-4 right-4 p-3 bg-brand-slate text-white rounded-2xl hover:bg-black disabled:opacity-50 transition-all"
          >
            {extracting ? <Sparkles className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {(interests.length > 0 || brands.length > 0) && (
        <div className="p-8 bg-stone-50 rounded-[32px] border border-stone-100 space-y-6">
          <p className="text-xs font-bold text-brand-slate uppercase tracking-widest">Extracted Insights</p>
          <div className="space-y-4">
            {interests.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-stone-300 mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map(i => <span key={i} className="px-3 py-1 bg-white rounded-full text-[10px] border border-stone-100">{i}</span>)}
                </div>
              </div>
            )}
            {brands.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-stone-300 mb-2">Brands</p>
                <div className="flex flex-wrap gap-2">
                  {brands.map(b => <span key={b} className="px-3 py-1 bg-brand-slate text-white rounded-full text-[10px]">{b}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button type="submit" className="luxury-button-gold w-full py-5 text-sm">
        Create Profile
      </button>
    </form>
  );
}

function PersonDetail({ person, gifts, ideas, onClose, onShowRecs, onShowThankYou, onShowGiftTag }: { person: Person, gifts: Gift[], ideas: Idea[], onClose: () => void, onShowRecs: (p: Person) => void, onShowThankYou: (p: Person, g: Gift) => void, onShowGiftTag: (p: Person, g: Gift) => void }) {
  const spent = gifts.reduce((acc, g) => acc + (g.cost || 0), 0);
  const budget = person.budget || 0;
  const percent = budget > 0 ? (spent / budget) * 100 : 0;

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-8">
        <div className="w-24 h-24 bg-brand-rose rounded-[40px] flex items-center justify-center text-4xl font-serif text-brand-luxury-gold shadow-inner">
          {person.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-3xl font-serif text-brand-slate">{person.name}</h3>
            <button 
              onClick={() => deleteDoc(doc(db, 'people', person.id)).then(onClose)}
              className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <Trash2 className="w-5 h-5 text-stone-300" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-luxury-gold bg-brand-rose/50 px-4 py-1.5 rounded-full">
              {person.relationship}
            </span>
            {person.birthday && (
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Born {new Date(person.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Budget Tracker */}
      <div className="luxury-card p-8 bg-brand-slate text-white border-none">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Investment Status</h4>
          <span className="text-xl font-serif">${spent.toLocaleString()} / ${budget.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percent, 100)}%` }}
            className={`h-full ${percent > 100 ? 'bg-red-400' : 'ribbon-gradient'}`}
          />
        </div>
        <p className="text-xs text-stone-400 font-light">
          {percent > 100 ? 'Budget exceeded by $' + (spent - budget).toLocaleString() : (budget - spent).toLocaleString() + ' remaining for the season.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Interests & Details */}
        <div className="space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand-luxury-gold">Profile Details</h4>
          <div className="space-y-4">
            {person.interests && person.interests.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300 mb-2">Loves</p>
                <div className="flex flex-wrap gap-2">
                  {person.interests.map(i => (
                    <span key={i} className="px-3 py-1 bg-white border border-stone-100 rounded-full text-xs text-stone-600">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {person.dislikes && person.dislikes.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300 mb-2">Avoids</p>
                <div className="flex flex-wrap gap-2">
                  {person.dislikes.map(i => (
                    <span key={i} className="px-3 py-1 bg-stone-50 border border-stone-100 rounded-full text-xs text-stone-400">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {person.favoriteBrands && person.favoriteBrands.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300 mb-2">Preferred Brands</p>
                <div className="flex flex-wrap gap-2">
                  {person.favoriteBrands.map(i => (
                    <span key={i} className="px-3 py-1 bg-stone-900 text-white rounded-full text-xs">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {person.sizes && Object.keys(person.sizes).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300 mb-2">Sizes</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(person.sizes).map(([k, v]) => (
                    <div key={k} className="p-3 bg-white border border-stone-100 rounded-2xl flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-stone-400">{k}</span>
                      <span className="text-sm font-bold text-brand-slate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions & AI */}
        <div className="space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand-luxury-gold">Smart Actions</h4>
          <div className="grid gap-3">
            <button 
              onClick={() => onShowRecs(person)}
              className="luxury-button-gold w-full justify-start"
            >
              <Sparkles className="w-5 h-5" />
              Get AI Recommendations
            </button>
            <button className="luxury-button-secondary w-full justify-start">
              <Plus className="w-5 h-5" />
              Add Gift Idea
            </button>
          </div>
        </div>
      </div>

      {/* Gift History Timeline */}
      <div className="space-y-6 pt-6 border-t border-stone-100">
        <h4 className="text-xs font-bold uppercase tracking-widest text-brand-luxury-gold">Gift Timeline</h4>
        <div className="space-y-4">
          {gifts.length === 0 ? (
            <p className="text-stone-400 font-light text-center py-8">No gifts recorded yet.</p>
          ) : (
            gifts.map(gift => (
              <div key={gift.id} className="luxury-card p-6 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-300 group-hover:text-brand-luxury-gold transition-colors">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-brand-slate">{gift.itemName}</h5>
                    <p className="text-xs text-stone-400">{new Date(gift.date).toLocaleDateString()} • {gift.occasion || 'General'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onShowThankYou(person, gift)}
                    className="p-2 hover:bg-stone-50 rounded-xl text-stone-300 hover:text-brand-luxury-gold transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onShowGiftTag(person, gift)}
                    className="p-2 hover:bg-stone-50 rounded-xl text-stone-300 hover:text-brand-luxury-gold transition-all"
                  >
                    <Tag className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AddGiftForm({ people, gifts, onClose, userId }: { people: Person[], gifts: Gift[], onClose: () => void, userId: string }) {
  const [personId, setPersonId] = useState('');
  const [itemName, setItemName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState('');
  const [occasion, setOccasion] = useState('');
  const [store, setStore] = useState('');
  const [isSurprise, setIsSurprise] = useState(true);
  const [wrappingStatus, setWrappingStatus] = useState<Gift['wrappingStatus']>('needs_wrapping');
  const [isRegift, setIsRegift] = useState(false);
  const [fromPersonId, setFromPersonId] = useState('');
  const [conflict, setConflict] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConflict = async (name: string) => {
    if (!name || !personId) return;
    setChecking(true);
    try {
      const personGifts = gifts.filter(g => g.personId === personId);
      const result = await detectGiftConflicts(name, personGifts);
      if (result.isConflict) {
        setConflict(result.warning);
      } else {
        setConflict(null);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'gifts'), {
      personId,
      itemName,
      date,
      cost: parseFloat(cost) || 0,
      occasion,
      store,
      isSurprise,
      wrappingStatus,
      isRegift,
      fromPersonId,
      ownerId: userId,
      createdAt: serverTimestamp()
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-brand-luxury-gold">Recipient</label>
          <select 
            required
            value={personId}
            onChange={e => setPersonId(e.target.value)}
            className="luxury-input"
          >
            <option value="">Select person...</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-brand-luxury-gold">Gift Details</label>
          <input 
            required
            value={itemName}
            onChange={e => {
              setItemName(e.target.value);
              if (e.target.value.length > 3) checkConflict(e.target.value);
            }}
            placeholder="Item Name"
            className="luxury-input"
          />
          {checking && <p className="text-[10px] text-brand-luxury-gold animate-pulse">Checking for conflicts...</p>}
          {conflict && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">{conflict}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input 
            type="number"
            value={cost}
            onChange={e => setCost(e.target.value)}
            placeholder="Cost ($)"
            className="luxury-input"
          />
          <input 
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="luxury-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input 
            value={occasion}
            onChange={e => setOccasion(e.target.value)}
            placeholder="Occasion (e.g. Birthday)"
            className="luxury-input"
          />
          <input 
            value={store}
            onChange={e => setStore(e.target.value)}
            placeholder="Store / Retailer"
            className="luxury-input"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-luxury-gold">Options</label>
        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => setIsSurprise(!isSurprise)}
            className={`p-4 rounded-2xl border text-xs font-bold transition-all ${isSurprise ? 'bg-brand-slate text-white border-brand-slate' : 'bg-white text-stone-400 border-stone-100'}`}
          >
            {isSurprise ? '✨ Surprise' : 'Known Gift'}
          </button>
          <button 
            type="button"
            onClick={() => setIsRegift(!isRegift)}
            className={`p-4 rounded-2xl border text-xs font-bold transition-all ${isRegift ? 'bg-brand-rose text-brand-luxury-gold border-brand-rose' : 'bg-white text-stone-400 border-stone-100'}`}
          >
            {isRegift ? '♻️ Regifted' : 'New Purchase'}
          </button>
        </div>
      </div>

      <button type="submit" className="luxury-button-gold w-full py-5 text-sm">
        Record Gift
      </button>
    </form>
  );
}

function GiftTag({ person, gift, onClose }: { person: Person, gift: Gift, onClose: () => void }) {
  return (
    <div className="grid gap-8 p-4">
      <div className="bg-white border-4 border-purple-500 p-8 rounded-[40px] shadow-xl relative overflow-hidden text-center aspect-[3/4] flex flex-col items-center justify-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-purple-500 rounded-full -mt-6" />
        <div className="absolute top-4 right-4">
          <GiftIcon className="w-8 h-8 text-pink-400" />
        </div>
        <div className="absolute bottom-4 left-4">
          <Heart className="w-8 h-8 text-purple-200" />
        </div>
        
        <h3 className="text-3xl font-display text-purple-900 mb-2">To: {person.name}</h3>
        <div className="w-16 h-1 bg-pink-500 mx-auto mb-6" />
        <p className="text-purple-400 font-medium italic mb-8">
          "Hope you love this {gift.itemName} as much as I loved picking it out for you!"
        </p>
        <h4 className="text-xl font-display text-purple-900">From: Me</h4>
      </div>
      
      <button 
        onClick={() => window.print()}
        className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
      >
        <Printer className="w-5 h-5" />
        Print Tag
      </button>
    </div>
  );
}

function EmailSync({ people, userId, onClose }: { people: Person[], userId: string, onClose: () => void }) {
  const [emailText, setEmailText] = useState('');
  const [syncing, setScanning] = useState(false);
  const [results, setResults] = useState<{ itemName: string, date: string, cost: number, retailer?: string, targetPersonId?: string }[] | null>(null);

  const handleSync = async () => {
    if (!emailText) return;
    setScanning(true);
    try {
      const data = await scanEmailsForGifts([emailText]);
      setResults(data.map((d: any) => ({ ...d, targetPersonId: '' })));
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const saveGifts = async () => {
    if (!results) return;
    const validGifts = results.filter(g => g.targetPersonId);
    if (validGifts.length === 0) return;

    for (const gift of validGifts) {
      await addDoc(collection(db, 'gifts'), {
        personId: gift.targetPersonId,
        itemName: gift.itemName,
        date: gift.date || new Date().toISOString().split('T')[0],
        cost: gift.cost,
        source: gift.retailer,
        ownerId: userId,
        createdAt: serverTimestamp()
      });
    }
    onClose();
  };

  return (
    <div className="grid gap-6">
      {!results ? (
        <>
          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-purple-400">Paste Email Content</label>
            <textarea 
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              className="w-full p-4 bg-white border border-purple-100 rounded-2xl focus:outline-none focus:border-purple-500 h-48"
              placeholder="Paste your order confirmation email text here..."
            />
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing || !emailText}
            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-100"
          >
            {syncing ? "Analyzing..." : "Analyze Email"}
          </button>
        </>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400">Found Gifts</h3>
            {results.map((gift, i) => (
              <div key={i} className="p-5 bg-white rounded-3xl border border-purple-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-pink-50 rounded-bl-3xl flex items-center justify-center">
                  <GiftIcon className="w-5 h-5 text-pink-400" />
                </div>
                <div className="mb-4">
                  <p className="font-bold text-purple-900">{gift.itemName}</p>
                  <p className="text-xs text-purple-400">{gift.retailer ? `${gift.retailer} • ` : ''}${gift.cost} • {gift.date}</p>
                </div>
                
                <div className="grid gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Who is this for?</label>
                  <select 
                    value={gift.targetPersonId}
                    onChange={e => {
                      const newResults = [...results];
                      newResults[i].targetPersonId = e.target.value;
                      setResults(newResults);
                    }}
                    className="w-full p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select recipient...</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setResults(null)}
              className="flex-1 py-4 bg-purple-100 text-purple-600 rounded-2xl font-bold"
            >
              Back
            </button>
            <button 
              onClick={saveGifts}
              disabled={!results.some(g => g.targetPersonId)}
              className="flex-[2] py-4 bg-pink-500 text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-pink-100"
            >
              Add Selected to History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function AIRecommendations({ person, pastGifts, onClose, userId }: { person: Person, pastGifts: Gift[], onClose: () => void, userId: string }) {
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGiftRecommendations(person, pastGifts, person.budget)
      .then(setRecs)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (rec: any) => {
    await addDoc(collection(db, 'ideas'), {
      personId: person.id,
      itemName: rec.itemName,
      description: rec.description,
      price: rec.price,
      buyLink: rec.buyLink,
      status: 'pending',
      ownerId: userId,
      createdAt: serverTimestamp()
    });
    onClose();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Sparkles className="w-12 h-12 text-purple-400 animate-pulse" />
      <p className="text-purple-400 font-medium animate-pulse">Curating personalized ideas...</p>
    </div>
  );

  return (
    <div className="grid gap-4">
      {recs.map((rec, i) => (
        <div key={i} className="p-6 bg-white border border-purple-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-purple-900">{rec.itemName}</h4>
            <span className="text-sm font-bold text-purple-500">${rec.price}</span>
          </div>
          <p className="text-sm text-purple-400 mb-4">{rec.description}</p>
          <div className="flex gap-2">
            <a 
              href={rec.buyLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-purple-50 text-purple-600 rounded-xl text-center text-sm font-bold border border-purple-100 flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              View Item
            </a>
            <button 
              onClick={() => handleSave(rec)}
              className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThankYouDraft({ person, gift, onClose }: { person: Person, gift: Gift, onClose: () => void }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateThankYouNote(person.name, gift.itemName, person.relationship)
      .then(setNote)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <MessageSquare className="w-12 h-12 text-blue-400 animate-pulse" />
      <p className="text-blue-400 font-medium animate-pulse">Drafting a warm message...</p>
    </div>
  );

  return (
    <div className="grid gap-6">
      <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl text-blue-900 leading-relaxed whitespace-pre-wrap italic">
        {note}
      </div>
      <button 
        onClick={() => {
          navigator.clipboard.writeText(note);
          onClose();
        }}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100"
      >
        Copy to Clipboard
      </button>
    </div>
  );
}

function ReceiptScanner({ people, userId, onClose }: { people: Person[], userId: string, onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [assignments, setAssignments] = useState<Record<number, string>>({});

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setImage(base64);
        setScanning(true);
        try {
          const extracted = await scanReceipt(base64.split(',')[1]);
          setItems(extracted);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const promises = items.map((item, i) => {
      const personId = assignments[i];
      if (!personId) return Promise.resolve();
      return addDoc(collection(db, 'gifts'), {
        personId,
        itemName: item.itemName,
        cost: item.price,
        date: new Date().toISOString().split('T')[0],
        ownerId: userId,
        createdAt: serverTimestamp()
      });
    });
    await Promise.all(promises);
    onClose();
  };

  return (
    <div className="grid gap-6">
      {!image ? (
        <label className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-purple-200 rounded-[40px] bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors">
          <Receipt className="w-12 h-12 text-purple-400" />
          <span className="font-bold text-purple-600">Upload Receipt Photo</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
        </label>
      ) : (
        <div className="grid gap-6">
          <div className="relative h-48 rounded-3xl overflow-hidden">
            <img src={image} className="w-full h-full object-cover" />
            {scanning && (
              <div className="absolute inset-0 bg-purple-900/40 flex items-center justify-center">
                <div className="w-full h-1 bg-white/50 absolute top-0 animate-scan" />
                <Sparkles className="w-12 h-12 text-white animate-pulse" />
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="grid gap-4">
              {items.map((item, i) => (
                <div key={i} className="p-4 bg-white border border-purple-100 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-purple-900">{item.itemName}</p>
                    <p className="text-xs text-purple-400">${item.price}</p>
                  </div>
                  <select 
                    value={assignments[i] || ''}
                    onChange={e => setAssignments({ ...assignments, [i]: e.target.value })}
                    className="p-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold border border-purple-100 focus:outline-none"
                  >
                    <option value="">Assign to...</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button 
                onClick={handleSave}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-100 mt-4"
              >
                Save All Gifts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Scanner({ people, userId, onClose }: { people: Person[], userId: string, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ name: string, description: string } | null>(null);
  const [targetPersonId, setTargetPersonId] = useState('');

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    try {
      const data = await identifyItem(base64);
      setResult(data);
    } catch (err) {
      console.error("Scanning failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const saveIdea = async () => {
    if (!result || !targetPersonId) return;
    await addDoc(collection(db, 'ideas'), {
      personId: targetPersonId,
      itemName: result.name,
      description: result.description,
      status: 'pending',
      ownerId: userId,
      createdAt: serverTimestamp()
    });
    onClose();
  };

  return (
    <div className="grid gap-6">
      {!result ? (
        <>
          <div className="relative aspect-square bg-black rounded-3xl overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {scanning && (
              <div className="absolute inset-0 bg-stone-900/60 flex flex-col items-center justify-center text-white">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity }}
                >
                  <Search className="w-12 h-12 mb-4" />
                </motion.div>
                <p className="font-bold">Analyzing Item...</p>
              </div>
            )}
          </div>
          <button 
            onClick={capture}
            disabled={scanning}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Capture Item
          </button>
        </>
      ) : (
        <div className="grid gap-6">
          <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
            <h3 className="text-xl font-bold text-orange-900 mb-2">{result.name}</h3>
            <p className="text-orange-700 text-sm">{result.description}</p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Save for who?</label>
            <select 
              value={targetPersonId}
              onChange={e => setTargetPersonId(e.target.value)}
              className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:border-orange-500"
            >
              <option value="">Select a person...</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setResult(null)}
              className="flex-1 py-4 bg-stone-200 text-stone-600 rounded-2xl font-bold"
            >
              Retake
            </button>
            <button 
              onClick={saveIdea}
              disabled={!targetPersonId}
              className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-bold disabled:opacity-50"
            >
              Save Idea
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
