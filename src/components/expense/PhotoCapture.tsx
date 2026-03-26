import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { extractReceiptData, type ExtractedReceipt } from "@/services/receiptExtractor";
import { toast } from "sonner";

interface PhotoCaptureProps {
  value: File | string | null;
  onChange: (file: File | null) => void;
  onExtracted?: (data: ExtractedReceipt) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PhotoCapture({ value, onChange, onExtracted }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);

  const previewUrl =
    value instanceof File
      ? URL.createObjectURL(value)
      : typeof value === "string"
        ? value
        : null;

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
    if (inputRef.current) inputRef.current.value = "";

    // Auto-extract if we have a file and callback
    if (file && onExtracted) {
      setExtracting(true);
      try {
        const data = await extractReceiptData(file);
        onExtracted(data);
        toast.success("Dados extraidos automaticamente!");
      } catch (err) {
        console.error("Extraction failed:", err);
        toast.error("Nao foi possivel extrair dados da imagem");
      } finally {
        setExtracting(false);
      }
    }
  };

  const handleExtract = async () => {
    if (!(value instanceof File) || !onExtracted) return;
    setExtracting(true);
    try {
      const data = await extractReceiptData(value);
      onExtracted(data);
      toast.success("Dados extraidos automaticamente!");
    } catch (err) {
      console.error("Extraction failed:", err);
      toast.error("Nao foi possivel extrair dados da imagem");
    } finally {
      setExtracting(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Comprovante
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          <img
            src={previewUrl}
            alt="Comprovante"
            className="h-40 w-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full",
              "bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80",
            )}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-between px-3 py-2">
            {value instanceof File && (
              <p className="truncate text-xs text-muted-foreground">
                {value.name} &middot; {formatFileSize(value.size)}
              </p>
            )}
            {value instanceof File && onExtracted && (
              <button
                type="button"
                onClick={handleExtract}
                disabled={extracting}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                  "bg-gradient-to-r from-primary to-[#7C3AED] text-white",
                  "transition-all hover:opacity-90 active:scale-95",
                  "disabled:opacity-50",
                )}
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Extraindo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Extrair com IA
                  </>
                )}
              </button>
            )}
          </div>

          {/* Extracting overlay */}
          {extracting && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Analisando comprovante...
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl",
            "border-2 border-dashed border-border bg-card/50 px-4 py-8",
            "text-muted-foreground transition-colors",
            "hover:border-primary/50 hover:text-foreground",
          )}
        >
          <Camera className="h-8 w-8" />
          <span className="text-sm">Tirar foto ou escolher arquivo</span>
          {onExtracted && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Sparkles className="h-3 w-3" />
              IA detecta gastos automaticamente
            </span>
          )}
        </button>
      )}
    </div>
  );
}
