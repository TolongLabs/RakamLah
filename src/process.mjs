import { spawn } from 'node:child_process'

export const runProcess = (file, args = [], options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => (stdout += chunk))
    child.stderr?.on('data', (chunk) => (stderr += chunk))
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code: code ?? 1, signal, stdout, stderr }))
  })

export const commandExists = async (name) => {
  const finder = process.platform === 'win32' ? 'where' : 'which'
  try {
    const result = await runProcess(finder, [name])
    return result.code === 0
  } catch {
    return false
  }
}
