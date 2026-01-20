import { chatService } from "@/services";
import {
  ApiError,
  ChatListItem,
  ChatResponse,
  GroupMember,
  Message,
  PaginatedResponse,
} from "@/types";
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
      queryClient.invalidateQueries({ queryKey: ["users", "search"] });
      toast.success("Left group successfully");
    },
    onError: (error) => {
      console.error("Failed to leave group:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to leave group");
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => chatService.deleteGroup(groupId),
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
      toast.success("Group deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete group:", error);
      const axiosError = error as AxiosError<ApiError>;
      toast.error(axiosError.response?.data?.error || "Failed to delete group");
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userIds }: { groupId: string; userIds: string[] }) =>
      chatService.addGroupMember(groupId, userIds),
    onSuccess: (data, { groupId, userIds }) => {
      queryClient.setQueryData<ChatListItem>(["chat", groupId], (oldChat) => {
        if (!oldChat) return oldChat;
        const backendMemberCount = (data as Message & { member_count?: number }).member_count;
        return {
          ...oldChat,
          member_count:
            typeof backendMemberCount === "number"
              ? backendMemberCount
              : (oldChat.member_count || 0) + userIds.length,
        };
      });

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const backendMemberCount = (data as Message & { member_count?: number }).member_count;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((chat) =>
              chat.id === groupId
                ? {
                    ...chat,
                    member_count:
                      typeof backendMemberCount === "number"
                        ? backendMemberCount
                        : (chat.member_count || 0) + userIds.length,
                  }
                : chat
            ),
          }));
          return { ...oldData, pages: newPages };
        }
      );

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
      queryClient.setQueryData<ChatListItem>(["chat", groupId], (oldChat) => {
        if (!oldChat) return oldChat;
        const backendMemberCount = (data as Message & { member_count?: number }).member_count;
        return {
          ...oldChat,
          member_count:
            typeof backendMemberCount === "number"
              ? backendMemberCount
              : Math.max(0, (oldChat.member_count || 0) - 1),
        };
      });

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const backendMemberCount = (data as Message & { member_count?: number }).member_count;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((chat) =>
              chat.id === groupId
                ? {
                    ...chat,
                    member_count:
                      typeof backendMemberCount === "number"
                        ? backendMemberCount
                        : Math.max(0, (chat.member_count || 0) - 1),
                  }
                : chat
            ),
          }));
          return { ...oldData, pages: newPages };
        }
      );

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
      queryClient.invalidateQueries({ queryKey: ["users", "search"] });
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
    onSuccess: (data, { groupId, userId, role }) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
        { queryKey: ["group-members", "infinite", groupId] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((member) =>
                member.user_id === userId ? { ...member, role: role as "admin" | "member" } : member
              ),
            })),
          };
        }
      );

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
    onSuccess: (data, { groupId, newOwnerId }) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<GroupMember>>>(
        { queryKey: ["group-members", "infinite", groupId] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((member) => {
                if (member.user_id === newOwnerId) {
                  return { ...member, role: "owner" };
                }
                return member;
              }),
            })),
          };
        }
      );
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
