const puppeteer = require('puppeteer')
const path = require('path')

async function run() {
  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']})
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 700 })

  const items = [
    { file: 'screenshots/mock/options.html', out: 'screenshots/real/options-upload.png' },
    { file: 'screenshots/mock/job.html', out: 'screenshots/real/job-overlay.png' },
    { file: 'screenshots/mock/popup.html', out: 'screenshots/real/popup-dashboard.png' },
  ]

  for (const item of items) {
    const fileUrl = 'file://' + path.resolve(item.file)
    console.log('Loading', fileUrl)
    await page.goto(fileUrl, { waitUntil: 'networkidle2' })
    await page.waitForTimeout(250)
    await page.screenshot({ path: item.out, fullPage: true })
    console.log('Saved', item.out)
  }

  await browser.close()
}

run().catch(err => { console.error(err); process.exit(1) })
