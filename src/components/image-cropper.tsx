import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import "cropperjs/dist/cropper.css";
import { useRef } from "react";
import { Cropper, ReactCropperElement } from "react-cropper";

interface ImageCropperProps {
  image: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function ImageCropper({ image, open, onOpenChange, onCropComplete }: ImageCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);

  const handleSave = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    cropper
      .getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingQuality: "high",
      })
      .toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
            onOpenChange(false);
          } else {
            toast.error("Failed to process image");
          }
        },
        "image/jpeg",
        0.9
      );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[400px] w-[85%] max-h-[85vh] p-0 gap-0 overflow-hidden bg-background rounded-lg z-[70]"
        overlayClassName="z-[69]"
      >
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit Profile Photo</DialogTitle>
        </DialogHeader>

        <style>
          {`
                        .cropper-view-box,
                        .cropper-face {
                            border-radius: 50%;
                        }
                    `}
        </style>
        <div className="relative w-full h-[400px] bg-black flex items-center justify-center">
          {image && (
            <Cropper
              src={image}
              style={{ height: 400, width: "100%" }}
              initialAspectRatio={1}
              aspectRatio={1}
              guides={true}
              ref={cropperRef}
              viewMode={1}
              dragMode="move"
              scalable={true}
              cropBoxMovable={true}
              cropBoxResizable={true}
              background={false}
              responsive={true}
              autoCropArea={1}
              checkOrientation={false}
            />
          )}
        </div>

        <DialogFooter className="p-4 border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
