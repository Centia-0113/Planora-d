import { expect, test, type Page } from '@playwright/test'

/**
 * Full user journeys against a real (test) Supabase project.
 * Requires an existing, email-verified test account:
 *   PLANORA_E2E_EMAIL, PLANORA_E2E_PASSWORD   (and the app built with that project's env)
 * Journey 4 also needs the generate-plan function deployed with an AI key:
 *   PLANORA_E2E_AI=1
 * Without these variables the journeys are skipped.
 */
const email = process.env.PLANORA_E2E_EMAIL
const password = process.env.PLANORA_E2E_PASSWORD
const runId = Date.now().toString(36)

test.describe('User journeys', () => {
  test.skip(!email || !password, 'Set PLANORA_E2E_EMAIL and PLANORA_E2E_PASSWORD to run journeys')
  test.describe.configure({ mode: 'serial' })

  async function signIn(page: Page) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password', { exact: true }).fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  }

  test('Journey 1: sign in, reach the workspace, sign out', async ({ page }) => {
    await signIn(page)
    await expect(page.getByRole('list', { name: 'Task summary' })).toBeVisible()
    await page.getByRole('button', { name: /Account menu/ }).click()
    await page.getByRole('menuitem', { name: 'Log out' }).click()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Journey 2: create, edit and complete a task; dashboard updates', async ({ page }) => {
    await signIn(page)
    await page.goto('/tasks')
    await page.getByRole('button', { name: 'New task' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title').fill(`E2E task ${runId}`)
    await dialog.getByLabel('Priority').selectOption('high')
    await dialog.getByLabel('Category').selectOption({ label: 'Academic' })
    await dialog.getByRole('button', { name: 'Create task' }).click()
    await expect(page.getByRole('link', { name: `E2E task ${runId}` })).toBeVisible()

    await page.getByRole('link', { name: `E2E task ${runId}` }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByRole('dialog').getByLabel('Title').fill(`E2E task ${runId} edited`)
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: `E2E task ${runId} edited` })).toBeVisible()

    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible()
    await page.goto('/dashboard')
    await expect(page.getByRole('list', { name: 'Task summary' })).toContainText('Completed')
  })

  test('Journey 3: create a project with a task and milestone; see it in the planner', async ({
    page,
  }) => {
    await signIn(page)
    await page.goto('/projects')
    await page.getByRole('button', { name: 'New project' }).click()
    await page.getByRole('dialog').getByLabel('Project name').fill(`E2E project ${runId}`)
    await page.getByRole('dialog').getByRole('button', { name: 'Create project' }).click()
    await page.getByRole('link', { name: new RegExp(`E2E project ${runId}`) }).click()

    await page.getByRole('button', { name: 'Add task' }).click()
    await page.getByRole('dialog').getByLabel('Title').fill(`Project task ${runId}`)
    await page
      .getByRole('dialog')
      .getByLabel('Due date')
      .fill(new Date().toISOString().slice(0, 10))
    await page.getByRole('dialog').getByRole('button', { name: 'Create task' }).click()
    await expect(page.getByRole('link', { name: `Project task ${runId}` })).toBeVisible()

    await page.getByRole('button', { name: 'Add milestone' }).click()
    await page.getByRole('dialog').getByLabel('Title').fill(`Milestone ${runId}`)
    await page
      .getByRole('dialog')
      .getByLabel('Deadline')
      .fill(new Date().toISOString().slice(0, 10))
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(`Milestone ${runId}`)).toBeVisible()

    await page.goto('/planner')
    await expect(page.getByRole('complementary', { name: 'Selected day' })).toContainText(
      `Project task ${runId}`,
    )
  })

  test('Journey 4: upload a document, generate, review and approve a plan', async ({ page }) => {
    test.skip(!process.env.PLANORA_E2E_AI, 'Set PLANORA_E2E_AI=1 to exercise AI planning')
    test.setTimeout(180_000)
    await signIn(page)
    await page.goto('/documents')
    await page.getByLabel('Choose files to upload').setInputFiles({
      name: `brief-${runId}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'Project: Community garden website. Deliverables: a homepage, a volunteer sign-up form and an events page. ' +
          'The volunteer form must be live by 15 January 2027. Launch the full site by 31 January 2027.',
      ),
    })
    await expect(page.getByText('Uploaded')).toBeVisible()
    await page.getByRole('button', { name: new RegExp(`brief-${runId}`) }).click()
    await page.getByRole('link', { name: 'Generate plan' }).click()
    await page.getByRole('button', { name: 'Generate plan' }).click()
    await expect(page.getByRole('link', { name: 'Review plan' }).first()).toBeVisible({
      timeout: 150_000,
    })
    await page.getByRole('link', { name: 'Review plan' }).first().click()
    await expect(page.getByText('From document').first()).toBeVisible()
    await page.getByRole('button', { name: /Approve and create/ }).click()
    await expect(page).toHaveURL(/\/projects\//)
  })

  test('Journey 5: daily checklist', async ({ page }) => {
    await signIn(page)
    await page.goto('/checklist')
    await page.getByLabel('New activity').fill(`Stretch ${runId}`)
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('checkbox', { name: `Mark "Stretch ${runId}" done` }).check()
    await expect(page.getByRole('progressbar', { name: 'Daily completion' })).not.toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  test('Journey 6: create a reminder', async ({ page }) => {
    await signIn(page)
    await page.goto('/notifications')
    await page.getByRole('tab', { name: 'reminders' }).click()
    await page.getByRole('button', { name: 'New reminder' }).click()
    await page.getByRole('dialog').getByLabel('Title').fill(`Reminder ${runId}`)
    await page.getByRole('dialog').getByRole('button', { name: 'Set reminder' }).click()
    await expect(page.getByText(`Reminder ${runId}`)).toBeVisible()
  })
})
