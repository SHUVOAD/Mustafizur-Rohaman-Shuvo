
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

  // Advanced analysis logic to find prompts in messy text
  const extractPromptsFromText = useCallback((text: string, sourceName: string): PromptScene[] => {
    const extracted: PromptScene[] = [];
    
    // Pattern 1: Look for JSON blocks (common in AI outputs)
    const jsonRegex = /\{[\s\S]*?description[\s\S]*?\}/g;
    let match;
    while ((match = jsonRegex.exec(text)) !== null) {
      try {
        const cleanJson = match[0].replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        const data = JSON.parse(cleanJson);
        if (data.description && data.description.length > 10) {
          extracted.push({
            id: Math.random().toString(36).substr(2, 9),
            sceneNumber: data.scene_number?.toString() || (extracted.length + 1).toString(),
            description: data.description,
            shortLabel: data.visuals?.subject || `Scene ${extracted.length + 1}`,
            source: sourceName
          });
        }
      } catch (e) { /* skip invalid json */ }
    }

    // Pattern 2: If no JSON found, look for "Scene X:" or "Prompt X:" markers
    if (extracted.length === 0) {
      const sceneMarkers = text.split(/(?=Scene\s*\d+:|Prompt\s*\d+:|###\s*Scene|\[Scene)/gi);
      sceneMarkers.forEach((chunk, idx) => {
        const cleanChunk = chunk.trim();
        if (cleanChunk.length > 40) { // Assume a real prompt is at least 40 chars
          extracted.push({
            id: Math.random().toString(36).substr(2, 9),
            sceneNumber: (idx + 1).toString(),
            description: cleanChunk.replace(/^(Scene|Prompt|###)\s*\d+[:\s-]*/i, '').trim(),
            shortLabel: `Extracted Prompt ${idx + 1}`,
            source: sourceName
          });
        }
      });
    }

    // Pattern 3: Fallback for single long descriptive blocks if nothing else matched
    if (extracted.length === 0 && text.trim().length > 50) {
       extracted.push({
         id: Math.random().toString(36).substr(2, 9),
         sceneNumber: "1",
         description: text.trim(),
         shortLabel: sourceName,
         source: sourceName
       });
    }

    return extracted;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setIsAnalyzing(true);
    const allExtracted: PromptScene[] = [];
    const fileList = Array.from(files);

    for (const file of fileList) {
      // FIX: Explicitly cast as File to access size, text(), and name properties
      const f = file as File;
      if (f.size > 1024 * 1024 * 5) continue; // Skip files > 5MB
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
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <RocketLaunchIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Prompt Flow <span className="text-indigo-400">Pro</span></h1>
              <p className="text-slate-400 text-sm font-medium">Smart video prompt extractor & manager</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {scenes.length > 0 && (
              <button 
                onClick={() => setScenes([])}
                className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Clear All"
              >
                <TrashIcon className="w-6 h-6" />
              </button>
            )}
            <div className="h-10 w-[1px] bg-slate-800 mx-2 hidden md:block"></div>
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button 
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <FolderPlusIcon className="w-4 h-4" /> Upload
              </button>
              <button 
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'paste' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <ArrowsRightLeftIcon className="w-4 h-4" /> Paste
              </button>
            </div>
          </div>
        </header>

        {/* Input Zone */}
        <div className="mb-12">
          {activeTab === 'upload' ? (
            <div 
              className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all ${
                isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer.files);
                const all: PromptScene[] = [];
                for (const file of files) {
                  // FIX: Explicitly cast as File to access text() and name properties
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
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <FolderPlusIcon className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Drop your "scene_prompt" folder here</h3>
                <p className="text-slate-400 max-w-sm mx-auto">Click to browse or drag your entire project folder. We'll find the prompts inside.</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
              <textarea 
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none font-mono text-sm"
                placeholder="Paste your giant log file, AI response, or messy text here..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <div className="flex justify-end mt-4">
                <button 
                  onClick={handleManualPaste}
                  disabled={!pastedText.trim() || isAnalyzing}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20"
                >
                  <SparklesIcon className="w-5 h-5" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze & Extract Prompts'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Grid */}
        {scenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene, idx) => (
              <div key={scene.id} className="group flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                      Scene {scene.sceneNumber}
                    </span>
                    <VideoCameraIcon className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  
                  <h4 className="font-bold text-white mb-1 line-clamp-1 text-sm">{scene.shortLabel}</h4>
                  <p className="text-[10px] text-slate-500 mb-4 flex items-center gap-1">
                    <DocumentTextIcon className="w-3 h-3" /> {scene.source}
                  </p>
                  
                  <div className="h-32 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-slate-800 pr-2">
                    <p className="text-sm text-slate-400 leading-relaxed italic">
                      "{scene.description}"
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/50 border-t border-slate-800">
                  <button
                    onClick={() => openInGrok(scene.description)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-white font-bold transition-all"
                  >
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    Copy & Open Grok
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center opacity-30">
            <SparklesIcon className="w-16 h-16 mx-auto mb-4" />
            <p className="text-xl font-medium">Ready to extract prompts</p>
          </div>
        )}

        {/* Stats Footer */}
        {scenes.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 text-xs border-t border-slate-800/50 pt-8 pb-12 uppercase tracking-tighter">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Total Scenes: <span className="text-slate-300 font-bold">{scenes.length}</span>
            </div>
            <div>
              Sorted by: <span className="text-slate-300 font-bold">Scene Order</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
