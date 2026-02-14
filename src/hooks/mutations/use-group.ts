import { toast } from "@/lib/toast";
import { chatService } from "@/services";
import { useChatStore } from "@/store";

import {
  ChatListItem,
  ChatResponse,
  GroupMember,
  Message,
  PaginatedResponse,
  PublicGroupDTO,
} from "@/types";
import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => chatService.createGroup(data),
    onSuccess: (newGroup: ChatResponse) => {
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page) => ({
            ...page,
            data: page.data.filter((c) => c.id !== newGroup.id),
          }));

          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              data: [newGroup as ChatListItem, ...newPages[0].data],
            };
          }

          return { ...oldData, pages: newPages };
        }
      );
      queryClient.setQueryData<ChatListItem>(["chat", newGroup.id], newGroup as ChatListItem);

      const initialMessages = (newGroup as unknown as ChatListItem).last_message
        ? [(newGroup as unknown as ChatListItem).last_message!]
        : [];

      queryClient.setQueryData<InfiniteData<PaginatedResponse<Message>>>(
        ["messages", newGroup.id],
        {
          pages: [
            {
              data: initialMessages,
              meta: {
                has_next: false,
                has_prev: false,
                next_cursor: "",
                prev_cursor: "",
              },
            },
          ],
          pageParams: [],
        }
      );

      toast.success("Group created successfully");
      return newGroup;
    },
    onError: (error) => {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
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
      queryClient.setQueryData<ChatListItem>(["chat", groupId], (oldChat) => {
        if (!oldChat) return updatedGroup;
        const inviteCode = updatedGroup.invite_code || (updatedGroup as { code?: string }).code;
        return {
          ...oldChat,
          ...updatedGroup,
          invite_code: inviteCode !== undefined ? inviteCode : oldChat.invite_code,
        };
      });
      toast.success("Group updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update group:", error);
      toast.error("Failed to update group");
    },
  });
};

export const useLeaveGroup = (callback?: (groupId: string) => void) => {
  const queryClient = useQueryClient();
  const setActiveChatId = useChatStore((state) => state.setActiveChatId);

  return useMutation({
    mutationFn: (groupId: string) => chatService.leaveGroup(groupId),
    onSuccess: (_data, groupId) => {
      if (callback) callback(groupId);
      setActiveChatId(null);

      const allChats = queryClient.getQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>({
        queryKey: ["chats"],
      });
      let groupName = "Group";
      for (const [, cacheData] of allChats) {
        const found = cacheData?.pages.flatMap((p) => p.data).find((c) => c.id === groupId);
        if (found?.name) {
          const name = found.name;
          groupName = name.length > 20 ? name.slice(0, 20) + "..." : name;
          break;
        }
      }

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

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<PublicGroupDTO>>>(
        { queryKey: ["public-groups"] },
        (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: Array.isArray(page.data)
                ? page.data.map((group) =>
                    group.chat_id === groupId ? { ...group, is_member: false } : group
                  )
                : [],
            })),
          };
        }
      );

      setTimeout(() => {
        queryClient.removeQueries({ queryKey: ["messages", groupId] });
      }, 500);
      queryClient.invalidateQueries({ queryKey: ["users", "search"] });
      toast.success(`Left "${groupName}"`);
    },
    onError: (error) => {
      console.error("Failed to leave group:", error);
      toast.error("Failed to leave group");
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => chatService.deleteGroup(groupId),
    onMutate: (groupId) => {
      useChatStore.getState().addDeletedChatId(groupId);
    },
    onSuccess: (_data, groupId) => {
      const allChats = queryClient.getQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>({
        queryKey: ["chats"],
      });
      let groupName = "Group";
      for (const [, cacheData] of allChats) {
        const found = cacheData?.pages.flatMap((p) => p.data).find((c) => c.id === groupId);
        if (found?.name) {
          const name = found.name;
          groupName = name.length > 20 ? name.slice(0, 20) + "..." : name;
          break;
        }
      }

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
      setTimeout(() => {
        queryClient.removeQueries({ queryKey: ["messages", groupId] });
        queryClient.removeQueries({ queryKey: ["chat", groupId] });
      }, 500);
      toast.success(`"${groupName}" deleted`);
    },
    onError: (error, groupId) => {
      useChatStore.getState().removeDeletedChatId(groupId);
      console.error("Failed to delete group:", error);
      toast.error("Failed to delete group");
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userIds }: { groupId: string; userIds: string[] }) =>
      chatService.addGroupMember(groupId, userIds),
    onSuccess: (_data, { groupId, userIds }) => {
      queryClient.setQueryData<ChatListItem>(["chat", groupId], (oldChat) => {
        if (!oldChat) return oldChat;
        const backendMemberCount = (_data as Message & { member_count?: number }).member_count;
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
          const backendMemberCount = (_data as Message & { member_count?: number }).member_count;
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

      toast.success("Members added successfully");
    },
    onError: (error) => {
      console.error("Failed to add members:", error);
      toast.error("Failed to add members");
    },
  });
};

export const useKickGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      chatService.kickGroupMember(groupId, userId),
    onSuccess: (_data, { groupId }) => {
      queryClient.setQueryData<ChatListItem>(["chat", groupId], (oldChat) => {
        if (!oldChat) return oldChat;
        const backendMemberCount = (_data as Message & { member_count?: number }).member_count;
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
          const backendMemberCount = (_data as Message & { member_count?: number }).member_count;
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

      queryClient.invalidateQueries({ queryKey: ["users", "search"] });
      toast.success("Member removed successfully");
    },
    onError: (error) => {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: string; userId: string; role: string }) =>
      chatService.updateMemberRole(groupId, userId, role),
    onSuccess: (_data, { groupId, userId, role }) => {
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

      toast.success("Role updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    },
  });
};

export const useTransferOwnership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, newOwnerId }: { groupId: string; newOwnerId: string }) =>
      chatService.transferOwnership(groupId, newOwnerId),
    onSuccess: (_data, { groupId, newOwnerId }) => {
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

      toast.success("Ownership transferred successfully");
    },
    onError: (error) => {
      console.error("Failed to transfer ownership:", error);
      toast.error("Failed to transfer ownership");
    },
  });
};

export const useResetInviteCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => chatService.resetGroupInviteCode(groupId),
    onSuccess: (data, groupId) => {
      queryClient.setQueryData<ChatListItem>(["chat", groupId], (oldChat) => {
        if (!oldChat) return oldChat;
        return { ...oldChat, invite_code: data.code };
      });
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<ChatListItem>>>(
        { queryKey: ["chats"] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((chat) =>
                chat.id === groupId ? { ...chat, invite_code: data.code } : chat
              ),
            })),
          };
        }
      );
      toast.success("Invite link has been reset");
    },
    onError: (error) => {
      console.error("Failed to reset invite code:", error);
      toast.error("Failed to reset invite link");
    },
  });
};
