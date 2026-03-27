import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Camera, FileUp, Loader2, Sparkles, X, File as FileIcon, Image } from "lucide-react";
import { extractReceiptData, type ExtractedReceipt } from "@/services/receiptExtractor";
import { toast } from "sonner";

interface PhotoCaptureProps {
  value: File[] | null;
  onChange: (files: File[] | null) => void;
  onExtracted?: (data: ExtractedReceipt) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export default function PhotoCapture({ value, onChange, onExtracted }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);

  const files = value ?? [];

  const handleClick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files ? Array.from(e.target.files) : [];
    if (newFiles.length === 0) return;

    const merged = [...files, ...newFiles];
    onChange(merged);
    if (inputRef.current) inputRef.current.value = "";

    // Auto-extract from first image if callback provided
    if (onExtracted && files.length === 0) {
      const firstImage = newFiles.find(isImage);
      if (firstImage) {
        setExtracting(true);
        try {
          const data = await extractReceiptData(firstImage);
          onExtracted(data);
          toast.success("Dados extraidos automaticamente!");
        } catch (err) {
          console.error("Extraction failed:", err);
          toast.error("Nao foi possivel extrair dados da imagem");
        } finally {
          setExtracting(false);
        }
      }
    }
  };

  const handleRemove = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : null);
  };

  const handleExtract = async (file: File) => {
    if (!onExtracted || !isImage(file)) return;
    setExtracting(true);
    try {
      const data = await extractReceiptData(file);
      onExtracted(data);
      toast.success("Dados extraidos!");
    } catch {
      toast.error("Nao foi possivel extrair dados");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Comprovantes / Arquivos
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="*/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              {/* Thumbnail or icon */}
              {isImage(file) ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {isImage(file) && onExtracted && (
                  <button
                    type="button"
                    onClick={() => handleExtract(file)}
                    disabled={extracting}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-secondary/10 disabled:opacity-50"
                    title="Extrair com IA"
                  >
                    {extracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add files button */}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-xl",
          "border-2 border-dashed border-border bg-card/50 px-4 py-6",
          "text-muted-foreground transition-colors",
          "hover:border-primary/50 hover:text-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <Image className="h-5 w-5" />
          <FileUp className="h-5 w-5" />
        </div>
        <div className="text-left">
          <span className="text-sm font-medium">
            {files.length > 0 ? "Adicionar mais arquivos" : "Foto, imagem ou arquivo"}
          </span>
          {onExtracted && files.length === 0 && (
            <p className="flex items-center gap-1 text-xs text-primary">
              <Sparkles className="h-3 w-3" />
              IA detecta gastos automaticamente
            </p>
          )}
        </div>
      </button>

      {/* Extracting overlay */}
      {extracting && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/10 px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-secondary" />
          <span className="text-sm text-secondary">Analisando...</span>
        </div>
      )}
    </div>
  );
}
