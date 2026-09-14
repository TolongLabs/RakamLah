export default {
  project: 'signal-studio-example',
  scenario: './scenario.mjs',
  narration: './narration.txt',
  outputDir: './.rakam/out',
  browser: {
    viewport: { width: 1440, height: 900 },
    channel: process.env.RAKAM_BROWSER_CHANNEL || null,
    headless: true
  },
  video: {
    width: 1920,
    height: 1080,
    minDuration: 20,
    maxDuration: 45,
    preset: 'medium'
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
