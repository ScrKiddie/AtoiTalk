import { ImageCropper } from "@/components/image-cropper";
import { InfiniteGroupList } from "@/components/infinite-group-list";
import { UserSelectionDialog } from "@/components/modals/user-selection-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGroup } from "@/hooks/mutations/use-group";
import { useJoinGroup } from "@/hooks/mutations/use-group-join";
import { useSearchPublicGroups } from "@/hooks/queries/use-chat";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { groupDescriptionSchema, groupNameSchema } from "@/lib/validators";
import { PublicGroupDTO, User } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, Globe, Loader2, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

interface PublicGroupSearchDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
}

const errorVariants = {
  hidden: { opacity: 0, y: -5, height: 0, marginTop: 0 },
  visible: { opacity: 1, y: 0, height: "auto", marginTop: 8 },
  exit: { opacity: 0, y: -5, height: 0, marginTop: 0 },
};

const groupSchema = z.object({
  name: groupNameSchema,
  description: groupDescriptionSchema,
});

type GroupErrors = {
  name?: string;
  description?: string;
};

export function PublicGroupSearchDialog({ isOpen, onClose }: PublicGroupSearchDialogProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("find");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { mutate: joinGroup, isPending: isJoining } = useJoinGroup();
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

  const trimmedSearch = debouncedSearch.trim();
  const {
    data: searchResults,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    refetch,
  } = useSearchPublicGroups(trimmedSearch, {
    enabled: activeTab === "find" && !!trimmedSearch && trimmedSearch.length >= 3,
  });

  const { mutate: createGroup } = useCreateGroup();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupErrors, setGroupErrors] = useState<GroupErrors>({});
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtEndRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setDebouncedSearch("");
      setActiveTab("find");
      resetGroupForm();
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    isAtEndRef.current = Math.abs(scrollWidth - clientWidth - scrollLeft) < 10;
  };

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        viewport.scrollLeft += e.deltaY;
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [selectedMembers.length > 0]);

  useEffect(() => {
    if (isAtEndRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [selectedMembers.length]);

  const handleJoin = (group: PublicGroupDTO) => {
    if (group.is_member) {
      navigate(`/chat/${group.chat_id}`);
      onClose(false);
      return;
    }

    setJoiningGroupId(group.id);
    joinGroup(group.id, {
      onSuccess: () => {
        navigate(`/chat/${group.chat_id}`);
        onClose(false);
      },
      onSettled: () => {
        setJoiningGroupId(null);
      },
    });
  };

  const groups = (searchResults?.pages.flatMap((page) => page.data) || []).filter((g) => !!g);

  const resetGroupForm = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupAvatar(null);
    setGroupAvatarPreview(null);
    setSelectedMembers([]);
    setGroupErrors({});
    setIsPublic(false);
    setIsCreatingGroup(false);
  };

  const handleGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      const allowedMimes = ["image/png", "image/jpeg", "image/pjpeg", "image/apng"];
      const allowedExts = [".png", ".jpg", ".jpeg", ".jpe", ".jfif", ".jif", ".jfi"];
      const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

      const isMimeValid = allowedMimes.includes(file.type);
      const isExtValid = allowedExts.includes(fileExt);

      if (!isMimeValid && !isExtValid) {
        toast.error("File format not supported.", {
          id: "avatar-format-error",
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("File exceeds 2MB limit", { id: "avatar-size-error" });
        return;
      }

      setOriginalFilename(file.name);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedImage(reader.result?.toString() || null);
        setCropModalOpen(true);
        e.target.value = "";
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (blob: Blob) => {
    const previewUrl = URL.createObjectURL(blob);
    setGroupAvatar(blob as File);
    setGroupAvatarPreview(previewUrl);
    setCropModalOpen(false);
  };

  const handleDeleteGroupAvatar = () => {
    setGroupAvatar(null);
    setGroupAvatarPreview(null);
  };

  const handleAddMembers = (users: User[]) => {
    setSelectedMembers((prev) => [...prev, ...users]);
    setAddMemberOpen(false);
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const validateGroupField = (field: keyof GroupErrors, value: string) => {
    const fieldSchema = field === "name" ? groupNameSchema : groupDescriptionSchema;
    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      setGroupErrors((prev) => ({
        ...prev,
        [field]: result.error.errors[0]?.message,
      }));
    } else {
      setGroupErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreateGroup = () => {
    const result = groupSchema.safeParse({
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
    });

    if (!result.success) {
      const errors: GroupErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof GroupErrors;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setGroupErrors(errors);
      return;
    }

    if (selectedMembers.length < 1) {
      toast.error("Please select at least 1 member");
      return;
    }

    setGroupErrors({});
    setIsCreatingGroup(true);

    const formData = new FormData();
    formData.append("name", groupName.trim());
    if (groupDescription.trim()) {
      formData.append("description", groupDescription.trim());
    }
    if (groupAvatar) {
      const filename = originalFilename || "avatar.jpg";
      formData.append("avatar", groupAvatar, filename);
    }
    selectedMembers.forEach((member) => {
      formData.append("member_ids", member.id);
    });
    formData.append("is_public", isPublic.toString());

    createGroup(formData, {
      onSuccess: (newGroup) => {
        onClose(false);
        resetGroupForm();
        navigate(`/chat/${newGroup.id}`);
      },
      onSettled: () => {
        setIsCreatingGroup(false);
      },
    });
  };

  const isGroupFormBusy = isCreatingGroup;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
        <DialogContent
          className={`max-w-[85%] sm:max-w-[425px] h-[600px] flex flex-col overflow-hidden z-[66] ${
            isGroupFormBusy ? "[&>button]:pointer-events-none [&>button]:opacity-50" : ""
          }`}
          overlayClassName="z-[65]"
          onPointerDownOutside={(e) => {
            if (isGroupFormBusy) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isGroupFormBusy) e.preventDefault();
          }}
        >
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>Groups</DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <TabsList
              className={`grid w-full grid-cols-2 shrink-0 ${
                isGroupFormBusy ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <TabsTrigger value="find">Find Group</TabsTrigger>
              <TabsTrigger value="create">Create Group</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4 relative">
              <TabsContent
                value="find"
                className="absolute inset-0 data-[state=inactive]:hidden flex flex-col min-h-0"
              >
                <div className="space-y-[1.5px] min-h-0 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search public groups..."
                      className="pl-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus={activeTab === "find"}
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 bg-muted/10 -mx-6 px-6 mt-4">
                  <InfiniteGroupList
                    groups={groups}
                    isLoading={isSearching}
                    isError={!!isError}
                    hasNextPage={!!hasNextPage}
                    isFetchingNextPage={!!isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                    refetch={refetch}
                    emptyMessage={
                      debouncedSearch ? "No groups found." : "Type to search public groups."
                    }
                    loadingHeight="h-10"
                    showBorder={false}
                    skeletonButtonCount={1}
                    skeletonCount={5}
                    resetKey={debouncedSearch}
                    renderActions={(group) => {
                      const isCurrentJoining = joiningGroupId === group.id;

                      return (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors gap-2"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                            <Avatar>
                              <AvatarImage src={group.avatar || undefined} />
                              <AvatarFallback>
                                <Globe className="size-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0 w-full text-left">
                              <span className="text-sm font-medium truncate">{group.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate max-w-[120px]">
                                  {group.description || "No description"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size={group.is_member ? "icon" : "sm"}
                            variant={group.is_member ? "ghost" : "default"}
                            className={group.is_member ? "size-8" : "h-8 text-xs"}
                            onClick={() => handleJoin(group)}
                            disabled={isCurrentJoining || (isJoining && !!joiningGroupId)}
                          >
                            {isCurrentJoining ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : group.is_member ? (
                              <Check className="size-4 text-primary" />
                            ) : (
                              "Join"
                            )}
                          </Button>
                        </div>
                      );
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="create"
                className="absolute inset-0 data-[state=inactive]:hidden flex flex-col min-h-0"
              >
                <ScrollArea className="h-full pr-4 -mr-4">
                  <div className="grid gap-4 pb-4 pr-1">
                    <div className="flex flex-col items-center gap-4">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <div
                            className={cn(
                              "relative group cursor-pointer",
                              isGroupFormBusy && "pointer-events-none opacity-50"
                            )}
                          >
                            <Avatar className="h-24 w-24">
                              <AvatarImage src={groupAvatarPreview || undefined} />
                              <AvatarFallback className="text-4xl">
                                <Users className="size-10 text-white" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="center"
                          side="bottom"
                          sideOffset={-5}
                          className="z-[100]"
                        >
                          <DropdownMenuItem onSelect={() => groupAvatarInputRef.current?.click()}>
                            <Camera className="mr-2 h-4 w-4" />
                            {groupAvatarPreview ? "Change Photo" : "Upload Photo"}
                          </DropdownMenuItem>
                          {groupAvatarPreview && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={handleDeleteGroupAvatar}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Photo
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <input
                        ref={groupAvatarInputRef}
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/pjpeg,image/apng,.png,.jpg,.jpeg,.jpe,.jfif,.jif,.jfi"
                        onChange={handleGroupAvatarChange}
                      />
                    </div>

                    <div className="flex flex-col">
                      <Label htmlFor="group-name">Group Name</Label>
                      <Input
                        id="group-name"
                        placeholder="Enter group name"
                        value={groupName}
                        className="mt-3"
                        onChange={(e) => {
                          setGroupName(e.target.value);
                          validateGroupField("name", e.target.value);
                        }}
                        disabled={isGroupFormBusy}
                      />
                      <AnimatePresence mode="wait">
                        {groupErrors.name && (
                          <motion.p
                            variants={errorVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                          >
                            {groupErrors.name}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col">
                      <Label htmlFor="group-description">Description</Label>
                      <Textarea
                        id="group-description"
                        placeholder="Enter group description (optional)"
                        value={groupDescription}
                        className="resize-none min-h-[80px] max-h-[120px] overflow-y-auto break-words mt-3"
                        onChange={(e) => {
                          setGroupDescription(e.target.value);
                          validateGroupField("description", e.target.value);
                        }}
                        disabled={isGroupFormBusy}
                      />
                      <AnimatePresence mode="wait">
                        {groupErrors.description && (
                          <motion.p
                            variants={errorVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                          >
                            {groupErrors.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label>Public Group</Label>
                        <span className="text-xs text-muted-foreground">
                          Anyone can find and join
                        </span>
                      </div>
                      <Switch
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                        disabled={isGroupFormBusy}
                      />
                    </div>

                    <div className="flex flex-col min-w-0 w-full">
                      <div className="flex items-center justify-between">
                        <Label>Members ({selectedMembers.length})</Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 h-6 w-6 p-0 hover:bg-transparent"
                          onClick={() => setAddMemberOpen(true)}
                          type="button"
                          disabled={isGroupFormBusy}
                        >
                          <Plus className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                      </div>
                      {selectedMembers.length > 0 && (
                        <ScrollArea
                          className="w-full whitespace-nowrap pt-4"
                          viewportRef={scrollRef}
                          onScroll={handleScroll}
                        >
                          <div className="flex gap-2 w-max pr-4">
                            {selectedMembers.map((member) => (
                              <Badge
                                key={member.id}
                                variant="secondary"
                                className="pl-1 pr-1 gap-1"
                              >
                                <Avatar className="size-5">
                                  <AvatarImage src={member.avatar || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {member.full_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="max-w-[80px] truncate">{member.full_name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-4 hover:bg-destructive/20"
                                  onClick={() => removeMember(member.id)}
                                  disabled={isGroupFormBusy}
                                >
                                  <X className="size-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                          <ScrollBar orientation="horizontal" className="top-0" />
                        </ScrollArea>
                      )}
                    </div>
                    <Button
                      className="w-full relative"
                      onClick={handleCreateGroup}
                      disabled={isGroupFormBusy || !groupName.trim()}
                    >
                      <span className={isCreatingGroup ? "opacity-0" : ""}>Create Group</span>
                      {isCreatingGroup && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </Button>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ImageCropper
        image={selectedImage}
        open={cropModalOpen}
        onOpenChange={(val) => {
          setCropModalOpen(val);
          if (!val) setSelectedImage(null);
        }}
        onCropComplete={handleCropComplete}
      />

      <UserSelectionDialog
        isOpen={addMemberOpen}
        onClose={setAddMemberOpen}
        onConfirm={handleAddMembers}
        title="Add Members to Group"
        existingMemberIds={selectedMembers.map((m) => m.id)}
        confirmLabel="Add Selected"
      />
    </>
  );
}
