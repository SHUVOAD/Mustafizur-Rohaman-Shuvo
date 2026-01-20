
import React, { useState } from 'react';
import { 
  PlusCircleIcon, 
  ClipboardDocumentCheckIcon, 
  RocketLaunchIcon, 
  TrashIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  FolderPlusIcon
} from '@heroicons/react/24/outline';

interface PromptScene {
  id: string;
  sceneNumber: string;
  description: string;
  shortLabel: string;
  fileName: string;
}

const App: React.FC = () => {
  const [scenes, setScenes] = useState<PromptScene[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File): Promise<PromptScene[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const extracted: PromptScene[] = [];
        
        // Try to see if it's a JSON file or has a JSON block
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.description) {
              extracted.push({
                id: Math.random().toString(36).substr(2, 9),
                sceneNumber: data.scene_number?.toString() || file.name.replace(/\D/g, '') || "N/A",
                description: data.description,
                shortLabel: data.visuals?.subject || file.name,
                fileName: file.name
              });
              resolve(extracted);
              return;
            }
          }
        } catch (e) {
          // Not JSON, continue to plain text
        }

        // Plain text fallback
        if (text.trim().length > 5) {
          extracted.push({
            id: Math.random().toString(36).substr(2, 9),
            sceneNumber: file.name.replace(/\D/g, '') || "1",
            description: text.trim(),
            shortLabel: file.name,
            fileName: file.name
          });
        }
        resolve(extracted);
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const allExtracted: PromptScene[] = [];

    for (const file of fileList) {
      // FIX: Ensure file is treated as a File object to access name and process it
      const currentFile = file as File;
      if (currentFile.name.includes('.') && !currentFile.name.match(/\.(jpg|jpeg|png|gif|mp4|mov)$/i)) {
        const result = await processFile(currentFile);
        allExtracted.push(...result);
      }
    }

    // Sort scenes by scene number if possible
    const sorted = [...allExtracted].sort((a, b) => {
      const numA = parseInt(a.sceneNumber) || 0;
      const numB = parseInt(b.sceneNumber) || 0;
      return numA - numB;
    });

    setScenes(prev => [...prev, ...sorted]);
  };

  const openInGrok = (promptText: string) => {
    navigator.clipboard.writeText(promptText).then(() => {
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
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <RocketLaunchIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                Prompt Flow Master
              </h1>
              <p className="text-slate-400 text-sm">Folder & Batch Prompt Uploader</p>
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
            
            <label className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer transition-all shadow-lg shadow-indigo-600/30">
              <FolderPlusIcon className="w-5 h-5" />
              Upload Folder / Files
              <input 
                type="file" 
                className="hidden" 
                multiple 
                /* @ts-ignore - webkitdirectory is non-standard but widely supported */
                webkitdirectory="" 
                directory="" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>
        </header>

        {/* Main Content */}
        {scenes.length === 0 ? (
          <div 
            className={`mt-20 border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all ${
              isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              const files = Array.from(e.dataTransfer.files);
              const allExtracted: PromptScene[] = [];
              for (const file of files) {
                // FIX: Cast unknown file from dataTransfer to File for processFile
                const result = await processFile(file as File);
                allExtracted.push(...result);
              }
              setScenes(prev => [...prev, ...allExtracted]);
            }}
          >
            <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
              <DocumentTextIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No scenes loaded</h2>
            <p className="text-slate-400 text-center max-w-md">
              Select your <b>scene_prompt</b> folder or select multiple text files at once. 
              We will automatically list every scene as a separate prompt.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene, idx) => (
              <div 
                key={scene.id} 
                className="group relative bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Scene {scene.sceneNumber}
                    </span>
                    <VideoCameraIcon className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  
                  <h3 className="font-semibold text-slate-100 mb-1 truncate text-sm" title={scene.fileName}>
                    {scene.shortLabel}
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-3 truncate">{scene.fileName}</p>
                  
                  <div className="h-32 overflow-y-auto mb-6 scrollbar-thin scrollbar-thumb-slate-700 pr-2">
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {scene.description}
                    </p>
                  </div>

                  <button
                    onClick={() => openInGrok(scene.description)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-50 hover:to-blue-500 text-white font-bold transition-all shadow-lg active:scale-95"
                  >
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    Copy & Launch Grok
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        {scenes.length > 0 && (
          <div className="mt-12 text-center text-slate-500 text-sm border-t border-slate-800 pt-8 pb-12">
            <p className="font-medium text-slate-400 mb-1">Total Scenes: {scenes.length}</p>
            <p>Click "Copy & Launch" to copy the text and open Grok Imagine in a new tab.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
