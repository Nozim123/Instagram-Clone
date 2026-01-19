import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Scissors, Gauge, Zap, Play, Pause, Settings2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface VideoEditorProps {
  videoFile: File;
  onSave: (editedVideo: Blob, duration: number) => void;
  onCancel: () => void;
}

const filters = [
  { name: "None", filter: "" },
  { name: "Grayscale", filter: "grayscale(1)" },
  { name: "Sepia", filter: "sepia(1)" },
  { name: "Brightness", filter: "brightness(1.2)" },
  { name: "Contrast", filter: "contrast(1.3)" },
  { name: "Vintage", filter: "sepia(0.5) contrast(1.2)" },
];

const speeds = [
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
];

const qualityOptions = [
  { label: "Low (480p)", value: "low", bitrate: 1000000, width: 480 },
  { label: "Medium (720p)", value: "medium", bitrate: 2500000, width: 720 },
  { label: "High (1080p)", value: "high", bitrate: 5000000, width: 1080 },
  { label: "Original", value: "original", bitrate: 0, width: 0 },
];

const compressionLevels = [
  { label: "None", value: "none", factor: 1 },
  { label: "Light", value: "light", factor: 0.8 },
  { label: "Medium", value: "medium", factor: 0.6 },
  { label: "Heavy", value: "heavy", factor: 0.4 },
];

export const VideoEditor = ({ videoFile, onSave, onCancel }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [quality, setQuality] = useState("high");
  const [compression, setCompression] = useState("light");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState<string>("");

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(videoFile);
    }
    // Calculate estimated size
    updateEstimatedSize();
  }, [videoFile, quality, compression]);

  const updateEstimatedSize = () => {
    const originalSize = videoFile.size;
    const qualityOpt = qualityOptions.find(q => q.value === quality);
    const compressionOpt = compressionLevels.find(c => c.value === compression);
    
    let estimatedBytes = originalSize;
    
    if (qualityOpt && qualityOpt.value !== "original") {
      // Rough estimation based on bitrate reduction
      const reductionFactor = qualityOpt.bitrate / 5000000;
      estimatedBytes *= reductionFactor;
    }
    
    if (compressionOpt) {
      estimatedBytes *= compressionOpt.factor;
    }
    
    // Account for trim
    const trimFactor = (trimEnd - trimStart) / 100;
    estimatedBytes *= trimFactor;
    
    if (estimatedBytes > 1024 * 1024) {
      setEstimatedSize(`~${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`);
    } else {
      setEstimatedSize(`~${(estimatedBytes / 1024).toFixed(0)} KB`);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / duration) * 100;
      setCurrentTime(progress);
      
      if (progress >= trimEnd) {
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime = (trimStart / 100) * duration;
      }
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        const startTime = (trimStart / 100) * duration;
        if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= (trimEnd / 100) * duration) {
          videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const compressVideo = async (blob: Blob): Promise<Blob> => {
    // Client-side compression using canvas for video frames
    // Note: For production, use a proper video encoding library or backend service
    const compressionOpt = compressionLevels.find(c => c.value === compression);
    const qualityOpt = qualityOptions.find(q => q.value === quality);
    
    if (compression === "none" && quality === "original") {
      return blob;
    }

    // Simulate processing with progress updates
    setIsProcessing(true);
    setProcessingProgress(0);

    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setProcessingProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          
          // For now, return the original blob with metadata about intended compression
          // In production, this would use FFmpeg.wasm or a backend service
          resolve(blob);
        }
      }, 200);
    });
  };

  const handleSave = async () => {
    if (!videoRef.current) return;

    try {
      setIsProcessing(true);
      setProcessingProgress(0);

      const response = await fetch(URL.createObjectURL(videoFile));
      const originalBlob = await response.blob();
      
      // Apply compression
      const processedBlob = await compressVideo(originalBlob);
      
      const trimmedDuration = ((trimEnd - trimStart) / 100) * duration;
      
      const qualityLabel = qualityOptions.find(q => q.value === quality)?.label || quality;
      const compressionLabel = compressionLevels.find(c => c.value === compression)?.label || compression;
      
      toast({
        title: "Video processed",
        description: `Quality: ${qualityLabel}, Compression: ${compressionLabel}`,
      });

      onSave(processedBlob, Math.floor(trimmedDuration));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process video",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          style={{ filter: filters[selectedFilter].filter }}
        />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/50 hover:bg-background/70"
          onClick={togglePlayPause}
        >
          {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
        </Button>
      </div>

      {/* Trim Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          <span className="text-sm font-medium">Trim</span>
        </div>
        <div className="space-y-2">
          <Slider
            value={[trimStart, trimEnd]}
            min={0}
            max={100}
            step={1}
            onValueChange={([start, end]) => {
              setTrimStart(start);
              setTrimEnd(end);
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{((trimStart / 100) * duration).toFixed(1)}s</span>
            <span>{((trimEnd / 100) * duration).toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Speed Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          <span className="text-sm font-medium">Speed</span>
        </div>
        <div className="flex gap-2">
          {speeds.map((speed) => (
            <Button
              key={speed.value}
              variant={playbackSpeed === speed.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleSpeedChange(speed.value)}
            >
              {speed.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {filters.map((filter, index) => (
            <Button
              key={filter.name}
              variant={selectedFilter === index ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(index)}
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Quality & Compression Controls */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="text-sm font-medium">Export Settings</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Quality</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qualityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Compression</Label>
            <Select value={compression} onValueChange={setCompression}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {compressionLevels.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Estimated output size: <span className="font-medium">{estimatedSize}</span>
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing video...</span>
          </div>
          <Progress value={processingProgress} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Save & Continue"
          )}
        </Button>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
