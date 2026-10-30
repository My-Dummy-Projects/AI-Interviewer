import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import api, { setBearerToken } from "@/lib/api";

describe("api.deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setBearerToken("test-token");
  });

  it("sends DELETE /api/user/account with the bearer token", async () => {
    axios.delete.mockResolvedValue({ status: 204, data: null });

    await api.deleteAccount();

    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/user\/account$/),
      { headers: { Authorization: "Bearer test-token" } }
    );
  });

  it("propagates failures so the caller can keep the modal open", async () => {
    axios.delete.mockRejectedValue(new Error("network down"));

    await expect(api.deleteAccount()).rejects.toThrow("network down");
  });
});
