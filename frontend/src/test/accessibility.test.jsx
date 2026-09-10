import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
  useAuth: () => ({ getToken: async () => null, signOut: async () => {} }),
  useSignIn: () => ({ signIn: vi.fn(), setActive: vi.fn() }),
  useSignUp: () => ({ signUp: vi.fn(), setActive: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    syncProfile: vi.fn(),
  },
  setBearerToken: vi.fn(),
  setTokenRefresher: vi.fn(),
  ensureFreshToken: async () => null,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

async function assertAxeClean(ui) {
  cleanup();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const results = await axe.run(document.body, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },
  });
  const serious = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact),
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

describe("axe-core accessibility scans (WCAG 2.1 AA)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("landing page has no serious/critical violations", async () => {
    const { default: LandingPage } = await import("@/pages/LandingPage");
    await assertAxeClean(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  }, 20000);

  it("sign in page has no serious/critical violations", async () => {
    const { default: SignInPage } = await import("@/pages/SignInPage");
    await assertAxeClean(<SignInPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  }, 20000);

  it("pricing page has no serious/critical violations", async () => {
    const { default: PricingPage } = await import("@/pages/PricingPage");
    await assertAxeClean(<PricingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  }, 20000);
});