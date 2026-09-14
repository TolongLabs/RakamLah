export const linearPosition = (start, end, progress) => {
  const clamped = Math.min(1, Math.max(0, progress))
  return start + (end - start) * clamped
}

const targetY = async (page, target) => {
  if (Number.isFinite(target)) return target
  if (target && typeof target.evaluate === 'function') {
    return target.evaluate(
      (element) => window.scrollY + element.getBoundingClientRect().top - window.innerHeight * 0.15
    )
  }
  throw new TypeError('scroll target must be a Y coordinate or locator')
}

export const linearScroll = async (page, target, { duration = 900, reducedMotion = false } = {}) => {
  if (!Number.isFinite(duration) || duration < 0) throw new RangeError('scroll duration must be a nonnegative number')
  const destination = await targetY(page, target)
  return page.evaluate(
    ({ target: requestedTarget, duration: requestedDuration }) =>
      new Promise((resolve) => {
        const startY = window.scrollY
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        const finalY = Math.max(0, Math.min(maximum, requestedTarget))
        const distance = finalY - startY
        const root = document.documentElement
        const previousBehavior = root.style.scrollBehavior
        root.style.scrollBehavior = 'auto'

        if (requestedDuration === 0 || distance === 0) {
          window.scrollTo(0, finalY)
          root.style.scrollBehavior = previousBehavior
          resolve({ startY, targetY: finalY, duration: 0 })
          return
        }

        const startedAt = performance.now()
        const frame = (now) => {
          const progress = Math.min(1, (now - startedAt) / requestedDuration)
          window.scrollTo(0, startY + distance * progress)
          if (progress < 1) requestAnimationFrame(frame)
          else {
            root.style.scrollBehavior = previousBehavior
            resolve({ startY, targetY: finalY, duration: requestedDuration })
          }
        }
        requestAnimationFrame(frame)
      }),
    { target: destination, duration: reducedMotion ? 0 : duration }
  )
}
