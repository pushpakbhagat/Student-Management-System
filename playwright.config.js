// Browser tests: npm run e2e   (first time: npx playwright install chromium)
const { defineConfig, devices } = require("@playwright/test")

module.exports = defineConfig({
    testDir: "./e2e",
    timeout: 45_000,
    expect: { timeout: 10_000 },
    // the tests share one seeded database, so run them one at a time
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: "http://localhost:5180",
        trace: "retain-on-failure",
        // no entrance animations or smooth scrolling, so elements hold still while being clicked
        reducedMotion: "reduce",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        // tests tagged @phone also run on a phone-sized screen
        { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
    ],
    webServer: [
        {
            command: "node e2e/server.js",
            url: "http://localhost:8006/health",
            timeout: 120_000,
            stdout: "ignore",
        },
        {
            command: "node node_modules/vite/bin/vite.js --port 5180 --strictPort",
            cwd: "frontend",
            url: "http://localhost:5180",
            timeout: 120_000,
            env: { ...process.env, API_PROXY_TARGET: "http://localhost:8006" },
        },
    ],
})
