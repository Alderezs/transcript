/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  Square, 
  Trash2, 
  Download, 
  FileText, 
  Sun,
  Moon, 
  History,
  Copy,
  Check,
  Languages,
  Plus,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useSpeechToText } from '@/src/hooks/useSpeechToText';
import { exportToDocx } from '@/src/lib/export';

interface DocumentItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  size: string;
  duration: number;
  lang: string;
}

export default function App() {
  const { 
    transcript, 
    interimTranscript, 
    isRecording, 
    start, 
    stop, 
    clear: clearSpeech, 
    error,
    lang,
    setLang,
    setTranscript
  } = useSpeechToText();

  // Dynamic state-managed list of documents
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('transcribe_docs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved docs:', e);
      }
    }
    return [
      {
        id: '1',
        title: 'Notulensi Rapat Produk',
        content: 'Selamat pagi semua. Hari ini kita akan membahas perkembangan pengembangan fitur transkripsi suara secara realtime. Kita perlu memastikan performa transkripsi tetap responsif, terutama untuk bahasa Indonesia dan Inggris. Tim desain juga menyarankan agar antarmuka memiliki tema gelap yang elegan dan kontras.',
        createdAt: '12 Menit Lalu',
        size: '1.2 KB',
        duration: 45,
        lang: 'id-ID'
      },
      {
        id: '2',
        title: 'Wawancara User Research',
        content: 'Hasil wawancara dengan beberapa pengguna menunjukkan bahwa mereka sangat membutuhkan fitur untuk beralih bahasa dengan cepat selama proses perekaman. Mereka juga menginginkan ekspor dokumen ke format .docx agar mudah dibagikan kepada tim.',
        createdAt: 'Kemarin',
        size: '2.4 KB',
        duration: 120,
        lang: 'id-ID'
      },
      {
        id: '3',
        title: 'Briefing Kreatif April',
        content: 'Tujuan kampanye bulan April ini adalah menonjolkan kemudahan penggunaan aplikasi TranscribePro. Kita akan fokus pada visualisasi audio realtime yang dinamis serta akurasi tinggi yang didukung oleh teknologi pengenalan suara canggih.',
        createdAt: '3 Hari Lalu',
        size: '850 B',
        duration: 35,
        lang: 'id-ID'
      }
    ];
  });

  const [selectedDocId, setSelectedDocId] = useState<string>('1');
  const [editableText, setEditableText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isIframe, setIsIframe] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('transcribe_theme') as 'dark' | 'light') || 'dark';
  });

  const selectedDoc = documents.find(doc => doc.id === selectedDocId) || documents[0];

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Sync theme to document element class and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('transcribe_theme', theme);
  }, [theme]);

  // Sync documents to localStorage
  useEffect(() => {
    localStorage.setItem('transcribe_docs', JSON.stringify(documents));
  }, [documents]);

  // Load selected document content and set hook's transcript state
  useEffect(() => {
    if (selectedDoc) {
      setEditableText(selectedDoc.content);
      setTranscript(selectedDoc.content);
      if (selectedDoc.lang) {
        setLang(selectedDoc.lang);
      }
      setSeconds(selectedDoc.duration || 0);
    }
  }, [selectedDocId]);

  // Timer logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // Save the duration updates to the current active document in state
  useEffect(() => {
    if (isRecording && !isPaused && selectedDocId) {
      setDocuments(prev => prev.map(doc => {
        if (doc.id === selectedDocId) {
          return { ...doc, duration: seconds };
        }
        return doc;
      }));
    }
  }, [seconds, isRecording, isPaused, selectedDocId]);

  // Auto-generate title from first words of a new recording when recording finishes
  const wasRecordingRef = useRef(false);
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      if (selectedDoc && selectedDoc.title.startsWith('Rekaman Baru') && editableText.trim()) {
        const words = editableText.trim().split(/\s+/);
        const autoTitle = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
        setDocuments(prev => prev.map(doc => {
          if (doc.id === selectedDocId) {
            return { ...doc, title: autoTitle };
          }
          return doc;
        }));
        toast.success(`Judul dokumen diperbarui otomatis: "${autoTitle}"`);
      }
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording, selectedDocId, editableText, selectedDoc]);

  // Sync document content whenever user types or transcript changes
  useEffect(() => {
    if (selectedDocId) {
      setDocuments(prev => prev.map(doc => {
        if (doc.id === selectedDocId) {
          if (doc.content === editableText) return doc;
          const sizeInBytes = new Blob([editableText]).size;
          const sizeStr = sizeInBytes > 1024 
            ? `${(sizeInBytes / 1024).toFixed(1)} KB` 
            : `${sizeInBytes} B`;
          return {
            ...doc,
            content: editableText,
            size: sizeStr
          };
        }
        return doc;
      }));
    }
  }, [editableText, selectedDocId]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync transcript to editable text when it updates
  useEffect(() => {
    if (transcript) {
      console.log('Syncing transcript to editableText:', transcript);
      setEditableText(transcript);
    }
  }, [transcript]);

  const displayedText = isRecording 
    ? (editableText + (interimTranscript ? (editableText ? ' ' : '') + interimTranscript : ''))
    : editableText;

  // Handle creating a brand-new blank document
  const handleNewDocument = () => {
    stop();
    clearSpeech();
    
    const newId = Date.now().toString();
    const newDoc: DocumentItem = {
      id: newId,
      title: `Rekaman Baru #${documents.length + 1}`,
      content: '',
      createdAt: 'Baru Saja',
      size: '0 B',
      duration: 0,
      lang: lang
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    setSelectedDocId(newId);
    setEditableText('');
    setSeconds(0);
    setIsPaused(false);
    toast.success('Dokumen baru dibuat. Mulai berbicara untuk transkripsi!');
  };

  // Handle clearing current session
  const handleClear = () => {
    stop();
    clearSpeech();
    setEditableText('');
    setSeconds(0);
    setIsPaused(false);
    toast.info('Teks pada dokumen saat ini dibersihkan');
  };

  const toggleRecording = () => {
    try {
      if (isRecording) {
        stop();
        setIsPaused(false);
        toast.info('Perekaman dihentikan');
      } else {
        // Appends to existing text by feeding it back to start()
        start(editableText);
        setIsPaused(false);
        toast.success('Mulai mendengarkan...');
      }
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Gagal mengubah status perekaman');
    }
  };

  const handleLanguageChange = (newLang: string) => {
    if (newLang === lang) return;
    
    setLang(newLang);
    const langLabel = newLang === 'id-ID' ? 'Bahasa Indonesia' : 'English';
    toast.success(`Bahasa transkripsi diubah ke: ${langLabel}`);
    
    // If recording, seamlessly restart the speech recognition session to apply the new language immediately
    if (isRecording) {
      stop();
      setTimeout(() => {
        start(editableText);
        toast.info(`Perekaman dilanjutkan dalam ${langLabel}`);
      }, 400);
    }
  };

  const togglePause = () => {
    if (isRecording) {
      stop();
      setIsPaused(true);
      toast.info('Perekaman dijeda');
    } else if (isPaused) {
      start(editableText);
      setIsPaused(false);
      toast.info('Perekaman dilanjutkan');
    }
  };

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    const textarea = document.querySelector('textarea');
    if (textarea && isRecording) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  }, [displayedText, isRecording]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    setIsCopied(true);
    toast.success('Disalin ke papan klip');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!editableText) {
      toast.error('Tidak ada teks untuk diekspor');
      return;
    }
    try {
      await exportToDocx(editableText, selectedDoc ? selectedDoc.title : 'Transkripsi Suara');
      toast.success('Dokumen berhasil diunduh');
    } catch (err) {
      toast.error('Gagal mengekspor dokumen');
    }
  };

  const handleStartRename = () => {
    if (selectedDoc) {
      setTitleInput(selectedDoc.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveRename = () => {
    if (titleInput.trim() && selectedDocId) {
      setDocuments(prev => prev.map(doc => {
        if (doc.id === selectedDocId) {
          return { ...doc, title: titleInput.trim() };
        }
        return doc;
      }));
      setIsEditingTitle(false);
      toast.success('Nama dokumen diperbarui');
    }
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-[#ededed] font-sans flex flex-col overflow-hidden transition-colors duration-200">
      <Toaster position="top-center" expand={true} richColors />
      
      {/* Header Navigation */}
      <nav className="h-16 border-b border-zinc-200 dark:border-[#262626] px-8 flex items-center justify-between bg-white dark:bg-[#0d0d0d] shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center transition-colors">
            <div className="w-4 h-4 bg-white dark:bg-black rounded-sm flex items-center justify-center transition-colors">
              <Mic className="w-3 h-3 text-black dark:text-white" />
            </div>
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-white">TranscribePro</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-[#171717] border border-zinc-200 dark:border-[#262626] rounded-md text-[10px] transition-colors">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-zinc-600 dark:text-zinc-400 font-medium uppercase tracking-wider">
              {isRecording ? 'Recording Live' : 'System Ready'}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full border border-zinc-200 dark:border-[#262626] bg-zinc-100 dark:bg-gradient-to-br dark:from-zinc-700 dark:to-zinc-800 p-0 overflow-hidden"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
             <div className="w-full h-full hover:bg-zinc-200 dark:hover:bg-transparent dark:bg-black/20 transition-colors flex items-center justify-center">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600" />
                )}
             </div>
          </Button>
        </div>
      </nav>

      {/* Iframe Warning Banner */}
      {isIframe && (
        <div className="bg-[#1e1609] border-b border-[#3b2e16] px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#f59e0b] shrink-0">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-medium">
              Mode Pratinjau Terdeteksi: Beberapa browser (seperti Google Chrome) memblokir pengenalan suara di dalam panel pratinjau (iframe).
            </span>
          </div>
          <a 
            href={window.location.href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold rounded-md transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka di Tab Baru
          </a>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Recent Transcriptions */}
        <aside className="w-72 border-r border-zinc-200 dark:border-[#262626] bg-zinc-50 dark:bg-[#0d0d0d] hidden lg:flex flex-col transition-colors duration-200">
          <div className="p-6 h-full flex flex-col">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em] mb-4">Daftar Dokumen</h3>
            <Button 
              onClick={handleNewDocument}
              className="w-full flex items-center justify-start gap-3 px-4 py-6 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.1)]"
            >
              <Plus className="w-4 h-4" />
              Rekaman Baru
            </Button>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-2">
                {documents.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  const wordCount = doc.content.trim() ? doc.content.trim().split(/\s+/).length : 0;
                  return (
                    <div 
                      key={doc.id}
                      onClick={() => {
                        if (isRecording) {
                          toast.error('Harap stop perekaman sebelum beralih dokumen');
                          return;
                        }
                        setSelectedDocId(doc.id);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${
                        isSelected 
                          ? 'bg-zinc-200/50 dark:bg-[#171717] border-zinc-300 dark:border-[#262626]' 
                          : 'hover:bg-zinc-100 dark:hover:bg-[#111] border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                          {doc.title}
                        </p>
                        {documents.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRecording && isSelected) {
                                toast.error('Harap stop perekaman sebelum menghapus');
                                return;
                              }
                              setDocuments(prev => prev.filter(d => d.id !== doc.id));
                              if (isSelected) {
                                const remaining = documents.filter(d => d.id !== doc.id);
                                if (remaining.length > 0) {
                                  setSelectedDocId(remaining[0].id);
                                }
                              }
                              toast.info('Dokumen dihapus');
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-opacity text-zinc-500"
                            title="Hapus Dokumen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider flex items-center justify-between">
                        <span>{doc.createdAt}</span>
                        <span>•</span>
                        <span>{wordCount} Kata</span>
                        {doc.duration > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatTime(doc.duration)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* Transcription Editor Area */}
        <section className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative overflow-hidden transition-colors duration-200">
          <div className="flex-1 px-6 py-10 md:px-10 flex flex-col items-center">
            <div className="max-w-3xl w-full flex flex-col h-full">
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-zinc-200 dark:border-[#262626]">
                <div className="flex-1 min-w-0">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename();
                          if (e.key === 'Escape') setIsEditingTitle(false);
                        }}
                        autoFocus
                        className="bg-zinc-100 dark:bg-[#171717] border border-zinc-300 dark:border-[#333] text-zinc-900 dark:text-zinc-100 font-serif text-3xl font-light italic px-2 py-0.5 rounded focus:outline-none focus:border-zinc-500 max-w-full"
                      />
                      <Button size="sm" onClick={handleSaveRename} className="bg-emerald-600 hover:bg-emerald-700 text-white py-1 h-8">
                        Simpan
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group max-w-full">
                      <h1 
                        onClick={handleStartRename}
                        className="font-serif text-4xl font-light italic mb-1 text-zinc-800 dark:text-zinc-100 cursor-pointer hover:text-zinc-950 dark:hover:text-white truncate"
                        title="Klik untuk mengubah nama"
                      >
                        {selectedDoc ? selectedDoc.title : 'Notulensi Rapat Produk'}
                      </h1>
                      <button 
                        onClick={handleStartRename}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity p-1"
                        title="Ubah Nama"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Sesi Transkripsi • {new Date().toLocaleDateString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopy}
                    className="px-4 py-2 bg-zinc-100 dark:bg-[#171717] border border-zinc-200 dark:border-[#262626] text-zinc-700 dark:text-zinc-300 rounded-md text-xs font-medium hover:bg-zinc-200 dark:hover:bg-[#222] hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
                  >
                    {isCopied ? 'Tersalin' : 'Salin Teks'}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleExport}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 border-none"
                  >
                    Simpan ke DOC
                  </Button>
                </div>
              </div>

              {/* Editor Tabs */}
              <Tabs defaultValue="editor" className="flex-1 flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <TabsList className="w-fit bg-zinc-100 dark:bg-[#171717] border border-zinc-200 dark:border-[#262626]">
                    <TabsTrigger value="editor" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#262626] text-zinc-500 dark:text-zinc-400 data-[state=active]:text-zinc-900 data-[state=active]:text-white uppercase text-[10px] tracking-widest px-6 h-8 shadow-sm dark:shadow-none">Editor</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#262626] text-zinc-500 dark:text-zinc-400 data-[state=active]:text-zinc-900 data-[state=active]:text-white uppercase text-[10px] tracking-widest px-6 h-8 shadow-sm dark:shadow-none">History</TabsTrigger>
                  </TabsList>

                  {/* Language Selector (Dropdown Option) & Custom Toggle Switch */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-[0.15em] flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      <span>Bahasa:</span>
                    </span>
                    
                    {/* Select option dropdown */}
                    <select
                      value={lang}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-zinc-100 dark:bg-[#171717] border border-zinc-200 dark:border-[#262626] hover:border-zinc-400 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-600 cursor-pointer font-medium transition-all"
                    >
                      <option value="id-ID" className="bg-white dark:bg-[#171717] text-zinc-900 dark:text-zinc-300">🇮🇩 Bahasa Indonesia</option>
                      <option value="en-US" className="bg-white dark:bg-[#171717] text-zinc-900 dark:text-zinc-300">🇺🇸 English (US)</option>
                    </select>

                    <div className="h-4 w-[1px] bg-zinc-200 dark:bg-[#262626]"></div>

                    {/* Quick switch/toggle */}
                    <div className="flex items-center bg-zinc-100 dark:bg-[#171717] border border-zinc-200 dark:border-[#262626] rounded-lg p-0.5">
                      <button
                        onClick={() => handleLanguageChange('id-ID')}
                        title="Bahasa Indonesia"
                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all tracking-wider ${lang === 'id-ID' ? 'bg-white dark:bg-[#262626] text-emerald-600 dark:text-emerald-400 shadow-sm dark:shadow-inner' : 'text-zinc-500 hover:text-zinc-400'}`}
                      >
                        ID
                      </button>
                      <button
                        onClick={() => handleLanguageChange('en-US')}
                        title="English"
                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all tracking-wider ${lang === 'en-US' ? 'bg-white dark:bg-[#262626] text-emerald-600 dark:text-emerald-400 shadow-sm dark:shadow-inner' : 'text-zinc-500 hover:text-zinc-400'}`}
                      >
                        EN
                      </button>
                    </div>
                  </div>
                </div>

                <TabsContent value="editor" className="flex-1 min-h-0 m-0 outline-none flex flex-col pt-2">
                  <div className="flex-1 px-1 py-4 bg-zinc-50 dark:bg-[#111] border border-zinc-200 dark:border-[#262626] rounded-xl overflow-hidden shadow-inner flex flex-col transition-colors duration-200">
                    <textarea
                      value={displayedText}
                      onChange={(e) => setEditableText(e.target.value)}
                      placeholder="Transkripsi Anda akan muncul di sini secara otomatis..."
                      readOnly={isRecording}
                      className={`flex-1 w-full bg-transparent px-6 py-2 pb-24 resize-none focus:outline-none font-sans text-lg leading-relaxed text-zinc-800 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-700 border-none ${isRecording ? 'opacity-80' : ''}`}
                    />
                    <div className="px-6 py-2 bg-zinc-100/50 dark:bg-black/40 border-t border-zinc-200 dark:border-[#262626] flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-600 uppercase tracking-widest shrink-0 transition-colors duration-200">
                      <span>Editor Mode</span>
                      <span className="flex items-center gap-3">
                        <button 
                          onClick={handleClear}
                          className="text-red-500 hover:text-red-400 transition-colors uppercase font-bold tracking-wider hover:underline"
                        >
                          Kosongkan Teks
                        </button>
                        <span>|</span>
                        <span>{editableText.trim() ? editableText.trim().split(/\s+/).length : 0} Kata</span>
                      </span>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="flex-1 min-h-0 m-0 outline-none flex flex-col pt-2">
                  <div className="flex-1 p-6 bg-zinc-50 dark:bg-[#111] border border-zinc-200 dark:border-[#262626] rounded-xl overflow-hidden shadow-inner flex flex-col transition-colors duration-200">
                    <ScrollArea className="flex-1">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-[#222]">
                          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Histori Transkripsi</span>
                          <span className="text-[10px] text-zinc-500">{documents.length} Dokumen Tersimpan</span>
                        </div>
                        {documents.map((doc, idx) => {
                          const words = doc.content.trim() ? doc.content.trim().split(/\s+/).length : 0;
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#161616] rounded-lg border border-zinc-200 dark:border-[#222] hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs shrink-0 font-mono">
                                  #{documents.length - idx}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{doc.title}</p>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">
                                    {doc.createdAt} • {doc.lang === 'id-ID' ? '🇮🇩 Indonesia' : '🇺🇸 English'} • {words} Kata
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (isRecording) {
                                      toast.error('Harap stop perekaman sebelum beralih dokumen');
                                      return;
                                    }
                                    setSelectedDocId(doc.id);
                                    toast.success(`Membuka: ${doc.title}`);
                                  }}
                                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                  Buka
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => exportToDocx(doc.content, doc.title)}
                                  className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                >
                                  Unduh
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Floating Control Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[600px] h-20 bg-white/95 dark:bg-[#171717]/90 backdrop-blur-xl border border-zinc-200 dark:border-[#333] rounded-2xl flex items-center px-4 md:px-8 shadow-2xl dark:shadow-black/50 z-20 transition-all duration-200">
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Live Status</span>
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5 h-4 items-end">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div 
                      key={i}
                      animate={isRecording ? { 
                        height: [8, 16, 12, 20, 10][i-1],
                        transition: { repeat: Infinity, duration: 0.5 + i*0.1, repeatType: 'reverse' }
                      } : { height: 4 }}
                      className={`w-1 ${isRecording ? 'bg-red-500' : 'bg-zinc-400 dark:bg-zinc-700'}`}
                    />
                  ))}
                </div>
                <span className="text-xl font-mono tabular-nums tracking-tight">
                  {formatTime(seconds)}
                </span>
                {isRecording && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className={`w-12 h-12 rounded-full border-zinc-200 dark:border-[#333] transition-all hover:scale-110 active:scale-95 ${isPaused ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-[#262626] text-zinc-700 dark:text-white hover:bg-zinc-300 dark:hover:bg-[#333]'}`}
                onClick={togglePause}
                disabled={!isRecording && !isPaused}
              >
                {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
              </Button>
              <Button 
                onClick={toggleRecording}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl shadow-red-950/20 border-none ${isRecording ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-900 dark:hover:bg-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <div className="w-4 h-4 bg-white rounded-sm shadow-inner" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={stop}
                disabled={!isRecording && !isPaused}
                className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-[#262626] border border-zinc-300 dark:border-[#333] text-zinc-700 dark:text-white hover:bg-zinc-300 dark:hover:bg-[#333] transition-all hover:scale-110 active:scale-95 disabled:opacity-20"
              >
                 <Check className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 text-right hidden sm:block">
              <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Audio Level</span>
              <div className="w-24 h-1 bg-zinc-200 dark:bg-[#262626] rounded-full mt-2 ml-auto overflow-hidden">
                <motion.div 
                  className="h-full bg-zinc-800 dark:bg-white"
                  animate={{ width: isRecording ? '75%' : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="absolute bottom-3 right-6 text-[10px] text-zinc-400 dark:text-zinc-600 tracking-wider pointer-events-none select-none z-10 font-mono">
            Copyright by Pipin Zaenal
          </div>
        </section>
      </main>
    </div>
  );
}

