var assert = require('assert'),
    debug = require('debug')('HLSKit'),
    exec = require('child_process').exec,
    fs = require('fs'),
    async = require('async'),
    HLSKit;

/**
 * HLSKit
 *
 * @param <Object> config
 *
 * @returns HLSKit
 *
 * config properties:
 * <Object> audioOutputOptions
 * * <Number> bitrate
 * * <Numver> sampleRate
 * <String> workDirectory
 */
HLSKit = function HLSKit(config) {
  var _thisHLSKit = this,
      config = config || {};

  debug('Construct HLSKit. config:', config);

  /**
   * if required config options are missing, revert to defaults
   */
  _thisHLSKit.config = {
    audioOutputOptions: config.audioOutputOptions || { bitrate: 64000, sampleRate: 44050 },
    workDirectory: config.workDirectory || process.cwd()
  };

  /**
   * set up arrays to store cover images and output variants for this instance of HLSKit
   */
  _thisHLSKit._coverImages = [];
  _thisHLSKit._outputVariants = [];

  /**
   * PlaylistSession Constructor
   * 
   * @param <String> id
   * @param <Object> config (optonal)
   */
  _thisHLSKit.PlaylistSession = function PlaylistSession(id, config) {
    var _thisPlaylistSession = this;

    debug('Construct PlaylistSession. id: %s. config:', id, config);

    /**
     * Construct Playlist Session
     */
    assert(typeof id === 'string', 'Required parameter \'id\' must be a string');

    _thisPlaylistSession.mediaSegments = [];
    _thisPlaylistSession.config = {
      targetDuration: 12,
      windowLength: 3
    };
    _thisPlaylistSession.meta = {
      id: id,
      shouldBeAvailable: false,
      isAvailable: false,
      shouldFinish: false,
      isFinished: false
    };

    if (config) {
      _thisPlaylistSession.config.targetDuration = config.targetDuration || _thisPlaylistSession.config.targetDuration;
      _thisPlaylistSession.config.windowLength = config.windowLength || _thisPlaylistSession.config.windowLength;

      debug('Constructing PlaylistSession with custom config. new PlaylistSession:', _thisPlaylistSession);
    }
  };

  /**
   * playlistSessionFromStateObject
   * returns an instance of PlaylistSession with properties from state object
   */
  _thisHLSKit.playlistSessionFromStateObject = function playlistSessionFromStateObject(object) {
    var playlistSession;

    debug('Initializing PlaylistSession from state object:', object);
    debug('Validating PlaylistSession state object');

    /**
     * validate playlist session properties
     */
    assert(Array.isArray(object.mediaSegments), 'mediaSegments property must be an array');

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
     * validate media segment properties for each media segment in the array
     */
    for (i in object.mediaSegments) {
      assert(typeof object.mediaSegments[i].duration === 'number', 'duration property of media segment must be a number');
      assert(typeof object.mediaSegments[i].timeElapsed === 'number', 'timeElapsed property of media segment must be a number');
      assert(typeof object.mediaSegments[i].mediaSequence === 'number', 'mediaSequence property of media segment must be a number');
      assert(typeof object.mediaSegments[i].discontinuitySequence === 'number', 'discontinuitySequence property of media segment must be a number');
    }

    debug('PlaylistSession state object is valid');

    /**
     * create new playlist session
     */
    debug('creating new PlaylistSession');
    playlistSession = new _thisHLSKit.PlaylistSession(object.meta.id, object.config);

    /**
     * set playlist session's mediaSegments and meta properties
     */
    debug('setting PlaylistSession\'s `mediaSegments` and `meta` properties');
    playlistSession.mediaSegments = object.mediaSegments;
    playlistSession.meta = object.meta;

    debug('created PlaylistSession from state object. PlaylistSession:', playlistSession);

    return playlistSession;
  };

  /**
   * appendMP4
   * instance method of PlaylistSession
   * appends an MP4 to a playlist session, outputting a variant segment,
   * and serializing a variant playlist for each output variant
   *
   * @param <String> path
   * @param <Object> options (optional)
   * @param <Function> callback
   *
   * options properties:
   * <Number> mediaSequence
   * <Boolean> shouldFinish
   */
  _thisHLSKit.PlaylistSession.prototype.appendMP4 = function appendMP4(path, options, callback) {
    var _thisPlaylistSession = this;

    debug('Appending MP4 to PlaylistSession...');

    /**
     * If options.mediaSequence isn't passed, it's the number of mediaSegments in 
     * this PlaylistSession
     */
    options = {
      mediaSequence: options.mediaSequence || _thisPlaylistSession.mediaSegments.length,
      shouldFinish: options.shouldFinish || false
    };

    debug('Calculated mediaSequence:', options.mediaSequence);
    debug('shouldFinish?', options.shouldFinish);

    async.series([
      function calculateDiscontinuitySequenceAndITSOffset(next) {
        var previousMediaSegment = _thisPlaylistSession.mediaSegments[_thisPlaylistSession.mediaSegments.length - 1];

        /**
         * set options.discontinuitySequence & options.itsoffset
         */ 
        if (_thisPlaylistSession.mediaSegments.length < 1) {
          debug('This is the first media segment');

         /**
          * This is the first media segment.
          * It's discontinuitySequence is equal to 0
          */
          options.discontinuitySequence = 0;
          options.itsoffset = 0;
        } else if (previousMediaSegment && previousMediaSegment.mediaSequence === (options.mediaSequence - 1)) {
          debug('This is the next media segment');

          /**
           * This media segment is the one that should come immediately 
           * after the media segment that was received immediately before it.
           * It's discontinuitySequence is equal to the discontinuitySequence of the segment before it
           */
          options.discontinuitySequence = previousMediaSegment.discontinuitySequence;
          options.itsoffset = previousMediaSegment.timeElapsed;
        } else {
          debug('This IS NOT the next media segment');

          /**
           * This media segment IS NOT the one that should come immediately 
           * after the media segment that was received immediately before it.
           * CHECK: the media segment that was received immediately before it
           * If the discontinuitySequence of the segment being checked is -1:
           * * CHECK the media segment that received immediately before the media segment being checked
           * If the discontinuitySequence of the segment being checked IS NOT -1:
           * * If its mediaSequence - the mediaSequence of the segment being checked is >= 1:
           * * * its discontinuitySequence is that of the segment being checked + 1
           * * * its itsoffset is 0
           * * If its mediaSequence - the mediaSequence of the segment being checked is < 1:
           * * * its discontinuitySequence is -1
           * * * its itsoffset is 0
           */
          for (var len = _thisPlaylistSession.mediaSegments.length, i = len - 1, complete = false; i > len - 7 && i >= 0 && !complete; i--) {
            var mediaSegment = _thisPlaylistSession.mediaSegments[i];
            
            debug('Checking against segment with mediaSequence:', mediaSegment.mediaSequence);

            if (mediaSegment.discontinuitySequence === -1) {
              debug('Previous segment (%s) discontinuitySequence is -1, check previous segment...', mediaSegment.mediaSequence);

              complete = false;
            } else {
              debug('Previous segment (%s) discontinuitySequence is NOT -1', mediaSegment.mediaSequence);

              if (options.mediaSequence - mediaSegment.mediaSequence >= 1) {
                debug('Discontinuity + append...');

                options.discontinuitySequence = mediaSegment.discontinuitySequence + 1;
                options.itsoffset = mediaSegment.timeElapsed;

                complete = true;
              } else {
                debug('Discontinuity & splice...')

                options.discontinuitySequence = -1;
                options.itsoffset = 0;

                complete = true;
              }

            }
          }
        }

        /**
         * ensure all media segment properties exist
         */
        if (typeof options.discontinuitySequence != 'number') {
          options.discontinuitySequence = -1;
        }
        if (typeof options.itsoffset != 'number') {
          options.itsoffset = 0;
        }

        next(null);
      },
      function transcodeMP4(next) {
        _thisPlaylistSession._transcodeMP4(path, options, next);
      },
      function appendSegment(next) {
        _thisPlaylistSession._appendSegment(options, next);
      },
      function serializePlaylistFiles(next) {
        _thisPlaylistSession._serializePlaylistFiles(next)
      }
    ], callback);
  };

  /**
   * _transcodeMP4
   * private instance method of PlaylistSessiopn
   * transcodes an MP4 that's being appended to the playlist session,
   * outputting a variant segment for each output variant, and 
   * outputting a cover image if it's the first segment OR its mediaSequence is 0,
   * writes generated files to disk, and calls callback
   *
   * @param <String> path
   * @param <Object> options (optional; passed in from public method appendMP4)
   * @param <Function> callback
   *
   * options properties:
   * <Number> mediaSequence
   * <Number> discontinuitySequence
   * <Number> itsoffset
   * <Boolean> shouldFinish (not used in this method)
   */
  _thisHLSKit.PlaylistSession.prototype._transcodeMP4 = function _transcodeMP4(path, options, callback) {
    var _thisPlaylistSession = this,
        AVConvCommand;

    debug('Appending MP4 to PlaylistSession... path: %s options:', path, options);

    /**
     * Create AVConvCommand for this media segment
     */
    AVConvCommand = _thisPlaylistSession._createAVConvCommand(path, options);

    /**
     * Execute AVConvCommand, and then callback
     */
    debug('Executing AVConvCommand...');

    exec(AVConvCommand, function(error, stdout, stderr) {
      debug('avconv stdout:', stdout);
      debug('avconv stderr:', stderr);

      callback(error);
    });
  };

  /**
   * _appendSegment
   * probes an output file of the segment for options.mediaSequence to get the segment's duration,
   * detects discontinuitySequence and timeElapsed,
   * and then appends segment object to PlaylistSession
   *
   * @param <Object> options
   * @param <Function> callback
   *
   * options properties:
   * <Number> mediaSequence
   * <Number> discontinuitySequence
   * <Number> itsoffset
   * <Boolean> shouldFinish (not used in this method)
   */
  _thisHLSKit.PlaylistSession.prototype._appendSegment = function _appendSegment(options, callback) {
    var _thisPlaylistSession = this,
        AVProbeCommand,
        AVProbeResponse,
        segmentInfo;

    /**
     * Create AVProbeCommand for this media segment
     */
    AVProbeCommand = _thisPlaylistSession._createAVProbeCommand(options);

    async.series([
      function probeSegment(next) {

        /**
         * Execute AVProbeCommand, and then callback
         */
        debug('Executing AVProbeCommand...');

        exec(AVProbeCommand, function(error, stdout, stderr) {
          debug('avprobe stdout:', stdout);
          debug('avprobe stderr:', stderr);

          AVProbeResponse = stdout;

          next(error);
        });
      },
      function parseAVProbeResponse(next) {
        debug('Parsing avprobe response...');

        try {
          segmentInfo = JSON.parse(AVProbeResponse);
        } catch (error) {
          debug('Error parsing avprobe response:', error);

          next(error);
          return;
        }

        debug('Parsed avprobe response:', segmentInfo);

        next(null);
      },
      function appendSegment(next) {
        var thisMediaSegment;

        /**
         * Set options.duration to audio stream duration
         */
        options.duration = Number(segmentInfo.streams[1].duration);

        debug('Appending segment to PlaylistSession. options:', options);

        /**
         * build this media segment
         */
        thisMediaSegment = {
          mediaSequence: options.mediaSequence,
          discontinuitySequence: options.discontinuitySequence,
          timeElapsed: options.itsoffset + options.duration,
          duration: options.duration
        };

        /**
         * append to PlaylistSession
         */
        _thisPlaylistSession.mediaSegments.push(thisMediaSegment);

        next(null);
      }
    ], callback);
  };

  /**
   * _createAVConvCommand
   * returns avconv command used to transcode a given media segment
   * for this PlaylistSession (given its HLSKit output variants and cover images)
   *
   * @param <String> path
   * @param <Object> options
   * 
   * @returns <String> AVConvCommand
   *
   * options properties:
   * <Number> mediaSequence
   * <Number> discontinuitySequence
   * <Number> itsoffset
   * <Boolean> shouldFinish (not used in this method)
   */
  _thisHLSKit.PlaylistSession.prototype._createAVConvCommand = function _createAVConvCommand(path, options) {
    var _thisPlaylistSession = this,
        AVConvCommand;

    debug('Creating avconv command');

    /**
     * Create avconv command
     */
    AVConvCommand = 'avconv -y -loglevel panic '
                  + '-itsoffset '+ options.itsoffset +' '
                  + '-i '+ path +' ';

    /**
     * Add variant output options for each variant
     */
    for (i in _thisHLSKit._outputVariants) {
      var variant = _thisHLSKit._outputVariants[i],
          variantOutputOptions = '-strict experimental -f mpegts ';

      /**
       * add variant video options
       */
      if (! variant.config.skipVideo) {
        variantOutputOptions += '-vcodec libx264 '
                              + '-bsf:v h264_mp4toannexb '
                              + '-b:v '+ variant.config.bitrate +' '
                              + '-s '+ variant.config.resolution +' '
                              + '-r '+ variant.config.frameRate +' '
                              + '-g '+ variant.config.keyframeInterval +' ';
      } else {
        variantOutputOptions += '-vn ';
      }

      /**
       * add variant output file path
       */
      variantOutputOptions += _thisHLSKit.config.workDirectory +'/'+ variant.name +'_'+ options.mediaSequence +'.ts ';

      AVConvCommand += variantOutputOptions;
    };

    /**
     * If options.mediaSequence is 0 and there is a cover image, 
     * add cover image output options for each cover image
     */
    if (options.mediaSequence === 0 && Array(_thisHLSKit._coverImages).length > 0) {
      for (i in _thisHLSKit._coverImages) {
        var coverImage = _thisHLSKit._coverImages[i],
            coverImageOutputOptions = '-strict experimental -ss 0 -vframes 1 '
                                    + '-s '+ coverImage.config.resolution +' '
                                    + _thisHLSKit.config.workDirectory +'/'+ coverImage.name +'.png ';

        AVConvCommand += coverImageOutputOptions;
      }
    }

    debug('Created avconv command:', AVConvCommand);

    return AVConvCommand;
  };

  /**
   * _createAVProbeCommand
   * returns avprobe command used to get information about a given media segment
   * for this PlaylistSession (given its HLSKit output variants and cover images)
   *
   * @param <String> path
   * @param <Object> options
   *
   *
   * @return <String> AVProbeCommand
   */
  _thisHLSKit.PlaylistSession.prototype._createAVProbeCommand = function _createAVProbeCommand(options) {
    var _thisPlaylistSession = this,
        AVProbeCommand;

    debug('Creating avprobe command...');

    AVProbeCommand = 'avprobe -of json -show_streams -show_format -loglevel panic '
                   + _thisHLSKit.config.workDirectory +'/'+ _thisHLSKit._outputVariants[0].name +'_'+ options.mediaSequence +'.ts';

    debug('Created avprobe command:', AVProbeCommand);

    return AVProbeCommand;
  };

  /**
   * _serializePlaylistFiles
   * private instance method of PlaylistSession
   * serializes master playlists (if playlistSession isn't yet available),
   * and variant playlists for each output variant,
   * writes generated files to disk, and calls callback
   *
   * @param <Function> callback
   */
  _thisHLSKit.PlaylistSession.prototype._serializePlaylistFiles = function _serializePlaylistFiles(callback) {
    var _thisPlaylistSession = this;

    debug('Serializing playlist files for PlaylistSession:', _thisPlaylistSession);

    /**
     * FAKE CALLBACK
     */
    callback(null);
  };
  
  /**
   * serializeStateObject
   * instance method of PlaylistSession
   * serializes playlistSession instance into an object 
   * with only public properties (no instance methods)
   *
   * @returns <Object> playlistSession
   */
  _thisHLSKit.PlaylistSession.prototype.serializeStateObject = function serializeStateObject() {
    var _thisPlaylistSession = this,
        stateObject;

    debug('Serializing state object');

    stateObject = {
      mediaSegments: _thisPlaylistSession.mediaSegments,
      config: _thisPlaylistSession.config,
      meta: _thisPlaylistSession.meta
    };

    debug('PlaylistSession:', _thisPlaylistSession);
    debug('stateObject:', stateObject);

    return stateObject;
  };

};

/**
 * addOutputVariant
 * instance method of HLSKit
 * adds an output variant to an instance of HLSKit 
 * any MP4 appended to a PlaylistSession in this instance of HLSKit will be transcoded, 
 * and a playlist file will be serialized for this output variant as configured
 *
 * @param <String> name
 * @param <Object> config
 *
 * config properties:
 * <Boolean> skipVideo
 * <Number> bitrate
 * <Number> frameRate
 * <Number> keyframeInterval
 * <String> resolution ([width]x[height])
 *
 * IMPORTANT: If config.skipVideo is not true, a value must be passed for 
 * config.bitrate, config.frameRate, config.keyframeInterval, and config.resolution
 */  
HLSKit.prototype.addOutputVariant = function addOutputVariant(name, config) {
  var _thisHLSKit = this;

  debug('Adding output variant to HLSKit instance... variant name: %s config:', name, config);

  _thisHLSKit._outputVariants.push({
    name: name,
    config: config
  });

  debug('Added output variant to HLSKit instance. variant name: %s HLSKit:', name, _thisHLSKit);
};

/**
 * addCoverImage
 * instance method of HLSKit
 * adds a cover image to this instance of HLSKit causing a 
 * cover image to be saved upon the first append to its any 
 * instance of PlaylistSession
 *
 * @param <String> name
 * @param <Object> config
 *
 * config properties:
 * <String> resolution ([width]x[height])
 */
HLSKit.prototype.addCoverImage = function addCoverImage(name, config) {
  var _thisHLSKit = this;

  debug('Adding cover image output to HLSKit instance... cover image name: %s config:', name, config);

  _thisHLSKit._coverImages.push({
    name: name,
    config: config
  });

  debug('Added cover image output to HLSKit instance. cover image name: %s HLSKit:', name, _thisHLSKit);
};

module.exports = HLSKit;
