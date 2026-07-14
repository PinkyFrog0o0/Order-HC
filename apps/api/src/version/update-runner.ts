/**
 * 更新任务运行器
 *
 * 封装"一键升级"的后台进程：spawn `bash deploy/update.sh` 拉新代码并重启 API。
 *
 * 设计要点：
 * - 单 in-memory slot（一次只能跑一个）；并发 start 抛 ALREADY_RUNNING。
 * - 日志固定落 /opt/haycargo/deploy/update.log（每次启动 truncate），便于审计与重启后回看。
 * - 内存里同时保留 last 500 行供轮询接口读取，避免每次 GET 都 tail 文件。
 * - update.sh 末尾会 `systemctl restart haycargo-api`——本进程会被重启杀掉，
 *   重启后 in-memory 状态归零是预期的（日志文件还在）。
 * - 不在 Nest 关闭钩子里杀子进程：父进程死时 detached 子进程由 systemd 接管，无需清理。
 */

import { spawn } from 'node:child_process';
import { appendFileSync, openSync, closeSync } from 'node:fs';

import { Injectable } from '@nestjs/common';

const PROJECT_ROOT = '/opt/haycargo';
const LOG_FILE = `${PROJECT_ROOT}/deploy/update.log`;
const SCRIPT = 'deploy/update.sh';
const MAX_LINES = 500;
const TAIL_LINES = 200;

export class UpdateAlreadyRunningError extends Error {
  constructor() {
    super('已有更新任务在执行中');
    this.name = 'UpdateAlreadyRunningError';
  }
}

export interface UpdateStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  /** 最近 200 行日志（含 stderr） */
  lastLines: string[];
}

@Injectable()
export class UpdateRunner {
  private proc: import('node:child_process').ChildProcess | null = null;
  private lines: string[] = [];
  private startedAt: Date | null = null;
  private finishedAt: Date | null = null;
  private exitCode: number | null = null;

  /**
   * 启动一次 update.sh 任务。若已有任务在跑，抛 UpdateAlreadyRunningError。
   */
  start(): void {
    if (this.proc) {
      throw new UpdateAlreadyRunningError();
    }

    // truncate 日志
    const fd = openSync(LOG_FILE, 'w');
    closeSync(fd);

    this.lines = [];
    this.startedAt = new Date();
    this.finishedAt = null;
    this.exitCode = null;

    const child = spawn('bash', [SCRIPT], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.proc = child;

    const onLine = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      appendFileSync(LOG_FILE, text);
      for (const raw of text.split(/\r?\n/)) {
        if (raw.length === 0) continue;
        this.lines.push(raw);
        if (this.lines.length > MAX_LINES) {
          this.lines.splice(0, this.lines.length - MAX_LINES);
        }
      }
    };
    child.stdout?.on('data', onLine);
    child.stderr?.on('data', onLine);

    child.on('exit', (code) => {
      this.finishedAt = new Date();
      this.exitCode = code;
      this.proc = null;
    });
    child.on('error', (err) => {
      appendFileSync(LOG_FILE, `\n[spawn error] ${err.message}\n`);
      this.finishedAt = new Date();
      this.exitCode = -1;
      this.proc = null;
    });

    // 不 child.unref()：本进程会被 update.sh 重启，杀掉也会带着日志正常落盘；但保留引用便于调试
  }

  /**
   * 当前任务快照。
   */
  status(): UpdateStatus {
    return {
      running: this.proc !== null,
      startedAt: this.startedAt?.toISOString() ?? null,
      finishedAt: this.finishedAt?.toISOString() ?? null,
      exitCode: this.exitCode,
      lastLines: this.lines.slice(-TAIL_LINES),
    };
  }
}
