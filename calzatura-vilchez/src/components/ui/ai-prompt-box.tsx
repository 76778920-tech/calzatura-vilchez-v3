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
type ISpeechRecognitionCtor = new () => ISpeechRecognition;

type GlobalWithSpeechRecognition = typeof globalThis & {
  SpeechRecognition?: ISpeechRecognitionCtor;
  webkitSpeechRecognition?: ISpeechRecognitionCtor;
};

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
  React.ComponentRef<typeof TooltipPrimitive.Content>,
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
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
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
  React.ComponentRef<typeof DialogPrimitive.Content>,
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
  React.ComponentRef<typeof DialogPrimitive.Title>,
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
    () =>
      Array.from({ length: visualizerBars }, (_, i) => {
        const height = Math.max(15, ((i * 37 + 13) % 100));
        const delay = i * 0.05;
        const duration = 0.5 + ((i * 17) % 10) / 20;
        return {
          key: `viz-${height}-${delay}-${duration}`,
          height,
          delay,
          duration,
        };
      }),
    [visualizerBars],
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
        {bars.map((bar) => (
          <div
            key={bar.key}
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
    const mergedValue = value ?? internalValue;
    const setValue = onValueChange ?? setInternalValue;
    const contextValue = React.useMemo(
      () => ({
        isLoading,
        value: mergedValue,
        setValue,
        maxHeight,
        onSubmit,
        disabled,
      }),
      [isLoading, mergedValue, setValue, maxHeight, onSubmit, disabled],
    );
    return (
      <TooltipProvider>
        <PromptInputContext.Provider value={contextValue}>
          <div
            ref={ref}
            role="region"
            aria-label="Entrada de mensaje. Puedes arrastrar imágenes aquí para adjuntarlas."
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

function speechRecognitionErrorMessage(error: string): string {
  if (error === "no-speech") return "No se detectó voz. Intenta de nuevo.";
  if (error === "not-allowed") return "Permiso de micrófono denegado. Actívalo en el navegador.";
  return "Error al procesar la voz. Intenta de nuevo.";
}

function buildPromptPayloadWithModePrefix(
  input: string,
  showSearch: boolean,
  showThink: boolean,
  showCanvas: boolean
): string {
  let prefix = "";
  if (showSearch) prefix = "[Buscar: ";
  else if (showThink) prefix = "[Analizar: ";
  else if (showCanvas) prefix = "[Canvas: ";
  return prefix ? `${prefix}${input}]` : input;
}

function handleToolbarFileInputChange(
  processFile: (file: File) => void,
  e: React.ChangeEvent<HTMLInputElement>
) {
  const file = e.target.files?.[0];
  if (file) processFile(file);
  e.target.value = "";
}

type PromptToolbarModeButtonsProps = {
  showSearch: boolean;
  showThink: boolean;
  showCanvas: boolean;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  setShowThink: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCanvas: React.Dispatch<React.SetStateAction<boolean>>;
};

function PromptToolbarModeButtons({
  showSearch,
  showThink,
  showCanvas,
  setShowSearch,
  setShowThink,
  setShowCanvas,
}: Readonly<PromptToolbarModeButtonsProps>) {
  const toggleSearchThink = (mode: "search" | "think") => {
    if (mode === "search") {
      setShowSearch((p) => !p);
      setShowThink(false);
    } else {
      setShowThink((p) => !p);
      setShowSearch(false);
    }
  };

  const modes = [
    {
      id: "search" as const,
      active: showSearch,
      color: "#1EAEDB",
      Icon: Globe,
      label: "Buscar",
      onClick: () => toggleSearchThink("search"),
    },
    {
      id: "think" as const,
      active: showThink,
      color: "#8B5CF6",
      Icon: BrainCog,
      label: "Analizar",
      onClick: () => toggleSearchThink("think"),
    },
    {
      id: "canvas" as const,
      active: showCanvas,
      color: "#F97316",
      Icon: FolderCode,
      label: "Canvas",
      onClick: () => setShowCanvas((p) => !p),
    },
  ];

  return (
    <div className="flex items-center">
      {modes.map((mode, idx) => {
        const { active, color, Icon, label, onClick } = mode;
        return (
          <React.Fragment key={mode.id}>
            {idx > 0 && <CustomDivider />}
            <button
              type="button"
              onClick={onClick}
              className={cn(
                "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                active
                  ? `border-[${color}] text-[${color}]`
                  : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
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
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
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
  );
}

function promptToolbarVoiceIcon(isLoading: boolean, isRecording: boolean, hasContent: boolean) {
  if (isLoading) return <Square className="h-4 w-4 fill-[#1F2023] animate-pulse" />;
  if (isRecording) return <StopCircle className="h-5 w-5 text-red-500" />;
  if (hasContent) return <ArrowUp className="h-4 w-4 text-[#1F2023]" />;
  return <Mic className="h-5 w-5" />;
}

type PromptDefaultToolbarProps = {
  showSearch: boolean;
  showThink: boolean;
  showCanvas: boolean;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  setShowThink: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCanvas: React.Dispatch<React.SetStateAction<boolean>>;
  isRecording: boolean;
  isLoading: boolean;
  hasContent: boolean;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  processFile: (file: File) => void;
  onVoicePrimary: () => void;
};

function PromptInputDefaultToolbar({
  showSearch,
  showThink,
  showCanvas,
  setShowSearch,
  setShowThink,
  setShowCanvas,
  isRecording,
  isLoading,
  hasContent,
  uploadInputRef,
  processFile,
  onVoicePrimary,
}: Readonly<PromptDefaultToolbarProps>) {
  let voiceButtonClass = "bg-transparent hover:bg-gray-600/30 text-[#9CA3AF]";
  if (isRecording) voiceButtonClass = "bg-transparent hover:bg-gray-600/30 text-red-500";
  else if (hasContent) voiceButtonClass = "bg-white hover:bg-white/80 text-[#1F2023]";

  return (
    <>
      <div className={cn("flex items-center gap-1 transition-opacity duration-300", isRecording ? "opacity-0 invisible h-0" : "opacity-100 visible")}>
        <PromptInputAction tooltip="Subir imagen">
          <button type="button" onClick={() => uploadInputRef.current?.click()}
            className="flex h-8 w-8 text-[#9CA3AF] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-600/30 hover:text-[#D1D5DB]">
            <Paperclip className="h-5 w-5" />
            <input ref={uploadInputRef} type="file" className="hidden" accept="image/*"
              onChange={(e) => handleToolbarFileInputChange(processFile, e)} />
          </button>
        </PromptInputAction>

        <PromptToolbarModeButtons
          showSearch={showSearch}
          showThink={showThink}
          showCanvas={showCanvas}
          setShowSearch={setShowSearch}
          setShowThink={setShowThink}
          setShowCanvas={setShowCanvas}
        />
      </div>

      <PromptInputAction tooltip={isLoading ? "Detener" : isRecording ? "Parar grabación" : hasContent ? "Enviar" : "Hablar"}>
        <Button variant="default" size="icon"
          className={cn("h-8 w-8 rounded-full transition-all duration-200", voiceButtonClass)}
          onClick={onVoicePrimary}
          disabled={isLoading && !hasContent}
        >
          {promptToolbarVoiceIcon(isLoading, isRecording, hasContent)}
        </Button>
      </PromptInputAction>
    </>
  );
}

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
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
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
    onSend(buildPromptPayloadWithModePrefix(input, showSearch, showThink, showCanvas), files);
    setInput(""); setFiles([]); setFilePreviews({});
  };

  const startVoiceRecording = () => {
    const g = globalThis as GlobalWithSpeechRecognition;
    const SpeechRecognitionClass =
      g.SpeechRecognition ?? g.webkitSpeechRecognition;

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
      setVoiceError(speechRecognitionErrorMessage(event.error));
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

  const assignContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      promptBoxRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref != null) ref.current = node;
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

  let textareaPlaceholder = placeholder;
  if (showSearch) textareaPlaceholder = "Buscar en la web...";
  else if (showThink) textareaPlaceholder = "Analizar en profundidad...";
  else if (showCanvas) textareaPlaceholder = "Crear en canvas...";

  return (
    <>
      {variant === "panel" && quickActions && quickActions.length > 0 && (
        <div className="prompt-panel-quick-actions">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              type="button"
              disabled={isLoading || isRecording}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => sendQuickAction(action.prompt)}
              className="prompt-panel-quick-action"
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
          variant === "panel" && "prompt-panel-box",
          isRecording && "border-red-500/70",
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
            {files
              .filter((file) => Boolean(filePreviews[file.name]))
              .map((file) => {
                const previewUrl = filePreviews[file.name];
                return (
                  <div key={file.name} className="relative w-16 h-16 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      className="absolute inset-0 h-full w-full p-0 border-0 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                      onClick={() => setSelectedImage(previewUrl)}
                      aria-label={`Ver vista previa de ${file.name}`}
                    >
                      <img src={previewUrl} alt={file.name} className="h-full w-full object-cover pointer-events-none" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFiles([]); setFilePreviews({}); }}
                      className="absolute top-1 right-1 z-10 rounded-full bg-black/70 p-0.5 hover:bg-black/90"
                      aria-label="Quitar imagen"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        <div className={cn("transition-all duration-300", isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100")}>
          <PromptInputTextarea
            placeholder={textareaPlaceholder}
            className={variant === "panel" ? "prompt-panel-textarea" : undefined}
          />
        </div>

        {isRecording && variant !== "panel" && (
          <VoiceRecorder isRecording={isRecording} />
        )}

        {voiceError && variant !== "panel" && (
          <p className="text-xs text-red-400 px-1 pb-1">{voiceError}</p>
        )}

        <PromptInputActions className="justify-between pt-2">
          {variant === "panel" ? (
            <>
              <p className="prompt-panel-helper">
                Enter envía · Shift+Enter nueva línea · Datos de este panel.
              </p>
              <div className="prompt-panel-actions">
                <Button
                  type="button"
                  className={cn(
                    "prompt-panel-send-btn inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-all",
                    "disabled:pointer-events-none disabled:opacity-35",
                  )}
                  onClick={handleSubmit}
                  disabled={!hasContent || isLoading}
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
            <PromptInputDefaultToolbar
              showSearch={showSearch}
              showThink={showThink}
              showCanvas={showCanvas}
              setShowSearch={setShowSearch}
              setShowThink={setShowThink}
              setShowCanvas={setShowCanvas}
              isRecording={isRecording}
              isLoading={isLoading}
              hasContent={hasContent}
              uploadInputRef={uploadInputRef}
              processFile={processFile}
              onVoicePrimary={() => {
                if (isRecording) stopVoiceRecording();
                else if (hasContent) handleSubmit();
                else startVoiceRecording();
              }}
            />
          )}
        </PromptInputActions>
      </PromptInput>

      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
});
PromptInputBox.displayName = "PromptInputBox";
