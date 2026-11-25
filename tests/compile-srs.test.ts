import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compileAllSrs, planDirectoryCompile, resolveSingBoxBinary } from "../scripts/compile-srs.js";

describe("compile-srs", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "compile-srs-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("resolves sing-box binary precedence (flag > env > PATH)", () => {
    expect(resolveSingBoxBinary("/custom/sing-box", "/env/sing-box")).toBe("/custom/sing-box");
    expect(resolveSingBoxBinary("", "/env/sing-box")).toBe("/env/sing-box");
    expect(resolveSingBoxBinary("", "")).toBe("sing-box");
  });

  it("plans JSON-to-SRS tasks and removes stale SRS files", async () => {
    const domainDir = path.join(tmpDir, "sing-box-domain");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(domainDir, { recursive: true }));
    await writeFile(path.join(domainDir, "anthropic.json"), '{"version":2,"rules":[]}\n', "utf8");
    await writeFile(path.join(domainDir, "anthropic.srs"), "old", "utf8");
    await writeFile(path.join(domainDir, "removed.srs"), "stale", "utf8");

    const plan = await planDirectoryCompile(domainDir);
    expect(plan.tasks).toEqual([
      {
        sourcePath: path.join(domainDir, "anthropic.json"),
        outputPath: path.join(domainDir, "anthropic.srs")
      }
    ]);
    expect(plan.staleSrs).toEqual([path.join(domainDir, "removed.srs")]);

    const calls: Array<{ bin: string; args: string[] }> = [];
    const result = await compileAllSrs({
      rulesDir: tmpDir,
      dirs: ["sing-box-domain", "missing-dir"],
      singBoxBin: "/usr/bin/sing-box",
      concurrency: 2,
      runner: async (bin, args) => {
        calls.push({ bin, args });
      }
    });

    expect(result).toEqual({ compiled: 1, removed: 1 });
    expect(calls).toEqual([
      {
        bin: "/usr/bin/sing-box",
        args: [
          "rule-set",
          "compile",
          path.join(domainDir, "anthropic.json"),
          "-o",
          path.join(domainDir, "anthropic.srs")
        ]
      }
    ]);

    const remainingPlan = await planDirectoryCompile(domainDir);
    expect(remainingPlan.staleSrs).toEqual([]);
  });
});
