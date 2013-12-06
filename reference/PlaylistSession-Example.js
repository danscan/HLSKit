{
  mediaSegments: {
    '0': { duration: 10, timeElapsed: 10, mediaSequence: 0, discontinuitySequence: 0 },
    '1': { duration: 10, timeElapsed: 20, mediaSequence: 1, discontinuitySequence: 0 },
    '2': { duration: 10, timeElapsed: 30, mediaSequence: 2, discontinuitySequence: 0 },
    '3': { duration: 10, timeElapsed: 40, mediaSequence: 3, discontinuitySequence: 0 },
    '5': { duration: 10, timeElapsed: 10, mediaSequence: 4, discontinuitySequence: 1 },
    '6': { duration: 10, timeElapsed: 20, mediaSequence: 5, discontinuitySequence: 1 },
    '8': { duration: 10, timeElapsed: 10, mediaSequence: 6, discontinuitySequence: 2 },
    '9': { duration: 10, timeElapsed: 20, mediaSequence: 7, discontinuitySequence: 2 },
    '10': { duration: 10, timeElapsed: 30, mediaSequence: 8, discontinuitySequence: 2 },
    '12': { duration: 10, timeElapsed: 10, mediaSequence: 9, discontinuitySequence: 3 },
    '13': { duration: 10, timeElapsed: 20, mediaSequence: 10, discontinuitySequence: 3 },
    '14': { duration: 10, timeElapsed: 30, mediaSequence: 11, discontinuitySequence: 3 },
    '15': { duration: 10, timeElapsed: 40, mediaSequence: 12, discontinuitySequence: 3 },

    '4': { duration: 10, timeElapsed: 10, mediaSequence: -1, discontinuitySequence: -1 },
    '7': { duration: 10, timeElapsed: 10, mediaSequence: -1, discontinuitySequence: -1 },
    '11': { duration: 10, timeElapsed: 10, mediaSequence: -1, discontinuitySequence: -1    },

  config: {
    targetDuration: 10,
    windowLength: 3
  },

  meta: {
    id: ''+ req.params.id,
    shouldBeAvailable: false,
    isAvailable: false,
    shouldFinish: false,
    isFinished: false
  }
}