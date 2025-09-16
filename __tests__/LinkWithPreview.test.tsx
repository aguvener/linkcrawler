import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkWithPreview } from "../src/components/preview/LinkWithPreview";

// Mock CSS module
vi.mock("../src/components/preview/LinkWithPreview.module.css", () => ({
  default: new Proxy({}, { get: (_t, p: string) => p }),
}), { virtual: true });

// Mock services to use proxy fetcher
vi.mock("../src/services/fetchPreview", () => ({
  fetchPreviewClientOnly: vi.fn(),
}));

vi.mock("../src/services/previewCache", async () => {
  const actual = await vi.importActual<any>("../src/services/previewCache");
  return {
    ...actual,
    getOrFetch: vi.fn((url: string, fetcher: (u: string) => Promise<any>, _ttl: number) => fetcher(url)),
    evict: vi.fn(),
    getDomain: (u: string) => new URL(u).hostname,
  };
});

import { fetchPreviewClientOnly } from "../src/services/fetchPreview";

describe("LinkWithPreview (proxy mode)", () => {
  let user: ReturnType<typeof userEvent.setup>;
  const flush = async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    user = userEvent.setup();
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval"] });
    (fetchPreviewClientOnly as any).mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("shows preview after hover delay and hides on mouse leave", async () => {
    (fetchPreviewClientOnly as any).mockResolvedValue({
      url: "https://example.com",
      title: "Example Domain",
      description: "This domain is for use in illustrative examples.",
      siteName: "Example",
      images: ["https://example.com/og.png"],
    });

    render(
      <LinkWithPreview href="https://example.com" delay={200}>
        Example
      </LinkWithPreview>
    );

    const link = screen.getByRole("link", { name: "Example" });

    await user.hover(link);
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await flush();

    const tip1 = screen.queryByRole("tooltip");
    expect(tip1).not.toBeNull();
    expect(screen.getByText(/Example Domain/i)).toBeInTheDocument();

    await user.unhover(link);
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    await flush();

    // It may still exist briefly due to grace period, but should close soon after
    // Give a bit more time to let close settle
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Tooltip might be removed from DOM
    const maybeTooltip = screen.queryByRole("tooltip");
    // Either null or hidden; we assert null for simplicity
    expect(maybeTooltip).toBeNull();
  });

  it("supports focus/blur and Escape to dismiss", async () => {
    (fetchPreviewClientOnly as any).mockResolvedValue({
      url: "https://example.com",
      title: "Title",
    });

    render(<LinkWithPreview href="https://example.com" delay={0}>Link</LinkWithPreview>);

    const link = screen.getByRole("link", { name: "Link" });

    link.focus();
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    await flush();
    const tip2 = screen.queryByRole("tooltip");
    expect(tip2).not.toBeNull();

    // Escape dismiss
    await user.keyboard("{Escape}");
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    await flush();
    expect(screen.queryByRole("tooltip")).toBeNull();

    // Focus again then blur
    link.focus();
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    await flush();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    link.blur();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    await flush();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders fallback UI on error", async () => {
    (fetchPreviewClientOnly as any).mockResolvedValue({
      error: true,
      message: "Failed",
      code: "FETCH_FAILED",
    });

    render(<LinkWithPreview href="https://example.com">X</LinkWithPreview>);

    const link = screen.getByRole("link", { name: "X" });
    await user.hover(link);
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await flush();

    const tip = screen.queryByRole("tooltip");
    expect(tip).not.toBeNull();
    expect(screen.getByText(/Preview unavailable/i)).toBeInTheDocument();
  });

  it("guards invalid URLs and does not crash", async () => {
    render(<LinkWithPreview href="mailto:test@example.com">Mail</LinkWithPreview>);
    const link = screen.getByRole("link", { name: "Mail" });
    await user.hover(link);
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await flush();
    // No tooltip because we don't preview non-http(s)
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});