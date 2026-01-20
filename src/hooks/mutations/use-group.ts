import { chatService } from "@/services";
import { ApiError, ChatListItem, ChatResponse, Message, PaginatedResponse } from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => chatService.createGroup(data),
    onSuccess: (newGroup: ChatResponse) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Group created successfully");
      return newGroup;
    },
    onError: (error) => {
      console.error("Failed to create group:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to create group");
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: FormData }) =>
      chatService.updateGroup(groupId, data),
    onSuccess: (updatedGroup: ChatListItem, { groupId }) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((chat) =>
              chat.id === groupId ? { ...chat, ...updatedGroup } : chat
            ),
          }));
          return { ...oldData, pages: newPages };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["chat", groupId] });
      toast.success("Group updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update group:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to update group");
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => chatService.leaveGroup(groupId),
    onSuccess: (_data, groupId) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.filter((chat) => chat.id !== groupId),
          }));
          return { ...oldData, pages: newPages };
        }
      );
      queryClient.removeQueries({ queryKey: ["messages", groupId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Left group successfully");
    },
    onError: (error) => {
      console.error("Failed to leave group:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to leave group");
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userIds }: { groupId: string; userIds: string[] }) =>
      chatService.addGroupMember(groupId, userIds),
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["chat", groupId] });
      queryClient.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
        ["messages", groupId],
        (oldData) => {
          if (!oldData?.pages.length) return oldData;
          const newPages = [...oldData.pages];
          newPages[0] = {
            ...newPages[0],
            data: [data, ...newPages[0].data],
          };
          return { ...oldData, pages: newPages };
        }
      );
      toast.success("Members added successfully");
    },
    onError: (error) => {
      console.error("Failed to add members:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to add members");
    },
  });
};

export const useKickGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      chatService.kickGroupMember(groupId, userId),
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["chat", groupId] });
      queryClient.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
        ["messages", groupId],
        (oldData) => {
          if (!oldData?.pages.length) return oldData;
          const newPages = [...oldData.pages];
          newPages[0] = {
            ...newPages[0],
            data: [data, ...newPages[0].data],
          };
          return { ...oldData, pages: newPages };
        }
      );
      toast.success("Member removed successfully");
    },
    onError: (error) => {
      console.error("Failed to remove member:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to remove member");
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: string; userId: string; role: string }) =>
      chatService.updateMemberRole(groupId, userId, role),
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
        ["messages", groupId],
        (oldData) => {
          if (!oldData?.pages.length) return oldData;
          const newPages = [...oldData.pages];
          newPages[0] = {
            ...newPages[0],
            data: [data, ...newPages[0].data],
          };
          return { ...oldData, pages: newPages };
        }
      );
      toast.success("Role updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update role:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to update role");
    },
  });
};

export const useTransferOwnership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, newOwnerId }: { groupId: string; newOwnerId: string }) =>
      chatService.transferOwnership(groupId, newOwnerId),
    onSuccess: (data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["chat", groupId] });
      queryClient.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
        ["messages", groupId],
        (oldData) => {
          if (!oldData?.pages.length) return oldData;
          const newPages = [...oldData.pages];
          newPages[0] = {
            ...newPages[0],
            data: [data, ...newPages[0].data],
          };
          return { ...oldData, pages: newPages };
        }
      );
      toast.success("Ownership transferred successfully");
    },
    onError: (error) => {
      console.error("Failed to transfer ownership:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to transfer ownership");
    },
  });
};
