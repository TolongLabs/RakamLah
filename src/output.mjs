const fallbackMessage = (result) => (result.ok ? `${result.command} completed.` : `${result.command} failed.`)

export const writeResult = (result, { json, stdout = process.stdout, stderr = process.stderr }) => {
  if (json) {
    stdout.write(`${JSON.stringify(result)}\n`)
    return
  }

  const stream = result.ok ? stdout : stderr
  stream.write(`${result.message || fallbackMessage(result)}\n`)
}
