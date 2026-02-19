import { useChat, useChats, useUserById } from "@/hooks/queries";
import { useAuthStore, useChatStore } from "@/store";
import { ChatListItem, User } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const isValidUUID = (id: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

export const useChatData = () => {
  const queryClient = useQueryClient();
  const { chatId, userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (chatId && !isValidUUID(chatId)) {
      navigate("/", { replace: true });
    }
  }, [chatId, navigate]);

  const isIdValid = chatId ? isValidUUID(chatId) : true;
  const currentChatId = chatId && isIdValid ? chatId : null;
  const targetUserId = userId || null;
  const isVirtual = !currentChatId && !!targetUserId;

  const { user: currentUser } = useAuthStore();
  const { setActiveChatId, activeChatId } = useChatStore();

  const [prevChatId, setPrevChatId] = useState<string | null>(currentChatId);
  const prevChatIdChanged = currentChatId !== prevChatId;
  if (prevChatIdChanged) {
    setPrevChatId(currentChatId);
  }

  useEffect(() => {
    setActiveChatId(currentChatId);
    return () => setActiveChatId(null);
  }, [currentChatId, setActiveChatId]);

  useEffect(() => {
    const handleKicked = (e: CustomEvent<{ chatId: string }>) => {
      if (e.detail.chatId === currentChatId) {
        setActiveChatId(null);
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("kicked-from-chat", handleKicked as EventListener);
    return () => {
      window.removeEventListener("kicked-from-chat", handleKicked as EventListener);
    };
  }, [currentChatId, navigate, setActiveChatId]);

  const { data: chatsData } = useChats();
  const {
    data: singleChat,
    isLoading: isLoadingSingleChat,
    isError: isChatError,
    refetch: refetchChat,
    isFetching: isFetchingSingleChat,
    failureCount: chatFailureCount,
    error: chatError,
  } = useChat(currentChatId);

  const chatFromList = chatsData?.pages.flatMap((p) => p.data).find((c) => c.id === currentChatId);
  const chat = singleChat || chatFromList;

  const partnerId = isVirtual
    ? targetUserId
    : chat?.type === "private"
      ? chat?.other_user_id
      : undefined;

  const isPartnerDeleted = chat?.type === "private" && chat?.other_user_is_deleted;
  const initialUser = (location.state as { initialUser?: User })?.initialUser;

  useEffect(() => {
    if (initialUser && partnerId) {
      const existing = queryClient.getQueryData(["user", partnerId]);
      if (!existing) {
        queryClient.setQueryData(["user", partnerId], initialUser);
      }
    }
  }, [initialUser, partnerId, queryClient]);

  const {
    data: partnerProfile,
    isError: isProfileError,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
    isFetching: isFetchingProfile,
    failureCount: profileFailureCount,
    error: profileError,
  } = useUserById(isPartnerDeleted ? null : partnerId || null);

  useEffect(() => {
    if (chatsData && isVirtual && targetUserId) {
      const existingChat = chatsData.pages
        .flatMap((p) => p.data)
        .find((c) => c.type === "private" && c.other_user_id === targetUserId);
      if (existingChat) {
        navigate(`/chat/${existingChat.id}`, { replace: true });
      }
    }
  }, [isVirtual, targetUserId, chatsData, navigate]);

  const resolvedChat = useMemo(() => {
    if (isVirtual && partnerProfile && !chat) {
      return {
        id: "virtual",
        type: "private",
        name: partnerProfile.full_name,
        avatar: partnerProfile.avatar,
        unread_count: 0,
        is_pinned: false,
        last_read_at: null,
        other_last_read_at: null,
        other_user_id: partnerProfile.id,
        last_message: null,
        is_online: partnerProfile.is_online,
        is_blocked_by_me: partnerProfile.is_blocked_by_me,
        is_blocked_by_other: partnerProfile.is_blocked_by_other,
      } as ChatListItem;
    }
    return chat;
  }, [isVirtual, partnerProfile, chat]);

  return {
    queryClient,
    currentChatId,
    targetUserId,
    isVirtual,
    currentUser,
    activeChatId,
    chatsData,
    chat: resolvedChat,
    isLoadingSingleChat,
    isChatError,
    refetchChat,
    isFetchingSingleChat,
    chatFailureCount,
    chatError,
    partnerId,
    partnerProfile,
    isProfileError,
    isProfileLoading,
    isFetchingProfile,
    refetchProfile,
    profileFailureCount,
    profileError,
  };
};
