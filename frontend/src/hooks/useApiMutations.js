import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useApiQueries";

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile) => api.updateProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useSubmitFeedbackMutation() {
  return useMutation({
    mutationFn: (payload) => api.submitFeedback(payload),
    retry: 1,
  });
}

export function useSubmitToolFeedbackMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.submitToolFeedback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useCreateOrderMutation() {
  return useMutation({
    mutationFn: (planId) => api.createOrder(planId),
  });
}

export function useVerifyPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.verifyPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
}
