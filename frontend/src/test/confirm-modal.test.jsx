import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "@/components/ui/confirm-modal";

function renderModal(props = {}) {
  render(
    <ConfirmModal
      open
      title="Delete account"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  );
}

describe("ConfirmModal", () => {
  it("renders no gate and an enabled confirm when requireText is omitted", () => {
    renderModal({ confirmLabel: "Sign out" });

    expect(screen.queryByTestId("confirm-modal-input")).toBeNull();
    expect(screen.getByTestId("confirm-modal-confirm")).toBeEnabled();
  });

  it("keeps confirm disabled until typed text matches (case-insensitive, trimmed)", async () => {
    const onConfirm = vi.fn();
    renderModal({ requireText: "user@example.com", onConfirm });

    const input = screen.getByTestId("confirm-modal-input");
    const confirm = screen.getByTestId("confirm-modal-confirm");

    expect(confirm).toBeDisabled();
    await userEvent.type(input, "other@example.com");
    expect(confirm).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, "  User@Example.COM ");
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables the input and confirm while loading", () => {
    renderModal({ requireText: "user@example.com", loading: true });

    expect(screen.getByTestId("confirm-modal-input")).toBeDisabled();
    expect(screen.getByTestId("confirm-modal-confirm")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("disables confirm while loading even without a gate", () => {
    renderModal({ loading: true });

    expect(screen.getByTestId("confirm-modal-confirm")).toBeDisabled();
  });

  it("uses destructive styling when destructive is set", () => {
    renderModal({ requireText: "x@y.z", destructive: true });

    expect(screen.getByTestId("confirm-modal-confirm").className).toContain("bg-red-500");
  });
});
