"use client";

import { Ban, Camera, MailPlus, MessageSquare, Plus, Search, Trash2, Users, X } from "lucide-react";

import { ImageCropper } from "@/components/image-cropper";
import { InfiniteUserList } from "@/components/infinite-user-list";
import Logo from "@/components/logo.tsx";
import { BlockUserDialog } from "@/components/modals/block-user-dialog";
import { ModeToggle } from "@/components/mode-toggle.tsx";
import { useTheme } from "@/components/theme-provider.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGroup } from "@/hooks/mutations/use-group";
import { useSearchUsers } from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { groupDescriptionSchema, groupNameSchema } from "@/lib/validators";
import { userService } from "@/services";
import { User } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

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

export function NavHeader() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [userToBlock, setUserToBlock] = useState<string | null>(null);
  const navigate = useNavigate();

  const [initiatingUserId, setInitiatingUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupErrors, setGroupErrors] = useState<GroupErrors>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  const { mutate: createGroup } = useCreateGroup();

  const trimmedSearch = debouncedSearch.trim();
  const {
    data: searchResults,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    refetch,
  } = useSearchUsers(trimmedSearch, {
    enabled: !!trimmedSearch && trimmedSearch.length >= 3,
  });

  const trimmedMemberSearch = debouncedMemberSearch.trim();
  const {
    data: memberSearchResults,
    isLoading: isMemberSearching,
    fetchNextPage: fetchNextMemberPage,
    hasNextPage: hasNextMemberPage,
    isFetchingNextPage: isFetchingNextMemberPage,
    isError: isMemberError,
    refetch: refetchMembers,
  } = useSearchUsers(trimmedMemberSearch, {
    enabled: !!trimmedMemberSearch && trimmedMemberSearch.length >= 3,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const handleCreatePrivateChat = async (userId: string) => {
    setInitiatingUserId(userId);
    try {
      await queryClient.fetchQuery({
        queryKey: ["user", userId],
        queryFn: ({ signal }) => userService.getUserById(userId, signal),
        staleTime: 1000 * 60,
      });

      setOpen(false);
      navigate(`/chat/u/${userId}`);
      setSearch("");
    } catch {
      toast.error("Failed to connect to user");
    } finally {
      setInitiatingUserId(null);
    }
  };

  const resetGroupForm = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupAvatar(null);
    setGroupAvatarPreview(null);
    setSelectedMembers([]);
    setGroupErrors({});
    setMemberSearch("");
    setDebouncedMemberSearch("");
    setIsPublic(false);
  };

  const handleDialogChange = (val: boolean) => {
    if (!val && !!initiatingUserId) return;
    if (!val) {
      setSearch("");
      setDebouncedSearch("");
      resetGroupForm();
      setActiveTab("personal");
    }
    setOpen(val);
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
        toast.error("File format not supported.", { id: "avatar-format-error" });
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

  const toggleMember = (user: User) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === user.id);
      if (exists) {
        return prev.filter((m) => m.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const validateGroupField = (field: keyof GroupErrors, value: string) => {
    const fieldSchema = field === "name" ? groupNameSchema : groupDescriptionSchema;
    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      setGroupErrors((prev) => ({ ...prev, [field]: result.error.errors[0]?.message }));
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
        setOpen(false);
        resetGroupForm();
        navigate(`/chat/${newGroup.id}`);
      },
      onSettled: () => {
        setIsCreatingGroup(false);
      },
    });
  };

  const users = (searchResults?.pages.flatMap((page) => page.data) || []).filter(
    (u) => !u.is_blocked_by_me
  );

  const memberUsers = (memberSearchResults?.pages.flatMap((page) => page.data) || []).filter(
    (u) => !u.is_blocked_by_me
  );

  const isGroupFormBusy = isCreatingGroup;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:!p-0">
            <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Logo mode={theme} width={40} height={40} />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium ">AtoiTalk</span>
              <span className="truncate text-xs">Enjoy Your Talk</span>
            </div>
            <Dialog open={open} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button
                  className="size-8 group-data-[collapsible=icon]:hidden"
                  variant="outline"
                  size="icon"
                >
                  <MailPlus className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent
                className={`sm:max-w-[425px] h-[600px] flex flex-col ${initiatingUserId || isGroupFormBusy ? "[&>button]:pointer-events-none [&>button]:opacity-50" : ""}`}
                onPointerDownOutside={(e) => {
                  if (initiatingUserId || isGroupFormBusy) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                  if (initiatingUserId || isGroupFormBusy) e.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full flex-1 flex flex-col"
                >
                  <TabsList
                    className={`grid w-full grid-cols-2 ${initiatingUserId || isGroupFormBusy ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="group">Group</TabsTrigger>
                  </TabsList>
                  <div className="flex-1 overflow-hidden mt-4 relative">
                    <TabsContent
                      value="personal"
                      className="absolute inset-0 data-[state=inactive]:hidden"
                    >
                      <div className="grid gap-4 h-full grid-rows-[auto_1fr]">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={!!initiatingUserId}
                          />
                        </div>
                        <InfiniteUserList
                          users={users}
                          isLoading={isSearching}
                          isError={!!isError}
                          hasNextPage={!!hasNextPage}
                          isFetchingNextPage={!!isFetchingNextPage}
                          fetchNextPage={() => fetchNextPage()}
                          refetch={() => refetch()}
                          emptyMessage={
                            debouncedSearch ? "No users found." : "Type to search users."
                          }
                          loadingHeight="h-11"
                          showBorder={false}
                          resetKey={debouncedSearch}
                          renderActions={(user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors group gap-2"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                                <Avatar>
                                  <AvatarImage src={user.avatar || undefined} />
                                  <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col text-left min-w-0 w-full">
                                  <span className="text-sm font-medium truncate">
                                    {user.full_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    @{user.username}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-8"
                                  onClick={() => setUserToBlock(user.id)}
                                  title="Block User"
                                  disabled={!!initiatingUserId}
                                >
                                  <Ban className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-8 relative"
                                  onClick={() => handleCreatePrivateChat(user.id)}
                                  title="Start Chat"
                                  disabled={!!initiatingUserId}
                                >
                                  {initiatingUserId === user.id ? (
                                    <Spinner className="size-4" />
                                  ) : (
                                    <MessageSquare className="size-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent
                      value="group"
                      className="absolute inset-0 data-[state=inactive]:hidden"
                    >
                      <ScrollArea className="h-full">
                        <div className="grid gap-4 pb-4">
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
                                <DropdownMenuItem
                                  onSelect={() => groupAvatarInputRef.current?.click()}
                                >
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

                          <div className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <Label>Members ({selectedMembers.length})</Label>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 h-6 w-6 p-0 hover:bg-transparent"
                                onClick={() => setAddMemberOpen(true)}
                                type="button"
                              >
                                <Plus className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
                              </Button>
                            </div>
                            {selectedMembers.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
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
                                    <span className="max-w-[80px] truncate">
                                      {member.full_name}
                                    </span>
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
                            )}
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleCreateGroup}
                            disabled={isGroupFormBusy || !groupName.trim()}
                          >
                            {isCreatingGroup ? (
                              <>
                                <Spinner className="size-4 mr-2" />
                                Creating...
                              </>
                            ) : (
                              <>Create Group</>
                            )}
                          </Button>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>
            <ModeToggle />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
      <BlockUserDialog
        open={!!userToBlock}
        onOpenChange={(val) => {
          if (!val) setUserToBlock(null);
        }}
        userId={userToBlock}
      />
      <ImageCropper
        image={selectedImage}
        open={cropModalOpen}
        onOpenChange={(val) => {
          setCropModalOpen(val);
          if (!val) setSelectedImage(null);
        }}
        onCropComplete={handleCropComplete}
      />
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="gap-0 p-0 overflow-hidden !max-w-[300px] w-[85%] rounded-lg">
          <DialogHeader className="p-4 pb-2 text-left">
            <DialogTitle>Add Members</DialogTitle>
          </DialogHeader>
          <div className="px-4 mb-2">
            <div className="relative mt-3">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users to add..."
                className="pl-8"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="h-[300px]">
            <InfiniteUserList
              users={memberUsers}
              isLoading={isMemberSearching}
              isError={!!isMemberError}
              hasNextPage={!!hasNextMemberPage}
              isFetchingNextPage={!!isFetchingNextMemberPage}
              fetchNextPage={() => fetchNextMemberPage()}
              refetch={() => refetchMembers()}
              emptyMessage={debouncedMemberSearch ? "No users found." : "Type to search users."}
              loadingHeight="h-10"
              showBorder={false}
              resetKey={debouncedMemberSearch}
              renderActions={(user) => {
                const isSelected = selectedMembers.some((m) => m.id === user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 mx-4 hover:bg-muted rounded-md transition-colors cursor-pointer"
                    onClick={() => toggleMember(user)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <Avatar>
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 w-full text-left">
                        <span className="text-sm font-medium truncate">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
