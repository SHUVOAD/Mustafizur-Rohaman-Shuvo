
import React, { useState, useCallback } from 'react';
import { 
  PlusCircleIcon, 
  ClipboardDocumentCheckIcon, 
  RocketLaunchIcon, 
  TrashIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface PromptScene {
  id: string;
  sceneNumber: number;
  description: string;
  shortLabel: string;
}

const App: React.FC = () => {
  const [scenes, setScenes] = useState<PromptScene[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const extractPrompts = (text: string) => {
    // Files look like they contain JSON blocks separated by "--- START OF FILE text/plain ---"
    // We try to parse JSON blocks if they exist, otherwise we look for description patterns
    const chunks = text.split(/--- START OF FILE .* ---/).filter(c => c.trim().length > 0);
    const newScenes: PromptScene[] = [];

    chunks.forEach((chunk, index) => {
      try {
        // Find JSON content within the chunk
        const jsonMatch = chunk.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          if (data.description) {
            newScenes.push({
              id: Math.random().toString(36).substr(2, 9),
              sceneNumber: data.scene_number || (index + 1),
              description: data.description,
              shortLabel: data.visuals?.subject || `Scene ${data.scene_number || (index + 1)}`
            });
          }
        } else if (chunk.trim().length > 20) {
            // Fallback for non-JSON text
            newScenes.push({
              id: Math.random().toString(36).substr(2, 9),
              sceneNumber: index + 1,
              description: chunk.trim(),
              shortLabel: `Prompt ${index + 1}`
            });
        }
      } catch (e) {
        console.error("Error parsing chunk", e);
      }
    });

    if (newScenes.length > 0) {
      setScenes(prev => [...prev, ...newScenes]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      extractPrompts(text);
    };
    reader.readAsText(file);
  };

  const openInGrok = (promptText: string) => {
    // Copy to clipboard first for convenience
    navigator.clipboard.writeText(promptText).then(() => {
      // Grok Imagine doesn't support query params for the prompt directly easily, 
      // but copying it makes pasting into the input field instant.
      window.open('https://grok.com/imagine', '_blank');
    });
  };

  const clearScenes = () => setScenes([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <RocketLaunchIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                Prompt Flow Master
              </h1>
              <p className="text-slate-400 text-sm">Fast-track your Grok video generation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {scenes.length > 0 && (
              <button 
                onClick={clearScenes}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                <TrashIcon className="w-4 h-4" />
                Clear All
              </button>
            )}
            <label className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium cursor-pointer transition-all shadow-lg shadow-blue-600/30">
              <PlusCircleIcon className="w-5 h-5" />
              Upload Prompts
              <input type="file" className="hidden" accept=".txt,.json,.plain" onChange={handleFileUpload} />
            </label>
          </div>
        </header>

        {/* Main Content */}
        {scenes.length === 0 ? (
          <div 
            className={`mt-20 border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all ${
              isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 bg-slate-800/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => extractPrompts(ev.target?.result as string);
                reader.readAsText(file);
              }
            }}
          >
            <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
              <DocumentTextIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No prompts loaded yet</h2>
            <p className="text-slate-400 text-center max-w-md">
              Upload your notepad file or drag and drop it here. We'll automatically extract all the scene prompts for you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene, idx) => (
              <div 
                key={scene.id} 
                className="group relative bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Scene {scene.sceneNumber}
                    </span>
                    <VideoCameraIcon className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                  
                  <h3 className="font-semibold text-slate-100 mb-2 truncate">
                    {scene.shortLabel}
                  </h3>
                  
                  <div className="h-32 overflow-y-auto mb-6 scrollbar-thin scrollbar-thumb-slate-700">
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {scene.description}
                    </p>
                  </div>

                  <button
                    onClick={() => openInGrok(scene.description)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg active:scale-95"
                  >
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    Copy & Open Grok
                  </button>
                </div>
                
                {/* Decorative index */}
                <div className="absolute top-0 right-0 p-2 opacity-10 font-mono text-4xl select-none">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        {scenes.length > 0 && (
          <div className="mt-12 text-center text-slate-500 text-sm border-t border-slate-800 pt-8 pb-12">
            <p>Tip: Clicking a button copies the prompt to your clipboard and opens the Grok Imagine website.</p>
            <p>Simply press Ctrl+V (or Cmd+V) to paste the prompt once the site opens.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
