import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, Globe, BrainCog, FolderCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// ─── SpeechRecognition types ──────────────────────────────────────────────────

interface ISpeechRecognitionResult {
  readonly 0: { readonly transcript: string };
}
interface ISpeechRecognitionResultList {
  readonly 0: ISpeechRecognitionResult;
}
interface ISpeechRecognitionEvent {
  readonly results: ISpeechRecognitionResultList;
}
interface ISpeechRecognitionErrorEvent {
  readonly error: string;
}
interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface ISpeechRecognitionCtor { new(): ISpeechRecognition; }
declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionCtor;
    webkitSpeechRecognition?: ISpeechRecognitionCtor;
  }
}

const styles = `
  *:focus-visible { outline-offset: 0 !important; --ring-offset: 0 !important; }
  textarea::-webkit-scrollbar { width: 6px; }
  textarea::-webkit-scrollbar-track { background: transparent; }
  textarea::-webkit-scrollbar-thumb { background-color: #444444; border-radius: 3px; }
  textarea::-webkit-scrollbar-thumb:hover { background-color: #555555; }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// ─── Textarea ────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-11 resize-none",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-[#333333] bg-[#1F2023] px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// ─── Dialog ──────────────────────────────────────────────────────────────────

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-[90vw] md:max-w-200 -translate-x-1/2 -translate-y-1/2 gap-4 border border-[#333333] bg-[#1F2023] p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2E3033]/80 p-2 hover:bg-[#2E3033] transition-all">
        <X className="h-5 w-5 text-gray-200 hover:text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-100", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-white hover:bg-white/80 text-black",
      outline: "border border-[#444444] bg-transparent hover:bg-[#3A3A40]",
      ghost: "bg-transparent hover:bg-[#3A3A40]",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ─── VoiceRecorder ───────────────────────────────────────────────────────────

interface VoiceRecorderProps {
  isRecording: boolean;
  visualizerBars?: number;
}
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ isRecording, visualizerBars = 32 }) => {
  const [time, setTime] = React.useState(0);

  const bars = React.useMemo(
    () => Array.from({ length: visualizerBars }, (_, i) => ({
      height: Math.max(15, ((i * 37 + 13) % 100)),
      delay: i * 0.05,
      duration: 0.5 + ((i * 17) % 10) / 20,
    })),
    [visualizerBars]
  );

  React.useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setTime((t) => t + 1), 1000);
    return () => {
      clearInterval(id);
      setTime(0);
    };
  }, [isRecording]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className={cn("flex flex-col items-center justify-center w-full transition-all duration-300 py-3", isRecording ? "opacity-100" : "opacity-0 h-0")}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">{formatTime(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white/50 animate-pulse"
            style={{ height: `${bar.height}%`, animationDelay: `${bar.delay}s`, animationDuration: `${bar.duration}s` }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── ImageViewDialog ─────────────────────────────────────────────────────────

const ImageViewDialog: React.FC<{ imageUrl: string | null; onClose: () => void }> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none">
        <DialogTitle className="sr-only">Vista previa</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-[#1F2023] rounded-2xl overflow-hidden shadow-2xl"
        >
          <img src={imageUrl} alt="Vista previa" className="w-full max-h-[80vh] object-contain rounded-2xl" />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// ─── PromptInput Context ──────────────────────────────────────────────────────

interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false, value: "", setValue: () => {}, maxHeight: 240,
});
const usePromptInput = () => React.useContext(PromptInputContext);

// ─── PromptInput ─────────────────────────────────────────────────────────────

interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ className, isLoading = false, maxHeight = 240, value, onValueChange, onSubmit, children, disabled = false, onDragOver, onDragLeave, onDrop }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    return (
      <TooltipProvider>
        <PromptInputContext.Provider value={{ isLoading, value: value ?? internalValue, setValue: onValueChange ?? setInternalValue, maxHeight, onSubmit, disabled }}>
          <div
            ref={ref}
            className={cn("rounded-3xl border border-[#444444] bg-[#1F2023] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300", isLoading && "border-red-500/70", className)}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  }
);
PromptInput.displayName = "PromptInput";

// ─── PromptInputTextarea ──────────────────────────────────────────────────────

const PromptInputTextarea: React.FC<{ disableAutosize?: boolean; placeholder?: string; className?: string }> = ({ className, disableAutosize = false, placeholder }) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = typeof maxHeight === "number"
      ? `${Math.min(ref.current.scrollHeight, maxHeight)}px`
      : `min(${ref.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit?.(); } }}
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
};

// ─── PromptInputActions / Action ──────────────────────────────────────────────

const PromptInputActions: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>{children}</div>
);

const PromptInputAction: React.FC<{ tooltip: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }> = ({ tooltip, children, side = "top" }) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip>
      <TooltipTrigger asChild disabled={disabled}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

// ─── CustomDivider ────────────────────────────────────────────────────────────

const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div className="absolute inset-0 bg-linear-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full" />
  </div>
);

// ─── PromptInputBox (main export) ─────────────────────────────────────────────

/** Acciones rápidas: un clic envía `prompt` al handler (p. ej. panel admin con datos locales). */
export interface PromptPanelQuickAction {
  label: string;
  prompt: string;
}

interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  /** `panel`: sin web/canvas/adjuntos; solo texto, voz y envío (evita expectativas falsas). */
  variant?: "default" | "panel";
  /** Solo con `variant="panel"`: chips que disparan `onSend(prompt)` al instante. */
  quickActions?: PromptPanelQuickAction[];
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>((props, ref) => {
  const {
    onSend = () => {},
    isLoading = false,
    placeholder = "Pregunta sobre las predicciones...",
    className,
    variant = "default",
    quickActions,
  } = props;
  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [filePreviews, setFilePreviews] = React.useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [voiceError, setVoiceError] = React.useState<string | null>(null);
  const [showSearch, setShowSearch] = React.useState(false);
  const [showThink, setShowThink] = React.useState(false);
  const [showCanvas, setShowCanvas] = React.useState(false);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const promptBoxRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<ISpeechRecognition | null>(null);

  const processFile = React.useCallback((file: File) => {
    if (variant === "panel") return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    setFiles([file]);
    const reader = new FileReader();
    reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
    reader.readAsDataURL(file);
  }, [variant]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (variant === "panel") return;
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (dropped.length > 0) processFile(dropped[0]);
  }, [processFile, variant]);

  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    if (variant === "panel") return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) { e.preventDefault(); processFile(file); break; }
      }
    }
  }, [processFile, variant]);

  React.useEffect(() => {
    if (variant === "panel") return;
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste, variant]);

  const handleSubmit = () => {
    if (!input.trim() && files.length === 0) return;
    const prefix = showSearch ? "[Buscar: " : showThink ? "[Analizar: " : showCanvas ? "[Canvas: " : "";
    onSend(prefix ? `${prefix}${input}]` : input, files);
    setInput(""); setFiles([]); setFilePreviews({});
  };

  const startVoiceRecording = () => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setVoiceError("Tu navegador no soporta voz. Usa Google Chrome.");
      setTimeout(() => setVoiceError(null), 4000);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "es-PE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      onSend(transcript, []);
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      if (event.error === "no-speech") {
        setVoiceError("No se detectó voz. Intenta de nuevo.");
      } else if (event.error === "not-allowed") {
        setVoiceError("Permiso de micrófono denegado. Actívalo en el navegador.");
      } else {
        setVoiceError("Error al procesar la voz. Intenta de nuevo.");
      }
      setTimeout(() => setVoiceError(null), 4000);
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const hasContent = input.trim() !== "" || files.length > 0;

  const toggleMode = (mode: "search" | "think") => {
    if (mode === "search") { setShowSearch((p) => !p); setShowThink(false); }
    else { setShowThink((p) => !p); setShowSearch(false); }
  };

  const assignContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      promptBoxRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  const sendQuickAction = React.useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || isLoading || isRecording) return;
      onSend(t, []);
    },
    [isLoading, isRecording, onSend],
  );

  return (
    <>
      {variant === "panel" && quickActions && quickActions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              type="button"
              disabled={isLoading || isRecording}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => sendQuickAction(action.prompt)}
              className="rounded-full border border-amber-400/35 bg-gradient-to-br from-amber-500/15 to-amber-600/5 px-3.5 py-1.5 text-left text-xs font-semibold text-amber-100 shadow-sm transition-colors hover:border-amber-300/55 hover:from-amber-400/25 disabled:pointer-events-none disabled:opacity-40"
            >
              {action.label}
            </motion.button>
          ))}
        </div>
      )}
      <PromptInput
        value={input} onValueChange={setInput} isLoading={isLoading} onSubmit={handleSubmit}
        className={cn(
          "w-full bg-[#1F2023] border-[#444444] transition-[box-shadow,border-color] duration-300",
          isRecording && "border-red-500/70",
          variant === "panel" &&
            "border-amber-600/25 shadow-[0_12px_48px_-14px_rgba(201,162,39,0.28)] focus-within:border-amber-400/40 focus-within:shadow-[0_16px_56px_-12px_rgba(201,162,39,0.35)]",
          className,
        )}
        disabled={isLoading || isRecording}
        ref={assignContainerRef}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
      >
        {files.length > 0 && !isRecording && variant !== "panel" && (
          <div className="flex flex-wrap gap-2 pb-1">
            {files.map((file, i) => (
              filePreviews[file.name] && (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelectedImage(filePreviews[file.name])}>
                  <img src={filePreviews[file.name]} alt={file.name} className="h-full w-full object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); setFiles([]); setFilePreviews({}); }}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )
            ))}
          </div>
        )}

        <div className={cn("transition-all duration-300", isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100")}>
          <PromptInputTextarea placeholder={showSearch ? "Buscar en la web..." : showThink ? "Analizar en profundidad..." : showCanvas ? "Crear en canvas..." : placeholder} />
        </div>

        {isRecording && (
          <VoiceRecorder isRecording={isRecording} />
        )}

        {voiceError && (
          <p className="text-xs text-red-400 px-1 pb-1">{voiceError}</p>
        )}

        <PromptInputActions className="justify-between pt-2">
          {variant === "panel" ? (
            <>
              <p className="max-w-[min(100%,20rem)] pl-1 text-[11px] leading-snug text-gray-500">
                {isRecording ? "Escuchando… habla con claridad." : "Enter envía · Shift+Enter nueva línea · Datos de este panel."}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <PromptInputAction tooltip={isRecording ? "Parar grabación" : "Dictar (es-PE)"}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-full border-[#555] bg-transparent text-[#D1D5DB] hover:bg-gray-600/25",
                      isRecording && "border-red-500/50 text-red-400",
                    )}
                    onClick={() => { if (isRecording) stopVoiceRecording(); else if (!isLoading) startVoiceRecording(); }}
                    disabled={isLoading && !isRecording}
                  >
                    {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                </PromptInputAction>
                <Button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-all",
                    "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 text-stone-900 shadow-md hover:brightness-105",
                    "disabled:pointer-events-none disabled:opacity-35",
                  )}
                  onClick={handleSubmit}
                  disabled={!hasContent || isLoading || isRecording}
                >
                  {isLoading ? (
                    <Square className="h-4 w-4 fill-stone-800 animate-pulse" />
                  ) : (
                    <>
                      Enviar
                      <ArrowUp className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className={cn("flex items-center gap-1 transition-opacity duration-300", isRecording ? "opacity-0 invisible h-0" : "opacity-100 visible")}>
                <PromptInputAction tooltip="Subir imagen">
                  <button type="button" onClick={() => uploadInputRef.current?.click()}
                    className="flex h-8 w-8 text-[#9CA3AF] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-600/30 hover:text-[#D1D5DB]">
                    <Paperclip className="h-5 w-5" />
                    <input ref={uploadInputRef} type="file" className="hidden" accept="image/*"
                      onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); if (e.target) e.target.value = ""; }} />
                  </button>
                </PromptInputAction>

                <div className="flex items-center">
                  {(["search", "think", "canvas"] as const).map((mode, idx) => {
                    const configs = {
                      search: { active: showSearch, color: "#1EAEDB", Icon: Globe, label: "Buscar", onClick: () => toggleMode("search") },
                      think:  { active: showThink,  color: "#8B5CF6", Icon: BrainCog, label: "Analizar", onClick: () => toggleMode("think") },
                      canvas: { active: showCanvas, color: "#F97316", Icon: FolderCode, label: "Canvas", onClick: () => setShowCanvas((p) => !p) },
                    };
                    const { active, color, Icon, label, onClick } = configs[mode];
                    return (
                      <React.Fragment key={mode}>
                        {idx > 0 && <CustomDivider />}
                        <button type="button" onClick={onClick}
                          className={cn("rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                            active ? `border-[${color}] text-[${color}]` : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
                          )}
                          style={active ? { background: `${color}26`, borderColor: color, color } : undefined}
                        >
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <motion.div
                              animate={{ rotate: active ? 360 : 0, scale: active ? 1.1 : 1 }}
                              whileHover={{ rotate: active ? 360 : 15, scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 260, damping: 25 }}
                            >
                              <Icon className="w-4 h-4" />
                            </motion.div>
                          </div>
                          <AnimatePresence>
                            {active && (
                              <motion.span
                                initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs overflow-hidden whitespace-nowrap shrink-0"
                              >
                                {label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <PromptInputAction tooltip={isLoading ? "Detener" : isRecording ? "Parar grabación" : hasContent ? "Enviar" : "Hablar"}>
                <Button variant="default" size="icon"
                  className={cn("h-8 w-8 rounded-full transition-all duration-200",
                    isRecording ? "bg-transparent hover:bg-gray-600/30 text-red-500" :
                    hasContent  ? "bg-white hover:bg-white/80 text-[#1F2023]" :
                                  "bg-transparent hover:bg-gray-600/30 text-[#9CA3AF]"
                  )}
                  onClick={() => { if (isRecording) stopVoiceRecording(); else if (hasContent) handleSubmit(); else startVoiceRecording(); }}
                  disabled={isLoading && !hasContent}
                >
                  {isLoading   ? <Square className="h-4 w-4 fill-[#1F2023] animate-pulse" /> :
                   isRecording ? <StopCircle className="h-5 w-5 text-red-500" /> :
                   hasContent  ? <ArrowUp className="h-4 w-4 text-[#1F2023]" /> :
                                 <Mic className="h-5 w-5" />}
                </Button>
              </PromptInputAction>
            </>
          )}
        </PromptInputActions>
      </PromptInput>

      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
});
PromptInputBox.displayName = "PromptInputBox";
