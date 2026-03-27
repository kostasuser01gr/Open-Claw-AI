import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Image as ImageIcon, 
  Search, 
  MapPin, 
  Brain, 
  User, 
  Bot, 
  Loader2,
  Trash2,
  Settings2,
  ChevronRight,
  Sparkles,
  Zap,
  Code,
  LineChart,
  FileText,
  Palette,
  Layout,
  Maximize2,
  X,
  Copy,
  Download,
  Check,
  Car,
  Calendar,
  Users,
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  LogOut,
  LogIn,
  TrendingUp,
  AlertCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { gemini, Message, MODELS, PersonaType } from './services/gemini';
import { FleetFilters } from './components/FleetFilters';
import { DynamicUI } from './components/DynamicUI';
import { cn } from './lib/utils';
import { auth, db, storage, loginWithGoogle, logout, handleFirestoreError, OperationType, ref, uploadBytes, getDownloadURL } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, addDoc, updateDoc, doc } from 'firebase/firestore';

const SYSTEM_INSTRUCTION_BASE = `You are Open Claw Chat AI, a high-precision, professional AI workstation for Car Rental & Tourism Operations.
Your goal is to be an adaptive partner for complex enterprise tasks.

CAR RENTAL & OPS CONTEXT:
You have access to a full suite of modules:
- Reservations: Manage booking lifecycle, summaries, and conflicts.
- Fleet: Track availability, maintenance, and utilization.
- CRM: Manage customer profiles, loyalty, and email drafting.
- Operations: Task assignment, branch management, and SOP suggestions.

AI CAPABILITIES:
- Smart Assistant: Answer ops questions based on fleet/booking data.
- Summarization: Generate booking summaries, daily reports, and task notes.
- Drafting: Write professional customer emails and response templates.
- Risk Detection: Flag overdue tasks, maintenance needs, or booking conflicts.
- Recommendations: Suggest upsells (insurance, GPS) or cross-sells (tours).

When acting as a Rental Agent:
- Use Google Maps tool to find real locations and provide direct links.
- If asked for availability, provide a structured list of vehicles.
- Respect search filters provided in tags like [Search Filters - Type: ..., Transmission: ..., Max Price: ...].

CORE CAPABILITIES:
1. ADAPTIVE PERSONAS: You change your tone and depth based on the selected persona.
2. CLAW CANVAS: You can generate structured content using <canvas> tags.
   - Use <canvas type="document" title="Title"> for long-form text, reports, or articles.
   - Use <canvas type="code" title="filename.ext"> for code snippets or full files.
   - Use <canvas type="data" title="Dataset Name"> for JSON data meant for visualization.
   - Use <canvas type="gallery" title="Car Gallery"> for a visual list of cars.
   - Use <canvas type="kpi" title="KPI Dashboard"> for operational metrics.

Tone: Professional, precise, and helpful. Avoid excessive fluff.`;

interface ProjectFile {
  id: string;
  type: 'document' | 'code' | 'data' | 'gallery' | 'kpi' | 'fleet' | 'reservations' | 'crm' | 'ops';
  content: string;
  title: string;
  createdAt: string;
}

interface CanvasState {
  isOpen: boolean;
  activeFileId: string | null;
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium",
        active 
          ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" 
          : "text-text-muted hover:text-text hover:bg-border/50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

type ViewMode = 'chat' | 'fleet' | 'reservations' | 'crm' | 'ops' | 'kpi' | 'maintenance' | 'damage' | 'pricing' | 'contracts' | 'corporate';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EAB308'];

function DataCanvas({ activeFile, updateFileContent }: { activeFile: ProjectFile, updateFileContent: (id: string, content: string) => void }) {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>(() => {
    try {
      const parsed = JSON.parse(activeFile.content);
      if (parsed.chartType && ['line', 'bar', 'pie'].includes(parsed.chartType)) {
        return parsed.chartType;
      }
    } catch {
      // Ignore parse errors
    }
    return 'line';
  });

  let data = [];
  try {
    data = JSON.parse(activeFile.content).data || [];
  } catch {
    // Ignore parse errors
  }

  const renderChart = () => {
    if (data.length === 0) return <div className="flex items-center justify-center h-full text-text-muted">No data available</div>;

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis dataKey="name" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--text)'
                }}
              />
              <Legend />
              <Bar dataKey="value" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_entry: Record<string, unknown>, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--text)'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis dataKey="name" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'var(--text)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#F97316" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#F97316', strokeWidth: 2, stroke: 'var(--bg)' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </ReLineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-surface p-8 rounded-[32px] border border-border shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Data Visualization</h3>
          <div className="flex bg-bg rounded-lg p-1 border border-border">
            <button
              onClick={() => setChartType('line')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                chartType === 'line' ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
              )}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                chartType === 'bar' ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
              )}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                chartType === 'pie' ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
              )}
            >
              Pie
            </button>
          </div>
        </div>
        <div className="h-[400px] w-full">
          {renderChart()}
        </div>
      </div>
      <div className="bg-surface p-6 rounded-2xl border border-border">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Raw Data Source</p>
        <textarea
          value={activeFile.content}
          onChange={(e) => updateFileContent(activeFile.id, e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 p-0 font-mono text-xs text-text-muted resize-none h-32"
        />
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [canvas, setCanvas] = useState<CanvasState>({ isOpen: false, activeFileId: null });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [highThinking, setHighThinking] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [isTtsEnabled] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [persona, setPersona] = useState<PersonaType>('general');
  const [selectedCar, setSelectedCar] = useState<Record<string, unknown> | null>(null);
  const [rentalFilters, setRentalFilters] = useState({
    carType: 'all',
    transmission: 'all',
    maxPrice: 200,
    availability: 'all'
  });
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [copied, setCopied] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, title, message, type, time: new Date().toISOString() }, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const analyzeDamage = async (imageUrl: string) => {
    try {
      const response = await gemini.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: "Analyze this car damage image. Provide a JSON response with: severity (low, medium, high, critical), estimatedRepairCost (number), description (string), and aiAssessment (string summary)." },
            { inlineData: { mimeType: "image/jpeg", data: imageUrl.split(',')[1] } }
          ]
        },
        config: { responseMimeType: "application/json" }
      });
      
      const assessment = JSON.parse(response.text);
      addNotification('AI Assessment Complete', `Damage severity: ${assessment.severity}`, 'success');
      return assessment;
    } catch (error) {
      console.error('Damage analysis failed:', error);
      addNotification('AI Analysis Failed', 'Could not analyze damage image.', 'error');
      return null;
    }
  };

  // Firestore Data State
  const [fleet, setFleet] = useState<Array<Record<string, unknown>>>([]);
  const [reservations, setReservations] = useState<Array<Record<string, unknown>>>([]);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [tasks, setTasks] = useState<Array<Record<string, unknown>>>([]);
  const [maintenance, setMaintenance] = useState<Array<Record<string, unknown>>>([]);
  const [damageReports, setDamageReports] = useState<Array<Record<string, unknown>>>([]);
  const [pricingRules, setPricingRules] = useState<Array<Record<string, unknown>>>([]);
  const [contracts, setContracts] = useState<Array<Record<string, unknown>>>([]);
  
  const notifiedIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!user) return;

    if (isInitialLoad.current) {
      if (tasks.length > 0 || maintenance.length > 0 || damageReports.length > 0 || reservations.length > 0) {
        isInitialLoad.current = false;
      }
      return;
    }

    // hasNew is not strictly needed if we just rely on state updates
    // but we can use it to trigger a sound or something if we wanted
    // For now, just remove it to satisfy linter

    // Check overdue tasks
    tasks.forEach(task => {
      if (task.status !== 'completed' && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (dueDate < new Date() && !notifiedIds.current.has(`task-overdue-${task.id}`)) {
          addNotification('Overdue Task', `Task "${task.title}" is overdue.`, 'warning');
          notifiedIds.current.add(`task-overdue-${task.id}`);
        }
      }
    });

    // Check upcoming maintenance
    maintenance.forEach(maint => {
      if (maint.status === 'scheduled' && maint.date) {
        const maintDate = new Date(maint.date);
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        
        if (maintDate <= threeDaysFromNow && maintDate >= new Date() && !notifiedIds.current.has(`maint-upcoming-${maint.id}`)) {
          addNotification('Upcoming Maintenance', `Vehicle ${maint.vehicleId} has maintenance scheduled on ${maintDate.toLocaleDateString()}.`, 'info');
          notifiedIds.current.add(`maint-upcoming-${maint.id}`);
        }
      }
    });

    // Check new damage reports
    damageReports.forEach(report => {
      if (report.status === 'pending' && !notifiedIds.current.has(`damage-pending-${report.id}`)) {
        addNotification('New Damage Report', `Damage reported for vehicle ${report.vehicleId} needs review.`, 'error');
        notifiedIds.current.add(`damage-pending-${report.id}`);
      }
    });

    // Check new reservations
    reservations.forEach(res => {
      if (res.status === 'confirmed' && !notifiedIds.current.has(`res-new-${res.id}`)) {
        addNotification('New Reservation', `Reservation ${res.id} created for ${res.customerName || 'a customer'}.`, 'success');
        notifiedIds.current.add(`res-new-${res.id}`);
      }
    });

  }, [tasks, maintenance, damageReports, reservations, user]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qVehicles = query(collection(db, 'vehicles'), limit(50));
    const unsubVehicles = onSnapshot(qVehicles, (snap) => {
      setFleet(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles'));

    const qRes = query(collection(db, 'reservations'), orderBy('pickupDate', 'desc'), limit(50));
    const unsubRes = onSnapshot(qRes, (snap) => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'reservations'));

    const qCust = query(collection(db, 'customers'), limit(50));
    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    const qTasks = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'), limit(50));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    const qMaint = query(collection(db, 'maintenance'), orderBy('date', 'desc'), limit(50));
    const unsubMaint = onSnapshot(qMaint, (snap) => {
      setMaintenance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'maintenance'));

    const qDamage = query(collection(db, 'damage_reports'), orderBy('createdAt', 'desc'), limit(50));
    const unsubDamage = onSnapshot(qDamage, (snap) => {
      setDamageReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'damage_reports'));

    const qPricing = query(collection(db, 'pricing_rules'), limit(50));
    const unsubPricing = onSnapshot(qPricing, (snap) => {
      setPricingRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pricing_rules'));

    const qContracts = query(collection(db, 'contracts'), orderBy('signedAt', 'desc'), limit(50));
    const unsubContracts = onSnapshot(qContracts, (snap) => {
      setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'contracts'));

    return () => {
      unsubVehicles();
      unsubRes();
      unsubCust();
      unsubTasks();
      unsubMaint();
      unsubDamage();
      unsubPricing();
      unsubContracts();
    };
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const parseCanvasContent = (text: string) => {
    const canvasRegex = /<canvas\s+type="([^"]+)"(?:\s+title="([^"]+)")?>([\s\S]*?)<\/canvas>/gi;
    let match;
    let newText = text;
    const newFiles: ProjectFile[] = [];

    while ((match = canvasRegex.exec(text)) !== null) {
      const type = match[1] as 'document' | 'code' | 'data';
      const title = match[2] || 'Untitled';
      const content = match[3].trim();
      const id = Math.random().toString(36).substring(7);
      
      const newFile: ProjectFile = {
        id,
        type,
        title,
        content,
        createdAt: new Date().toISOString()
      };
      newFiles.push(newFile);
      newText = newText.replace(match[0], `*Generated ${type}: ${title} (Added to Project)*`);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setCanvas({ isOpen: true, activeFileId: newFiles[newFiles.length - 1].id });
    }
    
    return newText;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const isRental = persona === 'rentalAgent';
    let finalInput = input;
    
    // Inject Context for AI Ops
    if (isRental && input.trim()) {
      const fleetSummary = fleet.length > 0 ? `[Fleet: ${fleet.length} vehicles, ${fleet.filter(v => v.status === 'available').length} available]` : '';
      const resSummary = reservations.length > 0 ? `[Reservations: ${reservations.length} total, ${reservations.filter(r => r.status === 'pending').length} pending]` : '';
      const maintSummary = maintenance.length > 0 ? `[Maintenance: ${maintenance.length} active records]` : '';
      const pricingSummary = pricingRules.length > 0 ? `[Pricing: ${pricingRules.filter(r => r.isActive).length} active rules]` : '';
      const filterContext = `[Search Filters - Type: ${rentalFilters.carType}, Transmission: ${rentalFilters.transmission}, Max Price: $${rentalFilters.maxPrice}/day, Availability: ${rentalFilters.availability}]`;
      finalInput = `${filterContext}\n${fleetSummary}\n${resSummary}\n${maintSummary}\n${pricingSummary}\n\n${input}`;
    }

    const userMessage: Message = {
      role: 'user',
      content: finalInput,
      image: selectedImage || undefined
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await gemini.chat(newMessages, {
        useSearch,
        useMaps,
        highThinking,
        model: isLiteMode ? MODELS.LITE : MODELS.FLASH,
        persona,
        systemInstruction: SYSTEM_INSTRUCTION_BASE
      });

      let content = response.text || "I'm sorry, I couldn't generate a response.";
      content = parseCanvasContent(content);

      const modelMessage: Message = {
        role: 'model',
        content,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };

      setMessages(prev => [...prev, modelMessage]);

      if (isTtsEnabled && modelMessage.content) {
        const audioData = await gemini.textToSpeech(modelMessage.content);
        if (audioData) {
          const audio = new Audio(`data:audio/wav;base64,${audioData}`);
          audio.play();
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: "An error occurred while processing your request. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsLoading(true);
          try {
            const transcription = await gemini.transcribe(base64);
            if (transcription) setInput(transcription);
          } catch (error) {
            console.error('Transcription error:', error);
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Mic error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFile = files.find(f => f.id === canvas.activeFileId);

  const downloadFile = (file: ProjectFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.title;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateFileContent = (id: string, newContent: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, content: newContent } : f));
  };

  const exportProjectAsZip = async () => {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.title, file.content);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'open-claw-project.zip');
  };

  return (
    <div className={cn(
      "flex h-screen font-sans selection:bg-orange-500/30 overflow-hidden",
      theme === 'light' && "theme-light",
      theme === 'sepia' && "theme-sepia"
    )}>
      {/* Notifications */}
      <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={cn(
                "glass-card p-4 rounded-2xl w-80 pointer-events-auto flex gap-3",
                n.type === 'error' && "border-red-500/30",
                n.type === 'success' && "border-green-500/30",
                n.type === 'warning' && "border-orange-500/30"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                n.type === 'error' ? "bg-red-500/10 text-red-500" :
                n.type === 'success' ? "bg-green-500/10 text-green-500" :
                n.type === 'warning' ? "bg-orange-500/10 text-orange-500" :
                "bg-blue-500/10 text-blue-500"
              )}>
                {n.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
                 n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 n.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                 <Briefcase className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-widest">{n.title}</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{n.message}</p>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))} className="text-text-muted hover:text-text">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <aside className="w-72 border-r border-border flex flex-col bg-surface hidden lg:flex shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-semibold text-lg tracking-tight">Open Claw</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[#52525B] font-bold px-2">Navigation</p>
            <div className="grid grid-cols-1 gap-1">
              <NavButton active={viewMode === 'chat'} onClick={() => setViewMode('chat')} icon={<Bot className="w-4 h-4" />} label="AI Workstation" />
              <NavButton active={viewMode === 'fleet'} onClick={() => setViewMode('fleet')} icon={<Car className="w-4 h-4" />} label="Fleet Management" />
              <NavButton active={viewMode === 'reservations'} onClick={() => setViewMode('reservations')} icon={<Calendar className="w-4 h-4" />} label="Reservations" />
              <NavButton active={viewMode === 'crm'} onClick={() => setViewMode('crm')} icon={<Users className="w-4 h-4" />} label="Customer CRM" />
              <NavButton active={viewMode === 'ops'} onClick={() => setViewMode('ops')} icon={<ClipboardList className="w-4 h-4" />} label="Operations" />
              <NavButton active={viewMode === 'kpi'} onClick={() => setViewMode('kpi')} icon={<TrendingUp className="w-4 h-4" />} label="KPI Dashboard" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[#52525B] font-bold px-2">Logistics & AI</p>
            <div className="grid grid-cols-1 gap-1">
              <NavButton active={viewMode === 'maintenance'} onClick={() => setViewMode('maintenance')} icon={<Wrench className="w-4 h-4" />} label="Maintenance" />
              <NavButton active={viewMode === 'damage'} onClick={() => setViewMode('damage')} icon={<Sparkles className="w-4 h-4" />} label="AI Damage Assessment" />
              <NavButton active={viewMode === 'pricing'} onClick={() => setViewMode('pricing')} icon={<Zap className="w-4 h-4" />} label="Dynamic Pricing" />
              <NavButton active={viewMode === 'contracts'} onClick={() => setViewMode('contracts')} icon={<FileText className="w-4 h-4" />} label="Contracts" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[#52525B] font-bold px-2">Personas</p>
            <div className="grid grid-cols-1 gap-1">
              <PersonaButton 
                active={persona === 'general'} 
                onClick={() => setPersona('general')}
                icon={<Layout className="w-4 h-4" />}
                label="General"
              />
              <PersonaButton 
                active={persona === 'coder'} 
                onClick={() => setPersona('coder')}
                icon={<Code className="w-4 h-4" />}
                label="Developer"
              />
              <PersonaButton 
                active={persona === 'strategist'} 
                onClick={() => setPersona('strategist')}
                icon={<Brain className="w-4 h-4" />}
                label="Strategist"
              />
              <PersonaButton 
                active={persona === 'creative'} 
                onClick={() => setPersona('creative')}
                icon={<Palette className="w-4 h-4" />}
                label="Creative"
              />
              <PersonaButton 
                active={persona === 'analyst'} 
                onClick={() => setPersona('analyst')}
                icon={<LineChart className="w-4 h-4" />}
                label="Analyst"
              />
              <PersonaButton 
                active={persona === 'rentalAgent'} 
                onClick={() => setPersona('rentalAgent')}
                icon={<Car className="w-4 h-4" />}
                label="Rental Agent"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-[#52525B] font-bold px-2">Capabilities</p>
            <Toggle 
              active={highThinking} 
              onClick={() => {
                setHighThinking(!highThinking);
                if (!highThinking) setIsLiteMode(false);
              }}
              icon={<Brain className="w-4 h-4" />}
              label="High Thinking"
              description="Deep reasoning"
            />
            <Toggle 
              active={isLiteMode} 
              onClick={() => {
                setIsLiteMode(!isLiteMode);
                if (!isLiteMode) setHighThinking(false);
              }}
              icon={<Zap className="w-4 h-4" />}
              label="Lite Mode"
              description="Fast responses"
            />
            <Toggle 
              active={useSearch} 
              onClick={() => setUseSearch(!useSearch)}
              icon={<Search className="w-4 h-4" />}
              label="Google Search"
              description="Live web data"
            />
            <Toggle 
              active={useMaps} 
              onClick={() => setUseMaps(!useMaps)}
              icon={<MapPin className="w-4 h-4" />}
              label="Google Maps"
              description="Location data"
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Project Workspace</p>
            <button 
              onClick={() => { setFiles([]); setCanvas({ isOpen: false, activeFileId: null }); }}
              className="p-1 hover:bg-border rounded-md text-text-muted hover:text-red-500 transition-colors"
              title="New Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => setCanvas({ isOpen: true, activeFileId: file.id })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group",
                      canvas.activeFileId === file.id ? "bg-orange-500/10 text-orange-500" : "text-text-muted hover:bg-border hover:text-text"
                    )}
                  >
                    {file.type === 'code' && <Code className="w-4 h-4" />}
                    {file.type === 'document' && <FileText className="w-4 h-4" />}
                    {file.type === 'data' && <LineChart className="w-4 h-4" />}
                    <span className="truncate flex-1 text-left">{file.title}</span>
                  </button>
                ))}
              </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold px-2">Theme</p>
            <div className="flex gap-2 px-2">
              <button 
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex-1 h-8 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all",
                  theme === 'dark' ? "bg-orange-500 border-orange-500 text-white" : "border-border text-text-muted hover:bg-border"
                )}
              >
                Dark
              </button>
              <button 
                onClick={() => setTheme('light')}
                className={cn(
                  "flex-1 h-8 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all",
                  theme === 'light' ? "bg-orange-500 border-orange-500 text-white" : "border-border text-text-muted hover:bg-border"
                )}
              >
                Light
              </button>
              <button 
                onClick={() => setTheme('sepia')}
                className={cn(
                  "flex-1 h-8 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all",
                  theme === 'sepia' ? "bg-orange-500 border-orange-500 text-white" : "border-border text-text-muted hover:bg-border"
                )}
              >
                Sepia
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-2">
          {user ? (
            <div className="flex items-center gap-3 px-3 py-2 bg-bg rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
                {user.displayName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{user.displayName || 'User'}</p>
                <p className="text-[10px] text-text-muted truncate">{user.email}</p>
              </div>
              <button onClick={logout} className="p-1.5 hover:bg-border rounded-md text-text-muted hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
          )}
          <button 
            onClick={() => setMessages([])}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-border transition-colors text-sm text-text-muted"
          >
            <Trash2 className="w-4 h-4" />
            Clear Conversation
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0 bg-bg">
        {viewMode === 'chat' ? (
          <>
            {persona === 'rentalAgent' && (
              <div className="flex flex-wrap gap-4 p-4 bg-surface/50 border-b border-border items-center animate-in fade-in slide-in-from-top-2 duration-300">
            <FleetFilters filters={rentalFilters} setFilters={setRentalFilters} />
            
            <button 
              onClick={() => setRentalFilters({ carType: 'all', transmission: 'all', maxPrice: 200, availability: 'all' })}
              className="ml-auto text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-orange-500 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-bg/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                {persona.charAt(0).toUpperCase() + persona.slice(1)} Mode
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Encrypted Connection</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {files.length > 0 && !canvas.isOpen && (
              <button 
                onClick={() => setCanvas(prev => ({ ...prev, isOpen: true }))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 text-xs font-medium hover:bg-orange-500/20 transition-all"
              >
                <FileText className="w-4 h-4" />
                Project Files ({files.length})
              </button>
            )}
            <button 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2 hover:bg-border rounded-full transition-colors"
            >
              <Settings2 className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </header>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-12">
              <div className="space-y-6">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/20"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-6xl font-bold tracking-tighter bg-gradient-to-b from-text to-text-muted bg-clip-text text-transparent">
                    Open Claw AI
                  </h2>
                  <p className="text-text-muted text-xl font-medium">
                    The next generation of adaptive intelligence.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <QuickAction 
                  icon={<Car className="w-5 h-5 text-orange-500" />}
                  title="Find Rentals"
                  description="Search near your location"
                  onClick={() => {
                    setPersona('rentalAgent');
                    setUseMaps(true);
                    setInput("Find car rental locations near me and show available SUV models in a visual gallery.");
                  }}
                />
                <QuickAction 
                  icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                  title="AI Damage Check"
                  description="Scan vehicle for damage"
                  onClick={() => setViewMode('damage')}
                />
                <QuickAction 
                  icon={<Zap className="w-5 h-5 text-yellow-500" />}
                  title="Pricing Insights"
                  description="AI optimized rates"
                  onClick={() => setViewMode('pricing')}
                />
                <QuickAction 
                  icon={<Wrench className="w-5 h-5 text-blue-500" />}
                  title="Maintenance"
                  description="Fleet health status"
                  onClick={() => setViewMode('maintenance')}
                />
                <QuickAction 
                  icon={<FileText className="w-5 h-5 text-green-500" />}
                  title="Contracts"
                  description="Manage agreements"
                  onClick={() => setViewMode('contracts')}
                />
                <QuickAction 
                  icon={<Layout className="w-5 h-5 text-indigo-500" />}
                  title="Fleet Management"
                  description="Full inventory control"
                  onClick={() => setViewMode('fleet')}
                />
                <QuickAction 
                  icon={<TrendingUp className="w-5 h-5 text-red-500" />}
                  title="KPI Dashboard"
                  description="Real-time analytics"
                  onClick={() => setViewMode('kpi')}
                />
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 max-w-4xl mx-auto group",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-lg",
                  msg.role === 'user' ? "bg-surface border border-border" : "bg-gradient-to-br from-orange-500 to-red-600"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                
                <div className={cn(
                  "flex flex-col gap-3 max-w-[85%]",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  {msg.image && (
                    <div className="relative group/img">
                      <img 
                        src={msg.image} 
                        alt="Uploaded" 
                        className="rounded-2xl max-w-sm border border-border shadow-2xl transition-transform group-hover/img:scale-[1.02]"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className={cn(
                    "px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-xl",
                    msg.role === 'user' 
                      ? "bg-surface border border-border text-text rounded-tr-none" 
                      : "bg-surface border border-border text-text rounded-tl-none"
                  )}>
                    <div className="markdown-body prose prose-invert max-w-none">
                      <Markdown
                        components={{
                          code(props) {
                            const {children, className, ...rest} = props
                            const match = /language-(\w+)/.exec(className || '')
                            if (match && match[1] === 'ui') {
                              try {
                                const data = JSON.parse(String(children).replace(/\n$/, ''));
                                return <DynamicUI data={data} onSendMessage={(msg) => {
                                  const userMessage: Message = { role: 'user', content: msg };
                                  const newMessages = [...messages, userMessage];
                                  setMessages(newMessages);
                                  setIsLoading(true);
                                  gemini.chat(newMessages, { useSearch, useMaps, highThinking, persona }).then(res => {
                                    setMessages([...newMessages, { role: 'model', content: res.text, groundingMetadata: res.groundingMetadata }]);
                                  }).finally(() => setIsLoading(false));
                                }} />;
                              } catch {
                                return <pre className={className} {...rest}><code>{children}</code></pre>;
                              }
                            }
                            return <code {...rest} className={className}>{children}</code>
                          }
                        }}
                      >{msg.content}</Markdown>
                    </div>
                  </div>

                  {msg.groundingMetadata?.groundingChunks && Array.isArray(msg.groundingMetadata.groundingChunks) && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.groundingMetadata.groundingChunks.map((chunk: { web?: { uri: string; title: string }; maps?: { uri: string; title: string } }, ci: number) => (
                        <React.Fragment key={ci}>
                          {chunk.web && (
                            <a 
                              href={chunk.web.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-muted hover:text-text hover:border-orange-500/30 transition-all flex items-center gap-2"
                            >
                              <Search className="w-3 h-3" />
                              {chunk.web.title}
                            </a>
                          )}
                          {chunk.maps && (
                            <a 
                              href={chunk.maps.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 hover:bg-orange-500/20 transition-all flex items-center gap-2"
                            >
                              <MapPin className="w-3 h-3" />
                              {chunk.maps.title || "View on Maps"}
                            </a>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="bg-[#0D0D0D] border border-[#1C1C1C] px-5 py-4 rounded-2xl rounded-tl-none shadow-xl">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent">
          <div className="max-w-4xl mx-auto relative">
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full mb-4 left-0 p-2.5 bg-[#1C1C1C] rounded-2xl border border-[#27272A] flex items-center gap-3 group shadow-2xl"
              >
                <img src={selectedImage} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-[#27272A]" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Image Attached</span>
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                </div>
              </motion.div>
            )}

            <div className="relative flex items-end gap-2 bg-[#0D0D0D] border border-[#1C1C1C] rounded-[24px] p-2.5 focus-within:border-orange-500/50 transition-all shadow-2xl">
              <div className="flex items-center">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 hover:bg-border rounded-2xl text-text-muted hover:text-text transition-all active:scale-95"
                  title="Upload Image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
                
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all active:scale-95",
                    isRecording ? "bg-red-500 text-white animate-pulse" : "hover:bg-border text-text-muted hover:text-text"
                  )}
                  title="Voice Input"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Message Open Claw (${persona})...`}
                className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-3.5 resize-none max-h-64 min-h-[48px] placeholder-text-muted/50"
                rows={1}
              />

              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                aria-label="Send message"
                className={cn(
                  "p-3.5 rounded-2xl transition-all shadow-lg active:scale-95",
                  isLoading || (!input.trim() && !selectedImage)
                    ? "text-text-muted bg-border"
                    : "bg-text text-bg hover:opacity-90"
                )}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <p className="text-[10px] text-text-muted tracking-widest uppercase font-bold">
                Adaptive Intelligence v2.5
              </p>
              <div className="w-1 h-1 rounded-full bg-border" />
              <p className="text-[10px] text-text-muted tracking-widest uppercase font-bold">
                Secure Session
              </p>
            </div>
          </div>
        </div>
          </>
        ) : (
          <ModuleView 
            type={viewMode} 
            data={{ fleet, reservations, customers, tasks, maintenance, damageReports, pricingRules, contracts }} 
            filters={rentalFilters}
            setFilters={setRentalFilters}
            onClose={() => setViewMode('chat')} 
            analyzeDamage={analyzeDamage}
          />
        )}
      </main>

      {/* Canvas Panel */}
      <AnimatePresence>
        {canvas.isOpen && activeFile && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[650px] border-l border-border bg-surface flex flex-col shrink-0 z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]"
          >
            <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-border">
                  {activeFile.type === 'code' && <Code className="w-4 h-4 text-blue-400" />}
                  {activeFile.type === 'document' && <FileText className="w-4 h-4 text-orange-400" />}
                  {activeFile.type === 'data' && <LineChart className="w-4 h-4 text-green-400" />}
                </div>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-sm truncate max-w-[300px]">{activeFile.title}</h2>
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{activeFile.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadFile(activeFile)}
                  className="p-2 hover:bg-border rounded-lg text-text-muted hover:text-text transition-colors"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => copyToClipboard(activeFile.content)}
                  className="p-2 hover:bg-border rounded-lg text-text-muted hover:text-text transition-colors relative"
                  title="Copy Content"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setCanvas(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 hover:bg-border rounded-lg text-text-muted hover:text-text transition-colors"
                  title="Close Canvas"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 bg-bg">
              {!activeFile ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-surface p-12 rounded-[40px] border border-border shadow-2xl text-center">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Layout className="w-10 h-10 text-orange-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 tracking-tight">Project Dashboard</h2>
                    <p className="text-text-muted max-w-lg mx-auto mb-8">
                      Manage your generated assets, documents, and data visualizations in one place.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="p-6 bg-bg rounded-2xl border border-border">
                        <div className="text-2xl font-bold mb-1">{files.length}</div>
                        <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Total Files</div>
                      </div>
                      <div className="p-6 bg-bg rounded-2xl border border-border">
                        <div className="text-2xl font-bold mb-1">
                          {files.filter(f => f.type === 'code').length}
                        </div>
                        <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Code Files</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {files.map(file => (
                      <button
                        key={file.id}
                        onClick={() => setCanvas(prev => ({ ...prev, activeFileId: file.id }))}
                        className="p-6 bg-surface rounded-3xl border border-border hover:border-orange-500/50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 rounded-xl bg-bg group-hover:bg-orange-500/10 transition-colors">
                            {file.type === 'code' && <Code className="w-5 h-5 text-blue-400" />}
                            {file.type === 'document' && <FileText className="w-5 h-5 text-orange-400" />}
                            {file.type === 'data' && <LineChart className="w-5 h-5 text-green-400" />}
                            {file.type === 'gallery' && <Car className="w-5 h-5 text-purple-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">{file.title}</h4>
                            <p className="text-xs text-text-muted">{new Date(file.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm text-text-muted line-clamp-2 mb-4">
                          {file.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{file.type}</span>
                          <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {activeFile.type === 'document' && (
                <div className="max-w-3xl mx-auto bg-surface p-12 rounded-[32px] border border-border shadow-2xl">
                  <textarea
                    value={activeFile.content}
                    onChange={(e) => updateFileContent(activeFile.id, e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[500px] font-sans text-text leading-relaxed"
                  />
                </div>
              )}

              {activeFile.type === 'code' && (
                <div className="max-w-4xl mx-auto bg-[#0D0D0D] rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col h-full min-h-[600px]">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#1C1C1C] border-b border-border">
                    <span className="text-xs font-mono text-text-muted">{activeFile.title}</span>
                  </div>
                  <textarea
                    value={activeFile.content}
                    onChange={(e) => updateFileContent(activeFile.id, e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 p-6 font-mono text-sm text-blue-400 resize-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>
              )}

              {activeFile.type === 'data' && (
                <DataCanvas key={activeFile.id} activeFile={activeFile} updateFileContent={updateFileContent} />
              )}

              {activeFile.type === 'gallery' && (
                <div className="max-w-6xl mx-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {JSON.parse(activeFile.content).cars.map((car: { name: string; type: string; transmission: string; price: number; images: string[] }, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setSelectedCar(car)}
                        className="bg-surface rounded-3xl border border-border overflow-hidden hover:border-orange-500/50 transition-all cursor-pointer group"
                      >
                        <div className="aspect-[16/9] relative overflow-hidden bg-bg">
                          <img 
                            src={car.images[0]} 
                            alt={car.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                            ${car.price}/day
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-lg">{car.name}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md">
                              {car.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-text-muted">
                            <div className="flex items-center gap-1.5">
                              <Settings2 className="w-3.5 h-3.5" />
                              {car.transmission}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5" />
                              Available
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.aside>
        )}
      </AnimatePresence>

      {/* Car Detail Modal */}
      <AnimatePresence>
        {selectedCar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl bg-surface border border-border rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[80vh]"
            >
              <div className="flex-1 bg-bg relative overflow-hidden flex items-center justify-center">
                <button 
                  onClick={() => setSelectedCar(null)}
                  className="absolute top-6 left-6 z-10 p-3 bg-surface/50 backdrop-blur-md rounded-full border border-border hover:bg-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {selectedCar.view360 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Maximize2 className="w-10 h-10 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">360° Interactive View</h3>
                    <p className="text-text-muted mb-8">Experience the {selectedCar.name} from every angle.</p>
                    <img 
                      src={selectedCar.images[0]} 
                      alt={selectedCar.name}
                      className="max-w-md w-full rounded-2xl shadow-2xl mb-8"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex gap-4">
                      <button className="px-8 py-3 bg-orange-500 text-white rounded-full font-bold hover:bg-orange-600 transition-colors">
                        Enter VR Mode
                      </button>
                      <button className="px-8 py-3 bg-surface border border-border rounded-full font-bold hover:bg-bg transition-colors">
                        Rotate View
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 p-8 w-full h-full overflow-y-auto">
                    {selectedCar.images.map((img: string, i: number) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt={`${selectedCar.name} ${i}`}
                        className="w-full aspect-video object-cover rounded-2xl border border-border"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-96 p-12 border-l border-border flex flex-col">
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-2 block">Premium Rental</span>
                  <h3 className="text-3xl font-bold mb-2 tracking-tight">{selectedCar.name}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    Experience luxury and performance with our top-tier {selectedCar.type.toLowerCase()}. Perfect for business trips or weekend getaways.
                  </p>
                </div>

                <div className="space-y-6 mb-auto">
                  <div className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border">
                    <div className="text-xs text-text-muted font-bold uppercase tracking-widest">Daily Rate</div>
                    <div className="text-xl font-bold text-orange-500">${selectedCar.price}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-bg rounded-2xl border border-border text-center">
                      <Settings2 className="w-5 h-5 mx-auto mb-2 text-text-muted" />
                      <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Gearbox</div>
                      <div className="text-xs font-bold">{selectedCar.transmission}</div>
                    </div>
                    <div className="p-4 bg-bg rounded-2xl border border-border text-center">
                      <Zap className="w-5 h-5 mx-auto mb-2 text-text-muted" />
                      <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Fuel</div>
                      <div className="text-xs font-bold">Hybrid</div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 mt-8">
                  Book This Vehicle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-bg/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Search className="w-5 h-5 text-text-muted" />
                <input 
                  autoFocus
                  placeholder="Search commands, personas, files..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsCommandPaletteOpen(false);
                  }}
                />
              </div>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Actions</div>
                <CommandItem icon={<Trash2 />} label="Clear Conversation" onClick={() => { setMessages([]); setIsCommandPaletteOpen(false); }} />
                <CommandItem icon={<Download />} label="Export Project (ZIP)" onClick={() => { exportProjectAsZip(); setIsCommandPaletteOpen(false); }} />
                <CommandItem icon={<Layout />} label="Project Dashboard" onClick={() => { setCanvas({ isOpen: true, activeFileId: null }); setIsCommandPaletteOpen(false); }} />
                
                <div className="px-3 py-2 mt-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Personas</div>
                <CommandItem icon={<Layout />} label="Switch to General" onClick={() => { setPersona('general'); setIsCommandPaletteOpen(false); }} />
                <CommandItem icon={<Code />} label="Switch to Developer" onClick={() => { setPersona('coder'); setIsCommandPaletteOpen(false); }} />
                <CommandItem icon={<Brain />} label="Switch to Strategist" onClick={() => { setPersona('strategist'); setIsCommandPaletteOpen(false); }} />
                <CommandItem icon={<Car />} label="Switch to Rental Agent" onClick={() => { setPersona('rentalAgent'); setIsCommandPaletteOpen(false); }} />
              </div>
              <div className="p-3 bg-bg/50 border-t border-border flex items-center justify-between text-[10px] text-text-muted">
                <div className="flex gap-4">
                  <span><kbd className="bg-border px-1 rounded">↑↓</kbd> Navigate</span>
                  <span><kbd className="bg-border px-1 rounded">Enter</kbd> Select</span>
                </div>
                <span><kbd className="bg-border px-1 rounded">Esc</kbd> Close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommandItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-border transition-colors text-sm text-text-muted hover:text-text"
    >
      <div className="text-text-muted">{icon}</div>
      {label}
    </button>
  );
}

function PersonaButton({ active, onClick, icon, label }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium",
        active 
          ? "bg-orange-500/10 text-orange-500" 
          : "text-text-muted hover:bg-border hover:text-text"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-md transition-colors",
        active ? "bg-orange-500 text-white" : "bg-border"
      )}>
        {icon}
      </div>
      {label}
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />}
    </button>
  );
}

function Toggle({ active, onClick, icon, label, description }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
        active 
          ? "bg-orange-500/10 border-orange-500/30 text-text shadow-lg shadow-orange-500/5" 
          : "bg-transparent border-transparent hover:bg-border text-text-muted"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors",
        active ? "bg-orange-500 text-white" : "bg-border group-hover:bg-text-muted/20"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] opacity-60 truncate">{description}</p>
      </div>
      <div className={cn(
        "w-8 h-4 rounded-full relative transition-colors",
        active ? "bg-orange-500" : "bg-border"
      )}>
        <motion.div 
          animate={{ left: active ? 20 : 4 }}
          className="absolute top-1 w-2 h-2 rounded-full bg-white shadow-sm"
        />
      </div>
    </button>
  );
}

function ModuleView({ type, data, filters, setFilters, onClose, analyzeDamage }: { 
  type: ViewMode, 
  data: Record<string, unknown>, 
  filters?: Record<string, unknown>, 
  setFilters?: (f: Record<string, unknown>) => void, 
  onClose: () => void,
  analyzeDamage: (image: string) => Promise<Record<string, unknown>>
}) {
  const titles = {
    fleet: 'Fleet Management',
    reservations: 'Reservations',
    crm: 'Customer CRM',
    ops: 'Operations',
    kpi: 'KPI Dashboard',
    maintenance: 'Maintenance Logistics',
    damage: 'AI Damage Assessment',
    pricing: 'Dynamic Pricing',
    contracts: 'Contract Lifecycle',
    corporate: 'Corporate Portal',
    chat: 'Chat'
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-surface/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-border rounded-md text-text-muted">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h2 className="text-sm font-bold">{titles[type]}</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {type === 'fleet' && <FleetModule data={data.fleet} maintenance={data.maintenance} damageReports={data.damageReports} filters={filters} setFilters={setFilters} />}
        {type === 'reservations' && <ReservationsModule data={data.reservations} />}
        {type === 'crm' && <CRMModule data={data.customers} />}
        {type === 'ops' && <OpsModule data={data.tasks} />}
        {type === 'kpi' && <KPIModule />}
        {type === 'maintenance' && <MaintenanceModule />}
        {type === 'damage' && <DamageModule data={data.damageReports} analyzeDamage={analyzeDamage} />}
        {type === 'pricing' && <PricingModule data={data.pricingRules} />}
        {type === 'contracts' && <ContractModule data={data.contracts} />}
        {type === 'corporate' && <CorporateModule />}
      </div>
    </div>
  );
}

function FleetModule({ data, maintenance, damageReports, filters, setFilters }: { data: Record<string, unknown>[], maintenance: Record<string, unknown>[], damageReports: Record<string, unknown>[], filters?: Record<string, unknown>, setFilters?: (f: Record<string, unknown>) => void }) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const selectedVehicle = data.find(v => v.id === selectedVehicleId);
  const vehicleMaintenance = maintenance.filter(m => m.vehicleId === selectedVehicleId);
  const vehicleDamage = damageReports.filter(d => d.vehicleId === selectedVehicleId);

  const handleImageUpload = async (vehicleId: string, file: File) => {
    if (!file) return;
    setUploadingId(vehicleId);
    try {
      const storageRef = ref(storage, `vehicles/${vehicleId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const vehicle = data.find(v => v.id === vehicleId);
      const currentPhotos = vehicle?.photoUrls || [];
      
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        photoUrls: [...currentPhotos, downloadUrl]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicles/${vehicleId}`);
    } finally {
      setUploadingId(null);
    }
  };

  const filteredData = data.filter(v => {
    if (!filters) return true;
    if (filters.carType !== 'all' && v.type?.toLowerCase() !== filters.carType.toLowerCase()) return false;
    if (filters.transmission !== 'all' && v.transmission?.toLowerCase() !== filters.transmission.toLowerCase()) return false;
    if (v.dailyRate > filters.maxPrice) return false;
    if (filters.availability !== 'all') {
      if (filters.availability === 'available' && v.status !== 'available') return false;
      if (filters.availability === 'rented' && v.status !== 'rented') return false;
      if (filters.availability === 'maintenance' && v.status !== 'maintenance') return false;
      if (filters.availability === 'incident' && v.status !== 'incident') return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters UI */}
      {setFilters && filters && (
        <div className="p-4 bg-surface/50 rounded-xl border border-border flex flex-wrap gap-4 items-end">
          <FleetFilters filters={filters} setFilters={setFilters} />

          <button 
            onClick={() => setFilters({ carType: 'all', transmission: 'all', maxPrice: 200, availability: 'all' })}
            className="p-2 hover:bg-border rounded-lg text-text-muted hover:text-orange-500 transition-colors"
            title="Reset Filters"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Fleet" value={data.length} icon={<Car className="w-4 h-4" />} />
        <StatCard title="Available" value={data.filter(v => v.status === 'available').length} icon={<Check className="w-4 h-4" />} color="text-green-500" />
        <StatCard title="Maintenance" value={data.filter(v => v.status === 'maintenance').length} icon={<Wrench className="w-4 h-4" />} color="text-orange-500" />
      </div>

      <div className="bg-surface/50 rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-border/20 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Vehicle List {filters && <span className="text-orange-500 ml-2">(Filtered: {filteredData.length})</span>}</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Transmission</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Price/Day</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">No vehicles matching filters found.</td>
              </tr>
            ) : filteredData.map((v, i) => (
              <tr 
                key={i} 
                className="hover:bg-border/20 transition-colors cursor-pointer group"
                onClick={() => setSelectedVehicleId(v.id)}
              >
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-3">
                    {v.photoUrls && v.photoUrls.length > 0 ? (
                      <img 
                        src={v.photoUrls[0]} 
                        alt={v.make} 
                        className="w-10 h-10 rounded-lg object-cover border border-border"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-border flex items-center justify-center">
                        <Car className="w-5 h-5 text-text-muted" />
                      </div>
                    )}
                    <span>{v.make} {v.model}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted capitalize">{v.type}</td>
                <td className="px-4 py-3 text-text-muted capitalize">{v.transmission}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    v.status === 'available' ? "bg-green-500/10 text-green-500" : 
                    v.status === 'available soon' ? "bg-blue-500/10 text-blue-500" :
                    "bg-orange-500/10 text-orange-500"
                  )}>
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{v.branchId}</td>
                <td className="px-4 py-3 font-bold">${v.dailyRate}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <label 
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "p-1.5 hover:bg-border rounded-lg text-text-muted hover:text-text transition-colors cursor-pointer",
                        uploadingId === v.id && "animate-pulse pointer-events-none"
                      )}
                    >
                      {uploadingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(v.id, file);
                        }}
                      />
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vehicle Detail Modal */}
      <AnimatePresence>
        {selectedVehicleId && selectedVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-border/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Car className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedVehicle.make} {selectedVehicle.model}</h3>
                    <p className="text-xs text-text-muted uppercase tracking-widest font-bold">{selectedVehicle.plate} • {selectedVehicle.year}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVehicleId(null)}
                  className="p-2 hover:bg-border rounded-full text-text-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Info & Photos */}
                  <div className="space-y-6">
                    <div className="aspect-video rounded-2xl bg-border overflow-hidden relative group">
                      {selectedVehicle.photoUrls && selectedVehicle.photoUrls.length > 0 ? (
                        <img 
                          src={selectedVehicle.photoUrls[0]} 
                          alt={selectedVehicle.make} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Car className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-border/20 border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Status</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          selectedVehicle.status === 'available' ? "bg-green-500/10 text-green-500" : 
                          selectedVehicle.status === 'available soon' ? "bg-blue-500/10 text-blue-500" :
                          "bg-orange-500/10 text-orange-500"
                        )}>
                          {selectedVehicle.status}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-border/20 border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Daily Rate</p>
                        <p className="text-lg font-bold text-orange-500">${selectedVehicle.dailyRate}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-border/20 border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Type</p>
                        <p className="text-sm font-medium capitalize">{selectedVehicle.type}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-border/20 border border-border">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Transmission</p>
                        <p className="text-sm font-medium capitalize">{selectedVehicle.transmission}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Maintenance & Damage */}
                  <div className="space-y-6">
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                          <Wrench className="w-3 h-3" /> Maintenance History
                        </h4>
                        <span className="text-[10px] font-bold bg-border px-2 py-0.5 rounded-full">{vehicleMaintenance.length} Records</span>
                      </div>
                      <div className="space-y-3">
                        {vehicleMaintenance.length === 0 ? (
                          <p className="text-xs text-text-muted italic p-4 border border-dashed border-border rounded-xl text-center">No maintenance records found.</p>
                        ) : vehicleMaintenance.map((m, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-border/10 border border-border flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium capitalize">{m.type}</p>
                              <p className="text-[10px] text-text-muted">{new Date(m.date).toLocaleDateString()}</p>
                            </div>
                            <p className="text-sm font-bold text-text-muted">${m.cost}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                          <AlertCircle className="w-3 h-3" /> Damage Reports
                        </h4>
                        <span className="text-[10px] font-bold bg-border px-2 py-0.5 rounded-full">{vehicleDamage.length} Reports</span>
                      </div>
                      <div className="space-y-3">
                        {vehicleDamage.length === 0 ? (
                          <p className="text-xs text-text-muted italic p-4 border border-dashed border-border rounded-xl text-center">No damage reports found.</p>
                        ) : vehicleDamage.map((d, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium capitalize">{d.severity} Severity</p>
                              <p className="text-[10px] text-text-muted">{new Date(d.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              d.severity === 'high' || d.severity === 'critical' ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"
                            )}>
                              {d.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReservationsModule({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={data.length} icon={<Calendar className="w-4 h-4" />} />
        <StatCard title="Active" value={data.filter(r => r.status === 'active').length} icon={<Clock className="w-4 h-4" />} color="text-blue-500" />
        <StatCard title="Pending" value={data.filter(r => r.status === 'pending').length} icon={<AlertCircle className="w-4 h-4" />} color="text-orange-500" />
        <StatCard title="Completed" value={data.filter(r => r.status === 'completed').length} icon={<Check className="w-4 h-4" />} color="text-green-500" />
      </div>

      <div className="bg-surface/50 rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">No reservations found.</td>
              </tr>
            ) : data.map((r, i) => (
              <tr key={i} className="hover:bg-border/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-text-muted">#{r.id?.slice(0, 6)}</td>
                <td className="px-4 py-3 font-medium">{r.customerName}</td>
                <td className="px-4 py-3 text-text-muted">{r.vehicleName}</td>
                <td className="px-4 py-3 text-xs">
                  {r.pickupDate} - {r.dropoffDate}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    r.status === 'active' ? "bg-blue-500/10 text-blue-500" : 
                    r.status === 'pending' ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500"
                  )}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold">${r.totalPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CRMModule({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="Total Customers" value={data.length} icon={<Users className="w-4 h-4" />} />
        <StatCard title="Loyalty Members" value={data.filter(c => c.loyaltyTier !== 'none').length} icon={<ShieldCheck className="w-4 h-4" />} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.length === 0 ? (
          <div className="col-span-full py-12 text-center text-text-muted bg-surface/50 rounded-xl border border-border">
            No customers found in CRM.
          </div>
        ) : data.map((c, i) => (
          <div key={i} className="p-4 bg-surface/50 rounded-xl border border-border space-y-3 hover:border-orange-500/50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                {c.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-sm">{c.name}</h3>
                <p className="text-xs text-text-muted">{c.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Tier</span>
              <span className={cn(
                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                c.loyaltyTier === 'gold' ? "bg-yellow-500/10 text-yellow-500" :
                c.loyaltyTier === 'silver' ? "bg-slate-400/10 text-slate-400" : "bg-border text-text-muted"
              )}>
                {c.loyaltyTier}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpsModule({ data }: { data: Record<string, unknown>[] }) {
  const [selectedTask, setSelectedTask] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklist, setChecklist] = useState({
    tirePressure: 'Normal',
    fluidLevels: 'Full',
    interiorCleanliness: 'Clean',
    existingDamage: 'None'
  });

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { priority: newPriority });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }
  };

  const handleSubmitInspection = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const inspectionData = {
        taskId: selectedTask.id,
        vehicleId: selectedTask.relatedId || 'unknown',
        inspectorId: auth.currentUser?.uid || 'unknown',
        type: selectedTask.title.toLowerCase().includes('return') ? 'post-rental' : 'pre-rental',
        tirePressure: checklist.tirePressure,
        fluidLevels: checklist.fluidLevels,
        interiorCleanliness: checklist.interiorCleanliness,
        existingDamage: checklist.existingDamage,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'inspections'), inspectionData);
      await updateDoc(doc(db, 'tasks', selectedTask.id), { status: 'completed' });
      
      setSelectedTask(null);
      setChecklist({
        tirePressure: 'Normal',
        fluidLevels: 'Full',
        interiorCleanliness: 'Clean',
        existingDamage: 'None'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inspections');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Tasks" value={data.filter(t => t.status === 'pending').length} icon={<ClipboardList className="w-4 h-4" />} />
        <StatCard title="Urgent" value={data.filter(t => t.priority === 'high').length} icon={<AlertCircle className="w-4 h-4" />} color="text-red-500" />
        <StatCard title="Completed" value={data.filter(t => t.status === 'completed').length} icon={<Check className="w-4 h-4" />} color="text-green-500" />
      </div>

      {selectedTask ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-surface/50 rounded-2xl border border-orange-500/30 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Vehicle Inspection Checklist</h3>
                <p className="text-xs text-text-muted">Task: {selectedTask.title}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedTask(null)}
              className="p-2 hover:bg-border rounded-md text-text-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Tire Pressure</label>
              <select 
                value={checklist.tirePressure}
                onChange={(e) => setChecklist({...checklist, tirePressure: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option>Normal</option>
                <option>Low - Needs Air</option>
                <option>Critical - Needs Repair</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Fluid Levels</label>
              <select 
                value={checklist.fluidLevels}
                onChange={(e) => setChecklist({...checklist, fluidLevels: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option>Full</option>
                <option>Low - Needs Top-up</option>
                <option>Empty - Needs Refill</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Interior Cleanliness</label>
              <select 
                value={checklist.interiorCleanliness}
                onChange={(e) => setChecklist({...checklist, interiorCleanliness: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option>Clean</option>
                <option>Minor Cleaning Needed</option>
                <option>Deep Clean Required</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Existing Damage</label>
              <textarea 
                value={checklist.existingDamage}
                onChange={(e) => setChecklist({...checklist, existingDamage: e.target.value})}
                placeholder="Describe any scratches, dents, or issues..."
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50 min-h-[80px]"
              />
            </div>
          </div>

          <button 
            onClick={handleSubmitInspection}
            disabled={isSubmitting}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit Inspection & Complete Task
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {data.length === 0 ? (
            <div className="py-12 text-center text-text-muted bg-surface/50 rounded-xl border border-border">
              No operational tasks assigned.
            </div>
          ) : data.map((t, i) => (
            <div 
              key={i} 
              onClick={() => t.status !== 'completed' && setSelectedTask(t)}
              className={cn(
                "p-4 bg-surface/50 rounded-xl border border-border flex items-center justify-between hover:bg-border/50 transition-all cursor-pointer",
                t.status === 'completed' && "opacity-60 cursor-default"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  t.priority === 'high' ? "bg-red-500/10 text-red-500" : 
                  t.priority === 'medium' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{t.title}</h3>
                  <p className="text-xs text-text-muted">{t.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-text-muted">Priority</p>
                  <select
                    value={t.priority as string || 'medium'}
                    onChange={(e) => handlePriorityChange(t.id as string, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={t.status === 'completed'}
                    className={cn(
                      "bg-transparent text-xs font-bold focus:outline-none cursor-pointer appearance-none text-right",
                      t.priority === 'high' ? "text-red-500" :
                      t.priority === 'medium' ? "text-orange-500" : "text-blue-500",
                      t.status === 'completed' && "opacity-60 cursor-default"
                    )}
                  >
                    <option value="high" className="text-text bg-bg">High</option>
                    <option value="medium" className="text-text bg-bg">Medium</option>
                    <option value="low" className="text-text bg-bg">Low</option>
                  </select>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-text-muted">Due Date</p>
                  <p className="text-xs">{t.dueDate as string}</p>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  t.status === 'completed' ? "bg-green-500" : "bg-orange-500"
                )} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KPIModule() {
  const chartData = [
    { name: 'Mon', utilization: 65, revenue: 4200, conversion: 12, cancellation: 2, downtime: 4.5 },
    { name: 'Tue', utilization: 72, revenue: 4800, conversion: 15, cancellation: 1, downtime: 4.2 },
    { name: 'Wed', utilization: 68, revenue: 4500, conversion: 14, cancellation: 3, downtime: 4.8 },
    { name: 'Thu', utilization: 85, revenue: 5900, conversion: 18, cancellation: 2, downtime: 4.0 },
    { name: 'Fri', utilization: 92, revenue: 7200, conversion: 22, cancellation: 1, downtime: 3.8 },
    { name: 'Sat', utilization: 95, revenue: 8100, conversion: 25, cancellation: 4, downtime: 3.5 },
    { name: 'Sun', utilization: 88, revenue: 6800, conversion: 20, cancellation: 2, downtime: 4.1 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Avg Utilization" value="78%" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard title="Avg Booking Value" value="$342" icon={<Briefcase className="w-4 h-4" />} />
        <StatCard title="Fleet Downtime" value="4.2%" icon={<Clock className="w-4 h-4" />} color="text-red-500" />
        <StatCard title="Conversion Rate" value="18.4%" icon={<Zap className="w-4 h-4" />} color="text-yellow-500" />
        <StatCard title="Cancellation Rate" value="2.1%" icon={<AlertCircle className="w-4 h-4" />} color="text-red-400" />
        <StatCard title="Weekly Revenue" value="$41.5k" icon={<TrendingUp className="w-4 h-4" />} color="text-green-500" />
        <StatCard title="New Customers" value="124" icon={<Users className="w-4 h-4" />} color="text-blue-500" />
        <StatCard title="Active Rentals" value="48" icon={<Car className="w-4 h-4" />} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Fleet Performance (%)</h3>
            <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> Utilization</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Downtime</div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="utilization" stroke="#f97316" fillOpacity={1} fill="url(#colorUtil)" />
                <Area type="monotone" dataKey="downtime" stroke="#ef4444" fillOpacity={1} fill="url(#colorDown)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Revenue & Conversion Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis yAxisId="left" stroke="#71717a" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  cursor={{ fill: '#27272a' }}
                />
                <Bar yAxisId="left" dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="conversion" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Cancellation Rate (%)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="cancellation" stroke="#f87171" strokeWidth={2} dot={{ fill: '#f87171' }} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Booking Funnel</h3>
          <div className="space-y-6 pt-4">
            <FunnelItem label="Website Visits" value="12,450" percentage={100} color="bg-blue-500" />
            <FunnelItem label="Vehicle Views" value="8,230" percentage={66} color="bg-indigo-500" />
            <FunnelItem label="Booking Initiated" value="2,140" percentage={17} color="bg-purple-500" />
            <FunnelItem label="Completed Bookings" value="1,840" percentage={14} color="bg-orange-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FunnelItem({ label, value, percentage, color }: { label: string, value: string, percentage: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-widest text-text-muted">{label}</span>
        <span className="font-mono">{value} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = "text-orange-500" }: { title: string, value: string | number, icon: React.ReactNode, color?: string }) {
  return (
    <div className="p-4 bg-surface/50 rounded-xl border border-border flex items-center gap-4">
      <div className={cn("p-2 rounded-lg bg-border/50", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function MaintenanceModule() {
  const data: Record<string, unknown>[] = [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Maintenance" value={data.length} icon={<Wrench className="w-4 h-4" />} />
        <StatCard title="Avg Cost" value="$245" icon={<TrendingUp className="w-4 h-4" />} color="text-red-500" />
        <StatCard title="Next 7 Days" value="4" icon={<Clock className="w-4 h-4" />} color="text-blue-500" />
      </div>

      <div className="bg-surface/50 rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">Vehicle ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No maintenance records found.</td>
              </tr>
            ) : data.map((r, i) => (
              <tr key={i} className="hover:bg-border/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{r.vehicleId}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full bg-border text-[10px] font-bold uppercase">
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{r.description}</td>
                <td className="px-4 py-3 font-bold">${r.cost}</td>
                <td className="px-4 py-3 text-text-muted">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DamageModule({ data, analyzeDamage }: { data: Record<string, unknown>[], analyzeDamage: (image: string) => Promise<Record<string, unknown>> }) {
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<Record<string, unknown> | null>(null);

  const handleAIAnalyze = async (image: string) => {
    setIsAssessing(true);
    try {
      const result = await analyzeDamage(image);
      setAssessmentResult(result);
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">New AI Assessment</h3>
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-bg/50 hover:border-orange-500/50 transition-all group cursor-pointer relative overflow-hidden">
          <input 
            type="file" 
            accept="image/*" 
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => handleAIAnalyze(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-border group-hover:bg-orange-500 group-hover:text-white transition-all">
              {isAssessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-8 h-8" />}
            </div>
            <p className="text-sm font-bold">Upload Vehicle Photo for AI Assessment</p>
            <p className="text-xs text-text-muted">Gemini Vision will analyze damage and estimate costs</p>
          </div>
        </div>

        {assessmentResult && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-surface/50 border border-orange-500/30 rounded-2xl space-y-4 shadow-xl shadow-orange-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-500">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">AI Assessment Result</span>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                assessmentResult.severity === 'critical' ? "bg-red-500/20 text-red-500" :
                assessmentResult.severity === 'high' ? "bg-orange-500/20 text-orange-500" :
                "bg-blue-500/20 text-blue-500"
              )}>
                {assessmentResult.severity} Severity
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Estimated Repair Cost</p>
                <p className="text-2xl font-bold text-red-500">${assessmentResult.estimatedRepairCost}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">AI Summary</p>
                <p className="text-sm italic text-text-muted">"{assessmentResult.aiAssessment}"</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Detailed Description</p>
              <p className="text-sm leading-relaxed text-text-muted">{assessmentResult.description}</p>
            </div>

            <button 
              onClick={() => setAssessmentResult(null)}
              className="w-full py-2 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text transition-colors"
            >
              Clear Assessment
            </button>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Recent Damage Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((r, i) => (
            <div key={i} className="p-4 bg-surface/50 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  r.severity === 'critical' ? "bg-red-500/10 text-red-500" :
                  r.severity === 'high' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {r.severity} Severity
                </span>
                <span className="text-[10px] text-text-muted">{r.createdAt}</span>
              </div>
              <p className="text-sm font-medium">{r.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-text-muted">Est. Cost:</span>
                <span className="text-sm font-bold text-red-500">${r.estimatedRepairCost}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PricingModule({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Active Multipliers</h3>
          <div className="space-y-4">
            {data.filter(r => r.isActive).map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bg/50 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{r.name}</p>
                    <p className="text-[10px] text-text-muted uppercase">{r.vehicleType || 'All Vehicles'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-500">x{r.multiplier}</p>
                  <p className="text-[10px] text-text-muted">Active</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Market Insights</h3>
          <div className="space-y-3">
            <div className="p-3 bg-bg/50 rounded-xl border border-border flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xs">Demand is up 15% due to local concert event.</p>
            </div>
            <div className="p-3 bg-bg/50 rounded-xl border border-border flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <p className="text-xs">Competitor rates for SUVs increased by 8%.</p>
            </div>
            <button className="w-full py-2 bg-text text-bg rounded-lg text-xs font-bold hover:opacity-90 transition-all">
              Apply AI Optimized Rates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractModule({ data }: { data: Record<string, unknown>[] }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredData = data.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Filter Status:</label>
            <div className="flex gap-1">
              {['all', 'draft', 'signed', 'expired', 'terminated'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                    statusFilter === status 
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                      : "bg-surface border border-border text-text-muted hover:border-orange-500/50"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Showing {filteredData.length} of {data.length}
        </div>
      </div>

      <div className="bg-surface/50 rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-border/50 text-text-muted uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-4 py-3">Contract ID</th>
              <th className="px-4 py-3">Reservation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Signed At</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No {statusFilter !== 'all' ? statusFilter : ''} contracts found.</td>
              </tr>
            ) : filteredData.map((c, i) => (
              <tr key={i} className="hover:bg-border/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{c.id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-text-muted">#{c.reservationId?.slice(0, 6)}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    c.status === 'signed' ? "bg-green-500/10 text-green-500" : 
                    c.status === 'expired' ? "bg-red-500/10 text-red-500" :
                    c.status === 'terminated' ? "bg-red-500/20 text-red-600" :
                    "bg-border text-text-muted"
                  )}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{c.signedAt || 'N/A'}</td>
                <td className="px-4 py-3">
                  <button className="p-1.5 hover:bg-border rounded-md text-text-muted hover:text-text transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CorporateModule() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Corporate Accounts</h3>
          <div className="space-y-3">
            <div className="p-3 bg-bg/50 rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">T</div>
                <div>
                  <p className="text-sm font-bold">TechCorp Solutions</p>
                  <p className="text-[10px] text-text-muted uppercase">12 Active Rentals</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
            <div className="p-3 bg-bg/50 rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center font-bold">G</div>
                <div>
                  <p className="text-sm font-bold">Global Logistics Inc.</p>
                  <p className="text-[10px] text-text-muted uppercase">5 Active Rentals</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface/50 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">B2B Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Total Corporate Revenue</span>
              <span className="text-sm font-bold">$12,450</span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[65%]" />
            </div>
            <p className="text-[10px] text-text-muted">Corporate rentals account for 65% of total revenue this month.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


function QuickAction({ icon, title, description, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-start p-6 rounded-[24px] bg-surface border border-border hover:border-orange-500/30 hover:bg-bg transition-all text-left group shadow-xl"
    >
      <div className="p-3 rounded-2xl bg-border mb-4 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-base font-bold mb-1.5 group-hover:text-text transition-colors">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed group-hover:text-text transition-colors">{description}</p>
    </button>
  );
}
