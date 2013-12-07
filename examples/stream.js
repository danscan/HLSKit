var HLSKit = require('..'),
    async = require('async'),
    debug = require('debug')('stream');

/**
 * configure HLSKit
 */
var hLSKit = new HLSKit({
  audioOutputOptions: {
    bitrate: 40000,
    sampleRate: 22050
  },

  workDirectory: __dirname +'/work'
});

hLSKit.addOutputVariant('lo', {
  bitrate: 80000,
  frameRate: 16,
  keyframeInterval: 8,
  resolution: '360x360'
});

hLSKit.addOutputVariant('hi', {
  bitrate: 480000,
  frameRate: 24,
  keyframeInterval: 12,
  resolution: '480x480'
});

hLSKit.addOutputVariant('audio', {
  skipVideo: true
});

hLSKit.addCoverImage('still', {
  resolution: '480x480'
});

var playlistSession = new hLSKit.PlaylistSession('12345', { targetDuration: 12, windowLength: 3 });

/**
 * Append in.mp4 10 times, simulating API append requests
 * ======================================================
 */
console.log('Starting stream simulation!');

async.series([
  function(next) {
    debug('append 0');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 0 }, next);
  },
  function(next) {
    debug('append 1');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 1 }, next);
  },
  function(next) {
    debug('append 2');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 2 }, next);
  },
  function(next) {
    debug('append 3');
    playlistSession.meta.isAvailable = true;
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 3 }, next);
  },
  function(next) {
    debug('append 4');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 4 }, next);
  },
  function(next) {
    debug('append 5');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 5 }, next);
  },
  function(next) {
    debug('append 7');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 7 }, next);
  },
  function(next) {
    debug('append 6');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 6 }, next);
  },
  function(next) {
    debug('append 8');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 8 }, next);
  },
  function(next) {
    debug('append 11');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 11 }, next);
  },
  function(next) {
    debug('append 10');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 10 }, next);
  },
  function(next) {
    debug('append 12');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 12 }, next);
  },
  function(next) {
    debug('append 100');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 100, }, next);
  },
  function(next) {
    debug('append 13');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 13 }, next);
  },
  function(next) {
    debug('append 14');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 14 }, next);
  },
  function(next) {
    debug('append 101');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 101 }, next);
  },
  function(next) {
    debug('append 102');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 102 }, next);
  },
  function(next) {
    debug('append 103');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 103 }, next);
  },
  function(next) {
    debug('append 104');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 104 }, next);
  },
  function(next) {
    debug('append 105');
    playlistSession.appendMP4('./in.mp4', { mediaSequence: 105, shouldFinish: true }, next);
  },
], function(error) {
  if (error) {
    console.error('Error appending mp4 to playlistSession:', error);
    return;
  }

  console.log('Stream Simulation FINISHED!');

  /**
   * END Append in.mp4 10 times, simulating API append requests
   * ==========================================================
   */
  /**
   * serialize playlist state object
   */
  playlistSession = playlistSession.serializeStateObject();
  console.log('Serialized playlistSession to state object: ', playlistSession);

  /**
   * create playlist session from playlist state object
   */
  playlistSession = hLSKit.playlistSessionFromStateObject(playlistSession);
  console.log('Playlist session from state object... configured: ', playlistSession);
});
