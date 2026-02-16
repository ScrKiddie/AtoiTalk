import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "../index";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      globalLoading: false,
      loadingMessage: null,
      sidebarOpen: true,
      isBusy: false,
      profileModal: { isOpen: false, userId: null, config: {} },
      isLoadingProfile: false,
    });
  });

  describe("setGlobalLoading", () => {
    it("sets loading to true with message", () => {
      useUIStore.getState().setGlobalLoading(true, "Loading data...");
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe("Loading data...");
    });

    it("sets loading without message (defaults to null)", () => {
      useUIStore.getState().setGlobalLoading(true);
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBeNull();
    });

    it("clears loading and message", () => {
      useUIStore.getState().setGlobalLoading(true, "Loading...");
      useUIStore.getState().setGlobalLoading(false);
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });
  });

  describe("toggleSidebar / setSidebarOpen", () => {
    it("toggles sidebar from open to closed", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("toggles sidebar back to open", () => {
      useUIStore.getState().toggleSidebar();
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("setSidebarOpen sets directly", () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe("setBusy", () => {
    it("sets busy to true", () => {
      useUIStore.getState().setBusy(true);
      expect(useUIStore.getState().isBusy).toBe(true);
    });

    it("sets busy to false", () => {
      useUIStore.getState().setBusy(true);
      useUIStore.getState().setBusy(false);
      expect(useUIStore.getState().isBusy).toBe(false);
    });
  });

  describe("openProfileModal / closeProfileModal", () => {
    it("opens profile modal with userId", () => {
      useUIStore.getState().openProfileModal("user-1");
      const state = useUIStore.getState();
      expect(state.profileModal.isOpen).toBe(true);
      expect(state.profileModal.userId).toBe("user-1");
    });

    it("opens profile modal with config", () => {
      useUIStore.getState().openProfileModal("user-1", { hideMessageButton: true });
      const state = useUIStore.getState();
      expect(state.profileModal.isOpen).toBe(true);
      expect(state.profileModal.config?.hideMessageButton).toBe(true);
    });

    it("closes profile modal (preserves userId)", () => {
      useUIStore.getState().openProfileModal("user-1");
      useUIStore.getState().closeProfileModal();
      const state = useUIStore.getState();
      expect(state.profileModal.isOpen).toBe(false);
      expect(state.profileModal.userId).toBe("user-1");
    });
  });

  describe("setLoadingProfile", () => {
    it("sets loading profile to true", () => {
      useUIStore.getState().setLoadingProfile(true);
      expect(useUIStore.getState().isLoadingProfile).toBe(true);
    });

    it("sets loading profile to false", () => {
      useUIStore.getState().setLoadingProfile(true);
      useUIStore.getState().setLoadingProfile(false);
      expect(useUIStore.getState().isLoadingProfile).toBe(false);
    });
  });
});
