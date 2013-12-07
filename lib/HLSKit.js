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
    };

    debug('Calculated mediaSequence:', options.mediaSequence);

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
        } else if (previousMediaSegment && previousMediaSegment.mediaSequence === (options.mediaSequence - 1) && previousMediaSegment.discontinuitySequence != -1) {
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
                options.itsoffset = 0;

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
        var thisMediaSegment,
            audioStream;

        /**
         * Set options.duration to audio stream duration
         */
        try {
          assert(Array.isArray(segmentInfo.streams), 'segment info contains no streams');
          audioStream = segmentInfo.streams[1];
          options.duration = Number(audioStream.duration);
        } catch (error) {
          debug('Error getting segment duration:', error);

          next(error);
          return;
        }

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

        /**
         * if this PlaylistSession has config.windowLength segments, it should be available
         */
        if (_thisPlaylistSession.mediaSegments.length >= _thisPlaylistSession.config.windowLength) {
          _thisPlaylistSession.meta.shouldBeAvailable = true;
        }

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
      variantOutputOptions += _thisHLSKit.config.workDirectory +'/'+ _thisPlaylistSession.meta.id +'_'+ variant.name +'_'+ options.mediaSequence +'.ts ';

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
                                    + _thisHLSKit.config.workDirectory +'/'+ _thisPlaylistSession.meta.id +'_'+ coverImage.name +'.png ';

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
                   + _thisHLSKit.config.workDirectory +'/'+ _thisPlaylistSession.meta.id +'_'+ _thisHLSKit._outputVariants[0].name +'_'+ options.mediaSequence +'.ts';

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

    async.parallel([
      function serializeMasterPlaylists(next) {
        
        /**
         * If this playlist session isn't available yet, 
         * serialize its master playlist files 
         */
        if (! _thisPlaylistSession.meta.isAvailable) {
          _thisPlaylistSession._serializeMasterPlaylists(next);
        } else {
          next(null);
        }
      },
      function serializeLivePlaylists(next) {
        _thisPlaylistSession._serializeLivePlaylists(next);
      },
      function serializeReplayPlaylists(next) {
        _thisPlaylistSession._serializeReplayPlaylists(next);
      }
    ], callback);
  };

  /**
   * _serializeMasterPlaylists
   * serializes and saves live and replay master playlists 
   * that list live and replay variant playlists for each 
   * output variant in this HLSKit instance
   *
   * @param <Function> callback
   */
  _thisHLSKit.PlaylistSession.prototype._serializeMasterPlaylists = function _serializeMasterPlaylists(callback) {
    var _thisPlaylistSession = this,
        liveMasterPlaylist,
        replayMasterPlaylist;

    liveMasterPlaylist = replayMasterPlaylist = '#EXTM3U\n';

    debug('Serializing master playlists...');

    for (i in _thisHLSKit._outputVariants) {
      var variant = _thisHLSKit._outputVariants[i],
          bandwidth;

      if (variant.config.bitrate) {
        bandwidth = _thisHLSKit.config.audioOutputOptions.bitrate + variant.config.bitrate*1.6;
      } else {
        bandwidth = 64000;
      }

      liveMasterPlaylist += '#EXT-X-STREAM-INF:BANDWIDTH='+ bandwidth +'\n';
      replayMasterPlaylist += '#EXT-X-STREAM-INF:BANDWIDTH='+ bandwidth +'\n';

      liveMasterPlaylist += variant.name +'/live.m3u8\n';
      replayMasterPlaylist += variant.name +'/replay.m3u8\n';
    }

    async.parallel([
      function writeLiveMasterPlaylist(next) {
        fs.writeFile(_thisHLSKit.config.workDirectory +'/'+ _thisPlaylistSession.meta.id +'_live.m3u8', liveMasterPlaylist, next);
      },
      function writeReplayMasterPlaylist(next) {
        fs.writeFile(_thisHLSKit.config.workDirectory +'/'+ _thisPlaylistSession.meta.id +'_replay.m3u8', replayMasterPlaylist, next);
      },
    ], callback);
  };

  /**
   * _serializeLivePlaylists
   * serializes and saves live variant playlists for 
   * each output variant in this HLSKit instance
   *
   * @param <Function> callback
   */
  _thisHLSKit.PlaylistSession.prototype._serializeLivePlaylists = function _serializeLivePlaylists(callback) {
    var _thisPlaylistSession = this,
        liveWindow = [],
        liveWindowMediaSequence = 0,
        liveWindowDiscontinuitySequence = 0,
        absolutePositionOfFirstMediaSegmentInLiveWindow = 0,
        livePlaylist;

    debug('Serializing live variant playlists...');

    livePlaylist = '#EXTM3U\n'
                  + '#EXT-X-VERSION:4\n'
                  + '#EXT-X-ALLOW-CACHE:NO\n'
                  + '#EXT-X-TARGETDURATION:'+ _thisPlaylistSession.config.targetDuration +'\n';

    /**
     * Build Live Window
     * Starting from the end of media segments,
     * iterate backward and yield this PlaylistSession's windowLength
     * amount of media segments with discontinuitySequence != -1
     */
    for (var len = _thisPlaylistSession.mediaSegments.length, i = len - 1, j = 0; i >= 0 && j < _thisPlaylistSession.config.windowLength; i--) {
      var thisMediaSegment = _thisPlaylistSession.mediaSegments[i];

      debug('Checking if media segment should be in live window. media segment:', thisMediaSegment);

      if (thisMediaSegment.discontinuitySequence != -1) {
        debug('Pushing segment into liveWindow. segment:', thisMediaSegment);

        /**
         * If this is the first media segment that will go into the live 
         * window, set the absolute position of first media segment in live window
         * for later use in calculating liveWindowMediaSequence
         */
        if (liveWindow.length === _thisPlaylistSession.config.windowLength - 1) {
          absolutePositionOfFirstMediaSegmentInLiveWindow = i;

          debug('First media segment in live window has absolute position:', absolutePositionOfFirstMediaSegmentInLiveWindow);
        }

        liveWindow.unshift(thisMediaSegment);
        j++;
      }
    }

    /**
     * set liveWindowDiscontinuitySequence
     * equal to the discontinuity sequence of the first media segment in the live window
     */
    liveWindowDiscontinuitySequence = liveWindow[0].discontinuitySequence;

    /**
     * set liveWindowMediaSequence
     * if the PlaylistSession does not have more media segments than its window length, 
     * live window media sequence is 0, otherwise live window media sequence is
     * equal to the number of media segments that appear before the first media segment 
     * in the live window whose discontinuitySequence != -1
     */
    debug('_thisPlaylistSession.mediaSegments.length:', _thisPlaylistSession.mediaSegments.length);
    debug('_thisPlaylistSession.config.windowLength:', _thisPlaylistSession.config.windowLength);

    if (_thisPlaylistSession.mediaSegments.length <= _thisPlaylistSession.config.windowLength) {
      debug('PlaylistSession segments than its window length... liveWindowMediaSequence = 0');

      liveWindowMediaSequence = 0;
    } else {
      debug('live window has more segments than its maximum length. calculating liveWindowMediaSequence...');

      for (var i = absolutePositionOfFirstMediaSegmentInLiveWindow - 1; i >= 0; i--) {
        var thisMediaSegment = _thisPlaylistSession.mediaSegments[i];

        if (thisMediaSegment.discontinuitySequence != -1) {
          liveWindowMediaSequence++;
        }
      }
    }

    debug('liveWindow:', liveWindow);
    debug('liveWindowMediaSequence:', liveWindowMediaSequence);
    debug('liveWindowDiscontinuitySequence:', liveWindowDiscontinuitySequence);

    /**
     * Render sliding-window live playlist
     */
    livePlaylist += '#EXT-X-MEDIA-SEQUENCE:'+ liveWindowMediaSequence +'\n'
                  + '#EXT-X-DISCONTINUITY-SEQUENCE:'+ liveWindowDiscontinuitySequence +'\n';

    /**
     * List each segment in the live window
     */
    for (var i = 0; i < liveWindow.length; i++) {
      var thisMediaSegment = liveWindow[i],
          nextMediaSegment = (i < liveWindow.length - 1 ? liveWindow[(i+1)] : null);

      livePlaylist += '#EXTINF:'+ thisMediaSegment.duration +',\n'
                    + 'fileSequence'+ thisMediaSegment.mediaSequence +'.ts\n';

      debug('thisMediaSegment (index %s):', i, thisMediaSegment);
      debug('nextMediaSegment (index %s):', i+1, nextMediaSegment);

      /**
       * If next media segment's discontinuity sequence is different from that of this media segment
       * apply to the next media segment an #EXT-X-DISCONTINUITY tag
       */
      if (nextMediaSegment && nextMediaSegment.discontinuitySequence != thisMediaSegment.discontinuitySequence) {
        livePlaylist += '#EXT-X-DISCONTINUITY\n';
      }
    }

    debug('Live playlist: \n\n%s\n\n', livePlaylist);

    /**
     * Save a live playlist file for each output variant
     */
    debug('Saving live playlist files...');

    async.each(_thisHLSKit._outputVariants, function saveLivePlaylistFile(variant, next) {
      var livePlaylistFilePath = _thisHLSKit.config.workDirectory +'/'
                                + _thisPlaylistSession.meta.id
                                +'_'+ variant.name
                                +'_live.m3u8';

      debug('Saving live playlist file at path:', livePlaylistFilePath);

      fs.writeFile(livePlaylistFilePath, livePlaylist, next);
    }, callback);
  };

  /**
   * _serializeReplayPlaylists
   * serializes and saves replay variant playlists for 
   * each output variant in this HLSKit instance
   *
   * @param <Function> callback
   */
  _thisHLSKit.PlaylistSession.prototype._serializeReplayPlaylists = function _serializeReplayPlaylists(callback) {
    var _thisPlaylistSession = this,
        replayPlaylistSegments,
        replayPlaylist;

    /**
     * sort segments
     */
    debug('Sorting segments...');

    replayPlaylistSegments = _thisPlaylistSession.mediaSegments.slice(0).sort(function sortSegments(a, b) {
      return (a.mediaSequence < b.mediaSequence ? -1 : 1);
    });

    /**
     * serialize replay variant playlists
     */
    debug('Serializing replay variant playlists...');

    replayPlaylist = '#EXTM3U\n'
                    + '#EXT-X-VERSION:4\n'
                    + '#EXT-X-ALLOW-CACHE:YES\n'
                    + '#EXT-X-TARGETDURATION:'+ _thisPlaylistSession.config.targetDuration +'\n';

    for (var i = 0; i < replayPlaylistSegments.length; i++) {
      var thisMediaSegment = replayPlaylistSegments[i],
          nextMediaSegment = (i < replayPlaylistSegments.length - 1 ? replayPlaylistSegments[(i+1)] : null);

      replayPlaylist += '#EXTINF:'+ thisMediaSegment.duration +'\n'
                      + 'fileSequence'+ thisMediaSegment.mediaSequence +'.ts\n';

      /**
       * If next media segment's discontinuity sequence is different from that of this media segment
       * apply to the next media segment an #EXT-X-DISCONTINUITY tag
       */
      if (nextMediaSegment && nextMediaSegment.discontinuitySequence != thisMediaSegment.discontinuitySequence) {
        replayPlaylist += '#EXT-X-DISCONTINUITY\n';
      }
    }

    debug('Replay playlist: \n\n%s\n\n', replayPlaylist);

    /**
     * Save a replay playlist file for each output variant
     */
    debug('Saving replay playlist files...');

    async.each(_thisHLSKit._outputVariants, function saveReplayPlaylistFile(variant, next) {
      var replayPlaylistFilePath = _thisHLSKit.config.workDirectory +'/'
                                + _thisPlaylistSession.meta.id
                                +'_'+ variant.name
                                +'_replay.m3u8';

      debug('Saving replay playlist file at path:', replayPlaylistFilePath);

      fs.writeFile(replayPlaylistFilePath, replayPlaylist, next);
    }, callback);
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
