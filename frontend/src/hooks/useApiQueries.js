/** React Query hooks that wrap the API client for server-state fetching. */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/** Centralized React Query cache keys for consistent invalidation. */
export const queryKeys = {
  profile: ["profile"],
  dashboardStats: ["dashboard-stats"],
  interviews: ["interviews"],
  interview: (id) => ["interview", id],
  subscription: ["subscription"],
  config: ["config"],
};

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: api.getProfile,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useDashboardStatsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: api.getDashboardStats,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useInterviewsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.interviews,
    queryFn: async () => {
      const data = await api.getInterviews();
      return data.interviews || [];
    },
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useInterviewQuery(id, enabled = true) {
  return useQuery({
    queryKey: queryKeys.interview(id),
    queryFn: () => api.getInterview(id),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSubscriptionQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: api.getSubscription,
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useConfigQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: api.getConfig,
    enabled,
    staleTime: Infinity,
    retry: 1,
  });
}
