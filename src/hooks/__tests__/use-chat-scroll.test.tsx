import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatScroll } from "../use-chat-scroll";

describe("useChatScroll Hook", () => {
  const mockScrollProperties = (
    element: HTMLElement,
    values: {
      scrollHeight?: number;
      scrollTop?: number;
      clientHeight?: number;
    }
  ) => {
    Object.defineProperties(element, {
      scrollHeight: { configurable: true, value: values.scrollHeight || 0 },
      scrollTop: { configurable: true, value: values.scrollTop || 0, writable: true },
      clientHeight: { configurable: true, value: values.clientHeight || 0 },
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (fn: Function) => fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("auto-scrolls to bottom on mount/reset", async () => {
    const scrollToSpy = vi.fn();

    const { result, rerender } = renderHook(
      ({ messages }) =>
        useChatScroll({
          currentChatId: "chat1",
          messages,
          isMessagesLoading: false,
          fetchNextPage: vi.fn(),
          hasNextPage: false,
          hasPreviousPage: false,
          isFetchingNextPage: false,
          isFetchingPreviousPage: false,
          fetchPreviousPage: vi.fn(),
          anchorMessageId: null,
          setAnchorMessageId: vi.fn(),
          returnToMessageId: null,
          setReturnToMessageId: vi.fn(),
          isPartnerTyping: false,
          isJumpingRef: { current: false },
        }),
      { initialProps: { messages: [] as any[] } }
    );

    const mockDiv = document.createElement("div");
    mockDiv.scrollTo = scrollToSpy;
    Object.defineProperties(mockDiv, {
      scrollHeight: { value: 0, configurable: true },
      scrollTop: { value: 0, configurable: true, writable: true },
      clientHeight: { value: 500, configurable: true },
    });

    (result.current.scrollRef as any).current = mockDiv;
    rerender({ messages: [{ id: "m1" }, { id: "m2" }] as any[] });
    mockScrollProperties(mockDiv, { scrollHeight: 1000, clientHeight: 500, scrollTop: 0 });

    act(() => {
      vi.runAllTimers();
    });

    expect(mockDiv.scrollTop).toBe(1000);
  });

  it("shows scroll-to-bottom button when scrolled up", async () => {
    const { result } = renderHook(() =>
      useChatScroll({
        currentChatId: "chat1",
        messages: [{ id: "m1" }] as any[],
        isMessagesLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        hasPreviousPage: false,
        isFetchingNextPage: false,
        isFetchingPreviousPage: false,
        fetchPreviousPage: vi.fn(),
        anchorMessageId: null,
        setAnchorMessageId: vi.fn(),
        returnToMessageId: null,
        setReturnToMessageId: vi.fn(),
        isPartnerTyping: false,
        isJumpingRef: { current: false },
      })
    );

    act(() => {
      result.current.handleScroll({
        currentTarget: {
          scrollHeight: 2000,
          scrollTop: 500,
          clientHeight: 500,
          getBoundingClientRect: () => ({ top: 0, bottom: 500 }),
        } as any,
      } as any);
    });

    expect(result.current.showScrollButton).toBe(true);
  });

  it("hides scroll-to-bottom button when scrolled to bottom", async () => {
    const { result } = renderHook(() =>
      useChatScroll({
        currentChatId: "chat1",
        messages: [{ id: "m1" }] as any[],
        isMessagesLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        hasPreviousPage: false,
        isFetchingNextPage: false,
        isFetchingPreviousPage: false,
        fetchPreviousPage: vi.fn(),
        anchorMessageId: null,
        setAnchorMessageId: vi.fn(),
        returnToMessageId: null,
        setReturnToMessageId: vi.fn(),
        isPartnerTyping: false,
        isJumpingRef: { current: false },
      })
    );

    act(() => {
      result.current.handleScroll({
        currentTarget: {
          scrollHeight: 2000,
          scrollTop: 1500,
          clientHeight: 500,
          getBoundingClientRect: () => ({ top: 0, bottom: 500 }),
        } as any,
      } as any);
    });

    expect(result.current.showScrollButton).toBe(false);
  });
});
