import { InfiniteUserList } from "@/components/infinite-user-list";
import { DeleteAccountDialog } from "@/components/modals/delete-account-dialog";
import { UnblockUserDialog } from "@/components/modals/unblock-user-dialog";
import { LoadingModal } from "@/components/ui/loading-modal";
import {
  useBlockedUsers,
  useChangeEmail,
  useChangePassword,
  useCurrentUser,
  useLogout,
  useSendOTP,
  useUpdateProfile,
} from "@/hooks/queries";
import { toast } from "@/lib/toast";
import { useUIStore } from "@/store";
import { ApiError } from "@/types";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";

import { Captcha, CaptchaHandle } from "@/components/captcha";
import { getInitials } from "@/lib/avatar-utils";
import {
  bioSchema,
  emailSchema,
  nameSchema,
  otpSchema,
  passwordSchema,
  usernameSchema,
} from "@/lib/validators";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { ImageCropper } from "./image-cropper";

import { GlobalLightbox } from "@/components/ui/lightbox";
import {
  AlertTriangle,
  Ban,
  Camera,
  ChevronsUpDown,
  CircleUserRound,
  DoorOpen,
  Eye,
  Home,
  LayoutDashboard,
  Loader2,
  Lock,
  Search,
  Settings,
  Trash2,
  Unlock,
} from "lucide-react";

import { PasswordInput } from "@/components/ui/password-input";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { User } from "@/types";
import { useState } from "react";

const profileSchema = z.object({
  username: usernameSchema.optional(),
  name: nameSchema,
  bio: bioSchema,
});

const changeEmailSchema = z.object({
  newEmail: emailSchema,
  otp: otpSchema,
});

const baseChangePasswordSchema = z.object({
  oldPassword: z.union([passwordSchema, z.literal("")]),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
});

const changePasswordSchema = baseChangePasswordSchema.refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  }
);

type ProfileErrors = {
  username?: string;
  name?: string;
  bio?: string;
};

type EmailErrors = {
  newEmail?: string;
  otp?: string;
};

type SecurityErrors = {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const errorVariants = {
  hidden: { opacity: 0, y: -5, height: 0, marginTop: 0 },
  visible: { opacity: 1, y: 0, height: "auto", marginTop: 12 },
  exit: { opacity: 0, y: -5, height: 0, marginTop: 0 },
};

export function NavFooter({
  current,
  activeMenu,
  setActiveMenu,
  mode = "app",
}: {
  current: User;
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  mode?: "app" | "admin";
}) {
  const [openAccount, setOpenAccount] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openLogout, setOpenLogout] = useState(false);
  const [openChangeEmail, setOpenChangeEmail] = useState(false);
  const [openBlocked, setOpenBlocked] = useState(false);
  const [blockedSearch, setBlockedSearch] = useState("");
  const [debouncedBlockedSearch, setDebouncedBlockedSearch] = useState("");
  const [userToUnblock, setUserToUnblock] = useState<string | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isModalAvatarLoaded, setIsModalAvatarLoaded] = useState(false);
  const [openDeleteAccount, setOpenDeleteAccount] = useState(false);

  const navigate = useNavigate();
  const setGlobalLoading = useUIStore((state) => state.setGlobalLoading);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setGlobalLoading(true, "Logging Out");
    setIsLogoutLoading(true);

    setTimeout(async () => {
      await logout();
      navigate("/login");

      setGlobalLoading(false);
      setIsLogoutLoading(false);
    }, 2000);
  };

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isCaptchaSolving, setIsCaptchaSolving] = useState(true);
  const captchaRef = useRef<CaptchaHandle>(null);

  const menuId = "footer-menu";

  const { data: latestUser, refetch: refetchUser } = useCurrentUser();
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();
  const { mutate: changeEmail, isPending: isChangingEmail } = useChangeEmail();
  const { mutate: sendOTP, isPending: isSendingOTP } = useSendOTP();
  const logout = useLogout();

  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isSecuritySubmitting, setIsSecuritySubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBlockedSearch(blockedSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [blockedSearch]);

  const trimmedBlockedSearch = debouncedBlockedSearch.trim();
  const {
    data: blockedUsersData,
    isLoading: isLoadingBlocked,
    refetch: refetchBlocked,
    hasNextPage: hasNextBlockedPage,
    fetchNextPage: fetchNextBlockedPage,
    isFetchingNextPage: isFetchingNextBlockedPage,
    isError: isBlockedError,
  } = useBlockedUsers(trimmedBlockedSearch, {
    enabled: openBlocked && (!trimmedBlockedSearch || trimmedBlockedSearch.length >= 3),
  });

  const handleBlockedClick = async () => {
    setIsLoadingBlockedUsers(true);
    try {
      const result = await refetchBlocked();
      if (result.isError) {
        toast.error("Failed to load blocked users", { id: "blocked-load-error" });
        return;
      }
      setOpenBlocked(true);
    } catch {
      toast.error("An error occurred", { id: "blocked-catch-error" });
    } finally {
      setIsLoadingBlockedUsers(false);
    }
  };

  const blockedUsers = blockedUsersData?.pages.flatMap((page) => page.data) || [];

  const activeUser = latestUser || current;

  const [accountData, setAccountData] = useState({
    name: activeUser.full_name,
    username: activeUser.username,
    bio: activeUser.bio || "",
    avatarFile: null as File | null,
    avatarPreview: activeUser.avatar || null,
    deleteAvatar: false,
  });

  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});

  const handleAccountModalOpen = (open: boolean) => {
    if (open) {
      setIsProfileSubmitting(false);
      setAccountData({
        name: activeUser.full_name,
        username: activeUser.username,
        bio: activeUser.bio || "",
        avatarFile: null,
        avatarPreview: activeUser.avatar || null,
        deleteAvatar: false,
      });
      setIsModalAvatarLoaded(false);
      setProfileErrors({});
    }
    setOpenAccount(open);
  };

  const handleAccountClick = async () => {
    setIsLoadingAccount(true);
    try {
      const result = await refetchUser();
      if (result.isError) {
        toast.error("Failed to load profile", { id: "profile-load-error" });
        return;
      }
      handleAccountModalOpen(true);
    } catch {
      toast.error("An error occurred", { id: "profile-catch-error" });
    } finally {
      setIsLoadingAccount(false);
    }
  };

  const validateField = (field: keyof ProfileErrors, value: string) => {
    const fieldSchema = {
      username: profileSchema.shape.username,
      name: profileSchema.shape.name,
      bio: profileSchema.shape.bio,
    }[field];

    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      setProfileErrors((prev) => ({ ...prev, [field]: result.error.errors[0]?.message }));
    } else {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const hasChanges =
    accountData.name.trim() !== activeUser.full_name.trim() ||
    accountData.username.trim() !== activeUser.username.trim() ||
    (accountData.bio || "").trim() !== (activeUser.bio || "").trim() ||
    !!accountData.avatarFile ||
    (accountData.deleteAvatar && !!activeUser.avatar);

  const handleUpdateProfile = () => {
    const result = profileSchema.safeParse({
      username: accountData.username.trim(),
      name: accountData.name.trim(),
      bio: (accountData.bio || "").trim(),
    });

    if (!result.success) {
      const errors: ProfileErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProfileErrors;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});

    const formData = new FormData();
    formData.append("username", accountData.username.trim());
    formData.append("full_name", accountData.name.trim());
    formData.append("bio", (accountData.bio || "").trim());
    if (accountData.avatarFile) {
      const filename = originalFilename || "avatar.jpg";
      formData.append("avatar", accountData.avatarFile, filename);
    }
    if (accountData.deleteAvatar) {
      formData.append("delete_avatar", "true");
    }

    setIsProfileSubmitting(true);
    updateProfile(formData, {
      onSuccess: () => {
        toast.success("Profile updated successfully", { id: "profile-update-success" });
        setOpenAccount(false);
      },
      onError: (error) => {
        setIsProfileSubmitting(false);
        const axiosError = error as AxiosError<ApiError>;
        toast.error(axiosError.response?.data?.error || "Profile update failed", {
          id: "profile-update-error",
        });
      },
    });
  };

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteAvatar = () => {
    setAccountData((prev) => ({
      ...prev,
      avatarFile: null,
      avatarPreview: null,
      deleteAvatar: true,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setAccountData((prev) => ({
      ...prev,
      avatarFile: blob as File,
      avatarPreview: previewUrl,
      deleteAvatar: false,
    }));
    setCropModalOpen(false);
  };

  const [securityData, setSecurityData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [securityErrors, setSecurityErrors] = useState<SecurityErrors>({});

  const validateSecurityField = (field: keyof SecurityErrors, value: string) => {
    if (field === "oldPassword") {
      const result = baseChangePasswordSchema.shape.oldPassword.safeParse(value);
      setSecurityErrors((prev) => ({
        ...prev,
        oldPassword: result.success ? undefined : result.error.errors[0]?.message,
      }));
    }
    if (field === "newPassword") {
      const result = baseChangePasswordSchema.shape.newPassword.safeParse(value);
      setSecurityErrors((prev) => ({
        ...prev,
        newPassword: result.success ? undefined : result.error.errors[0]?.message,
      }));
    }
    if (field === "confirmPassword") {
      if (value !== securityData.newPassword) {
        setSecurityErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match.",
        }));
      } else {
        setSecurityErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  const handleSecurityClick = async () => {
    setActiveMenu(null);
    setIsLoadingSecurity(true);
    try {
      const result = await refetchUser();
      if (result.isError) {
        toast.error("Failed to load security data", { id: "security-load-error" });
        return;
      }
      setOpenSecurity(true);
    } catch {
      toast.error("An error occurred", { id: "security-catch-error" });
    } finally {
      setIsLoadingSecurity(false);
    }
  };

  const handleSecurityModalChange = (open: boolean) => {
    setOpenSecurity(open);
    if (!open) {
      setTimeout(() => {
        setSecurityData({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setSecurityErrors({});
        setIsSecuritySubmitting(false);
      }, 300);
    }
  };

  const handleChangePassword = () => {
    const result = changePasswordSchema.safeParse(securityData);
    if (!result.success) {
      const errors: SecurityErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SecurityErrors;
        errors[field] = err.message;
      });
      setSecurityErrors(errors);
      return;
    }

    setIsSecuritySubmitting(true);
    changePassword(
      {
        old_password: activeUser.has_password ? securityData.oldPassword : undefined,
        new_password: securityData.newPassword,
        confirm_password: securityData.confirmPassword,
      },
      {
        onSuccess: () => {
          toast.success("Password updated successfully", { id: "password-update-success" });
          setGlobalLoading(true, "Please log in again");
          handleSecurityModalChange(false);
          setTimeout(() => {
            logout().then(() => {
              navigate("/login");
              setGlobalLoading(false);
            });
          }, 2000);
        },
        onError: (error) => {
          setIsSecuritySubmitting(false);
          const axiosError = error as AxiosError<ApiError>;
          toast.error(axiosError.response?.data?.error || "Password update failed", {
            id: "password-update-error",
          });
        },
      }
    );
  };

  const [emailData, setEmailData] = useState({
    newEmail: "",
    otp: "",
  });
  const [emailErrors, setEmailErrors] = useState<EmailErrors>({});

  const validateEmailField = (field: keyof EmailErrors, value: string) => {
    if (field === "newEmail" && value === activeUser.email) {
      setEmailErrors((prev) => ({
        ...prev,
        newEmail: "New email must be different from current email.",
      }));
      return;
    }

    const fieldSchema = {
      newEmail: changeEmailSchema.shape.newEmail,
      otp: changeEmailSchema.shape.otp,
    }[field];

    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      setEmailErrors((prev) => ({ ...prev, [field]: result.error.errors[0]?.message }));
    } else {
      setEmailErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEmailModalChange = (open: boolean) => {
    setOpenChangeEmail(open);
    if (!open) {
      setTimeout(() => {
        setEmailData({ newEmail: "", otp: "" });
        setEmailErrors({});
        setIsEmailSubmitting(false);
      }, 300);
    }
  };

  const handleSendOTP = () => {
    if (!captchaToken) {
      toast.error("Please wait for Captcha verification", { id: "captcha-wait" });
      return;
    }

    const emailResult = changeEmailSchema.shape.newEmail.safeParse(emailData.newEmail);
    if (!emailResult.success) {
      setEmailErrors((prev) => ({ ...prev, newEmail: emailResult.error.errors[0]?.message }));
      return;
    }

    sendOTP(
      {
        email: emailData.newEmail.trim(),
        mode: "change_email",
        captcha_token: captchaToken,
      },
      {
        onSuccess: () => {
          toast.success("OTP sent to your email", { id: "otp-sent-success" });
          captchaRef.current?.reset();
          setCaptchaToken(null);
          setIsCaptchaSolving(true);
        },
        onError: (error) => {
          const axiosError = error as AxiosError<ApiError>;
          toast.error(axiosError.response?.data?.error || "Failed to send OTP", {
            id: "otp-sent-error",
          });
          captchaRef.current?.reset();
          setCaptchaToken(null);
          setIsCaptchaSolving(true);
        },
      }
    );
  };

  const handleChangeEmail = () => {
    const result = changeEmailSchema.safeParse(emailData);
    if (!result.success) {
      const errors: EmailErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof EmailErrors;
        errors[field] = err.message;
      });
      setEmailErrors(errors);
      return;
    }

    setIsEmailSubmitting(true);
    changeEmail(
      {
        email: emailData.newEmail.trim(),
        code: emailData.otp.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Email updated successfully", { id: "email-update-success" });
          setGlobalLoading(true, "Please log in again");
          handleEmailModalChange(false);
          setTimeout(() => {
            logout().then(() => {
              navigate("/login");
              setGlobalLoading(false);
            });
          }, 2000);
        },
        onError: (error) => {
          setIsEmailSubmitting(false);
          const axiosError = error as AxiosError<ApiError>;
          toast.error(axiosError.response?.data?.error || "Email update failed", {
            id: "email-update-error",
          });
        },
      }
    );
  };

  return (
    <>
      <LoadingModal isOpen={isLoadingSecurity || isLoadingAccount || isLoadingBlockedUsers} />
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu
            open={activeMenu === menuId}
            onOpenChange={(open) => setActiveMenu(open ? menuId : null)}
          >
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground gap-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.full_name} />
                  <AvatarFallback>{getInitials(activeUser.full_name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold">{activeUser.full_name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{activeUser.username}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] w-fit rounded-lg"
              side={"bottom"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleAccountClick();
                    setTimeout(() => setActiveMenu(null), 150);
                  }}
                >
                  <CircleUserRound />
                  Account
                </DropdownMenuItem>
                {mode === "admin" ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        window.location.href = "/";
                      }}
                    >
                      <Home className="h-4 w-4" />
                      Back to App
                    </DropdownMenuItem>
                  </>
                ) : (
                  activeUser.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => {
                          window.location.href = "/admin/dashboard";
                        }}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={handleSecurityClick}>
                  <Lock />
                  Security
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setActiveMenu(null);
                    handleBlockedClick();
                  }}
                >
                  <Ban />
                  Blocked Users
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => {
                    setActiveMenu(null);
                    setOpenDeleteAccount(true);
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setActiveMenu(null);
                  setOpenLogout(true);
                }}
              >
                <DoorOpen />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog
        open={openAccount}
        onOpenChange={(open) => !isUpdatingProfile && handleAccountModalOpen(open)}
      >
        <DialogContent
          size="default"
          onInteractOutside={(e) => (isLightboxOpen || isUpdatingProfile) && e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (isUpdatingProfile) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 pt-4">
            <div className="flex flex-col items-center gap-4">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <div
                    className={cn(
                      "relative group cursor-pointer",
                      isUpdatingProfile && "pointer-events-none opacity-50"
                    )}
                  >
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={accountData.avatarPreview || undefined}
                        onLoadingStatusChange={(status) =>
                          setIsModalAvatarLoaded(status === "loaded")
                        }
                      />
                      <AvatarFallback className="text-4xl">
                        {getInitials(accountData.name)}
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
                  {accountData.avatarPreview && isModalAvatarLoaded && (
                    <>
                      <DropdownMenuItem onSelect={() => setIsLightboxOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Photo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                    <Camera className="mr-2 h-4 w-4" />
                    Change Photo
                  </DropdownMenuItem>
                  {accountData.avatarPreview && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleDeleteAvatar}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Photo
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/pjpeg,image/apng,.png,.jpg,.jpeg,.jpe,.jfif,.jif,.jfi"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex flex-col">
              <Label
                htmlFor="username"
                className={cn(profileErrors.username && "text-destructive")}
              >
                Username
              </Label>
              <Input
                id="username"
                value={accountData.username}
                className={cn(
                  "mt-3",
                  profileErrors.username && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isUpdatingProfile}
                onChange={(e) => {
                  const normalized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setAccountData({ ...accountData, username: normalized });
                  validateField("username", normalized);
                }}
              />
              <AnimatePresence mode="wait">
                {profileErrors.username && (
                  <motion.p
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                  >
                    {profileErrors.username}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="name" className={cn(profileErrors.name && "text-destructive")}>
                Full Name
              </Label>
              <Input
                id="name"
                value={accountData.name}
                disabled={isUpdatingProfile}
                className={cn(
                  "mt-3",
                  profileErrors.name && "border-destructive focus-visible:ring-destructive"
                )}
                onChange={(e) => {
                  setAccountData({ ...accountData, name: e.target.value });
                  validateField("name", e.target.value);
                }}
              />
              <AnimatePresence mode="wait">
                {profileErrors.name && (
                  <motion.p
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                  >
                    {profileErrors.name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2 mt-3">
                <Input
                  id="email"
                  type="email"
                  value={activeUser.email}
                  disabled
                  className="bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!activeUser.has_password || isUpdatingProfile}
                  onClick={() => {
                    setOpenChangeEmail(true);
                  }}
                  title={!activeUser.has_password ? "Set password first" : "Change Email"}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              {!activeUser.has_password && (
                <p className="text-[0.8rem] text-muted-foreground">
                  Set{" "}
                  <span
                    className="text-primary font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setOpenAccount(false);
                      setTimeout(() => setOpenSecurity(true), 150);
                    }}
                  >
                    password
                  </span>{" "}
                  to change email.
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <Label htmlFor="bio" className={cn(profileErrors.bio && "text-destructive")}>
                Bio
              </Label>
              <Textarea
                id="bio"
                className={cn(
                  "resize-none min-h-[80px] max-h-[120px] overflow-y-auto break-words mt-3",
                  profileErrors.bio && "border-destructive focus-visible:ring-destructive"
                )}
                value={accountData.bio}
                disabled={isUpdatingProfile}
                onChange={(e) => {
                  setAccountData({ ...accountData, bio: e.target.value });
                  validateField("bio", e.target.value);
                }}
              />
              <AnimatePresence mode="wait">
                {profileErrors.bio && (
                  <motion.p
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                  >
                    {profileErrors.bio}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={isProfileSubmitting || !hasChanges}
              className="relative"
            >
              <span className={isProfileSubmitting ? "opacity-0" : ""}>Save Changes</span>
              {isProfileSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropper
        image={selectedImage}
        open={cropModalOpen}
        onOpenChange={(open) => {
          setCropModalOpen(open);
        }}
        onCropComplete={handleCropComplete}
      />

      <Dialog
        open={openChangeEmail}
        onOpenChange={(open) => !isEmailSubmitting && !isSendingOTP && handleEmailModalChange(open)}
      >
        <DialogContent
          size="default"
          className="rounded-lg"
          onInteractOutside={(e) => (isEmailSubmitting || isSendingOTP) && e.preventDefault()}
          onEscapeKeyDown={(e) => (isEmailSubmitting || isSendingOTP) && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>Enter new email to receive verification code.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-4">
            <div className="flex flex-col">
              <Label htmlFor="new-email" className={cn(emailErrors.newEmail && "text-destructive")}>
                New Email
              </Label>
              <div className="flex gap-2 mt-3">
                <Input
                  id="new-email"
                  type="email"
                  value={emailData.newEmail}
                  className={cn(
                    emailErrors.newEmail && "border-destructive focus-visible:ring-destructive"
                  )}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\s/g, "");
                    setEmailData({ ...emailData, newEmail: val });
                    validateEmailField("newEmail", val);
                  }}
                  placeholder="Email"
                  disabled={isSendingOTP || isChangingEmail}
                />
                <Button
                  variant="outline"
                  disabled={
                    !emailData.newEmail ||
                    isSendingOTP ||
                    isCaptchaSolving ||
                    !captchaToken ||
                    !!emailErrors.newEmail ||
                    isChangingEmail
                  }
                  type="button"
                  onClick={handleSendOTP}
                  className="w-[110px] relative"
                >
                  <span className={isSendingOTP ? "opacity-0" : ""}>Request OTP</span>
                  {isSendingOTP && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </Button>
              </div>
              <AnimatePresence mode="wait">
                {emailErrors.newEmail && (
                  <motion.p
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                  >
                    {emailErrors.newEmail}
                  </motion.p>
                )}
              </AnimatePresence>
              <Captcha
                ref={captchaRef}
                onVerify={(token) => {
                  setCaptchaToken(token);
                  setIsCaptchaSolving(false);
                }}
                onError={() => {
                  setCaptchaToken(null);
                  setIsCaptchaSolving(true);
                  toast.error("Failed to load captcha, retrying...", {
                    id: "captcha-load-error",
                  });
                }}
                onExpire={() => {
                  setCaptchaToken(null);
                  setIsCaptchaSolving(true);
                  captchaRef.current?.reset();
                }}
              />
            </div>
            <div className="flex flex-col">
              <Label htmlFor="otp" className={cn(emailErrors.otp && "text-destructive")}>
                OTP Code
              </Label>
              <Input
                id="otp"
                value={emailData.otp}
                className={cn(
                  "mt-3",
                  emailErrors.otp && "border-destructive focus-visible:ring-destructive"
                )}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setEmailData({ ...emailData, otp: val });
                  validateEmailField("otp", val);
                }}
                placeholder="OTP Code"
                maxLength={6}
                disabled={isChangingEmail || isSendingOTP}
              />
              <AnimatePresence mode="wait">
                {emailErrors.otp && (
                  <motion.p
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                  >
                    {emailErrors.otp}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <Button
              onClick={handleChangeEmail}
              disabled={
                !emailData.newEmail ||
                emailData.otp.length < 6 ||
                isEmailSubmitting ||
                !!emailErrors.newEmail ||
                !!emailErrors.otp ||
                isCaptchaSolving ||
                isSendingOTP
              }
              className="w-full relative"
            >
              <span className={isEmailSubmitting || isCaptchaSolving ? "opacity-0" : ""}>
                Change Email
              </span>
              {(isEmailSubmitting || isCaptchaSolving) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openSecurity}
        onOpenChange={(open) => !isSecuritySubmitting && handleSecurityModalChange(open)}
      >
        <DialogContent
          size="default"
          className="rounded-lg"
          onInteractOutside={(e) => isSecuritySubmitting && e.preventDefault()}
          onEscapeKeyDown={(e) => isSecuritySubmitting && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>
              {activeUser.has_password
                ? "Enter old password & new password."
                : "Create a new password for your account."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-4">
            {activeUser.has_password && (
              <div className="flex flex-col">
                <Label
                  htmlFor="old-password"
                  className={cn(securityErrors.oldPassword && "text-destructive")}
                >
                  Old Password
                </Label>
                <div className="mt-3">
                  <PasswordInput
                    id="old-password"
                    value={securityData.oldPassword}
                    className={cn(
                      securityErrors.oldPassword &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    onChange={(e) => {
                      setSecurityData({ ...securityData, oldPassword: e.target.value });
                      validateSecurityField("oldPassword", e.target.value);
                    }}
                    placeholder="Old Password"
                    disabled={isChangingPassword}
                  />
                </div>
                <AnimatePresence mode="wait">
                  {securityErrors.oldPassword && (
                    <motion.p
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                    >
                      {securityErrors.oldPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex flex-col">
              <Label
                htmlFor="new-password"
                className={cn(securityErrors.newPassword && "text-destructive")}
              >
                New Password
              </Label>
              <div className="mt-3">
                <PasswordInput
                  id="new-password"
                  value={securityData.newPassword}
                  className={cn(
                    securityErrors.newPassword &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  onChange={(e) => {
                    setSecurityData({ ...securityData, newPassword: e.target.value });
                    validateSecurityField("newPassword", e.target.value);
                  }}
                  placeholder="New Password"
                  disabled={isChangingPassword}
                />
              </div>
              <AnimatePresence mode="wait">
                {securityErrors.newPassword && (
                  <motion.p
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                  >
                    {securityErrors.newPassword}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col">
              <Label
                htmlFor="confirm-password"
                className={cn(securityErrors.confirmPassword && "text-destructive")}
              >
                Confirm Password
              </Label>
              <div className="mt-3">
                <PasswordInput
                  id="confirm-password"
                  value={securityData.confirmPassword}
                  className={cn(
                    securityErrors.confirmPassword &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  onChange={(e) => {
                    setSecurityData({ ...securityData, confirmPassword: e.target.value });
                    validateSecurityField("confirmPassword", e.target.value);
                  }}
                  placeholder="Confirm Password"
                  disabled={isChangingPassword}
                />
              </div>
              <AnimatePresence mode="wait">
                {securityErrors.confirmPassword && (
                  <motion.p
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="text-[0.8rem] font-medium text-destructive overflow-hidden"
                  >
                    {securityErrors.confirmPassword}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={
                (activeUser.has_password && !securityData.oldPassword) ||
                !securityData.newPassword ||
                !securityData.confirmPassword ||
                isSecuritySubmitting ||
                !!securityErrors.newPassword ||
                !!securityErrors.confirmPassword
              }
              className="w-full relative"
            >
              <span className={isSecuritySubmitting ? "opacity-0" : ""}>Save Password</span>
              {isSecuritySubmitting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={openLogout}
        onOpenChange={setOpenLogout}
        title="Logout"
        description="Are you sure you want to logout? You will need to login again to access your account."
        confirmText="Logout"
        onConfirm={handleLogout}
        isLoading={isLogoutLoading}
      />

      <Dialog
        open={openBlocked}
        onOpenChange={(val) => {
          if (!val) {
            setBlockedSearch("");
            setDebouncedBlockedSearch("");
          }
          setOpenBlocked(val);
        }}
      >
        <DialogContent size="default" className="h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Blocked Users</DialogTitle>
            <DialogDescription>Manage users you have blocked.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search blocked users..."
                className="pl-8"
                value={blockedSearch}
                onChange={(e) => setBlockedSearch(e.target.value)}
                disabled={!isLoadingBlocked && blockedUsers.length === 0 && !blockedSearch}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <InfiniteUserList
                users={blockedUsers}
                isLoading={isLoadingBlocked}
                isError={!!isBlockedError}
                hasNextPage={!!hasNextBlockedPage}
                isFetchingNextPage={!!isFetchingNextBlockedPage}
                fetchNextPage={() => fetchNextBlockedPage()}
                refetch={() => refetchBlocked()}
                emptyMessage="No blocked users found."
                loadingHeight="h-11"
                showBorder={false}
                skeletonButtonCount={1}
                resetKey={debouncedBlockedSearch}
                renderActions={(user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
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
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8 text-muted-foreground hover:text-primary"
                      onClick={() => setUserToUnblock(user.id)}
                      title="Unblock User"
                    >
                      <Unlock className="size-4" />
                    </Button>
                  </div>
                )}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UnblockUserDialog
        open={!!userToUnblock}
        onOpenChange={(val) => {
          if (!val) setUserToUnblock(null);
        }}
        userId={userToUnblock}
      />

      <DeleteAccountDialog
        isOpen={openDeleteAccount}
        onClose={setOpenDeleteAccount}
        hasPassword={activeUser.has_password}
        onSuccess={() => {
          toast.success("Account deleted successfully.");
          setOpenDeleteAccount(false);
          setGlobalLoading(true, "Goodbye...");
          setTimeout(() => {
            logout().then(() => {
              navigate("/login");
              setGlobalLoading(false);
            });
          }, 2000);
        }}
      />

      <GlobalLightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        slides={
          accountData.avatarPreview
            ? [{ src: accountData.avatarPreview, alt: "Avatar Preview" }]
            : []
        }
      />
    </>
  );
}
