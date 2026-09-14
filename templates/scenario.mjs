export const expectedBeats = ['welcome', 'interaction', 'outcome']

export const walk = async ({ page, mark, hold }) => {
  await page.goto('http://127.0.0.1:4173')
  await mark('welcome')
  await hold('welcome')

  await page.getByRole('button', { name: 'Try it' }).click()
  await mark('interaction')
  await hold('interaction')

  await page.getByRole('heading', { name: 'Done' }).waitFor()
  await mark('outcome')
  await hold('outcome')
}
