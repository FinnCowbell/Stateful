var globals = require('./globals');
for (var key in globals) {
  window[key] = globals[key];
}

var sha1 = require('sha1');
var XHR = require('./xhr');
var ClayHelper = require('./clay');

// localStorage key holding the hash of the last remote document that was applied
var REVISION_KEY = 'sync-revision';

// localStorage key holding the device owned sync configuration. Kept out of the tiles object so that
// neither a remote document nor a pasted JSON import can repoint or disable sync, leaving no way to
// recover from the server. Custom icons are stored separately for the same reason.
var SETTINGS_KEY = 'sync-settings';

// The C side reads a fixed number of texts and icon_keys per tile (char *texts[7] in modules/data.h),
// while packTiles() packs however many the JSON happens to contain. A mismatch desynchronises the
// whole tile stream and the watch reads past the end of each entry, so the count is not negotiable.
var TILE_ELEMENTS = 7;

var BUTTON_NAMES = ['up', 'up_hold', 'mid', 'mid_hold', 'down', 'down_hold'];

function isObject(value) {
  return (value !== null && typeof(value) === 'object' && !Array.isArray(value));
}

function isStringArray(value, length) {
  if (!Array.isArray(value) || value.length !== length) { return false; }
  return value.every(function(entry) { return typeof(entry) === 'string'; });
}

var self = module.exports = {

  //! Returns the remote sync configuration. Held in its own localStorage key rather than inside the
  //! tiles object, following the same pattern as custom icons: this state belongs to the device, not to
  //! the config document, so no remote document or pasted JSON import can reach it.
  settings: function() {
    var stored;
    try {
      stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    } catch(e) {
      stored = null;
    }
    if (!stored || typeof(stored) !== 'object') { stored = {}; }
    return {
      enabled: (typeof(stored.sync_enabled) !== 'undefined') ? !!stored.sync_enabled : false,
      url: (typeof(stored.sync_url) === 'string') ? stored.sync_url : "",
      headers: (typeof(stored.sync_headers) === 'object' && stored.sync_headers !== null) ? stored.sync_headers : {}
    };
  },

  //! Same values as settings(), keyed as they are persisted. This is the shape the Clay page binds its
  //! Remote Config fields to and hands back on submit, so it round trips without translation.
  storedSettings: function() {
    var current = self.settings();
    return {
      sync_enabled: current.enabled,
      sync_url: current.url,
      sync_headers: current.headers
    };
  },

  //! True if the given settings differ from what is stored. There is no longer a dedicated sync button,
  //! so the main Submit is the only place a user can point the app at a new endpoint. Pulling on every
  //! Submit would reopen the settings page each time, so it only happens when the endpoint actually moved.
  //! @param settings object in the persisted shape, as handed back by the Clay page
  settingsChanged: function(settings) {
    if (!settings || typeof(settings) !== 'object') { return false; }
    var current = self.settings();
    if (!!settings.sync_enabled !== current.enabled) { return true; }
    if (typeof(settings.sync_url) === 'string' && settings.sync_url !== current.url) { return true; }
    if (isObject(settings.sync_headers) &&
        JSON.stringify(settings.sync_headers) !== JSON.stringify(current.headers)) { return true; }
    return false;
  },

  //! Persists the remote sync fields. Used by both submit buttons so that pressing either one saves the
  //! endpoint without pushing a full config refresh up to the watch.
  //! @param settings object containing any of sync_enabled, sync_url, sync_headers
  saveSettings: function(settings) {
    if (!settings || typeof(settings) !== 'object') { return; }
    var current = self.settings();
    var stored = {
      sync_enabled: (typeof(settings.sync_enabled) !== 'undefined') ? !!settings.sync_enabled : current.enabled,
      sync_url: (typeof(settings.sync_url) === 'string') ? settings.sync_url : current.url,
      sync_headers: (isObject(settings.sync_headers)) ? settings.sync_headers : current.headers
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
  },

  //! Validates a single button. clayToTiles() dereferences button.status unconditionally for the
  //! stateful and status-only types, and index.js calls button.url.startsWith() on every button before
  //! it looks at the type, so both have to be the right shape no matter what the button does.
  validateButton: function(button, tileIndex, name) {
    var where = "Tile " + tileIndex + " button '" + name + "'";
    if (!isObject(button)) {
      return where + " is not an object";
    }
    var type = parseInt(button.type);
    if (isNaN(type) || type < 0 || type > 3) {
      return where + " has an unknown type";
    }
    if (typeof(button.url) !== 'string' || typeof(button.method) !== 'string') {
      return where + " needs a string url and method";
    }
    if (!isObject(button.status)) {
      return where + " has no status object";
    }
    if ((type === 1 || type === 2) &&
        (typeof(button.status.url) !== 'string' || typeof(button.status.method) !== 'string')) {
      return where + " needs a string status url and method";
    }
    return null;
  },

  validateTile: function(tile, index) {
    if (!isObject(tile)) {
      return "Tile " + index + " is not an object";
    }
    if (!isObject(tile.payload)) {
      return "Tile " + index + " has no payload";
    }
    // packTiles() feeds these straight into toGColor(), which calls String.replace on them
    if (typeof(tile.payload.color) !== 'string' || typeof(tile.payload.highlight) !== 'string') {
      return "Tile " + index + " needs a string color and highlight";
    }
    if (!isStringArray(tile.payload.texts, TILE_ELEMENTS)) {
      return "Tile " + index + " needs exactly " + TILE_ELEMENTS + " string texts";
    }
    if (!isStringArray(tile.payload.icon_keys, TILE_ELEMENTS)) {
      return "Tile " + index + " needs exactly " + TILE_ELEMENTS + " string icon_keys";
    }
    if (!isObject(tile.buttons)) {
      return "Tile " + index + " has no buttons";
    }
    for (var name in tile.buttons) {
      // Called off the prototype, a remote document is free to contain a "hasOwnProperty" key
      if (!Object.prototype.hasOwnProperty.call(tile.buttons, name)) { continue; }
      // An unrecognised name would make clayToTiles() write texts[undefined], which for..in then packs
      // as an extra element and knocks the tile stream out of alignment
      if (BUTTON_NAMES.indexOf(name) === -1) {
        return "Tile " + index + " has an unknown button '" + name + "'";
      }
      var reason = self.validateButton(tile.buttons[name], index, name);
      if (reason !== null) { return reason; }
    }
    return null;
  },

  //! Validates a document retrieved from a remote server before it is allowed anywhere near localStorage.
  //! clayToTiles() treats an empty or malformed object as a request to wipe the config, so a remote
  //! document that failed to render (or a login page returning 200) must never reach it. Beyond that,
  //! neither clayToTiles() nor packTiles() type check the config, because everything reaching them has
  //! until now been produced by the Clay UI. A hand authored document has to be checked here instead.
  //! @param doc parsed JSON document to validate
  //! @return null when valid, otherwise a human readable reason string
  validate: function(doc) {
    if (!isObject(doc)) {
      return "Config is not an object";
    }
    if (!Array.isArray(doc.tiles)) {
      return "Config has no tiles array";
    }
    if (doc.tiles.length === 0) {
      return "Config contains no tiles";
    }
    if (typeof(doc.headers) !== 'undefined' && !isObject(doc.headers)) {
      return "Config headers is not an object";
    }
    if (typeof(doc.base_url) !== 'undefined' && typeof(doc.base_url) !== 'string') {
      return "Config base_url is not a string";
    }
    for (var i = 0; i < doc.tiles.length; i++) {
      var reason = self.validateTile(doc.tiles[i], i);
      if (reason !== null) { return reason; }
    }
    return null;
  },

  //! Fills in any top level fields the document omitted. index.js reads tiles.headers and tiles.base_url
  //! directly on every button press and clayToTiles() only defaults the per tile copies, so a document
  //! that leaves them out would throw at press time rather than at sync time.
  normalize: function(doc) {
    var base = JSON.parse(JSON.stringify(require('../data/base_object')));
    for (var key in base) {
      if (key === 'tiles') { continue; }
      if (typeof(doc[key]) === 'undefined') { doc[key] = base[key]; }
    }
    return doc;
  },

  //! Hash used to detect whether a remote document differs from the one currently applied. Pushing an
  //! unchanged config would trigger a full REFRESH and re-pack of every tile up to the watch for nothing.
  revision: function(doc) {
    return sha1(JSON.stringify(doc)).substring(0, MAX_HASH_LENGTH);
  },

  storedRevision: function() {
    return localStorage.getItem(REVISION_KEY);
  },

  //! Invalidates the stored revision, forcing the next pull to apply whatever it receives.
  //! Called whenever the config is edited locally, since local edits make the stored revision meaningless.
  clearRevision: function() {
    localStorage.removeItem(REVISION_KEY);
  },

  //! Fetches the config document from the configured remote endpoint and, if it differs from the config
  //! currently in use, hands it to clayToTiles() so it takes the exact same validation, defaulting and
  //! watch notification path as a config submitted through the Clay UI.
  //! @param force when true, apply the document even if its revision matches the stored one
  //! @param callback optional, called with (applied, message)
  pull: function(force, callback) {
    var done = function(applied, message) {
      debug(2, "Sync: " + message);
      if (callback) { callback(applied, message); }
    };

    var settings = self.settings();
    if (!settings.enabled) {
      return done(false, "Remote config sync is disabled");
    }
    if (!settings.url) {
      return done(false, "No remote config URL is set");
    }
    // The config page owns the tiles object while it is open, applying a pull underneath it would
    // silently discard whatever the user is currently editing.
    if (TRANSFER_LOCK) {
      return done(false, "Config page is open, skipping sync");
    }

    debug(1, "Sync: fetching config from " + settings.url);
    XHR.xhrRequest('GET', settings.url, settings.headers, {}, 0, 2).then(function(response) {
      // Everything below runs inside a promise handler, so anything that throws here would surface as
      // an unhandled rejection and the caller would simply never hear back. The document is attacker
      // shaped input, so the whole handler is guarded rather than any one call within it.
      try {
        return self.apply(response.data, force, done);
      } catch(e) {
        return done(false, "Remote config could not be applied");
      }
    }, function() {
      return done(false, "Could not reach remote config endpoint");
    });
  },

  //! Validates, de-duplicates and applies a fetched config document.
  //! @param doc parsed document as returned by the remote endpoint
  //! @param force apply even when the revision matches the stored one
  //! @param done callback invoked with (applied, message)
  apply: function(doc, force, done) {
    var reason = self.validate(doc);
    if (reason !== null) {
      return done(false, "Remote config rejected: " + reason);
    }

    var revision = self.revision(doc);
    if (!force && revision === self.storedRevision()) {
      return done(false, "Remote config unchanged");
    }

    self.normalize(doc);

    // clayToTiles() falls back to resetTiles() when it dislikes the object, which would wipe the
    // config rather than leave the last good one in place. validate() above is what prevents that.
    // It only writes to localStorage once it is done mutating, so a throw leaves the last good config.
    ClayHelper.clayToTiles(doc);
    localStorage.setItem(REVISION_KEY, revision);
    return done(true, "Applied remote config " + revision);
  }
};
