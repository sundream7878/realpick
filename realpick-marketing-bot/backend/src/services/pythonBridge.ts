import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * crawler/bridge.py를 실행하는 공통 유틸리티 (로컬 전용)
 * 한글 인코딩 문제 해결을 위해 JSON 파일로 인자 전달
 */
export async function runMarketerBridge(
  command: string,
  args: Record<string, any> = {},
  options?: { onLogLine?: (line: string) => void }
) {
  return new Promise((resolve) => {
    try {
      // 1. 경로 설정 (realpick-marketing-bot/crawler)
      const botRoot = path.resolve(__dirname, "..", "..", "..");
      let crawlerPath = path.join(botRoot, "crawler");
      
      // crawler 디렉토리가 없으면 상위 디렉토리에서 찾기
      if (!fs.existsSync(crawlerPath)) {
        const altCrawlerPath = path.join(path.dirname(botRoot), "crawler");
        if (fs.existsSync(altCrawlerPath)) {
          console.log(`[Python Bridge] crawler 디렉토리를 대체 경로에서 발견: ${altCrawlerPath}`);
          crawlerPath = altCrawlerPath;
        } else {
          throw new Error(`crawler 디렉토리를 찾을 수 없습니다: ${crawlerPath}, ${altCrawlerPath}`);
        }
      }
      const pythonPath = process.platform === 'win32' ? 'py' : 'python3';

      console.log(`[Python Bridge] 봇 루트: ${botRoot}`);
      console.log(`[Python Bridge] 크롤러 경로: ${crawlerPath}`);

      // 2. 임시 JSON 파일로 인자 저장 (한글 인코딩 문제 해결)
      const tempId = randomBytes(8).toString('hex');
      const tempFile = path.join(crawlerPath, `.args_${tempId}.json`);
      const argsData = { command, ...args };
      
      fs.writeFileSync(tempFile, JSON.stringify(argsData, null, 2), 'utf8');

      console.log(`[Python Bridge] 실행:`, pythonPath, 'bridge.py', `--args-file=${tempFile}`);

      // 3. 프로세스 실행
      const child = spawn(pythonPath, ['bridge.py', `--args-file=${tempFile}`], {
        cwd: crawlerPath,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let stderrBuf = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString('utf8');
      });

      child.stderr?.on("data", (data) => {
        const chunk = data.toString('utf8');
        stderr += chunk;

        // 실시간 로그 라인 스트리밍 (대시보드 진행현황용)
        if (options?.onLogLine) {
          stderrBuf += chunk;
          const lines = stderrBuf.split(/\r?\n/);
          stderrBuf = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) options.onLogLine(trimmed);
          }
        }
      });

      child.on("close", (code) => {
        // 임시 파일 삭제
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (e) {
          console.warn("[Python Bridge] 임시 파일 삭제 실패:", e);
        }

        if (stderr) {
          console.warn("[Python Bridge] stderr:", stderr);
        }

        // 4. 결과 파싱
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (parseError) {
          console.error("[Python Bridge] 파싱 오류. Raw output:", stdout);
          resolve({
            success: false,
            error: "파이썬 출력 파싱 실패",
            raw: stdout,
            stderr: stderr
          });
        }
      });

      child.on("error", (error) => {
        console.error("[Python Bridge] 프로세스 오류:", error);
        resolve({ success: false, error: error.message });
      });

    } catch (error: any) {
      console.error("[Python Bridge] 실행 오류:", error);
      resolve({ success: false, error: error.message });
    }
  });
}
