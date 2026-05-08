import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/supabase/client";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";

function Probe({ onChange }: { onChange: () => void }) {
  useProductsRealtime(onChange);
  return null;
}

describe("useProductsRealtime", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("escucha productos y metadatos, pero agrupa rafagas en un solo reload", () => {
    vi.useFakeTimers();
    const callbacks: Array<() => void> = [];
    const channel = {
      on: vi.fn((_event, _filter, callback: () => void) => {
        callbacks.push(callback);
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };
    vi.mocked(supabase.channel).mockReturnValue(channel as never);
    const onChange = vi.fn();

    const { unmount } = render(<Probe onChange={onChange} />);

    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "productos" },
      expect.any(Function)
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "productoCodigos" },
      expect.any(Function)
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "productoFinanzas" },
      expect.any(Function)
    );

    callbacks.forEach((callback) => callback());
    vi.advanceTimersByTime(299);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledTimes(1);

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
