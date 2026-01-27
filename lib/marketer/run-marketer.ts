import { spawn } from "child_process";
import path from "path";

/**
 * realpick-marketing의 bridge.py를 실행하는 공통 유틸리티 (로컬 전용)
 * spawn을 사용하여 안전한 인자 전달
 */
export async function runMarketerBridge(command: string, args: Record<string, any> = {}) {
  return new Promise((resolve) => {
    try {
      // 1. 경로 설정
      const marketingPath = path.resolve(process.cwd(), "..", "realpick-marketing");
      const pythonPath = "python";

      // 2. 인자를 배열로 구성 (spawn은 배열로 인자를 받아 자동으로 이스케이프 처리)
      const pyArgs = ["bridge.py", command];
      for (const [key, value] of Object.entries(args)) {
        pyArgs.push(`--${key}`);
        // 객체는 JSON으로 직렬화
        pyArgs.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
      }

      console.log(`[Marketer Bridge] 실행:`, pythonPath, pyArgs.join(" "));

      // 3. 프로세스 실행 (spawn은 자동으로 인자를 안전하게 이스케이프)
      const child = spawn(pythonPath, pyArgs, {
        cwd: marketingPath,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8", // Python의 stdout/stderr를 UTF-8로 설정
        },
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (stderr) {
          console.warn("[Marketer Bridge] stderr:", stderr);
        }

        // 4. 결과 파싱
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (parseError) {
          console.error("[Marketer Bridge] 파싱 오류. Raw output:", stdout);
          resolve({
            success: false,
            error: "파이썬 출력 파싱 실패",
            raw: stdout,
            stderr: stderr
          });
        }
      });

      child.on("error", (error) => {
        console.error("[Marketer Bridge] 프로세스 오류:", error);
        resolve({ success: false, error: error.message });
      });

    } catch (error: any) {
      console.error("[Marketer Bridge] 실행 오류:", error);
      resolve({ success: false, error: error.message });
    }
  });
}
