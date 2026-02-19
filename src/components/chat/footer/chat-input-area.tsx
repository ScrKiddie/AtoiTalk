import { Button } from "@/components/ui/button";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { File as FileIcon, SendHorizonal, Shredder, Smile } from "lucide-react";
import React from "react";

interface ChatInputAreaProps {
  isGlobalUploading: boolean;
  isSending: boolean;
  isEditing: boolean;
  isLoading?: boolean;
  attachmentMode: boolean;
  onAttachmentModeChange: (mode: boolean) => void;
  isEmojiOpen: boolean;
  onEmojiOpenChange: (open: boolean) => void;
  onEmojiSelect: (emoji: { native: string }) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  newMessageText: string;
  onNewMessageTextChange: (text: string) => void;
  onSendMessage: () => void;
  onTyping: () => void;
}

export function ChatInputArea({
  isGlobalUploading,
  isSending,
  isEditing,
  isLoading,
  attachmentMode,
  onAttachmentModeChange,
  isEmojiOpen,
  onEmojiOpenChange,
  onEmojiSelect,
  textareaRef,
  newMessageText,
  onNewMessageTextChange,
  onSendMessage,
  onTyping,
}: ChatInputAreaProps) {
  const disabled = isGlobalUploading || isSending || isEditing || isLoading;

  return (
    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-xl border shadow-sm w-full">
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          disabled={disabled}
          className={`size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted ${attachmentMode ? "bg-muted text-foreground" : ""}`}
          onClick={() => onAttachmentModeChange(!attachmentMode)}
        >
          {attachmentMode ? <Shredder className="size-5" /> : <FileIcon className="size-5" />}
        </Button>

        <Popover open={isEmojiOpen} onOpenChange={onEmojiOpenChange}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={disabled}
              className={`size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted ${isEmojiOpen ? "bg-muted text-foreground" : ""}`}
            >
              <Smile className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-fit p-0" side="top" align="start">
            <EmojiPicker
              className="h-[342px]"
              onEmojiSelect={(emoji: unknown) => {
                const e = emoji as { native?: string; emoji?: string };
                if (e.native || e.emoji) {
                  onEmojiSelect({ native: e.native || e.emoji || "" });
                }
              }}
            >
              <div className="p-2 border-b">
                <EmojiPickerSearch />
              </div>
              <EmojiPickerContent />
              <div className="p-2 border-t">
                <EmojiPickerFooter />
              </div>
            </EmojiPicker>
          </PopoverContent>
        </Popover>
      </div>

      <Textarea
        ref={textareaRef}
        value={newMessageText}
        onChange={(e) => {
          onNewMessageTextChange(e.target.value);
          onTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
          }
        }}
        placeholder={isEditing ? "Edit message..." : "Type a message..."}
        className="min-h-[20px] max-h-[140px] py-2 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none px-0 shadow-none scrollbar-thin"
        rows={1}
        disabled={disabled}
      />

      <Button
        size="icon"
        disabled={disabled || (!newMessageText.trim() && !attachmentMode)}
        className="size-9 rounded-full shrink-0"
        onClick={onSendMessage}
      >
        <SendHorizonal className="size-5" />
      </Button>
    </div>
  );
}
