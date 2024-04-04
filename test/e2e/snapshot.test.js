const http = require('http')
const puppeteer = require('puppeteer')

const { toMatchImageSnapshot } = require('jest-image-snapshot')
expect.extend({ toMatchImageSnapshot })

const host = 'http://localhost:5188/'

async function waitForEvent(page, eventName) {
  await page.evaluate(
    (eventName) => new Promise((resolve) => document.addEventListener(eventName, resolve, { once: true })),
    eventName
  )
}
function waitForServer() {
  return new Promise((resolve) => {
    function ping() {
      const request = http.request(host, { method: 'HEAD' }, resolve)
      request.on('error', () => {
        setTimeout(ping, 500) // not yet up? => re-ping in 500ms
      })
      request.end()
    }

    ping()
  })
}

describe('snapshot', () => {
  let browser
  let page
  beforeAll(async () => {
    await waitForServer()
    console.log('server ok')

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    console.log('executablePath', executablePath)

    const args = ['--enable-gpu']
    // args.push(
    //   // '--disable-web-security',
    //   // '--disable-features=IsolateOrigins,site-per-process',
    //   // '--flag-switches-begin --disable-gpu --disable-software-rasterizer --flag-switches-end'

    //   // '--disable-gpu', // Disables GPU hardware acceleration
    //   // '--disable-dev-shm-usage', // Fixes some memory issues
    //   // '--no-sandbox', // Bypass the sandbox for simplicity, use with caution
    //   // '--disable-setuid-sandbox', // See above, related to sandboxing
    //   // '--use-gl=swiftshader' // Force the use of SwiftShader for WebGL

    //   // '--enable-unsafe-webgpu',
    //   // '--enable-features=Vulkan',
    //   // '--use-gl=swiftshader',
    //   // '--use-angle=swiftshader',
    //   // '--use-vulkan=swiftshader',
    //   // '--use-webgpu-adapter=swiftshader'
    // )

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args,
    })
    console.log('browser ok')

    page = await browser.newPage()
    console.log('page ok')

    page.on('console', (message) => console.log(`Page log: ${message.text()}`))
  }, 30000)

  it('should match previous one', async () => {
    // ⏳ "r3f" event
    await page.goto(host)
    console.log('goto ok')

    await waitForEvent(page, 'puppeteer:r3f')
    console.log('event ok')

    // 📸 <canvas>
    const $canvas = await page.$('canvas[data-engine]')
    const image = await $canvas.screenshot()

    // compare
    expect(image).toMatchImageSnapshot({
      failureThreshold: 1,
      failureThresholdType: 'percent',
    })
  }, 30000)

  afterAll(async () => {
    await browser?.close()
  })
})
