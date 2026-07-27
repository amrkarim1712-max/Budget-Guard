import { useState, useRef, useEffect } from "react";
import { ArrowUp, Globe, Image as ImageIcon, X, Bot } from "lucide-react";
import { useListOpenrouterModels } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ThinkingSelector, { ThinkingLevel, THINKING_MODEL_MAP } from "./thinking-selector";

interface ComposerProps {
  onSend: (content: string, model: string, webSearch: boolean, images: string[]) => void;
  defaultModel?: string;
  disabled?: boolean;
}

export default function Composer({ onSend, defaultModel, disabled }: ComposerProps) {
  const [content, setContent] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  const [level, setLevel] = useState<ThinkingLevel>('balanced');
  const [model, setModel] = useState(defaultModel || THINKING_MODEL_MAP['balanced']);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: models } = useListOpenrouterModels();

  useEffect(() => {
    if (defaultModel) {
      setModel(defaultModel);
      const matchedLevel = (Object.keys(THINKING_MODEL_MAP) as ThinkingLevel[]).find(
        k => THINKING_MODEL_MAP[k] === defaultModel
      );
      if (matchedLevel) {
        setLevel(matchedLevel);
      }
    }
  }, [defaultModel]);

  const handleLevelChange = (newLevel: ThinkingLevel) => {
    setLevel(newLevel);
    setModel(THINKING_MODEL_MAP[newLevel]);
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
              setImages(prev => [...prev, e.target!.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof e.target?.result === 'string') {
            setImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const submit = () => {
    if (!content.trim() && images.length === 0) return;
    onSend(content.trim(), model, webSearch, images);
    setContent("");
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof e.target?.result === 'string') {
            setImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const selectedModelInfo = models?.find(m => m.id === model);
  const shortModelName = selectedModelInfo?.name?.split(" ")[0] || model.split('/')[1] || model;

  return (
    <div 
      className="bg-card border border-border rounded-2xl shadow-md focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40 transition-colors duration-150 relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="p-4 pb-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="Message NeuralChat..."
          className="w-full bg-transparent resize-none outline-none min-h-[56px] max-h-[240px] text-[15px] text-foreground placeholder:text-muted-foreground/60 overflow-y-auto scrollbar-thin"
          rows={1}
        />
      </div>

      {images.length > 0 && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-thin">
          {images.map((img, i) => (
            <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-border group">
              <img src={img} alt="upload" className="w-full h-full object-cover" />
              <button 
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-4 h-4 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin no-scrollbar">
          <ThinkingSelector value={level} onChange={handleLevelChange} disabled={disabled} />
          
          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

          <button
            onClick={() => setWebSearch(!webSearch)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors shrink-0",
              webSearch 
                ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            Search
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || !selectedModelInfo?.supportsVision}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors shrink-0",
              (!selectedModelInfo?.supportsVision) ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            title={!selectedModelInfo?.supportsVision ? "Model does not support vision" : "Attach image"}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Image
          </button>

          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button disabled={disabled} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/50 text-[12px] font-medium text-muted-foreground transition-colors shrink-0" title="Select exact model">
                <Bot className="w-3.5 h-3.5" />
                <span className="max-w-[80px] truncate">{shortModelName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] max-h-[400px] overflow-y-auto">
              {models?.map(m => (
                <DropdownMenuItem 
                  key={m.id} 
                  onClick={() => {
                    setModel(m.id);
                    const matchedLevel = (Object.keys(THINKING_MODEL_MAP) as ThinkingLevel[]).find(k => THINKING_MODEL_MAP[k] === m.id);
                    if (matchedLevel) setLevel(matchedLevel);
                  }} 
                  className="flex flex-col items-start py-2"
                >
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{m.description}</div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          onClick={submit}
          disabled={disabled || (!content.trim() && images.length === 0)}
          className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-primary/90 shrink-0 shadow-sm ml-2"
        >
          <ArrowUp className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
