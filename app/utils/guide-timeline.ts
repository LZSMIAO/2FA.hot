/**
 * One cursor target per narrated step, so the pointer is always on the control the
 * narration is describing. Each state change sits inside the step that explains it.
 */
export const singleGuideTimeline = {
  verificationAt: 13000,
  movements: [
    { at: 0, target: 'tutorial-copy-secret' },
    { at: 2600, target: 'secret' },
    { at: 5200, target: 'tutorial-qr' },
    { at: 7800, target: 'tutorial-digits' },
    { at: 10400, target: 'tutorial-countdown' },
    { at: 13000, target: 'tutorial-copy-code' },
    { at: 15600, target: 'tutorial-login-code' },
    { at: 18200, target: 'tutorial-submit' }
  ],
  duration: 23400,
  phases: [1300, 3900, 14300, 16900, 20800],
  steps: [0, 2600, 5200, 7800, 10400, 13000, 15600, 18200, 20800] as const,
  narrationBoundaries: [2600, 5200, 7800, 10400, 13000, 15600, 18200, 20800, 23400]
}
