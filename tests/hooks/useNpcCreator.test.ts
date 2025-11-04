import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";

import { useNpcCreator } from "@/hooks/useNpcCreator";
import type { GenerationJobErrorCode } from "@/types/npc";

// Mock 'sonner' to prevent toast notifications during tests
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

// Mock browser APIs
Object.defineProperty(window, "location", {
  value: {
    assign: vi.fn(),
  },
  writable: true,
});
vi.spyOn(window, "setTimeout");
vi.spyOn(window, "clearTimeout");
// Patch: Make mock UUID match required template literal type for randomUUID
vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000000");

const mockedFetch = vi.mocked(global.fetch);
const mockedToast = vi.mocked(toast);

describe("useNpcCreator", () => {
  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize correctly in 'create' mode", async () => {
      // Act
      const { result } = renderHook(() => useNpcCreator());

      // Assert initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.mode).toBe("create");

      // Wait for the fake loading delay to finish
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert final state
      expect(result.current.error).toBeNull();
      expect(result.current.form.getValues().name).toBe("");
      expect(result.current.generationState.status).toBe("idle");
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it("should set error state in 'edit' mode on failure", async () => {
      // Arrange
      const npcId = "test-npc-id";
      const errorMessage = "Failed to fetch NPC data.";
      mockedFetch.mockRejectedValueOnce(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => useNpcCreator(npcId));

      // Assert initial loading state
      expect(result.current.isLoading).toBe(true);

      // Wait for data fetching to fail
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert final state
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.form.getValues().name).toBe("");
      expect(mockedToast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe("handleGenerationPolling", () => {
    it("should update code and state on 'succeeded' polling result", () => {
      // Arrange
      const { result } = renderHook(() => useNpcCreator());
      const successPayload = {
        npcId: "test-npc-id",
        jobId: "job-123",
        status: "succeeded" as const,
        xml: "<npc>Generated</npc>",
        error: null,
        contentSizeBytes: 18,
        updatedAt: new Date().toISOString(),
      };

      // Act
      act(() => {
        result.current.handleGenerationPollingSuccess(successPayload);
      });

      // Assert
      expect(result.current.generationState.status).toBe("succeeded");
      expect(result.current.generationState.xml).toBe(successPayload.xml);
      expect(result.current.code.xml).toBe(successPayload.xml);
      expect(result.current.code.isLoading).toBe(false);
      expect(mockedToast.success).toHaveBeenCalledWith("XML generated successfully.");
    });

    it("should update state and show error on 'failed' polling result", () => {
      // Arrange
      const { result } = renderHook(() => useNpcCreator());
      const failurePayload = {
        npcId: "test-npc-id",
        jobId: "job-123",
        status: "failed" as const,
        xml: null,
        error: { code: "AI_TIMEOUT" as GenerationJobErrorCode, message: "AI model failed" },
        contentSizeBytes: null,
        updatedAt: new Date().toISOString(),
      };

      // Act
      act(() => {
        result.current.handleGenerationPollingSuccess(failurePayload);
      });

      // Assert
      expect(result.current.generationState.status).toBe("failed");
      expect(result.current.generationState.error).toBe("AI model failed");
      expect(result.current.code.isLoading).toBe(false);
      expect(mockedToast.error).toHaveBeenCalledWith("AI model failed");
    });

    it("should keep loading state on 'processing' polling result", () => {
      // Arrange
      const { result } = renderHook(() => useNpcCreator());
      const processingPayload = {
        npcId: "test-npc-id",
        jobId: "job-123",
        status: "processing" as const,
        xml: null,
        error: null,
        contentSizeBytes: null,
        updatedAt: new Date().toISOString(),
      };

      // Act
      act(() => {
        result.current.handleGenerationPollingSuccess(processingPayload);
      });

      // Assert
      expect(result.current.generationState.status).toBe("processing");
      expect(result.current.code.isLoading).toBe(true);
    });
  });
});
