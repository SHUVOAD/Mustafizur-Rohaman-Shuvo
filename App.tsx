
import React, { useState, useCallback } from 'react';
import { 
  ClipboardDocumentCheckIcon, 
  RocketLaunchIcon, 
  TrashIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  FolderPlusIcon,
  ArrowsRightLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface PromptScene {
  id: string;
  sceneNumber: string;
  description: string;
  shortLabel: string;
  source: string;
}

const App: React.FC = () => {
  const [scenes, setScenes] = useState<PromptScene[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const extractPromptsFromText = useCallback((text: string, sourceName: string): PromptScene[] => {
    let extracted: PromptScene[] = [];
    
    // 1. Check for JSON first as it's the most structured
    const jsonRegex = /({[\s\S]*?description[\s\S]*?})|(\[[\s\S]*?description[\s\S]*?\])/g;
    let match;
    while ((match = jsonRegex.exec(text)) !== null) {
      try {
        const potentialJson = match[0];
        const data = JSON.parse(potentialJson);
        const items = Array.isArray(data) ? data : [data];
        items.forEach((item: any) => {
          if (item.description && item.description.length > 10) {
            extracted.push({
              id: Math.random().toString(36).substr(2, 9),
              sceneNumber: item.scene_number?.toString() || (extracted.length + 1).toString(),
              description: item.description,
              shortLabel: item.visuals?.subject || item.title || `Scene ${extracted.length + 1}`,
              source: sourceName
            });
          }
        });
      } catch (e) { }
    }

    if (extracted.length > 0) return extracted;

    // 2. Advanced Multi-line / Header Parsing
    // Split by markers like "Scene 1", "### 1.", "Prompt 1:", etc.
    const splitRegex = /(?=Scene\s*\d+[:\s-]*|Prompt\s*\d+[:\s-]*|###\s*\**\d+[\.\s]|\[Scene\s*\d+\])/gi;
    let chunks = text.split(splitRegex);

    // If no markers found, try double-newline splitting
    if (chunks.length <= 1) {
      chunks = text.split(/\n\s*\n/);
    }

    chunks.forEach((chunk) => {
      let cleanChunk = chunk.trim();
      
      // FILTER: Ignore "Conversational Filler" from AI (e.g., "Got it!", "Here are your prompts...")
      const isConversational = /^(Got it|Here are|Below are|Sure|Certainly|I've written|The following)/i.test(cleanChunk);
      if (isConversational && cleanChunk.length < 200) return;

      if (cleanChunk.length > 30) {
        // Extract scene number if present in header (e.g., "### **1. Title" -> "1")
        const numMatch = cleanChunk.match(/(?:Scene|Prompt|###\s*\**|\[Scene)\s*(\d+)/i);
        const sceneNum = numMatch ? numMatch[1] : (extracted.length + 1).toString();

        // CLEANUP: Remove common header markers from the text content
        let finalDescription = cleanChunk
          .replace(/^(Scene|Prompt|###)\s*\**\d+[\.\s-]*\**[:\s-]*/i, '') // Remove "Scene 1:"
          .replace(/^\**[^*]+\**\s*[-—]\s*/, '') // Remove "Title - " prefixes
          .trim();

        // If after cleaning we have a meaningful description
        if (finalDescription.length > 15) {
          extracted.push({
            id: Math.random().toString(36).substr(2, 9),
            sceneNumber: sceneNum,
            description: finalDescription,
            shortLabel: finalDescription.substring(0, 40) + "...",
            source: sourceName
          });
        }
      }
    });

    // 3. De-duplication / Merging
    // Sometimes a Title and a Description are separated. Let's merge tiny "Title" scenes into the next scene.
    const merged: PromptScene[] = [];
    for (let i = 0; i < extracted.length; i++) {
      const current = extracted[i];
      // If this scene is very short and the next one exists, it might be a title for the next
      if (current.description.length < 60 && i < extracted.length - 1) {
        const next = extracted[i + 1];
        next.description = `[${current.description}]\n${next.description}`;
        // Skip current, it's now merged
      } else {
        merged.push(current);
      }
    }

    return merged.length > 0 ? merged : extracted;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setIsAnalyzing(true);
    const allExtracted: PromptScene[] = [];
    const fileList = Array.from(files);

    for (const file of fileList) {
      const f = file as File;
      if (f.size > 1024 * 1024 * 5) continue;
      const text = await f.text();
      const results = extractPromptsFromText(text, f.name);
      allExtracted.push(...results);
    }

    setScenes(prev => [...prev, ...allExtracted]);
    setIsAnalyzing(false);
  };

  const handleManualPaste = () => {
    if (!pastedText.trim()) return;
    setIsAnalyzing(true);
    const results = extractPromptsFromText(pastedText, "Pasted Content");
    setScenes(prev => [...prev, ...results]);
    setPastedText('');
    setIsAnalyzing(false);
  };

  const openInGrok = (promptText: string) => {
    navigator.clipboard.writeText(promptText).then(() => {
      window.open('https://grok.com/imagine', '_blank');
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-200 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
              <RocketLaunchIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Prompt<span className="text-indigo-500">Flow</span></h1>
              <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Video Scene Organizer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {scenes.length > 0 && (
              <button 
                onClick={() => setScenes([])}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
                title="Clear All"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Clear</span>
              </button>
            )}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <FolderPlusIcon className="w-4 h-4" /> Files
              </button>
              <button 
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'paste' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ArrowsRightLeftIcon className="w-4 h-4" /> Paste
              </button>
            </div>
          </div>
        </header>

        {/* Input Zone */}
        <div className="mb-10">
          {activeTab === 'upload' ? (
            <div 
              className={`relative border-2 border-dashed rounded-[2rem] p-12 text-center transition-all ${
                isDragging ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99]' : 'border-slate-800 bg-slate-900/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer.files);
                const all: PromptScene[] = [];
                for (const file of files) {
                  const f = file as File;
                  const text = await f.text();
                  all.push(...extractPromptsFromText(text, f.name));
                }
                setScenes(p => [...p, ...all]);
              }}
            >
              <input 
                type="file" 
                multiple 
                /* @ts-ignore */
                webkitdirectory="" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                  <FolderPlusIcon className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Upload Scene Folder</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Drag your prompts folder here. We'll extract and organize every scene automatically.</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
              <textarea 
                className="w-full h-64 bg-transparent border-none p-4 text-slate-300 focus:outline-none transition-all resize-none font-mono text-sm leading-relaxed"
                placeholder="Paste your raw AI text here... Header and filler text will be automatically removed."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-2 text-indigo-500/50">
                   <SparklesIcon className="w-4 h-4" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Smart Extraction Active</span>
                </div>
                <button 
                  onClick={handleManualPaste}
                  disabled={!pastedText.trim() || isAnalyzing}
                  className="flex items-center gap-2 px-10 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Generate Scene List'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Grid */}
        {scenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {scenes.map((scene, idx) => (
              <div key={scene.id} className="group flex flex-col bg-[#161b2a] border border-slate-800/60 rounded-[1.5rem] overflow-hidden hover:border-indigo-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-900/20">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">
                        Scene {scene.sceneNumber}
                      </span>
                    </div>
                    <VideoCameraIcon className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  
                  <div className="h-44 overflow-y-auto mb-6 scrollbar-thin scrollbar-thumb-slate-800 pr-3">
                    <p className="text-[14px] text-slate-300 leading-relaxed font-medium">
                      {scene.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                    <DocumentTextIcon className="w-3 h-3" />
                    <span className="truncate">{scene.source}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 border-t border-slate-800/40">
                  <button
                    onClick={() => openInGrok(scene.description)}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-slate-800/50 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-200 active:scale-95"
                  >
                    <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    Copy & Launch
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center opacity-20">
            <div className="inline-block p-10 border-2 border-slate-800 rounded-full mb-6">
               <VideoCameraIcon className="w-16 h-16 text-slate-500" />
            </div>
            <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-400">No Scenes Loaded</p>
          </div>
        )}

        {/* Footer info */}
        {scenes.length > 0 && (
          <div className="mt-20 text-center border-t border-slate-900 pt-10 pb-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
              Flow Complete &bull; {scenes.length} Scenes Found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
