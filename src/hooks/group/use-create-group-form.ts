import { useCreateGroup } from "@/hooks/mutations/use-group";
import { toast } from "@/lib/toast";
import { groupDescriptionSchema, groupNameSchema } from "@/lib/validators";
import { User } from "@/types";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const groupSchema = z.object({
  name: groupNameSchema,
  description: groupDescriptionSchema,
});

type GroupErrors = {
  name?: string;
  description?: string;
};

export const useCreateGroupForm = (onClose: (open: boolean) => void) => {
  const navigate = useNavigate();
  const { mutate: createGroup } = useCreateGroup();

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupErrors, setGroupErrors] = useState<GroupErrors>({});
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);

  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

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
    const memberIds = selectedMembers.map((member) => member.id);
    formData.append("member_ids", JSON.stringify(memberIds));
    formData.append("is_public", isPublic.toString());

    createGroup(formData, {
      onSuccess: (newGroup) => {
        navigate(`/chat/${newGroup.id}`);
        onClose(false);
        resetGroupForm();
      },
      onSettled: () => {
        setIsCreatingGroup(false);
      },
    });
  };

  return {
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,
    groupAvatar,
    groupAvatarPreview,
    selectedMembers,
    setSelectedMembers,
    groupErrors,
    isCreatingGroup,
    isPublic,
    setIsPublic,
    cropModalOpen,
    setCropModalOpen,
    selectedImage,
    setSelectedImage,
    groupAvatarInputRef,
    resetGroupForm,
    handleGroupAvatarChange,
    handleCropComplete,
    handleDeleteGroupAvatar,
    validateGroupField,
    handleCreateGroup,
  };
};
