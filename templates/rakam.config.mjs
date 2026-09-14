export default {
  project: 'my-product',
  scenario: './scenario.mjs',
  narration: './narration.txt',
  outputDir: './.rakam/out',
  browser: {
    viewport: { width: 1440, height: 900 },
    headless: true
  },
  video: {
    width: 1920,
    height: 1080,
    minDuration: 60,
    maxDuration: 120
  },
  subtitles: {
    font: 'Quicksand',
    fontSize: 18,
    horizontalMargin: 80,
    verticalMargin: 28,
    maxRows: 2
  },
  tts: {
    engine: 'kokoro',
    voice: 'af_heart',
    speed: 1
  }
}
