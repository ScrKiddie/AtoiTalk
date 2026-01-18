import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavChat } from "../nav-chat";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockHideChat = vi.fn();
vi.mock("@/hooks/mutations/use-hide-chat", () => ({
  useHideChat: () => ({
    mutate: mockHideChat,
    isPending: false,
  }),
}));

vi.mock("@/store", () => ({
  useAuthStore: (selector: any) => selector({ user: { id: "user1", name: "Current User" } }),
  useChatStore: (selector: any) => selector({ typingUsers: {} }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("NavChat Component", () => {
  const defaultProps = {
    chats: [],
    activeMenu: null,
    setActiveMenu: vi.fn(),
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    isError: false,
    refetch: vi.fn(),
  };

  const renderComponent = (props = {}) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SidebarProvider>
            <NavChat {...defaultProps} {...props} />
          </SidebarProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = renderComponent({ isLoading: true });
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(15);
  });

  it("renders error state with retry button", () => {
    renderComponent({ isError: true, chats: [] });
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders list of chats correctly", () => {
    const chats = [
      {
        id: "chat1",
        name: "Alice",
        avatar: null,
        unread_count: 2,
        last_message: {
          content: "Hello there",
          created_at: new Date().toISOString(),
          sender_id: "user2",
        },
        type: "private",
        is_online: true,
      },
      {
        id: "chat2",
        name: "Bob",
        avatar: "https://example.com/bob.jpg",
        unread_count: 0,
        last_message: {
          content: "See attachment",
          created_at: new Date().toISOString(),
          sender_id: "user1",
        },
        type: "private",
        is_online: false,
      },
    ];

    renderComponent({ chats });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("See attachment")).toBeInTheDocument();
  });

  it("navigates to chat when clicked", () => {
    const chats = [
      {
        id: "chat1",
        name: "Alice",
        unread_count: 0,
        type: "private",
      },
    ];

    renderComponent({ chats });

    const chatButton = screen.getByText("Alice").closest("button");
    fireEvent.click(chatButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/chat/chat1");
  });

  it("opens delete dialog and deletes chat", async () => {
    const chats = [
      {
        id: "chat1",
        name: "Alice",
        unread_count: 0,
        type: "private",
        other_user_id: "user2",
      },
    ];

    const setActiveMenu = vi.fn();
    renderComponent({ chats, activeMenu: "chat-0", setActiveMenu });

    expect(screen.getByText("Delete Chat")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Delete Chat"));

    await waitFor(() => {
      expect(
        screen.getByText("Are you sure you want to delete this chat? This action cannot be undone.")
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(deleteButton);

    expect(mockHideChat).toHaveBeenCalledWith("chat1", expect.anything());
  });

  it("shows typing indicator", () => {
    const chats = [
      {
        id: "chat1",
        name: "Deleted Msg User",
        unread_count: 0,
        last_message: {
          deleted_at: new Date().toISOString(),
          sender_id: "user2",
        },
        type: "private",
      },
    ];
    renderComponent({ chats });
    expect(screen.getByText("Pesan sudah dihapus")).toBeInTheDocument();
  });
});
