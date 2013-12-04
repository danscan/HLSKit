var assert = require('assert'),
    exec = require('child_process').exec,
    fs = require('fs'),
    async = require('async');

var HLSKit = {

  /**
   * PlaylistSession Constructor
   * 
   * @param <String> id
   * @param <Object> config (optonal)
   */
  PlaylistSession: function PlaylistSession(id, config) {
    var _this = this;

    /**
     * Construct Playlist Session
     */
    assert(typeof id === 'string', 'Required parameter \'id\' must be a string');

    _this.mediaSegments = {};
    _this.config = {
      targetDuration: 12,
      windowLength: 3
    };
    _this.meta = {
      id: id,
      shouldBeAvailable: false,
      isAvailable: false,
      shouldFinish: false,
      isFinished: false
    };

    if (config) {
      _this.config.targetDuration = config.targetDuration || _this.config.targetDuration;
      _this.config.windowLength = config.windowLength || _this.config.windowLength;
    }
  },

  /**
   * playlistSessionFromStateObject
   * returns an instance of PlaylistSession with properties from state object
   */
  playlistSessionFromObject: function playlistSessionFromStateObject(object) {
    var playlistSession;

    /**
     * validate playlist session properties
     */
    assert(typeof object.mediaSegments === 'object', 'mediaSegments property must be an object');

    assert(typeof object.config === 'object', 'config property must be an object');
    assert(typeof object.config.targetDuration === 'number', 'config.targetDuration property must be a number');
    assert(typeof object.config.windowLength === 'number', 'config.windowLength property must be a number');

    assert(typeof object.meta === 'object', 'meta property must be an object');
    assert(typeof object.meta.id === 'string', 'meta.id property must be a string');
    assert(typeof object.meta.shouldBeAvailable === 'boolean', 'meta.shouldBeAvailable property must be a string');
    assert(typeof object.meta.isAvailable === 'boolean', 'meta.isAvailable property must be a string');
    assert(typeof object.meta.shouldFinish === 'boolean', 'meta.shouldFinish property must be a string');
    assert(typeof object.meta.isFinished === 'boolean', 'meta.isFinished property must be a string');

    /**
     * validate media segment properties for each media segment in the object
     */
    for (key in object.mediaSegments) {
      assert(typeof object.mediaSegments[key].duration === 'number', 'duration property of media segment must be a number');
      assert(typeof object.mediaSegments[key].timeElapsed === 'number', 'timeElapsed property of media segment must be a number');
      assert(typeof object.mediaSegments[key].mediaSequence === 'number', 'mediaSequence property of media segment must be a number');
      assert(typeof object.mediaSegments[key].discontinuitySequence === 'number', 'discontinuitySequence property of media segment must be a number');
    }

    /**
     * create new playlist session
     */
    playlistSession = new HLSKit.PlaylistSession(object.id, object.config);

    /**
     * set playlist session's mediaSegments and meta properties
     */
    playlistSession.mediaSegments = object.mediaSegments;
    playlistSession.meta = object.meta;

    return playlistSession;
  }
};

/**
 * addVariant
 * instance method of PlaylistSession
 * adds a stream variant to a playlist session
 * causing the playlist session to transcode a variant segment, 
 * and serialize a variant playlist for it on each append
 *
 * @param <String> name
 * @param <Object> config
 *
 * config properties:
 * <Mixed> video (object, or null to skip video)
 * * <Number> bitrate
 * * <Number> frameRate
 * * <Number> keyframeInterval
 * * <String> resolution ([width]x[height])
 * <Mixed> audio (object, or null to skip audio)
 * * <Number> bitrate
 * * <Number> sampleRate
 */
PlaylistSession.prototype.addVariant = function addVariant(name, config) {
  var _this = this;

  /**
   * If playlistSession's private _variants property isn't an array, 
   * make it an empty array
   */
  if (! Array(_this._variants).isArray()) {
    _this._variants = [];
  }

  _this._variants.push({
    name: name,
    config: config
  });
};

/**
 * addCoverImage
 * instance method of PlaylistSession
 * adds a cover image to a playlist sesion causing a 
 * cover image to be saved upon the first append
 *
 * @param <String> name
 * @param <Object> config
 *
 * config properties:
 * <String> resolution ([width]x[height])
 */
PlaylistSession.prototype.addCoverImage = function addVariant(name, config) {
  var _this = this;

  /**
   * If playlistSession's private _coverImages property isn't an array, 
   * make it an empty array
   */
  if (! Array(_this._coverImages).isArray()) {
    _this._coverImages = [];
  }

  _this._coverImages.push({
    name: name,
    config: config
  });
};

/**
 * appendMP4
 * instance method of PlaylistSession
 * appends an MP4 to a playlist session, outputting a variant segment,
 * and serializing a variant playlist for each stream variant
 *
 * @param <String> path
 * @param <Object> options (optional)
 * @param <Function> callback
 *
 * options properties:
 * <Number> mediaSequence
 */
PlaylistSession.prototype.appendMP4 = function addMP4(path, options, callback) {
  var _this = this;

  async.series([
    function transcodeMP4(next) {
      _this._transcodeMP4(path, options, next);
    },
    function serializePlaylistFiles(next) {
      _this._serializePlaylistFiles(path, options, next);
    }
  ], callback);
};

/**
 * _transcodeMP4
 * private instance method of PlaylistSessiopn
 * transcodes an MP4 that's being appended to the playlist session,
 * outputting a variant segment for each stream variant, and 
 * outputting a cover image if it's the first segment OR its mediaSequence is 0,
 * writes generated files to disk, and calls callback with signature (<Error>, <Array> generatedFilePaths)
 *
 * @param <String> path
 * @param <Object> options (optional; passed in from public method appendMP4)
 * @param <Function> callback
 */
PlaylistSession.prototype._transcodeMP4 = function _transcodeMP4(path, options, callback) {};

/**
 * _serializePlaylistFiles
 * private instance method of PlaylistSession
 * serializes master playlists (if playlistSession isn't yet available),
 * and variant playlists for each stream variant,
 * writes generated files to disk, and calls callback with signature (<Error>, <Array> generatedFilePaths)
 *
 * @param <Function> callback
 */
PlaylistSession.prototype._serializePlaylistFiles = function _serializePlaylistFiles(callback) {};

/**
 * serializeStateObject
 * instance method of PlaylistSession
 * serializes playlistSession instance into an object 
 * with only public properties (no instance methods)
 *
 * @returns <Object> (playlistSession)
 */
PlaylistSession.prototype.serializeStateObject = function () {
  var _this = this;

  return {
    mediaSegments: _this.mediaSegments,
    config: _this.config,
    meta: _this.meta
  };
};

/**
 * Export HLSKit
 */
module.exports = HLSKit;
