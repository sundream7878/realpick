#!/usr/bin/env tsx
/**
 * 네이밍 헌법 준수 여부 검증 스크립트
 */

import { readdir, stat } from "fs/promises"
import { join, extname, basename, dirname } from "path"
import { existsSync } from "fs"

interface Violation {
  path: string
  issue: string
  severity: "error" | "warning"
  suggestion?: string
}

const violations: Violation[] = []

// 검사할 디렉토리
const directoriesToCheck = [
  "app",
  "components",
  "hooks",
  "lib",
  "types",
  "stores",
]

async function checkDirectory(dir: string, prefix: string, expectedSuffix?: string) {
  if (!existsSync(dir)) return

  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = fullPath.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", "")

      if (entry.isDirectory()) {
        // 폴더명 검사
        if (prefix && !entry.name.startsWith(prefix)) {
          violations.push({
            path: relativePath,
            issue: `폴더명이 '${prefix}' 접두사를 사용하지 않습니다`,
            severity: "error",
            suggestion: `${prefix}${entry.name.replace(/^[a-z]-/, "")}`,
          })
        }

        // 하위 디렉토리 재귀 검사
        await checkDirectory(fullPath, prefix, expectedSuffix)
      } else if (entry.isFile()) {
        // 파일명 검사
        const ext = extname(entry.name)
        const nameWithoutExt = basename(entry.name, ext)

        if (expectedSuffix && ext === ".ts" && !entry.name.endsWith(expectedSuffix)) {
          // Next.js 특수 파일은 제외 (page.tsx, layout.tsx, route.ts 등)
          const nextjsSpecialFiles = ["page.tsx", "layout.tsx", "route.ts", "loading.tsx", "error.tsx", "not-found.tsx"]
          if (!nextjsSpecialFiles.includes(entry.name)) {
            violations.push({
              path: relativePath,
              issue: `파일명이 '${expectedSuffix}' 접미사를 사용하지 않습니다`,
              severity: "error",
              suggestion: `${nameWithoutExt}${expectedSuffix}`,
            })
          }
        }
      }
    }
  } catch (err) {
    console.error(`디렉토리 검사 오류 (${dir}):`, err)
  }
}

async function checkHooks() {
  await checkDirectory("hooks", "h-", ".hook.ts")

  // hooks 폴더의 루트 레벨 파일 검사
  try {
    const entries = await readdir("hooks", { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".hook.ts")) {
        violations.push({
          path: `hooks/${entry.name}`,
          issue: "Hook 파일은 '.hook.ts' 접미사를 사용해야 합니다",
          severity: "error",
          suggestion: entry.name.replace(".ts", ".hook.ts"),
        })
      }
    }
  } catch (err) {
    // hooks 폴더가 없을 수 있음
  }
}

async function checkComponents() {
  await checkDirectory("components", "c-")

  // components 폴더의 루트 레벨 파일 검사
  try {
    const entries = await readdir("components", { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".tsx")) {
        const relativePath = `components/${entry.name}`
        // c- 접두사가 없는 폴더에 있는 파일은 경고
        if (!entry.name.startsWith("c-")) {
          violations.push({
            path: relativePath,
            issue: "컴포넌트 파일은 'c-' 접두사 폴더에 있어야 합니다",
            severity: "warning",
            suggestion: `components/c-${entry.name.replace(/\.tsx$/, "")}/${entry.name}`,
          })
        }
      } else if (entry.isDirectory() && !entry.name.startsWith("c-")) {
        violations.push({
          path: `components/${entry.name}`,
          issue: "컴포넌트 폴더는 'c-' 접두사를 사용해야 합니다",
          severity: "error",
          suggestion: `c-${entry.name}`,
        })
      }
    }
  } catch (err) {
    // components 폴더가 없을 수 있음
  }
}

async function checkTypes() {
  await checkDirectory("types", "t-", ".types.ts")

  // types 폴더의 루트 레벨 파일 검사
  try {
    const entries = await readdir("types", { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".types.ts")) {
        violations.push({
          path: `types/${entry.name}`,
          issue: "Type 파일은 '.types.ts' 접미사를 사용해야 합니다",
          severity: "error",
          suggestion: entry.name.replace(".ts", ".types.ts"),
        })
      }
    }
  } catch (err) {
    // types 폴더가 없을 수 있음
  }
}

async function checkUtils() {
  await checkDirectory("lib/utils", "u-", ".util.ts")

  // lib 폴더의 루트 레벨 파일 검사
  try {
    const entries = await readdir("lib", { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".ts")) {
        // utils.ts는 허용 (레거시)
        if (entry.name !== "utils.ts" && !entry.name.includes("supabase")) {
          violations.push({
            path: `lib/${entry.name}`,
            issue: "Util 파일은 'lib/utils/u-*' 폴더에 '.util.ts' 접미사를 사용해야 합니다",
            severity: "warning",
            suggestion: `lib/utils/u-${entry.name.replace(".ts", "")}/${entry.name.replace(".ts", ".util.ts")}`,
          })
        }
      }
    }
  } catch (err) {
    // lib 폴더가 없을 수 있음
  }
}

async function checkStores() {
  await checkDirectory("stores", "s-", ".store.ts")
}

async function checkAppPages() {
  // Next.js app 폴더는 프레임워크 규칙을 따르므로 p- 접두사는 선택사항
  // 하지만 일관성을 위해 확인만 함
  try {
    const entries = await readdir("app", { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith("api") && !entry.name.startsWith("_")) {
        // p- 접두사가 없으면 경고 (필수는 아님)
        if (!entry.name.startsWith("p-")) {
          violations.push({
            path: `app/${entry.name}`,
            issue: "페이지 폴더는 'p-' 접두사를 사용하는 것을 권장합니다 (선택사항)",
            severity: "warning",
            suggestion: `p-${entry.name}`,
          })
        }
      }
    }
  } catch (err) {
    // app 폴더가 없을 수 있음
  }
}

async function checkAppApi() {
  // Next.js app/api 폴더는 프레임워크 규칙을 따르므로 a- 접두사는 선택사항
  try {
    if (existsSync("app/api")) {
      const entries = await readdir("app/api", { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith("a-")) {
          violations.push({
            path: `app/api/${entry.name}`,
            issue: "API 폴더는 'a-' 접두사를 사용하는 것을 권장합니다 (선택사항)",
            severity: "warning",
            suggestion: `a-${entry.name}`,
          })
        }
      }
    }
  } catch (err) {
    // app/api 폴더가 없을 수 있음
  }
}

async function main() {
  console.log("🔍 네이밍 헌법 준수 여부 검증 시작...\n")

  await checkHooks()
  await checkComponents()
  await checkTypes()
  await checkUtils()
  await checkStores()
  await checkAppPages()
  await checkAppApi()

  // 결과 출력
  console.log("=".repeat(80))
  console.log("📊 검증 결과")
  console.log("=".repeat(80))

  const errors = violations.filter((v) => v.severity === "error")
  const warnings = violations.filter((v) => v.severity === "warning")

  if (errors.length === 0 && warnings.length === 0) {
    console.log("\n✅ 모든 파일이 네이밍 헌법을 준수하고 있습니다!\n")
    return
  }

  if (errors.length > 0) {
    console.log(`\n❌ 오류: ${errors.length}개 발견\n`)
    errors.forEach((v, i) => {
      console.log(`${i + 1}. ${v.path}`)
      console.log(`   문제: ${v.issue}`)
      if (v.suggestion) {
        console.log(`   제안: ${v.suggestion}`)
      }
      console.log()
    })
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️ 경고: ${warnings.length}개 발견\n`)
    warnings.forEach((v, i) => {
      console.log(`${i + 1}. ${v.path}`)
      console.log(`   문제: ${v.issue}`)
      if (v.suggestion) {
        console.log(`   제안: ${v.suggestion}`)
      }
      console.log()
    })
  }

  console.log("=".repeat(80))
  console.log(`\n총 ${violations.length}개의 문제가 발견되었습니다.`)
  console.log(`  - 오류: ${errors.length}개`)
  console.log(`  - 경고: ${warnings.length}개`)
  console.log("\n💡 NAMING_CONVENTION.md 파일을 참고하여 수정하세요.\n")
}

main().catch((err) => {
  console.error("❌ 스크립트 실행 오류:", err)
  process.exit(1)
})







