import { test, expect } from "@playwright/test";

test.describe("Editor Flow: Login, Generate, Run, Share, Open Share Link", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log(`[BROWSER]: ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

    // Intercept Google external scripts to prevent network hang in headless CI
    await page.route("**recaptcha**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.grecaptcha = { ready: (cb) => cb(), execute: () => Promise.resolve('mock-recaptcha-token') };",
      });
    });

    await page.route("**accounts.google.com/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.google = { accounts: { id: { initialize: () => {}, renderButton: () => {}, prompt: () => {}, cancel: () => {} } } };",
      });
    });

    // Ensure grecaptcha and google accounts id are globally mocked
    await page.addInitScript(() => {
      window.grecaptcha = {
        ready: (cb) => {
          if (typeof cb === "function") cb();
        },
        execute: () => Promise.resolve("mock-recaptcha-token"),
      };
      window.google = {
        accounts: {
          id: {
            initialize: () => {},
            renderButton: () => {},
            prompt: () => {},
            cancel: () => {},
          },
        },
      };
    });

    // Mock stats counts
    await page.route("**/api/**/count", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock Login endpoint
    await page.route("**/api/login", (route) => {
      console.log(`[ROUTE] intercepted /api/login POST`);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-jwt-token-12345",
          username: "buddi_tester",
        }),
      });
    });

    // Mock Auth status check
    await page.route("**/auth/status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          username: "buddi_tester",
        }),
      });
    });

    // Mock Generate Code endpoint
    await page.route("**/generate_code", (route) => {
      console.log(`[ROUTE] intercepted /generate_code`);
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('Code-Buddi'))\n",
      });
    });

    // Mock Run Code endpoint with X-AI-Simulated header
    await page.route("**/get-output", (route) => {
      console.log(`[ROUTE] intercepted /get-output`);
      route.fulfill({
        status: 200,
        headers: {
          "x-ai-simulated": "true",
          "access-control-expose-headers": "x-ai-simulated",
        },
        contentType: "text/plain",
        body: "Hello, Code-Buddi!\n",
      });
    });

    // Mock Temp Share file upload
    await page.route("**/temp-file-upload", (route) => {
      console.log(`[ROUTE] intercepted /temp-file-upload`);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fileUrl: "http://127.0.0.1:5173/python-11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    // Mock Shared File retrieval
    await page.route("**/file/python-11111111-2222-3333-4444-555555555555", (route) => {
      console.log(`[ROUTE] intercepted /file/python-...`);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('Code-Buddi'))\n",
          language: "python",
          title: "My E2E Python Share",
          expiry_time: new Date(Date.now() + 3600000).toISOString(),
        }),
      });
    });
  });

  test("full editor lifecycle", async ({ page }) => {
    console.log("Step 1: Navigating to /login");
    await page.goto("/login");

    console.log("Step 2: Filling login credentials and submitting");
    await page.fill('input[name="email"]', "tester@codebuddi.dev");
    await page.fill('input[name="password"]', "Password123!");
    await page.press('input[name="password"]', "Enter");

    await page.waitForTimeout(1000);

    console.log("Step 3: Navigating to /python");
    await page.goto("/python");
    await expect(page.locator("h1")).toContainText("Python", { timeout: 10000 });

    console.log("Step 4: Clicking Generate");
    const generateBtn = page.locator("button:has-text('Generate')");
    await expect(generateBtn).toBeVisible({ timeout: 10000 });
    await generateBtn.click();

    console.log("Step 5: Filling prompt in Swal modal");
    const swalTextarea = page.locator("#swal-input1");
    await expect(swalTextarea).toBeVisible({ timeout: 5000 });
    await swalTextarea.fill("write a greeting function");
    await page.click(".swal2-confirm");

    await page.waitForTimeout(1500);

    console.log("Step 6: Running code");
    const runBtn = page.locator("button:has-text('Run')");
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    console.log("Step 7: Verifying output panel and AI-simulated badge");
    const outputPanel = page.locator('[data-testid="terminal-output"]');
    await expect(outputPanel).toBeVisible({ timeout: 10000 });
    await expect(outputPanel).toContainText("Hello, Code-Buddi!");

    const simulatedBadge = page.locator('[data-testid="ai-simulated-badge"]');
    await expect(simulatedBadge).toBeVisible();
    await expect(simulatedBadge).toContainText("AI-Simulated (Gemini)");

    console.log("Step 8: Sharing code");
    const shareBtn = page.locator("button:has-text('Share')");
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    const shareTitleInput = page.locator("#titleInput");
    await expect(shareTitleInput).toBeVisible({ timeout: 5000 });
    await page.click(".swal2-confirm");

    const swalSuccess = page.locator(".swal2-success");
    await expect(swalSuccess).toBeVisible({ timeout: 10000 });

    console.log("Step 9: Opening shared link");
    await page.goto("/python-11111111-2222-3333-4444-555555555555");
    await expect(page.locator("body")).toBeVisible();

    await expect(page.locator("text=My E2E Python Share")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Expires on:")).toBeVisible();
    console.log("Lifecycle complete!");
  });
});
