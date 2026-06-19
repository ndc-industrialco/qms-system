import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockQueryRaw } = vi.hoisted(() => ({ mockQueryRaw: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { $queryRaw: mockQueryRaw },
}));

import { CarSequenceRepository } from "@/repositories/carSequenceRepository";

describe("CarSequenceRepository", () => {
  let repo: CarSequenceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CarSequenceRepository();
  });

  it("returns integer parsed from DB result", async () => {
    mockQueryRaw.mockResolvedValue([{ configValue: "7" }]);
    const seq = await repo.nextSequence(2026);
    expect(seq).toBe(7);
  });

  it("passes correct year-keyed counter key to DB", async () => {
    mockQueryRaw.mockResolvedValue([{ configValue: "1" }]);
    await repo.nextSequence(2025);
    // $queryRaw`` passes (TemplateStringsArray, ...interpolated_values)
    // interpolated values: counterKey is arg[1], description is arg[2]
    const [, counterKey] = mockQueryRaw.mock.calls[0];
    expect(counterKey).toBe("CAR_COUNTER_2025");
  });

  it("uses tx client when provided", async () => {
    const txQueryRaw = vi.fn().mockResolvedValue([{ configValue: "3" }]);
    const tx = { $queryRaw: txQueryRaw } as never;
    await repo.nextSequence(2026, tx);
    expect(txQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("concurrent calls (simulated) return unique incrementing values", async () => {
    let counter = 0;
    mockQueryRaw.mockImplementation(async () => {
      counter += 1;
      return [{ configValue: String(counter) }];
    });

    const results = await Promise.all([
      repo.nextSequence(2026),
      repo.nextSequence(2026),
      repo.nextSequence(2026),
    ]);

    // Each call must get a unique value — DB atomic upsert guarantees this in prod
    const unique = new Set(results);
    expect(unique.size).toBe(3);
    expect(results).toEqual([1, 2, 3]);
  });
});
