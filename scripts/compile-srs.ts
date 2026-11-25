#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Command } from "commander";

const exec = promisify(execFile);

export const defaultSingBoxDirs = ["sing-box", "sing-box-domain", "sing-box-ip"] as const;

export interface CompileOptions {
  rulesDir: string;
  dirs: string;
  singBox: string;
  concurrency: string;
}

export interface CompileTask {
  sourcePath: string;
  outputPath: string;
}

/**
 * Resolve the sing-box binary path from explicit flag, env var, or PATH.
 */
export function resolveSingBoxBinary(explicit?: string, envVar = process.env.SING_BOX_BIN): string {
  const candidate = explicit?.trim() || envVar?.trim();
  return candidate || "sing-box";
}

/**
 * Collect JSON->SRS compilation jobs and stale SRS files inside one directory.
 */
export async function planDirectoryCompile(dirPath: string): Promise<{
  tasks: CompileTask[];
  staleSrs: string[];
}> {
  const entries = await readdir(dirPath, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  });

  const jsonNames = new Set(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.slice(0, -".json".length))
  );

  const tasks = [...jsonNames]
    .sort()
    .map((stem) => ({
      sourcePath: path.join(dirPath, `${stem}.json`),
      outputPath: path.join(dirPath, `${stem}.srs`)
    }));

  const staleSrs = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".srs"))
    .map((entry) => entry.name.slice(0, -".srs".length))
    .filter((stem) => !jsonNames.has(stem))
    .sort()
    .map((stem) => path.join(dirPath, `${stem}.srs`));

  return { tasks, staleSrs };
}

/**
 * Compile all planned sing-box JSON rule-sets into binary .srs files with bounded concurrency.
 */
export async function compileAllSrs(params: {
  rulesDir: string;
  dirs: string[];
  singBoxBin: string;
  concurrency: number;
  runner?: (bin: string, args: string[]) => Promise<void>;
}): Promise<{ compiled: number; removed: number }> {
  if (!Number.isInteger(params.concurrency) || params.concurrency < 1) {
    throw new Error(`Invalid concurrency: ${params.concurrency}`);
  }

  const runExec =
    params.runner ??
    (async (bin: string, args: string[]) => {
      await exec(bin, args);
    });

  const allTasks: CompileTask[] = [];
  const allStale: string[] = [];

  for (const dir of params.dirs) {
    const dirPath = path.join(params.rulesDir, dir);
    const { tasks, staleSrs } = await planDirectoryCompile(dirPath);
    allTasks.push(...tasks);
    allStale.push(...staleSrs);
  }

  await Promise.all(allStale.map((filePath) => rm(filePath, { force: true })));

  let cursor = 0;
  const workerCount = Math.min(params.concurrency, Math.max(allTasks.length, 1));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < allTasks.length) {
        const idx = cursor;
        cursor += 1;
        const task = allTasks[idx]!;
        await runExec(params.singBoxBin, ["rule-set", "compile", task.sourcePath, "-o", task.outputPath]);
      }
    })
  );

  return { compiled: allTasks.length, removed: allStale.length };
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("compile-srs")
    .description("Compile sing-box JSON rule-sets into binary .srs files.")
    .option("-r, --rules-dir <dir>", "root rules directory", "rules")
    .option("-d, --dirs <names>", "comma-separated subdirectories under rules", defaultSingBoxDirs.join(","))
    .option("-b, --sing-box <path>", "path to sing-box binary (defaults to SING_BOX_BIN or PATH)", "")
    .option("-j, --concurrency <n>", "parallel compile workers", "8")
    .action(async (options: CompileOptions) => {
      const dirs = options.dirs
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const singBoxBin = resolveSingBoxBinary(options.singBox);
      const concurrency = Number.parseInt(options.concurrency, 10);
      const result = await compileAllSrs({
        rulesDir: options.rulesDir,
        dirs,
        singBoxBin,
        concurrency
      });
      console.log(`[compile:srs] compiled ${result.compiled} .srs files, removed ${result.removed} stale .srs files`);
    });

  await program.parseAsync();
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
