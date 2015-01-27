(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
"use strict";

var Composer = require("substance-composer/env/web");

// Panels
// -----------------

var LocationsPanel = require("./src/panels/locations");
var PersonsPanel = require("./src/panels/persons");
var DefinitionsPanel = require("./src/panels/definitions");
var SubjectsPanel = require("./src/panels/subjects");
var MetadataPanel = require("./src/panels/metadata");
var ArchivistShell = require("./src/archivist_shell");

var panels = [
  // new LocationsPanel(),
  // new PersonsPanel(),
  // new DefinitionsPanel(),
  new SubjectsPanel(),
  // new MetadataPanel()
];

// Tools
// -----------------

var tools = require('substance-composer').defaultTools;

// Custom tools
var LocationTool = require("./src/tools/location_tool");
var PersonTool = require("./src/tools/person_tool");
var DefinitionTool = require("./src/tools/definition_tool");
var SubjectTool = require("./src/tools/subject_tool");

// tools.push(new LocationTool());
// tools.push(new PersonTool());
// tools.push(new DefinitionTool());
tools.push(new SubjectTool());

// Workflows
// -----------------

var workflows = require('substance-composer').defaultWorkflows;

// Custom workflows
var TagEntity = require('./src/workflows/tag_entity');
var TagSubject = require('./src/workflows/tag_subject');

workflows["tag_entity"] = new TagEntity();
workflows["tag_subject"] = new TagSubject();


// Composer
// --------

/* global $: false */ // requires jquery included via script tag
$(function() {

  // Substance Shell Initialization
  // ---------------------------

  // Note: the shell has a document factory where the custom
  // node injection happens
  var shell = new ArchivistShell();

  var composer = new Composer({
    shell: shell,
    panels: panels,
    tools: tools,
    workflows: workflows
  });

  // Start the engines
  // ---------------------------

  window.app = composer;

  var containerEl = $('#container')[0];
  if (!containerEl) {
    throw new Error("Could not find element with id 'container'.");
  }

  composer.start({
    el: containerEl
  });

  // window.onbeforeunload = function() {
  //   if (composer.controller.isDocumentDirty()) {
  //     var options = {
  //       type: 'info',
  //       title: 'Unsaved Changes',
  //       message: 'You have unsaved changes.',
  //       buttons: ['Save', 'Discard', 'Cancel'],
  //       detail: 'You can Save or Discard the changes. If you press Cancel the document will not be closed.'
  //     };
  //     var choice = shell.showModalDialog(options);
  //     switch (choice) {
  //     case 0:
  //       composer.save();
  //       // Note: we have to intercept the closing
  //       // as otherwise the file window gets closed before the file dialog
  //       return false;
  //     case 1:
  //       return true;
  //     case 2:
  //       return false;
  //     }
  //   }
  //   return true;
  // };
});

},{"./src/archivist_shell":276,"./src/panels/definitions":283,"./src/panels/locations":286,"./src/panels/metadata":290,"./src/panels/persons":294,"./src/panels/subjects":298,"./src/tools/definition_tool":302,"./src/tools/location_tool":303,"./src/tools/person_tool":304,"./src/tools/subject_tool":305,"./src/workflows/tag_entity":306,"./src/workflows/tag_subject":307,"substance-composer":37,"substance-composer/env/web":36}],5:[function(require,module,exports){
module.exports = [
  {
    "id": "definition_1",
    "type": "definition",
    "title": "AAA",
    "description": "Lorem ipsum dolor sit amet"
  },
  {
    "id": "definition_2",
    "type": "definition",
    "title": "BBB",
    "description": "consectetur adipiscing elit"
  },
  {
    "id": "definition_3",
    "type": "definition",
    "title": "CCC",
    "description": "condimentum urna vel libero"
  }
]
},{}],6:[function(require,module,exports){
module.exports = [
  {
    "id": "location_komorn",
    "type": "location",
    "location_type": "prison",
    "name": "Komorn",
    "synonyms": ["Komarom","Komarno","Комаром","Komárom"],
    "prison_type": ["prison", "German labor camp", "transit camp", "filtration camp", "stammlager", "POW camp"],
    "nearest_locality": "Komarom",
    "comment": "The camp was in the fortress (citadel) Komar; respondent was there as a prisoner of war.",
    "country": "Hungary",
    "latlong": [47.721223,18.1234664]
  },
  {
    "id": "location_danzig",
    "type": "location",
    "location_type": "locality",
    "name": "Danzig",
    "synonyms": ["Gdańsk","Данциг","Гданьск"],
    "current_name": "Gdansk",
    "comment": "Current name is Gdansk (Poland); in the 1308-1466 and 1793-1945 years was known as Danzig.",
    "country": "Poland",
    "latlong": [54.35202520000001,18.6466384]
  },
  {
    "id": "location_linz",
    "type": "location",
    "location_type": "locality",
    "name": "Linz",
    "synonyms": ["Lentia","Данциг","Гданьск"],
    "current_name": "Gdansk",
    "comment": "Linz is the capital of Upper Austria",
    "country": "Austria",
    "latlong": [54.35202520000001,18.6466384]
  },
  {
    "id": "location_quasi",
    "type": "location",
    "location_type": "locality",
    "name": "Quasi",
    "synonyms": ["Lentia","Данциг","Гданьск"],
    "current_name": "Gdansk",
    "comment": "Linz is the capital of Upper Austria",
    "country": "Austria",
    "latlong": [54.35202520000001,18.6466384]
  }
]
},{}],7:[function(require,module,exports){
module.exports = [
  {
    "id": "person_1",
    "type": "person",
    "name": "Michael Aufreiter",
    "bio": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus pretium, tellus vitae facilisis pulvinar, augue tellus consequat nunc, eget porta tortor purus dictum ipsum."
  },
  {
    "id": "person_2",
    "type": "person",
    "name": "Oliver Buchtala",
    "bio": "Aliquam eu vulputate sapien. Curabitur nec cursus ex. Morbi ultrices nisi id metus elementum, nec convallis est tempor. Etiam ultricies id tortor id accumsan."
  },
  {
    "id": "person_3",
    "type": "person",
    "name": "Daniel Beilinson",
    "bio": "Fusce ac pellentesque nulla. Morbi condimentum urna vel libero interdum, non varius nisi sagittis."
  }
]

},{}],8:[function(require,module,exports){
module.exports = {
  "id": "f3ff7ee386e7cb2c49465ba130a9e40c",
  "schema": [
    "archivist-interview",
    "0.1.0"
  ],
  "nodes": {
    "document": {
      "id": "document",
      "type": "document",
      "views": [
        "content",
        "citations",
        "remarks",
        "info"
      ],
      "license": "licence",
      "guid": "f3ff7ee386e7cb2c49465ba130a9e40c",
      "creator": "",
      "title": "Mult-Annotation Fixture",
      "authors": [],
      "abstract": "",
      "created_at": "2014-12-12T14:18:28.712Z",
      "updated_at": "2014-12-12T14:21:33.828Z",
      "published_on": "2014-12-12T14:18:28.713Z"
    },
    "cover": {
      "id": "cover",
      "type": "cover",
      "authors": []
    },
    "content": {
      "type": "view",
      "id": "content",
      "nodes": [
        "cover",
        "text1",
        "62d1a1f7e3e5ba34f7cf345989247430",
        "3ffec772dd35e7d5ef340a5f423f0a50",
        "f1a510b7e0ef306bd90ade5e06158897",
        "ce34156d310a0c2b83aefcef6d04155f"
      ]
    },
    "citations": {
      "type": "view",
      "id": "citations",
      "nodes": []
    },
    "remarks": {
      "type": "view",
      "id": "remarks",
      "nodes": []
    },
    "info": {
      "type": "view",
      "id": "info",
      "nodes": [
        "publication_info",
        "interview_subject",
        "interview_conductor",
        "interview_operator",
        "interview_sound_operator"
      ]
    },
    "text1": {
      "type": "text",
      "id": "text1",
      "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin venenatis nisl eu mi elementum tincidunt. Suspendisse ultricies arcu leo, vitae tincidunt augue egestas ultrices. Aliquam quis ex placerat, maximus odio sit amet, placerat lacus. Integer pretium ipsum et luctus elementum. Ut sed commodo metus. Nunc sed enim ut diam facilisis gravida in vitae sapien. Sed varius malesuada nulla, eu lobortis nunc volutpat eget. Nunc fermentum, augue sed feugiat venenatis, orci erat efficitur tellus, at laoreet elit ante non enim. Ut venenatis metus eu enim mattis sollicitudin. Nullam bibendum consectetur tempus. Morbi rhoncus volutpat sem id venenatis. Sed iaculis hendrerit laoreet."
    },
    "publication_info": {
      "id": "publication_info",
      "type": "publication_info"
    },
    "interview_subject": {
      "type": "interview_subject",
      "id": "interview_subject",
      "name": "The Interviewed",
      "role": "Interview Subject",
      "forced_labor": "intracamp work; earthworks (construction of barracks); digging tunnels for military factories",
      "categories": [
        "Ost arbeiter",
        "Cocentration camp worker"
      ],
      "prisons": [
        "location_komorn"
      ],
      "movement": [
        "location_danzig:33",
        "location_komorn:67"
      ],
      "description": "",
      "image": ""
    },
    "interview_conductor": {
      "type": "contributor",
      "id": "interview_conductor",
      "source_id": "",
      "name": "Daniel Beilinson",
      "role": "Interview Conductor",
      "description": "",
      "image": ""
    },
    "interview_operator": {
      "type": "contributor",
      "id": "interview_operator",
      "source_id": "",
      "name": "Oliver Buchtala",
      "role": "Operator",
      "description": "",
      "image": ""
    },
    "interview_sound_operator": {
      "type": "contributor",
      "id": "interview_sound_operator",
      "source_id": "",
      "name": "Michael Aufreiter",
      "role": "Sound Operator",
      "description": "",
      "image": ""
    },
    "license": {
      "id": "license",
      "type": "license",
      "name": "None",
      "code": "none",
      "description": "",
      "version": "1.0",
      "url": ""
    },
    "62d1a1f7e3e5ba34f7cf345989247430": {
      "type": "text",
      "id": "62d1a1f7e3e5ba34f7cf345989247430",
      "source_id": "",
      "content": "Cras scelerisque sodales tellus, in mollis lorem venenatis a. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Cras condimentum laoreet vulputate. Nulla at risus nisl. Maecenas sapien massa, finibus in libero vel, volutpat suscipit ipsum. Mauris sit amet porttitor urna. Donec placerat eget ante ac pulvinar. Duis vitae eleifend nisl, id ullamcorper turpis. Curabitur vestibulum sed lacus eget pellentesque."
    },
    "3ffec772dd35e7d5ef340a5f423f0a50": {
      "type": "text",
      "id": "3ffec772dd35e7d5ef340a5f423f0a50",
      "source_id": "",
      "content": "Donec mauris nulla, rutrum eget malesuada vel, egestas sed odio. Vivamus ultrices purus vitae orci pharetra gravida. Etiam sagittis mauris ac efficitur egestas. In in pretium neque. Praesent at arcu a purus porttitor fringilla. In quis consectetur sapien. Donec vel mollis lacus. Phasellus interdum arcu eu nunc facilisis rhoncus. Sed vel semper augue. Phasellus a nulla at odio lacinia commodo ac et sem. In ut odio sit amet mi lobortis volutpat."
    },
    "f1a510b7e0ef306bd90ade5e06158897": {
      "type": "text",
      "id": "f1a510b7e0ef306bd90ade5e06158897",
      "source_id": "",
      "content": "Nullam est ex, eleifend id maximus id, blandit a leo. Aliquam at ante a nibh aliquam lobortis sed at libero. Praesent eget dictum est. Nulla facilisi. Nam varius, nunc vitae congue luctus, diam justo scelerisque urna, sit amet dictum diam justo sed nibh. Curabitur luctus iaculis dui ac venenatis. Mauris hendrerit malesuada vestibulum."
    },
    "ce34156d310a0c2b83aefcef6d04155f": {
      "type": "text",
      "id": "ce34156d310a0c2b83aefcef6d04155f",
      "source_id": "",
      "content": "Ut varius luctus erat, in accumsan lacus accumsan nec. Nullam euismod diam vel est sodales, quis congue lorem mattis. Ut sed mattis nisl. Etiam in dolor sed sapien tincidunt ultricies. Praesent laoreet eros vel rhoncus pellentesque. Etiam felis risus, congue in tellus at, feugiat imperdiet dolor. Maecenas vel sapien sed diam consectetur laoreet vitae vitae purus. Duis ac ipsum eu dolor commodo ultricies ut ut quam. Aliquam elementum rhoncus ullamcorper. Pellentesque condimentum lobortis odio nec porta. Maecenas tempus ut urna ac pharetra. Cras euismod mi tempus augue pretium, et interdum urna porta. Nulla in nisi tristique, aliquet nibh nec, consequat ipsum."
    },
    "subject_reference_1": {
      "type": "subject_reference",
      "id": "subject_reference_1",
      "container": "content",
      "startPath": ["62d1a1f7e3e5ba34f7cf345989247430", "content"],
      "startCharPos": 5,
      "endPath": ["3ffec772dd35e7d5ef340a5f423f0a50", "content"],
      "endCharPos": 220
    },
    "subject_reference_2": {
      "type": "subject_reference",
      "id": "subject_reference_2",
      "container": "content",
      "startPath": ["62d1a1f7e3e5ba34f7cf345989247430", "content"],
      "startCharPos": 300,
      "endPath": ["3ffec772dd35e7d5ef340a5f423f0a50", "content"],
      "endCharPos": 440
    }
  }
}

},{}],9:[function(require,module,exports){
module.exports = [
  {
    "id": "subject_war",
    "type": "subject",
    "name": "War"
  },
  {
    "id": "subject_hunger",
    "type": "subject",
    "name": "Hunger"
  },
  {
    "id": "subject_peace",
    "type": "subject",
    "name": "Peace"
  },
  {
    "id": "subject_war_in_41",
    "type": "subject",
    "name": "In 41",
    "parent": "subject_war"
  },
  {
    "id": "subject_war_in_42",
    "type": "subject",
    "name": "In 42",
    "parent": "subject_war"
  },
  {
    "id": "subject_hunger_in_41",
    "type": "subject",
    "name": "In 41",
    "parent": "subject_hunger"
  },
  {
    "id": "subject_hunger_in_42",
    "type": "subject",
    "name": "In 42",
    "parent": "subject_hunger"
  }
]
},{}],10:[function(require,module,exports){
"use strict";

var Application = require("./src/application");
Application.View = require("./src/view");
Application.Controller = require("./src/controller");

if (typeof window !== 'undefined') {
  Application.Router = require("./src/router");
  Application.DefaultRouter = require("./src/default_router");
  Application.ElementRenderer = require("./src/renderers/element_renderer");
  Application.$$ = Application.ElementRenderer.$$;
}

module.exports = Application;

},{"./src/application":11,"./src/controller":12,"./src/default_router":13,"./src/renderers/element_renderer":14,"./src/router":15,"./src/view":16}],11:[function(require,module,exports){
"use strict";

var View = require("./view");
var util = require("substance-util");
var _ = require("underscore");

// Substance.Application
// ==========================================================================
//
// Application abstraction suggesting strict MVC

// TODO: does this really need to be a View?
// It would be better to have controller to create view which
// is used has top level view.
var Application = function(config) {
  View.call(this);

  this.config = config || {};
  this.__controller__ = null;
};

Application.Prototype = function() {

  this.setRouter = function(router) {
    this.router = router;
  };

  // Start Application
  // ----------
  //

  this.start = function(options) {
    // NOTE: we have to import jquery this way as this class is used also used in a node context
    var $ = window.$;

    options = options || {};
    // First setup the top level view
    if (options.el) {
      this.el = options.el;
      this.$el = $(this.el);
    } else {
      // Defaults to body element
      this.$el = $('body');
      this.el = this.$el[0];
    }

    if (this.initialize) this.initialize();
    if (this.render) this.render();

    // Now the normal app lifecycle can begin
    // Because app state changes require the main view to be present
    // Triggers an initial app state change according to url hash fragment
    if (this.router) this.router.start();
  };

  // Switches the application state
  // --------
  // appState: a list of state objects

  var DEFAULT_SWITCH_OPTIONS = {
    updateRoute: true,
    replace: false
  };

  this.switchState = function(appState, options, cb) {
    var self = this;
    options = _.extend({}, DEFAULT_SWITCH_OPTIONS, options || {});

    // keep the old state for afterTransition-handler
    var oldAppState = this.getState();

    this.controller.__switchState__(appState, options, function(error) {
      if (error) {
        if (cb) {
          cb(error);
        } else {
          console.error(error.message);
          util.printStackTrace(error);
        }
        return;
      }
      if (options["updateRoute"]) {
        self.updateRoute(options);
      }

      if (self.afterTransition) {
        try {
          self.afterTransition(appState, oldAppState);
        } catch (err) {
          if (cb) {
            cb(err);
          } else {
            console.error(err.message);
            util.printStackTrace(err);
          }
          return;
        }
      }

      if (cb) cb(null);
    });
  };

  this.stateFromFragment = function(fragment) {
    function _createState(stateNames) {
      var state = [];
      for (var i = 0; i < stateNames.length; i++) {
        state.push({id: stateNames[i]});
      }
      return state;
    }

    var state;
    var params = fragment.split(";");

    var i, pair;
    var values = [];
    for (i=0; i<params.length; i++) {
      pair = params[i].split("=");
      var key = pair[0];
      var val = pair[1];
      if (!key || val === undefined) {
        continue;
      }
      if (key === "state") {
        var stateNames = val.split(".");
        state = _createState(stateNames);
      } else {
        pair = key.split(".");
        values.push({state: pair[0], key: pair[1], value: val});
      }
    }

    for (i=0; i<values.length; i++) {
      var item = values[i];
      var data = state[item.state];
      data[item.key] = item.value;
    }

    return state;
  };

  this.getState = function() {
    if (!this.controller.state) return null;

    var appState = [];
    var controller = this.controller;
    while(controller) {
      appState.push(controller.state);
      controller = controller.childController;
    }
    return appState;
  };

  this.updateRoute = function(options) {
    if (!this.router && !this.config["headless"]) {
      throw new Error("Application.updateRoute(): application has no router.");
    }

    options = options || {};

    var appState = this.getState();
    var stateIds = [];
    var stateParams = [];
    for (var i = 0; i < appState.length; i++) {
      var s = appState[i];
      if (!s) continue;
      stateIds.push(s.id);
      for (var key in s) {
        var val = s[key];
        if (key === "id" || key === "__id__" || key === "options") {
          continue;
        }
        // Note: currently only String variables are allowed as state variables
        if (!_.isString(val)) {
          console.error("Only String state variables are allowed");
          continue;
        }
        stateParams.push(i+"."+key+"="+val);
      }
    }
    var stateString = "state="+stateIds.join(".") + ";" + stateParams.join(";");
    this.router.navigate(stateString, {trigger: false, replace: options.replace});
  };

  // Called by a sub controller when a sub-state has been changed
  this.stateChanged = function(controller, oldState, options) {
    if (options["updateRoute"]) {
      this.updateRoute(options);
    }
  };

  this.sendError = function(err) {
    throw err;
  };
};

Application.Prototype.prototype = View.prototype;
Application.prototype = new Application.Prototype();

// TODO: this is dangerous as it obscures the underlying mechanism.
// Try to switch to a more explicit approach.
Object.defineProperty(Application.prototype, "controller", {
  set: function(controller) {
    controller.setChangeListener(this);
    this.__controller__ = controller;
  },
  get: function() {
    return this.__controller__;
  }
});

module.exports = Application;

},{"./view":16,"substance-util":268,"underscore":273}],12:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var _ = require("underscore");

// Substance.Application.Controller
// ==========================================================================
//
// Application Controller abstraction suggesting strict MVC

var Controller = function() {

  // an object that has a method 'stateChanged()'
  this.changeListener = null;

  // the state is represented by a unique name
  this.state = {id: "uninitialized"};

  // Each controller can have a single (active) child controller
  this.__childController__ = null;

  this.__parentController__ = null;
};

Controller.Prototype = function() {

  // A built-in transition function for switching to an initial state
  // --------
  //

  this.intitialize = function(/*state, cb*/) {};

  // A built-in transition function which is the opposite to `initialize`
  // ----
  this.dispose = function() {
    if (this.__childController__) this.__childController__.dispose();
    this.__childController__ = null;
    this.state = {id: "uninitialized"};
  };

  // State transition
  // ----
  // A typical transition implementation consists of 3 blocks:
  //
  // 1. Reflexive transitions (idem-potent checks):
  //    You have to check if a transition is actually necessary.
  //    If not call `cb(null, skipTransition=true)`
  //
  // 2. Disposal
  //    Clean up anything left from the old state
  //
  // 3. New state
  //    Create anything necessary for the new state
  //
  // Note: to provide additional run-time information you can access
  //       the options with `newState.options`
  //       However, when the state is loaded e.g. from the URL
  //       this information is not available.

  this.transition = function(newState, cb) {
    cb(null);
  };

  this.switchState = function(state, options, cb) {
    if (!cb && _.isFunction(options)) cb = options;
    var self = this;

    if (arguments.length === 1 && _.isFunction(options)) {
      cb = options;
      options = {};
    }

    options = options || {updateRoute: true, replace: false};

    cb = cb || function(err) {
      if (err) {
        console.error("Error during switch state", state, options);
        util.printStackTrace(err);
        throw new Error(err);
      }
    };

    var oldState = this.state;
    this.__switchState__(state, options, function(error) {
      if (error) return cb(error);
      if (self.changeListener) self.changeListener.stateChanged(this, oldState, options);
      cb(null);
    });
  };

  this.__switchState__ = function(appState, options, cb) {
    // console.log("Controller.switchState", JSON.stringify(state));
    var self = this;

    cb = cb || function(err) {
      if (err) throw new Error(err);
    };

    if (!_.isArray(appState)) {
      appState = [appState];
    }

    var _state = appState.shift();

    // Note: adding the options here to allow to provide custom dynamic data.
    //       However, you should use that rarely, as dynamic state information
    //       is not serialized. E.g., when loading the state from URL this information
    //       will not be available.
    _state.options = options || {};

    var _skipped;

    var _afterTransition = function() {
      if (!_skipped) {
        var oldState = self.state;
        self.state = _state;
        self.afterTransition(oldState);
        // clear the options as they should only be valid during transition
        self.state.options = {};
      }
      cb(null);
    };

    var _transition = function() {
      // console.log("Transition to", _state);
      try {
        self.transition(_state, function(error, options) {
          if (error) return cb(error);

          // legacy: using an object {skip: true} now
          if (_.isBoolean(options)) {
            _skipped = options;
          } else {
            if (options) {
              _skipped = options.skip;
            }
          }

          // The transition has been done in this level, i.e., child controllers
          // might have been created.
          // If a child controller exists we recurse into the next level.
          // After that the controller gets triggered about the finished transition.

          if (self.childController) {
            if (appState.length > 0) {
              self.childController.__switchState__(appState, options, function(error) {
                if (error) return cb(error);
                _afterTransition();
              });
            }
            else if (self.childController.DEFAULT_STATE) {
              self.childController.__switchState__(self.childController.DEFAULT_STATE, options, function(error){
                if (error) return cb(error);
                _afterTransition();
              });
            }
            else {
              throw new Error("Unsufficient state data provided! Child controller needs a transition!");
            }

          } else {
            _afterTransition();
          }
        });
      } catch (err) {
        cb(err);
      }
    };

    // If no transitions are given we still can use dispose/initialize
    // to reach the new state
    if (!this.state) {
      // console.log("Initializing...", _state);
      this.initialize(_state, function(error) {
        if (error) return cb(error);
        self.state = {id: "initialized"};
        _transition();
      });
    } else {
      _transition();
    }
  };

  this.afterTransition = function() {};

  this.setChildController = function(childController, options) {
    options = options || {};
    if (this.__childController__ && this.__childController__.state && !options.nowarn) {
      console.error("The child controller has not been disposed. Call 'disposeChildController()' first.");
      // this.__childController__.dispose();
    }
    if (!childController) {
      return;
    }
    if (!this.changeListener) {
      // We need to establish a consistent connection between (Sub-)Controllers and the Application
      // instance to be able to notify the app about changes in the sub state
      // For now, I decided to propagate the application when sub-controllers are attached
      // to parent controllers.
      // This makes sense w.r.t the current mechanism of state transitions which
      // works from top to down. I.e., a parent controller is either the top-level controller
      // or itself a child of an already attached controller.
      // A global/singleton Application instance would be possible, however I reject introducing
      // such an evil thing. It breaks modularity and makes testing harder.
      // Alternatively one could require this to be given when constructing Controllers,
      // however, this would require to change all constructors.
      console.error("This controller does not have a changeListener attached, so the child controller will not trigger corresponding application state changes.");
    } else {
      childController.changeListener = this.changeListener;
    }

    childController.__parentController__ = this;
    this.__childController__ = childController;
  };

  this.disposeChildController = function() {
    if (this.__childController__) {
      this.__childController__.dispose();
      this.__childController__ = null;
    }
  };

  // changelistener = parentController
  this.setChangeListener = function(changeListener) {
    this.changeListener = changeListener;
  };

  this.sendError = function(err) {
    if (this.__parentController__) this.__parentController__.sendError(err);
  };

};

Controller.Prototype.prototype = util.Events;
Controller.prototype = new Controller.Prototype();

Controller.State = function(id) {
  if (_.isString(id)) {
    this.__id__ = id;
  } else {
    var obj = arguments[0];
    this.__id__ = obj["id"];
    _.each(obj, function(val, key) {
      if (key === "id") return;
      this[key] = val;
    }, this);
  }
};

Object.defineProperty(Controller.State.prototype, "id", {
  set: function() {
    throw new Error("Property 'id' is immutable");
  },
  get: function() {
    return this.__id__;
  }
});

Object.defineProperty(Controller.prototype, "childController", {
  set: function(childController) {
    this.setChildController(childController);
  },
  get: function() {
    return this.__childController__;
  }
});

module.exports = Controller;

},{"substance-util":268,"underscore":273}],13:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Router = require("./router");

var DefaultRouter = function(app) {
  Router.call(this);

  this.app = app;
  _.each(DefaultRouter.routes, function(route) {
    if (!this[route.command]) {
      console.error("Unknown route handler: ", route.command);
    } else {
      this.route(route.route, route.name, _.bind(this[route.command], this));
    }
  }, this);

  this.route(/^state=.*$/, "state", _.bind(this.openState, this));
};

DefaultRouter.Prototype = function() {

  this.start = function() {
    Router.history.start();
  };

  var DEFAULT_OPTIONS = {
    updateRoute: false,
    replace: false
  };

  this.openState = function() {
    var fragment = Router.history.getFragment();
    var state = this.app.stateFromFragment(fragment);
    console.log('state change triggerd by router', JSON.stringify(state));
    this.app.switchState(state, DEFAULT_OPTIONS);
  };

  this.navigate = function(route, options) {
    Router.history.navigate(route, options);
  };
};

DefaultRouter.Prototype.prototype = Router.prototype;
DefaultRouter.prototype = new DefaultRouter.Prototype();

module.exports = DefaultRouter;

},{"./router":15,"underscore":273}],14:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var SRegExp = require("substance-regexp");

// Substance.Application.ElementRenderer
// ==========================================================================
//
// This is just a simple helper that allows us to create DOM elements
// in a data-driven way

var ElementRenderer = function(attributes) {
  this.attributes = attributes;

  // Pull off preserved properties from attributes
  // --------

  this.tagName = attributes.tag;
  this.children = attributes.children || [];
  this.text = attributes.text || "";
  this.html = attributes.html;

  delete attributes.children;
  delete attributes.text;
  delete attributes.html;
  delete attributes.tag;

  return this.render();
};


ElementRenderer.Prototype = function() {

  // Do the actual rendering
  // --------

  this.render = function() {
    var el = window.document.createElement(this.tagName);
    if (this.html) {
      el.innerHTML = this.html;
    } else {
      el.textContent = this.text;
    }

    // Set attributes based on element spec
    for(var attrName in this.attributes) {
      var val = this.attributes[attrName];
      el.setAttribute(attrName, val);
    }

    // Append childs
    for (var i=0; i<this.children.length; i++) {
      var child = this.children[i];
      el.appendChild(child);
    }

    // Remember element
    // Probably we should ditch this
    this.el = el;
    return el;
  };
};


// Provides a shortcut syntax interface to ElementRenderer
// --------

var $$ = function(descriptor, options) {
  options = options  || {};

  // Extract tagName, defaults to 'div'
  var tagName = /^([a-zA-Z0-9]*)/.exec(descriptor);
  options.tag = tagName && tagName[1] ? tagName[1] : 'div';

  // Any occurence of #some_chars
  var id = /#([a-zA-Z0-9_]*)/.exec(descriptor);
  if (id && id[1]) options.id = id[1];

  // Any occurence of .some-chars
  // if (!options.class) {
  //   var re = new RegExp(/\.([a-zA-Z0-9_-]*)/g);
  //   var classes = [];
  //   var classMatch;
  //   while (classMatch = re.exec(descriptor)) {
  //     classes.push(classMatch[1]);
  //   }
  //   options.class = classes.join(' ');
  // }

  // Any occurence of .some-chars
  var matchClasses = new SRegExp(/\.([a-zA-Z0-9_-]*)/g);
  // options.class = options.class ? options.class+' ' : '';
  if (!options.class) {
    options.class = matchClasses.match(descriptor).map(function(m) {
      return m.match[1];
    }).join(' ');
  }

  return new ElementRenderer(options);
};



ElementRenderer.$$ = $$;

// Setup prototype chain
ElementRenderer.Prototype.prototype = util.Events;
ElementRenderer.prototype = new ElementRenderer.Prototype();

module.exports = ElementRenderer;
},{"substance-regexp":259,"substance-util":268}],15:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var _ = require("underscore");

// NOTE: a bit nasty but we have to import jquery this way as this class is used also used in a node context
// TODO: try to avoid that this gets required when in node
var $;
if (typeof window !== 'undefined') {
  $ = window.$;
} else {
  console.error("FIXME: require router.js only when you are in a window context.");
  $ = null;
}

// Application.Router
// ---------------
//
// Implementation borrowed from Backbone.js

// Routers map faux-URLs to actions, and fire events when routes are
// matched. Creating a new one sets its `routes` hash, if not set statically.
var Router = function(options) {
  options = options || {};
  if (options.routes) this.routes = options.routes;
  this._bindRoutes();
  this.initialize.apply(this, arguments);
};

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var optionalParam = /\((.*?)\)/g;
var namedParam    = /(\(\?)?:\w+/g;
var splatParam    = /\*\w+/g;
var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

// Set up all inheritable **Application.Router** properties and methods.
_.extend(Router.prototype, util.Events, {

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize: function(){},

  // Manually bind a single named route to a callback. For example:
  //
  //     this.route('search/:query/p:num', 'search', function(query, num) {
  //       ...
  //     });
  //
  route: function(route, name, callback) {
    if (!_.isRegExp(route)) route = this._routeToRegExp(route);
    if (_.isFunction(name)) {
      callback = name;
      name = '';
    }
    if (!callback) callback = this[name];
    var router = this;
    Router.history.route(route, function(fragment) {
      var args = router._extractParameters(route, fragment);
      if (callback) callback.apply(router, args);
      router.trigger.apply(router, ['route:' + name].concat(args));
      router.trigger('route', name, args);
      Router.history.trigger('route', router, name, args);
    });
    return this;
  },

  // Simple proxy to `Router.history` to save a fragment into the history.
  navigate: function(fragment, options) {
    Router.history.navigate(fragment, options);
    return this;
  },

  // Bind all defined routes to `Router.history`. We have to reverse the
  // order of the routes here to support behavior where the most general
  // routes can be defined at the bottom of the route map.
  _bindRoutes: function() {
    if (!this.routes) return;
    this.routes = _.result(this, 'routes');
    var route, routes = _.keys(this.routes);
    while ((route = routes.pop()) !== null) {
      this.route(route, this.routes[route]);
    }
  },

  // Convert a route string into a regular expression, suitable for matching
  // against the current location hash.
  _routeToRegExp: function(route) {
    route = route.replace(escapeRegExp, '\\$&')
                 .replace(optionalParam, '(?:$1)?')
                 .replace(namedParam, function(match, optional){
                   return optional ? match : '([^\/]+)';
                 })
                 .replace(splatParam, '(.*?)');
    return new RegExp('^' + route + '$');
  },

  // Given a route, and a URL fragment that it matches, return the array of
  // extracted decoded parameters. Empty or unmatched parameters will be
  // treated as `null` to normalize cross-browser behavior.
  _extractParameters: function(route, fragment) {
    var params = route.exec(fragment).slice(1);
    return _.map(params, function(param) {
      return param ? decodeURIComponent(param) : null;
    });
  }
});




// Router.History
// ----------------

// Handles cross-browser history management, based on either
// [pushState](http://diveintohtml5.info/history.html) and real URLs, or
// [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
// and URL fragments. If the browser supports neither (old IE, natch),
// falls back to polling.
var History = Router.History = function() {
  this.handlers = [];
  _.bindAll(this, 'checkUrl');

  // Ensure that `History` can be used outside of the browser.
  if (typeof window !== 'undefined') {
    this.location = window.location;
    this.history = window.history;
  }
};

// Cached regex for stripping a leading hash/slash and trailing space.
var routeStripper = /^[#\/]|\s+$/g;

// Cached regex for stripping leading and trailing slashes.
var rootStripper = /^\/+|\/+$/g;

// Cached regex for detecting MSIE.
var isExplorer = /msie [\w.]+/;

// Cached regex for removing a trailing slash.
var trailingSlash = /\/$/;

// Has the history handling already been started?
History.started = false;

// Set up all inheritable **Router.History** properties and methods.
_.extend(History.prototype, util.Events, {

  // The default interval to poll for hash changes, if necessary, is
  // twenty times a second.
  interval: 50,

  // Gets the true hash value. Cannot use location.hash directly due to bug
  // in Firefox where location.hash will always be decoded.
  getHash: function(_window) {
    var match = (_window || window).location.href.match(/#(.*)$/);
    return match ? match[1] : '';
  },

  // Get the cross-browser normalized URL fragment, either from the URL,
  // the hash, or the override.
  getFragment: function(fragment, forcePushState) {
    if (fragment === null || fragment === undefined) {
      if (this._hasPushState || !this._wantsHashChange || forcePushState) {
        fragment = this.location.pathname;
        var root = this.root.replace(trailingSlash, '');
        if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
      } else {
        fragment = this.getHash();
      }
    }
    return fragment.replace(routeStripper, '');
  },

  // Start the hash change handling, returning `true` if the current URL matches
  // an existing route, and `false` otherwise.
  start: function(options) {
    if (History.started) throw new Error("Router.history has already been started");
    History.started = true;

    // Figure out the initial configuration. Do we need an iframe?
    // Is pushState desired ... is it available?
    this.options          = _.extend({}, {root: '/'}, this.options, options);
    this.root             = this.options.root;
    this._wantsHashChange = this.options.hashChange !== false;
    this._wantsPushState  = !!this.options.pushState;
    this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
    var fragment          = this.getFragment();
    var docMode           = window.document.documentMode;
    var oldIE             = (isExplorer.exec(window.navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

    // Normalize root to always include a leading and trailing slash.
    this.root = ('/' + this.root + '/').replace(rootStripper, '/');

    if (oldIE && this._wantsHashChange) {
      this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
      this.navigate(fragment);
    }

    // Depending on whether we're using pushState or hashes, and whether
    // 'onhashchange' is supported, determine how we check the URL state.
    if (this._hasPushState) {
      $(window).on('popstate', this.checkUrl);
    } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
      $(window).on('hashchange', this.checkUrl);
    } else if (this._wantsHashChange) {
      this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
    }

    // Determine if we need to change the base url, for a pushState link
    // opened by a non-pushState browser.
    this.fragment = fragment;
    var loc = this.location;
    var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

    // If we've started off with a route from a `pushState`-enabled browser,
    // but we're currently in a browser that doesn't support it...
    if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
      this.fragment = this.getFragment(null, true);
      this.location.replace(this.root + this.location.search + '#' + this.fragment);
      // Return immediately as browser will do redirect to new url
      return true;

    // Or if we've started out with a hash-based route, but we're currently
    // in a browser where it could be `pushState`-based instead...
    } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
      this.fragment = this.getHash().replace(routeStripper, '');
      this.history.replaceState({}, window.document.title, this.root + this.fragment + loc.search);
    }

    if (!this.options.silent) return this.loadUrl();
  },

  // Disable Router.history, perhaps temporarily. Not useful in a real app,
  // but possibly useful for unit testing Routers.
  stop: function() {
    $(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
    clearInterval(this._checkUrlInterval);
    History.started = false;
  },

  // Add a route to be tested when the fragment changes. Routes added later
  // may override previous routes.
  route: function(route, callback) {
    this.handlers.unshift({route: route, callback: callback});
  },

  // Checks the current URL to see if it has changed, and if it has,
  // calls `loadUrl`, normalizing across the hidden iframe.
  checkUrl: function() {
    var current = this.getFragment();
    if (current === this.fragment && this.iframe) {
      current = this.getFragment(this.getHash(this.iframe));
    }
    if (current === this.fragment) return false;
    if (this.iframe) this.navigate(current);
    if (!this.loadUrl()) this.loadUrl(this.getHash());
  },

  // Attempt to load the current URL fragment. If a route succeeds with a
  // match, returns `true`. If no defined routes matches the fragment,
  // returns `false`.
  loadUrl: function(fragmentOverride) {
    var fragment = this.fragment = this.getFragment(fragmentOverride);
    var matched = _.any(this.handlers, function(handler) {
      if (handler.route.test(fragment)) {
        handler.callback(fragment);
        return true;
      }
    });
    return matched;
  },

  // Save a fragment into the hash history, or replace the URL state if the
  // 'replace' option is passed. You are responsible for properly URL-encoding
  // the fragment in advance.
  //
  // The options object can contain `trigger: true` if you wish to have the
  // route callback be fired (not usually desirable), or `replace: true`, if
  // you wish to modify the current URL without adding an entry to the history.
  navigate: function(fragment, options) {
    if (!History.started) return false;
    if (!options || options === true) options = {trigger: options};
    fragment = this.getFragment(fragment || '');
    if (this.fragment === fragment) return;
    this.fragment = fragment;
    var url = this.root + fragment;

    // If pushState is available, we use it to set the fragment as a real URL.
    if (this._hasPushState) {
      this.history[options.replace ? 'replaceState' : 'pushState']({}, window.document.title, url);

    // If hash changes haven't been explicitly disabled, update the hash
    // fragment to store history.
    } else if (this._wantsHashChange) {
      this._updateHash(this.location, fragment, options.replace);
      if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
        // Opening and closing the iframe tricks IE7 and earlier to push a
        // history entry on hash-tag change.  When replace is true, we don't
        // want this.
        if(!options.replace) this.iframe.document.open().close();
        this._updateHash(this.iframe.location, fragment, options.replace);
      }

    // If you've told us that you explicitly don't want fallback hashchange-
    // based history, then `navigate` becomes a page refresh.
    } else {
      return this.location.assign(url);
    }
    if (options.trigger) this.loadUrl(fragment);
  },

  // Update the hash location, either replacing the current entry, or adding
  // a new one to the browser history.
  _updateHash: function(location, fragment, replace) {
    if (replace) {
      var href = location.href.replace(/(javascript:|#).*$/, '');
      location.replace(href + '#' + fragment);
    } else {
      // Some browsers require that `hash` contains a leading #.
      location.hash = '#' + fragment;
    }
  }
});

Router.history = new History();


module.exports = Router;
},{"substance-util":268,"underscore":273}],16:[function(require,module,exports){
"use strict";

var util = require("substance-util");

// Substance.View
// ==========================================================================
//
// Application View abstraction, inspired by Backbone.js

var View = function() {
  // Either use the provided element or make up a new element
  this.$el = window.$('<div/>');
  this.el = this.$el[0];

  this.dispatchDOMEvents();
};


View.Prototype = function() {

  // Default dispose function
  // --------
  //

  this.dispose = function() {
    this.stopListening();
  };

  // Shorthand for selecting elements within the view
  // ----------
  //

  this.$ = function(selector) {
    return this.$el.find(selector);
  };

  // Dispatching DOM events (like clicks)
  // ----------
  //

  this.dispatchDOMEvents = function() {

    var that = this;

    // showReport(foo) => ["showReport(foo)", "showReport", "foo"]
    // showReport(12) => ["showReport(12)", "showReport", "12"]
    function extractFunctionCall(str) {
      var match = /(\w+)\((.*)\)/.exec(str);
      if (!match) throw new Error("Invalid click handler '"+str+"'");

      return {
        "method": match[1],
        "args": match[2].split(',')
      };
    }

    this.$el.delegate('[sbs-click]', 'click', function(e) {

      // Matches things like this
      // showReport(foo) => ["showReport(foo)", "showReport", "foo"]
      // showReport(12) => ["showReport(12)", "showReport", "12"]
      var fnCall = extractFunctionCall(window.$(e.currentTarget).attr('sbs-click'));

      // Event bubbles up if there is no handler
      var method = that[fnCall.method];
      if (method) {
        method.apply(that, fnCall.args);
        return false;
      }
    });
  };

  this.updateTitle = function(newTitle) {
    window.document.title = newTitle;
    window.history.replaceState({}, window.document.title, window.location.href);
  };

};


View.Prototype.prototype = util.Events;
View.prototype = new View.Prototype();

module.exports = View;

},{"substance-util":268}],17:[function(require,module,exports){
"use strict";

var Article = require("./src/article");
Article.Renderer = require("./src/renderer");
Article.ViewFactory = require("./src/view_factory");

module.exports = Article;

},{"./src/article":19,"./src/renderer":21,"./src/view_factory":22}],18:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var nodes = {};

// TODO: we should change the 'substance-nodes' module in that way,
// that it provides a function that gives the cloned set
_.each(require("substance-nodes"), function(spec, name) {
  nodes[name] = _.clone(spec);
});

module.exports = nodes;

},{"substance-nodes":149,"underscore":273}],19:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Document = require("substance-document");
var Annotator = Document.Annotator;

// Substance.Article
// -----------------

var SCHEMA_ID = "substance-article";
var SCHEMA_VERSION = "0.6.0";

var Article = function(options) {
  options = options || {};

  // TODO: Check if format is compatible

  // Extend Schema
  // --------

  // TODO: the schema should actually be defined on application
  // level, i.e., where node types are specified
  if (!options.schema) {
    options.schema = util.deepclone(Document.schema);
    options.schema.id = SCHEMA_ID;
    options.schema.version = SCHEMA_VERSION;
  }

  // Merge in custom types
  var types = options.types || Article.types;
  _.each(types, function(type, key) {
    options.schema.types[key] = type;
  });

  // Merge in node types
  var nodeTypes = options.nodeTypes || Article.nodeTypes;
  _.each(nodeTypes, function(node, key) {
    options.schema.types[key] = node.Model.type;
  });

  // Merge in custom indexes
  var indexes = options.indexes || Article.indexes;
  _.each(indexes, function(index, key) {
    options.schema.indexes[key] = index;
  });

  var views = options.views || Article.views;

  // Call parent constructor
  // --------

  Document.call(this, options);

  this.nodeTypes = nodeTypes;

  // Seed the doc
  // --------

  if (options.seed === undefined) {
    this.create({
      id: "document",
      type: "document",
      guid: options.id, // external global document id
      creator: options.creator,
      created_at: options.created_at,
      views: ["content"], // is views really needed on the instance level
      title: "",
      abstract: "",
    });

    // Create views on the doc
    _.each(views, function(view) {
      this.create({
        id: view,
        "type": "view",
        nodes: []
      });
    }, this);
  }
};

Article.Prototype = function() {

  this.fromSnapshot = function(data, options) {
    return Article.fromSnapshot(data, options);
  };

  this.newInstance = function() {
    return new Article({ "schema": this.schema });
  };

  this.getAuthorNames = function() {
    return _.map(this.getAuthors(), function(a) {
      return a.name;
    });
  };

  this.getAuthors = function() {
    return _.map(this.authors, function(cid) {
      return this.get(cid);
    }, this);
  };

  // Set publication date
  // --------
  //

  this.setPublishedOn = function(dat) {
    this.set(["document", "published_on"], dat);
  };

  // Set document id (stored on document node)
  // --------
  //

  this.setId = function(docId) {
    this.set(["document", "guid"], docId);
  };

  // Set document title (stored on document node)
  // --------
  //

  this.setTitle = function(title) {
    this.set(["document", "title"], title);
  };

  // Set authors (stored on document node)
  // --------
  //

  this.setAuthors = function(authors) {
    this.set(["document", "authors"], authors);
  };

  this.createRenderer = function(viewName) {
    return new Article.Renderer(this, viewName);
  };

  this.getAnnotationBehavior = function() {
    return Article.annotationBehavior;
  };

  this.getMigrations = function() {
    return require("./article_migrations");
  };
};

// Factory method
// --------
//
// TODO: Ensure the snapshot doesn't get chronicled

Article.fromSnapshot = function(data, options) {
  options = options || {};
  options.seed = data;
  return new Article(options);
};


// Define available views
// --------

Article.views = ["content", "figures", "citations", "info", "links", "locations"];

// Register node types
// --------


Article.nodeTypes = require("../nodes");


// Define annotation types
// --------

Article.annotationBehavior = {
  groups: {
    "emphasis": "style",
    "strong": "style",
    "link_reference": "style",
    "math": "style",
    "issue": "marker"
  },
  expansion: {
    "emphasis": {
      left: Annotator.isOnNodeStart,
    },
    "strong": {
      left: Annotator.isOnNodeStart,
    }
  },
  split: ["emphasis", "strong"],
  levels: {
    idea: 1,
    question: 1,
    remark: 1,
    error: 1,
    issue: 1,
    link_reference: 1,
    math: 1,
    strong: 2,
    emphasis: 2,
    code: 2,
    subscript: 2,
    superscript: 2,
    underline: 2,
    cross_reference: 1,
    figure_reference: 1,
    person_reference: 1,
    contributor_reference: 1,
    citation_reference: 1,
    remark_reference: 1,
    error_reference: 1,
    location_reference: 1
  }
};

// Custom type definitions
// --------
//

Article.types = {};

// Custom indexes
// --------
//

Article.indexes = {
  // all comments are now indexed by node association
  "comments": {
    "type": "comment",
    "properties": ["node"]
  }
};


// From article definitions generate a nice reference document
// --------
//

var ARTICLE_DOC_SEED = {
  "id": "article",
  "nodes": {
    "document": {
      "type": "document",
      "id": "document",
      "views": [
        "content",
        "info"
      ],
      "title": "The Anatomy of a Substance Article",
      "authors": ["contributor_1", "contributor_2"],
      "guid": "lens_article"
    },

    "content": {
      "type": "view",
      "id": "content",
      "nodes": [
        "cover",
      ]
    },

    "cover": {
      "id": "cover",
      "type": "cover"
    },

    "contributor_1": {
      "id": "contributor_1",
      "type": "contributor",
      "name": "Michael Aufreiter"
    },

    "contributor_2": {
      "id": "contributor_2",
      "type": "contributor",
      "name": "Oliver Buchtala"
    }
  }
};

Article.SCHEMA_ID = SCHEMA_ID;
Article.SCHEMA_VERSION = SCHEMA_VERSION;

Article.describe = function() {
  var doc = new Article({seed: ARTICLE_DOC_SEED});

  var id = 0;

  _.each(Article.nodeTypes, function(nodeType, key) {
    if (key === "composite") return;
    nodeType = nodeType.Model;

    // Create a heading for each node type
    var headingId = "heading_"+nodeType.type.id;

    doc.create({
      id: headingId,
      type: "heading",
      content: nodeType.description.name,
      level: 1
    });

    // Turn remarks and description into an introduction paragraph
    var introText = nodeType.description.remarks.join(' ');
    var introId = "text_"+nodeType.type.id+"_intro";

    doc.create({
      id: introId,
      type: "text",
      content: introText,
    });


    // Show it in the content view
    doc.show("content", [headingId, introId], -1);


    // Include property description
    // --------
    //

    doc.create({
      id: headingId+"_properties",
      type: "text",
      content: nodeType.description.name+ " uses the following properties:"
    });

    doc.show("content", [headingId+"_properties"], -1);

    var items = [];

    _.each(nodeType.description.properties, function(propertyDescr, key) {

      var listItemId = "text_" + (++id);
      doc.create({
        id: listItemId,
        type: "text",
        content: key +": " + propertyDescr
      });

      // Create code annotation for the propertyName
      doc.create({
        "id": id+"_annotation",
        "type": "code",
        "path": [listItemId, "content"],
        "range":[0, key.length]
      });

      items.push(listItemId);
    });

    // Create list
    doc.create({
      id: headingId+"_property_list",
      type: "list",
      items: items,
      ordered: false
    });

    // And show it
    doc.show("content", [headingId+"_property_list"], -1);

    // Include example
    // --------

    if (nodeType.example) {
      doc.create({
        id: headingId+"_example",
        type: "text",
        content: "Here's an example:"
      });

      doc.create({
        id: headingId+"_example_code_block",
        type: "code_block",
        content: JSON.stringify(nodeType.example, null, '  '),
      });
      doc.show("content", [headingId+"_example", headingId+"_example_codeblock"], -1);
    }
  });

  return doc;
};


Article.Prototype.prototype = Document.prototype;
Article.prototype = new Article.Prototype();
Article.prototype.constructor = Article;

// Add convenience accessors for builtin document attributes
Object.defineProperties(Article.prototype, {
  id: {
    get: function() {
      return this.get("document").guid;
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  },
  creator: {
    get: function() {
      return this.get("document").creator;
    },
    set: function(creator) {
      this.get("document").creator = creator;
    }
  },
  authors: {
    get: function() {
      return this.get("document").authors;
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  },
  updated_at: {
    get: function() {
      return this.get("document").updated_at;
    },

    // This is going to be called very often
    // Any operation will trigger it
    // maybe we can optimize here
    set: function(val) {
      this.get("document").updated_at = val;
    }
  },
  created_at: {
    get: function() {
      return this.get("document").created_at;
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  },
  published_on: {
    get: function() {
      return this.get("document").published_on;
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  },
  license: {
    get: function() {
      return this.get("document").license;
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  },
  title: {
    get: function() {
      return this.get("document").title;
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  },
  abstract: {
    get: function() {
      return this.get("document").abstract;
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  },
  views: {
    get: function() {
      // Note: returing a copy to avoid inadvertent changes
      return this.get("document").views.slice(0);
    },
    set: function() {
      throw new Error("This is a read-only property alias.");
    }
  }
});

module.exports = Article;

},{"../nodes":18,"./article_migrations":20,"substance-document":136,"substance-util":268,"underscore":273}],20:[function(require,module,exports){
"use strict";

var _ = require("underscore");

/*
  For the future we should bump the schema version whenever

  - a node type is added, removed, or renamed
  - a node property is added, removed, renamed
  - also if the semantic of our composer changes!
    Example: figure.caption is a text node in the previous version and
    in the new version is used as a 'rich' paragraph.

  After such a shema version bump you should get the change log using:
    $ git log  --oneline --decorate <since-sha>..<until-sha>
  and add relevant changes to the documentation of a new migration function.

  Give the new migration function a name such as

    function v040_to_v050(v040_data) {}

  To resolve schema differences follow this guide-line:

  - node type added: nothing to be done
  - node type removed: remove all nodes of that type
  - node type renamed: rename nodes of that type
  - node property added: add the property to all nodes using an appropriate default value
  - node property removed: remove that property
  - node property renamed: rename the property
  - other things: do other things
  - unrevoverable issues: add an error to the migration report

  The migration functions are called incrementally.
  Each of these functions must migrate from the previous version to the version it is assigned to.

  E.g. a migration function for "0.1.1" receives data of version "0.1.0".
  Or, if after "0.1.1" came "0.2.0", the migrator for the latter version is called
  with data of version "0.1.1".

  A migrator function is called with a Migrator instance as argument.
  The Migrator provides certain helper functions to accomplish this task.
  However you can do anything you wish using our own helpers.
  The json data object can be accessed using
      migrator.data
*/

var v040_to_v050 = function (migrator) {
  // Note: Until now we did not manage the schema version.

  // $ git log  --oneline --decorate 1020e73a3cf49b395d490cf36827453870317910..9f50c813080c180ffb5bfbd7491db2670d4fcc3f
  // 2de810b Video killed the radio star.
  // 76a16a1 Replace images, webpage support.
  // c253237 Video and Audio support.
  // b463730 Implemented webpage.
  // 7f5aa16 Codeblock -> CodeBlock
  // e9aad83 Webpage -> Webresource
  // cb277b4 Plain list implementation.
  // 7651571 Add a dedicated 'document' node.
  // 5526fd2 Blobs for image display.
  // 72f2e2d Update figure.js
  // 3bbb3f8 Link -> Webpage
  // 406b2a9 Adjust schema of Contributor nodes.

  // Note: Article migration is supported beginning from version 0.5.0
  // Migration from 0.4.0 to 0.5.0 is only a stub

  migrator.addProperty("web_page", "width", "400px");
  migrator.addProperty("web_page", "height", "400px");
};


var v050_to_v060 = function (migrator) {
  // Use n.url as a default for new property n.title
  _.each(migrator.data.nodes, function(n) {
    if (n.type === "web_resource") {
      n.title = n.url;
    }
  });
};


var NOP = function() {};

var migrations = {
  "0.4.0": NOP,
  "0.5.0": v040_to_v050,
  "0.6.0": v050_to_v060
};

module.exports = migrations;

},{"underscore":273}],21:[function(require,module,exports){
"use strict";

var ViewFactory = require("./view_factory");
var _ = require("underscore");

// Renders an article
// --------
//

var ArticleRenderer = function(document, viewName, options) {
  ViewFactory.call(this, document);

  this.viewName = viewName;
  this.options = options || {};
  this.nodeViews = {};
};

ArticleRenderer.Prototype = function() {

  var __super__ = ViewFactory.prototype;

  // Note: it is important to recreate a view to be able to dispose child views
  // and not having to reuse all the time.
  this.createView = function(node, overwrite) {
    if (this.nodeViews[node.id] && !overwrite) {
      return this.nodeViews[node.id];
    } else if (this.nodeViews[node.id] && overwrite) {
      this.nodeViews[node.id].dispose();
    }
    var nodeView = __super__.createView.call(this, node);
    this.nodeViews[node.id] = nodeView;
    return nodeView;
  };

  this.getView = function(nodeId) {
    if (this.nodeViews[nodeId]) {
      return this.nodeViews[nodeId];
    }
    var node = this.document.get(nodeId);
    return this.createView(node);
  };

  // Render it
  // --------
  //

  this.render = function() {
    _.each(this.nodeViews, function(nodeView) {
      nodeView.dispose();
    });

    var frag = window.document.createDocumentFragment();

    var nodeIds = this.document.get(this.viewName).nodes;
    _.each(nodeIds, function(id) {
      var node = this.document.get(id);
      var view = this.createView(node);
      frag.appendChild(view.render().el);

      // Lets you customize the resulting DOM sticking on the el element
      // Example: Lens focus controls
      if (this.options.afterRender) {
        this.options.afterRender(this.document, view);
      }
    }, this);

    return frag;
  };

};

ArticleRenderer.Prototype.prototype = ViewFactory.prototype;
ArticleRenderer.prototype = new ArticleRenderer.Prototype();

module.exports = ArticleRenderer;

},{"./view_factory":22,"underscore":273}],22:[function(require,module,exports){
"use strict";

var ViewFactory = function(doc) {
  this.document = doc;
  this.nodeTypes = doc.nodeTypes;
};

ViewFactory.Prototype = function() {

  // For a given node's type get the corresponding view class
  // --------
  //

  this.getNodeViewClass = function(node, type) {
    type = type || node.type;
    var NodeType = this.nodeTypes[type];
    if (!NodeType) {
      throw new Error('No node registered for type ' + type + '.');
    }
    var NodeView = NodeType.View;
    if (!NodeView) {
      throw new Error('No view registered for type "'+node.type+'".');
    }
    return NodeView;
  };

  // Create a node view
  // --------
  //

  this.createView = function(node, options, type) {
    var NodeView = this.getNodeViewClass(node, type);
    // Note: passing the factory to the node views
    // to allow creation of nested views
    var nodeView = new NodeView(node, this, options);

    // we connect the listener here to avoid to pass the document itself into the nodeView
    nodeView.listenTo(this.document, "operation:applied", nodeView.onGraphUpdate);
    return nodeView;
  };
};

ViewFactory.prototype = new ViewFactory.Prototype();

module.exports = ViewFactory;

},{}],23:[function(require,module,exports){
"use strict";

var Chronicle = require('./src/chronicle');

Chronicle.IndexImpl = require('./src/index_impl');
Chronicle.ChronicleImpl = require('./src/chronicle_impl');
Chronicle.DiffImpl = require('./src/diff_impl');
Chronicle.TmpIndex = require('./src/tmp_index');

Chronicle.create = Chronicle.ChronicleImpl.create;
Chronicle.Index.create = Chronicle.IndexImpl.create;
Chronicle.Diff.create = Chronicle.DiffImpl.create;

Chronicle.ArrayOperationAdapter = require('./src/array_adapter');
Chronicle.TextOperationAdapter = require('./src/text_adapter');

Chronicle.IndexedDBBackend = require("./src/backends/indexeddb_backend");

module.exports = Chronicle;

},{"./src/array_adapter":24,"./src/backends/indexeddb_backend":25,"./src/chronicle":26,"./src/chronicle_impl":27,"./src/diff_impl":28,"./src/index_impl":29,"./src/text_adapter":30,"./src/tmp_index":31}],24:[function(require,module,exports){
"use strict";

var util = require('substance-util');
var Chronicle = require('./chronicle');
var ArrayOperation = require('substance-operator').ArrayOperation;

var ArrayOperationAdapter = function(chronicle, array) {
  Chronicle.Versioned.call(this, chronicle);
  this.array = array;
};

ArrayOperationAdapter.Prototype = function() {

  var __super__ = util.prototype(this);

  this.apply = function(change) {
    ArrayOperation.fromJSON(change).apply(this.array);
  };

  this.invert = function(change) {
    return ArrayOperation.fromJSON(change).invert();
  };

  this.transform = function(a, b, options) {
    return ArrayOperation.transform(a, b, options);
  };

  this.reset = function() {
    __super__.reset.call(this);
    while(this.array.length > 0) {
      this.array.shift();
    }
  };

};

ArrayOperationAdapter.Prototype.prototype = Chronicle.Versioned.prototype;
ArrayOperationAdapter.prototype = new ArrayOperationAdapter.Prototype();

module.exports = ArrayOperationAdapter;

},{"./chronicle":26,"substance-operator":250,"substance-util":268}],25:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var _ = require("underscore");
var Chronicle = require("../chronicle");
var Index = Chronicle.Index;

var IndexedDbBackend = function(name, index) {
  this.name = name;
  this.index = index;
  this.db = null;
};

IndexedDbBackend.Prototype = function() {

  this.delete = function(cb) {
    var self = this;
    this.clear(function() {
      window.indexedDB.deleteDatabase(self.name);
      cb(null);
    });
  };

  var __clearObjectStore = function(db, name, cb) {
    var transaction = db.transaction([name], "readwrite");
    var objectStore = transaction.objectStore(name);
    var request = objectStore.clear();
    request.onsuccess = function() {
      cb(null);
    };
    request.onerror = function(err) {
      cb(err);
    };
  };

  this.clear = function(cb) {
    var db = this.db;
    var names = ["changes", "snapshots", "refs"];
    util.async.each({
      items: names,
      iterator: function(name, cb) {
        __clearObjectStore(db, name, cb);
      }
    }, cb);
  };

  this.open = function(cb) {
    var self = this;
    // reset this.db to make sure it is only available when successfully opened.
    this.db = null;

    var request = window.indexedDB.open(this.name, 1);
    request.onupgradeneeded = function(event) {
      var db = event.target.result;
      db.createObjectStore("changes", { keyPath: "id" });
      var snapshots = db.createObjectStore("snapshots", { keyPath: "sha" });
      snapshots.createIndex("sha", "sha", {unique:true});
      var refs = db.createObjectStore("refs", { keyPath: "name" });
      refs.createIndex("name", "name", {unique:true});
    };
    request.onerror = function(event) {
      console.error("Could not open database", self.name);
      cb(event);
    };
    request.onsuccess = function(event) {
      // console.log("Opened database", self.name);
      self.db = event.target.result;
      cb(null);
    };
  };

  this.close = function(cb) {
    // console.log("IndexedDbBackend.close()");
    var self = this;
    this.db.close();
    if (cb) cb(null);
  };

  // Load all stored changes into the memory index
  this.load = function(cb) {
    var self = this;
    var transaction = this.db.transaction(["changes", "refs"]);
    var objectStore = transaction.objectStore("changes");

    var iterator = objectStore.openCursor();
    var changes = {};
    iterator.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        changes[cursor.key] = cursor.value;
        cursor.continue();
        return;
      }
      // Note: Index.adapt() mimics a hash to be a Chronicle.Index.
      self.index.import(Index.adapt(changes));

      var refStore = transaction.objectStore("refs");
      iterator = refStore.openCursor();
      iterator.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          self.index.setRef(cursor.key, cursor.value["sha"]);
          cursor.continue();
          return;
        }
        cb(null);
      };
      iterator.onerror = function(event) {
        console.error("Error during loading...", event);
        cb(event);
      };
    };
    iterator.onerror = function(event) {
      console.error("Error during loading...", event);
      cb(event);
    };
  };

  var _saveChanges = function(self, cb) {
    // TODO: we should use a special index which keeps track of new changes to be synched
    // for now brute-forcely overwriting everything
    var transaction = self.db.transaction(["changes"], "readwrite");
    transaction.onerror = function(event) {
      console.error("Error while saving changes.");
      if (cb) cb(event);
    };
    transaction.oncomplete = function() {
      if (cb) cb(null);
    };

    // NOTE: brute-force. Saving all changes everytime. Should be optimized someday.
    var changes = transaction.objectStore("changes");
    self.index.foreach(function(change) {
      var data = change;
      if (change instanceof Chronicle.Change) {
        data = change.toJSON();
      }
      var request = changes.put(data);
      request.onerror = function(event) {
        console.error("Could not add change: ", change.id, event);
      };
    });
  };

  var _saveRefs = function(self, cb) {
    // TODO: we should use a special index which keeps track of new changes to be synched
    // for now brute-forcely overwriting everything
    var transaction = self.db.transaction(["refs"], "readwrite");
    transaction.onerror = function(event) {
      console.error("Error while saving refs.");
      if (cb) cb(event);
    };
    transaction.oncomplete = function() {
      // console.log("...saved refs");
      if (cb) cb(null);
    };

    var refs = transaction.objectStore("refs");
    _.each(self.index.listRefs(), function(name) {
      var data = {
        name: name,
        sha: self.index.getRef(name)
      };
      var request = refs.put(data);
      request.onerror = function(event) {
        console.error("Could not store ref: ", data, event);
      };
    });
  };

  this.save = function(cb) {
    // console.log("IndexedDbBackend.save()");
    var self = this;
    _saveChanges(self, function(error) {
      if (error) return cb(error);
      // console.log("...saved changes.");
      _saveRefs(self, cb);
    });
  };

  this.saveSnapshot = function(sha, document, cb) {
    var transaction = this.db.transaction(["snapshots"], "readwrite");
    transaction.oncomplete = function() {
      // console.log("Saved snapshot.");
      cb(null);
    };
    transaction.onerror = function(event) {
      console.error("Error while saving snapshot.");
      cb(event);
    };

    var snapshots = transaction.objectStore("snapshots");
    var data = document;
    // if the provided document has a toJSON function
    // apply it before serialization
    if (data.toJSON) data = data.toJSON();
    data.sha = sha;
    var request = snapshots.put(data);
    request.onerror = function(event) {
      console.error("Could not add snapshot: ", data, event);
    };
  };

  this.listSnapshots = function(cb) {
    var transaction = this.db.transaction(["snapshots"], "readonly");
    var objectStore = transaction.objectStore("snapshots");
    var index = objectStore.index("sha");
    var iterator = index.openCursor();
    var snapshots = [];

    iterator.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        snapshots.push(cursor.key);
        cursor.continue();
        return;
      }
      cb(null, snapshots);
    };
    iterator.onerror = function(event) {
      console.error("Error during loading...", event);
      cb(event);
    };
  };

  this.getSnapshot = function(sha, cb) {
    var transaction = this.db.transaction(["snapshots"], "readonly");
    var snapshots = transaction.objectStore("snapshots");
    var request = snapshots.get(sha);
    request.onsuccess = function(event) {
      var snapshot = event.target.result;
      cb(null, snapshot);
    };
    request.onerror = function(event) {
      console.error("Error: could not load snapshot for sha", sha);
      cb(event);
    };
  };
};
IndexedDbBackend.prototype = new IndexedDbBackend.Prototype();

module.exports = IndexedDbBackend;

},{"../chronicle":26,"substance-util":268,"underscore":273}],26:[function(require,module,exports){
"use strict";

/*jshint unused: false*/ // deactivating this, as we define abstract interfaces here

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;

errors.define("ChronicleError", -1);
errors.define("ChangeError", -1);

// A change recorded in the chronicle
// ========
//
// Each change has an unique id (equivalent to git SHA).
// A change can have multiple parents (merge).
//
// options:
//   - id: a custom id for the change

var Change = function(id, parent, data) {

  this.type = 'change';

  if (!id) {
    throw new errors.ChangeError("Every change needs a unique id.");
  }
  this.id = id;

  if (!parent) {
    throw new errors.ChangeError("Every change needs a parent.");
  }

  this.parent = parent;

  // Application specific data
  // --------
  //
  // This needs to contain all information to be able to apply and revert
  // a change.

  this.data = data;

  this.uuid = util.uuid;

};

Change.prototype = {

  toJSON: function() {
    return {
      type: this.type,
      id: this.id,
      parent: this.parent,
      data: this.data
    };
  }

};

Change.fromJSON = function(json) {
  if (json.type === Merge.TYPE) return new Merge(json);
  if (json.type === Transformed.TYPE) return new Transformed(json);

  return new Change(json.parent, json.data, json);
};

// a dedicated global root node
var ROOT = "ROOT";
var ROOT_NODE = new Change(ROOT, true, null);
ROOT_NODE.parent = ROOT;

// A dedicated Change for merging multiple Chronicle histories.
// ========
//
// A merge is described by a command containing a diff for each of the parents (see Index.diff()).
//
// Example: Consider two sequences of changes [c0, c11, c12] and [c0, c21, c22, c23].
//
//  A merge taking all commits of the second ('theirs') branch and
//  rejecting those of the first ('mine') would be:
//
//    merge = {
//      "c12": ["-", "c11", "c0" "+", "c21", "c22", "c23"],
//      "c23": []
//    }
//
// A manually selected merge with [c11, c21, c23] would look like:
//
//    merge = {
//      "c12": ["-", "c11", "+", "c21", "c23"],
//      "c23": ["-", "c22", "c21", "c0", "+", "c11", "c21", "c23"]
//    }
//

var Merge = function(id, main, branches) {
  Change.call(this, id, main);
  this.type = Merge.TYPE;

  if (!branches) {
    throw new errors.ChangeError("Missing branches.");
  }
  this.branches = branches;
};

Merge.Prototype = function() {

  var __super__ = util.prototype(this);

  this.toJSON = function() {
    var result = __super__.toJSON.call(this);
    result.type = Merge.TYPE;
    result.branches = this.branches;
    return result;
  };

};
Merge.Prototype.prototype = Change.prototype;
Merge.prototype = new Merge.Prototype();

Merge.TYPE =  "merge";

Merge.fromJSON = function(data) {
  if (data.type !== Merge.TYPE) throw new errors.ChangeError("Illegal data for deserializing a Merge node.");
  return new Merge(data.parent, data.branches, data);
};

// Transformed changes are those which have been
// created by transforming (rebasing) another existing change.
// For the time being, the data is persisted redundantly.
// To be able to track the original source of the change,
// this type is introduced.
var Transformed = function(id, parent, data, original) {
  Change.call(this, id, parent, data);
  this.type = Transformed.TYPE;
  this.original = original;
};

Transformed.Prototype = function() {

  var __super__ = util.prototype(this);

  this.toJSON = function() {
    var result = __super__.toJSON.call(this);
    result.type = Transformed.TYPE;
    result.original = this.original;
    return result;
  };

};

Transformed.TYPE = "transformed";

Transformed.fromJSON = function(json) {
  if (json.type !== Transformed.TYPE) throw new errors.ChangeError("Illegal data for deserializing a Transformed node.");
  return new Transformed(json.parent, json.data, json.original, json);
};


Transformed.Prototype.prototype = Change.prototype;
Transformed.prototype = new Transformed.Prototype();

// A class that describes the difference of two states by
// a sequence of changes (reverts and applies).
// =======
//
// The difference is a sequence of commands that forms a transition from
// one state to another.
//
// A diff is specified using the following syntax:
//    [- sha [shas ...]] [+ sha [shas ...]]
// where '-' preceeds a sequence reverts and '+' a sequence of applies.
// Any diff can be described in that order (reverts followed by applies)
//
// Example: Consider an index containing the following changes
//
//        , - c11 - c12
//      c0
//        ` - c21 - c22 - c23
//
// Diffs for possible transitions look like:
// "c21" -> "c23" : ["+", "c22", "c23"]
// "c12" -> "c0" :  ["-", "c11", "c0" ]
// "c21" -> "c11" : ["-", "c0", "+", "c11"]

var Diff = function() {};

Diff.prototype = {

  hasReverts: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the changes that will be reverted
  // --------

  reverts: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  hasApplies: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the changes that will applied
  // --------

  applies: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the sequence of states visited by this diff.
  // --------

  sequence: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the path from the root to the first change
  // --------
  //
  // The naming refers to a typical diff situation where
  // two branches are compared. The first branch containing the own
  // changes, the second one the others.

  mine: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the path from the root to the second change
  // --------
  //

  theirs: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the common root of the compared branches.
  // --------
  //

  root: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the version this diff has to be applied on.
  // --------

  start: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides the version which is generated by applying this diff.
  // --------

  end: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

  // Provides a copy that represents the inversion of this diff.
  // --------

  inverted: function() {
    throw new errors.SubstanceError("Not implemented.");
  },

};

// Creates a new diff for the given reverts and applies
// --------
// Note this factory is provided when loading index_impl.js

Diff.create = function(reverts, applies) {
  /*jshint unused: false*/
  throw new errors.SubstanceError("Not implemented.");
};


// A Chronicle contains the history of a versioned object.
// ========
//

var Chronicle = function(index, options) {
  options = options || {};

  // an instance implementing the 'Index' interface
  this.index = index;

  // the versioned object which must implement the 'Versioned' interface.
  this.versioned = null;

  // flags to control the chronicle's behaviour
  this.__mode__ = options.mode || Chronicle.DEFAULT_MODE;
};

Chronicle.Prototype = function() {

  // Records a change
  // --------
  //
  // Creates a commit and inserts it into the index at the current position.
  //
  // An application should call this after having applied the change to the model successfully.
  // The provided 'change' should contain every information that is necessary to
  // apply the change in both directions (apply and revert).
  //
  // Note: this corresponds to a 'git commit' in git.

  this.record = function(change) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Opens a specific version.
  // --------
  //
  // Brings the versioned object as well as the index to the state
  // of the given state.
  //

  this.open = function(version) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Performs an incremental transformation.
  // --------
  //
  // The given state must be a direct neighbor of the current state.
  // For convenience a sequence of consecutive states can be given.
  //
  // Call this if you already know path between two states
  // or if you want to apply or revert a single change.
  //
  // Returns the change applied by the step.
  //

  this.step = function(next) {
    throw new errors.SubstanceError("Not implemented.");
  };

  this.forward = function(toward) {
    var state = this.versioned.getState();
    if (state === toward) return;

    var children = this.index.children[state];

    if (children.length === 0) return;

    var next;

    if (children.length === 1) {
      next = children[0];
    }
    else if (toward) {
      var path = this.index.shortestPath(state, toward);
      path.shift();
      next = path.shift();
    }
    else {
      next = children[children.length-1];
    }

    if (next) {
      return this.step(next);
    } else {
      return;
    }
  };

  this.rewind = function() {
    var current = this.index.get(this.versioned.getState());
    var previous;
    if (current.id === ROOT) return null;

    previous = current.parent;
    return this.step(previous);
  };

  // Create a commit that merges a history specified by its last commit.
  // --------
  //
  // The strategy specifies how the merge should be generated.
  //
  //  'mine':   reject the changes of the other branch
  //  'theirs': reject the changes of this branch
  //  'manual': compute a merge that leads to the given sequence.
  //
  // Returns the id of the new state.
  //

  this.merge = function(state, strategy, sequence) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Making this instance the chronicler of the given Versioned instance.
  // --------
  //

  this.manage = function(versioned) {
    this.versioned = versioned;
  };

  // Marks the current version.
  // --------
  //

  this.mark = function(name) {
    this.index.setRef(name, this.versioned.getState());
  };

  // Provides the id of a previously marked version.
  // --------
  //

  this.find = function(name) {
    return this.index.getRef(name);
  };

  // Get the current version.
  // --------
  //

  this.getState = function() {
    return this.versioned.getState();
  };

  // Retrieve changes.
  // --------
  //
  // If no range is given a full path is returned.

  this.getChanges = function(start, end) {
    var changes = [];
    var path = this.path(start, end);

    _.each(path, function(id) {
      changes.push(this.index.get(id));
    }, this);

    return changes;
  };

  this.canRedo = function() {
    var state = this.versioned.getState();
    var children = this.index.children[state];
    return children.length > 0;
  };

  this.canUndo = function() {
    var root = this.index.get(ROOT);
    var current = this.index.get(this.versioned.getState());
    return (current !== root);
  };

};

Chronicle.prototype = new Chronicle.Prototype();

// only allow changes that have been checked via instant apply+revert
Chronicle.PEDANTIC_RECORD = 1 << 1;

// performs a reset for all imported changes
Chronicle.PEDANTIC_IMPORT = 1 << 2;

Chronicle.HYSTERICAL = Chronicle.PEDANTIC_RECORD | Chronicle.PEDANTIC_IMPORT;
Chronicle.DEFAULT_MODE = Chronicle.PEDANTIC_IMPORT;

// The factory method to create a Chronicle instance
// --------
// options:
//  store: a Substance Store used to persist the index
Chronicle.create = function(options) {
  throw new errors.SubstanceError("Not implemented.");
};

// A directed acyclic graph of Commit instances.
// ========
//
var Index = function() {
  this.__id__ = util.uuid();

  this.changes = {};
  this.refs = {};
  this.children = {};
  this.changes[ROOT] = ROOT_NODE;
  this.children[ROOT] = [];
};

Index.Prototype = function() {

  // Adds a change to the index.
  // --------
  // All parents must be registered first, otherwise throws an error.
  //

  this.add = function(change) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Removes a change from the index
  // --------
  // All children must be removed first, otherwise throws an error.
  //

  this.remove = function(id) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Checks if a given changeId has been added to the index.
  // --------
  //

  this.contains = function(changeId) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Retrieves a (shortest) path between two versions
  // --------
  //
  // If no end change is given it returns the path starting
  // from ROOT to the start change.
  // path() returns the path from ROOT to the current state.
  //

  this.path = function(start, end) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Retrieves a change by id
  // --------
  //

  this.get = function(id) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Provides all changes that are direct successors of this change.
  // --------
  //

  this.getChildren = function(id) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Lists the ids of all contained changes
  // --------
  //

  this.list = function() {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Computes the difference betweend two changes
  // --------
  //
  // In contrast to `path` is a diff a special path that consists
  // of a sequence of reverts followed by a sequence of applies.
  //

  this.diff = function(start, end) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Sets a reference to look up a change via name.
  // ---------
  //

  this.setRef = function(name, id) {
    if (this.changes[id] === undefined) {
      throw new errors.ChronicleError("Unknown change: " + id);
    }
    this.refs[name] = id;
  };

  // Looks-up a change via name.
  // ---------
  //

  this.getRef = function(name) {
    return this.refs[name];
  };

  this.listRefs = function() {
    return Object.keys(this.refs);
  };

  // Imports all commits from another index
  // --------
  //
  // Note: this corresponds to a 'git fetch', which only adds commits without
  // applying any changes.
  //

  this.import = function(otherIndex) {
    throw new errors.SubstanceError("Not implemented.");
  };

};

Index.prototype = new Index.Prototype();

Index.INVALID = "INVALID";
Index.ROOT = ROOT_NODE;

Index.create = function() {
  throw new errors.SubstanceError("Not implemented.");
};

// Creates an adapter for Changes given as plain hash.
// The adapter can be used together with Index.import
Index.adapt = function(changes) {
  return {
    list: function() {
      return _.keys(changes);
    },
    get: function(id) {
      return changes[id];
    }
  };
};

// A interface that must be implemented by objects that should be versioned.
var Versioned = function(chronicle) {
  this.chronicle = chronicle;
  this.state = ROOT;
  chronicle.manage(this);
};

Versioned.Prototype = function() {

  // Applies the given change.
  // --------
  //

  this.apply = function(change) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Reverts the given change.
  // --------
  //

  this.revert = function(change) {
    change = this.invert(change);
    this.apply(change);
  };

  // Inverts a given change
  // --------
  //

  this.invert = function(change) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Transforms two sibling changes.
  // --------
  //
  // This is the `transform` operator provided by Operational Transformation.
  //
  //       / - a            / - a - b' \
  //      o          ~ >   o             p
  //       \ - b            \ - b - a' /
  //
  // I.e., the result of applying `a - b'` must lead to the same result as
  // applying `b - a'`.
  //
  // options:
  //
  //  - check:    enables conflict checking. A MergeConflict is thrown as an error
  //              when a conflict is found during transformation.
  //  - inplace:  transforms the given instances a and b directly, without copying.
  //
  // returns: [a', b']

  this.transform = function(a, b, options) {
    throw new errors.SubstanceError("Not implemented.");
  };

  // Provides the current state.
  // --------
  //

  this.getState = function() {
    return this.state;
  };

  // Sets the state.
  // --------
  //
  // Note: this is necessary for implementing merges.
  //

  this.setState = function(state) {
    this.state = state;
  };

  // Resets the versioned object to a clean state.
  // --------
  //

  this.reset = function() {
    this.state = ROOT;
  };
};

Versioned.prototype = new Versioned.Prototype();

Chronicle.Change = Change;
Chronicle.Merge = Merge;
Chronicle.Transformed = Transformed;
Chronicle.Diff = Diff;
Chronicle.Index = Index;
Chronicle.Versioned = Versioned;
Chronicle.ROOT = ROOT;

Chronicle.mergeConflict = function(a, b) {
  var conflict = new errors.MergeConflict("Merge conflict: " + JSON.stringify(a) +" vs " + JSON.stringify(b));
  conflict.a = a;
  conflict.b = b;
  return conflict;
};

module.exports = Chronicle;

},{"substance-util":268,"underscore":273}],27:[function(require,module,exports){
"use strict";

// Imports
// ====

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;
var Chronicle = require('./chronicle');

// Module
// ====

var ChronicleImpl = function(index, options) {
  Chronicle.call(this, index, options);
};

ChronicleImpl.Prototype = function() {

  var __private__ = new ChronicleImpl.__private__();
  var ROOT = Chronicle.Index.ROOT.id;

  this.uuid = util.uuid;
  this.internal_uuid = util.uuid;

  this.record = function(changeData) {
    // Sanity check: the change should have been applied already.
    // Reverting and applying should not fail.
    if ((this.__mode__ & Chronicle.PEDANTIC_RECORD) > 0) {
      this.versioned.revert(changeData);
      this.versioned.apply(changeData);
    }

    // 1. create a new change instance
    var head = this.versioned.getState();
    var id = this.uuid();
    var change = new Chronicle.Change(id, head, changeData);

    // 2. add change to index
    this.index.add(change);

    // 3. shift head
    this.versioned.setState(id);

    return id;
  };

  this.reset = function(id, index) {
    index = index || this.index;

    // the given id must be available
    if (!index.contains(id)) {
      throw new errors.ChronicleError("Invalid argument: unknown change "+id);
    }

    // 1. compute diff between current state and the given id
    var head = this.versioned.getState();
    var path = index.shortestPath(head, id);

    // 2. apply path
    __private__.applySequence.call(this, path, index);
  };

  this.open = this.reset;

  this.path = function(id1, id2) {
    if (!id2) {
      var path = this.index.shortestPath(ROOT, id1 || this.versioned.getState());
      path.shift();
      return path;
    } else {
      if (!id1) throw new errors.ChronicleError("Illegal argument: "+id1);
      return this.index.shortestPath(id1, id2);
    }
  };

  this.apply = function(sha) {
    if (_.isArray(sha)) {
      return __private__.applySequence.call(this, sha);
    } else {
      return __private__.applySequence.call(this, arguments);
    }
  };

  this.step = function(nextId) {
    var index = this.index;
    var originalState = this.versioned.getState();

    try {
      var current = index.get(originalState);

      // tolerate nop-transitions
      if (current.id === nextId) return null;

      var next = index.get(nextId);

      var op;
      if (current.parent === nextId) {
        op = this.versioned.invert(current.data);
      } else if (next.parent === current.id) {
        op = next.data;
      }
      else {
        throw new errors.ChronicleError("Invalid apply sequence: "+nextId+" is not parent or child of "+current.id);
      }

      this.versioned.apply(op);
      this.versioned.setState(nextId);
      return op;

    } catch(err) {
      this.reset(originalState, index);
      throw err;
    }
  };

  this.merge = function(id, strategy, options) {
    // the given id must exist
    if (!this.index.contains(id))
      throw new errors.ChronicleError("Invalid argument: unknown change "+id);

    if(arguments.length == 1) {
      strategy = "auto";
      options = {};
    }

    options = options || {};

    var head = this.versioned.getState();
    var diff = this.index.diff(head, id);

    // 1. check for simple cases

    // 1.1. don't do anything if the other merge is already merged
    if (!diff.hasApplies()) {
      return head;
    }

    // 1.2. check if the merge can be solved by simple applies (so called fast-forward)
    if (!diff.hasReverts() && !options.no_ff) {
      __private__.applyDiff.call(this, diff);
      return this.versioned.getState();
    }

    // 2. create a Merge node
    var change;

    // Strategies:

    // Mine
    if (strategy === "mine") {
      change = new Chronicle.Merge(this.uuid(), head, [head, id]);
    }

    // Theirs
    else if (strategy === "theirs") {
      change = new Chronicle.Merge(this.uuid(), id, [head, id]);
    }

    // Manual
    else if (strategy === "manual") {
      if (!options.sequence) throw new errors.ChronicleError("Invalid argument: sequence is missing for manual merge");
      var sequence = options.sequence;

      change = __private__.manualMerge.call(this, head, id, diff, sequence, options);
    }

    // Unsupported
    else {
      throw new errors.ChronicleError("Unsupported merge strategy: "+strategy);
    }

    // 2. add the change to the index
    this.index.add(change);

    // 3. reset state
    this.reset(change.id);

    return change.id;
  };


  this.import = function(otherIndex) {
    var newIds = this.index.import(otherIndex);
    // sanity check: see if all imported changes can be applied
    if ((this.__mode__ & Chronicle.PEDANTIC_IMPORT) > 0) __private__.importSanityCheck.call(this, newIds);
  };

};

ChronicleImpl.__private__ = function() {

  var __private__ = this;

  // Traversal operations
  // =======

  // a diff is a special kind of path which consists of
  // a sequence of reverts and a sequence of applies.
  this.applyDiff = function(diff, index) {

    index = index || this.index;

    if(!diff) return;

    var originalState = this.versioned.getState();

    // sanity check: don't allow to apply the diff on another change
    if (originalState !== diff.start())
      throw new errors.ChronicleError("Diff can not applied on to this state. Expected: "+diff.start()+", Actual: "+originalState);

    var err = null;
    var successfulReverts = [];
    var successfulApplies = [];
    try {
      var reverts = diff.reverts();
      var applies = diff.applies();

      var idx, id;
      // start at idx 1 as the first is the starting id
      for (idx = 0; idx < reverts.length; idx++) {
        id = reverts[idx];
        __private__.revertTo.call(this, id, index);
        successfulReverts.push(id);
      }
      for (idx = 0; idx < applies.length; idx++) {
        id = applies[idx];
        __private__.apply.call(this, id, index);
        successfulApplies.push(id);
      }
    } catch(_err) {
      err = _err;
    }

    // if the diff could not be applied, revert all changes that have been applied so far
    if (err && (successfulReverts.length > 0 || successfulApplies.length > 0)) {
      // idx shows to the change that has failed;
      var applied = Chronicle.Diff.create(diff.start(), successfulReverts, successfulApplies);
      var inverted = applied.inverted();
      try {
        __private__.applyDiff.call(this, inverted, index);
      } catch(_err) {
        // TODO: maybe we should do that always, instead of minimal rollback?
        console.log("Ohohhhh.... could not rollback partially applied diff.",
          "Without bugs and in HYSTERICAL mode this should not happen.",
          "Resetting to original state");
        this.versioned.reset();
        this.reset(originalState, index);
      }
    }

    if (err) throw err;
  };

  this.applySequence = function(seq, index) {
    index = index || this.index;

    var originalState = this.versioned.getState();

    try {
      var current = index.get(originalState);
      _.each(seq, function(id) {

        // tolerate nop-transitions
        if (current.id === id) return;

        var next = index.get(id);

        // revert
        if (current.parent === id) {
          __private__.revertTo.call(this, id, index);
        }
        // apply
        else if (next.parent === current.id) {
          __private__.apply.call(this, id, index);
        }
        else {
          throw new errors.ChronicleError("Invalid apply sequence: "+id+" is not parent or child of "+current.id);
        }
        current = next;

      }, this);
    } catch(err) {
      this.reset(originalState, index);
      throw err;
    }
  };

  // Performs a single revert step
  // --------

  this.revertTo = function(id, index) {
    index = index || this.index;

    var head = this.versioned.getState();
    var current = index.get(head);

    // sanity checks
    if (!current) throw new errors.ChangeError("Illegal state. 'head' is unknown: "+ head);
    if (current.parent !== id) throw new errors.ChangeError("Can not revert: change is not parent of current");

    // Note: Merge nodes do not have data
    if (current.data) this.versioned.revert(current.data);
    this.versioned.setState(id);
  };

  // Performs a single forward step
  // --------

  this.apply = function(id, index) {
    index = index || this.index;

    var change = index.get(id);

    // sanity check
    if (!change) throw new errors.ChangeError("Illegal argument. change is unknown: "+ id);

    if (change.data) this.versioned.apply(change.data);
    this.versioned.setState(id);
  };

  // Restructuring operations
  // =======

  // Eliminates a sequence of changes before a given change.
  // --------
  //
  // A new branch with transformed changes is created.
  //
  //      0 - a  - b  - c  - d
  //
  //    > c' = eliminate(c, [b,a])
  //
  //      0 - a  - b  - c  - d
  //      |
  //       \- c' - d'
  //
  // The sequence should be in descending order.
  //
  // Returns the id of the rebased change.
  //

  this.eliminate = function(start, del, mapping, index, selection) {
    if (!(index instanceof Chronicle.TmpIndex)) {
      throw new errors.ChronicleError("'eliminate' must be called on a TmpIndex instance");
    }

    var left = index.get(del);
    var right = index.get(start);
    var inverted, rebased;

    // attach the inversion of the first to the first node
    inverted = new Chronicle.Change(this.internal_uuid(), del, this.versioned.invert(left.data));
    index.add(inverted);

    // rebase onto the inverted change
    // Note: basicially this can fail due to broken dependencies of changes
    // However, we do not want to have any conflict management in this case
    // and fail with error instead
    rebased = __private__.rebase0.call(this, inverted.id, right.id, mapping, index, selection, true);

    // as we know that we have eliminated the effect by directly applying
    // a change and its inverse, it is ok to directly skip those two changes at all
    index.reconnect(rebased, left.parent);

    // continue with the transformed version
    right = index.get(rebased);

    return right.id;
  };

  // Performs a basic rebase operation.
  // --------
  //
  // The target and source must be siblings
  //
  //        0 - a
  //        |
  //         \- b - c
  //
  //    > b' = rebase0(a, b)
  //
  //        0 - a  - b' - c'
  //        |
  //         \- b - c
  //
  // The original changes remain.
  // A mapping is created to allow looking up rebased changes via their original ids.

  this.rebase0 = function(targetId, sourceId, mapping, index, selection, check) {
    index = index || this.index;

    var target = index.get(targetId);
    var source = index.get(sourceId);

    if (target.parent !== source.parent) {
      throw new errors.ChronicleError("Illegal arguments: principal rebase can only be applied on siblings.");
    }

    // recursively transform the sub-graph
    var queue = [[target.data, target.id, source]];

    var item;
    var a, b, b_i;
    var result = null;


    // keep merge nodes to update the mapped branches afterwards
    var merges = [];
    var idx;

    while(queue.length > 0) {
      item = queue.pop();

      a = item[0];
      targetId = item[1];
      source = item[2];
      b = source.data;

      var transformed;

      if (source instanceof Chronicle.Merge) {
        // no transformation necessary here
        // propagating the current transformation
        transformed = [a];
        // inserting the original branch ids here, which will be resolved to the transformed ids
        // afterwards, when we can be sure, that all other node have been transformed.
        b_i = new Chronicle.Merge(this.uuid(), targetId, source.branches);
        merges.push(b_i);
      } else {
        // perform the operational transformation
        // TODO: make checking configurable?
        transformed = this.versioned.transform(a, b, {check: check});

        // add a change the with the rebased/transformed operation
        var orig = (source instanceof Chronicle.Transformed) ? source.original : source.id;
        b_i = new Chronicle.Transformed(this.internal_uuid(), targetId, transformed[1], orig);

        // overwrite the mapping for the original
        mapping[orig] = b_i.id;
      }

      // record a mapping between old and new nodes
      mapping[source.id] = b_i.id;

      if (!result) result = b_i;
      index.add(b_i);

      // add children to iteration
      var children = index.getChildren(source.id);
      for (idx = 0; idx < children.length; idx++) {
        var child = index.get(children[idx]);

        // only rebase selected children if a selection is given
        if (selection) {
          var c = (child instanceof Chronicle.Transformed) ? child.original : child.id;
          if (!selection[c]) continue;
        }

        queue.unshift([transformed[0], b_i.id, child]);
      }
    }

    // resolve the transformed branch ids in all occurred merge nodes.
    for (idx = 0; idx < merges.length; idx++) {
      var m = merges[idx];
      var mapped_branches = [];
      for (var idx2 = 0; idx2 < m.branches.length; idx2++) {
        mapped_branches.push(mapping[m.branches[idx2]]);
      }
      m.branches = mapped_branches;
    }

    return result.id;
  };

  // Merge implementations
  // =======

  // Creates a branch containing only the selected changes
  // --------
  // this is part of the merge
  this.eliminateToSelection = function(branch, sequence, mapping, index) {
    var tmp_index = new Chronicle.TmpIndex(index);

    var selection = _.intersection(branch, sequence);
    if (selection.length === 0) return null;

    var eliminations = _.difference(branch, sequence).reverse();
    if (eliminations.length === 0) return mapping[selection[0]];

    var idx1 = 0, idx2 = 0;
    var idx, id, del;
    var last = null;

    while (idx1 < branch.length && idx2 < eliminations.length) {
      id = branch[branch.length-1-idx1];
      del = eliminations[idx2];

      if (id === del) {
        // update the selected change
        if (last) {
          // TODO: filter propagations to nodes that are within the selection (or resolve to)
          last = __private__.eliminate.call(this, last, id, mapping, tmp_index, mapping);
        }
        idx1++; idx2++;
      } else {
        last = id;
        idx1++;
      }
    }

    // store the transformed selected changes to the parent index
    for (idx = 0; idx < selection.length; idx++) {
      id = selection[idx];
      tmp_index.save(mapping[id]);
    }

    return mapping[selection[0]];
  };

  this.manualMerge = function(head, id, diff, sequence, options) {

      if (sequence.length === 0) {
        throw new errors.ChronicleError("Nothing selected for merge.");
      }

      // accept only those selected which are actually part of the two branches
      var tmp = _.intersection(sequence, diff.sequence());
      if (tmp.length !== sequence.length) {
        throw new errors.ChronicleError("Illegal merge selection: contains changes that are not contained in the merged branches.");
      }

      // The given sequence is constructed introducing new (hidden) changes.
      // This is done in the following way:
      // 1. Creating clean versions of the two branches by eliminating all changes that are not selected
      // 2. TODO Re-order the eliminated versions
      // 3. Zip-merge the temporary branches into the selected one

      var tmp_index = new Chronicle.TmpIndex(this.index);

      // Preparation / Elimination
      // ........

      var mine = diff.mine();
      var theirs = diff.theirs();

      var mapping = _.object(sequence, sequence);
      __private__.eliminateToSelection.call(this, mine, sequence, mapping, tmp_index);
      __private__.eliminateToSelection.call(this, theirs, sequence, mapping, tmp_index);

      // 2. Re-order?
      // TODO: implement this if desired

      // Merge
      // ........

      mine = _.intersection(mine, sequence);
      theirs = _.intersection(theirs, sequence);

      for (var idx = 0; idx < sequence.length; idx++) {
        var nextId = sequence[idx];
        var a, b;

        if(mine.length === 0 || theirs.length === 0) {
          break;
        }

        if (mine[0] === nextId) {
          mine.shift();
          a = mapping[nextId];
          b = mapping[theirs[0]];
        } else if (theirs[0] === nextId) {
          theirs.shift();
          a = mapping[nextId];
          b = mapping[mine[0]];
        } else {
          throw new errors.ChronicleError("Reordering of commmits is not supported.");
        }
        __private__.rebase0.call(this, a, b, mapping, tmp_index, null, !options.force);
      }
      var lastId = mapping[_.last(sequence)];

      // Sanity check
      // ........

      // let's do a sanity check before we save the index changes
      try {
        this.reset(lastId, tmp_index);
      } catch (err) {
        this.reset(head, tmp_index);
        throw err;
      }

      // finally we can write the newly created changes into the parent index
      for (idx=0; idx<sequence.length; idx++) {
        tmp_index.save(mapping[sequence[idx]]);
      }

      return new Chronicle.Merge(this.uuid(), lastId, [head, id]);
  };

  this.importSanityCheck = function(newIds) {
    var head = this.versioned.getState();

    // This is definitely very hysterical: we try to reach
    // every provided change by resetting to it.
    // If this is possible we are sure that every change has been applied
    // and reverted at least once.
    // This is for sure not a minimalistic approach.
    var err = null;
    var idx;
    try {
      for (idx = 0; idx < newIds.length; idx++) {
        this.reset(newIds[idx]);
      }
    } catch (_err) {
      err = _err;
      console.log(err.stack);
    }
    // rollback to original state
    this.reset(head);

    if (err) {
      // remove the changes in reverse order to meet restrictions
      newIds.reverse();
      for (idx = 0; idx < newIds.length; idx++) {
        this.index.remove(newIds[idx]);
      }
      if (err) throw new errors.ChronicleError("Import did not pass sanity check: "+err.toString());
    }
  };

};
ChronicleImpl.Prototype.prototype = Chronicle.prototype;
ChronicleImpl.prototype = new ChronicleImpl.Prototype();

ChronicleImpl.create = function(options) {
  options = options || {};
  var index = Chronicle.Index.create(options);
  return new ChronicleImpl(index, options);
};

module.exports = ChronicleImpl;

},{"./chronicle":26,"substance-util":268,"underscore":273}],28:[function(require,module,exports){
var _ = require("underscore");
var Chronicle = require("./chronicle");

var DiffImpl = function(data) {
  this.data = data;
};

DiffImpl.Prototype = function() {

  this.reverts = function() {
    return this.data[1].slice(1, this.data[0]+1);
  };

  this.applies = function() {
    return this.data[1].slice(this.data[0]+1);
  };

  this.hasReverts = function() {
    return this.data[0]>0;
  };

  this.hasApplies = function() {
    return this.data[1].length-1-this.data[0] > 0;
  };

  this.start = function() {
    return this.data[1][0];
  };

  this.end = function() {
    return _.last(this.data[1]);
  };

  this.root = function() {
    return this.data[1][this.data[0]];
  };

  this.sequence = function() {
    return this.data[1].slice(0);
  };

  this.mine = function() {
    return this.data[1].slice(0, this.data[0]).reverse();
  };

  this.theirs = function() {
    return this.applies();
  };

  this.inverted = function() {
    return new DiffImpl([this.data[1].length-1-this.data[0], this.data[1].slice(0).reverse()]);
  };

  this.toJSON = function() {
    return {
      data: this.data
    };
  };
};

DiffImpl.Prototype.prototype = Chronicle.Diff.prototype;
DiffImpl.prototype = new DiffImpl.Prototype();

DiffImpl.create = function(id, reverts, applies) {
  return new DiffImpl([reverts.length, [id].concat(reverts).concat(applies)]);
};

module.exports = DiffImpl;

},{"./chronicle":26,"underscore":273}],29:[function(require,module,exports){
"use strict";

// Imports
// ====

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;
var Chronicle = require('./chronicle');

// Module
// ====

var IndexImpl = function() {
  Chronicle.Index.call(this);
};

IndexImpl.Prototype = function() {

  var __private__ = new IndexImpl.__private__();
  var ROOT = Chronicle.ROOT;

  this.add = function(change) {
    // making the change data read-only
    change.data = util.freeze(change.data);

    var id = change.id;

    // sanity check: parents must
    if (!change.parent) throw new errors.ChronicleError("Change does not have a parent.");

    if (!this.contains(change.parent))
      throw new errors.ChronicleError("Illegal change: parent is unknown - change=" + id + ", parent=" + change.parent);

    this.changes[id] = change;
    this.children[id] = [];

    if (!this.children[change.parent]) this.children[change.parent] = [];
    this.children[change.parent].push(id);
  };

  this.remove = function(id) {
    if (this.children[id].length > 0)
      throw new errors.ChronicleError("Can not remove: other changes depend on it.");

    var change = this.changes[id];

    delete this.changes[id];
    delete this.children[id];
    this.children[change.parent] = _.without(this.children[change.parent], id);
  };

  this.contains = function(id) {
    return !!this.changes[id];
  };

  this.get = function(id) {
    return this.changes[id];
  };

  this.list = function() {
    return _.keys(this.changes);
  };

  this.getChildren = function(id) {
    return this.children[id];
  };

  this.diff = function(start, end) {

    // takes the path from both ends to the root
    // and finds the first common change

    var path1 = __private__.getPathToRoot.call(this, start);
    var path2 = __private__.getPathToRoot.call(this, end);

    var reverts = [];
    var applies = [];

    // create a lookup table for changes contained in the second path
    var tmp = {},
        id, idx;
    for (idx=0; idx < path2.length; idx++) {
      tmp[path2[idx]] = true;
    }

    // Traverses all changes from the first path until a common change is found
    // These changes constitute the reverting part
    for (idx=0; idx < path1.length; idx++) {
      id = path1[idx];
      // The first change is not included in the revert list
      // The common root
      if(idx > 0) reverts.push(id);
      if(tmp[id]) break;
    }

    var root = id;

    // Traverses the second path to the common change
    // These changes constitute the apply part
    for (idx=0; idx < path2.length; idx++) {
      id = path2[idx];
      if (id === root || id === ROOT) break;
      // Note: we are traversing from head to root
      // the applies need to be in reverse order
      applies.unshift(id);
    }

    return Chronicle.Diff.create(start, reverts, applies);
  };

  // Computes the shortest path from start to end (without start)
  // --------
  //

  this.shortestPath = function(start, end) {

    // trivial cases
    if (start === end) return [];
    if (end === ROOT) return __private__.getPathToRoot.call(this, start).slice(1);
    if (start === ROOT) return __private__.getPathToRoot.call(this, end).reverse().slice(1);

    // performs a BFS for end.
    var visited = {};
    var queue = [[start, start]];
    var item, origin, pos, current,
        idx, id, children;

    // Note: it is important to

    while(queue.length > 0) {
      item = queue.shift();
      origin = item[0];
      pos = item[1];
      current = this.get(pos);

      if (!visited[pos]) {
        // store the origin to be able to reconstruct the path later
        visited[pos] = origin;

        if (pos === end) {
          // reconstruct the path
          var path = [];
          var tmp;
          while (pos !== start) {
            path.unshift(pos);
            tmp = visited[pos];
            visited[pos] = null;
            pos = tmp;
            if (!pos) throw new errors.SubstanceError("Illegal state: bug in implementation of Index.shortestPath.");
          }
          return path;
        }

        // TODO: we could optimize this a bit if we would check
        // if a parent or a child are the searched node and stop
        // instead of iterating .

        // adding unvisited parent
        if (!visited[current.parent]) queue.push([pos, current.parent]);

        // and all unvisited children
        children = this.getChildren(pos);

        for (idx = 0; idx < children.length; idx++) {
          id = children[idx];
          if(!visited[id]) queue.push([pos, id]);
        }
      }
    }

    throw new errors.SubstanceError("Illegal state: no path found.");
  };

  this.import = function(otherIndex) {
    // 1. index difference (only ids)
    var newIds = _.difference(otherIndex.list(), this.list());
    if (newIds.length === 0) return;

    // 2. compute correct order
    // Note: changes have to added according to their dependencies.
    // I.e., a change can only be added after all parents have been added.
    // OTOH, changes have to be removed in reverse order.
    var order = __private__.computeDependencyOrder.call(this, otherIndex, newIds);

    // now they are topologically sorted
    newIds.sort(function(a,b){ return (order[a] - order[b]); });

    // 2. add changes to the index
    for (var idx = 0; idx < newIds.length; idx++) {
      this.add(otherIndex.get(newIds[idx]));
    }

    return newIds;
  };

  this.foreach = function(iterator, start) {
    start = start || "ROOT";
    var queue = [start];
    var nextId, next;
    while (queue.length > 0) {
      nextId = queue.shift();
      next = this.get(nextId);
      iterator(next);

      var children = this.children[nextId];
      for (var i = 0; i < children.length; i++) {
        queue.push(children[i]);
      }
    }
  };
};

IndexImpl.__private__ = function() {

  var ROOT = Chronicle.ROOT;

  this.getPathToRoot = function(id) {
    var result = [];

    if (id === ROOT) return result;

    var current = this.get(id);
    if(!current) throw new errors.ChronicleError("Unknown change: "+id);

    var parent;
    while(true) {
      result.push(current.id);
      if(current.id === ROOT) break;

      parent = current.parent;
      current = this.get(parent);
    }

    return result;
  };

  // Import helpers
  // =======

  // computes an order on a set of changes
  // so that they can be added to the index,
  // without violating the integrity of the index at any time.
  this.computeDependencyOrder = function(other, newIds) {
    var order = {};

    function _order(id) {
      if (order[id]) return order[id];
      if (id === ROOT) return 0;

      var change = other.get(id);
      var o = _order(change.parent) + 1;
      order[id] = o;

      return o;
    }

    for (var idx = 0; idx < newIds.length; idx++) {
      _order(newIds[idx]);
    }

    return order;
  };

};

IndexImpl.Prototype.prototype = Chronicle.Index.prototype;
IndexImpl.prototype = new IndexImpl.Prototype();



// Extensions
// --------

var makePersistent = function(index, store) {

  index.store = store;
  index.__changes__ = store.hash("changes");
  index.__refs__ = store.hash("refs");

  // Initialize the index with the content loaded from the store

  // Trick: let the changes hash mimic an Index (duck-type)
  // and use Index.import
  index.__changes__.list = index.__changes__.keys;

  // Overrides
  // --------

  var __add__ = index.add;
  index.add = function(change) {
    __add__.call(this, change);
    this.__changes__.set(change.id, change);
  };

  var __remove__ = index.remove;
  index.remove = function(id) {
    __remove__.call(this, id);
    this.__changes__.delete(id);
  };

  var __setRef__ = index.setRef;
  index.setRef = function(name, id) {
    __setRef__.call(this, name, id);
    this.__refs__.set(name, id);
  };

  // Extensions
  // --------

  index.load = function() {
    this.import(this.__changes__);

    _.each(this.__refs__.keys(), function(ref) {
      this.setRef(ref, this.__refs__.get(ref));
    }, this);
  };

  // load automatically?
  index.load();
};

// Export
// ========

IndexImpl.create = function(options) {
  options = options || {};
  var index = new IndexImpl();

  if (options.store) {
    makePersistent(index, options.store);
  }

  return index;
};

module.exports = IndexImpl;

},{"./chronicle":26,"substance-util":268,"underscore":273}],30:[function(require,module,exports){
"use strict";

var util = require('substance-util');
var Chronicle = require('./chronicle');
var TextOperation = require('substance-operator').TextOperation;

var TextOperationAdapter = function(chronicle, doc) {
  Chronicle.Versioned.call(this, chronicle);
  this.doc = doc;
};

TextOperationAdapter.Prototype = function() {

  var __super__ = util.prototype(this);

  this.apply = function(change) {
    this.doc.setText(change.apply(this.doc.getText()));
  };

  this.invert = function(change) {
    return change.invert();
  };

  this.transform = function(a, b, options) {
    return TextOperation.transform(a, b, options);
  };

  this.reset = function() {
    __super__.reset.call(this);
    this.doc.setText("");
  };

};

TextOperationAdapter.Prototype.prototype = Chronicle.Versioned.prototype;
TextOperationAdapter.prototype = new TextOperationAdapter.Prototype();

module.exports = TextOperationAdapter;

},{"./chronicle":26,"substance-operator":250,"substance-util":268}],31:[function(require,module,exports){
var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;
var IndexImpl = require("./index_impl");


var TmpIndex = function(index) {
  IndexImpl.call(this);
  this.index = index;
};

TmpIndex.Prototype = function() {

  var __super__ = util.prototype(this);

  this.get = function(id) {
    if (__super__.contains.call(this, id)) {
      return __super__.get.call(this, id);
    }
    return this.index.get(id);
  };

  this.contains = function(id) {
    return __super__.contains.call(this, id) || this.index.contains(id);
  };

  this.getChildren = function(id) {
    var result = __super__.getChildren.call(this, id) || [];
    if (this.index.contains(id)) {
      result = result.concat(this.index.getChildren(id));
    }
    return result;
  };

  this.list = function() {
    return __super__.list.call(this).concat(this.index.list());
  };

  this.save = function(id, recurse) {
    if (recurse) {
      var queue = [id];
      var nextId, next;
      while(queue.length > 0) {
        nextId = queue.pop();
        next = this.changes[nextId];

        if (this.changes[nextId]) this.index.add(next);

        for (var idx=0; idx < next.children; idx++) {
          queue.unshift(next.children[idx]);
        }
      }
    } else {
      if (this.changes[id]) this.index.add(this.changes[id]);
    }
  };

  this.reconnect = function(id, newParentId) {
    if (!this.changes[id])
      throw new errors.ChronicleError("Change does not exist to this index.");

    var change = this.get(id);

    if (!this.contains(newParentId)) {
      throw new errors.ChronicleError("Illegal change: parent is unknown parent=" + newParentId);
    }

    if (!this.children[change.parent]) this.children[change.parent] = [];
    this.children[change.parent] = _.without(this.children[change.parent], change.id);

    change.parent = newParentId;

    if (!this.children[change.parent]) this.children[change.parent] = [];
    this.children[change.parent].push(id);
  };
};
TmpIndex.Prototype.prototype = IndexImpl.prototype;
TmpIndex.prototype = new TmpIndex.Prototype();

module.exports = TmpIndex;

},{"./index_impl":29,"substance-util":268,"underscore":273}],32:[function(require,module,exports){
"use strict";

module.exports = {
  Keyboard: require("./src/keyboard"),
  ChromeKeyboard: require("./src/chrome_keyboard")
};

},{"./src/chrome_keyboard":33,"./src/keyboard":35}],33:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");

function _attachListener(el, type, callback) {
  if (el.addEventListener) {
    el.addEventListener(type, callback, true);
  } else {
    el.attachEvent('on' + type, callback);
  }
}

function _detachListener(el, type, callback) {
  if (el.removeEventListener) {
    el.removeEventListener(type, callback, true);
  } else {
    el.detachEvent('on' + type, callback);
  }
}

var ChromeKeyboard = function(map, keytable) {

  this.keytable = keytable;
  this.map = map;

  this.registry = {};

  if (!keytable) {
    var DefaultKeyTable =  require("./default_keytable.js");
    this.keytable = new DefaultKeyTable();
  }

  // to detect if there is a candidate for a given key
  this.__registeredKeyCodes = {"keypress": {}, "keyup": {}, "keydown": {}};

  this.defaultHandlers = {
    "keypress": this.PASS,
    "keyup": this.BLOCK,
    "keydown": this.PASS
  };
};

ChromeKeyboard.Prototype = function() {

  // handler to pass events (does not call prevent default)
  this.PASS = function() {
    // console.log('Keyboard: passing event to parent.');
  };

  this.BLOCK = function(e) {
    //console.log('Keyboard: blocking event.', e);
    e.preventDefault();
    e.stopPropagation();
  };

  var _mods = ['ctrlKey', 'metaKey', 'shiftKey', 'altKey', 'altGraphKey'];

  // for sorting modifiers
  var _modPos = {};
  for (var i = 0; i < _mods.length; i++) {
    _modPos[_mods[i]] = i;
  }

  var _modName = {
    'ctrl': 'ctrlKey',
    'command': 'metaKey',
    'shift': 'shiftKey',
    'alt': 'altKey',
    'alt-gr': 'altGraphKey'
  };

  var _inverseModNames = {};
  _.each(_modName, function(mod, name) {
    _inverseModNames[mod] = name;
  });

  //console.log("_inverseModNames", _inverseModNames);

  this.defaultHandler = function(e) {
    // console.log("Default handler: preventing event", e);
    e.preventDefault();
  };

  var _lookupHandler = function(self, e, start) {
    if (!start) return null;

    var reg = start;
    // traverse to the particular registry for the present modifiers
    for (var i = 0; i < _mods.length; i++) {
      var mod = _mods[i];
      if (e[mod]) {
        reg = reg[mod];
      }
      if (!reg) return null;
    }

    if (reg) {
      var keyCode = e.keyCode;
      if (e.type === "keypress") {
         keyCode = e.keyCode || self.keytable.table[String.fromCharCode(e.which)];
      }
      return reg[keyCode];
    } else {
      return null;
    }
  };

  this.handleKeyPress = function(e) {
    var type = "keypress";
    //console.log("Keyboard keypress", e, this.describeEvent(e));
    // do not handle events without a character...
    if (String.fromCharCode(e.which)) {
      var handler = _lookupHandler(this, e, this.registry[type]);
      if (handler) {
        try {
          handler(e);
        } catch (err) {
          this.BLOCK(e);
          console.error(err.message);
          util.printStackTrace(err);
          throw err;
        }
      } else if (this.defaultHandlers[type]) {
        this.defaultHandlers[type](e);
      }
    } else if (this.defaultHandlers[type]) {
      this.defaultHandlers[type](e);
    } else {
      throw new Error("No default handler for: " + type);
    }

  };

  this.handleKey = function(type, e) {
    // console.log("Keyboard handleKey", type, this.describeEvent(e));
    if (this.__registeredKeyCodes[type][e.keyCode]) {
      //console.log("Keyboard.handleKey", type, this.describeEvent(e));

      var handler = _lookupHandler(this, e, this.registry[type]);

      if (handler) {
        //console.log("... found handler", handler);
        try {
          handler(e);
        } catch (err) {
          this.BLOCK(e);
          console.error(err.message);
          util.printStackTrace(err);
          throw err;
        }
      }
    } else if (this.defaultHandlers[type]) {
      this.defaultHandlers[type](e);
    } else {
      throw new Error("No default handler for: " + type);
    }
  };

  this.connect = function(el) {
    this.el = el;
    this.__onKeyPress = this.handleKeyPress.bind(this);
    this.__onKeyUp = this.handleKey.bind(this, "keyup");
    this.__onKeyDown = this.handleKey.bind(this, "keydown");
    _attachListener(el, 'keypress', this.__onKeyPress);
    _attachListener(el, 'keydown', this.__onKeyDown);
    _attachListener(el, 'keyup', this.__onKeyUp);

    // console.log("Attaching keyboard to", el, "bindings:", this.registry);
  };

  this.disconnect = function() {
    _detachListener(this.el, 'keypress', this.__onKeyPress);
    _detachListener(this.el, 'keydown', this.__onKeyDown);
    _detachListener(this.el, 'keyup', this.__onKeyUp);
  };

  this.setDefaultHandler = function(type, handler) {
    if (arguments.length === 1) {
      _.each(this.defaultHandlers, function(__, name) {
        this.defaultHandlers[name] = arguments[0];
      }, this);
    } else {
      this.defaultHandlers[type] = handler;
    }
  };

  // Bind a handler for a key combination.
  // -----
  // Only key combinations with modifiers and a regular key.
  // Examples:
  // bind('ctrl', 'shift', 'r', myhandler);
  // TODO: I want to get rid of the type. Instead introduce an abstraction
  // that triggers key repetition using only one handler
  this.bindSingle = function(combination, type, handler) {

    if (["keypress", "keydown", "keyup"].indexOf(type) < 0) {
      throw new Error("Expecting keyboard event type as second argument.");
    }
    if (!_.isFunction(handler)) {
      throw new Error("Expecting function handler as third argument.");
    }

    // Note: extract modifiers from the combination.
    // They can be provided in arbitrary order.
    var i;
    var mods = [];
    var mod, modName;
    for (i = 0; i < combination.length-1; i++) {
      modName = combination[i];
      mod = _modName[modName];
      if (!mod) {
        throw new Error("Unknown modifier: " + modName);
      }
      mods.push(mod);
    }
    var key = _.last(combination);
    var keyCode = this.keytable.getKeyCode(key);

    // if the name implies extra modifiers the map can return an array
    if (_.isArray(keyCode)) {
      for (i = 0; i < keyCode.length-1; i++) {
        modName = keyCode[i];
        mod = _modName[modName];
        if (!mod) {
          throw new Error("Unknown modifier: " + modName);
        }
        mods.push(mod);
      }
      keyCode = _.last(keyCode);
    }

    mods.sort(function(a, b) {
      return _modPos[a] - _modPos[b];
    });

    this.registry[type] = this.registry[type] || {};
    var reg = this.registry[type];
    for (i = 0; i < mods.length; i++) {
      mod = mods[i];
      reg[mod] = reg[mod] || {};
      reg = reg[mod];
    }

    reg[keyCode] = handler;

    this.__registeredKeyCodes[type][keyCode] = true;
  };

  this.bindAll = function(combinations, type, handler) {
    for (var i = 0; i < combinations.length; i++) {
      this.bindSingle(combinations[i], type, handler);
    }
  };

  this.bind = function(combination, type, handler) {
    var combinations;
    if (_.isString(combination)) {
      combinations = this.compileMapping(combination);
      this.bindAll(combinations, type, handler);
    } else {
      this.bindSingle(combination, type, handler);
    }
  };

  this.pass = function(combination) {
    var combinations;
    if (_.isString(combination)) {
      combinations = this.compileMapping(combination);
    } else {
      combinations = [combination];
    }
    this.bindAll(combinations, "keyup", this.PASS);
    this.bindAll(combinations, "keydown", this.PASS);
    this.bindAll(combinations, "keypress", this.PASS);
  };

  this.compileMapping = function(name) {
    var combinations = [];
    var specs = this.map[name];
    if (!specs) {
      console.error("No keyboard mappings available for", name);
      return combinations;
    }
    for (var i = 0; i < specs.length; i++) {
      var spec = specs[i];
      var combination = spec.split("+");
      combinations.push(combination);
    }
    return combinations;
  };

  this.describeEvent = function(e) {
    var names = [];
    for (var i = 0; i < _mods.length; i++) {
      var mod = _mods[i];
      if (e[mod] === true) {
        names.push(_inverseModNames[mod]);
      }
    }
    names.push(this.keytable.getKeyName(e.keyCode));

    return names.join("+");
  };
};
ChromeKeyboard.prototype = new ChromeKeyboard.Prototype();

module.exports = ChromeKeyboard;

},{"./default_keytable.js":34,"substance-util":268,"underscore":273}],34:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var DefaultKeyTable = function() {
};

// TODO: we will just implement different versions of this for different browsers and platforms.
DefaultKeyTable.Prototype = function() {

  var initTable = function() {
    var i;
    this.table = {};

    // alphabet
    for (i = 0; i < 26; i++) {
      var code = i + 65;
      var u = String.fromCharCode(code).toUpperCase();
      var l = String.fromCharCode(code).toLowerCase();
      this.table[u] = code;
      this.table[l] = code;
    }

    // Numbers
    for (i = 0; i < 10; i++) {
      this.table[""+i] = 48 + i;
    }

    // F-keys
    for (i = 1; i < 13; i++) {
      this.table["f"+i] = 111 + i;
    }

    // special characters
    _.extend(this.table, {
      "*": 106,
      "+": 107,
      "-": 109,
      ".": 110,
      "/": 111,
      ";": 186,
      "=": 187,
      ",": 188,
      "`": 192,
      "[": 219,
      "\\": 220,
      "]": 221,
      "\"": 222,
      "special": 229
    });

    // custom aliases
    _.extend(this.table, {
      "backspace": 8,
      "tab": 9,
      "enter": 13,
      "shift": 16,
      "ctrl": 17,
      "alt": 18,
      "capslock": 20,
      "esc": 27,
      "space": 32,
      "pageup": 33,
      "pagedown": 34,
      "end": 35,
      "home": 36,
      "left": 37,
      "up": 38,
      "right": 39,
      "down": 40,
      "ins": 45,
      "del": 46,
    });

    this.inverseTable = {};
    _.each(this.table, function(code, alias) {
      this.inverseTable[code] = alias;
    }, this);

    // console.log("INVERSE TABLE", this.inverseTable);
  }.call(this);

  this.getKeyCode = function(s) {
    if (this.table[s] !== undefined) {
      return this.table[s];
    } else {
      throw new Error("Unknown key: " + s);
    }
  };

  this.getKeyName = function(code) {
    if (this.inverseTable[code] !== undefined) {
      return this.inverseTable[code];
    } else {
      return "native("+code+")";
    }
  };
};
DefaultKeyTable.prototype = new DefaultKeyTable.Prototype();

module.exports = DefaultKeyTable;

},{"underscore":273}],35:[function(require,module,exports){
"use strict";

/**
 * Note: This implementation has been derived from
 * Craig Campbell's Mousetrap: https://github.com/ccampbell/mousetrap
 * which is licensed under the Apache License.
 */


/**
 * mapping of special keycodes to their corresponding keys
 *
 * everything in this dictionary cannot use keypress events
 * so it has to be here to map to the correct keycodes for
 * keyup/keydown events
 *
 * @type {Object}
 */
var _MAP = {
    8: 'backspace',
    9: 'tab',
    13: 'enter',
    16: 'shift',
    17: 'ctrl',
    18: 'alt',
    20: 'capslock',
    27: 'esc',
    32: 'space',
    33: 'pageup',
    34: 'pagedown',
    35: 'end',
    36: 'home',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    45: 'ins',
    46: 'del',
    91: 'meta',
    93: 'meta',
    224: 'meta'
};

/**
 * mapping for special characters so they can support
 *
 * this dictionary is only used incase you want to bind a
 * keyup or keydown event to one of these keys
 *
 * @type {Object}
 */
var _KEYCODE_MAP = {
    106: '*',
    107: '+',
    109: '-',
    110: '.',
    111 : '/',
    186: ';',
    187: '=',
    188: ',',
    189: '-',
    190: '.',
    191: '/',
    192: '`',
    219: '[',
    220: '\\',
    221: ']',
    222: '\''
};

/**
 * this is a mapping of keys that require shift on a US keypad
 * back to the non shift equivelents
 *
 * this is so you can use keyup events with these keys
 *
 * note that this will only work reliably on US keyboards
 *
 * @type {Object}
 */
var _SHIFT_MAP = {
    '~': '`',
    '!': '1',
    '@': '2',
    '#': '3',
    '$': '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
    '_': '-',
    '+': '=',
    ':': ';',
    '\"': '\'',
    '<': ',',
    '>': '.',
    '?': '/',
    '|': '\\'
};

/**
 * this is a list of special strings you can use to map
 * to modifier keys when you specify your keyboard shortcuts
 *
 * @type {Object}
 */
var _SPECIAL_ALIASES = {
    'option': 'alt',
    'command': 'meta',
    'return': 'enter',
    'escape': 'esc',
    'mod': /Mac|iPod|iPhone|iPad/.test(window.navigator.platform) ? 'meta' : 'ctrl'
};

/**
 * loop through the f keys, f1 to f19 and add them to the map
 * programatically
 */
for (var i = 1; i < 20; ++i) {
    _MAP[111 + i] = 'f' + i;
}

/**
 * loop through to map numbers on the numeric keypad
 */
for (i = 0; i <= 9; ++i) {
    _MAP[i + 96] = i;
}

/**
 * cross browser add event method
 *
 * @param {Element|HTMLDocument} object
 * @param {string} type
 * @param {Function} callback
 * @returns void
 */
function _attachListener(object, type, callback) {
  if (object.addEventListener) {
    object.addEventListener(type, callback, false);
  } else {
    object.attachEvent('on' + type, callback);
  }
}

function _detachListener(object, type, callback) {
  if (object.removeEventListener) {
    object.removeEventListener(type, callback, false);
  } else {
    object.detachEvent('on' + type, callback);
  }
}

/**
 * takes the event and returns the key character
 *
 * @param {Event} e
 * @return {string}
 */
function _characterFromEvent(e) {

  // for keypress events we should return the character as is
  if (e.type == 'keypress') {
    var character = String.fromCharCode(e.which);

    // if the shift key is not pressed then it is safe to assume
    // that we want the character to be lowercase.  this means if
    // you accidentally have caps lock on then your key bindings
    // will continue to work
    //
    // the only side effect that might not be desired is if you
    // bind something like 'A' cause you want to trigger an
    // event when capital A is pressed caps lock will no longer
    // trigger the event.  shift+a will though.
    if (!e.shiftKey) {
        character = character.toLowerCase();
    }

    return character;
  }

  // for non keypress events the special maps are needed
  if (_MAP[e.which]) {
    return _MAP[e.which];
  }

  if (_KEYCODE_MAP[e.which]) {
    return _KEYCODE_MAP[e.which];
  }

  // if it is not in the special map

  // with keydown and keyup events the character seems to always
  // come in as an uppercase character whether you are pressing shift
  // or not.  we should make sure it is always lowercase for comparisons
  return String.fromCharCode(e.which).toLowerCase();
}

/**
 * checks if two arrays are equal
 *
 * @param {Array} modifiers1
 * @param {Array} modifiers2
 * @returns {boolean}
 */
function _modifiersMatch(modifiers1, modifiers2) {
  return modifiers1.sort().join(',') === modifiers2.sort().join(',');
}

/**
 * takes a key event and figures out what the modifiers are
 *
 * @param {Event} e
 * @returns {Array}
 */
function _eventModifiers(e) {
  var modifiers = [];

  if (e.shiftKey) {
      modifiers.push('shift');
  }

  if (e.altKey) {
      modifiers.push('alt');
  }

  if (e.ctrlKey) {
      modifiers.push('ctrl');
  }

  if (e.metaKey) {
      modifiers.push('meta');
  }

  return modifiers;
}

/**
 * determines if the keycode specified is a modifier key or not
 *
 * @param {string} key
 * @returns {boolean}
 */
function _isModifier(key) {
  return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
}

/**
 * Converts from a string key combination to an array
 *
 * @param  {string} combination like "command+shift+l"
 * @return {Array}
 */
function _keysFromString(combination) {
  if (combination === '+') {
      return ['+'];
  }

  return combination.split('+');
}

var Keyboard = function(keymap) {
  /**
   * variable to store the flipped version of _MAP from above
   * needed to check if we should use keypress or not when no action
   * is specified
   *
   * @type {Object|undefined}
   */
  this._REVERSE_MAP = {};

  /**
   * a list of all the callbacks setup via Keyboard.bind()
   *
   * @type {Object}
   */
  this._callbacks = {};

  /**
   * direct map of string combinations to callbacks used for trigger()
   *
   * @type {Object}
   */
  this._directMap = {};

  /**
   * keeps track of what level each sequence is at since multiple
   * sequences can start out with the same sequence
   *
   * @type {Object}
   */
  this._sequenceLevels = {};

  /**
   * variable to store the setTimeout call
   *
   * @type {null|number}
   */
  this._resetTimer = null;

  /**
   * temporary state where we will ignore the next keyup
   *
   * @type {boolean|string}
   */
  this._ignoreNextKeyup = false;

  /**
   * temporary state where we will ignore the next keypress
   *
   * @type {boolean}
   */
  this._ignoreNextKeypress = false;

  /**
   * are we currently inside of a sequence?
   * type of action ("keyup" or "keydown" or "keypress") or false
   *
   * @type {boolean|string}
   */
  this._nextExpectedAction = false;

  this._handler = this._handleKeyEvent.bind(this);

  this.keymap = keymap;
};

Keyboard.Prototype = function() {

  /**
   * resets all sequence counters except for the ones passed in
   *
   * @param {Object} doNotReset
   * @returns void
   */
  function _resetSequences(doNotReset) {
      doNotReset = doNotReset || {};

      var activeSequences = false,
          key;

      for (key in this._sequenceLevels) {
          if (doNotReset[key]) {
              activeSequences = true;
              continue;
          }
          this._sequenceLevels[key] = 0;
      }

      if (!activeSequences) {
          this._nextExpectedAction = false;
      }
  }

  /**
   * finds all callbacks that match based on the keycode, modifiers,
   * and action
   *
   * @param {string} character
   * @param {Array} modifiers
   * @param {Event|Object} e
   * @param {string=} sequenceName - name of the sequence we are looking for
   * @param {string=} combination
   * @param {number=} level
   * @returns {Array}
   */
  function _getMatches(character, modifiers, e, sequenceName, combination, level) {
      var i,
          callback,
          matches = [],
          action = e.type;

      // if there are no events related to this keycode
      if (!this._callbacks[character]) {
          return [];
      }

      // if a modifier key is coming up on its own we should allow it
      if (action == 'keyup' && _isModifier(character)) {
          modifiers = [character];
      }

      // loop through all callbacks for the key that was pressed
      // and see if any of them match
      for (i = 0; i < this._callbacks[character].length; ++i) {
          callback = this._callbacks[character][i];

          // if a sequence name is not specified, but this is a sequence at
          // the wrong level then move onto the next match
          if (!sequenceName && callback.seq && this._sequenceLevels[callback.seq] != callback.level) {
              continue;
          }

          // if the action we are looking for doesn't match the action we got
          // then we should keep going
          if (action != callback.action) {
              continue;
          }

          // if this is a keypress event and the meta key and control key
          // are not pressed that means that we need to only look at the
          // character, otherwise check the modifiers as well
          //
          // chrome will not fire a keypress if meta or control is down
          // safari will fire a keypress if meta or meta+shift is down
          // firefox will fire a keypress if meta or control is down
          if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

              // when you bind a combination or sequence a second time it
              // should overwrite the first one.  if a sequenceName or
              // combination is specified in this call it does just that
              //
              // @todo make deleting its own method?
              var deleteCombo = !sequenceName && callback.combo == combination;
              var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
              if (deleteCombo || deleteSequence) {
                  this._callbacks[character].splice(i, 1);
              }

              matches.push(callback);
          }
      }

      return matches;
  }

  /**
   * actually calls the callback function
   *
   * if your callback function returns false this will use the jquery
   * convention - prevent default and stop propogation on the event
   *
   * @param {Function} callback
   * @param {Event} e
   * @returns void
   */
  function _fireCallback(callback, e, combo) {

    // if this event should not happen stop here
    if (this.NOT_IN_EDITABLES && this.stopCallback(e, e.target || e.srcElement, combo)) {
         return;
    }

    if (callback.call(callback.self, e, combo) === false) {
      if (e.preventDefault) {
        e.preventDefault();
      }

      if (e.stopPropagation) {
        e.stopPropagation();
      }

      e.returnValue = false;
      e.cancelBubble = true;
    }
  }

  /**
   * handles a character key event
   *
   * @param {string} character
   * @param {Array} modifiers
   * @param {Event} e
   * @returns void
   */
  this.handleKey = function (character, modifiers, e) {
    var callbacks = _getMatches.call(this, character, modifiers, e),
        i,
        doNotReset = {},
        maxLevel = 0,
        processedSequenceCallback = false;

    // Calculate the maxLevel for sequences so we can only execute the longest callback sequence
    for (i = 0; i < callbacks.length; ++i) {
      if (callbacks[i].seq) {
          maxLevel = Math.max(maxLevel, callbacks[i].level);
      }
    }

    // loop through matching callbacks for this key event
    for (i = 0; i < callbacks.length; ++i) {

      // fire for all sequence callbacks
      // this is because if for example you have multiple sequences
      // bound such as "g i" and "g t" they both need to fire the
      // callback for matching g cause otherwise you can only ever
      // match the first one
      if (callbacks[i].seq) {

        // only fire callbacks for the maxLevel to prevent
        // subsequences from also firing
        //
        // for example 'a option b' should not cause 'option b' to fire
        // even though 'option b' is part of the other sequence
        //
        // any sequences that do not match here will be discarded
        // below by the _resetSequences call
        if (callbacks[i].level != maxLevel) {
            continue;
        }

        processedSequenceCallback = true;

        // keep a list of which sequences were matches for later
        doNotReset[callbacks[i].seq] = 1;
        _fireCallback.call(this, callbacks[i].callback, e, callbacks[i].combo);
        continue;

      } else if (Keyboard.TRIGGER_PREFIX_COMBOS) {
        // HACK: Mousetrap does not trigger 'prefixes'
        _fireCallback.call(this, callbacks[i].callback, e, callbacks[i].combo);
      } else {
        // if there were no sequence matches but we are still here
        // that means this is a regular match so we should fire that
        if (!processedSequenceCallback) {
            _fireCallback.call(this, callbacks[i].callback, e, callbacks[i].combo);
        }
      }
    }

    // if the key you pressed matches the type of sequence without
    // being a modifier (ie "keyup" or "keypress") then we should
    // reset all sequences that were not matched by this event
    //
    // this is so, for example, if you have the sequence "h a t" and you
    // type "h e a r t" it does not match.  in this case the "e" will
    // cause the sequence to reset
    //
    // modifier keys are ignored because you can have a sequence
    // that contains modifiers such as "enter ctrl+space" and in most
    // cases the modifier key will be pressed before the next key
    //
    // also if you have a sequence such as "ctrl+b a" then pressing the
    // "b" key will trigger a "keypress" and a "keydown"
    //
    // the "keydown" is expected when there is a modifier, but the
    // "keypress" ends up matching the _nextExpectedAction since it occurs
    // after and that causes the sequence to reset
    //
    // we ignore keypresses in a sequence that directly follow a keydown
    // for the same character
    var ignoreThisKeypress = e.type == 'keypress' && this._ignoreNextKeypress;
    if (e.type == this._nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
        _resetSequences.call(this, doNotReset);
    }

    this._ignoreNextKeypress = processedSequenceCallback && e.type == 'keydown';

    // provide information about if there have callbacks detected
    // E.g., this is used to trigger a default key handler in case of no others did match
    return callbacks.length > 0;
  };

  /**
   * handles a keydown event
   *
   * @param {Event} e
   * @returns void
   */
  this._handleKeyEvent = function(e) {

    // normalize e.which for key events
    // @see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
    if (typeof e.which !== 'number') {
        e.which = e.keyCode;
    }

    var character = _characterFromEvent(e);

    // no character found then stop
    if (!character) {
      return;
    }

    // need to use === for the character check because the character can be 0
    if (e.type == 'keyup' && this._ignoreNextKeyup === character) {
      this._ignoreNextKeyup = false;
      return;
    }

    this.handleKey(character, _eventModifiers(e), e);
  };

  /**
   * Gets info for a specific key combination
   *
   * @param  {string} combination key combination ("command+s" or "a" or "*")
   * @param  {string=} action
   * @returns {Object}
   */
  function _getKeyInfo(combination, action) {
    var keys,
        key,
        i,
        modifiers = [];

    // take the keys from this pattern and figure out what the actual
    // pattern is all about
    keys = _keysFromString(combination);

    for (i = 0; i < keys.length; ++i) {
      key = keys[i];

      // normalize key names
      if (_SPECIAL_ALIASES[key]) {
          key = _SPECIAL_ALIASES[key];
      }

      // if this is not a keypress event then we should
      // be smart about using shift keys
      // this will only work for US keyboards however
      if (action && action != 'keypress' && _SHIFT_MAP[key]) {
          key = _SHIFT_MAP[key];
          modifiers.push('shift');
      }

      // if this key is a modifier then add it to the list of modifiers
      if (_isModifier(key)) {
          modifiers.push(key);
      }
    }

    // depending on what the key combination is
    // we will try to pick the best event for it
    action = _pickBestAction.call(this, key, modifiers, action);

    return {
      key: key,
      modifiers: modifiers,
      action: action
    };
  }

  /**
   * binds a single keyboard combination
   *
   * @param {string} combination
   * @param {Function} callback
   * @param {string=} action
   * @param {string=} sequenceName - name of sequence if part of sequence
   * @param {number=} level - what part of the sequence the command is
   * @returns void
   */
  function _bindSingle(combination, callback, action, sequenceName, level) {

    // store a direct mapped reference for use with Keyboard.trigger
    this._directMap[combination + ':' + action] = callback;

    // make sure multiple spaces in a row become a single space
    combination = combination.replace(/\s+/g, ' ');

    var sequence = combination.split(' '),
        info;

    // if this pattern is a sequence of keys then run through this method
    // to reprocess each pattern one key at a time
    if (sequence.length > 1) {
      _bindSequence.call(this, combination, sequence, callback, action);
      return;
    }

    info = _getKeyInfo.call(this, combination, action);

    // make sure to initialize array if this is the first time
    // a callback is added for this key
    this._callbacks[info.key] = this._callbacks[info.key] || [];

    // remove an existing match if there is one
    _getMatches.call(this, info.key, info.modifiers, {type: info.action}, sequenceName, combination, level);

    // add this call back to the array
    // if it is a sequence put it at the beginning
    // if not put it at the end
    //
    // this is important because the way these are processed expects
    // the sequence ones to come first
    this._callbacks[info.key][sequenceName ? 'unshift' : 'push']({
      callback: callback,
      modifiers: info.modifiers,
      action: info.action,
      seq: sequenceName,
      level: level,
      combo: combination
    });
  }

  /**
   * binds multiple combinations to the same callback
   *
   * @param {Array} combinations
   * @param {Function} callback
   * @param {string|undefined} action
   * @returns void
   */
  function _bindMultiple(combinations, callback, action) {
    for (var i = 0; i < combinations.length; ++i) {
      _bindSingle.call(this, combinations[i], callback, action);
    }
  }


  /**
   * called to set a 1 second timeout on the specified sequence
   *
   * this is so after each key press in the sequence you have 1 second
   * to press the next key before you have to start over
   *
   * @returns void
   */
  function _resetSequenceTimer() {
    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(_resetSequences.bind(this), 1000);
  }

  /**
   * reverses the map lookup so that we can look for specific keys
   * to see what can and can't use keypress
   *
   * @return {Object}
   */
  function _getReverseMap() {
    if (!this._REVERSE_MAP) {
      this._REVERSE_MAP = {};
      for (var key in _MAP) {

        // pull out the numeric keypad from here cause keypress should
        // be able to detect the keys from the character
        if (key > 95 && key < 112) {
          continue;
        }

        if (_MAP.hasOwnProperty(key)) {
          this._REVERSE_MAP[_MAP[key]] = key;
        }
      }
    }
    return this._REVERSE_MAP;
  }

  /**
   * picks the best action based on the key combination
   *
   * @param {string} key - character for key
   * @param {Array} modifiers
   * @param {string=} action passed in
   */
  function _pickBestAction(key, modifiers, action) {

    // if no action was picked in we should try to pick the one
    // that we think would work best for this key
    if (!action) {
      action = _getReverseMap.call(this)[key] ? 'keydown' : 'keypress';
    }

    // modifier keys don't work as expected with keypress,
    // switch to keydown
    if (action == 'keypress' && modifiers.length) {
      action = 'keydown';
    }

    return action;
  }

  /**
   * binds a key sequence to an event
   *
   * @param {string} combo - combo specified in bind call
   * @param {Array} keys
   * @param {Function} callback
   * @param {string=} action
   * @returns void
   */
  function _bindSequence(combo, keys, callback, action) {

    var that = this;

    // start off by adding a sequence level record for this combination
    // and setting the level to 0
    this._sequenceLevels[combo] = 0;

    /**
     * callback to increase the sequence level for this sequence and reset
     * all other sequences that were active
     *
     * @param {string} nextAction
     * @returns {Function}
     */
    function _increaseSequence(nextAction) {
      return function() {
        that._nextExpectedAction = nextAction;
        ++that._sequenceLevels[combo];
        _resetSequenceTimer.call(that);
      };
    }

    /**
     * wraps the specified callback inside of another function in order
     * to reset all sequence counters as soon as this sequence is done
     *
     * @param {Event} e
     * @returns void
     */
    function _callbackAndReset(e) {
      _fireCallback.call(this, callback, e, combo);

      // we should ignore the next key up if the action is key down
      // or keypress.  this is so if you finish a sequence and
      // release the key the final key will not trigger a keyup
      if (action !== 'keyup') {
        this._ignoreNextKeyup = _characterFromEvent(e);
      }

      // weird race condition if a sequence ends with the key
      // another sequence begins with
      setTimeout(_resetSequences.bind(this), 10);
    }

    // loop through keys one at a time and bind the appropriate callback
    // function.  for any key leading up to the final one it should
    // increase the sequence. after the final, it should reset all sequences
    //
    // if an action is specified in the original bind call then that will
    // be used throughout.  otherwise we will pass the action that the
    // next key in the sequence should match.  this allows a sequence
    // to mix and match keypress and keydown events depending on which
    // ones are better suited to the key provided
    for (var i = 0; i < keys.length; ++i) {
        var isFinal = i + 1 === keys.length;
        var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence.call(this, action || _getKeyInfo(keys[i + 1]).action);
        _bindSingle.call(this, keys[i], wrappedCallback, action, combo, i);
    }
  }

  /**
   * binds an event to mousetrap
   *
   * can be a single key, a combination of keys separated with +,
   * an array of keys, or a sequence of keys separated by spaces
   *
   * be sure to list the modifier keys first to make sure that the
   * correct key ends up getting bound (the last key in the pattern)
   *
   * @param {string|Array} keys
   * @param {Function} callback
   * @param {string=} action - 'keypress', 'keydown', or 'keyup'
   * @returns void
   */
  this.bind = function(keys, callback, action, self) {
    callback.self = self;
    keys = (keys instanceof Array) ? keys : [keys];
    _bindMultiple.call(this, keys, callback, action);
    return this;
  };

  this.bindMapped = function(alias, callback, action, self) {
    return this.bind(this.keymap[alias], callback, action, self);
  };

  /**
   * triggers an event that has already been bound
   *
   * @param {string} keys
   * @param {string=} action
   * @returns void
   */
  this.trigger = function(keys, action) {
    if (this._directMap[keys + ':' + action]) {
      this._directMap[keys + ':' + action].call(this, {}, keys);
    }
    return this;
  };

  /**
   * resets the library back to its initial state.  this is useful
   * if you want to clear out the current keyboard shortcuts and bind
   * new ones - for example if you switch to another page
   *
   * @returns void
   */
  this.reset = function() {
    this._callbacks = {};
    this._directMap = {};
    return this;
  };

  /**
  * should we stop this event before firing off callbacks
  *
  * @param {Event} e
  * @param {Element} element
  * @return {boolean}
  */
  this.stopCallback = function(e, element) {
    // if the element has the class "mousetrap" then no need to stop
    if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
      return false;
    }

    // stop for input, select, and textarea
    return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || (element.contentEditable && element.contentEditable == 'true');
  };

  this.connect = function(el) {
    _attachListener(el, 'keypress', this._handler);
    _attachListener(el, 'keydown', this._handler);
    _attachListener(el, 'keyup', this._handler);
  };

  this.disconnect = function(el) {
    _detachListener(el, 'keypress', this._handler);
    _detachListener(el, 'keydown', this._handler);
    _detachListener(el, 'keyup', this._handler);
  };

  /**
   * Trigger callbacks for combos even when they are part of sequnence.
   */
  this.TRIGGER_PREFIX_COMBOS = false;
  this.NOT_IN_EDITABLES = false;
};

Keyboard.prototype = new Keyboard.Prototype();

module.exports = Keyboard;

},{}],36:[function(require,module,exports){
// mix-in extensions for the browser environment
var Composer = require('../src/composer');

Composer.WebShell = require('../src/shells/web_shell');

module.exports = Composer;

},{"../src/composer":44,"../src/shells/web_shell":115}],37:[function(require,module,exports){
"use strict";

module.exports = require('./src/composer');

},{"./src/composer":44}],38:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var $ = window.$;
var View = require("substance-application").View;
var $$ = require("substance-application").$$;
var util = require('substance-util');

var AnnotationBar = function(surface, writerCtrl) {
  View.call(this);
  this.surface = surface;
  this.writerCtrl = writerCtrl;
  this.document = writerCtrl.document;

  this.el.classList.add("annotation-bar");
  this.containerName = surface.getContainer().name;

  this.fragmentElements = {};
  this.el.setAttribute("contenteditable", "false");

  this.$el.click('.highlight', this.onClickHighlight.bind(this));

  this.listenTo(this.document, "operation:applied", this.onGraphUpdate);


  this.leftRangeHandle = $$('span.range-handle.left', {
    children: [
      $$('span.range-handle-container', {
        children: [$$('i.icon-caret-up')]
      })
    ],
    contentEditable: false,
  });
  this.rightRangeHandle = $$('span.range-handle.right', {
    children: [
      $$('span.range-handle-container', {
        children: [$$('i.icon-caret-up')]
      })
    ],
    contentEditable: false,
  });
};

AnnotationBar.Prototype = function() {

  _.extend(this, util.Events);

  // Update highlight state
  this.update = function() {
    // TODO: needs to be optimized
    var state = this.writerCtrl.state;

    $(this.leftRangeHandle).remove();
    $(this.rightRangeHandle).remove();

    // Why should this happen ever?
    // TODO: Check why we call update before state is initialized
    if (!state) {
      return;
    }

    // Clear highlight state
    $('.annotation_fragment.subject_reference').removeClass('highlighted');
    $('.annotation-bar .highlight').removeClass('active');

    if (state.subjectReferenceId) {
      var fragmentElements = this.getFragmentElements(state.subjectReferenceId);
      var $highlightEl = this.$('.highlight[data-annotation-id='+state.subjectReferenceId+']');
      $highlightEl.addClass('active');
      $(fragmentElements).addClass('highlighted');

      if (fragmentElements && fragmentElements.length > 0) {
        fragmentElements[0].insertBefore(this.leftRangeHandle, fragmentElements[0].firstChild);
        _.last(fragmentElements).appendChild(this.rightRangeHandle);
      }
    }
  };

  this.render = function() {
    $(this.el).empty();

    var annotations = this.document.getIndex("multi_annotations").get(this.containerName);
    var ids = Object.keys(annotations);

    var surfaceTop = this.surface.el.getBoundingClientRect().top;
    var surfaceScrollTop = this.surface.el.scrollTop;

    for (var i = 0; i < ids.length; i++) {
      var annotationId = ids[i];
      var fragmentElements = this.getFragmentElements(annotationId);
      var miny = Number.MAX_VALUE;
      var maxy = 0;
      for (var j = 0; j < fragmentElements.length; j++) {
        var el = fragmentElements[j];
        var rect = el.getBoundingClientRect();
        miny = Math.min(miny, rect.top);
        maxy = Math.max(maxy, rect.bottom);
      }
      // TODO: we need to chunk the ranges first and then create highligh elements
      var highlightEl = $$('div.highlight');
      var elTop = miny - surfaceTop + surfaceScrollTop;
      var elHeight = maxy-miny;
      highlightEl.dataset.annotationId = annotationId;
      highlightEl.style.top = elTop+"px";
      highlightEl.style.height = elHeight+"px";
      this.el.appendChild(highlightEl);

      this.fragmentElements[annotationId] = fragmentElements;
    }
    this.update();
  };

  this.getFragmentElements = function(annotationId) {
    var frags = this.document.getAnnotationFragments(annotationId);
    var ids = Object.keys(frags);

    var elements = [];
    _.each(ids, function(id) {
      var els = this.surface.el.querySelectorAll('.annotation.'+id);
      if (els && els.length > 0) {
        for (var i = 0; i < els.length; i++) {
          elements.push(els[i]);
        }
      } else {
        console.log('Could not find element for fragment', id);
      }
    }, this);
    return elements;
  };


  this.onClickHighlight = function(e) {
    var el = e.target;
    var annotation = this.document.get(el.dataset.annotationId);
    // var fragmentElements = this.fragmentElements[annotation.id];
    var state = _.clone(this.writerCtrl.state);

    if (state.subjectReferenceId === annotation.id) {
      // Untoggle
      this.writerCtrl.switchState({
        id: "main",
        contextId: state.contextId
      }, {"no-scroll": true, updateRoute: true, replace: true});
    } else {
      // Toggle
      this.writerCtrl.switchState({
        id: "main",
        contextId: "subjects",
        subjectReferenceId: annotation.id
      }, {updateRoute: true, replace: true});

    }
    e.preventDefault();
  };

  this.onGraphUpdate = function(op) {
    if ((op.type === "create" || op.type === "delete") && this.document.schema.isInstanceOf(op.val.type, "multi_annotation")) {
      console.log("AnnotationBar.onGraphUpdate");
      // HACK: damn it... the text_view has not been rerendered at this time
      // so the spans are not there which are necessary to update
      var self = this;
      window.setTimeout(function() {
        if (op.type === "create") {
          self.document.get(op.val.id).addFragments();
        }
        self.render();
      }, 0);
    }
  };

};
AnnotationBar.Prototype.prototype = View.prototype;
AnnotationBar.prototype = new AnnotationBar.Prototype();
AnnotationBar.prototype.constructor = AnnotationBar;

module.exports = AnnotationBar;

},{"substance-application":10,"substance-util":268,"underscore":273}],39:[function(require,module,exports){
"use strict";

var Article = require("substance-article");
var EditableArticle = require("../editable_article");
var Chronicle = require("substance-chronicle");
var util = require("substance-util");

// Creates fresh documents
// ----------
//
// ARCHIVIST_MONKEYPATCH_ALERT

var DocumentFactory = function() {

};

DocumentFactory.Prototype = function() {
  this.createFromJSON = function(jsonDoc) {
    var doc = EditableArticle.fromSnapshot(jsonDoc, {
      chronicle: Chronicle.create()
    });
    return doc;
  };

  this.createEmptyDoc = function() {
    return DocumentFactory.createEmptyDoc();
  };
};

DocumentFactory.createEmptyDoc = function() {
  var docId = util.uuid();

  var seed = {
    "id": docId,
    "schema": [Article.SCHEMA_ID, Article.SCHEMA_VERSION],
    "nodes": {
      "document": {
        "id": "document",
        "type": "document",
        "views": [
          "content",
          "citations",
          "remarks",
          "info"
        ],
        "license": "licence", // really needed?
        "guid": docId,
        "creator": "",
        "title": "Untitled",
        "authors": [],
        "abstract": "",
        "created_at": new Date().toJSON(),
        "updated_at": new Date().toJSON(),
        "published_on": new Date().toJSON()
      },
      "cover": {
        "id": "cover",
        "type": "cover",
        "authors": []
      },
      "content": {
        "type": "view",
        "id": "content",
        "nodes": ["cover", "text1"]
      },
      "citations": {
        "type": "view",
        "id": "citations",
        "nodes": []
      },
      "remarks": {
        "type": "view",
        "id": "remarks",
        "nodes": []
      },
      "info": {
        "type": "view",
        "id": "info",
        "nodes": ["publication_info", "interview_subject", "interview_conductor", "interview_operator", "interview_sound_operator"]
      },
      "text1": {
        "type": "text",
        "id": "text1",
        "content": ""
      },
      "publication_info": {
        "id": "publication_info",
        "type": "publication_info"
      },
      "interview_subject": {
        "type": "interview_subject",
        "id": "interview_subject",
        "name": "The Interviewed",
        "role": "Interview Subject",
        "forced_labor": "intracamp work; earthworks (construction of barracks); digging tunnels for military factories",
        "categories": ["Ost arbeiter", "Cocentration camp worker"],
        "prisons": ["location_komorn"],
        "movement": [
          {
            "location": "location_danzig",
            "density": 33
          },
          {
            "location": "location_komorn",
            "density": 67
          }
        ],
        "description": "",
        "image": "",
      },
      "interview_conductor": {
        "type": "contributor",
        "id": "interview_conductor",
        "source_id": "",
        "name": "Daniel Beilinson",
        "role": "Interview Conductor",
        "description": "",
        "image": "",
      },
      "interview_operator": {
        "type": "contributor",
        "id": "interview_operator",
        "source_id": "",
        "name": "Oliver Buchtala",
        "role": "Operator",
        "description": "",
        "image": "",
      },
      "interview_sound_operator": {
        "type": "contributor",
        "id": "interview_sound_operator",
        "source_id": "",
        "name": "Michael Aufreiter",
        "role": "Sound Operator",
        "description": "",
        "image": "",
      },
      "license": {
        "id": "license",
        "type": "license",
        "name": "None",
        "code": "none",
        "description": "",
        "version": "1.0",
        "url": ""
      }
    }
  };

  var doc = new EditableArticle({
    seed: seed,
    chronicle: Chronicle.create()
  });

  return doc;
};

DocumentFactory.prototype = new DocumentFactory.Prototype();

module.exports = DocumentFactory;

},{"../editable_article":55,"substance-article":17,"substance-chronicle":23,"substance-util":268}],40:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");

var FileWrapper = function() {
};
FileWrapper.Prototype = function() {
  this.getSize = function() {
    throw new Error("FileWrapper.getSize() is abstract");
  };
  this.getName = function() {
    throw new Error("FileWrapper.getSize() is abstract");
  };
  this.getType = function() {
    throw new Error("FileWrapper.getSize() is abstract");
  };
  this.getExtension = function() {
    return _.last(this.name.split(".")) || this.type.split("/")[1];
  };
  this.getData = function() {
    throw new Error("FileWrapper.getData() is abstract");
  };
  this.asText = function() {
    throw new Error("FileWrapper.asText() is abstract");
  };
  /*jshint unused: false*/
  this.initialize = function(cb) {
    throw new Error("FileWrapper.initialize() is abstract");
  };
};
FileWrapper.prototype = new FileWrapper.Prototype();

Object.defineProperties(FileWrapper.prototype, {
  'size': {
    get: function() {
      return this.getSize();
    },
    set: function() {
      throw new Error("FileWrapper.size is read-only");
    }
  },
  'name': {
    get: function() {
      return this.getName();
    },
    set: function() {
      throw new Error("FileWrapper.name is read-only");
    }
  },
  'type': {
    get: function() {
      return this.getType();
    },
    set: function() {
      throw new Error("FileWrapper.type is read-only");
    }
  },
  'extension': {
    get: function() {
      return this.getExtension();
    },
    set: function() {
      throw new Error("FileWrapper.extension is read-only");
    }
  },
  'data': {
    get: function() {
      return this.getData();
    },
    set: function() {
      throw new Error("FileWrapper.data is read-only");
    }
  },
  'text': {
    get: function() {
      return this.asText();
    },
    set: function() {
      throw new Error("FileWrapper.text is read-only");
    }
  },
});

FileWrapper.wrapFiles = function(FileWrapperCtor, files, cb) {
  var tasks = [];
  var result = [];
  // Note: Assuming that files are given either as window.FileList or
  // as an array of strings (paths).
  _.each(files, function(f) {
    tasks.push(function(cb) {
      var wrapper = new FileWrapperCtor(f);
      wrapper.initialize(function(err) {
        if (err) return cb(err);
        result.push(wrapper);
        cb(null);
      });
    });
  });

  // call the tasks asynchronously and finally the given callback
  util.async.sequential({
    functions: tasks,
  }, function(err) {
    cb(err, result);
  });
};

module.exports = FileWrapper;

},{"substance-util":268,"underscore":273}],41:[function(require,module,exports){
"use strict";

// Substance.GenericBackend
// ------------
//

var DocumentFactory = require("./document_factory");
// TODO: in substance-util#master we have thrown out the zip dependency
//   Get rid of it here too
var zip = require("substance-util").zip;

var GenericBackend = function() {
  this.documentFactory = new DocumentFactory();
};

GenericBackend.Prototype = function() {

  // Returns an empty document

  this.newDocument = function() {
    return this.documentFactory.createEmptyDoc();
  };

  this.open =  function(path, cb) {
    console.error('Abstract interface has not been implemented');
  };

  this.save = function(doc, path, cb) {
    console.error('Abstract interface has not been implemented');
  };

  // Read from Arraybuffer
  // -----------
  //
  // Used by Composer, when files are dropped

  this.readFromArrayBuffer = function(data, cb) {
    try {
      var doc = zip.unzipFromArrayBuffer(data, this.documentFactory);
      cb(null, doc);
    } catch (err) {
      cb(err);
    }
  };

};

GenericBackend.prototype = new GenericBackend.Prototype();

module.exports = GenericBackend;

},{"./document_factory":39,"substance-util":268}],42:[function(require,module,exports){
"use strict";

// Substance.LocalStorageBackend
// ------------
//
// Used by WebShell

var GenericBackend = require("./generic_backend");
var zip = require("substance-util").zip;
var DocumentFactory = require("./document_factory");

var LocalStorageBackend = function(shell) {
  GenericBackend.call(this);
};

LocalStorageBackend.Prototype = function() {

  // Open the document
  // -----------

  this.open = function(path, cb) {
    var rawDoc = window.localStorage.getItem(path);
    if (rawDoc) {
      var doc = zip.unzipFromBase64(rawDoc, this.documentFactory);
      cb(null, doc);
    } else {
      var doc = this.newDocument();
      cb(null, doc);
    }
  };

  // Save document at given path
  // -----------

  this.save = function(doc, path, cb) {
    var that = this;

    zip.zip(doc, function(err, zip) {
      if (err) return cb(err);
      try {
        var data = zip.generate({type: "base64"});
        window.localStorage.setItem(path, data);
        cb(null);
      } catch (err) {
        cb(err);
      }
    });
  };
};

LocalStorageBackend.Prototype.prototype = GenericBackend.prototype;
LocalStorageBackend.prototype = new LocalStorageBackend.Prototype();

module.exports = LocalStorageBackend;
},{"./document_factory":39,"./generic_backend":41,"substance-util":268}],43:[function(require,module,exports){
(function (global){
"use strict";

var FileWrapper = require('./file_wrapper');

var WebFileWrapper = function(f, options) {
  FileWrapper.call(this, options);
  if (!f instanceof window.File) {
    throw new Error("Invalid argument: expecting file of type window.File");
  }
  this._file = f;
  this._data = null;
};
WebFileWrapper.Prototype = function() {
  this.getSize = function() {
    return this._file.size;
  };
  this.getName = function() {
    return this._file.name;
  };
  this.getType = function() {
    return this._file.type;
  };
  this.initialize = function(cb) {
    var self = this;
    var reader = new window.FileReader();
    reader.onload = function(e) {
      self._data = new global.Uint8Array(e.target.result);
      cb(null);
    };
    reader.readAsArrayBuffer(this._file);
  };
  this.getData = function() {
    return this._data;
  };
  this.asText = function() {
    return String.fromCharCode.apply(null, this._data);
  };
};
WebFileWrapper.Prototype.prototype = FileWrapper.prototype;
WebFileWrapper.prototype = new WebFileWrapper.Prototype();

WebFileWrapper.wrapFiles = function(files, cb) {
  return FileWrapper.wrapFiles(WebFileWrapper, files, cb);
};

module.exports = WebFileWrapper;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./file_wrapper":40}],44:[function(require,module,exports){
"use strict";

var Application = require("substance-application");

var ComposerController = require("./composer_controller");
var ComposerRouter = require("./composer_router");

var WriterController = require("./writer_controller");
var WriterView = require("./writer_view");
var Panel = require("./panels/panel");
var PanelView = require("./panels/panel_view");
var PanelController = require("./panels/panel_controller");
var Workflow = require("./workflows/workflow.js");

var NodesPanelController = require("./panels/nodes_panel_controller");
var NodesPanelView = require("./panels/nodes_panel_view");

var EditableArticle = require('./editable_article');

// Substance Composer
// ========
//

var Composer = function(options) {
  Application.call(this, options);

  this.controller = new ComposerController(this, options);

  // Set up router
  var router = new ComposerRouter(this);
  this.setRouter(router);
};

Composer.Prototype = function() {

  this.render = function() {
    this.view = this.controller.createView();
    this.$el.replaceWith(this.view.render().el);
  };

  // Save document
  // ---------------
  //
  // Save to file in native app
  // Or save to localStorage in webversion
  // Currently stores the base64 encoded zip as that's the easiest way

  this.start = function(options) {
    Application.prototype.start.call(this, options);

    // TODO: decide on a clear pattern that lets you distinguish both cases
    this.controller.shell.attachComposer(this);
  };

  // Commands
  // -------------------

  this.newDocument = function() {
    this.controller.newDocument(function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('successfully created new doc');
      }
    });
  };

  this.open = function(path) {
    this.controller.openDocument(path, function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('successfully opened doc');
      }
    });
  };

  this.save = function() {
    this.controller.save(function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('successfully saved doc');
      }
    });
  };

  this.saveAs = function() {
    this.controller.saveAs(function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('successfully saved under new file path');
      }
    });
  };

  this.saveToFolder = function() {
    this.controller.saveToFolder(function(err) {
      if (err) {
        console.error(err);
      } else {
        console.log('successfully saved at folder');
      }
    });
  };

  this.sendError = function(err) {
    this.controller.sendError(err);
  };

  this.undo = function() {
    this.controller.undo();
  };

  this.redo = function() {
    this.controller.redo();
  };

  this.cut = function() {
    this.controller.cut();
  };

  this.copy = function() {
    this.controller.copy();
  };

  this.paste = function() {
    this.controller.paste();
  };

  this.selectAll = function() {
    this.controller.selectAll();
  };
};

Composer.Prototype.prototype = Application.prototype;
Composer.prototype = new Composer.Prototype();
Composer.prototype.constructor = Composer;

// Expose API
// -------------------

Composer.WriterController = WriterController;
Composer.WriterView = WriterView;
Composer.Controller = ComposerController;
Composer.ComposerController= ComposerController;
Composer.EditableArticle = EditableArticle;

Composer.Panel = Panel;
Composer.PanelController = PanelController;
Composer.PanelView = PanelView;

// Nodes Panel
Composer.NodesPanelController = NodesPanelController;
Composer.NodesPanelView = NodesPanelView;

Composer.Workflow = Workflow;

Composer.defaultWorkflows = require("./default_workflows");
Composer.defaultTools = require("./default_tools");

module.exports = Composer;

},{"./composer_controller":45,"./composer_router":47,"./default_tools":53,"./default_workflows":54,"./editable_article":55,"./panels/nodes_panel_controller":104,"./panels/nodes_panel_view":105,"./panels/panel":106,"./panels/panel_controller":107,"./panels/panel_view":108,"./workflows/workflow.js":121,"./writer_controller":122,"./writer_view":123,"substance-application":10}],45:[function(require,module,exports){
"use strict";
var Controller = require("substance-application").Controller;
var WriterController = require("./writer_controller");
var ComposerView = require("./composer_view");
var _ = require("underscore");
var Commander = require("substance-commander");
var Keyboard = Commander.ChromeKeyboard;
var util = require("substance-util");

var PublishController = require("./publish/publish_controller");

var DEFAULT_STATE_CHANGE_OPS = {
  updateRoute:true,
  replace: true
};

// Composer.Controller
// -----------------
//
// Controls the Composer

var ComposerController = function(app, options) {

  this.app = app;
  this.shell = options.shell;
  this.panels = options.panels || [];
  this.workflows = options.workflows || [];
  this.tools = options.tools || [];

  this.doc = null;
  var self = this;

  // Setup Keyboard
  // ------------

  var keymap = WriterController._getDefaultKeyMap();
  this.keyboard = new Keyboard(keymap);
  this.keyboard.setDefaultHandler(this.keyboard.PASS);


  this.keyboard.bind("preview", "keydown", function(e) {
    self.showPublish();
    e.preventDefault();
    e.stopPropagation();
  });

  this.keyboard.bind("edit", "keydown", function(e) {
    self.showEdit();
    e.preventDefault();
    e.stopPropagation();
  });

  this.keyboard.bind("undo", "keydown", function(e) {
    self.undo();
    e.preventDefault();
    e.stopPropagation();
  });

  this.keyboard.bind("redo", "keydown", function(e) {
    self.redo();
    e.preventDefault();
    e.stopPropagation();
  });

  this.keyboard.bind("save", "keydown", function(e) {
    self.save();
    e.preventDefault();
    e.stopPropagation();
  });

};

ComposerController.Prototype = function() {

  var __super__ = Controller.prototype;

  this.createView = function() {
    if (!this.view) {
      this.view = new ComposerView(this);

      // HACK: binding the keyboard to document so that
      // we are sure to catch all keyboard events
      this.keyboard.connect(window.document);
    }
    return this.view;
  };

  this.initialize = function(newState, cb) {
    cb(null);
  };

  // Creates a new child controller and according to the new state.
  // ------
  // Disposes an existing controller


  this.initChildController = function(newState) {
    var self = this;

    // Child controllers are only created once, and reused over the lifecycle of the app window
    if (!this.writerCtrl) {
      this.writerCtrl = this.createWriterController();
      this.publishCtrl = this.createPublishController();

      setInterval(function() {
        self.requestAutoSave();
      }, 10000);
    }

    var controller;
    switch (newState.id) {
    case "publish":
      controller = this.publishCtrl; // this.createPublishController();
      break;
    case "composer":
      controller = this.writerCtrl; // this.createWriterController();
      break;
    default:
      throw new Error("Unknown state");
    }

    this.setChildController(controller, {nowarn: true});
  };

  this.transition = function(newState, cb) {
    // handle reflexiv transitions
    var self = this;

    // idem-potence
    if (newState.id === this.state.id) {
      var skip = false;

      switch (newState.id) {
      case "publish":
        // There is no sub-state in publish state
        skip = true;
        break;
      case "composer":
        skip = (newState.path === this.state.path && newState.path !== "new");
        break;
      default:
        throw new Error("Unknown state");
      }

      if (skip) return cb(null, {skip: true});
    }

    // Whenever the path changes re-open the document.
    // Note: the child controller will be recreated, too.
    // Except: if the 'save-as' option is given we do not to reload the document
    // and can preserve e.g., the undo/redo history
    if ((this.state.path !== newState.path && !newState.options["save-as"]) ||
        newState.options["new-doc"]) {
      if (newState.options.data) {
        return this.openFromData(newState.options.data, function(err) {
          if (err) return cb(err);
          self.initChildController(newState);
          cb(null);
        });
      } else {
        return this.open(newState.path, function(err) {
          if (err) return cb(err);
          self.initChildController(newState);
          cb(null);
        });
      }
    } else {
      // otherwise, the document is still the same but we might need to change
      // the child controller
      if (newState.id !== this.state.id) {
        self.initChildController(newState);
      }
    }

    cb(null);
  };

  // Trigger view transition on state change
  // -----------------
  //

  this.afterTransition = function(oldState) {
    this.view.transition(oldState);
  };

  // Open a new doc
  // -------------
  //
  // path: "new" - shell.open yields a blank document

  this.open = function(path, cb) {
    var that = this;

    this.shell.open(path, function(err, doc) {

      if (err) return cb(err);
      that.doc = doc;
      cb(null);
    });
  };

  // Open a new doc from cache
  // -------------
  //
  // This is used when an .sdf file has been dropped on the web version

  this.openFromData = function(data, cb) {
    // TODO: this method could be named better, and maybe provide
    // the mime-type... something like shell.convert(data, mimeType)
    // Also we should think about doing different things depending
    // on the mime type. E.g., dropping an image file
    // could insert a figure, dropping a epub could start a converter
    // etc...
    this.shell.readFromArrayBuffer(data, function(err, doc) {
      if (err) {
        console.error(err);
      } else {
        this.doc = doc;
      }
      cb(err);
    });
  };

  // Initializes child controller for edit state
  this.createWriterController = function() {
    var that = this;
    var doc = this.doc;

    var writerCtrl = new WriterController(doc, {
      onAutoSave: function() {
        // Not connected atm
      },
      onDocumentEdit: function() {
        that.shell.updateTitle(that.doc.title);
        that.view.toolbarView.update();
        that.view.update();
      },
      composerCtrl: that,
      panels: that.panels,
      tools: that.tools,
      workflows: that.workflows,
      shell: that.shell
    });

    return writerCtrl;

  };

  this.requestAutoSave = function() {
    var doc = this.writerCtrl.document;
    var self = this;
    if (doc.__dirty && !this.__isSaving) {

      this.__isSaving = true;
      this.save(function(err) {
        self.__isSaving = false;
      });

    } else {
      console.log('nope');
    }
  };

  // Initializes child controller for publish state
  this.createPublishController = function() {
    return new PublishController(this.doc, this);
  };

  // Store current document under state.path
  // -----------------
  //

  var SDF_FILE = /.*\.sdf$/;

  this.save = function(cb) {
    var that = this;

    //HACK: we disable save to zip for now, as it is buggy
    // so we delegate to saveAs if the path does end with 'content.json'
    if (this.state.path.match(SDF_FILE) && window.native_app) {
      var MSG = "Sorry, we can not save to SDF files currently.\n" +
            "Please select an empty folder or create a new one.";
      window.alert(MSG);
      return this.saveToFolder(cb);
    }

    if (this.state.path && this.state.path !== "new") {
      this.view.beforeSave();
      this.shell.save(this.doc, this.state.path, function(err) {
        if (!err) that.doc.__dirty = false;
        that.view.afterSave(err);
        if (cb) cb(err);
      });
    } else {
      this.saveAs(cb);
    }
  };

  // Store current document under a new path
  // -----------------
  //

  this.saveAs = function(cb) {
    // HACK: due to the problems with jszip we deactivate saving to a file
    // and always delegate to saveToFolder
    if (window.native_app) return this.saveToFolder(cb);

    var that = this;
    var childState = that.childController.state;
    var stateChangeOptions = _.extend({
      "save-as" : true
    }, DEFAULT_STATE_CHANGE_OPS);

    if (window.native_app) {
      var suggestedFilename = util.slug(that.doc.title)+".sdf";
      this.shell.selectFile(suggestedFilename, { 'save': true }, function(err, path) {
        if (err || !path) return; // do nothing

        that.shell.save(that.doc, path, function(err) {
          if (err) {
            cb(err);
          } else {
            that.doc.__dirty = false;
            that.app.switchState([{id: "composer", "path": path}, childState], stateChangeOptions);
            cb(null);
          }
          that.view.afterSave(err);
        });
      });
    } else {
      // In web version just use a fake localstorage entry
      var path = "localstorage.sdf";
      that.shell.save(that.doc, path, function(err) {
        if (err) {
          cb(err);
        } else {
          that.doc.__dirty = false;
          that.app.switchState([{id: "composer", "path": path}, childState], stateChangeOptions);
          cb(null);
        }
        that.view.afterSave(err);
      });
    }
  };

  // Store current document under a new path
  // -----------------
  //

  this.saveToFolder = function(cb) {
    var that = this;
    var childState = that.childController.state;

    // Note: the transition after saving to a folder is equivalent to 'save-as'
    var stateChangeOptions = _.extend({
      "save-as" : true
    }, DEFAULT_STATE_CHANGE_OPS);

    this.shell.selectFolder({'save': true}, function(err, path) {
      if (err || !path) return; // do nothing
      path = path+"/content.json";

      that.shell.save(that.doc, path, function(err) {
        if (err) return cb(err);
        that.doc.__dirty = false;
        that.view.afterSave();
        that.app.switchState([{id: "composer", "path": path}, childState], stateChangeOptions);
        cb(null);
      });
    });
  };

  // Shell delegates
  // ----------------
  //

  this.openExternalLink = function(url) {
    this.shell.openExternalLink(url);
  };

  this.getAvailableTemplates = function(cb) {
    this.shell.getAvailableTemplates(cb);
  };

  this.generatePreview = function(cb) {
    this.shell.generatePreview(this.doc, cb);
  };


  // Main actions
  // =================
  //

  this.newDocument = function() {
    if (window.native_app) {
      // Opens a new window in native app
      this.shell.newDocument();
    } else {
      // Provide a flag to detect that a new document is requested.
      // E.g., this makes a difference when switching between publish and edit on a new document
      // or pressing the 'New' button from within the publish state
      var stateChangeOptions = _.extend({}, DEFAULT_STATE_CHANGE_OPS, {
        "new-doc": true
      });
      this.app.switchState({id: "composer", "path": "new"}, stateChangeOptions);
    }
  };

  this.undo = function() {
    // TODO: this is currently implemented in WriterView
    console.log("Undo...");

    if (this.state.id !== "composer") {
      // Make implicit switch to edit state
      this.showEdit();
    }

    var op = this.doc.chronicle.rewind();
    if (op && op.data) {
      var writerCtrl = this.writerCtrl;

      var data = op.data.before;
      if (data) {
        window.setTimeout(function() {
          // console.log("setting selection after undo: ", data.container, data.sel);
          writerCtrl.setSelection(data.container, data.sel);
          writerCtrl.onDocumentEdit();
        }, 0);
      }
    }
  };

  this.redo = function() {
    // TODO: this is currently implemented in WriterView
    console.log("Redo...");

    if (this.state.id !== "composer") {
      this.showEdit();
    }

    var op = this.doc.chronicle.forward();
    if (op && op.data) {
      var writerCtrl = this.writerCtrl;

      var data = op.data.after;
      if (data) {
        window.setTimeout(function() {
          // console.log("setting selection after redo: ", data.container, data.sel);
          writerCtrl.setSelection(data.container, data.sel);
          writerCtrl.onDocumentEdit();
        }, 0);
      }
    } };

  this.cut = function() {
    console.log("Cut...");
    if (this.state.id !== "composer") return;

    // TODO: this API is used in the native version only
    // the clipboard should not be in the view in that case
    var clipboard = this.childController.view.clipboard;
    if (clipboard.isNative) {
      clipboard.cut();
    }
  };

  this.copy = function() {
    if (this.state.id !== "composer") return;

    // TODO: this API is used in the native version only
    // the clipboard should not be in the view in that case
    var clipboard = this.childController.view.clipboard;
    if (clipboard.isNative) {
      clipboard.copy();
    }
  };

  this.paste = function() {
    console.log("Paste...");
    if (this.state.id !== "composer") return;

    // TODO: this API is used in the native version only
    // the clipboard should not be in the view in that case
    var clipboard = this.childController.view.clipboard;
    if (clipboard.isNative) {
      clipboard.paste();
    }
  };

  this.selectAll = function() {
    console.log("Select all...");
    if (this.state.id !== "composer") return;

    var writerCtrl = this.childController;
    if (writerCtrl.currentController) {
      writerCtrl.currentController.select("all");
    }
  };

  // Create a new document from array buffer
  this.openDocumentFromArrayBuffer = function(data) {
    var opts = _.clone(DEFAULT_STATE_CHANGE_OPS);
    opts["data"] = data;
    this.app.switchState([{id: "composer", "path": "new"}, {id: "main", contextId: "toc"}], opts);
  };

  // Export web publication
  // -----------------
  //

  this.exportPublication = function() {
    var that = this;
    this.shell.selectFolder({ 'save': true }, function(err, path) {
      if (err || !path) return; // do nothing

      that.shell.writePublication(that.doc, path, function() {
        console.log('successfull exported publication');
      });
    });
  };

  this.showPublish = function() {
    var path = this.state.path;
    this.app.switchState([{id: "publish", "path": path}, {id: "default"}], DEFAULT_STATE_CHANGE_OPS);
  };

  this.showEdit = function() {
    var path = this.state.path;
    this.app.switchState([{id: "composer", "path": path}, {id: "main", "contextId": "toc"}], DEFAULT_STATE_CHANGE_OPS);
  };


  this.sendError = function(err) {
    this.view.renderError(err);
    console.log('TODO: RENDER ERROR', err);
    // __super__.sendError.call(this, err);
  };

  // Free up memory
  // -----------------
  //

  this.dispose = function() {
    __super__.dispose.call(this);
    this.stopListening();

    if (this.view) this.view.dispose();
    if (this.childController) this.childController.dispose();
  };


  this.isDocumentDirty = function() {
    // TODO: currently we do not detect all kinds of changes
    if (this.doc) {
      return this.doc.__dirty;
    }
    return false;
  };
};

ComposerController.Prototype.prototype = Controller.prototype;
ComposerController.prototype = new ComposerController.Prototype();

module.exports = ComposerController;

},{"./composer_view":48,"./publish/publish_controller":109,"./writer_controller":122,"substance-application":10,"substance-commander":32,"substance-util":268,"underscore":273}],46:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var _ = require("underscore");
var Document = require("substance-document");
var EditorController = require("substance-surface").EditorController;
var SelectionError = Document.Selection.SelectionError;
var DOMParser = window.DOMParser;

/**
 * A derived editor controller that provides manipulation API specific to the
 * Substance.Article used by the Substance.Composer.
 * TODO: maybe we should call it 'ArticleEditorController'?
 */
var ComposerEditorController = function(documentSession, editorFactory) {
  EditorController.call(this, documentSession, editorFactory);
};

ComposerEditorController.Prototype = function() {

  var __super__ = EditorController.prototype;

  // overridden to be able to create an issue/remark before adding the annotation
  this._annotate = function(session, type, data) {
        // TODO: how could this be generalized
    if (type === "remark_reference" || type === "error_reference") {
      data = data || {};
      var issueId = _issue(this, session, type);
      data.target = issueId;
    }
    __super__._annotate.call(this, session, type, data);
  };

  // TODO: this should be done via the node classes
  var _issueType = {
    "error_reference": "error",
    "remark_reference": "remark"
  };

  var _issueContainer = {
    "error": "errors",
    "remark": "remarks"
  };

  var _issue = function(self, session, annoType) {
    var type = _issueType[annoType];
    var containerId = _issueContainer[type];
    if (!type) {
      throw new Error("Unsupported issue type:" + annoType);
    }

    var doc = session.document;
    var issue = {
      id: type+"_" + util.uuid(),
      type: type,
      created_at: new Date(),
      // TODO: Use full username from operating system
      creator: Math.random()>0.5 ? "Michael Aufreiter" : "Oliver Buchtala"
    };
    doc.create(issue);
    doc.show(containerId, [issue.id]);
    return issue.id;
  };


  // Create a Substance.File node from a javascript File object
  // ---------
  //
  // Options
  //  - binary: true when it should be interpreted as a binary file

  this._createFileNode = function(session, fileId, file, options) {
    options = options || { binary: true };
    var doc = session.document;
    if (doc.get(fileId)) {
      throw new Error("File "+ fileId + " already exists.");
    }
    var fileNode = doc.create({
      id: fileId,
      type: "file",
      content_type: file.type, // "video/mp4 etc."
      version: 0
    });
    var data = options.binary ? file.data : file.text;
    fileNode.setData(data);
    return fileNode;
  };

  this._fileId = function(basename, file) {
    return [basename, '.', file.extension].join('');
  };

  // Update a Substance.File node with new data
  // ---------
  //
  // Creates a new version of the file
  //
  // Options
  //  - fileId of file that should be updated
  //  - binary: true when it should be interpreted as a binary file

  this._updateFile = function(session, fileId, file, options) {
    options = options || { binary: true };
    var doc = session.document;
    var fileNode = doc.get(fileId);
    var data = options.binary ? file.data : file.text;
    // Note: this increases the version implicitly.
    fileNode.updateData(data);
  };

  // Set file at given path
  // -----------
  //
  // Options:
  //  - binary: true| false

  this._setFile = function(session, path, file, options) {
    var doc = session.document;
    var fileId = doc.get(path);
    if (!fileId) {
      // Create file if it doesn't yet exist
      var fileNode = this._createFileNode(session, file.name, file, options);
      doc.set(path, fileNode.id);
    } else {
      // Update existing file
      this._updateFile(session, fileId, file, options);
    }
  };

  this.setFile = function(path, file, options) {
    var session = this.session.startSimulation();
    this._setFile(session, path, file, options);
    session.save();
  };

  this.insertFigure = function(figureFile, cb) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      return cb(new SelectionError("Selection is null!"));
    }

    var session = this.session.startSimulation();
    var doc = session.document;

    var figureId = "figure_"+util.uuid();

    var caption = {
      id: "text_"+util.uuid(),
      type: "text",
      content: ""
    };
    doc.create(caption);

    // create file nodes
    var fileId = this._fileId(figureId, figureFile);
    var figureFileNode = this._createFileNode(session, fileId, figureFile);

    var figure = {
      type: "figure",
      id: figureId,
      url: "",
      image: figureFileNode.id,
      label: "Figure ",
      caption: caption.id
    };

    var success = this._insertNode(session, figure);

    if (!success) {
      throw new Error("Could not insert image");
    }

    session.save();

    // ATTENTION: we are observing a strange issue with the selection here.
    // Even though we set the selection properly -- and it is also transferred to
    // a proper DOM selection -- there is no cursor displayed after inserting the figure.
    // At first we thought it would be related to image loading, and updated the selection
    // after the image was loaded. This did not resolve the issue, though.
    // The only way to get it work was to wait for a certain amount of time (400 ms).
    // Note: this issue has been observed in the browser only (not in the node-webkit one).
    // It did not depend on the actual image size.
    var self = this;
    window.setTimeout(function() {
      // console.log("WriterController.insertFigure(): received 'image-ready'", session.selection);
      self.session.selection.set(session.selection);
      self._afterEdit(this);
    }, 500);

  };

  // Web-page node manipulation
  // --------------------------

  this.insertWebPage = function(file, cb) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      return cb(new SelectionError("Selection is null!"));
    }

    var session = this.session.startSimulation();
    var doc = session.document;

    var webPageId = util.uuid("web_page_");
    var fileId = this._fileId(webPageId, file);
    var fileNode = this._createFileNode(session, fileId, file, { binary: false });

    var html = fileNode.getData();
    var dimensions = this._determineWebPageDimensions(html);

    var caption = {
      id: "text_"+util.uuid(),
      type: "text",
      content: ""
    };
    doc.create(caption);

    var webpage = {
      type: "web_page",
      id: webPageId,
      file: fileNode.id,
      width: dimensions.pageWidth,
      height: dimensions.pageHeight,
      caption: caption.id
    };
    var success = this._insertNode(session, webpage);

    if (!success) {
      throw new Error("Could not insert web page");
    }

    session.save();
    this.session.selection.set(session.selection);

    this._afterEdit(this);
    this.ensureLastNode(session);
  };

  this.setWebPageFile = function(webPageId, webpageFile) {
    var session = this.session.startSimulation();
    var doc = session.document;
    var webPage = doc.get(webPageId);

    this.updateFile(webPage.file, webpageFile, { binary: false });

    var html = webpageFile.getData();
    var dims = this.determineWebPageDimensions(html);
    doc.set([webPageId, "width"], dims.pageWidth);
    doc.set([webPageId, "height"], dims.pageHeight);

    session.save();
  };

  // A helper to determine the dimensions of a given web-page
  this._determineWebPageDimensions = function(html) {
    var parser = new DOMParser();
    var htmlDoc = parser.parseFromString(html,"text/html");
    return {
      pageWidth: htmlDoc.body.getAttribute("data-width") || "400",
      pageHeight: htmlDoc.body.getAttribute("data-height") || "400"
    };
  };

  // Video node manipulation
  // -----------------------

  this._updateVideoFiles = function(session, videoNode, videoFiles) {
    var doc = session.document;

    // Remove existing video files
    if (videoNode.poster) {
      doc.delete(videoNode.poster);
    }
    _.each(videoNode.files, function(fileId) {
      doc.delete(fileId);
    });

    var posterFile = "";
    var videoFileIds = [];

    _.each(videoFiles, function(file) {
      var fileId = this._fileId(videoNode.id, file);
      // TODO: we should check in advance if the data is valid
      // and not create the node in those cases
      var fileNode = this._createFileNode(session, fileId, file);
      if (fileNode.content_type.indexOf("video")>=0) {
        videoFileIds.push(fileNode.id);
      } else if (fileNode.content_type.indexOf("image")>=0 && !posterFile) {
        posterFile = fileNode.id;
      }
      // NOTE: removing files of invalid content type
      else {
        // console.log('removing', file.id);
        session.document.delete(fileNode.id);
      }
    }, this);

    doc.set([videoNode.id, "poster"], posterFile);
    doc.set([videoNode.id, 'files'], videoFileIds);
  };

  this.insertVideo = function(videoFiles) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      throw new SelectionError("Selection is null.");
    }

    var session = this.session.startSimulation();
    var doc = session.document;

    var videoId = "video_"+util.uuid();

    var caption = {
      id: "text_"+util.uuid(),
      type: "text",
      content: ""
    };
    doc.create(caption);

    var video = {
      type: "video",
      id: videoId,
      poster: "",
      files: [],
      caption: caption.id
    };

    var success = this._insertNode(session, video);

    if (!success) {
      throw new Error("Could not insert video");
    }

    this._updateVideoFiles(session, video, videoFiles);

    session.save();
    this.session.selection.set(session.selection);

    this._afterEdit(this);
    this.ensureLastNode(session);
  };

  this.setVideoFiles = function(videoId, files) {
    var session = this.session.startSimulation();
    var doc = session.document;
    var videoNode = doc.get(videoId);
    this._updateVideoFiles(session, videoNode, files);
    session.save();
  };

  // Audio node manipulation
  // -----------------------

  this._updateAudioFiles = function(session, audioNode, audioFiles) {
    var doc = session.document;

    _.each(audioNode.files, function(fileId) {
      doc.delete(fileId);
    });

    var audioFileIds = [];

    _.each(audioFiles, function(file) {
      var fileId = this._fileId(audioNode.id, file);
      // TODO: we should also check the validity of the file type here
      var fileNode = this._createFileNode(session, fileId, file);
      audioFileIds.push(fileNode.id);
    }, this);

    doc.set([audioNode.id, 'files'], audioFileIds);
  };

  this.insertAudio = function(audioFiles) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      throw new SelectionError("Selection is null!");
    }
    var session = this.session.startSimulation();

    var audioId = "audio_"+util.uuid();
    var caption = {
      id: "text_"+util.uuid(),
      type: "text",
      content: ""
    };
    session.document.create(caption);

    var audio = {
      type: "audio",
      id: audioId,
      files: [],
      caption: caption.id
    };
    var success = this._insertNode(session, audio);

    if (!success) {
      throw new Error("Could not insert audio");
    }

    this._updateAudioFiles(session, audio, audioFiles);

    session.save();
    this.session.selection.set(session.selection);

    this._afterEdit(this);
    this.ensureLastNode(session);
  };

  this.setAudioFiles = function(audioId, audioFiles) {
    var session = this.session.startSimulation();
    var doc = session.document;
    var audioNode = doc.get(audioId);
    this._updateAudioFiles(session, audioNode, audioFiles);
    session.save();
  };

  // Contributor
  // -----------

  this.addContributor = function() {
    var self = this;
    var session = this.session.startSimulation();

    var newContrib = {
      id: util.uuid("contributor_"),
      type: "contributor",
      role: "author",
      name: "",
      image: "",
      url: "",
      description: ""
    };

    session.document.create(newContrib);
    session.document.show("info", newContrib.id, -1);
    // Update authors property
    var authors = _.filter(session.document.get("info").nodes, function(n) {
      return n !== "publication_info";
    });
    session.document.set(["document", "authors"],  authors);

    // set the cursor into the author name's field
    var components = session.container.getNodeComponents(newContrib.id);
    var nameComp = components[0];
    session.selection.set([nameComp.pos, 0]);
    session.save();

    // HACK: this works only when executed afterwards
    window.setTimeout(function() {
      self.session.selection.set(session.selection);
    }, 0);

    return newContrib.id;
  };

  // Delete a resource (including all references)
  // --------
  //
  // EXPERIMENTAL: we have to discuss and evaluate how this should behave regarding Undo/Redo.

  this.deleteResource = function(resourceId) {
    // remove all references
    var referenceIndex = this.session.document.indexes["references"];
    var references = referenceIndex.get(resourceId);

    // Note: better to clear the selection of this controller
    // otherwise we would need to adapt it.
    this.session.selection.clear();

    var session = this.session.startSimulation();
    var doc = session.document;

    _.each(references, function(r) {
      doc.delete(r.id);
    }, this);
    // remove from view
    doc.hide(this.session.container.name, resourceId);
    // NOTE: as we do automatic deletion in some cases
    // it happens that the resource gets already deleted
    // just by removing all references to it.
    if (doc.contains(resourceId)) doc.delete(resourceId);
    session.save();
    this._afterEdit();
  };

  this.createCitationWithReference = function() {
    var doc = this.session.document;
    var node = doc.create({
      id: "web_resource_"+util.uuid(),
      type: "web_resource",
      title: this.session.selection.getText(),
      url: "http://"
    });

    this.document.show("citations", [node.id]);
    this.annotate("citation_reference", {target: node.id});

    this._afterEdit();
    return node.id;
  };

  // TODO: this seems a bit redundant
  this.createLocationReference = function() {
    // var doc = this.session.document;
    // var node = doc.create({
    //   id: "location_refeerence_"+util.uuid(),
    //   type: "web_resource",
    //   title: this.session.selection.getText(),
    //   url: "http://"
    // });

    // this.document.show("citations", [node.id]);
    this.annotate("location_reference", {target: "hallo_welt"});
    this._afterEdit();
  };

  this.addReference = function(type, data) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      console.error("Nothing is selected.");
      return;
    }

    var session = this.session.startSimulation();
    this._annotate(session, type, data);

    // Note: it feels better when the selection is collapsed after setting the
    // annotation style
    // sel.collapse("right");

    session.save();
    selection.set(session.selection);

    this._afterEdit();
  };

  this.addMultiAnnotation = function(type, data) {
    var selection = this.session.selection;
    var range = selection.range();
    var start = range.start;
    var end = range.end;

    var container = this.session.container;

    var startComp = container.getComponent(start[0]);
    var endComp = container.getComponent(end[0]);
    
    var multiAnnotation = {
      type: type,
      id: util.uuid(type+"_"),
      startPath: startComp.path,
      startCharPos: start[1],
      endPath: endComp.path,
      endCharPos: end[1],
    };

    _.extend(multiAnnotation, data);

    var session = this.session.startSimulation();
    session.document.create(multiAnnotation);

    session.save();
    selection.set(session.selection);
    this._afterEdit();
    return multiAnnotation.id;
  };

  // Undo/Redo must be handled on WriterController level, as
  // the selection updated must be dispatched to the correct editorCtrl instance.
  this.undo = function() {
    throw new Error("This must not be called here.");
  };

  this.redo = function() {
    throw new Error("This must not be called here.");
  };

};

ComposerEditorController.Prototype.prototype = EditorController.prototype;
ComposerEditorController.prototype = new ComposerEditorController.Prototype();

module.exports = ComposerEditorController;

},{"substance-document":136,"substance-surface":261,"substance-util":268,"underscore":273}],47:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Router = require("substance-application").Router;

var ComposerRouter = function(app /*, routes*/) {
  Router.call(this);

  this.app = app;
  _.each(ComposerRouter.routes, function(route) {
    if (!this[route.command]) {
      console.error("Unknown route handler: ", route.command);
    } else {
      this.route(route.route, route.name, _.bind(this[route.command], this));
    }
  }, this);

  this.route(/^state=.*$/, "state", _.bind(this.openState, this));
};

ComposerRouter.Prototype = function() {

  this.start = function() {
    Router.history.start();
  };

  var DEFAULT_OPTIONS = {
    updateRoute: false,
    replace: false
  };

  this.openState = function() {
    var fragment = Router.history.getFragment();
    var state = this.app.stateFromFragment(fragment);
    console.log('state change triggerd by router', JSON.stringify(state));
    this.app.switchState(state, DEFAULT_OPTIONS);
  };

  this.navigate = function(route, options) {
    Router.history.navigate(route, options);
  };
};

ComposerRouter.Prototype.prototype = Router.prototype;
ComposerRouter.prototype = new ComposerRouter.Prototype();

ComposerRouter.routes = [];

module.exports = ComposerRouter;
},{"substance-application":10,"underscore":273}],48:[function(require,module,exports){
"use strict";

var $ = window.$;
var util = require("substance-util");
var Application = require("substance-application");
var View = require("substance-application").View;
var $$ = Application.$$;

var WriterController = require("./writer_controller");
var _ = require("underscore");
var ToolbarView = require("./toolbar_view");

var document = window.document;
var FileReader = window.FileReader;


// Substance.ComposerView
// ========
//

var ComposerView = function(controller) {
  View.call(this);

  this.controller = controller;
  this.$el.attr({id: "container"});

  // TODO: if we want this back we should make it smarter to only act for adequate mime-types
  // see event.dataTransfer.items
  // $(document).on('dragover', function () { return false; });
  // $(document).on('ondragend', function () { return false; });
  // $(document).on('drop', this.handleDroppedFile.bind(this));

  // Note: even being more inconvenient, it is cleaner
  // to keep API and event handler separated
  var self = this;

  // Returns an event handler that delegates to the given methodname
  function _delegate(name) {
    return function(e) {
      self[name]();
      e.preventDefault();
      e.stopPropagation();
    };
  }

  $(this.el).on('click', '.toggle-annotation.export', _delegate("export"));
  $(this.el).on('click', '.control.save', _delegate("save"));
  $(this.el).on('click', '.new-document', _delegate("newDocument"));
  $(this.el).on('click', '.export-publication', _delegate("exportPublication"));

  $(this.el).on('click', '.toggle-publish', _delegate("showPublish"));
  $(this.el).on('click', '.toggle-edit', _delegate("showEdit"));

  $(this.el).on('click', '.control.undo', _delegate("undo"));
  $(this.el).on('click', '.control.redo', _delegate("redo"));

};


ComposerView.Prototype = function() {

  this.showEdit = function(e) {
    this.controller.showEdit();
  };

  this.showPublish = function() {
    this.controller.showPublish();
  };

  // Start listening to routes
  // --------

  this.render = function() {
    this.menuEl  = $$('#menu');
    this.mainEl  = $$('#main', {html: '<br/><br/><br/><br/><br/>&nbsp;&nbsp;Loading document...'});

    this.searchEl = $$('#search');
    this.statusEl = $$('#status', {
      children: [
        $$('.filename', {text: ""}),
        $$('.action', {text: ""})
      ]
    });

    this.toolbarView = new ToolbarView(this.controller);
    this.toolbarView.render();

    this.menuEl.appendChild(this.toolbarView.el);

    this.el.appendChild(this.menuEl);
    this.el.appendChild(this.mainEl);

    this.el.appendChild(this.searchEl);
    this.el.appendChild(this.statusEl);

    return this;
  };


  // Update satusbar etc.
  // TODO: Should we really invalidate error messages
  // each time we have an update here?

  this.update = function() {
    this.$('#status').removeClass('error');

    var doc = this.controller.doc;
    if (doc.__dirty) {
      this.$('#status .action').html('Unsaved changes');
    } else {
      this.$('#status .action').html('Saved');
    }

    var path = this.controller.state.path;

    if (path !== "new") {
      this.$('#status .filename').html(path);
    } else {
      this.$('#status .filename').html("untitled");
    }

  };

  // Save document
  // ---------------
  //
  // Save to file in native app
  // Or save to localStorage in webversion

  this.save = function() {
    // this.afterSave will be called from the controller
    this.controller.save();
  };

  this.undo = function() {
    this.controller.undo();
  };

  this.redo = function() {
    this.controller.redo();
  };

  this.beforeSave = function() {
    this.$('#status .action').html("Saving ...");
  };

  // afterSave
  // ---------------
  //
  // Called by the controller to update the UI of the save button

  this.afterSave = function(err) {
    if (err) {
      console.error(err);

      // $('.control.save').addClass('error');
      this.renderError(err);
      util.printStackTrace(err);
    } else {
      // this.$('#status .action').html("Saved");
      this.update();
      $('.control.save').removeClass('error');
      $('.control.save').addClass('disable');
    }
  };

  this.renderError = function(err) {
    var statusEl = this.$('#status');
    statusEl.addClass('error');
    this.$('#status .action').html(err.message || err);

    _.delay(function() {
      statusEl.removeClass('error');
    }, 4000);
  };

  // Export document
  // --------
  //
  // Exports a zip file that when extracted is ready for deploy
  // Triggered by web client

  this.export = function() {
    var doc = this.controller.doc;

    util.zip.zip(doc, function(err, zip) {
      if (err) return console.error(err);
      var blob = zip.generate({"type": "blob"});
      var exportZipLnk = window.document.querySelector('.export-zip');
      exportZipLnk.href = window.URL.createObjectURL(blob);
      exportZipLnk.download = util.slug(doc.title)+".sdf";
      if (!/Chrome/.test(window.navigator.userAgent) && !/Firefox/.test(window.navigator.userAgent)) {
        alert("Unfortunately, Safari doesn't support downloading of generated zip files. For the time being, please use Google Chrome for storing docs on disk.");
      }
      $('.export-zip')[0].click();
    });
  };

  // Export publication
  // --------
  //
  // Rendered HTML version of the document, ready for self-publication
  // Triggered by native client

  this.exportPublication = function() {
    this.controller.exportPublication();
  };

  // Import from dropped sdf file (zip archive)
  // ----------
  //
  // Used by browser version

  this.handleDroppedFile = function(event) {
    var that = this;

    console.log('handled dropped file...');

    // What is event? It works but I don't get it.
    var files = event.originalEvent.dataTransfer.files;
    var file = files[0];
    var reader = new FileReader();

    reader.onload = function(e) {
      that.controller.openDocumentFromArrayBuffer(e.target.result);
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  this.newDocument = function() {
    this.controller.newDocument();
  };

  this.transition = function(oldState) {
    var state = this.controller.state;

    // save-as usecase (path changes but nothing else)
    if (state.id === oldState.id && state.path !== "new") {
      this.update();
      return;
    }

    this.mainEl.innerHTML = "";

    $('body').removeClass();

    if (state.id === "composer") {
      var writerCtrl = this.controller.childController;

      // TODO: react
      if (!this.writerViewEl) {
        this.writerViewEl = writerCtrl.view.el
        this.mainEl.appendChild(this.writerViewEl);
      }

      $('body').addClass('state-composer');
      this.updateTitle(writerCtrl.document.title);

      this.$('.modes a').removeClass('active');
      this.$('.modes a.toggle-edit').addClass('active');
      this.update();
    } else {
      var publishController = this.controller.childController;

      if (!this.publishViewEl) {
        this.publishViewEl = publishController.view.el;
        this.mainEl.appendChild(this.publishViewEl);
      }

      // this.mainEl.appendChild(publishController.view.el);
      $('body').addClass('state-publish');

      this.$('.modes a').removeClass('active');
      this.$('.modes a.toggle-publish').addClass('active');
    }
  };
};

ComposerView.Prototype.prototype = View.prototype;
ComposerView.prototype = new ComposerView.Prototype();
ComposerView.prototype.constructor = ComposerView;

module.exports = ComposerView;

},{"./toolbar_view":116,"./writer_controller":122,"substance-application":10,"substance-util":268,"underscore":273}],49:[function(require,module,exports){
"use strict";

var ContentToolsView = require("./content_tools_view");
var Controller = require("substance-application").Controller;

// Substance.Writer.ContentToolsController
// -----------------
//

var ContentToolsController = function(parentAdapter) {
  this.parentAdapter = parentAdapter;
  this.tools = parentAdapter.tools;
  this.state = {id: "initialized"};
};

ContentToolsController.Prototype = function() {

  this.createView = function() {
    if (!this.view) {
      this.view = new ContentToolsView(this);
    }
    return this.view;
  };

  this.initialize = function(newState, cb) {
    this.createView();
    cb(null);
  };

  this.dispose = function() {
    if (this.view) this.view.dispose();
    this.view = null;
  };

  this.transition = function(newState, cb) {

    // Update annotation toggles el al.
    this.view.update();

    // Handle reflexive transitions
    if (this.state.id === newState.id) {
      // if (this.state.id !== "edit-web-resource") return;

      // Skip transition when cursor is moved within the current annotation
      if (this.state.annotation === newState.annotation) return;
    }

    this.state = newState;
    this.view.transition(newState);

    if (cb) {
      console.log('who called this method with a callback?');
      cb(null);
    }
  };

  // Called by WriterView#onSelectionUpdate
  // -------------
  //
  // Triggers state transition based on cursor movement
  // Additionally state transitions can be triggered by buttons in the toolbar itself
  this.update = function() {
    this.transition({id: "main"});
  };

};

ContentToolsController.Prototype.prototype = Controller.prototype;
ContentToolsController.prototype = new ContentToolsController.Prototype();
module.exports = ContentToolsController;

},{"./content_tools_view":50,"substance-application":10}],50:[function(require,module,exports){
var _ = require("underscore");
var $ = window.$;
var $$ = require("substance-application").$$;
var View = require("substance-application").View;

// Substance.Writer.ToolbarView
// ==========================================================================
//

var ContentToolsView = function(controller) {
  View.call(this);
  this.$el.addClass('content-tools-view');

  this.controller = controller;
  this.tools = this.controller.tools;
  this.actions = {};
  this.controls = {};

  // README:
  // Note that we need to intercept mouseup events and call stoppropagation, because other
  // wise the selection is cleared on the surface (see WriterView.clearSelection)
  // When toggling a strong annotation, we want the selection to be preserved

  this.$el.on('click', '.select-type', _.bind(this.toggleSelectTextType, this));
  this.$el.on('mouseup', '.select-type', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.toggle-annotation', _.bind(this.toggleAnnotation, this));
  this.$el.on('mouseup', '.toggle-annotation', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.text-type', _.bind(this.changeTextType, this));
  this.$el.on('mouseup', '.text-type', _.bind(this._stopPropagation, this));
};

ContentToolsView.Prototype = function() {

  this._stopPropagation = function(e) {
    e.preventDefault();
    e.stopPropagation();
  };

  this.toggleAnnotation = function(e) {
    var type = $(e.currentTarget).attr("data-type");
    e.preventDefault();
    e.stopPropagation();
    this.performAction(type);
  };

  this.transition = function(newState) {
    // manage other transitions
    if (this.contextView) {
      this.contextView.dispose();
    }

    $(this.el).removeClass().addClass('content-tools-view');
    $(this.contextBar).html('');

    $(this.el).addClass('mode-'+newState.id);
  };

  // Rendering
  // --------
  //

  this.render = function() {
    var self = this;

    this.el.innerHTML = "";

    // Semantic Annotations
    // --------
    //

    var annotations = $$('.annotation-toggles.group');

    this.controls = {};

    this.controls["emphasis"] = $$('a.control.toggle-annotation.emphasis', {
      href: '#',
      "data-type": "emphasis",
      html: '<i class="icon-italic"></i>',
      title: 'Emphasis'
    });
    annotations.appendChild(this.controls["emphasis"]);

    this.controls["strong"] = $$('a.control.toggle-annotation.strong', {
      href: '#',
      "data-type": "strong",
      html: '<i class="icon-bold"></i>',
      title: 'Strong Emphasis'
    });
    annotations.appendChild(this.controls["strong"]);

    var markers = $$('.markers.group');

    this.controls["remark_reference"] = $$('a.control.toggle-annotation.remark_reference', {
      href: '#',
      "data-type": "remark_reference",
      title: 'Remark',
      html: '<i class="icon-comment"></i>'
    });

    markers.appendChild(this.controls["remark_reference"]);

    _.each(this.tools, function(tool) {
      var toolToggle = $$('a.control.toggle-annotation.'+tool.name, {
        href: '#',
        title: tool.title,
        html: '<i class="'+tool.icon+'"></i>'
      });

      $(toolToggle).on('click', function() {
        tool.handleToggle(self.controller.parentAdapter);
        return false;
      });

      this.controls[tool.name] = toolToggle;
      markers.appendChild(toolToggle);
    }, this);

    var inner = $$('.toolbar-inner');
    var groups = $$('.groups');

    groups.appendChild(annotations);
    groups.appendChild(markers);

    this.textMode = $$('.text-mode', {
      html: ''
    });

    this.save = $$('a.insert-media.control.save', {title: "Save", href: '#', "data-type": "figure", html: '<i class="icon-save"></i>'});
    this.undo = $$('a.insert-media.control.undo', {title: "Undo", href: '#', "data-type": "figure", html: '<i class="icon-undo"></i>'});
    this.redo = $$('a.insert-media.control.redo', {title: "Redo", href: '#', "data-type": "figure", html: '<i class="icon-rotate-right"></i>'});

    // Disable text mode for now (we don't need it for the archivist)
    // inner.appendChild(this.textMode);

    inner.appendChild(this.save);
    inner.appendChild(this.undo);
    inner.appendChild(this.redo);
    inner.appendChild(groups);

    this.contextBar = $$('.context-bar');
    inner.appendChild(this.contextBar);
    this.el.appendChild(inner);

    this.update();
    return this;
  };

  // Called whenever the document selection has changed
  // and the toolbar needs to be updated
  this.update = function() {
    var actions = this.controller.parentAdapter.getActions();

    this.$('.toggle-annotation.active').removeClass('active');
    this.disableControls();

    // store all available actions using the node type as key
    this.actions = {};

    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      this.actions[a.type] = a;
    }

    this.updateAnnotationToggles();
    this.updateActions();
    this.updateTextMode();
    this.closeDropdowns();
  };

  this.closeDropdowns = function() {
    this.$('.text-mode').removeClass('active');
    this.$('.insert-content').removeClass('active');
  };


  this.updateTextMode = function() {
    var node = this.controller.parentAdapter.getCurrentNode();
    var activeMode = this.controller.parentAdapter.getTextMode();

    this.textMode.innerHTML = "";

    function map(mode) {
      if (mode === "heading") return "Heading "+node.level;
      if (mode === "blockquote") return "Blockquote";
      if (mode === "text") return "Paragraph";
      if (mode === "code_block") return "Code";
      if (mode === "cover") return "Title";
      if (mode === "list_item") return "List";
      return null;
    }

    if (activeMode && map(activeMode)) {
      if (activeMode === "cover") {
        this.textMode.appendChild($$('.select-type', {href: "#", text: map(activeMode)}));
      } else {
        this.textMode.appendChild($$('a.select-type', {title: "Select text type", href: "#", html: map(activeMode) +' &nbsp;&nbsp;<i class="icon-caret-down"></i>'}));
        this.textMode.appendChild($$('.available-types', {
          children: [
            $$('a.text-type.text', {href: "#",  html: "Paragraph <span>⌃⌘P</span>", "data-type": "text"}),
            $$('a.text-type.heading-1', {href: "#", html: "Heading 1 <span>⌃⌘H</span>", "data-level": "1", "data-type": "heading"}),
            $$('a.text-type.heading-2', {href: "#", html: "Heading 2 <span></span>", "data-level": "2", "data-type": "heading"}),
            $$('a.text-type.heading-3', {href: "#", html: "Heading 3 <span></span>", "data-level": "3", "data-type": "heading"}),
            $$('a.text-type.blockquote', {href: "#", html: "Blockquote<span>⌃⌘B</span>", "data-type": "blockquote"}),
            $$('a.text-type.list-item', {href: "#", html: "List<span>⌃⌘L</span>", "data-level": "1", "data-type": "list_item"}),
            $$('a.text-type.code-block', {href: "#", html: "Code Block <span>⌃⌘C</span>", "data-type": "code_block"})
          ]
        }));
      }
    } else {
      this.textMode.appendChild($$('.select-type.disable', {href: "#", text: "No selection"}));
    }
  };

  // Based on the currently available actions
  // determined by WriterView.ToolbarAdapter, we enable or disable
  // the add content dropdown
  //
  // TODO: provide categorization for this.actions

  this.updateActions = function() {
    var doc = this.controller.parentAdapter.document;

    // This is set by the application object (see substance.js)
    if (doc.__dirty) {
      $(this.save).removeClass('disable');
    } else {
      $(this.save).addClass('disable');
    }

    if (doc.chronicle.canRedo()) {
      $(this.redo).removeClass('disable');
    } else {
      $(this.redo).addClass('disable');
    }

    if (doc.chronicle.canUndo()) {
      $(this.undo).removeClass('disable');
    } else {
      $(this.undo).addClass('disable');
    }

  };

  this.updateAnnotationToggles = function() {
    _.each(this.actions, function(a) {
      var el = this.controls[a.type];
      if (!el) {
        return;
      }
      switch (a.action) {
      case "deleteAnnotation":
        el.classList.add('active');
        break;
      }
      el.classList.remove("disable");
    }, this);

    _.each(this.tools, function(tool) {
      var el = this.controls[tool.name];

      if (tool.isEnabled(this.controller.parentAdapter)) {
        el.classList.remove('disable');
      } else {
        el.classList.add('disable');
      }

      if (tool.isActive(this.controller.parentAdapter)) {
        el.classList.add('active');
        el.classList.remove('disable');
      } else {
        el.classList.remove('active');
      }
    }, this);
  };

  this.annotate = function(type) {
    this.controller.annotate(type);
  };

  this.notImplemented = function() {
    console.error("Callback not implemented", arguments);
  };

  this.performAction = function(type) {
    var action = this.actions[type];
    if (action) {
      this.controller.parentAdapter.performAction(action);
      this.update();
    } else {
      console.error("No action available for", type);
    }
  };

  this.toggleSelectTextType = function(e) {
    this.$('.text-mode').toggleClass('active');
    e.preventDefault();
  };

  this.toggleInsertContent = function(e) {
    this.$('.insert-content').toggleClass('active');
    e.preventDefault();
  };

  this.changeTextType = function(e) {
    var targetType = $(e.currentTarget).attr('data-type');
    var data = {};
    if (targetType === "heading" || targetType === "list_item") {
      data.level = e.currentTarget.getAttribute("data-level");
      data.level = parseInt(data.level, 10);
    }
    this.controller.parentAdapter.switchNodeType(targetType, data);
    e.preventDefault();
    this.$('.text-mode').removeClass('active');
  };

  this.disableControls = function() {
    this.$('a.control').addClass('disable');
  };

};

ContentToolsView.Prototype.prototype = View.prototype;
ContentToolsView.prototype = new ContentToolsView.Prototype();
ContentToolsView.prototype.constructor = ContentToolsView;

module.exports = ContentToolsView;

},{"substance-application":10,"underscore":273}],51:[function(require,module,exports){
var keymap = {

  // Navigation
  // --------
  // add everything what changes the selection or the cursor
  //

  "selection": [
    "up", "down", "left", "right",
    "shift+up", "shift+down", "shift+left", "shift+right",
    "alt+up", "alt+down", "alt+left", "alt+right",
    "alt+shift+up", "alt+shift+down", "alt+shift+left", "alt+shift+right",
    "ctrl+shift+up", "ctrl+shift+down", "ctrl+shift+left", "ctrl+shift+right",
    "command+up", "command+down", "command+left", "command+right",
    "command+shift+up", "command+shift+down", "command+shift+left", "command+shift+right",
    "home", "end"
  ],

  "nop": [
    "ctrl+shift+alt+up", "ctrl+shift+alt+down", "ctrl+shift+alt+left", "ctrl+shift+alt+right"
  ],

  "special": [
    "special", "shift+special", "alt+special", "shift+alt+special"
  ],

  // Editing
  // --------

  "backspace": [
    // these are 'backspace' equivalents
    "backspace", "ctrl+backspace", "ctrl+shift+backspace", "ctrl+alt+backspace", "shift+backspace",
    // these have a different native behavior, which we do not support yet
    // instead we interpret them as a simple backspace
    "ctrl+shift+alt+backspace", // delete to word-boundary
    "alt+backspace", // delete to word-boundary#
    "alt+shift+backspace", // delete to word-boundary
    "command+backspace", "command+shift+backspace", // delete to begin of line
  ],

  "delete": [
    // delete equivalents
    "del", "shift+del",
    // these have a different native behavior, which we do not support yet
    // instead we interpret them as a simple backspace
    "alt+del", "shift+alt+del", // delete to next word boundary
    "ctrl+del", "ctrl+alt+del", // strange native behavior that we override
  ],

  "break": ["enter"],
  "soft-break": ["shift+enter"],

  // HACK: we have to erload the native whitespace input as it triggers
  // a scroll under MacOSX
  "blank": ["space", "shift+space"],

  "indent": ["tab"],
  "unindent": ["shift+tab"],
  "undo": ["command+z"],
  "redo": ["command+shift+z"],

  "copy": ["command+c"],
  "paste": ["command+v"],
  "cut": ["command+x"],

  "select-all": ["command+a"],

  // Annotations
  // --------

  "strong": ["ctrl+b", "command+b"],
  "emphasis": ["ctrl+i", "command+i"],

  // Content
  // --------
  "text": ["ctrl+command+p"],
  "heading": ["ctrl+command+h"],
  "list": ["ctrl+command+l"],
  "figref": ["ctrl+command+f"],
  "code_block": ["ctrl+command+c"],

  "save": ["command+s"],
  "new": ["command+n"],
  "reload": ["command+r"],

  "edit": ["command+alt+left"],
  "preview": ["command+alt+right"],

  //
  "clear": []
};

module.exports = keymap;

},{}],52:[function(require,module,exports){
var keymap = {

  // Navigation
  // --------
  // add everything what changes the selection or the cursor
  //

  "selection": [
    "up", "down", "left", "right",
    "shift+up", "shift+down", "shift+left", "shift+right",
    "ctrl+up", "ctrl+down", "ctrl+left", "ctrl+right",
    "ctrl+shift+up", "ctrl+shift+down", "ctrl+shift+left", "ctrl+shift+right",
    "home", "end", "pageup", "pagedown"
  ],

  // Editing
  // --------

  "backspace": ["backspace"],
  "delete": ["del"],
  "break": ["enter"],
  "soft-break": ["shift+enter"],

  "nop": [],

  "special": [
  ],

  // HACK: we have to overload the native whitespace input as it triggers
  // a scroll under MacOSX
  "blank": ["space", "shift+space"],

  "indent": ["tab"],
  "unindent": ["shift+tab"],
  "undo": ["ctrl+z"],
  "redo": ["ctrl+shift+z"],

  "copy": ["ctrl+c"],
  "paste": ["ctrl+v"],
  "cut": ["ctrl+x"],

  "select-all": ["ctrl+a"],

  // Annotations
  // --------

  "strong": ["ctrl+b"],
  "emphasis": ["ctrl+i"],

  // Content
  // --------
  "text": ["ctrl+shift+t"],
  "heading": ["ctrl+shift+h"],
  "figref": ["ctrl+shift+f"],
  "list": ["ctrl+shift+l"],
  "code_block": ["ctrl+shift+c"],

  "save": ["ctrl+s"],
  "new": ["ctrl+alt+n"],
  "reload": ["ctrl+r"],
  "clear": ["ctrl+alt+backspace"]
};

module.exports = keymap;

},{}],53:[function(require,module,exports){
var AddHyperLinkTool = require('./tools/add_hyper_link_tool');

var tools = [
  new AddHyperLinkTool()
];

module.exports = tools;

},{"./tools/add_hyper_link_tool":117}],54:[function(require,module,exports){
"use strict";

var ToggleResourceReference = require('./workflows/toggle_resource_reference');
var AddHyperLink = require('./workflows/add_hyper_link');
var EditAnnotationRange = require('./workflows/edit_annotation_range');

var workflows = {
  "toggle_resource_reference": new ToggleResourceReference(),
  "add_hyper_link": new AddHyperLink(),
  "edit_annotation_range": new EditAnnotationRange(),
};

module.exports = workflows;

},{"./workflows/add_hyper_link":118,"./workflows/edit_annotation_range":119,"./workflows/toggle_resource_reference":120}],55:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Article = require("substance-article");
var ArrayOperation = require("substance-operator").ArrayOperation;

// NOTE: we see here what is a minimal document implementation based on Substance.Article

var __id__ = 0;

var EditableArticle = function(options) {
  options = options || {};

  this.__id__ = __id__++;
  options.nodeTypes = _.extend({}, EditableArticle.nodeTypes, options.nodeTypes);

  Article.call(this, options);

  // Find all reference types from schema
  // We should introduce a 'reference' parent type that is shared among all specific types
  // Then we don't need to touch this code here all the time
  this.addIndex("references", {
    types: ["figure_reference", "person_reference", "remark_reference", "error_reference", "citation_reference", "block_reference", "location_reference", "definition_reference", "subject_reference"],
    property: "target"
  });

  // TEMPORARY: inserting an index for annotation fragments
  // This is only a temporary solution to provide a fixture
  // for multi-node annotations
  this.addIndex("multi_annotations", {
    types: ["multi_annotation"],
    property: "container"
  });

  this.addIndex("annotation_fragments", {
    types: ["annotation_fragment"],
    property: "annotation_id"
  });

  // HACK: run this.get() on all nodes to have all nodes as rich
  // objects
  _.each(this.nodes, function(node) {
    this.get(node.id);
  }, this);

  // HACK: preparing all multi-annotations
  _.each(this.getIndex('multi_annotations').get('content'), function(anno) {
    anno.addFragments({
      document: this,
      apply: this.apply.bind(this)
    });
  }, this);
};

EditableArticle.Prototype = function() {

  var __super__ = Article.prototype;

  // EXPERIMENTAL: retrieve all fragments of a multi-node annotation
  this.getAnnotationFragments = function(annotationId) {
    return this.getIndex("annotation_fragments").get(annotationId);
  };

  this.getFileSize = function() {
    var fileSize = JSON.stringify(this.toJSON()).length;
    var fileIndex = this.getIndex("files");
    _.each(fileIndex.nodes, function(fileId) {
      var file = this.get(fileId);
      fileSize += file.getSize();
    }, this);
    return fileSize;
  };

  // Publish settings
  // ---------------

  this.createSettings = function(pubSettings) {
    var settingsFile = this.get("publish_settings.json");

    if (settingsFile) {
      var settings = settingsFile.getData();
      _.extend(settings, pubSettings);
    } else {
      var file = this.create({
        id: "publish_settings.json",
        type: "file",
        content_type: "application/json",
        version: 0
      });
      file.setData(JSON.stringify(pubSettings));
    }
  };

  this.getSettings = function() {
    var settingsFile = this.get("publish_settings.json");
    if (settingsFile) {
      return settingsFile.getData();
    } else {
      return {
        "templateId": "substance",
        "params": {}
      };
    }
  };

  this.destroySettings = function() {
    // Delete file from document
    this.delete("publish_settings.json");
  };

  // Overriding Article.delete to be able to delete a reference target
  // if it has no reference left (reference counting)
  this.delete = function(nodeId) {

    var val = this.get(nodeId);

    // Note: some things must be deleted before the actual node gets deleted...
    // E.g., If you create a contributor you add it to the authors aftwards.
    // Backwards, you should remove them first and then delete the contributor node
    // remove deleted contributors from document.authors
    if (val.type === "contributor") {
      var diff = ArrayOperation.Delete(this.authors, val.id);
      this.update(["document", "authors"], diff);
    }

    __super__.delete.call(this, nodeId);

    // TODO: Implement isReference method based on the schema somewhere
    if (val.target) {
      var refdNodeId = val.target;
      var refIndex = this.getIndex("references");

      var refs = refIndex.get(refdNodeId);
      var refCount = Object.keys(refs).length;

      // HACK: don't know which panel the referenced resource is in,
      // so removing it from all
      if (refCount === 0 && this.get(refdNodeId)) {
        this.hide("citations", refdNodeId);
        this.hide("remarks", refdNodeId);
        // this.hide("errors", refdNodeId);
        // this.hide("content", nodeId);
        __super__.delete.call(this, refdNodeId);
      }
    } else if (val.type === "figure") {
      __super__.delete.call(this, val.image);
    } else if (val.type === "video") {

      if (val.poster) {
        __super__.delete.call(this, val.poster);
      }

      _.each(val.files, function(fileId) {
        __super__.delete.call(this, fileId);
      }, this);

    } else if (val.type === "audio") {

      _.each(val.files, function(fileId) {
        __super__.delete.call(this, fileId);
      }, this);

    } else if (val.type === "web_page") {
      __super__.delete.call(this, val.file);
    }
  };

  this.fromSnapshot = function(data, options) {
    return EditableArticle.fromSnapshot(data, options);
  };

  this.newInstance = function() {
    return new EditableArticle({ "schema": this.schema });
  };

  // TODO: maybe we should move this into document.js or article.js?
  this.toJSON = function() {
    var res = __super__.toJSON.call(this);
    // remove all annotation fragments from the serialized
    // data, as these are only used internally
    _.each(res.nodes, function(node) {
      if (node.type === "annotation_fragment") {
        delete res.nodes[node.id];
      }
    });
    return res;
  };

};

// Customizations:
// ----

var nodeTypes = _.clone(Article.nodeTypes);
var extensions = require("./nodes");

// Use editable node types
_.each(extensions, function(extension, name) {
  nodeTypes[name] = _.extend({}, nodeTypes[name], extension);
});

EditableArticle.nodeTypes = nodeTypes;

EditableArticle.fromSnapshot = function(data, options) {
  options = options || {};
  options.seed = data;
  return new EditableArticle(options);
};

EditableArticle.ViewFactory = Article.ViewFactory;

EditableArticle.Prototype.prototype = Article.prototype;
EditableArticle.prototype = new EditableArticle.Prototype();
EditableArticle.prototype.constructor = EditableArticle;

module.exports = EditableArticle;

},{"./nodes":88,"substance-article":17,"substance-operator":250,"underscore":273}],56:[function(require,module,exports){
"use strict";

var CompositeEditor = require("./composite_editor");

// The AudioEditor allows to edit only the label and the caption.
// --------

var AudioEditor = function(factory) {
  CompositeEditor.call(this, factory);

  this.textComponents = {
    "label": true
  };
  this.subComponents = {
    "caption": true
  };
};


AudioEditor.Prototype = function() {};
AudioEditor.Prototype.prototype = CompositeEditor.prototype;
AudioEditor.prototype = new AudioEditor.Prototype();

module.exports = AudioEditor;

},{"./composite_editor":60}],57:[function(require,module,exports){
"use strict";

var TextNodeEditor = require("./text_node_editor");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;
var util = require("substance-util");

var BlockquoteEditor = function(factory) {
  this.factory = factory;
  this.breakType = "text";
};

BlockquoteEditor.Prototype = function() {

  this.breakNode = function(session, component, charPos) {
    var node = component.root;
    var text = node.content;
    var nodePos = component.rootPos;

    var newNode = {
      id: util.uuid()
    };

    var insertPos;
    var tail = "";

    // Create a new blockquote node if the cursor is at the beginning of the current node
    // Note: this behavior is inspired by LibreOffice Writer.
    if (charPos === 0 && node.content.length > 0) {
      newNode.type = "blockquote";
      newNode.content = "";
      insertPos = nodePos;
    }

    // Break the blockquote and put the tail into a text node
    else {
      tail = text.substring(charPos);

      newNode.type = "text";
      newNode.content = tail;

      insertPos = nodePos+1;
    }

    // create the node
    session.document.apply(ObjectOperation.Create([newNode.id], newNode));
    if (tail.length > 0) {
      session.document.apply(ObjectOperation.Update([node.id, "content"], TextOperation.Delete(charPos, tail), "string"));
      session.annotator.transferAnnotations(node, charPos, newNode);
    }
    // and show in the view
    session.document.show(session.view, newNode.id, insertPos);
    session.selection.set([component.pos+1,0]);
  };

  this.changeType = function(session, node, component, newType, data) {
    // if (newType === "blockquote") {
    //   // if (node.level === data.level) {
    //   //   return;
    //   // }
    //   // session.document.apply(ObjectOperation.Set([node.id, "level"], node.level, data.level));
    //   return;
    // }

    var newNode = {
      id: util.uuid(),
      type: newType
    };


    if (newType === "blockquote") {
      // if just the level changes do not create a new node and all the other stuff
      // newNode.level = data.level;
    }

    newNode.content = node.content;

    this._replaceNode(session, node, newNode, component.rootPos);
  };

  this.canIndent = function(session, component, direction) {
    return false;
    // var node = component.root;
    // return (direction === "right" && node.level < 3) || (direction === "left" && node.level > 0);
  };

  this.indent = function(session, component, direction) {
    // Do nothing
    // var node = component.root;
    // var newLevel = node.level;
    // if (direction === "left") {
    //   newLevel = Math.max(1, newLevel-1);
    // } else {
    //   newLevel += 1;
    // }
    // session.document.set([node.id, "level"], newLevel);
  };

};

BlockquoteEditor.Prototype.prototype = TextNodeEditor.prototype;
BlockquoteEditor.prototype = new BlockquoteEditor.Prototype();

module.exports = BlockquoteEditor;

},{"./text_node_editor":74,"substance-operator":250,"substance-util":268}],58:[function(require,module,exports){
"use strict";

var NotEditable = require("./not_editable");
var WebResourceEditor = require("./web_resource_editor");
var TextNodeEditor = require("./text_node_editor");

var CitationsEditorFactory = function() {

  this.createEditor = function(node) {
    switch(node.type) {
    case "web_resource":
      return new WebResourceEditor(this);
    case "text":
      return new TextNodeEditor(this);
    default:
      return new NotEditable(this);
    }
  };
};

module.exports = CitationsEditorFactory;

},{"./not_editable":71,"./text_node_editor":74,"./web_resource_editor":77}],59:[function(require,module,exports){
"use strict";

var TextNodeEditor = require("./text_node_editor");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;

var TAB_SIZE = 2;
var TAB = "";
for (var i = 0; i < TAB_SIZE.length; i++) {
  TAB[i] = " ";
}

var CodeBlockEditor = function(factory) {
  this.factory = factory;
};

CodeBlockEditor.Prototype = function() {

  this.breakNode = function(session, component, charPos) {
    // breaks are softbreak in codeblocks
    session.document.apply(ObjectOperation.Update(component.path, TextOperation.Insert(charPos, "\n"), "string"));
    session.selection.set([component.pos, charPos+1]);
  };

  this.canIndent = function(/*session, component, direction*/) {
    return false;
  };

  this.indent = function(/*session, component, direction*/) {
    // TODO implement indentation
    // - retrieve the current line start
    // - insert a tab at the beginning
    // - or remove two spaces (if possible)
  };

};

CodeBlockEditor.Prototype.prototype = TextNodeEditor.prototype;
CodeBlockEditor.prototype = new CodeBlockEditor.Prototype();

module.exports = CodeBlockEditor;

},{"./text_node_editor":74,"substance-operator":250}],60:[function(require,module,exports){
"use strict";

var NotEditable = require("./not_editable");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;

// A basic implementation that is shared by all editors for nodes
// which are compoisites: E.g., contributor, figure, issue, webresource...
var CompositeEditor = function(factory) {
  this.factory = factory;

  this.textComponents = {};
  this.subComponents = {};
  this.__componentEditors__ = {};
};

CompositeEditor.Prototype = function() {

  this.__getEditor__ = function(session, component) {
    if (!this.__componentEditors__[component.name]) {
      var node = session.document.get(component.path[0]);
      this.__componentEditors__[component.name] = this.factory.createEditor(node);
    }
    return this.__componentEditors__[component.name];
  };

  this.canDeleteContent = function(session, component, startChar, endChar) {
    if (this.textComponents[component.name]) {
      return true;
    } else if (this.subComponents[component.name]) {
      var componentEditor = this.__getEditor__(session, component);
      return componentEditor.canDeleteContent(session, component, startChar, endChar);
    }
    return false;
  };

  this.__deleteTextishContent = function(session, component, startChar, endChar) {
    var path = component.path;
    var prop = session.document.resolve(path);
    var text = prop.get();
    var diffOp = TextOperation.Delete(startChar, text.substring(startChar, endChar));
    var op = ObjectOperation.Update(path, diffOp, "string");
    session.document.apply(op);
    session.annotator.update(op);
  };

  this.__delegateDelete = function(session, component, startChar, endChar) {
    var componentEditor = this.__getEditor__(session, component);
    componentEditor.deleteContent(session, component, startChar, endChar);
  };

  this.deleteContent = function(session, component, startChar, endChar) {
    if (this.textComponents[component.name]) {
      this.__deleteTextishContent(session, component, startChar, endChar);
      return true;
    } else if (this.subComponents[component.name]) {
      this.__delegateDelete(session, component, startChar, endChar);
      return true;
    }
    return false;
  };

  this.canInsertContent = function(session, component, charPos) {
    if (this.textComponents[component.name]) {
      return true;
    } else if (this.subComponents[component.name]) {
      var componentEditor = this.__getEditor__(session, component);
      return componentEditor.canInsertContent(session, component, charPos);
    }
    return false;
  };

  this.__insertTextishContent = function(session, component, charPos, text) {
    var path = component.path;
    var diffOp = TextOperation.Insert(charPos, text);
    var op = ObjectOperation.Update(path, diffOp, "string");
    session.document.apply(op);
    session.annotator.update(op);
  };

  this.delegateInsert = function(session, component, charPos, text) {
    var componentEditor = this.__getEditor__(session, component);
    componentEditor.insertContent(session, component, charPos, text);
  };

  this.insertContent = function(session, component, charPos, text) {
    if (this.textComponents[component.name]) {
      this.__insertTextishContent(session, component, charPos, text);
      return true;
    } else if (this.subComponents[component.name]) {
      this.delegateInsert(session, component, charPos, text);
      return true;
    }
    return false;
  };

  this.canAnnotate = function(session, component, type, range) {
    if (this.textComponents[component.name]) {
      return true;
    } else if (this.subComponents[component.name]) {
      var componentEditor = this.__getEditor__(session, component);
      return componentEditor.canAnnotate(session, component, type, range);
    }
    return false;
  };

  this.annotate = function(session, component, type, range, data) {
    if (this.textComponents[component.name]) {
      var path = component.path;
      var anno = {
        type: type,
        path: path,
        range:range
      };
      session.document.annotate(anno, data);
      return true;
    } else if (this.subComponents[component.name]) {
      var componentEditor = this.__getEditor__(session, component);
      componentEditor.annotate(session, component, type, range, data);
      return true;
    }

    return false;
  };

};

CompositeEditor.Prototype.prototype = NotEditable.prototype;
CompositeEditor.prototype = new CompositeEditor.Prototype();

module.exports = CompositeEditor;

},{"./not_editable":71,"substance-operator":250}],61:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var ArrayOperation = Operator.ArrayOperation;

// Editor for the Text panel
// --------
// This is a container editor specifically built for the the two panel editor.
// It preserves the first element which *should be* the Cover node.
// All other nodes are free to be moved and deleted.
//
var ContentViewEditor = function(factory) {
  this.factory = factory;
  this.view = "content";
};

ContentViewEditor.Prototype = function() {

  // // TODO: this is currently not used... why?
  // this.canInsertNode = function(session, node, nodePos) {
  //   return (nodePos >= 1 && nodePos <= this._length(session));
  // };

  // // TODO: this is currently not used... why?
  // this.insertNode = function(session, node, nodePos) {
  //   if (nodePos === 0 || nodePos > this._length(session)) {
  //     return false;
  //   }
  //   session.document.show(this.view, node.id, nodePos);
  // };

  this.canDeleteNode = function(session, node) {
    var nodePos = this._nodePos(session, node.id);
    return (nodePos >= 1 && nodePos < this._length(session));
  };

  // EXPERIMENTAL:
  // in certain cases it is important that there is a trailing text node
  // (or one that breaks into a text node) to avoid a lock-in.
  this.ensureLastNode = function(session) {
    var lastComponent = session.container.last();
    var lastNode = lastComponent.root;

    // node types that allow a way to break into a text node
    var validTypes = {
      "text": true,
      "heading": true,
      "list_item": true
    };

    if (!validTypes[lastNode.type]) {
      var newNode = {
        type: "text",
        id: util.uuid("text_"),
        content: ""
      }
      session.document.create(newNode);
      session.document.show(this.view, newNode.id);
    }
  };

  this.deleteNode = function(session, node) {
    var nodePos = this._nodePos(session, node.id);

    var diffOp = ArrayOperation.Delete(nodePos, node.id);
    session.document.apply(ObjectOperation.Update([this.view, "nodes"], diffOp));

    // We have to ensure that the document contains at least one text node
    // otherwise editing would not be possible anymore
    if (this._length(session) === 1) {
      var textNode = {
        type: "text",
        id: "text_"+util.uuid(),
        content: ""
      };
      session.document.create(textNode);
      session.document.show(this.view, textNode.id);
    }
  };

  this._length = function(session) {
    return session.document.nodes[this.view].nodes.length;
  };

  this._nodeId = function(session, pos) {
    return session.document.nodes[this.view].nodes[pos];
  };

  this._nodePos = function(session, nodeId) {
    return session.document.nodes[this.view].nodes.indexOf(nodeId);
  };

};

ContentViewEditor.prototype = new ContentViewEditor.Prototype();

module.exports = ContentViewEditor;

},{"substance-operator":250,"substance-util":268}],62:[function(require,module,exports){
"use strict";

var CompositeEditor = require("./composite_editor");

// The ContributorEditor allows to edit only the label and the caption.
// --------
var ContributorEditor = function(factory) {
  CompositeEditor.call(this, factory);
  this.textComponents = {
    "name": true,
    "description": true,
    "email": true
  };
};

ContributorEditor.Prototype = function() {};
ContributorEditor.Prototype.prototype = CompositeEditor.prototype;
ContributorEditor.prototype = new ContributorEditor.Prototype();

module.exports = ContributorEditor;

},{"./composite_editor":60}],63:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var NotEditable = require("./not_editable");
var CompositeEditor = require("./composite_editor");

// The CoverEditor allows only to edit the title.
// --------
var CoverEditor = function(factory) {
  CompositeEditor.call(this, factory);

  this.textComponents = {
    "title": true,
    "abstract": true,
    "abstract_en": true
  };
};

CoverEditor.Prototype = function() {

  this.canBreak = function(session, component, charPos) {
    if (charPos === component.length) {
      return true;
    }
    return false;
  };

  this.breakNode = function(session, component, charPos) {
    // insert a new text node before the image
    var textNode = {
      id: util.uuid("text_"),
      type: "text",
      content: ""
    };
    session.document.create(textNode);
    session.document.show(session.container.name, textNode.id, 1);
    session.selection.set(session.container.first(textNode.id));
    return true;
  };

};
CoverEditor.Prototype.prototype = CompositeEditor.prototype;
CoverEditor.prototype = new CoverEditor.Prototype();

module.exports = CoverEditor;

},{"./composite_editor":60,"./not_editable":71,"substance-util":268}],64:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var CompositeEditor = require("./composite_editor");

// The FigureEditor allows to edit only the label and the caption.
// --------
var FigureEditor = function(factory) {
  CompositeEditor.call(this, factory);

  this.textComponents = {
    "label": true
  };
  this.subComponents = {
    "caption": true
  };
};

FigureEditor.Prototype = function() {

  this.canBreak = function(session, component, charPos) {
    if (component.name === "image" && charPos === 0) {
      return true;
    }
    return false;
  };

  this.breakNode = function(session, component, charPos) {
    // insert a new text node before the image
    if (component.name === "image" && charPos === 0) {
      var textNode = {
        id: util.uuid("text_"),
        type: "text",
        content: ""
      };
      var pos = component.pos;
      session.document.create(textNode);
      session.document.show(session.container.name, textNode.id, component.rootPos);
      session.selection.set([pos+1, 0]);
      return true;
    }

    throw new Error("Nope.");
  };

};

FigureEditor.Prototype.prototype = CompositeEditor.prototype;
FigureEditor.prototype = new FigureEditor.Prototype();

module.exports = FigureEditor;

},{"./composite_editor":60,"substance-util":268}],65:[function(require,module,exports){
"use strict";

var NotEditable = require("./not_editable");
var FigureEditor = require("./figure_editor");
var TextNodeEditor = require("./text_node_editor");

var FiguresEditorFactory = function() {

  this.createEditor = function(node) {
    switch(node.type) {
    case "figure":
      return new FigureEditor(this);
    case "text":
      return new TextNodeEditor(this);
    default:
      return new NotEditable(this);
    }
  };

};

module.exports = FiguresEditorFactory;


},{"./figure_editor":64,"./not_editable":71,"./text_node_editor":74}],66:[function(require,module,exports){
"use strict";

var TextNodeEditor = require("./text_node_editor");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;
var util = require("substance-util");


var HeadingEditor = function(factory) {
  this.factory = factory;
  this.breakType = "text";
};

HeadingEditor.Prototype = function() {

  this.breakNode = function(session, component, charPos) {
    var node = component.root;
    var text = node.content;
    var nodePos = component.rootPos;

    var newNode = {
      id: util.uuid()
    };

    var insertPos;
    var tail = "";

    // Create a new heading node if the cursor is at the beginning of the current node
    // Note: this behavior is inspired by LibreOffice Writer.
    if (charPos === 0 && node.content.length > 0) {
      newNode.type = "heading";
      newNode.level = node.level;
      newNode.content = "";
      insertPos = nodePos;
    }

    // Break the heading and put the tail into a text node
    else {
      tail = text.substring(charPos);

      newNode.type = "text";
      newNode.content = tail;

      insertPos = nodePos+1;
    }

    // create the node
    session.document.apply(ObjectOperation.Create([newNode.id], newNode));
    if (tail.length > 0) {
      session.document.apply(ObjectOperation.Update([node.id, "content"], TextOperation.Delete(charPos, tail), "string"));
      session.annotator.transferAnnotations(node, charPos, newNode);
    }
    // and show in the view
    session.document.show(session.view, newNode.id, insertPos);
    session.selection.set([component.pos+1,0]);
  };

  this.changeType = function(session, node, component, newType, data) {
    if (newType === "heading") {
      if (node.level === data.level) {
        return;
      }
      session.document.apply(ObjectOperation.Set([node.id, "level"], node.level, data.level));
      return;
    }

    var newNode = {
      id: util.uuid(),
      type: newType
    };


    if (newType === "heading") {
      // if just the level changes do not create a new node and all the other stuff
      newNode.level = data.level;
    }

    newNode.content = node.content;

    this._replaceNode(session, node, newNode, component.rootPos);
  };

  this.canIndent = function(session, component, direction) {
    var node = component.root;
    return (direction === "right" && node.level < 3) || (direction === "left" && node.level > 0);
  };

  this.indent = function(session, component, direction) {
    var node = component.root;
    var newLevel = node.level;
    if (direction === "left") {
      newLevel = Math.max(1, newLevel-1);
    } else {
      newLevel += 1;
    }
    session.document.set([node.id, "level"], newLevel);
  };

};

HeadingEditor.Prototype.prototype = TextNodeEditor.prototype;
HeadingEditor.prototype = new HeadingEditor.Prototype();

module.exports = HeadingEditor;

},{"./text_node_editor":74,"substance-operator":250,"substance-util":268}],67:[function(require,module,exports){
"use strict";

var NotEditable = require("./not_editable");
var ContributorEditor = require("./contributor_editor");

var InfosEditorFactory = function() {

  this.createEditor = function(node) {
    switch(node.type) {
    case "contributor":
      return new ContributorEditor(this);
    default:
      return new NotEditable(this);
    }
  };

};

module.exports = InfosEditorFactory;


},{"./contributor_editor":62,"./not_editable":71}],68:[function(require,module,exports){
"use strict";

var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;
var CompositeEditor = require("./composite_editor");

// The IssueEditor
// --------
//

var IssueEditor = function(factory) {
  CompositeEditor.call(this, factory);

  this.textComponents = {
    "title": true,
    "description": true
  };
};

IssueEditor.Prototype = function() {

  this.canBreak = function(session, component, charPos) {
    var N = component.length;
    return charPos <= N;
  };

  this.breakNode = function(session, component, charPos) {
    // breaks are softbreak in issues
    session.document.apply(ObjectOperation.Update(component.path, TextOperation.Insert(charPos, "\n"), "string"));
    session.selection.set([component.pos, charPos+1]);
  };

};
IssueEditor.Prototype.prototype = CompositeEditor.prototype;
IssueEditor.prototype = new IssueEditor.Prototype();

module.exports = IssueEditor;

},{"./composite_editor":60,"substance-operator":250}],69:[function(require,module,exports){
"use strict";

var NotEditable = require("./not_editable");
var IssueEditor = require("./issue_editor");

var IssuesEditorFactory = function() {

  this.createEditor = function(node) {
    switch(node.type) {
    case "error":
    case "remark":
      return new IssueEditor(this);
    default:
      return new NotEditable(this);
    }
  };
};

module.exports = IssuesEditorFactory;

},{"./issue_editor":68,"./not_editable":71}],70:[function(require,module,exports){
"use strict";

var TextNodeEditor = require("./text_node_editor");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;
var util = require("substance-util");


var ListItemEditor = function(factory) {
  this.factory = factory;
  this.breakType = "text";
};

ListItemEditor.Prototype = function() {

  this.breakNode = function(session, component, charPos) {
    var node = component.root;
    var text = node.content;
    var nodePos = component.rootPos;

    var newNode;

    // If you break an empty list node it will replace it with a text node
    if (component.length === 0) {
      newNode = {
        type: "text",
        id: util.uuid("text_"),
        content: ""
      };
      // remove the list item node
      session.document.hide(session.view, node.id);
      session.document.delete(node.id);
      // add and show the text node
      session.document.create(newNode);
      session.document.show(session.view, newNode.id, component.rootPos);
      // set the cursor
      session.selection.set([component.pos,0]);

    } else {
      var tail = text.substring(charPos);
      newNode = {
        id: util.uuid("list_item_"),
        type: "list_item",
        content: tail,
        level: node.level
      };

      // create the node
      session.document.apply(ObjectOperation.Create([newNode.id], newNode));
      if (tail.length > 0) {
        session.document.apply(ObjectOperation.Update(component.path, TextOperation.Delete(charPos, tail), "string"));
        session.annotator.transferAnnotations(node, charPos, newNode);
      }
      // and show in the view
      var insertPos = nodePos+1;
      session.document.show(session.view, newNode.id, insertPos);
      // set the cursor
      session.selection.set([component.pos+1,0]);
    }

  };


  this.canIndent = function(session, component, direction) {
    var node = component.root;
    return (direction === "right" && node.level < 4) || (direction === "left" && node.level > 0);
  };

  this.indent = function(session, component, direction) {
    var node = component.root;
    var newLevel = node.level;
    if (direction === "left") {
      newLevel = Math.max(1, newLevel-1);
    } else {
      newLevel += 1;
    }
    session.document.set([node.id, "level"], newLevel);
  };

};

ListItemEditor.Prototype.prototype = TextNodeEditor.prototype;
ListItemEditor.prototype = new ListItemEditor.Prototype();

module.exports = ListItemEditor;

},{"./text_node_editor":74,"substance-operator":250,"substance-util":268}],71:[function(require,module,exports){
"use strict";

var NotEditable = function(factory) {
  this.factory = factory;
};

NotEditable.Prototype = function() {
  /* jshint unused:false */

  // Component operations

  this.canDeleteContent = function(session, component, startChar, endChar) {
    return false;
  };
  this.deleteContent = function(session, component, startChar, endChar) {
    throw new Error("Nope.");
  };
  this.canInsertContent = function(session, component, charPos) {
    return false;
  };
  this.insertContent = function(session, component, charPos, text) {
    throw new Error("Nope.");
  };
  this.canIndent = function(session, component, charPos) {
    return false;
  };
  this.indent = function(session, component, charPos) {
    throw new Error("Nope.");
  };
  this.canAnnotate = function(session, component, type, range) {
    return false;
  };
  this.annotate = function(session, component, type, range, data) {
    throw new Error("Nope.");
  };

  // Node operations

  this.canBreak = function(session, component, charPos) {
    return false;
  };
  this.breakNode = function(session, component, charPos) {
    throw new Error("Nope.");
  };

  this.canChangeType = function(session, node, newType) {
    return false;
  };
  this.changeType = function(session, node, nodePos, newType, data) {
    throw new Error("Nope.");
  };
  this.canJoin = function(session, node, other) {
    return false;
  };
  this.join = function(session, node, other) {
    throw new Error("Nope.");
  };
  this.copy = function(nodeSelection, document) {
  };
};

NotEditable.prototype = new NotEditable.Prototype();

module.exports = NotEditable;

},{}],72:[function(require,module,exports){
"use strict";

var _ = require("underscore");

// Annotations for the Richtext Editor
// =========
//
// Note: This whole class is an EXPERIMENT. It works as a prototype eventually to get to a clear specification.
//
// Mutual exclusivity:
//    there are certain annotation types which are mutually exclusive,
//    e.g., if something is annotated as 'code' it can't be 'math' at the same time.
//    In this prototype I used groups to describe that.
//    However, we might take a different approach later, e.g., it could be possible to
//    combine strong and superscript, but not strong and math.
//    Markers can be placed over bold.
//
// Annotation data:
//    E.g., links do have an URL data field. This data needs a default value
//    which should be provided by the node implementation.
//
// Annotation with automatic content:
//    E.g., figure references will come with an automatically generated label.
//    In contrast to other annotations, they can be inserted without having
//    a (range) selection.

var RichtextAnnotator = function() {
};

RichtextAnnotator.Prototype = function() {

  var _annoGroups = {
    "figure_reference": "ref",
    "citation_reference": "ref",
    "contributor_reference": "ref",
    "location_reference": "ref",
    "person_reference": "ref",
    "subject_reference": "ref",
    "definition_reference": "ref",
    "emphasis": "expression",
    "strong": "expression",
    "subscript": "expression",
    "superscript": "expression",
    "code": "expression",
    "math": "expression",
    "remark_reference": "marker",
    "error_reference": "marker"
  };

  var _annoTypes = [];
  var _groups = {};
  _.each(_annoGroups, function(group, type) {
    _annoTypes.push(type);
    _groups[group] = _groups[group] || [];
    _groups[group].push(type);
  });


  // Returns a list of allowed actions
  // --------
  //
  // Actions:
  //   - `{ 'annotate', type, data }`
  //   - `{ 'delete', id }`

  this.getAllowedActions = function(session, selection) {
    var actions = [];

    if (selection.isNull()) {
      return actions;
    }

    // For now: Multi-Node selections are completely ignored.
    // However, it could make sense to open that selectively
    // E.g. create fig/cit ref -> involves a deletion first.
    if (selection.hasMultipleNodes()) {
      return actions;
    }

    var annotations = session.annotator.getAnnotations(selection);

    if (annotations.length === 0 && selection.isCollapsed()) {
      return [];
    }

    var count = 0;

    // group the given annotations by their group id.
    var groups = {};
    _.each(_groups, function(g, name) {
      groups[name] = [];
    });
    _.each(annotations, function(anno) {
      var groupId = _annoGroups[anno.type];
      if (!groupId) return;
      var group = groups[groupId];
      if (group) {
        group.push(anno);
        count++;
      }
    });

    if (count > 0) {

      // Note: for the time being I decided to implement a simple behavior: annotations can
      // only be toggled not truncated. It is not really clear how a good consistent behavior
      // would look like. So I'd like to wait for beta testing and stick to a trivial approach.

      _.each(annotations, function(anno) {
        // only add an action if the group has only one item selected
        var groupId = _annoGroups[anno.type];
        if (!groupId) return;
        if (groups[groupId].length > 1) {
          return;
        }
        actions.push({
          action: "deleteAnnotation",
          type: anno.type,
          id: anno.id
        });
      }, this);

      // Here we control which annotations can be combined
      // currently we only allow to mix markers with others, but only one marker type.
      if (!selection.isCollapsed() && groups["marker"].length === 0) {
        _.each(_groups["marker"], function(type) {
          actions.push({
            action: "createAnnotation",
            type: type
          });
        });
      }

    } else {
      var types;

      types = _annoTypes;

      _.each(types, function(type) {
        var action = {
          action: "createAnnotation",
          type: type
        };
        actions.push(action);
      });
    }

    return actions;
  };

};

RichtextAnnotator.prototype = new RichtextAnnotator.Prototype();

module.exports = RichtextAnnotator;

},{"underscore":273}],73:[function(require,module,exports){
"use strict";

var TextNodeEditor = require("./text_node_editor");
var HeadingEditor = require("./heading_editor");
var BlockquoteEditor = require("./blockquote_editor");
var NotEditable = require("./not_editable");
var ContentViewEditor = require("./content_view_editor");
var CoverEditor = require("./cover_editor");
var RichtextAnnotator = require("./richtext_annotator");
var ListItemEditor = require("./list_item_editor");
var FigureEditor = require("./figure_editor");
var WebPageEditor = require("./web_page_editor");
var VideoEditor = require("./video_editor");
var AudioEditor = require("./audio_editor");
var CodeBlockEditor = require("./code_block_editor");

var RichtextEditorFactory = function(/*document*/) {

  this.annotator = new RichtextAnnotator();

  this.createEditor = function(node) {
    switch(node.type) {
    case "text":
      return new TextNodeEditor(this);
    case "code_block":
      return new CodeBlockEditor(this);
    case "heading":
      return new HeadingEditor(this);
    case "blockquote":
      return new BlockquoteEditor(this);
    case "cover":
      return new CoverEditor(this);
    case "figure":
      return new FigureEditor(this);
    case "web_page":
      return new WebPageEditor(this);
    case "video":
      return new VideoEditor(this);
    case "audio":
      return new AudioEditor(this);
    case "list_item":
      return new ListItemEditor(this);
    case "view":
      if (node.id === "content") {
        return new ContentViewEditor(this);
      } else {
        return new NotEditable(this);
      }
      break;
    default:
      return new NotEditable(this);
    }
  };

  this.getAnnotator = function() {
    return this.annotator;
  };
};

module.exports = RichtextEditorFactory;

},{"./audio_editor":56,"./blockquote_editor":57,"./code_block_editor":59,"./content_view_editor":61,"./cover_editor":63,"./figure_editor":64,"./heading_editor":66,"./list_item_editor":70,"./not_editable":71,"./richtext_annotator":72,"./text_node_editor":74,"./video_editor":75,"./web_page_editor":76}],74:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;
var util = require("substance-util");

var TextNodeEditor = function(factory) {
  this.factory = factory;
};

TextNodeEditor.Prototype = function() {

  this.canDeleteContent = function(session, component, startChar, endChar) {
    var N = component.length;
    return startChar <= N && endChar <= N;
  };

  this.deleteContent = function(session, component, startChar, endChar) {
    var property = session.document.resolve(component.path);
    var content = property.get();
    var len = endChar - startChar;
    if (len > 0) {
      var diffOp = TextOperation.Delete(startChar, content.substring(startChar, endChar));
      var op = ObjectOperation.Update(component.path, diffOp, "string");

      // ATTENTION update the annotation first so that the inverse can work to
      session.annotator.update(op);
      session.document.apply(op);
    }
  };

  this.canInsertContent = function(session, component, charPos) {
    var N = component.length;
    return charPos <= N;
  };

  this.insertContent = function(session, component, charPos, text) {
    var diffOp = TextOperation.Insert(charPos, text);
    var op = ObjectOperation.Update(component.path, diffOp, "string");

    // ATTENTION update the annotation first so that the inverse can work to
    session.annotator.update(op);
    session.document.apply(op);
  };

  this.canAnnotate = function(/*session, component, type, range*/) {
    return true;
  };

  this.annotate = function(session, component, type, range, data) {
    var path = component.path;
    session.document.annotate({
      type: type,
      path: path,
      range:range
    }, data);
  };

  this.canBreak = function(session, component, charPos) {
    var N = component.length;
    return charPos <= N;
  };

  this.breakNode = function(session, component, charPos) {
    var property = session.document.resolve(component.path);
    var text = property.get();
    var tail = text.substring(charPos);
    var nodePos = component.rootPos;

    var newNode = {
      id: util.uuid(),
      type: "text",
      content: tail
    };

    // Note: to be able to transfer annotations without deleting them we need do this
    // in the following order:
    // 1. Create a node with the trailing text
    // 2. Break and transfer annotations
    // 3. Truncate

    session.document.apply(ObjectOperation.Create([newNode.id], newNode));
    if (tail.length > 0) {
      session.annotator.transferAnnotations(property.node, charPos, newNode);
      session.document.apply(ObjectOperation.Update(component.path, TextOperation.Delete(charPos, tail), "string"));
    }
    session.document.show(session.view, newNode.id, nodePos+1);
    session.selection.set([component.pos+1,0]);
  };

  this.canChangeType = function(/*session, node, newType*/) {
    return false;
  };

  this.canChangeType = function(session, node, newType) {
    var newNodeStub = new session.document.nodeTypes[newType].Model();
    var textNodeCtor = session.document.nodeTypes['text'].Model;
    return (newNodeStub instanceof textNodeCtor);
  };

  this._replaceNode = function(session, node, newNode, nodePos) {

    session.document.hide(session.view, node.id);
    session.document.apply(ObjectOperation.Create([newNode.id], newNode));
    session.annotator.transferAnnotations(node, 0, newNode);
    session.document.apply(ObjectOperation.Delete([node.id], node.toJSON()));
    session.document.show(session.view, newNode.id, nodePos);
  };

  this.changeType = function(session, node, component, newType, data) {
    if (node.type === newType) {
      return;
    }
    var newNode = {
      id: newType+"_"+util.uuid(),
      type: newType,
      content: node.content
    };
    _.extend(newNode, data);

    this._replaceNode(session, node, newNode, component.nodePos);
  };

  this.canJoin = function(session, node, other) {
    return (other instanceof session.document.nodeTypes["text"].Model);
  };

  this.join = function(session, node, other) {
    if (!other.content) {
      throw new Error("Currently only text and heading nodes can be joined.");
    }

    var text = other.content;
    var insertPos = node.content.length;

    var diffOp = TextOperation.Insert(insertPos, text);
    var op = ObjectOperation.Update([node.id, "content"], diffOp, "string");

    session.document.apply(op);
    session.annotator.transferAnnotations(other, 0, node, insertPos);
  };

  this.copy = function(nodeSelection, document) {
    var node = nodeSelection.node;
    var range = nodeSelection.ranges[0];
    var copy = node.toJSON();
    copy.content = node.content.substring(range.start, range.end);
    document.create(copy);
    document.show("content", copy.id);
  };
};

TextNodeEditor.prototype = new TextNodeEditor.Prototype();

module.exports = TextNodeEditor;

},{"substance-operator":250,"substance-util":268,"underscore":273}],75:[function(require,module,exports){
"use strict";

var CompositeEditor = require("./composite_editor");

// The VideoEditor allows to edit only the label and the caption.
// --------
var VideoEditor = function(factory) {
  CompositeEditor.call(this, factory);

  this.textComponents = {
    "label": true
  };
  this.subComponents = {
    "caption": true
  };
};

VideoEditor.Prototype = function() {};

VideoEditor.Prototype.prototype = CompositeEditor.prototype;
VideoEditor.prototype = new VideoEditor.Prototype();

module.exports = VideoEditor;

},{"./composite_editor":60}],76:[function(require,module,exports){
"use strict";

var CompositeEditor = require("./composite_editor");

// The WebPageEditor allows to edit only the label and the caption.
// --------
var WebPageEditor = function(factory) {
  CompositeEditor.call(this, factory);

  this.textComponents = {
    "label": true
  };
  this.subComponents = {
    "caption": true
  };
};

WebPageEditor.Prototype = function() {};

WebPageEditor.Prototype.prototype = CompositeEditor.prototype;
WebPageEditor.prototype = new WebPageEditor.Prototype();

module.exports = WebPageEditor;

},{"./composite_editor":60}],77:[function(require,module,exports){
"use strict";

var CompositeEditor = require("./composite_editor");

// The WebResourceEditor
// --------
//

var WebResourceEditor = function(factory) {
  CompositeEditor.call(this, factory);
  this.textComponents = {
    "title": true,
    "url": true,
    "description": true
  };
};

WebResourceEditor.Prototype = function() {};

WebResourceEditor.Prototype.prototype = CompositeEditor.prototype;
WebResourceEditor.prototype = new WebResourceEditor.Prototype();

module.exports = WebResourceEditor;

},{"./composite_editor":60}],78:[function(require,module,exports){
"use strict";

var NodeSurface = require("../node").Surface;
var TextSurface = require("../text").Surface;

var AudioSurface = function(node, surfaceProvider) {
  NodeSurface.call(this, node, surfaceProvider);

  if (this.node.caption) {
    this.captionComponent = TextSurface.textProperty(this, "caption", {
      // override the property path pointing to the caption's content
      path: [this.node.caption, "content"]
    });
    this.components.push(this.captionComponent);
  }
};

AudioSurface.Prototype = function() {
  var __super__ = NodeSurface.prototype;

  this.attachView = function(view) {
    __super__.attachView.call(this, view);
    // this.labelComponent.surface.attachView(this.view.childViews["label"]);
    if (this.captionComponent) this.captionComponent.surface.attachView(this.view.childViews["caption"]);
  };
};
AudioSurface.Prototype.prototype = NodeSurface.prototype;
AudioSurface.prototype = new AudioSurface.Prototype();

module.exports = AudioSurface;

},{"../node":92,"../text":94}],79:[function(require,module,exports){
"use strict";

var $$ = require ("substance-application").$$;
var _ = require("underscore");
var NodeView = require("../node").View;
var util = require("substance-util");
// TODO: this should derive from FigureView and share as much as possible

var EditableAudioView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  this.childViews = {
    "label": null,
    "caption": null
  };
};

EditableAudioView.Prototype = function() {

  // Rendering
  // =============================
  //

  this.render = function() {

    NodeView.prototype.render.call(this);

    // We don't need the label for the simple composer

    // Resource body
    // --------
    //
    // Wraps all resource details

    this.audioEl = $$("audio", {
      "controls": true
    });

    this.audioWrapper = $$('.audio-wrapper', {
      contenteditable: false,
      children: [
        this.audioEl
      ]
    });

    this.content.appendChild(this.audioWrapper);

    var caption = this.node.getCaption();
    if (caption) {
      this.captionView = this.viewFactory.createView(caption, {
        property: "caption",
        propertyPath: [caption.id, "content"]
      });
      this.childViews["caption"] = this.captionView;
      var captionEl = this.captionView.render().el;
      captionEl.classList.add('caption');
      this.content.appendChild(captionEl);
    }

    var audioStatus = $$(".audio-status", {
      contenteditable: false,
      children: [
        $$('.file-info', {html: [
          '<span class="mp3" title="iPhone, iPad, Safari, Chrome, Internet Explorer (can\'t be played in Composer due to licensing issues)">MP3 <span class="file-size"></span></span>',
          '<span class="ogg" title="Chrome, Firefox, Opera">Ogg <span class="file-size"></span></span>',
          '<span class="wav" title="Chrome, Firefox, Opera">Wav <span class="file-size"></span></span>',
          '<span class="info"><a href="http://substance.io/composer/user-manual/#heading_3dea3851c4f239c3d43dd46219b2d370" target="_blank"><i class="icon-question-sign"></i> Help</a></span>'
        ].join('')}),
        $$('.actions', {
          children: [
            $$('a.replace', {
              href: "#", html: '<i class="icon-upload-alt"></i> Replace',
              'data-id': this.node.id
            }),
            $$('a.delete-resource', {href: "#", html: '<i class="icon-trash"></i> Delete'})
          ]
        })
      ]
    });

    this.content.appendChild(audioStatus);
    this.updateAudio();

    return this;
  };


  this.updateAudio = function() {
    var audioFiles = this.node.getAudioFiles();

    // TODO: Figure out how to detect when an audio file has been loaded
    // The WriterView listens for resource-ready events to update
    // the outline (smart scrollbar) and active section

    this.audioEl.onloadeddata = function() {
      console.log('AUDIO LOADED');
      // that.node.document.trigger("resource-ready");
    };

    this.audioEl.innerHTML = "";

    this.$('.file-info .active').removeClass('active');
    this.$('.file-info .file-size').html('');

    _.each(audioFiles, function(audioFile) {
      var blob = audioFile.getBlob();
      var url = window.URL.createObjectURL(blob);

      var fileSize = util.getReadableFileSizeString(blob.size);

      if (audioFile.content_type === "audio/mp3" || audioFile.content_type === "audio/mpeg") {

        this.audioEl.appendChild($$('source', {src: url, type: "audio/mpeg"}));
        this.$('.file-info .mp3').addClass('active');
        this.$('.file-info .mp3 .file-size').html(fileSize);
      } else if (audioFile.content_type === "audio/ogg") {
        this.audioEl.appendChild($$('source', {src: url, type: "audio/ogg"}));
        this.$('.file-info .ogg').addClass('active');
        this.$('.file-info .ogg .file-size').html(fileSize);
      } else if (audioFile.content_type === "audio/wav") {
        this.audioEl.appendChild($$('source', {src: url, type: "audio/wav"}));
        this.$('.file-info .wav').addClass('active');
        this.$('.file-info .wav .file-size').html(fileSize);
      }
    }, this);
  };

  // Updates image src when figure is updated by ImageUrlEditor
  // --------
  //

  this.onNodeUpdate = function(/*op*/) {
    this.updateAudio();
  };

  this.onGraphUpdate = function(op) {
    if (NodeView.prototype.onGraphUpdate.call(this, op)) return;
    var fileId = this.node.file;
    if (op.path[0] === fileId) {
      this.updateAudio();
    }
  };
};

EditableAudioView.Prototype.prototype = NodeView.prototype;
EditableAudioView.prototype = new EditableAudioView.Prototype();

module.exports = EditableAudioView;

},{"../node":92,"substance-application":10,"substance-util":268,"underscore":273}],80:[function(require,module,exports){
"use strict";

module.exports = {
  View: require('./editable_audio_view'),
  Surface: require('./audio_surface')
};

},{"./audio_surface":78,"./editable_audio_view":79}],81:[function(require,module,exports){

"use strict";

var NodeSurface = require("../node").Surface;
var TextSurface = require("../text").Surface;

// NOTE: this is just *experimental* and will change for sure.

var CitationSurface = function(node, surfaceProvider) {
  NodeSurface.call(this, node, surfaceProvider);

  this.components.push(this.titleComponent());
  for (var i = 0; i < node.authors.length; i++) {
    this.components.push(this.authorComponent(i));
  }
  this.components.push(this.sourceComponent());
};
CitationSurface.Prototype = function() {

  this.titleComponent = function() {
    var self = this;

    // TODO: it is not very convenient to create a Text sub-surface for a textish property:
    var titleSurface = new TextSurface(this.node, this.surfaceProvider, { property: "title" });
    var titleComponent = titleSurface.components[0];
    titleComponent.element(function() {
        return self.view.childViews["title"].el;
      })
      .length(function() {
        // HACK: somehow we need a plus one here... dunno
        return self.node.title.length + 1;
      });
    titleComponent.name = "title";
    return titleComponent;
  };

  this.authorComponent = function(i) {
    var self = this;

    // TODO: it is not very convenient to create a Text sub-surface for a textish property:
    var authorComponent = this.customComponent([this.node.id, "author"+i], {name: "author"})
      .element(function() {
        return self.view.authorEls[i];
      })
      .length(function() {
        // HACK: somehow we need a plus one here... dunno
        return self.node.authors[i].length;
      })
      .mapping(function(charPos) {
        var range = window.document.createRange();
        range.setStart(this.el.childNodes[0], charPos);
        return range;
      });
    return authorComponent;
  };

  this.sourceComponent = function() {
    var self = this;

    var sourceComponent = this.customComponent([this.node.id, "source"], {name: "source"});
    sourceComponent.element(function() {
        return self.view.sourceEl;
      })
      .length(function() {
        // HACK: somehow we need a plus one here... dunno
        return self.node.source.length + 1;
      })
      .mapping(function(charPos) {
        var range = window.document.createRange();
        range.setStart(this.el.childNodes[0], charPos);
        return range;
      });
    return sourceComponent;
  };
};
CitationSurface.Prototype.prototype = NodeSurface.prototype;
CitationSurface.prototype = new CitationSurface.Prototype();

module.exports = CitationSurface;

},{"../node":92,"../text":94}],82:[function(require,module,exports){
"use strict";

var NodeView = require("../node").View;
var TextView = require("../text").View;

var $$ = require("substance-application").$$;

// TODO: this should derive from CitationView and share as much as possible

var EditableCitationView = function(node) {
  NodeView.call(this, node);

  this.$el.attr({id: node.id});
  this.$el.addClass('citation');

  this.childViews = {
    "title": null
  };
};


EditableCitationView.Prototype = function() {

  this.render = function() {
    NodeView.prototype.render.call(this);

    var frag = window.document.createDocumentFragment(),
        node = this.node;

    // TODO: rename this to title*
    var titleView = this.childViews["title"] = new TextView(this.node, this.viewFactory, {property: "title"});
    frag.appendChild(titleView.render().el);


    // Delete Button
    // --------

    var deleteButton = $$('a.delete-resource', {
      href: '#',
      text: "Delete",
      contenteditable: false // Make sure this is not editable!
    });

    titleView.el.appendChild(deleteButton);


    // Resource body
    // --------
    //
    // Wraps all resource details

    var bodyEl = $$('.resource-body');

    // Add Authors
    // -------

    this.authorEls = [];
    var authorsEl = $$('.authors');
    for (var i = 0; i < node.authors.length; i++) {
      var author = node.authors[i];
      this.authorEls.push($$('span.author', {
        text: author,
        "data-path": "author"+i
      }));
      authorsEl.appendChild(this.authorEls[i]);
      authorsEl.appendChild(window.document.createTextNode(" "));
    }
    bodyEl.appendChild(authorsEl);

    // Add Source
    // -------
    var source = [];

    if (node.source && node.volume) {
      source.push([node.source, node.volume].join(', ')+": ");
    }

    if (node.fpage && node.lpage) {
      source.push([node.fpage, node.lpage].join('-')+", ");
    }

    if (node.publisher_name && node.publisher_location) {
      source.push([node.publisher_name, node.publisher_location].join(', ')+", ");
    }

    if (node.year) {
      source.push(node.year);
    }

    this.sourceEl = $$('.source', {
      html: source.join(''),
      // "data-path": "source"
    });
    bodyEl.appendChild(this.sourceEl);

    // Add DOI (if available)
    // -------

    if (node.doi) {
      this.doiEl = $$('.doi', {
        children: [
          $$('b', {text: "DOI: "}),
          $$('a', {
            href: node.doi,
            target: "_new",
            text: node.doi
          })
        ]
      });
      bodyEl.appendChild(this.doiEl);
    }

    frag.appendChild(bodyEl);

    this.content.appendChild(frag);

    return this;
  };
};

EditableCitationView.Prototype.prototype = NodeView.prototype;
EditableCitationView.prototype = new EditableCitationView.Prototype();
EditableCitationView.prototype.constructor = EditableCitationView;

module.exports = EditableCitationView;

},{"../node":92,"../text":94,"substance-application":10}],83:[function(require,module,exports){
"use strict";

module.exports = {
  View: require('./editable_citation_view'),
  Surface: require("./citation_surface")
};

},{"./citation_surface":81,"./editable_citation_view":82}],84:[function(require,module,exports){
"use strict";

var NodeSurface = require("../node").Surface;
var TextSurface = require("../text").Surface;

var CoverSurface = function(node, surfaceProvider) {
  NodeSurface.call(this, node, surfaceProvider);

  this.titleComponent = TextSurface.textProperty(this, "title", {
    property: "title",
    path: ["document", "title"]
  });
  this.components.push(this.titleComponent);

  this.abstractComponent = TextSurface.textProperty(this, "abstract", {
    property: "abstract",
    path: ["document", "abstract"]
  });
  this.components.push(this.abstractComponent);

  this.englishAbstractComponent = TextSurface.textProperty(this, "abstract_en", {
    property: "abstract_en",
    path: ["document", "abstract_en"]
  });
  this.components.push(this.englishAbstractComponent);
};

CoverSurface.Prototype = function() {
  var __super__ = NodeSurface.prototype;
  this.attachView = function(view) {
    __super__.attachView.call(this, view);
    this.titleComponent.surface.attachView(this.view.childViews["title"]);
    this.abstractComponent.surface.attachView(this.view.childViews["abstract"]);
    this.englishAbstractComponent.surface.attachView(this.view.childViews["abstract_en"]);
  };
};
CoverSurface.Prototype.prototype = NodeSurface.prototype;
CoverSurface.prototype = new CoverSurface.Prototype();

module.exports = CoverSurface;

},{"../node":92,"../text":94}],85:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var $$ = require("substance-application").$$;
var $ = window.$;
var Annotator = require("substance-document").Annotator;

var NodeView = require("../node").View;
var TextView = require("../text").View;
var util = require("substance-util");

// TODO: this should derive from CoverView and share as much as possible

var EditableCoverView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  this.$el.attr({id: node.id});
  this.$el.addClass("content-node cover");

  this.childViews = {
    "title": null
  };

  this.$el.on('click', ".control.next", _.bind(this.nextDay, this));
  this.$el.on('click', ".control.prev", _.bind(this.prevDay, this));
  this.$el.on('click', ".actions .delete", _.bind(this.deleteImage, this));
};


var ONE_DAY = (24 * 60 * 60 * 1000);

EditableCoverView.Prototype = function() {

  this.render = function() {
    NodeView.prototype.render.call(this);

    // Image
    // -------

    this.imgEl = $$('img');

    // We don't need this in archivist
    // this.imagePlaceholder = $$('.image-placeholder', {
    //   contenteditable: false,
    //   children: [
    //     $$('a.add-image.cover', {
    //       href: "#",
    //       html: '<i class="icon-picture"></i> Add Cover Image',
    //       'data-path': 'cover.image'
    //     })
    //   ]
    // });

    // this.content.appendChild(this.imagePlaceholder);
    this.updateImage();

    this.imageEl = $$('.cover-image', {
      contenteditable: false,
      children: [
        this.imgEl,
        $$(".image-status", {
          children: [
            $$('.file-info', {text: ""}),
            $$('.actions', {
              children: [
                // Note: add a handler for 'click' on '.image-status .actions .replace'
                // to the embedding view (e.g., see WriterView) to implement the replace action
                $$('a.replace', {href: "#", html: '<i class="icon-upload-alt"></i> Replace',
                  'data-path': 'cover.image'
                }),
                $$('a.delete', {href: "#", html: '<i class="icon-trash"></i> Delete'})
              ]
            })
          ]
        })
      ]
    });

    this.content.appendChild(this.imageEl);
    this.pubDateEl = $$('.date', {});

    // if (this.node.document.published_on) {
    //   this.content.appendChild($$('.published-on', {
    //     contenteditable: false,
    //     children: [
    //       this.pubDateEl,
    //       $$('a.control.prev', {href: '#', html: '<i class="icon-caret-left"></i>'}),
    //       $$('a.control.next', {href: '#', html: '<i class="icon-caret-right"></i>'})
    //     ]
    //   }));
    // }

    // TODO: how could we simplify this? E.g., a helper to create a TextView for a delegated string property.
    var titleView = new TextView(this.node, this.viewFactory, {property: "title" , propertyPath: ["document", "title"]});
    titleView.listenTo(this.node.document, "operation:applied", titleView.onGraphUpdate);
    this.content.appendChild(titleView.render().el);
    titleView.el.classList.add("title");

    this.renderPublicationDate();

    var abstractView = new TextView(this.node, this.viewFactory, {property: "abstract", propertyPath: ["document", "abstract"]});
    abstractView.listenTo(this.node.document, "operation:applied", abstractView.onGraphUpdate);
    this.content.appendChild(abstractView.render().el);
    abstractView.el.classList.add("abstract");

    var englishAbstractView = new TextView(this.node, this.viewFactory, {property: "abstract_en", propertyPath: ["document", "abstract_en"]});
    englishAbstractView.listenTo(this.node.document, "operation:applied", englishAbstractView.onGraphUpdate);
    this.content.appendChild(englishAbstractView.render().el);
    englishAbstractView.el.classList.add("abstract");


    this.childViews["title"] = titleView;
    this.childViews["abstract"] = abstractView;
    this.childViews["abstract_en"] = englishAbstractView;

    return this;
  };

  this.deleteImage = function(e) {
    this.node.deleteImage();
    e.preventDefault();
    e.stopPropagation();
  };

  this.updateImage = function() {
    var url = this.node.getUrl();
    var that = this;

    if (!url) {
      $(this.imagePlaceholder).removeClass('hidden');
      $(this.imgEl).addClass('hidden');
    } else {
      $(this.imagePlaceholder).addClass('hidden');
      $(this.imgEl).removeClass('hidden');
      this.imgEl.setAttribute("src", url);

      this.imgEl.onload = function() {
        var imgBlob = that.node.getBlob();
        var fileSize = util.getReadableFileSizeString(imgBlob.size);
        that.$('.file-info').html([
          that.imgEl.naturalWidth,
          "x",
          that.imgEl.naturalHeight,
          ", ",
          fileSize
        ]);
      };
    }
  };

  this.renderPublicationDate = function() {
    var pubDatStr = new Date(this.node.document.published_on).toDateString();
    this.pubDateEl.innerHTML = pubDatStr;
  };


  this.nextDay = function(e) {
    var doc = this.node.document;
    var day = new Date(doc.published_on);
    var nextDay = new Date(day.getTime() + ONE_DAY);
    doc.setPublishedOn(nextDay);
    e.preventDefault();
  };

  this.prevDay = function(e) {
    var doc = this.node.document;

    var day = new Date(doc.published_on);
    var prevDay = new Date(day.getTime() - ONE_DAY);

    doc.setPublishedOn(prevDay);
    e.preventDefault();
  };

  this.onNodeUpdate = function(op) {
    // TODO: do we really need to call updateImage on every op on this node?
    this.updateImage();
    return NodeView.prototype.onNodeUpdate.call(this, op);
  };

  this.onGraphUpdate = function(op) {
    // Call super handler and return if that has processed the operation already
    if (NodeView.prototype.onGraphUpdate.call(this, op)) {
      return true;
    }

    // When cover images has changed, update image url
    var fileId = this.node.image;
    if (op.path[0] === fileId) {
      this.updateImage();
    }

    // When published date has changed, rerender
    if (_.isEqual(op.path, ["document","published_on"])) {
      this.renderPublicationDate();
      return true;
    }

    // Otherwise deal with annotation changes
    // Note: the annotations do not get attached to ["document", "title"],
    // as it seems strange to annotate a property which is used in such an indirect way
    if (Annotator.changesAnnotations(this.node.document, op, ["cover", "title"])) {
      //console.log("Rerendering TextView due to annotation update", op);
      this.childViews["title"].renderContent();
      return true;
    }

    if (Annotator.changesAnnotations(this.node.document, op, ["cover", "abstract"])) {
      //console.log("Rerendering TextView due to annotation update", op);
      this.childViews["abstract"].renderContent();
      return true;
    }

    if (Annotator.changesAnnotations(this.node.document, op, ["cover", "abstract_en"])) {
      //console.log("Rerendering TextView due to annotation update", op);
      this.childViews["abstract_en"].renderContent();
      return true;
    }

    return false;
  };
};

EditableCoverView.Prototype.prototype = NodeView.prototype;
EditableCoverView.prototype = new EditableCoverView.Prototype();

module.exports = EditableCoverView;

},{"../node":92,"../text":94,"substance-application":10,"substance-document":136,"substance-util":268,"underscore":273}],86:[function(require,module,exports){
"use strict";

module.exports = {
  View: require('./editable_cover_view'),
  Surface: require("./cover_surface")
};

},{"./cover_surface":84,"./editable_cover_view":85}],87:[function(require,module,exports){
"use strict";

module.exports = {
  View: require("../issue/editable_issue_view"),
  Surface: require("../issue/issue_surface")
};

},{"../issue/editable_issue_view":89,"../issue/issue_surface":91}],88:[function(require,module,exports){
"use strict";

module.exports = {
  "node": require("./node"),
  "text": require("./text"),
  "cover": require("./cover"),
  "citation": require("./citation"),
  "issue": require("./issue"),
  "web_resource": require("./web_resource"),
  "web_page": require("./web_page"),
  "video": require("./video"),
  "audio": require("./audio"),
  "remark": require("./remark"),
  "error": require("./error")
};

},{"./audio":80,"./citation":83,"./cover":86,"./error":87,"./issue":90,"./node":92,"./remark":93,"./text":94,"./video":96,"./web_page":99,"./web_resource":102}],89:[function(require,module,exports){
"use strict";

var $$ = require ("substance-application").$$;
var NodeView = require("../node").View;
var TextView = require("../text").View;

// TODO: this should derive from IssueView and share as much as possible

var EditableIssueView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  // This class is shared among all issue subtypes (errors, remarks)
  this.$el.addClass('issue');

  this.childViews = {
    "title": null,
    "description": null
  };
};

EditableIssueView.Prototype = function() {

  var __super__ = NodeView.prototype;

  this._updateTitle = function() {
    // var refs = this.node.getReferences();
    // this.ref = refs[Object.keys(refs)[0]];

    this.titleTextEl.innerHTML = "";

    if (this.ref) {
      this.titleTextEl.appendChild($$('span.title-annotation', {
        text: this.ref.getContent()
      }));
    }
  };

  // Rendering
  // =============================
  //

  this.render = function() {
    NodeView.prototype.render.call(this);

    //Note: we decided to render the text of the reference instead of
    //the title property
    // this.childViews["title"] = new TextView(this.node, this.viewFactory, {property: "title"});
    // var titleView = this.childViews["title"];
    // this.content.appendChild(titleView.render().el);
    // var deleteButton = $$('a.delete-resource', {
    //   href: '#',
    //   text: "Delete",
    //   contenteditable: false // Make sure this is not editable!
    // });
    // titleView.el.appendChild(deleteButton);
    // titleView.el.setAttribute("contenteditable", "false");

    //Note: we decided to render the text of the reference instead of
    //the title property
    var titleViewEl = $$('div.issue-title-wrapper.toggle-resource');
    this.titleTextEl = $$('.text.title', {
      // children: [$$('span.title-annotation', {text: "meeh"})]
    });

    // this.titleTextEl = $$('.text.title');

    var deleteButton = $$('a.delete-resource', {
      href: '#',
      html: '<i class="icon-remove-sign"></i>',
      contenteditable: false // Make sure this is not editable!
    });

    titleViewEl.appendChild(this.titleTextEl);
    titleViewEl.appendChild(deleteButton);
    titleViewEl.setAttribute("contenteditable", "false");
    this.content.appendChild(titleViewEl);

    var descriptionView = this.childViews["description"] = new TextView(this.node, this.viewFactory, {property: "description"});
    this.content.appendChild(descriptionView.render().el);


    // Creator and date
    // --------

    // var creator = $$('div.creator', {
    //   // ATTENTION: when run in node-webkit we have to pass the Date as window.Date
    //   // as timeago uses 'instanceof' which would not work with a node.Date
    //   // see https://github.com/rogerwang/node-webkit/wiki/Differences-of-JavaScript-contexts
    //   text: "Created "+jQuery.timeago(new window.Date(this.node.created_at)),
    //   contenteditable: false // Make sure this is not editable!
    // });

    // this.content.appendChild(creator);

    var refs = this.node.getReferences();
    var refIds = Object.keys(refs);
    if (refIds.length > 0) {
      this.ref = refs[refIds[0]];
      this._updateTitle();
    }

    return this;
  };

  this.onNodeUpdate = function(op) {
    // HACK: solving problems with the order of compound operations by
    // using window.setTimeout
    var childView = null;
    if (op.path[1] === "title") {
      childView = this.childViews["title"];
    } else if (op.path[1] === "description") {
      childView = this.childViews["description"];
    }
    if (childView) {
      childView.onNodeUpdate(op);
      return true;
    } else {
      return false;
    }
  };

  // HACK: solving problems with the order of compound operations by
  // using window.setTimeout. See issue #251
  this.onGraphUpdate = function(op) {
    if (__super__.onGraphUpdate.call(this, op)) {
      return true;
    }
    // Hack: lazily detecting references to this issue
    // by *only* checking 'create' ops with an object having this node as target
    else if (op.type === "create" && op.val["target"] === this.node.id) {
      this.ref = this.node.document.get(op.val.id);
      this.later(this._updateTitle);
      return true;
    }
    // ... the same in inverse direction...
    else if (op.type === "delete" && op.val["target"] === this.node.id) {
      this.ref = null;
      this.later(this._updateTitle);
      return true;
    }
    else if (this.ref && op.path[0] === this.ref.id) {
      this.later(this._updateTitle);
      return true;
    }
    else {
      return false;
    }
  };

};


EditableIssueView.Prototype.prototype = NodeView.prototype;
EditableIssueView.prototype = new EditableIssueView.Prototype();

module.exports = EditableIssueView;

},{"../node":92,"../text":94,"substance-application":10}],90:[function(require,module,exports){
"use strict";

module.exports = {
  View: require("./editable_issue_view"),
  Surface: require("./issue_surface")
};

},{"./editable_issue_view":89,"./issue_surface":91}],91:[function(require,module,exports){
"use strict";

var NodeSurface = require("../node").Surface;
var TextSurface = require("../text").Surface;

var IssueSurface = function(node, surfaceProvider) {
  NodeSurface.call(this, node, surfaceProvider);
  this.descriptionComp = TextSurface.textProperty(this, "description");
  this.components.push(this.descriptionComp);
};

IssueSurface.Prototype = function() {
  var __super__ = NodeSurface.prototype;

  this.attachView = function(view) {
    __super__.attachView.call(this, view);
    this.descriptionComp.surface.attachView(this.view.childViews["description"]);
  };
};

IssueSurface.Prototype.prototype = NodeSurface.prototype;
IssueSurface.prototype = new IssueSurface.Prototype();

module.exports = IssueSurface;

},{"../node":92,"../text":94}],92:[function(require,module,exports){
"use strict";

var nodes = require("substance-nodes");

module.exports = nodes['node'];

},{"substance-nodes":149}],93:[function(require,module,exports){
module.exports=require(87)
},{"../issue/editable_issue_view":89,"../issue/issue_surface":91,"c:\\Users\\Oliver\\projects\\substance\\tmp\\archivist\\node_modules\\substance-composer\\src\\nodes\\error\\index.js":87}],94:[function(require,module,exports){
"use strict";

var nodes = require("substance-nodes");

module.exports = nodes["text"];

},{"substance-nodes":149}],95:[function(require,module,exports){
"use strict";

var $ = window.$;
var $$ = require ("substance-application").$$;
var _ = require("underscore");
var NodeView = require("../node").View;
var util = require("substance-util");

// TODO: this should derive from FigureView and share as much as possible

var EditableVideoView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  this.childViews = {
    "label": null,
    "caption": null
  };


};

EditableVideoView.Prototype = function() {

  // Rendering
  // =============================
  //

  this.render = function() {
    var self = this;

    NodeView.prototype.render.call(this);

    // We don't need the label for the simple composer

    // Resource body
    // --------
    //
    // Wraps all resource details

    this.videoEl = $$("video", {
      "controls": true
    });

    this.videoWrapper = $$('.video-wrapper', {
      contenteditable: false,
      children: [
        this.videoEl,
        $$(".video-status", {
          children: [
            $$('.file-info', {html: [
              '<span class="mp4" title="iPhone, iPad, Safari, Chrome, Internet Explorer (can\'t be played in Composer due to licensing issues)">MP4 <span class="file-size"></span></span>',
              '<span class="ogg" title="Chrome, Firefox, Opera">Ogg <span class="file-size"></span></span>',
              '<span class="webm" title="Chrome, Firefox, Opera">WebM <span class="file-size"></span></span>',
              '<span class="info"><a href="http://substance.io/composer/user-manual/#heading_2ff4a51b4539e184e47ad3b6c1f1efb9" target="_blank"><i class="icon-question-sign"></i> Help</a></span>'
            ].join('')}),
            $$('.actions', {
              children: [
                $$('a.replace', {href: "#", html: '<i class="icon-upload-alt"></i> Replace',
                  'data-id': this.node.id
                }),
                $$('a.delete-resource', {href: "#", html: '<i class="icon-trash"></i> Delete'})
              ]
            })
          ]
        })
      ]
    });

    this.content.appendChild(this.videoWrapper);
    this.updateVideo();

    var that = this;
    var caption = this.node.getCaption();
    if (caption) {
      this.captionView = this.viewFactory.createView(caption, {
        property: "caption",
        propertyPath: [caption.id, "content"]
      });
      this.childViews["caption"] = this.captionView;
      var captionEl = this.captionView.render().el;
      captionEl.classList.add('caption');
      this.content.appendChild(captionEl);
    }
    return this;
  };

  this.updatePoster = function() {
    if (this.node.poster) {
      var posterFile = this.node.document.get(this.node.poster);
      var posterURL = window.URL.createObjectURL(posterFile.getBlob());
      this.videoEl.setAttribute("poster", posterURL);
    } else {
      this.videoEl.setAttribute("poster", "");
    }
  };

  this.updateVideo = function() {
    var videoFiles = this.node.getVideoFiles();

    // TODO: Figure out how to detect when a video has been loaded
    // The WriterView listens for resource-ready events to update
    // the outline (smart scrollbar) and active section
    this.videoEl.onload = function() {
      // that.node.document.trigger("resource-ready");
    };

    this.videoEl.innerHTML = "";
    this.$('.file-info .active').removeClass('active');
    this.$('.file-info .file-size').html('');

    _.each(videoFiles, function(videoFile) {
      var blob = videoFile.getBlob();
      var url = window.URL.createObjectURL(blob);
      var fileSize = util.getReadableFileSizeString(blob.size);

      if (videoFile.content_type === "video/mp4") {
        this.videoEl.appendChild($$('source', {src: url, type: "video/mp4; codecs='avc1.42E01E, mp4a.40.2'"}));
        this.$('.file-info .mp4').addClass('active');
        this.$('.file-info .mp4 .file-size').html(fileSize);
      } else if (videoFile.content_type === "video/webm") {
        this.videoEl.appendChild($$('source', {src: url, type: "video/webm"}));
        this.$('.file-info .webm').addClass('active');
        this.$('.file-info .webm .file-size').html(fileSize);
      } else if (videoFile.content_type === "video/ogg") {
        this.videoEl.appendChild($$('source', {src: url, type: "video/ogg"}));
        this.$('.file-info .ogg').addClass('active');
        this.$('.file-info .ogg .file-size').html(fileSize);
      }
    }, this);
  };

  // Updates image src when figure is updated by ImageUrlEditor
  // --------
  //

  this.onNodeUpdate = function(op) {
    if (op.path[1] === "poster") {
      this.updatePoster();
    } else if (op.path[1] === "files") {
      this.updateVideo();
    }
  };

  // this.onGraphUpdate = function(op) {
  //   if (NodeView.prototype.onGraphUpdate.call(this, op)) return;
  //   var fileId = this.node.file;
  //   if (op.path[0] === fileId) {
  //     this.updateVideo();
  //   }
  // };
};

EditableVideoView.Prototype.prototype = NodeView.prototype;
EditableVideoView.prototype = new EditableVideoView.Prototype();

module.exports = EditableVideoView;

},{"../node":92,"substance-application":10,"substance-util":268,"underscore":273}],96:[function(require,module,exports){
"use strict";

module.exports = {
  View: require('./editable_video_view'),
  Surface: require('./video_surface')
};

},{"./editable_video_view":95,"./video_surface":97}],97:[function(require,module,exports){
"use strict";

var NodeSurface = require("../node").Surface;
var TextSurface = require("../text").Surface;

var VideoSurface = function(node, surfaceProvider) {
  NodeSurface.call(this, node, surfaceProvider);

  if (this.node.caption) {
    this.captionComponent = TextSurface.textProperty(this, "caption", {
      // override the property path pointing to the caption's content
      path: [this.node.caption, "content"]
    });
    this.components.push(this.captionComponent);
  }
};

VideoSurface.Prototype = function() {
  var __super__ = NodeSurface.prototype;

  this.attachView = function(view) {
    __super__.attachView.call(this, view);
    // this.labelComponent.surface.attachView(this.view.childViews["label"]);
    if (this.captionComponent) this.captionComponent.surface.attachView(this.view.childViews["caption"]);
  };
};
VideoSurface.Prototype.prototype = NodeSurface.prototype;
VideoSurface.prototype = new VideoSurface.Prototype();

module.exports = VideoSurface;

},{"../node":92,"../text":94}],98:[function(require,module,exports){
"use strict";

var $ = window.$;
var $$ = require ("substance-application").$$;

var NodeView = require("../node").View;
var util = require("substance-util");
var _ = require("underscore");

// TODO: this should derive from FigureView and share as much as possible

var EditableWebPageView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  this.childViews = {
    "label": null,
    "caption": null
  };

  this.$el.on('click', ".actions .replace", _.bind(this.replaceFile, this));
};


EditableWebPageView.Prototype = function() {

  this.replaceFile = function(e) {
    this.$('.web-page-file').click();
    e.preventDefault();
    e.stopPropagation();
  };

  // Rendering
  // =============================
  //

  this.render = function() {

    NodeView.prototype.render.call(this);

    // We don't need the label for the simple composer

    // var labelView = this.childViews["label"] = new TextView(this.node, this.viewFactory, {property: "label"});
    // this.content.appendChild(labelView.render().el);

    // Resource body
    // --------
    //
    // Wraps all resource details

    this.iFrame = $$("iframe", {});

    // Prepares blobs etc. for the image

    // Add graphic (img element)
    // this.pageWrapper = $$('.page-wrapper', {
    //   contenteditable: false,
    //   children: [
    //     $$("input.web-page-file", {type: "file", name: "files", "data-id": this.node.id }),
    //     this.iFrame
    //   ]
    // });

    this.pageWrapper = $$('.page-wrapper', {
      contenteditable: false,
      children: [
        $$("input.web-page-file", {
          contenteditable: false,
          type: "file", name: "files", "data-id": this.node.id, "accept": "text/html"
        }),
        this.iFrame,
        $$(".page-status", {
          contenteditable: false,
          children: [
            $$('.file-info', {html: ''}),
            $$('.actions', {
              children: [
                
                $$('a.replace', {href: "#", html: '<i class="icon-upload-alt"></i> Replace'}),
                $$('a.delete-resource', {href: "#", html: '<i class="icon-trash"></i> Delete'})
              ]
            })
          ]
        })
      ]
    });

    this.content.appendChild(this.pageWrapper);

    var that = this;
    this.iFrame.onload = function() {
      that.updatePage();
      var iWin = that.iFrame.contentWindow;

      var html = that.node.getHTML();
      var fileSize = util.getReadableFileSizeString(html.length);
      that.$('.file-info').html([
        "<b>HTML</b> ",
        '<span class="file-size">'+fileSize+'</span>',
        '<span class="info"><a href="http://substance.io/composer/user-manual/#heading_b4326b925dccb30afaef82607576eb0c" target="_blank"><i class="icon-question-sign"></i> Help</a></span>'
      ].join(''));
    };


    var caption = this.node.getCaption();
    if (caption) {
      this.captionView = this.viewFactory.createView(caption, {
        property: "caption",
        propertyPath: [caption.id, "content"]
      });
      this.childViews["caption"] = this.captionView;
      var captionEl = this.captionView.render().el;
      captionEl.classList.add('caption');
      this.content.appendChild(captionEl);
    }

    return this;
  };

  this.updatePage = function() {
    var doc = this.iFrame.contentWindow.document;

    $(this.iFrame).css({
      width: this.node.width,
      height: this.node.height
    });

    var newWidth = this.node.width;
    if (!newWidth.match(/.*px$/)) {
      newWidth += "px";
    }
    this.$('.page-status').css({
      "max-width": newWidth
    });

    doc.open();
    var html = this.node.getHTML();
    doc.write(html);
    doc.close();
  };

  // Updates image src when figure is updated by ImageUrlEditor
  // --------
  //

  this.onNodeUpdate = function(op) {
    this.updatePage();
  };

  this.onGraphUpdate = function(op) {
    if (NodeView.prototype.onGraphUpdate.call(this, op)) return;
    var fileId = this.node.file;
    if (op.path[0] === fileId) {
      this.updatePage();
    }
  };
};

EditableWebPageView.Prototype.prototype = NodeView.prototype;
EditableWebPageView.prototype = new EditableWebPageView.Prototype();

module.exports = EditableWebPageView;

},{"../node":92,"substance-application":10,"substance-util":268,"underscore":273}],99:[function(require,module,exports){
"use strict";

module.exports = {
  View: require('./editable_web_page_view'),
  Surface: require('./web_page_surface')
};

},{"./editable_web_page_view":98,"./web_page_surface":100}],100:[function(require,module,exports){
"use strict";

var NodeSurface = require("../node").Surface;
var TextSurface = require("../text").Surface;

var WebPageSurface = function(node, surfaceProvider) {
  NodeSurface.call(this, node, surfaceProvider);

  if (this.node.caption) {
    this.captionComponent = TextSurface.textProperty(this, "caption", {
      // override the property path pointing to the caption's content
      path: [this.node.caption, "content"]
    });
    this.components.push(this.captionComponent);
  }
};

WebPageSurface.Prototype = function() {
  var __super__ = NodeSurface.prototype;

  this.attachView = function(view) {
    __super__.attachView.call(this, view);
    // this.labelComponent.surface.attachView(this.view.childViews["label"]);
    if (this.captionComponent) this.captionComponent.surface.attachView(this.view.childViews["caption"]);
  };
};
WebPageSurface.Prototype.prototype = NodeSurface.prototype;
WebPageSurface.prototype = new WebPageSurface.Prototype();

module.exports = WebPageSurface;

},{"../node":92,"../text":94}],101:[function(require,module,exports){
"use strict";

var $$ = require ("substance-application").$$;
var NodeView = require("../node").View;
var TextView = require("../text").View;

// TODO: this should derive from LinkView and share as much as possible

var EditableWebResourceView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  // This class is shared among all link subtypes (errors, remarks)
  this.$el.addClass('web-resource');

  this.childViews = {
    "title": null,
    "url": null,
    "description": null
  };
};

EditableWebResourceView.Prototype = function() {

  var __super__ = NodeView.prototype;

  // Rendering
  // =============================
  //

  this.render = function() {
    NodeView.prototype.render.call(this);

    // Select citation page
    // --------

    var titleView = this.childViews["title"] = new TextView(this.node, this.viewFactory, {property: "title"});  
    this.content.appendChild(titleView.render().el);

    var urlView = this.childViews["url"] = new TextView(this.node, this.viewFactory, {property: "url"});  
    this.content.appendChild(urlView.render().el);

    var selectButton = $$('.select-citation', {
      text: "",
      contenteditable: false // Make sure this is not editable!
    });

    urlView.el.appendChild(selectButton);

    var deleteButton = $$('a.delete-resource', {
      href: '#',
      html: '<i class="icon-remove-sign"></i>',
      contenteditable: false // Make sure this is not editable!
    });

    this.content.appendChild(deleteButton);
    
    var descriptionView = this.childViews["description"] = new TextView(this.node, this.viewFactory, {property: "description"});
    this.content.appendChild(descriptionView.render().el);

    this.el.appendChild($$('.resource-active'));
    return this;
  };

  this.onNodeUpdate = function(op) {
    if (op.path[1] === "title") {
      this.childViews["title"].onNodeUpdate(op);
      return true;
    } else if (op.path[1] === "description") {
      this.childViews["description"].onNodeUpdate(op);
      return true;
    } else if (op.path[1] === "url") {
      this.childViews["url"].onNodeUpdate(op);
      return true;
    } else {
      return false;
    }
  };
};


EditableWebResourceView.Prototype.prototype = NodeView.prototype;
EditableWebResourceView.prototype = new EditableWebResourceView.Prototype();

module.exports = EditableWebResourceView;

},{"../node":92,"../text":94,"substance-application":10}],102:[function(require,module,exports){
"use strict";

module.exports = {
  View: require("./editable_web_resource_view"),
  Surface: require("./web_resource_surface")
};

},{"./editable_web_resource_view":101,"./web_resource_surface":103}],103:[function(require,module,exports){
"use strict";

var NodeSurface = require("../node").Surface;
var TextSurface = require("../text").Surface;

var WebResourceSurface = function(node, surfaceProvider) {
  NodeSurface.call(this, node, surfaceProvider);
  this.titleComp = TextSurface.textProperty(this, "title");
  this.urlComp = TextSurface.textProperty(this, "url");
  this.descriptionComp = TextSurface.textProperty(this, "description");
  this.components.push(this.titleComp);
  this.components.push(this.urlComp);
  this.components.push(this.descriptionComp);
};

WebResourceSurface.Prototype = function() {
  var __super__ = NodeSurface.prototype;

  this.attachView = function(view) {
    __super__.attachView.call(this, view);
    this.titleComp.surface.attachView(this.view.childViews["title"]);
    this.urlComp.surface.attachView(this.view.childViews["url"]);
    this.descriptionComp.surface.attachView(this.view.childViews["description"]);
  };
};

WebResourceSurface.Prototype.prototype = NodeSurface.prototype;
WebResourceSurface.prototype = new WebResourceSurface.Prototype();

module.exports = WebResourceSurface;

},{"../node":92,"../text":94}],104:[function(require,module,exports){
"use strict";

var PanelController = require('./panel_controller');
var NodesPanelView = require('./nodes_panel_view');

var NodesPanelController = function(doc, writerCtrl) {
  PanelController.call(this, doc, writerCtrl);
};

NodesPanelController.Prototype = function() {

  // Get nodes to be displayed in this view
  this.getNodes = function() {
    throw new Error("this method is abstract");
  };

  this.createView = function() {
    throw new Error("this method is abstract");
  };

  // Can be overwritten with customized view factory
  this.createViewFactory = function() {
    var DefaultViewFactory = this.document.constructor.ViewFactory;
    return new DefaultViewFactory(this.document);
  };
};


NodesPanelController.Prototype.prototype = PanelController.prototype;
NodesPanelController.prototype = new NodesPanelController.Prototype();

module.exports = NodesPanelController;
},{"./nodes_panel_view":105,"./panel_controller":107}],105:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var PanelView = require("./panel_view");

var NodesPanelView = function( panelCtrl, viewFactory, config ) {
  PanelView.call(this, panelCtrl, config);

  this.viewFactory = viewFactory;

  this.$nodes = $('<div>').addClass("nodes");
  this.$el.append(this.$nodes);
};

NodesPanelView.Prototype = function() {

  this.render = function() {
    this.$nodes.html(this.build());
    return this;
  };

  this.findNodeView = function(nodeId) {
    return this.el.querySelector('#'+nodeId);
  };

  this.build = function() {
    var frag = document.createDocumentFragment();
    this.nodes = {};

    // cleanup
    _.each(this.nodes, function(nodeView) {
      nodeView.dispose();
    });

    var docNodes = this.controller.getNodes();

    _.each(docNodes, function(n) {
      var view = this.renderNodeView(n);
      this.nodes[n.id] = view;
      frag.appendChild(view.el);
    }, this);
    return frag;
  };

  this.renderNodeView = function(n) {
    var view = this.viewFactory.createView(n, { topLevel: true });
    view.render();
    return view;
  };

  this.hide = function() {
    PanelView.prototype.hide.call(this);
  };

  this.show = function() {
    PanelView.prototype.show.call(this);
  };
};

NodesPanelView.Prototype.prototype = PanelView.prototype;
NodesPanelView.prototype = new NodesPanelView.Prototype();
NodesPanelView.prototype.constructor = NodesPanelView;

module.exports = NodesPanelView;
},{"./panel_view":108,"underscore":273}],106:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var Panel = function(name) {
  this.name = name;
};

Panel.Prototype = function() {

  this.createController = function(doc, writerCtrl) {
    throw new Error("this method is abstract");
  };

  this.getName = function() {
    return this.name;
  };

};

Panel.prototype = new Panel.Prototype();
Panel.prototype.constructor = Panel;

module.exports = Panel;
},{"underscore":273}],107:[function(require,module,exports){
"use strict";
var Controller = require("substance-application").Controller;
var _ = require("underscore");
var util = require("substance-util");

// Panel.Controller
// -----------------
//
// Controls a panel

var PanelController = function(document, writerCtrl, config) {
  this.document = document;
  this.writerCtrl = writerCtrl;
  this.config = config;
};

PanelController.Prototype = function() {
  var __super__ = Controller.prototype;

  this.createView = function() {
    throw new Error("this is an abstract method");
  };

  this.getConfig = function() {
    return this.config;
  };

  this.getName = function() {
    return this.config.name;
  };

  this.getDocument = function() {
    return this.document;
  };

  this.initialize = function(newState, cb) {
    cb(null);
  };

  this.transition = function(newState, cb) {
    cb(null);
  };

  // Trigger view transition on state change
  // -----------------
  //

  this.afterTransition = function(oldState) {
    this.view.transition(oldState);
  };

  // Free up memory
  // -----------------
  //

  this.dispose = function() {
    __super__.dispose.call(this);
    this.stopListening();
    if (this.view) this.view.dispose();
  };
};

PanelController.Prototype.prototype = Controller.prototype;
PanelController.prototype = new PanelController.Prototype();

module.exports = PanelController;

},{"substance-application":10,"substance-util":268,"underscore":273}],108:[function(require,module,exports){
var _ = require('underscore');

var Application = require("substance-application");
var $$ = Application.$$;
var View = Application.View;

var PanelView = function(panelController, config) {
  View.call(this);

  this.controller = panelController;
  this.config = config;
  this.doc = panelController.getDocument();
  this.name = config.name;

  this.toggleEl = $$('a.context-toggle.' + this.name, {
    'title': this.config.title,
    'html': '<i class="' + this.config.icon + '"></i><span> '+this.config.label+'</span>'
  });
  this.$toggleEl = $(this.toggleEl);

  this.$el.addClass('panel').addClass(this.name);

  // For legacy add 'resource-view' class
  if (this.config.type === 'resource') {
    this.$el.addClass('resource-view');
  }

  this._onToggle = _.bind( this.onToggle, this );
  this.$toggleEl.click( this._onToggle );
};

PanelView.Prototype = function() {

  this.dispose = function() {
    this.$toggleEl.off('click', this._onClick);
    this.$el.off('scroll', this._onScroll);
    this.stopListening();
  };

  this.onToggle = function() {
    this.trigger('toggle', this.name);
  };

  this.getToggleControl = function() {
    return this.toggleEl;
  };

  // Jump to the given resource id
  // --------
  //

  this.jumpToResource = function(nodeId) {
    // A panel with a scrollable element should implement this method (e.g., see ContainerPanelView)
  };

  this.hasOutline = function() {
    return false;
  };

  this.updateOutline = function() {
  };

  this.show = function() {
    this.$el.removeClass('hidden');
  };

  this.hide = function() {
    this.$el.addClass('hidden');
    this.$toggleEl.removeClass('active');
  };

  this.activate = function() {
    this.show();
    this.$toggleEl.addClass('active');
  }

  this.showToggle = function() {
    this.$toggleEl.removeClass('hidden');
  };

  this.hideToggle = function() {
    this.$toggleEl.addClass('hidden');
  };

  this.getDocument = function() {
    return this.doc;
  };

  this.findNodeView = function(nodeId) {
    return this.el.querySelector('*[data-id='+nodeId+']');
  };

};

PanelView.Prototype.prototype = View.prototype;
PanelView.prototype = new PanelView.Prototype();
PanelView.prototype.constructor = PanelView;

module.exports = PanelView;

},{"substance-application":10,"underscore":273}],109:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Controller = require("substance-application").Controller;
var PublishView = require("./publish_view");

var localStorage = window.localStorage;
var app = window.app;


// SubstanceWriter.PublishController
// -----------------

var PublishController = function(doc, composerCtrl) {
  this.document = doc;
  this.composerCtrl = composerCtrl;
};

PublishController.Prototype = function() {

  this.createView = function() {
    if (!this.view) {
      this.view = new PublishView(this);
    }
    return this.view;
  };

  this.getDefaultParams = function(templateId) {
    var defaultParams = {};
    _.each(this.availableTemplates[templateId].params, function(param, key) {
      defaultParams[key] = param["default"];
    });

    // console.log('defaultparams', defaultParams);
    return defaultParams;
  };

  this.updatePublishSettings = function(settings) {
    if (!settings.params) settings.params = this.getDefaultParams(settings.templateId);
    this.document.createSettings(settings);
  };

  this.openExternalLink = function(url) {
    this.composerCtrl.openExternalLink(url);
  };

  this.initialize = function(newState, cb) {
    // console.log('initializing publishcontroller', newState);

    // Initializing view
    this.createView().render();
    cb(null);
  };

  this.generatePreview = function(cb) {
    this.composerCtrl.generatePreview(cb);
  };

  this.loadAvailableTemplates = function(cb) {
    var self = this;
    this.composerCtrl.getAvailableTemplates(function(err, availableTemplates) {
      self.availableTemplates = availableTemplates;
      cb(null);
    });
  };

  this.getTemplateConfig = function(templateId) {
    var config = this.availableTemplates[templateId];
    if (!config) config = this.availableTemplates["substance"];
    return config;
  };

  this.DEFAULT_STATE = {
    id: 'default'
  };

  this.transition = function(newState, cb) {
    var that = this;
    var skipTransition = false;

    //  1. Idem potence
    // if (this.state.id === newState.id && this.state.templateId == newState.templateId) {
    //   skipTransition = true;
    // }

    if (skipTransition) return cb(null, {skip: skipTransition});

    // Load current template
    this.loadAvailableTemplates(cb);
  };

  this.afterTransition = function(newState) {
    this.view.transition(newState);
  };

  this.dispose = function() {
    if (this.view) this.view.dispose();
    this.view = null;
  };

};
PublishController.Prototype.prototype = Controller.prototype;
PublishController.prototype = new PublishController.Prototype();

module.exports = PublishController;

},{"./publish_view":110,"substance-application":10,"substance-util":268,"underscore":273}],110:[function(require,module,exports){
var View = require("substance-application").View;
var $$ = require("substance-application").$$;
var $ = window.$;
var _ = require("underscore");

// Substance.Writer.PublishView
// ==========================================================================
//

var PublishView = function(publishCtrl) {
  View.call(this);
  this.publishCtrl = publishCtrl;

  this.$el.addClass('publish-settings-view');

  // Update publish settings
  this.$el.on('click', '.choose-template a.template', this.selectTemplate.bind(this));
  this.$el.on('change', '.template-settings input', this.updatePublishSettings.bind(this));

  // This is needed only because clearSelection of the writer triggers a state change
  this.$el.on('mouseup', function(e) { return e.stopPropagation(); });
};

PublishView.Prototype = function() {

  this.updatePublishSettings = function(e) {

    // Get current settings according to view
    var params = {};
    this.$('.template-settings input').each(function() {
      var paramName = this.getAttribute("data-param-name");
      var val = this.checked;
      params[paramName] = val;
    });

    var doc = this.publishCtrl.document;
    var templateId = doc.getSettings().templateId;
    this.publishCtrl.updatePublishSettings({
      templateId: templateId,
      params: params
    });

    this.renderPreview();
  };

  // Select template
  //
  // Triggers a state change which loads new template config (if needed)

  this.selectTemplate = function(e) {
    var templateId = $(e.currentTarget).attr("data-id");
    var self = this;

    this.publishCtrl.updatePublishSettings({
      templateId: templateId
    });

    self.renderTemplateSettings();
    self.renderPreview();

    e.preventDefault();
    e.stopPropagation();
  };

  this.transition = function(newState) {
    // manage other transitions
    if (this.contextView) {
      this.contextView.dispose();
    }

    this.renderPreview();
    this.renderTemplateSettings();
  };

  this.renderPreview = function() {
    var self = this;

    this.publishCtrl.generatePreview(function(err, previewUrl) {
      // console.log('preview ready at', previewUrl);

      $(self.iFrameEl).css({opacity: 0});
      if (self.iFrameEl.contentWindow) {
        // Reload existing
        self.iFrameEl.contentWindow.location.reload();
      } else {
        self.iFrameEl.setAttribute("src", previewUrl);
      }
      // self.iFrameEl.contentWindow.location.href = previewUrl;

      if (window.native_app) {
        self.iFrameEl.onload = function() {
          
          _.delay(function() {
            $(self.iFrameEl).animate({opacity: 1}, 350);  
          }, 50);

          this.contentDocument.onclick = function (e) {
            var element = e.target || e.srcElement;
            if (element.tagName == 'A') {
              var url = element.href;
              if (url.match(/^http/) || url.match(/^mailto/)) {
                console.log("Opening external url", url);
                self.publishCtrl.openExternalLink(url);
                e.preventDefault();
                e.stopPropagation();
              }
            }
          };
        };
      }
    });
  };


  // Rendering
  // --------
  //

  this.render = function() {
    var self = this;

    this.el.innerHTML = "";

    this.header = $$('.publish-settings-header');
    this.el.appendChild(this.header);

    this.chooseTemplate = $$('.choose-template');

    this.header.appendChild(this.chooseTemplate);
    this.exportLink = $$('a.export-publication', {href: "#", html: '<i class="icon-signout"></i> Export web page'});
    this.header.appendChild(this.exportLink);
    this.el.appendChild(this.header);

    this.templateSettings = $$('.template-settings');

    this.el.appendChild(this.templateSettings);
    this.preview = $$('.document-preview');
    this.el.appendChild(this.preview);

    // This is where the preview goes
    this.iFrameEl = $$('iframe', {
      sandbox: "allow-same-origin allow-scripts"
    });

    this.preview.appendChild(this.iFrameEl);

    return this;
  };

  // Template Configuration
  // ------------
  //
  // Generated from template config object and current settings

  this.renderTemplateSettings = function() {
    var publishSettings = this.publishCtrl.document.getSettings();
    var templateDef = this.publishCtrl.getTemplateConfig(publishSettings.templateId);

    var self = this;

    self.chooseTemplate.innerHTML = "";

    var numTemplates = Object.keys(this.publishCtrl.availableTemplates).length;
    if (numTemplates >= 2) {
      _.each(this.publishCtrl.availableTemplates, function(templateDef) {
        self.chooseTemplate.appendChild($$('a.template', {href: "#", "data-id": templateDef.id, text: templateDef.name}));
      });
    } else {
      self.chooseTemplate.appendChild($$('.template', {text: "Publish settings"}));
    }

    // Mark highlighted setting
    this.$('.choose-template .template').removeClass('active');
    this.$('.template[data-id='+templateDef.id+']').addClass('active');
    this.templateSettings.innerHTML = "";

    _.each(templateDef.params, function(param, key) {

      var checkboxParams = {type: 'checkbox', "data-param-name": key};
      if (publishSettings.params[key]) {
        checkboxParams["checked"] = "checked";
      }

      var settingEl = $$('.setting', {
        children: [
          $$('.label', {text: param.name}),
          $$('input', checkboxParams)
        ]
      });
      self.templateSettings.appendChild(settingEl);
    });
  };
};

PublishView.Prototype.prototype = View.prototype;
PublishView.prototype = new PublishView.Prototype();
PublishView.prototype.constructor = PublishView;

module.exports = PublishView;

},{"substance-application":10,"underscore":273}],111:[function(require,module,exports){
"use strict";

var ResourceToolsView = require("./resource_tools_view");
var Controller = require("substance-application").Controller;

// Substance.Writer.ResourceToolsController
// -----------------
//

var ResourceToolsController = function(parentAdapter) {
  this.parentAdapter = parentAdapter;
  this.state = {id: "initialized"};
};

ResourceToolsController.Prototype = function() {

  this.createView = function() {
    if (!this.view) {
      this.view = new ResourceToolsView(this);
    }
    return this.view;
  };

  this.initialize = function(newState, cb) {
    this.createView();
    cb(null);
  };

  this.dispose = function() {
    if (this.view) this.view.dispose();
    this.view = null;
  };

  // Called by WriterView#onSelectionUpdate
  // -------------
  // 
  // Triggers state transition based on cursor movement
  // Additionally state transitions can be triggered by buttons in the toolbar itself

  this.update = function() {
    // Case1 enter link state
  };


};

ResourceToolsController.Prototype.prototype = Controller.prototype;
ResourceToolsController.prototype = new ResourceToolsController.Prototype();
module.exports = ResourceToolsController;

},{"./resource_tools_view":112,"substance-application":10}],112:[function(require,module,exports){
var View = require("substance-application").View;
var $$ = require("substance-application").$$;
var _ = require("underscore");

// Substance.Writer.ResourceToolsView
// ==========================================================================
//

var ResourceToolsView = function(controller) {
  View.call(this);
  this.$el.addClass('resource-tools-view');

  this.controller = controller;  
};

ResourceToolsView.Prototype = function() {

  // Rendering
  // --------
  //

  this.render = function() {
    this.el.innerHTML = "";
    this.titleEl = $$('.title');
    this.messageEl = $$('.message');
    this.actionsEl = $$('.actions');
    this.el.appendChild(this.titleEl);
    this.el.appendChild(this.messageEl);
    this.el.appendChild(this.actionsEl);
    return this;
  };

  this.clear = function() {
    this.titleEl.innerHTML = "";
    this.messageEl.innerHTML = "";
    this.actionsEl.innerHTML = "";
  };

  // Called whenever the document selection has changed
  // and the toolbar needs to be updated

  this.update = function() {
    var state = this.controller.parentAdapter.state;
    this.clear();
    switch(state.contextId) {
      case "figures":
        // this.el.innerHTML = "Please choose the resource you want to reference or            Add a new link";
        this.updateTitle("Figures");
        break;
      case "toc":
        this.updateTitle("Contents");
        break;
      case "citations":
        this.updateTitle("References");
        break;
      case "info":
        this.updateTitle("Article Info");
        break;
      case "remarks":
        this.updateTitle("Remarks");
        break;
      case "errors":
        this.updateTitle("Errors");

        break;
      default:
        return;
    }
  }; 



  this.updateTitle = function(title) {
    this.titleEl.innerHTML = title;
  };

  this.updateMessage = function(message) {
    this.messageEl.innerHTML = message;
  };

  this.updateActions = function(action) {
    this.actionsEl.innerHTML = "";
    this.actionsEl.appendChild($$('a', {href: "#", text: action.name, "class": action.class}));
  };
};

ResourceToolsView.Prototype.prototype = View.prototype;
ResourceToolsView.prototype = new ResourceToolsView.Prototype();
ResourceToolsView.prototype.constructor = ResourceToolsView;

module.exports = ResourceToolsView;

},{"substance-application":10,"underscore":273}],113:[function(require,module,exports){
"use strict";

// Substance.GenericShell
// ------------
//

// TODO: refactor me. IMO we don't need backends and shells. One is enough.
// There should be an abstract class 'Shell' which describes the whole interface.

var zip = require("substance-util").zip;

var GenericShell = function(backend) {
  this.backend = backend;
};

GenericShell.Prototype = function() {

  // Read from Arraybuffer
  // -----------
  //
  // Used by Composer, when files are dropped

  this.readFromArrayBuffer = function(data) {
    return this.backend.readFromArrayBuffer(data);
  };

  this.open = function(path, cb) {
    this.backend.open(path, cb);
  };

  this.save = function(doc, path, cb) {
    this.backend.save(doc, path, cb);
  };

  this.newDocument = function() {
    console.error('Abstract interface not implemented');
  };

  this.updateTitle = function(title) {
    window.document.title = title;
  };

  this.attachComposer = function(composer) {
    // Do nothing
  };

  this.openExternalLink = function(url) {
    window.open(url);
  };

  // Opens a file dialog
  // -------------
  // TODO: document options when it is clear how they look like.
  this.openFileDialog = function(options) {
    throw new Error("GenericShell.openFileDialog is abstract");
  };
};

GenericShell.prototype = new GenericShell.Prototype();

module.exports = GenericShell;
},{"substance-util":268}],114:[function(require,module,exports){
"use strict";

var HtmlConverter = require('substance-converter/src/html_converter');
var HtmlExporter = require('substance-converter/src/html_exporter');

// Note: the Clipboard is owned by the WriterController currently.
// The reason is, that we want to share a common clipboard between different Surfaces.
var WebClipboard = function(writerCtrl) {

  this.writerCtrl = writerCtrl;

  this.el = window.document.createElement("DIV");
  this.el.setAttribute("contenteditable", "true");
  this.el.classList.add("clipboard");

  // bind a handler to invoke the pasting...
  this.el.onpaste = this.onPaste.bind(this);

  this._lastSelection = null;

  this._contentText = "";
};

WebClipboard.Prototype = function() {

  this._copySelection = function() {
    var wSel = window.getSelection();
    this._contentText = "";
    this._contentDoc = null;

    var editorCtrl = this.writerCtrl.currentController;
    if (editorCtrl && wSel.rangeCount > 0 && editorCtrl.session.selection.hasMultipleNodes()) {
      var wRange = wSel.getRangeAt(0);
      this._contentText = wRange.toString();
      this._contentDoc = editorCtrl.copy();
      // console.log("WebClipboard._copySelection(): created a copy", this._contentDoc);
    } else {
      this._contentDoc = null;
      this._contentText = "";
    }
  };

  this.onCopy = function(event) {
    console.log("WebClipboard.onCopy", arguments);

    this._copySelection();

    if (event.clipboardData && this._contentDoc) {
      var htmlExporter = new HtmlExporter();
      var html = htmlExporter.toHtml(this._contentDoc, { containers: ['content'] });
      event.clipboardData.setData('application/substance', JSON.stringify(this._contentDoc.toJSON()));
      event.clipboardData.setData('text/html', html);
      event.preventDefault();
    }
  };

  // nothing special for cut.
  this.onCut = function() {
    console.log("WebClipboard.onCut", arguments);
    this.onCopy();
    event.preventDefault();
  };

  this.onPaste = function(event) {
    console.log("Paste post-processing...", this.el);
    var self = this;
    var editorCtrl = this.writerCtrl.currentController;
    var doc = editorCtrl.session.document;

    // Experimental: look into the clipboard data for HTML
    // and use this as preferred input

    // TODO: 1. Fix HTML pasting for internal content
    //  2. detect 'application/substance' and use for internal paste
    //  3. Precedence (in the presence of clipboardData):
    //    1. app/substance,
    //    2. HTML,
    //    3. plain text
    //  4. Legacy for IE and older browsers (using pasting trick)

    if (event.clipboardData) {
      var items = event.clipboardData.items;
      var substanceItem = null;
      var htmlItem = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type === "application/substance") {
          substanceItem = items[i];
        }
        if (items[i].type === "text/html") {
          htmlItem = items[i];
        }
      }
      if (substanceItem) {
        substanceItem.getAsString(function(data) {
          console.log("Received Substance JSON via Clipboard", data);
          try {
            var content = doc.fromSnapshot(JSON.parse(data), { "schema": doc.schema });
            editorCtrl.session.selection.set(self._lastSelection, {"silent": "true"});
            editorCtrl.paste(content, "");
            self._lastSelection = null;
          } catch (error) {
            self.writerCtrl.onError(error);
          }
        });
        return;
      }
      if (htmlItem) {
        var editorCtrl = this.writerCtrl.currentController;
        var doc = editorCtrl.session.document;
        htmlItem.getAsString(function(data) {
          console.log("Received HTML via Clipboard", data);
          try {
            var content = doc.newInstance();
            var htmlConverter = new HtmlConverter({
              trimWhitespaces: true,
              REMOVE_INNER_WS: true
            });
            var htmlDoc = new window.DOMParser().parseFromString(data, "text/html");
            htmlConverter.convert(htmlDoc, content);
            editorCtrl.session.selection.set(self._lastSelection, {"silent": "true"});
            editorCtrl.paste(content, htmlDoc.body.textContent);
            self._lastSelection = null;
          } catch (error) {
            self.writerCtrl.onError(error);
          }
        });
        return;
      }
    }

    // If not processed above use the plain text implementation
    window.setTimeout(function() {
      // Checking if we are pasting internally, i.e., if we have copied a Substance document fragment
      // previously.
      // Note: The browser does not allow to control what is delivered into the native clipboard.
      // The only way to detect if the content in the native and the internal clipboard is
      // to compare the content literally.
      // TODO: add check if content is the same as in fragment
      var wRange = window.document.createRange();
      wRange.selectNode(self.el);
      var plainText = wRange.toString();

      var editorCtrl = self.writerCtrl.currentController;
      if (plainText === self._contentText) {
        // console.log("This is a substance internal paste.");
        try {
          editorCtrl.session.selection.set(self._lastSelection, {"silent": "true"});
          editorCtrl.paste(self._contentDoc, plainText);
          self._lastSelection = null;
        } catch (error) {
          self.writerCtrl.onError(error);
        }
      } else {
        try {
          editorCtrl.session.selection.set(self._lastSelection, {"silent": "true"});
          editorCtrl.write(plainText);
          self._lastSelection = null;
        } catch (error) {
          self.writerCtrl.onError(error);
        }
      }

      // clear the pasting area
      self.el.innerHTML = "";
    }, 10);
  };

  this.attachSurface = function(surface) {
    var self = this;
    var keyboard = surface.keyboard;

    // keyboard.bind("copy", "keydown", function() {
    //   // console.log("Copying into WebClipboard...");
    // });

    // Cut is of course a challenge itself.
    // We need to clone the content of the selection into the
    // hidden area, update the model, select the hidden content
    // and then let the browser do the cut on the hidden element.
    keyboard.bind("cut", "keydown", function(e) {
      // console.log("Cutting into WebClipboard...");

      var wSel = window.getSelection();

      // TODO: deal with multiple ranges

      // first extract the selected content into the hidden element
      var wRange = wSel.getRangeAt(0);
      var frag = wRange.cloneContents();
      self.el.innerHTML = "";
      self.el.appendChild(frag);

      self._copySelection();

      try {
        // console.log("...selection before deletion", self.writerCtrl.currentController.session.selection);
        self.writerCtrl.currentController.delete();
      } catch (error) {
        self.writerCtrl.onError(error);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // select the copied content
      var wRangeNew = window.document.createRange();
      wRangeNew.selectNodeContents(self.el);
      wSel.removeAllRanges();
      wSel.addRange(wRangeNew);

      // hacky way to reset the selection which gets lost otherwise
      window.setTimeout(function() {
        // console.log("...restoring the selection");
        var sel = self.writerCtrl.currentController.session.selection;
        sel.set(sel);
      }, 10);
    });

    keyboard.bind("paste", "keydown", function() {
      // console.log("Pasting from WebClipboard...");

      // clear the pasting area
      self.el.innerHTML = "";

      // Note: with the DOM selectionchange listener the model selection gets
      // invalidated when we change the DOM selection
      // We have to save the current selection to be able
      // to restore it before pasting into the model
      var sel = self.writerCtrl.currentController.session.selection;
      self._lastSelection = sel.range();

      // set the window selection so that the browser
      // will paste into the pasting area
      var wSel = window.getSelection();
      var wRange = window.document.createRange();
      wRange.setStart(self.el, 0);
      wSel.removeAllRanges();
      wSel.addRange(wRange);
    });

  };
};
WebClipboard.prototype = new WebClipboard.Prototype();

module.exports = WebClipboard;

},{"substance-converter/src/html_converter":124,"substance-converter/src/html_exporter":125}],115:[function(require,module,exports){
"use strict";

var $ = window.$;
var _ = require('underscore');
var LocalStorageBackend = require("../backends/localstorage_backend");
var GenericShell = require("./generic_shell");

var WebFileWrapper = require("../backends/web_file_wrapper");
var WebClipboard = require("./web_clipboard");

var WebShell = function(backend) {
  GenericShell.call(this, backend || new LocalStorageBackend(this));
  var backstageEl = window.document.getElementById('backstage');
  if (!backstageEl) {
    throw new Error("Could not find backstage element.");
  }
  var $backstage = $(backstageEl);
  this.$openFile = $('<input id="openfile" type="file"></input>');

  var $infoDialog = $('<dialog id="info-dialog"></dialog>');
  $infoDialog.append('<div>').addClass('title');
  $infoDialog.append('<div>').addClass('message');
  $infoDialog.append('<div>').addClass('buttons');
  $infoDialog.append('<div>').addClass('detail');
  this.$infoDialog = $infoDialog;

  $backstage.append(this.$openFile);
  $backstage.append(this.$infoDialog);
};

WebShell.Prototype = function() {

  this.getClipboard = function(writerCtrl) {
    return new WebClipboard(writerCtrl);
  };

  this.getAvailableTemplates = function(cb) {
    var availableTemplates = {
      "substance": {
        "id": "substance",
        "name": "Substance",
        "params": {
          "include_toc": {
            "type": "boolean",
            "name": "Table of Contents",
            "default": false
          },
          "include_references": {
            "name": "References",
            "type": "boolean",
            "default": false
          },
          "enable_section_numbering": {
            "name": "Numbering",
            "type": "boolean",
            "default": false
          },
          // "include_source_file": {
          //   "name": "Source File",
          //   "type": "boolean",
          //   "default": false
          // }
        }
      }
    };
    cb(null, availableTemplates);
  };

  // Params:
  //
  // templateSettings (user-defined)

  this.generatePreview = function(doc, cb) {
    // Do nothing in web-version
    var previewUrl = "http://zive.at";
    cb(null, previewUrl);
  };

  this.openFileDialog = function(options, cb) {
    var $openFile = this.$openFile;
    if (options.multiple) {
      $openFile.attr('multiple', true);
    } else {
      $openFile.removeAttr('multiple');
    }
    if (options.accept) {
      $openFile.attr('accept', options.accept);
    } else {
      $openFile.removeAttr('accept');
    }
    $openFile.unbind('change');
    $openFile.bind('change', function(e) {
      WebFileWrapper.wrapFiles(e.target.files, cb);
    });
    $openFile.click();
  };

  this.showModalDialog = function(options) {
    console.log('TODO: implement confirm modal dialog appropriately');
    // var $infoDialog = this.$infoDialog;
    // $infoDialog.find('.title').text(options.title);
    // $infoDialog.find('.message').text(options.message);
    // var $buttons = this.$infoDialog.find('.buttons');
    // _.each(options.buttons, function(label, idx) {
    //   var buttonEl = window.document.create('button');
    //   var $button = $(buttonEl);
    //   buttonEl.dataset.value = idx;
    //   $button.click(function() {
    //     $infoDialog.attr('returnValue', buttonEl.dataset.value);
    //   });
    //   $buttons.append($button);
    // });
    // $infoDialog.find('.detail').text(options.detail);
    // $infoDialog[0].showModal();
    // return $infoDialog[0].value;
  };

};

WebShell.Prototype.prototype = GenericShell.prototype;
WebShell.prototype = new WebShell.Prototype();
WebShell.prototype.constructor = WebShell;

module.exports = WebShell;

},{"../backends/localstorage_backend":42,"../backends/web_file_wrapper":43,"./generic_shell":113,"./web_clipboard":114,"underscore":273}],116:[function(require,module,exports){
"use strict";

var $ = window.$;
var $$ = require("substance-application").$$;
var View = require("substance-application").View;

// Substance.Writer.ToolbarView
// ==========================================================================
//

var ToolbarView = function(controller) {
  View.call(this);
  this.$el.addClass('toolbar-view');

  this.controller = controller;
  this.actions = {};
  this.controls = {};
};

ToolbarView.Prototype = function() {

  // Rendering
  // --------
  //

  this.render = function() {
    this.el.innerHTML = "";

    // Semantic Annotations
    // --------
    //

    var actions = $$('.workflows.group');

    this.controls["dashboard"] = $$('a.dashboard', {
      href: "/",
      html: '<i class="icon-tasks"></i><span class="label">Dashboard</span>'
    });
    actions.appendChild(this.controls["dashboard"]);

    this.controls["subjects"] = $$('a.subjects', {
      href: "/subjects",
      html: '<i class="icon-tags"></i><span class="label">Subjects</span>'
    });
    actions.appendChild(this.controls["subjects"]);

    // this.controls["save"] = $$('a.toggle-annotation.save.control.disable', {
    //   href: "#",
    //   html: '<i class="icon-save"></i><span class="label">Save</span>'
    // });

    // actions.appendChild(this.controls["save"]);
    // if (!window.native_app) {
    //   this.controls["export"] = $$('a.toggle-annotation.export', {
    //     href: "#",
    //     html: '<i class="icon-download-alt"></i><span class="label">Export</span>'
    //   });
    //   actions.appendChild(this.controls["export"]);
    // }

    // this.controls["undo"] = $$('a.toggle-annotation.undo.control', {
    //   href: "#",
    //   html: '<i class="icon-undo"></i><span class="label">Undo</span>'
    // });
    // actions.appendChild(this.controls["undo"]);


    // this.controls["redo"] = $$('a.toggle-annotation.redo.control', {
    //   href: "#",
    //   html: '<i class="icon-rotate-right"></i><span class="label">redo</span>'
    // });
    // actions.appendChild(this.controls["redo"]);


    var workflows = $$('.workflows.group');


    // Toggles for adding new resources to the game
    // --------
    //

    var inner = $$('.toolbar-inner');
    var groups = $$('.groups');

    groups.appendChild(actions);
    groups.appendChild(workflows);

    inner.appendChild(groups);

    // this.controls["modes"] = $$('.modes', {
    //   children: [
    //     $$('a.toggle-edit', {
    //       href: "#",
    //       html: '<i class="icon-pencil"></i>&nbsp;&nbsp;<span class="label">Edit</span>'
    //     }),
    //     $$('a.toggle-publish', {
    //       href: "#",
    //       html: '<i class="icon-eye-open"></i>&nbsp;&nbsp;<span class="label">Preview</span>'
    //     })
    //   ]
    // });
    // inner.appendChild(this.controls["modes"]);

    this.contextBar = $$('.context-bar');
    inner.appendChild(this.contextBar);
    this.el.appendChild(inner);

    return this;
  };

  // Called whenever the document selection has changed
  // and the toolbar needs to be updated
  this.update = function() {
    // var doc = this.controller.doc;
    // This is set by the application object (see substance.js)
    // if (doc.__dirty) {
    //   $(this.controls["save"]).removeClass('disable');
    // } else {
    //   $(this.controls["save"]).addClass('disable');
    // }
  };

  this.dispose = function() {
    this.stopListening();
  };

  this.getState = function() {
    return this.controller.state;
  };
};

ToolbarView.Prototype.prototype = View.prototype;
ToolbarView.prototype = new ToolbarView.Prototype();
ToolbarView.prototype.constructor = ToolbarView;

module.exports = ToolbarView;

},{"substance-application":10}],117:[function(require,module,exports){
var AddHyperLinkTool = function() {
  this.name = "link";
  this.title = "Link";
  this.icon = "icon-link";
  this.action = "select-location";
};

AddHyperLinkTool.Prototype = function() {


  this.isActive = function(ctrl) {
    return !!ctrl.getActiveAnnotationByType("citation_reference");
  };

  this.isEnabled = function(ctrl) {
    var editor = ctrl.getCurrentEditor();
    if (!editor) return false;
    if (editor.view !== "content") return false;
    
    var sel = editor.selection;
    return !sel.isCollapsed();
  };

  this.handleToggle = function(ctrl) {
    var activeAnnotation = ctrl.getActiveAnnotationByType("citation_reference");
    if (activeAnnotation) {
      // console.error('Implement Delete annotation', activeAnnotation);
      ctrl.deleteAnnotation(activeAnnotation);
    } else {
      // Trigger add hyperlink workflow
      ctrl.workflows["add_hyper_link"].beginWorkflow();
    }
  };
};

AddHyperLinkTool.Prototype.prototype = AddHyperLinkTool.prototype;
AddHyperLinkTool.prototype = new AddHyperLinkTool.Prototype();
AddHyperLinkTool.prototype.constructor = AddHyperLinkTool;

module.exports = AddHyperLinkTool;

},{}],118:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var Workflow = require('./workflow');

var AddHyperLink = function() {
  Workflow.apply(this, arguments);

  this.handlers = [];
};

AddHyperLink.Prototype = function() {

  // Register handlers that trigger the workflow
  // ---------------
  // 
  // not used here since workflow is triggered by AddHyperLinkTool
  
  this.registerHandlers = function() {
  };

  
  this.unRegisterHandlers = function() {
  };

  // Handle controller transition
  // -------------

  this.transition = function(newState, cb) {
    // NOT YET USED
  };

  this.handlesStateUpdate = true;

  // Handle view transition
  // -------------
  
  this.handleStateUpdate = function(state, oldState, stateInfo) {

    if (state.id === "addref") {
      console.error("HACK: Attaching click handler....");
      var elemType;

      // Note: we do not deactivate. Instead addref is ended if the user
      // changes the selection (e.g., by typing)
      switch (state.contextId) {
      case "locations":
        elemType = "location";
        break;
      case "citations":
        elemType = "citation";
        break;
      }

      if (elemType) {
        // This works for citations (=links but not for locations yet since we don't have content nodes there)
        // We can not assume that panels hold a surface so this can't be generalized like this
        this.$addRefEls = this.writerView.$(".resource-view."+state.contextId+" .nodes > .content-node");

        // debugger;
        this.$addRefEls.on('click', function(e) {
          var nodeId = e.currentTarget.id;
          this.endWorkflow(nodeId, elemType);
          e.preventDefault();
        }.bind(this));
        this.$addRefEls.on('mouseup', function(e) { e.stopPropagation(); });
      }

      return true;
    }

    if (oldState.id === "addref") {
      this.$addRefEls.off('click');
      this.$addRefEls.off('mouseup');
      return true;
    }

    return false; // Not handled here
  };

  // Begin Workflow
  // -------------

  this.beginWorkflow = function() {
    // if (!referenceType) referenceType = "text";

    var editor = this.writerCtrl.getCurrentEditor();
    var doc = this.writerCtrl.document;
    var currentSession = this.writerCtrl.currentSession;
    var recoverSha = doc.state;
    var citationsCtrl = this.writerCtrl.citationsCtrl;

    if (!currentSession) {
      console.error("Workflow 'AddRef': nothing selected.");
      return false;
    }

    var container = currentSession.container;
    var selection = currentSession.selection;

    if (selection.isNull()) {
      throw new errors.SelectionError("Selection is null");
      // throw new Error("Selection is null.");
    }

    var containerId = currentSession.container.id;
    var cursor = selection.getCursor();
    var node = container.getRootNodeFromPos(cursor.pos);
    var charPos = cursor.charPos;
    var newNodeId = editor.createCitationWithReference("citation_reference", newNodeId);

    // Select url field
    var comps = citationsCtrl.session.container.getNodeComponents(newNodeId);
    var linkUrl = comps[1];

    citationsCtrl.session.selection.set({
      start: [linkUrl.pos, 0],
      end:[linkUrl.pos, linkUrl.length]
    });

    this.writerCtrl.switchState({
      id: "addref",
      contextId: "citations",
      containerId: containerId,
      nodeId: node.id,
      referenceType: "citation_reference",
      resourceId: newNodeId,
      recover: recoverSha,
      // Note: app states can only contain string variables
      charPos: ""+charPos
    }, {"no-scroll": true});
  };

  // nodeId or null if cancelled
  this.endWorkflow = function(nodeId) {
    console.log("NEW!! WriterController.endAddRef");
    var editorCtrl = this.writerCtrl.contentCtrl;

    if (nodeId !== this.writerCtrl.state.resourceId) {
      this.writerCtrl.rollBack();
      editorCtrl.addReference("citation_reference", {target: nodeId});
    }
    // Note: this will trigger an implicit state change via selection change.
    editorCtrl.focus();
  };

};

AddHyperLink.Prototype.prototype = Workflow.prototype;
AddHyperLink.prototype = new AddHyperLink.Prototype();

module.exports = AddHyperLink;

},{"./workflow":121,"underscore":273}],119:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var $ = window.$;
var Workflow = require('./workflow');

var EditAnnotationRange = function() {
  Workflow.apply(this, arguments);

  this._onMouseDown = this.onMouseDown.bind(this);
  this._onMouseMove = this.onMouseMove.bind(this);
  this._onMouseUp = this.onMouseUp.bind(this);

  this.wRange = null;
  this.data = null;
};

EditAnnotationRange.Prototype = function() {

  this.constructor = EditAnnotationRange;

  this.registerHandlers = function() {
    this.writerView.el.addEventListener('mousedown', this._onMouseDown, true);
  };

  this.unRegisterHandlers = function() {
    this.writerView.el.removeEventListener('mousedown', this._onMouseDown, true);
  };

  this.onMouseDown = function(ev) {
    var handleEl = null;
    var target = ev.target;
    for (var i=0; i < 3; i++) {
      if (target && target.classList.contains('range-handle')) {
        handleEl = target;
        break;
      }
      target = target.parentElement;
    }
    if (handleEl) {
      console.log("YAY", i, ev);

      var annoFragmentEl = handleEl.parentElement;
      var surfaceEl = $(handleEl).parents('.surface')[0];
      var annotationId = annoFragmentEl.dataset.annotationId;
      var boundary = handleEl.classList.contains('left') ? 'left' : 'right';
      var surfaceName = surfaceEl.id;
      var surface = this.writerView.getSurface(surfaceName);

      this.data = {
        surfaceName: surfaceName,
        annotationId: annotationId,
        boundary: boundary,
      };

      var wSel = window.getSelection();
      wSel.removeAllRanges();
      var annotation = this.writerCtrl.document.get(annotationId);
      if (!annotation) {
        console.error('Could not find annotation', annotationId);
        return;
      }
      var anchor, focus;
      if (boundary === 'left') {
        anchor = {
          path: annotation.endPath,
          offset: annotation.endCharPos
        };
        focus = {
          path: annotation.startPath,
          offset: annotation.startCharPos
        };
      } else {
        anchor = {
          path: annotation.startPath,
          offset: annotation.startCharPos
        };
        focus = {
          path: annotation.endPath,
          offset: annotation.endCharPos
        };
      }
      var wRange = window.document.createRange();
      var anchorPos = surface.getPositionFromCoordinate(anchor.path, anchor.offset);
      var focusPos = surface.getPositionFromCoordinate(focus.path, focus.offset);

      // HACK: DOM Range API behaves strange
      // Hacking to get it working somehow. Need to rethink about a better approach
      var anchorContainer, anchorOffset;
      var focusContainer, focusOffset;

      var _getFirstTextNode = function(el) {
        for (var child = el.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === window.document.TEXT_NODE) {
            return child;
          } else if (child.nodeType === window.document.ELEMENT_NODE) {
            var textNode = _getFirstTextNode(child);
            if (textNode) return textNode;
          }
        }
        return null;
      };

      if (boundary === "left") {
        anchorContainer = anchorPos.startContainer;
        anchorOffset = anchorPos.startOffset;
        focusContainer = _getFirstTextNode(focusPos.startContainer.nextSibling);
        focusOffset = 0;
      } else {
        anchorContainer = _getFirstTextNode(anchorPos.startContainer.nextSibling);
        anchorOffset = 0;
        focusContainer = focusPos.startContainer;
        focusOffset = focusPos.startOffset;
      }
      console.log("Anchoring:", anchorContainer, anchorOffset);
      console.log("Focussing:", focusContainer, focusOffset);
      wRange.setStart(anchorContainer, anchorOffset);

      this.wRange = wRange;
      wSel.addRange(wRange);
      wSel.extend(focusContainer, focusOffset);

      this.isDragging = true;

      this.writerView.el.addEventListener('mousemove', this._onMouseMove, true);
      this.writerView.el.addEventListener('mouseup', this._onMouseUp, true);

      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  function _getPositionFromPoint(ev) {
    var range, textNode, offset;
    // standard
    if (window.document.caretPositionFromPoint) {
      range = window.document.caretPositionFromPoint(ev.clientX, ev.clientY);
      textNode = range.offsetNode;
      offset = range.offset;
    // WebKit
    } else if (window.document.caretRangeFromPoint) {
      range = window.document.caretRangeFromPoint(ev.clientX, ev.clientY);
      textNode = range.startContainer;
      offset = range.startOffset;
    } else {
      console.error('Browser not supported');
      return;
    }
    return { startContainer: textNode, startOffset: offset };
  }

  this.onMouseMove = function(ev) {
    if (this.isDragging) {
      var position = _getPositionFromPoint(ev);
      var wSel = window.getSelection();
      wSel.extend(position.startContainer, position.startOffset);

      ev.stopPropagation();
      ev.preventDefault();
    }

  };

  this.onMouseUp = function(ev) {
    if (this.isDragging) {
      console.log("Egg dropped.", ev);
      var data = this.data;

      this.data = null;
      this.isDragging = false;
      this.writerView.el.removeEventListener('mousemove', this._onMouseMove, true);
      this.writerView.el.removeEventListener('mouseup', this._onMouseUp, true);
      window.getSelection().removeAllRanges();
      ev.stopPropagation();
      ev.preventDefault();

      var position = _getPositionFromPoint(ev);
      var surface = this.writerView.getSurface(data.surfaceName);
      var annotationId = data.annotationId;
      var coor = surface.getCoordinateForPosition(position);

      if (!coor) return;

      var component = surface.getContainer().getComponent(coor[0]);
      var charPos = coor[1];

      var annotation = this.writerCtrl.document.get(annotationId);
      var pathVar, charPosVar;
      if (data.boundary === "left") {
        pathVar = "startPath";
        charPosVar = "startCharPos";
      } else {
        pathVar = "endPath";
        charPosVar = "endCharPos";
      }

      var tx = surface.docCtrl.session.startSimulation();
      if (!_.isEqual(annotation[pathVar], component.path)) {
        // HACK: using an internal flag to distinguish explicit and
        // implicit multi-annotation updates
        // Note: implicit changes are inferred by annotator
        // and explicit changes are done here
        tx.document.set([annotationId, pathVar], component.path, {
          "multi-annotation-update": true
        });
      }
      if (annotation[charPosVar] !== charPos) {
        tx.document.set([annotationId, charPosVar], charPos, {
          "multi-annotation-update": true
        });
      }
      annotation.removeFragments(tx);
      tx.document.get(annotationId).addFragments(tx);
      tx.save();
      surface.docCtrl._afterEdit(this);
    }
  };
};
EditAnnotationRange.Prototype.prototype = Workflow.prototype;
EditAnnotationRange.prototype = new EditAnnotationRange.Prototype();

module.exports = EditAnnotationRange;

},{"./workflow":121,"underscore":273}],120:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var Workflow = require('./workflow');

var ToggleResourceReference = function() {
  Workflow.apply(this, arguments);

  this.handlers = [];
};

ToggleResourceReference.Prototype = function() {


  this.registerHandlers = function() {
    // Register event delegates to react on clicks on a reference node in the content panel
    // _.each(this.writerCtrl.panels, function(panel) {
    //   var name = panel.getName();
    //   var config = panel.getConfig();
    //   _.each(config.references, function(refType) {
    //     var handler = _.bind(this.toggleResourceReference, this, name);
    //     this.handlers.push(handler);
    //     this.writerView.$el.on('click', '.annotation.' + refType, handler);
    //   }, this);
    // }, this);
  };

  this.unRegisterHandlers = function() {
    // for (var i = 0; i < this.handlers.length; i++) {
    //   this.writerView.$el.off('click', this.handlers[i]);
    // }
  };

  this.toggleResourceReference = function(panel, e) {
    // var state = this.writerCtrl.state;
    // var refId = e.currentTarget.dataset.id;
    // var ref = this.writerCtrl.getDocument().get(refId);
    // var nodeId = this.writerView.getContentContainer().getRoot(ref.path[0]);
    // var resourceId = ref.target;

    // // If the resource is active currently, deactivate it
    // if (resourceId === state.right) {
    //   this.writerCtrl.modifyState({
    //     panel: this.writerCtrl.currentPanel,
    //     left: null,
    //     right:  null
    //   });
    // }
    // // Otherwise, activate it und scroll to the resource
    // else {
    //   this.writerView.saveScroll();
    //   this.writerCtrl.modifyState({
    //     panel: panel,
    //     left: nodeId,
    //     right: resourceId
    //   });
    //   this.writerView.panelViews[panel].jumpToResource(resourceId);
    // }
    // e.preventDefault();
  };
};

ToggleResourceReference.Prototype.prototype = Workflow.prototype;
ToggleResourceReference.prototype = new ToggleResourceReference.Prototype();

module.exports = ToggleResourceReference;

},{"./workflow":121,"underscore":273}],121:[function(require,module,exports){
"use strict";

var Workflow = function() {
  this.writerController = null;
  this.writerView = null;
};

Workflow.Prototype = function() {

  /* jshint unused:false */

  this.attach = function(writerController, writerView) {
    this.writerCtrl = writerController;
    this.writerView = writerView;
    this.registerHandlers();
  };

  this.detach = function() {
    this.unRegisterHandlers();
    this.writerView = null;
    this.writerController = null;
  };

  this.registerHandlers = function() {
    throw new Error('This method is abstract');
  };

  this.unRegisterHandlers = function() {
    throw new Error('This method is abstract');
  };

  // override this if state changes are relevant
  this.handlesStateUpdate = false;

  // override this method and return true if the state update is handled by this workflow
  this.handleStateUpdate = function(state, stateInfo) {
    throw new Error('This method is abstract');
  };

};

Workflow.prototype = new Workflow.Prototype();

module.exports = Workflow;

},{}],122:[function(require,module,exports){
(function (process,global){
"use strict";

var Controller = require("substance-application").Controller;
var WriterView = require("./writer_view");

var _ = require("underscore");

// used for the `content` panel
var RichtextEditorFactory = require("./editors/richtext_editor_factory");
var FiguresEditorFactory = require("./editors/figures_editor_factory");
var InfosEditorFactory = require("./editors/infos_editor_factory");
var IssuesEditorFactory = require("./editors/issues_editor_factory");
var CitationsEditorFactory = require("./editors/citations_editor_factory");

var RichtextAnnotator = require("./editors/richtext_annotator");

var Document = require("substance-document");
var DocumentSession = Document.Session;
// var Container = Document.Container;

var util = require("substance-util");

// ComposerEditorController is a subclass of EditorController which adds
// some special helpers
var ComposerEditorController = require("./composer_editor_controller.js");

// Define Errors
var errors = util.errors;
var FileUploadError = errors.define("FileUploadError", -1);

// Helpers
// ----------------------------------------
//

var MAX_FILE_SIZE = 1024 * 1024 * 150; // 150 MB

var __calcFileSize = function(files) {
  var size = 0;
  for (var i = 0; i < files.length; i++) {
    size += files[i].size;
  }
  return size;
};

var __checkMaxFileSize = function(files) {
  return __calcFileSize(files) <= MAX_FILE_SIZE;
};

// Writer.Controller
// =================
//
// Controls the Reader.View
//
// states:
//   - `main`: text left, one of the context panels right (TODO: find a better name)
//   - `issue`: enables a child-controller for the issue panel

// deprecated states:
//   - `node`: a specific document node is selected
//   - `resource`: a specific resource node is selected


var WriterController = function(doc, options) {
  this.document = doc;
  this.shell = options.shell;

  this.panels = options.panels;
  this.tools = options.tools;

  this.panelControllers = {};
  _.each(this.panels, function(panel) {
    this.panelControllers[panel.getName()] = panel.createController(doc, this);
  }, this);

  this.workflows = options.workflows || [];

  console.log('registered workflows', this.workflows);

  this.composerCtrl = options.composerCtrl;
  this.options = options || {};

  this.keymap = WriterController._getDefaultKeyMap();
};

WriterController.Prototype = function() {

  var __super__ = Controller.prototype;

  this.createView = function() {
    if (!this.view) {
      this.view = new WriterView(this, this.options);
    }
    return this.view;
  };

  // tell the Application API that this controller has a default initializer
  this.DEFAULT_STATE = {
    id: "main",
    contextId: "content"
  };

  this.initialize = function(newState, cb) {
    var doc = this.document;

    this.lastContext = "toc";

    // Note: the sub-controllers exist over the whole life-cycle of this controller
    // i.e., they are not disposed until this controller is disposed

    this.contentCtrl = new ComposerEditorController(
      new DocumentSession(doc.get("content")),
      new RichtextEditorFactory(doc)
    );

    this.annotator = new RichtextAnnotator();

    if (doc.contains("figures")) {
      this.figuresCtrl = new ComposerEditorController(
        new DocumentSession(doc.get("figures")),
        new FiguresEditorFactory()
      );
    }
    if (doc.contains("info")) {
      this.infoCtrl = new ComposerEditorController(
        new DocumentSession(doc.get("info")),
        new InfosEditorFactory()
      );
    }
    if (doc.contains("citations")) {
      this.citationsCtrl = new ComposerEditorController(
        new DocumentSession(doc.get("citations")),
        new CitationsEditorFactory()
      );
    }
    if (doc.contains("remarks")) {
      this.remarksCtrl = new ComposerEditorController(
        new DocumentSession(doc.get("remarks")),
        new IssuesEditorFactory()
      );
    }
    if (doc.contains("errors")) {
      this.errorsCtrl = new ComposerEditorController(
        new DocumentSession(doc.get("errors")),
        new IssuesEditorFactory()
      );
    }

    this.referenceIndex = doc.getIndex("references");
    var panelNames = ["content", "figures", "citations", "info", "errors", "remarks"];

    this.allCtrls = [];

    for (var i = 0; i < panelNames.length; i++) {
      var ctrlName = panelNames[i] + "Ctrl";
      var ctrl = this[ctrlName];
      if (ctrl) {
        this.allCtrls.push(ctrl);
      }
    }

    // Exmperimental: on each selection change we will check if a state transition has to be done (e.g., activate comment view)
    _.each(this.allCtrls, function(ctrl) {
      this.listenTo(ctrl.session.selection, "selection:changed", this.onSelectionChange.bind(this, ctrl));
      this.listenTo(ctrl, "document:edited", this.onDocumentEdit);
      this.listenTo(ctrl, "error", this.onError);
    }, this);

    this.listenTo(this.document, "property:updated", this.onPropertyUpdate);

    this.createView().render();

    cb(null);
  };

  this.transition = function(newState, cb) {
    // handle reflexiv transitions
    if (newState.id === this.state.id) {
      var skipTransition = false;
      switch (newState.id) {
      case "main":
        skipTransition = (newState.contextId === this.state.contextId && newState.resourceId === this.state.resourceId && (newState.nodeId === this.state.nodeId && newState.subjectReferenceId === this.state.subjectReferenceId && this.state.mode === newState.mode));
        break;
      case "imageurl":
        // it is not possible to switch reflexively into this state
        skipTransition = true;
        break;
      }
      if (skipTransition) return cb(null, {skip: true});
    }

    // Workflows should also hook into here to modularize state transition handling
    // var workflowNames = Object.keys(this.writerCtrl.workflows);

    // for (var i = 0; i < workflowNames.length; i++) {
    //   var workflow = this.writerCtrl.workflows[workflowNames[i]];
    //   if (workflow.handlesStateUpdate) {
    //     handled = workflow.handleStateUpdate(state, oldState, stateInfo);
    //     if (handled) {
    //       console.log('handled by ', workflow);
    //       break;
    //     }
    //   }
    // }

    cb(null);
  };

  this.dispose = function() {
    __super__.dispose.call(this);
    this.stopListening();

    if (this.view) this.view.dispose();
    if (this.contentCtrl) this.contentCtrl.dispose();
    if (this.figuresCtrl) this.figuresCtrl.dispose();
    if (this.infoCtrl) this.infoCtrl.dispose();
    if (this.issueCtrl) this.issueCtrl.dispose();
    if (this.referenceIndex) this.referenceIndex.dispose();
    if (this.__saveDocumentThread) window.clearInterval(this.__saveDocumentThread);
    if (this.childController) this.childController.dispose();

    if (this.document.__backend__) {
      var self = this;
      this.document.__backend__.save(function(err) {
        if (err) console.error("Could not save document:", self.document.id);
        else self.document.__backend__.close();
      });
    }

    this.view = null;
    this.contentCtrl = null;
    this.figuresCtrl = null;
    this.infoCtrl = null;
    this.referenceIndex = null;
    this.__saveDocumentThread = null;
  };

  this.afterTransition = function(oldState) {
    if (this.view) {
      this.view.updateState(this.state, oldState);
    }
  };

  var contextMapping = {
    "figure_reference": "figures",
    "contributor_reference": "info",
    "remark_reference": "remarks",
    "error_reference": "errors",
    "citation_reference": "citations",
    "location_reference": "locations",
    "person_reference": "persons",
    "definition_reference": "definitions"
    // "subject_reference": "subjects"
  };

  var _isReferenceType = function(anno) {
    return contextMapping[anno.type] !== undefined;
  };

  var _focusResource = function(self, contextId, resourceId) {
    var state = self.state;
    var states = [];
    states.push({
      id: "main",
      contextId: contextId,
      resourceId: resourceId
    });

    self.switchState(states, {updateRoute: true, replace: false});
  };

  // EXPERIMENTAL: react when an issue is selected
  // TODO: refactor this
  this.onSelectionChange = function(docCtrl /*,range, options*/) {
    // console.log("onSelectionChange...", docCtrl.session.container.name);
    this.currentController = docCtrl;
    this.viewName = docCtrl.session.container.name;
    this.currentSession = docCtrl.session;
    this.view.onSelectionUpdate();

    // Note: if the selection moves into an annotation
    // we check if it is a reference type and activate or focus the referenced resource

    // TODO: maybe it is more practical to return an array instead of a hash?
    var annos = this.currentSession.annotator.getAnnotations(this.currentSession.selection);
    annos = _.filter(annos, _isReferenceType);
    var ids = Object.keys(annos);
    if (ids.length === 1) {
      var anno = annos[ids[0]];
      _focusResource(this, contextMapping[anno.type], anno.target);
    }

    // if the selection is in a resource in the resource panel
    // we activate the resource
    // TODO: we should find a generalization for accessing views/controllers
    else if (_.include(["figures", "info", "errors", "remarks", "citations"], this.viewName)) {
      if (!this.currentSession.selection.isNull()) {
        var cursor = this.currentSession.selection.getCursor();
        var resource = this.currentSession.container.getRootNodeFromPos(cursor.pos);
        this.switchState({
            id: "main",
            contextId: this.state.contextId,
            resourceId: resource.id,
          },
          {updateRoute: true, replace: true, "no-scroll": true}
        );
      }
    }

    // Otherwise, we reset the state to 'main'
    // Note: this is important to be able to leave a sub-state
    // by clicking into the document
    else {
      this.switchState({
        id: "main",
        contextId: this.state.contextId
      }, { updateRoute: true, replace: true });
    }
  };

  // Note: on every selection change the currentEditor is set.
  // Thus, this method returns the editor controller responsible for the container
  // of the last selection.
  this.getCurrentEditor = function() {
    return this.currentController;
  };

  // Schedule autosave
  //
  // Maybe we should get this out of the WriterController and instead notify
  // the parent controller by calling this.options.onAutoSave?
  // Currently we implement both, since in the stripped down writer version
  // we don't use a backend

  this._scheduleSaveDocument = function() {
    var self = this;

    if ((this.document.__backend__ || self.options.onAutoSave) && !this.__saveDocumentTask) {
      this.__saveDocumentTask = window.setTimeout(
        function() {
          if (self.view) {
            if (self.options.onAutoSave) self.options.onAutoSave();

            // if (this.document.__backend__) {
            //   self.document.__backend__.save();
            // }

            // Note: the outline needs to be updated after changes
            // that affect the height of some nodes.
            // Despite of adding nodes this happens also when adding text
            // For now we stick to update the outline whenever we save the document.
            self.view.updateOutline();
            self.view.contentView.annotationBar.render();
          }
          self.__saveDocumentTask = null;
        },
        200);
    }
  };

  function _updateToc(self) {
    window.setTimeout(function() {
      if (self.view.tocView) {
        // console.log("WriterController.onDocumentChange: updating TOC....");
        self.view.tocView.render();
      }
    }, 0);
  }

  this.onDocumentEdit = function() {
    if (!this.view) return;
    this.document.__dirty = true;
    this.view.onDocumentEdit();
    if (this.options.onDocumentEdit) this.options.onDocumentEdit();
    // Trigger a task to save the document to the backend
    this._scheduleSaveDocument();
  };

  this.onError = function(error) {
    console.error(error.message);
    util.printStackTrace(error);

    if (error.name === "SelectionError") {
      // do not show selection errors as they are a bit noisy
    } else {
      this.composerCtrl.sendError(error);
    }
  };

  this.onPropertyUpdate = function(path/*, diff*/) {
    if (!this.view) return;

    // TODO: it would be more efficient, if the TOC would itself be able to react on
    // Document changes and update its view in a minimalistic way
    var updateToc = false;

    if (path[0] === "content") {
      updateToc = true;
    } else if (path[1] === "content" || path[1] === "level") {
      var node = this.document.get(path[0]);
      if (node.type === "heading") {
        updateToc = true;
      }
    }

    if (updateToc) {
      _updateToc(this);
    }
  };


  // API used by WriterView
  // ----------------------

  this.getContextId = function() {
    return this.state.contextId || "toc";
  };


  this.getResourceReferenceContainers = function(resourceId) {
    // A reference is an annotation node. We want to highlight
    // all (top-level) nodes that contain a reference to the currently activated resource
    // For that we take all references pointing to the resource
    // and find the root of the node on which the annotation sticks on.
    var references = this.referenceIndex.get(resourceId);
    var container = this.contentCtrl.session.container;
    var nodes = _.uniq(_.map(references, function(ref) {
      // HACK: Do proper schema inspection
      if (ref.type === "block_reference") {
        return ref.id;
      } else {
        var component = container.lookup(ref.path);
        return component.root.id;
      }

    }));
    return nodes;
  };

  // Returns the view where the last selection change has been done.
  this.getCurrentView = function() {
    return this.viewName || "content";
  };

  this.hasFigures = function() {
    return this.figuresCtrl;
  };
  this.hasCitations = function() {
    return this.citationsCtrl;
  };
  this.hasInfo = function() {
    return this.infoCtrl;
  };
  this.hasRemarks = function() {
    return this.remarksCtrl;
  };
  this.hasErrors = function() {
    return this.errorsCtrl;
  };

  this.hasView = function(view) {
    return this[view+"Ctrl"];
  };


  // Legacy:
  // ----------------------
  //
  // removed WriterView.ToolbarAdapter
  // and using WriterController directly
  // these methods remain

  this.insertNode = function(type, data) {
    this.currentController.insertNode(type, data);
  };

  this.getTextMode = function() {
    var node = this.getCurrentNode();
    if (!node) return null;
    return node.type;
  };

  this.getCurrentNode = function() {
    var session = this.currentSession;
    if (!session) return null;
    var selection = session.selection;

    if (selection.hasMultipleNodes()) return null;
    if (selection.isNull()) return null;

    var pos = selection.getCursorPosition();
    var component = session.container.getComponent(pos[0]);

    if (!component) {
      // E.g. this happens when you put the cursor into a single remark
      // and then delete it. Obviously, the selection does not cleared
      console.log("FIXME: selection is not null, but there is no component.");
      return null;
    }

    return component.root;
  };

  this.getAnnotations = function() {
    var session = this.currentSession;
    // Note: this happens when the user has not done a selection
    if (!session) return {};
    return session.annotator.getAnnotations(session.selection);
  };

  this.getActiveAnnotation = function() {
    var annotations = this.getAnnotations();
    if (annotations.length > 1) return null;
    return annotations[0];
  };

  // Used by AnnotationTools (e.g. HyperLinkTool)
  this.getActiveAnnotationByType = function(type) {
    var editor = this.getCurrentEditor();
    if (!editor) return null;

    var annotations = editor.annotator.getAnnotations(editor.selection);
    for (var i=0; i < annotations.length; i++) {
      var a = annotations[i];
      if (a.type === type) return a.id;
    }
  };

  this.generatePreview = function(doc, cb) {
    if (this.options.generatePreview) this.options.generatePreview(doc, cb);
  };

  this.openExternalLink = function(url) {
    if (this.options.openExternalLink) {
      this.options.openExternalLink(url);
    } else {
      window.open(url);
    }
  };

  this.setSelection = function(containerId, sel) {
    this[containerId+"Ctrl"].session.selection.set(sel);
  };

  // Facette to for document manipulation
  // ------------------------------------
  // Otherwise we will loose control about editing

  this.createAnnotation = function(type, data) {
    // HACK: we want to set the cursor into the description field of remark and error
    // This is waiting for a refactor of the EditorController which
    // should it make easier to extend editing capabilities.

    this.currentController.annotate(type, data);

    var container, component, components, docCtrl, sel;
    if (type === "remark_reference") {
      docCtrl = this.remarksCtrl;
      container = this.document.get("remarks");
      components = container.getNodeComponents(this.state.resourceId);
      component = components[0];
      sel = [component.pos, 0];
    } else if (type === "error_reference") {
      docCtrl = this.errorsCtrl;
      container = this.document.get("errors");
      components = container.getNodeComponents(this.state.resourceId);
      component = components[0];
      sel = [component.pos, 0];
    }

    if (sel) {
      // Note: delaying would not be necessary if we have done the EditorController
      // refactor and we can implement a editing simulation here.
      window.setTimeout( function() {
        docCtrl.selection.set(sel);
      }, 0);
    }
  };

  this.deleteAnnotation = function(nodeId) {
    this.currentController.deleteAnnotation(nodeId);
  };

  this.switchNodeType = function(newType, data) {
    this.currentController.changeType(newType, data);
  };

  var FILE_OPTIONS_FIGURE = { multiple: false, accept: 'image/*' };
  var FILE_OPTIONS_VIDEO = { multiple: true, accept: 'video/*,image/*' };
  var FILE_OPTIONS_AUDIO = { multiple: true, accept: 'audio/*' };
  var FILE_OPTIONS_WEBPAGE = { multiple: false, accept: 'text/html' };


  // Opens a file dialog and inserts a new figure
  // -------
  // Note: this is called by the WriterView
  //
  this.insertFigure = function() {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_FIGURE, function(err, files) {
      if (err) return console.error(err);
      if (files.length !== 1) return;
      var file = files[0];
      var editorCtrl = self.contentCtrl;
      editorCtrl.insertFigure(file);
      self.onDocumentEdit();
    });
  };

  // Replaces an image at the given path
  // -------------
  // Uses the shell to open a file dialog.
  // Note: this is triggered e.g. by CoverView or FigureView using a document event 'replace-image'
  //
  this.replaceImage = function(path) {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_FIGURE, function(err, files) {
      if (err) return console.error(err);
      if (files.length !== 1) return;
      var file = files[0];
      var editorCtrl = self.contentCtrl;
      editorCtrl.setFile(path, file);
      self.onDocumentEdit();
    });
  };

  this.insertVideo = function() {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_VIDEO, function(err, files) {
      if (err) return console.error(err);
      var editorCtrl = self.contentCtrl;
      editorCtrl.insertVideo(files);
      self.onDocumentEdit();
    });
  };

  this.replaceVideo = function(videoId) {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_VIDEO, function(err, files) {
      if (err) return console.error(err);
      var editorCtrl = self.contentCtrl;
      editorCtrl.setVideoFiles(videoId, files);
      self.onDocumentEdit();
    });
  };

  this.insertAudio = function() {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_AUDIO, function(err, files) {
      if (err) return console.error(err);
      var editorCtrl = self.contentCtrl;
      editorCtrl.insertAudio(files);
      self.onDocumentEdit();
    });
  };

  this.replaceAudio = function(audioId) {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_AUDIO, function(err, files) {
      if (err) return console.error(err);
      var editorCtrl = self.contentCtrl;
      editorCtrl.setAudioFiles(audioId, files);
      self.onDocumentEdit();
    });
  };

  this.insertWebPage = function(webPageFiles) {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_WEBPAGE, function(err, files) {
      if (err) return console.error(err);
      if (files.length !== 1) return;
      var file = files[0];
      var editorCtrl = self.contentCtrl;
      editorCtrl.insertWebPage(file);
      self.onDocumentEdit();
    });
  };

  this.replaceWebPageFile = function(webPageId, webpageFile) {
    var self = this;
    this.shell.openFileDialog(FILE_OPTIONS_WEBPAGE, function(err, files) {
      if (err) return console.error(err);
      if (files.length !== 1) return;
      var file = files[0];
      var editorCtrl = self.contentCtrl;
      editorCtrl.setWebPageFile(webPageId, file);
      self.onDocumentEdit();
    });
  };

  this.setFile = function(path, file, options) {
    if (!__checkMaxFileSize([file])) {
      return this.sendError(new FileUploadError("Limit of "+util.getReadableFileSizeString(MAX_FILE_SIZE)+ " exceeded"));
    }
    var editorCtrl = this.contentCtrl;
    editorCtrl.setFile(path, file, options);

    this.onDocumentEdit();
  };

  this.addContributor = function() {
    var newContribId = this.infoCtrl.addContributor();

    this.onDocumentEdit();
    this.switchState({
      id: "main",
      contextId: "info",
      resourceId: newContribId
    });
  };

  this.deleteResource = function(container, resourceId) {
    var editorCtrl = this[container+"Ctrl"];
    editorCtrl.deleteResource(resourceId);

    // trigger saving
    this.onDocumentEdit();
    if (this.state.id === "main") {
      var newState = _.clone(this.state);
      delete newState.resourceId;
      this.switchState(newState, { updateRoute: true, replace: true });
    }
  };

  // Actions
  // -------
  //
  // Actions are used to inverse control. The toolbar does not
  // need to know about actions, just needs to update the active state
  // of buttons.
  // When a button is clicked, the action is delegated to this controller

  // TODO: refactor/cleanup the actions stuff
  // Note: action are things such as toggling an annotation.
  // Currently the implementation is somewhat spread over multiple files
  // E.g., EditorController, RichtextAnnotator...

  this.getActions = function() {
    var session = this.currentSession;
    if (!session) return [];
    if (this.currentController.view !== "content") return [];
    // Get allowed actions for annotations

    var actions = this.annotator.getAllowedActions(session, session.selection);
    // Get allowed actions for content insertion
    actions = actions.concat(this.currentController.getAllowedActions());

    return actions;
  };

  this.performAction = function(action) {
    // Note: change this to delegate actions in a different way
    // e.g., depending on the type.
    switch (action.action) {
    case "createAnnotation":
      if (action.type === "citation_reference") {
        this.beginAddRef("citation");
      } else {
        this.createAnnotation(action.type, action.data);
      }
      break;
    case "deleteAnnotation":
      this.deleteAnnotation(action.id);
      break;
    default:
      console.error("Action not implemented: ", action);
      return;
    }
  };

  // Workflows
  // ---------

  this.rollBack = function() {
    this.document.chronicle.reset(this.state["recover"]);
    this.document.chronicle.mark("master");
  };

};

WriterController.Prototype.prototype = Controller.prototype;
WriterController.prototype = new WriterController.Prototype();

WriterController._getDefaultKeyMap = function() {
  var keymap = require("./default_keymap_osx");
  if (global.navigator !== undefined) {
    var platform = global.navigator.platform;
    if (platform.toLowerCase().search("linux") >= 0) {
      keymap = require("./default_keymap_unix");
    }
    else if (platform.toLowerCase().search("win32") >= 0) {
      // currently we use the same keymap for linux and win
      keymap = require("./default_keymap_unix");
    }
  } else if (process !== undefined) {
    if (process.platform !== 'darwin') {
      keymap = require("./default_keymap_unix");
    }
  }
  return keymap;
};

module.exports = WriterController;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./composer_editor_controller.js":46,"./default_keymap_osx":51,"./default_keymap_unix":52,"./editors/citations_editor_factory":58,"./editors/figures_editor_factory":65,"./editors/infos_editor_factory":67,"./editors/issues_editor_factory":69,"./editors/richtext_annotator":72,"./editors/richtext_editor_factory":73,"./writer_view":123,"_process":3,"substance-application":10,"substance-document":136,"substance-util":268,"underscore":273}],123:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");
var $ = window.$;
var EditableSurface = require("substance-surface").EditableSurface;
var Outline = require("substance-outline");
var View = require("substance-application").View;

var ContentToolsController = require("./content_tools_controller");
var ResourceToolsController = require("./resource_tools_controller");

var TOC = require("substance-toc");
var $$ = require("substance-application").$$;

var AnnotationBar = require('./annotation_bar');

var CORRECTION = 0; // Extra offset from the top

// A function defined below
var __createRenderer;
var __createEditableSurface;
var __addResourcePanel;

var panels = {
  "citations": {
    name: "Links",
    icon: "icon-link"
  },

  "remarks": {
    name: "Remarks",
    icon: "icon-comments"
  },
  // "info": {
  //   name: "Info",
  //   icon: "icon-info-sign"
  // }
};


// Substance WriterView
// ==========================================================================
//

var WriterView = function(writerCtrl, options) {
  View.call(this);

  // Controllers
  // --------

  this.writerCtrl = writerCtrl;
  this.options = options || {};

  var doc = this.writerCtrl.document;

  this.$el.addClass('article article-view');
  this.$el.addClass(doc.schema.id); // Substance article or lens article?

  // Clipboard
  // ----
  // Note: creating this before Surfaces to be able to share the clipboard

  this.clipboard = this.writerCtrl.shell.getClipboard(this.writerCtrl);

  if (!window.useNativeClipboard) {
    this.el.oncopy = this.clipboard.onCopy.bind(this.clipboard);
  }

  // Surfaces
  // --------
  this.surfaces = [];

  // Note: it doesn't feel good to use a static renderer class here. However, we have no other idea right now.

  // A Substance.Document.Writer instance is provided by the controller
  this.contentView = __createEditableSurface(this, doc, "content");
  this.contentView.el.classList.add("content");
  this.contentView.el.setAttribute("id", "content");

  // Inject annotation bar for highlighting references
  var annotationBar = new AnnotationBar(this.contentView, this.writerCtrl);
  this.contentView.annotationBar = annotationBar;
  this.contentView.el.appendChild(annotationBar.el);

  this.surfaces.push(this.contentView);

  // Content Tools (annotation toggles, create resources etc.)
  // --------

  this.contentToolsCtrl = new ContentToolsController(this.writerCtrl);
  this.contentToolsView = this.contentToolsCtrl.createView();

  // Resource Tools (dialogs for the resource panel like "Choose link or createa  new one")
  // --------

  this.resourceToolsCtrl = new ResourceToolsController(this.writerCtrl);
  this.resourceToolsView = this.resourceToolsCtrl.createView();


  // Table of Contents
  // --------

  this.tocView = new TOC(this.writerCtrl.contentCtrl);
  this.tocView.SHOW_ALWAYS = true;

  this.tocView.$el.addClass('resource-view');

  // Create resource panels
  // --------

  _.each(panels, function(panel, panelName) {
    if (this.writerCtrl.hasView(panelName)) __addResourcePanel(this, doc, panelName);
  }, this);


  // Create even more resource panels
  // --------

  this.panelViews = {};
  this._onToggleResourcePanel = _.bind(this.switchContext, this);

  _.each(this.writerCtrl.panels, function(panel) {
    var panelView = this.writerCtrl.panelControllers[panel.getName()].createView();
    panelView.on('toggle', this._onToggleResourcePanel);

    this.panelViews[panel.getName()] = panelView;
  }, this);

  // Attach workflows
  _.each(this.writerCtrl.workflows, function(workflow) {
    workflow.attach(this.writerCtrl, this);
  }, this);

  // Index for resource references (shared with controller)
  // ----

  this.resources = this.writerCtrl.referenceIndex;

  // Outline
  // --------

  this.outline = new Outline(this.contentView);

  // Resource Outline
  // --------

  this.resourcesOutline = new Outline(this.figuresView);

  // DOM Events
  // --------
  //

  this.contentView.$el.on('scroll', _.bind(this.onContentScroll, this));

  // Default selection state
  this.selectionState = "no-selection";

  // Bind scroll events to all panels
  _.each(panels, function(panel, panelName) {
    var viewName = panelName+"View";
    if (this[viewName]) {
      this[viewName].$el.on('scroll', _.bind(this.onResourceContentScroll, this));
    }
  }, this);

  // Events:
  // ----
  // TODO: repair the mouseup insanity

  // TODO: Why we currently need to have 'mouseup' handlers?
  // I try to deactivate them to see what we actually need.
  // In any case, we should try to get rid of the 'mouseup' handlers.

  this.listenTo(doc, 'resource-ready', this.onResourceReady.bind(this));

  this.$el.on('click', '.authors .toggle-author', _.bind(this.toggleAuthor, this));
  // this.$el.on('mouseup', '.authors .toggle-author', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.insert-media', _.bind(this.onInsertMedia, this));
  this.$el.on('mouseup', '.insert-media', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.insert-author', _.bind(this.onInsertAuthor, this));
  // this.$el.on('mouseup', '.insert-author', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.document .toggle-resource', _.bind(this.onToggleResourceReference, this));
  // this.$el.on('mouseup', '.document .toggle-resource', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.resources .toggle-resource', _.bind(this.onToggleResource, this));
  // this.$el.on('mouseup', '.resources .toggle-resource', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.image-status .actions .replace', _.bind(this.onReplaceImage, this));
  // this.$el.on('mouseup', '.image-status .actions .replace', _.bind(this._stopPropagation, this));

  this.$el.on('click', ".image-placeholder .add-image", _.bind(this.onReplaceImage, this));
  // this.$el.on('mouseup', '.image-placeholder .add-image', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.video-status .actions .replace', _.bind(this.onReplaceVideo, this));
  // this.$el.on('mouseup', '.video-status .actions .replace', _.bind(this._stopPropagation, this));

  this.$el.on('click', '.audio-status .actions .replace', _.bind(this.onReplaceAudio, this));
  // this.$el.on('mouseup', '.audio-status .actions .replace', _.bind(this._stopPropagation, this));

  // Delete resource (Figure, Video, Audio, Contributor)
  this.$el.on('click', ".content-node .delete-resource", _.bind(this.onDeleteResource, this));
  // this.$el.on('mouseup', '.content-node .delete-resource', _.bind(this._stopPropagation, this));

  // HACK: extra wurst for collaborator
  // TODO: unify using a placeholder
  this.$el.on('click', ".content-node.contributor .image", _.bind(this.onReplaceImage, this));
  // this.$el.on('mouseup', '.content-node.contributor .image', _.bind(this._stopPropagation, this));

  // HACK: handle cases where the surface does not know that it should be updated
  // this.$el.on('mouseup', _.bind(this.onMouseup, this));
};

WriterView.Prototype = function() {

  this._stopPropagation = function(e) {
    // e.preventDefault();
    e.stopPropagation();
  };

  this.onToggleResourceReference = function(e) {
    var refId = $(e.currentTarget).closest('.content-node').attr('id');
    var doc = this.writerCtrl.document;


    var blockRef = doc.get(refId);
    var resourceId = blockRef.target;
    // var resource = doc.get(resourceId);
    var state = _.clone(this.writerCtrl.state);

    if (state.resourceId === resourceId) {
      // Untoggle
      this.writerCtrl.switchState({
        id: "main",
        contextId: state.contextId
      }, {"no-scroll": true, updateRoute: true});
    } else {
      // Toggle
      this.writerCtrl.switchState({
        id: "main",
        contextId: "figures",
        resourceId: resourceId
      }, {updateRoute: true});
    }
    e.preventDefault();
  };

  this.onToggleResource = function(e) {
    var resourceId = $(e.currentTarget).closest('.content-node').attr('id');
    var doc = this.writerCtrl.document;
    var resource = doc.get(resourceId);
    var state = _.clone(this.writerCtrl.state);

    // HACK: Find a smarter way
    // if (type === "block_reference") type = "figure";

    if (state.resourceId === resourceId) {
      // Untoggle
      this.writerCtrl.switchState({
        id: "main",
        contextId: state.contextId
      }, {"no-scroll": true, updateRoute: true});
    } else {
      // Toggle
      this.writerCtrl.switchState({
        id: "main",
        contextId: resource.type+"s",
        resourceId: resourceId
      }, {"no-scroll": true, updateRoute: true});
    }
    e.preventDefault();
  };

  // Handles image replacement e.g. in Cover, Figure, etc.
  // --------
  // Triggered by event delegator.

  this.onReplaceImage = function(e) {
    var $el = $(e.currentTarget);
    var path = $el.attr('data-path').split('.');
    this.writerCtrl.replaceImage(path);
  };

  // Handles video replacement
  // --------
  // Triggered by event delegator.

  this.onReplaceVideo = function(e) {
    var $el = $(e.currentTarget);
    var videoId = $el.attr('data-id');
    this.writerCtrl.replaceVideo(videoId);
  };

  // Handles audio replacement
  // --------
  // Triggered by event delegator.

  this.onReplaceAudio = function(e) {
    var $el = $(e.currentTarget);
    var audioId = $el.attr('data-id');
    this.writerCtrl.replaceAudio(audioId);
  };

  // Delete a resource (including all references)
  // --------
  //
  // TODO: Move to the right place

  this.toggleAuthor = function(e) {
    var resourceId = e.currentTarget.getAttribute('data-id');
    var state = this.writerCtrl.state;

    if (state.resourceId === resourceId) {
      // Reset
      this.writerCtrl.switchState({
        id: "main",
        contextId: "toc"
      });
    } else {
      // Highlight
      this.writerCtrl.switchState({
        id: "main",
        contextId: "info",
        resourceId: resourceId
      });
    }
    return false;
  };

  // Insert Media
  // --------------------
  //
  // Figures, Videos, Audio files

  // Do not react when the button is disabled
  // or the current selection is invalid
  this.checkMediaValidity = function(mediaType) {
    var currentSession = this.writerCtrl.currentSession;
    var insertButton = window.document.querySelector('.insert-media.'+mediaType);
    return !(!insertButton || insertButton.classList.contains("disable") ||
        !currentSession || currentSession.selection.isNull());

  };

  this.onInsertMedia = function(e) {
    var mediaType = $(e.currentTarget).attr("data-type");
    if (this.checkMediaValidity(mediaType)) {
      switch(mediaType) {
        case 'figure': this.writerCtrl.insertFigure(); break;
        case 'video': this.writerCtrl.insertVideo(); break;
        case 'audio': this.writerCtrl.insertAudio(); break;
        case 'web_page': this.writerCtrl.insertWebPage(); break;
        default: throw 'Not implemented';
      }
    }
    e.preventDefault();
  };

  this.onInsertAuthor = function(e) {
    this.writerCtrl.addContributor();
    e.preventDefault();
  };

  // Delete a resource (including all references)
  // --------
  //
  // TODO: Move to the right place

  this.onDeleteResource = function(e) {
    var resourceEl = __findParentElement(e.currentTarget, '.content-node');
    var contextEl = __findParentElement(e.currentTarget, '.surface');
    var resourceId = resourceEl.getAttribute('id');
    var container = contextEl.getAttribute('id');

    this.writerCtrl.deleteResource(container, resourceId);
    return false;
  };

  // Toggles on and off the zoom
  // --------
  //

  this.toggleFullscreen = function() {
    var state = this.writerCtrl.state;
    var fullscreen = state["fullscreen"] || false;
    var newState = _.clone(state);
    newState.fullscreen = !fullscreen;
    this.writerCtrl.switchState(newState);
  };

  // This is an adapter for `this.jumpToNode` which is bound to nodes of the outline
  // and maps from outline node ids to the real nodes.
  this._jumpToNode = function(e) {
    var nodeId = $(e.currentTarget).attr('id').replace("outline_", "");
    this.jumpToNode(nodeId);
    return false;
  };

  // Follow cross reference
  // --------
  //

  this.followCrossReference = function(e) {
    var aid = $(e.currentTarget).attr('id');
    var a = this.writerCtrl.document.get(aid);
    this.jumpToNode(a.target);
  };

  // On Scroll update outline and mark active heading
  // --------
  //

  this.onContentScroll = function() {
    var scrollTop = this.contentView.$el.scrollTop();
    this.outline.updateVisibleArea(scrollTop);
    this.markActiveHeading(scrollTop);
  };

  // Update Content tools based on the new selection
  // --------
  //

  this.onSelectionUpdate = function() {
    // TODO: updateOutline needs to be optimized; it is too slow for large documents
    // Deactivating it for now. We need to rething when an outline update is *really* neces
    this.updateOutline();
    this.contentToolsCtrl.update();
  };

  this.onDocumentEdit = function() {
    // this.toolbarView.update();

    this.updateContextToggles();
    this.contentToolsCtrl.update();
  };

  // Update position in the custom scrollbar
  // --------
  //

  this.onResourceContentScroll = function() {
    var scrollTop = this.resourcesOutline.surface.$el.scrollTop();
    this.resourcesOutline.updateVisibleArea(scrollTop);
  };

  // Clear selection
  // --------
  //

  this.markActiveHeading = function(scrollTop) {
    var contentHeight = $('.nodes').height();
    var panelHeight = $(this.contentView.el).height();
    var scrollBottom = scrollTop + panelHeight;

    var regularScanline = scrollTop - CORRECTION;
    var smartScanline = 2 * scrollBottom - contentHeight;
    var scanline = Math.max(regularScanline, smartScanline);

    $('.scanline').css({
      top: (scanline-scrollTop + 50)+'px'
    });

    // No headings?
    if (this.tocView.headings.length === 0) return;

    // Use first heading as default
    var activeNode = _.first(this.tocView.headings).id;
    this.contentView.$('.content-node.heading').each(function() {

      if (scanline >= $(this).position().top) {
        activeNode = this.id;
      }
    });

    this.tocView.setActiveNode(activeNode);
  };

  // MarkActiveHeading is triggered implicitly, since a scroll
  // event is triggered when image etc. is added

  this.onResourceReady = function() {
    this.updateOutline();
  };

  // Jump to the given node id
  // --------
  //

  this.jumpToNode = function(nodeId) {
    var $n = $('#'+nodeId);
    if ($n.length > 0) {

      var topOffset = $n.position().top;
      var contentHeight = $('.nodes').height();
      var panelHeight = $(this.contentView.el).height();

      // This is the inverse compuptation as in markActiveHeading

      var regularOffset = topOffset + CORRECTION;
      var smartOffset = (topOffset + contentHeight - 2 * panelHeight)*0.5;
      var offset = Math.min(regularOffset, smartOffset);

      this.contentView.$el.scrollTop(Math.ceil(offset));
    }
  };

  // Jump to the given resource id
  // --------
  //

  this.jumpToResource = function(nodeId) {
    var state = this.writerCtrl.state;
    var panelName = state.contextId;

    var $n = $('#'+nodeId);
    if ($n.length > 0) {
      var topOffset = $n.position().top;

      // Scroll to the desired resource using the currently active panel
      if (this[panelName+"View"]) this[panelName+"View"].$el.scrollTop(topOffset);
    }
  };

  // Explicit context switch
  // --------
  //
  // Only triggered by the explicit switch
  // Implicit context switches happen if someone clicks a figure reference

  this.switchContext = function(contextId) {
    this.writerCtrl.switchState({
      id: "main",
      contextId: contextId
    });
  };

  // Update Writer State
  // --------
  //
  // Called every time the controller state has been modified
  // Search for writerCtrl.modifyState occurences

  this.updateState = function(state, oldState) {
    var doc = this.writerCtrl.document;

    // HACK: avoid to call execute this when the ReaderController has
    // already been disposed;
    if (!state) return;

    var handled;

    // We may have a resource selected
    var stateInfo = {};

    if (state.resourceId) {
      stateInfo.resource = doc.get(state.resourceId);
    }

    // Set context on the main element
    // -------

    this.$el.removeClass();
    this.$el.addClass("article substance-article "+this.selectionState);

    this.contentView.$('.content-node.active').removeClass('active');

    // Remove active state from annotations
    this.$('.annotation.active').removeClass('active');

    // Reset focus classes
    this.$('.context-toggle')
      .removeClass('focus')
      .removeClass('left')
      .removeClass('right');

    // Note: by adding the context id to the main element
    // there are css rules that make only one panel visible
    this.$el.addClass("state-"+state.id);
    this.$el.addClass(this.writerCtrl.getContextId());

    // Cleanup publish panel
    if (oldState.id === "publish") {
      this.publishPanelEl.innerHTML = "";
      $(this.publishPanelEl).hide();
      this.$('.toggle-publish-settings').removeClass('active');
    }

    // Show publish panel
    if (state.id === "publish") {
      var publishCtrl = this.writerCtrl.publishCtrl;
      this.publishPanelEl.appendChild(publishCtrl.view.el);
      $(this.publishPanelEl).show();
      this.$('.toggle-publish-settings').addClass('active');
    }

    // Show hide panels based on current context
    _.each(this.panelViews, function(panelView, panelName) {
      if (panelName === state.contextId) {
        panelView.activate();
      } else {
        panelView.hide();
      }
    });

    // A workflow should have Workflow.handlesStateUpdates = true if it is interested in state updates
    // and should override Workflow.handleStateUpdate(state, info) to perform the update.
    // In case it has been responsible for the update it should return 'true'.

    var workflowNames = Object.keys(this.writerCtrl.workflows);

    for (var i = 0; i < workflowNames.length; i++) {
      var workflow = this.writerCtrl.workflows[workflowNames[i]];
      if (workflow.handlesStateUpdate) {
        handled = workflow.handleStateUpdate(state, oldState, stateInfo);
        if (handled) {
          console.log('handled by ', workflow);
          break;
        }
      }
    }

    // Update resource tools view accordingly
    this.resourceToolsView.update();

    // default behavior (~legacy)
    if (!handled) {

      // According to the current context show active resource panel
      // -------

      this.updateOutline(state, oldState);
      this.updateResource(state, oldState);

    }

  };

  // Get active resource panel view
  // ----------
  //

  this.getActivePanelView = function() {
    var state = this.writerCtrl.state;
    var contextId = state.contextId;

    // Static panels, not yet conforming to Panel API
    var activePanelView = this[contextId+"View"];

    if (!activePanelView) {
      activePanelView = this.panelViews[contextId];
    }
    return activePanelView;
  };

  // Focus resource in resource panel
  // ----------
  //

  this.focusResource = function() {
    var state = this.writerCtrl.state;
    var activePanelView = this.getActivePanelView();

    if (activePanelView.focusResource) {
      activePanelView.focusResource(state.resourceId);
    } else {
      // Show selected resource
      var $res = this.$('#'+state.resourceId);
      $res.addClass('active');
    }
  };

  // Based on the current application state, highlight the current resource
  // -------
  //
  // Triggered by updateState

  this.updateResource = function(state) {
    // var state = this.writerCtrl.state;
    // HACK: avoid to call execute this when the ReaderController has
    // already been disposed;
    if (!state) return;

    this.$('.resources .content-node.active').removeClass('active fullscreen');
    this.$('.toggle-author').removeClass('active');
    // this.contentView.$('.annotation.active').removeClass('active');

    // No matter what
    this.focusResource(state.resourceId);

    var annotations;
    if (state.resourceId !== undefined) {

      // TODO: This needs to be done delayed as the parent element must be injected in the DOM.
      // Despite of this being a secret hack it is definitely not a good way to go.
      // Instead, I would prefer if this could be done with the el already in the DOM.
      // E.g., that the first implicit transition ('initialized') will introduce the view to the DOM
      // and then `updateState` would not need to worry.
      // This needs some refactoring on the app state API, as 'initialized' is not explicitly reached
      // when a state is given.

      var that = this;

      if (!state.options["no-scroll"]) {
        // TODO: I had to move the check for no-scroll outside of the delay function.
        // Find out why state.options is cleared (no-scroll property is gone) after the delay
        // Alternative solution: Make a deep copy of the state object

        _.delay(function() {
          // TODO: do we really need that?
          if (state.nodeId)  {
            that.jumpToNode(state.nodeId);
          }
          // Do not scroll if the controller requested so
          if (state.resourceId) {
            that.jumpToResource(state.resourceId);
          }
        }, 0);
      }

      // Mark all annotations that reference the resource
      annotations = this.resources.get(state.resourceId);

      _.each(annotations, function(a) {
        this.contentView.$('#'+a.id).addClass('active');
      }, this);

      // This is only used to mark author references on the cover as active
      // TODO: Use a smarter method as this is rather brute force
      this.$('#toggle_'+state.resourceId).addClass('active');
    }

  };

  this.updateContextToggles = function() {
    var that = this;
    var doc = this.writerCtrl.document;

    _.each(panels, function(panel, panelName) {
      var view = doc.get(panelName);

      if (view.nodes.length > 0) {
        that.$('.context-toggle.'+panelName).removeClass('hidden');
      } else {
        that.$('.context-toggle.'+panelName).addClass('hidden');
      }
    });
  };

  // Whenever the app state changes
  // --------
  //
  // Triggered by updateResource.

  this.updateOutline = function() {
    var that = this;

    // TODO: improve this. Using the sub-controllers that way feels bad.

    var state = this.writerCtrl.state;
    // HACK: avoid to call execute this when the ReaderController has
    // already been disposed;
    if (!state) return;

    var contextId = this.writerCtrl.getContextId();
    var outlineParams = {
      context: contextId
    };

    var highlightedNodes;
    if (state.resourceId !== undefined) {
      highlightedNodes = this.writerCtrl.getResourceReferenceContainers(state.resourceId);
      outlineParams["highlightedNodes"] = highlightedNodes;
    }

    // Determine currently active nodes
    var session = this.writerCtrl.currentSession;
    if (session) {
      outlineParams["selectedNodes"] = _.pluck(session.selection.getNodes(), "id");
    }

    that.outline.update(outlineParams);

    // Resources outline
    // -------------------

    if (state.contextId === "toc" || this.panelViews[state.contextId]) {
      $(that.resourcesOutline.el).addClass('hidden');
      return;
    } else {
      that.resourcesOutline.surface = this[state.contextId+"View"];
    }

    $(that.resourcesOutline.el).removeClass('hidden');

    that.resourcesOutline.update({
      context: state.contextId,
      highlightedNodes: [state.resourceId]
    });
  };

  // Annotate current selection
  // --------
  //

  this.annotate = function(type) {
    this.writerCtrl.content.annotate(type);
    return false;
  };

  // Rendering
  // --------
  //

  this.render = function() {
    var that = this;

    this.el.appendChild(_render(this));
    this.updateContextToggles();

    this.$('.document').append(that.outline.el);
    this.resourcesEl = this.el.querySelector(".resources");
    this.resourcesEl.appendChild(that.resourcesOutline.el);

    this.contentView.annotationBar.render();

    // Update the outline whenever the window is resized
    var lazyOutline = _.debounce(function() {
      that.updateOutline();
      that.contentView.annotationBar.render();
    }, 1);
    $(window).resize(lazyOutline);

    // Note: update outline can not be called here as this element has not been injected
    // into the DOM yet, thus, no layout information is available.
    // Calling that delayed does the trick.
    _.delay(function() {
      that.updateOutline();
      // HACK: updating annotationBar here so that the highlights for
      // multi-annotations get rendered ... TODO maybe we find a better place later
      that.contentView.annotationBar.render();
      // FIXME: the first time the highlights are not placed correctly
      //  - don't know why. The second time it works just fine.
      // that.contentView.annotationBar.render();
      that.contentView.annotationBar.render();
    }, 0);

    return this;
  };


  // Free the memory.
  // --------
  //

  this.dispose = function() {
    this.stopListening();

    _.each(this.workflows, function(workflow) {
      workflow.detach();
    });

    if (this.contentView) this.contentView.dispose();

    // Dispose all resource panels
    _.each(panels, function(panel, panelName) {
      if (this[panelName+"View"]) this[panelName+"View"].dispose();
    }, this);

    // TODO: dispose views in this.panelViews
  };

  var _render = function(self) {
    var frag = window.document.createDocumentFragment();

    // Prepare doc view
    // --------

    var docView = $$('.document');

    var contentToolsView = self.contentToolsView.render().el;
    docView.appendChild(contentToolsView);
    docView.appendChild(self.contentView.render().el);

    // Prepare context toggles
    // --------

    var children = [];

    if (self.tocView) {
      children.push($$('a.context-toggle.toc', {
        'href': '#',
        'sbs-click': 'switchContext(toc)',
        'title': 'Table of Contents',
        'html': '<i class="icon-align-left"></i><span> Contents</span>'
      }));
    }

    // Render registered panels
    // -------------

    _.each(panels, function(panel, panelName) {
      if (self[panelName+"View"]) {
        children.push($$('a.context-toggle.'+panelName, {
          'href': '#',
          'sbs-click': 'switchContext('+panelName+')',
          'title': panel.name,
          'html': '<i class="'+panel.icon+'"></i><span> '+panel.name+'</span>'
        }));
      }
    });

    // Render more registered panels
    // -------------

    _.each(self.writerCtrl.panels, function(panel) {
      var panelView = self.panelViews[panel.getName()];
      children.push(panelView.getToggleControl());
    });

    var contextToggles = $$('.context-toggles', {
      children: children
    });


    // Prepare resources view
    // --------

    var medialStrip = $$('.medial-strip');

    medialStrip.appendChild($$('.separator-line'));
    medialStrip.appendChild(contextToggles);

    // Wrap everything within resources view
    var resourcesView = $$('.resources');

    var resourceToolsView = self.resourceToolsView.render().el;
    resourcesView.appendChild(resourceToolsView);
    resourcesView.appendChild(medialStrip);

    // Add TOC
    // --------

    resourcesView.appendChild(self.tocView.render().el);


    // Add Panels
    // --------
    _.each(panels, function(panel, panelName) {
      if (self[panelName+"View"]) resourcesView.appendChild(self[panelName+"View"].render().el);
    });

    // Add custom panels
    // --------

    _.each(self.writerCtrl.panels, function(panel) {
      var panelView = self.panelViews[panel.getName()];
      resourcesView.appendChild(panelView.render().el);
    });

    self.publishPanelEl = $$('.publish-panel');

    frag.appendChild(self.publishPanelEl);
    frag.appendChild(docView);
    frag.appendChild(resourcesView);

    var scanLine = $$('.scanline');
    frag.appendChild(scanLine);

    if (!window.useNativeClipboard) {
      frag.appendChild(self.clipboard.el);
    }

    return frag;
  };

  var __findParentElement = function(el, selector) {
    var current = el;
    while(current !== undefined) {
      if ($(current).is(selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  };

  this.onMouseup = function(e) {
    console.log("WriterView.onMouseup....");

    var self = this;

    if (true) {
      // Original approach: whenever the user clicks 'something' the selection gets cleared
      // TODO: try which version is more user-friendly.
      window.setTimeout(function() {
        var session = self.writerCtrl.currentSession;
        if (session) {
          session.selection.clear();
        }
      }, 0);
    } else {
      // EXPERIMENTAL: it may feel better to keep the selection where it is
      // instead of clearing it.
      // TODO: Contenteditable should not remove the selection in those cases.
      // As a work-around we re-render the last selection.
      if (self.writerCtrl.viewName) {
        window.setTimeout(function() {
          var surface = self.getSurface(self.writerCtrl.viewName);
          if (surface) {
            surface.renderSelection();
          }
        }, 0);
      }
    }

    // HACK, make sure the outline recognizes the mouse up
    this.outline.mouseUp();
    this.resourcesOutline.mouseUp();

    e.preventDefault();
    e.stopPropagation();
  };

  this.getSurface = function(containerId) {
    return this[containerId+"View"];
  };

  // EXPERIMENTAL: multi-node annotation support
  this.getElementsForAnnotationFragments = function(annotationId) {
    var frags = this.writerCtrl.document.getAnnotationFragments(annotationId);
    var elements = [];
    _.each(frags, function(fragment) {
      var el = this.contentView.el.querySelector('#'+fragment.id);
      if (el) {
        elements.push(el);
      } else {
        console.log('Could not find element for fragment', fragment.id);
      }
    }, this);
    return elements;
  };

};

WriterView.Prototype.prototype = View.prototype;
WriterView.prototype = new WriterView.Prototype();
WriterView.prototype.constructor = WriterView;


// Private helpers
// --------

__createRenderer = function(doc, viewName) {
  return doc.createRenderer(viewName);
};

var __registerKeyboardBindings = function(editableSurface, keyboard, editorCtrl) {

  // TODO: this has been pulled out from EditableSurface
  // and now needs some cleanup
  // some Hacking below :(

  // HACK: this is bound to WriterView... should be in the prototype then
  // var self = this;

  var _manipulate = function(action) {
    return function(e) {
      try {
        action(e);
      } catch (err) {
        console.log("EditableSurface: triggering error", err);
        util.printStackTrace(err);
        editorCtrl.trigger("error", err);
      }
      e.preventDefault();
      e.stopPropagation();
    };
  };

  // they are handled on a higher level
  keyboard.pass("copy");
  keyboard.pass("cut");
  keyboard.pass("paste");

  keyboard.bind("nop", "keydown", function(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  // Note: these stupid 'surface.manipulate' stuff is currently necessary
  // as I could not find another way to distinguish the cases for regular text input
  // and multi-char input. It would not be necessary, if we had a robust way
  // to recognize native key events for that complex chars...
  // However, for now that dirt... we can streamline this in future - for sure...

  keyboard.bind("backspace", "keydown", _manipulate(function() {
    editorCtrl.delete("left");
  }));

  keyboard.bind("delete", "keydown", _manipulate(function() {
    editorCtrl.delete("right");
  }));

  keyboard.bind("break", "keydown", _manipulate(function() {
    editorCtrl.breakNode();
  }));

  keyboard.bind("soft-break", "keydown", _manipulate(function() {
    editorCtrl.write("\n");
  }));

  keyboard.bind("blank", "keydown", _manipulate(function() {
    editorCtrl.write(" ");
  }));

  keyboard.bind("indent", "keydown", _manipulate(function() {
    editorCtrl.indent("right");
  }));

  keyboard.bind("unindent", "keydown", _manipulate(function() {
    editorCtrl.indent("left");
  }));

  keyboard.bind("select-all", "keydown", _manipulate(function() {
    editorCtrl.select("all");
  }));

  keyboard.bind("strong", "keydown", _manipulate(function() {
    editorCtrl.toggleAnnotation("strong");
  }));

  keyboard.bind("emphasis", "keydown", _manipulate(function() {
    editorCtrl.toggleAnnotation("emphasis");
  }));

  keyboard.bind("text", "keydown", _manipulate(function() {
    editorCtrl.changeType("text");
  }));

  keyboard.bind("heading", "keydown", _manipulate(function() {
    editorCtrl.changeType("heading", {"level": 1});
  }));

  keyboard.bind("code_block", "keydown", _manipulate(function() {
    editorCtrl.changeType("code_block");
  }));

  keyboard.bind("list", "keydown", _manipulate(function() {
    editorCtrl.changeType("list_item", {"level": 1});
  }));
};

__createEditableSurface = function(self, doc, viewName) {
  // console.log("WriterView... creating EditableSurface for doc", doc.__id__, "container", viewName);
  var docCtrl = self.writerCtrl[viewName + "Ctrl"];
  var renderer = __createRenderer(doc, viewName);
  var editor = new EditableSurface(docCtrl, renderer, {
    "keymap": self.writerCtrl.keymap,
    "registerBindings": __registerKeyboardBindings.bind(self)
  });

  if (!window.useNativeClipboard) {
    self.clipboard.attachSurface(editor);
  }

  editor.keyboard.bind("figref", "keypress", function(e) {
    self.writerCtrl.beginAddRef("figure");
    e.preventDefault();
    e.stopPropagation();
  });

  // HACK: it turned out that the Container implementation
  // depends rather strongly on the actual view.
  // I.e., selections are very related to what has actually been rendered -- and how.
  // To break a cycle of dependencies we inject that implementation at this point
  // Note: currently it is important to rebuild the container after the renderer has been run
  // otherwise all views would be null.
  // Maybe we could make the renderer smarter here, by providing the views
  // even if they are not yet integrated by surface.
  // TODO: try to find a cleaner solution
  var __render__ = renderer.render;
  renderer.render = function() {
    var result = __render__.apply(renderer, arguments);
    docCtrl.session.container.rebuild();
    return result;
  };

  docCtrl.session.container.renderer = renderer;
  return editor;
};

__addResourcePanel = function(self, doc, name) {
  var viewName = name+"View";

  var editor = __createEditableSurface(self, doc, name);
  self[viewName] = editor;
  self.surfaces.push(editor);

  var el = self[viewName].el;

  el.classList.add(name);
  el.classList.add('resource-view');
  el.setAttribute("id", name);
};

module.exports = WriterView;

},{"./annotation_bar":38,"./content_tools_controller":49,"./resource_tools_controller":111,"substance-application":10,"substance-outline":257,"substance-surface":261,"substance-toc":266,"substance-util":268,"underscore":273}],124:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var util = require('substance-util');

/**
 * EXPERIMENTAL
 */

var HTMLConverter = function dmHtmlConverter( options ) {
  this.options = options || {};
};

HTMLConverter.Prototype = function HTMLConverterPrototype() {

  this.createState = function(doc, htmlDoc) {
    var state = {
      doc: doc,
      htmlDoc: htmlDoc,
      annotations: [],
      trimWhitespaces: !!this.options.trimWhitespaces,
      contexts: [],
      lastChar: "",
      skipTypes: {},
      ignoreAnnotations: false,
    };
    return state;
  };

  this.convert = function(htmlDoc, doc) {
    var state = this.createState(doc, htmlDoc);
    var body = htmlDoc.getElementsByTagName( 'body' )[0];
    this.body(state, body);
    // create annotations afterwards so that the targeted nodes
    // exist for sure
    for (var i = 0; i < state.annotations.length; i++) {
      doc.create(state.annotations[i]);
    }
  };

  var _topLevelElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5'];

  var _isTopLevel = function(type) {
    return _topLevelElements.indexOf(type) >= 0;
  };

  this.body = function(state, body) {
    // HACK: this is not a general solution just adapted to the
    // content provided by pasting from Microsoft Word: when pasting
    // only some words of a paragraph then there is no wrapping p element
    var catchBin = null;
    var handlers = {
      'p': this.paragraph,
      'h1': this.heading,
      'h2': this.heading,
      'h3': this.heading,
      'h4': this.heading,
      'h5': this.heading,
    };
    var childIterator = new HTMLConverter.ChildNodeIterator(body);
    while(childIterator.hasNext()) {
      var child = childIterator.next();
      var type = this.getNodeType(child);
      if (handlers[type]) {
        // if there is an open catch bin node add it to document and reset
        if (catchBin && catchBin.content.length > 0) {
          state.doc.create(catchBin);
          state.doc.show('content', catchBin.id);
          catchBin = null;
        }
        var node = handlers[type].call(this, state, child);
        if (node) {
          state.doc.show('content', node.id);
        }
      } else {
        childIterator.back();
        // Wrap all other stuff into a paragraph
        if (!catchBin) {
          catchBin = {
            type: 'text',
            id: util.uuid('text'),
            content: ''
          };
        }
        state.contexts.push({
          path: [catchBin.id, 'content']
        });
        catchBin.content += this._annotatedText(state, childIterator, catchBin.content.length);
        state.contexts.pop();
      }
    }
    if (catchBin && catchBin.content.length > 0) {
      state.doc.create(catchBin);
      state.doc.show('content', catchBin.id);
      catchBin = null;
    }
  };

  this.paragraph = function(state, el) {
    var textNode = {
      type: 'text',
      id: el.id || util.uuid('text'),
      content: null,
    };
    textNode.content = this.annotatedText(state, el, [textNode.id, 'content']);
    state.doc.create(textNode);
    return textNode;
  };

  this.heading = function(state, el) {
    var headingNode = {
      type: 'heading',
      id: el.id || util.uuid('heading'),
      content: null,
      level: -1
    };
    var type = this.getNodeType(el);
    headingNode.level = parseInt(type.substring(1));
    headingNode.content = this.annotatedText(state, el, [headingNode.id, 'content']);
    state.doc.create(headingNode);
    return headingNode;
  };

  /**
   * Parse annotated text
   *
   * Make sure you call this method only for elements where `this.isParagraphish(elements) === true`
   */
  this.annotatedText = function(state, el, path, options) {
    options = options || {};
    state.contexts.push({
      path: path
    });
    var childIterator = new HTMLConverter.ChildNodeIterator(el);
    var text = this._annotatedText(state, childIterator, options.offset || 0);
    state.contexts.pop();
    return text;
  };

  // Internal function for parsing annotated text
  // --------------------------------------------
  //
  this._annotatedText = function(state, iterator, charPos) {
    var plainText = "";
    if (charPos === undefined) {
      charPos = 0;
    }
    while(iterator.hasNext()) {
      var el = iterator.next();
      var type = this.getNodeType(el);
      // Plain text nodes...
      if (el.nodeType === window.Document.TEXT_NODE) {
        var text = this._prepareText(state, el.textContent);
        plainText = plainText.concat(text);
        charPos += text.length;
      } else if (el.nodeType === window.Document.COMMENT_NODE) {
        // skip comment nodes
        continue;
      } else if (_isTopLevel(type)) {
        iterator.back();
        break;
      }
      // Other...
      else {
        if ( !state.skipTypes[type] ) {
          var start = charPos;
          // recurse into the annotation element to collect nested annotations
          // and the contained plain text
          var childIterator = new HTMLConverter.ChildNodeIterator(el);
          var annotatedText = this._annotatedText(state, childIterator, charPos, "nested");

          plainText = plainText.concat(annotatedText);
          charPos += annotatedText.length;

          if (this.isAnnotation(type) && !state.ignoreAnnotations) {
            this.createAnnotation(state, el, start, charPos);
          }
        }
      }
    }
    return plainText;
  };

  this.getNodeType = function(el) {
    if (el.nodeType === window.Document.TEXT_NODE) {
      return "text";
    } else if (el.nodeType === window.Document.COMMENT_NODE) {
      return "comment";
    } else if (el.tagName) {
      return el.tagName.toLowerCase();
    } else {
      throw new Error("Unknown node type");
    }
  };

  var _annotationTypes = {
    "b": "strong",
    "i": "emphasis",
  };

  this.isAnnotation = function(type) {
    return !!_annotationTypes[type];
  };

  this.createAnnotation = function(state, el, start, end) {
    var context = _.last(state.contexts);
    if (!context || !context.path) {
      throw new Error('Illegal state: context for annotation is required.');
    }
    var type = _annotationTypes[this.getNodeType(el)];
    var data = {
      id: el.id || util.uuid(type),
      type: type,
      path: _.clone(context.path),
      range: [start, end],
    };
    state.annotations.push(data);
  };

  var WS_LEFT = /^\s+/g;
  var WS_LEFT_ALL = /^\s*/g;
  var WS_RIGHT = /\s+$/g;
  var WS_ALL = /\s+/g;
  // var ALL_WS_NOTSPACE_LEFT = /^[\t\n]+/g;
  // var ALL_WS_NOTSPACE_RIGHT = /[\t\n]+$/g;
  var SPACE = " ";
  var TABS_OR_NL = /[\t\n\r]+/g;

  this._prepareText = function(state, text) {
    if (!state.trimWhitespaces) {
      return text;
    }
    // EXPERIMENTAL: drop all 'formatting' white-spaces (e.g., tabs and new lines)
    // (instead of doing so only at the left and right end)
    //text = text.replace(ALL_WS_NOTSPACE_LEFT, "");
    //text = text.replace(ALL_WS_NOTSPACE_RIGHT, "");
    text = text.replace(TABS_OR_NL, "");
    if (state.lastChar === SPACE) {
      text = text.replace(WS_LEFT_ALL, "");
    } else {
      text = text.replace(WS_LEFT, SPACE);
    }
    text = text.replace(WS_RIGHT, SPACE);
    // EXPERIMENTAL: also remove white-space within
    if (this.options.REMOVE_INNER_WS) {
      text = text.replace(WS_ALL, SPACE);
    }
    state.lastChar = text[text.length-1] || state.lastChar;
    return text;
  };

};
HTMLConverter.prototype = new HTMLConverter.Prototype();

HTMLConverter.ChildNodeIterator = function(arg) {
  this.nodes = arg.childNodes;
  this.length = this.nodes.length;
  this.pos = -1;
};

HTMLConverter.ChildNodeIterator.Prototype = function() {
  this.hasNext = function() {
    return this.pos < this.length - 1;
  };
  this.next = function() {
    this.pos += 1;
    return this.nodes[this.pos];
  };
  this.back = function() {
    if (this.pos >= 0) {
      this.pos -= 1;
    }
    return this;
  };
};
HTMLConverter.ChildNodeIterator.prototype = new HTMLConverter.ChildNodeIterator.Prototype();

module.exports = HTMLConverter;

},{"substance-util":268,"underscore":273}],125:[function(require,module,exports){
"use strict";

var Fragmenter = require("substance-util").Fragmenter;

// EXPERIMENTAL:
// in substance-next HTML import/export will be built-in
var HtmlExporter = function(config) {
  this.config = config || {};
};

HtmlExporter.Prototype = function() {
  this.constructor = HtmlExporter;

  this.toHtml = function(document, options) {
    options = {} || options;
    var containers = options.containers || ['content'];

    var state =  {
      document: document,
      options: options,
      output: []
    };

    for (var i = 0; i < containers.length; i++) {
      var container = document.get(containers[i]);
      this.container(state, container);
    }
    return state.output.join('');
  };

  this.container = function(state, containerNode) {
    var nodeIds = containerNode.nodes;
    for (var i = 0; i < nodeIds.length; i++) {
      var node = state.document.get(nodeIds[i]);
      switch(node.type) {
        case "heading":
          return this.heading(state, node);
        case "text":
          return this.text(state, node);
        default:
          console.error('Not yet implemented: ', node.type, node);
      }
    }
  };

  this.heading = function(state, node) {
    var tag = 'h' + node.level;
    state.output.push('<'+tag+'>');
    this.annotatedText(state, [node.id, 'content']);
    state.output.push('</'+tag+'>');
  };

  this.text = function(state, node) {
    state.output.push('<p>');
    this.annotatedText(state, [node.id, 'content']);
    state.output.push('</p>');
  };

  this.annotatedText = function(state, path) {
    var doc = state.document;
    var text = doc.get(path);

    var annotations = doc.getIndex('annotations').get(path);

    // this splits the text and annotations into smaller pieces
    // which is necessary to generate proper HTML.
    var fragmenter = new Fragmenter();
    var stack = [];

    fragmenter.onText = function(context, text) {
      state.output.push(text);
    };

    fragmenter.onEnter = function(entry) {
      var anno = doc.get(entry.id);
      switch (anno.type) {
        case 'strong':
          state.output.push('<b>');
          break;
        case 'emphasis':
          state.output.push('<i>');
          break;
        default:
          console.error('Not yet supported:', anno.type, anno);
      }
      stack.push(anno);
      return anno;
    };

    fragmenter.onExit = function(entry) {
      console.log("###########", entry);
      var anno = stack.pop();
      switch (anno.type) {
        case 'strong':
          state.output.push('</b>');
          break;
        case 'emphasis':
          state.output.push('</i>');
          break;
        default:
          console.error('Not yet supported:', anno.type, anno);
      }
    };

    // this calls onText and onEnter in turns...
    fragmenter.start(null, text, annotations);
  };

};
HtmlExporter.prototype = new HtmlExporter.Prototype();

module.exports = HtmlExporter;

},{"substance-util":268}],126:[function(require,module,exports){
"use strict";

var Data = {};

// Current version of the library. Keep in sync with `package.json`.
Data.VERSION = '0.8.0';

Data.Graph = require('./src/graph');


var _ = require("underscore");
// A helper that is used by Graph node implementations
Data.defineNodeProperties = function(prototype, properties, readonly) {
  _.each(properties, function(name) {
    var spec = {
      get: function() {
        return this.properties[name];
      }
    };
    if (!readonly) {
      spec["set"] = function(val) {
        this.properties[name] = val;
        return this;
      };
    }
    Object.defineProperty(prototype, name, spec);
  });
};

module.exports = Data;

},{"./src/graph":129,"underscore":273}],127:[function(require,module,exports){
"use strict";

var Chronicle = require('substance-chronicle');
var Operator = require('substance-operator');

var ChronicleAdapter = function(graph) {
  this.graph = graph;
  this.graph.state = "ROOT";
};

ChronicleAdapter.Prototype = function() {

  this.apply = function(op) {
    // Note: we call the Graph.apply intentionally, as the chronicled change
    // should be an ObjectOperation
    //console.log("ChronicleAdapter.apply, op=", op);
    this.graph.__apply__(op, {"chronicle": true});
    this.graph.updated_at = new Date(op.timestamp);
  };

  this.invert = function(change) {
    return Operator.ObjectOperation.fromJSON(change).invert();
  };

  this.transform = function(a, b, options) {
    return Operator.ObjectOperation.transform(a, b, options);
  };

  this.reset = function() {
    this.graph.reset();
  };

  this.getState = function() {
    return this.graph.state;
  };

  this.setState = function(state) {
    this.graph.state = state;
  };
};

ChronicleAdapter.Prototype.prototype = Chronicle.Versioned.prototype;
ChronicleAdapter.prototype = new ChronicleAdapter.Prototype();

module.exports = ChronicleAdapter;

},{"substance-chronicle":23,"substance-operator":250}],128:[function(require,module,exports){
var _ = require("underscore");
var GraphIndex = require("./graph_index");

/**
 * An index implementation that allows to create custom indexes.
 *
 * options:
 *  - filter: a function(node) that returns true to select a node, false otherwise
 *  - types: (alternatively) a list of types which are used to create a type filter
 *  - getKey: (mandatory) a function(node) which produces a string key
 *  - getValue: (optional) a function(node) which produces a value to be stored.
 */


/* Usecase 1: mapping between product and note

   product_ref.path[0] -> text_node  <- note.nodes
   1. if ref is created, find text_node, find note which contains text_node, store ref.productId -> note.id
   2. if ref is deleted, ..., remove note.id from ref.productId
   3. if ref.path is changed, remove the old one, add the new one
*/

var CustomIndex = function(graph, name, options) {
  options = options || {};

  this.__graph = graph;
  this.__name = name;
  this.data = {};

  if (options.filter) {
    this.__filter = options.filter;
  } else if (options.types) {
    this.__filter = GraphIndex.typeFilter(graph.schema, options.types);
  }

  this.__property = options.property || "id";

  if (options.getKey) {
    this.__getKey = options.getKey;
  }

  if (options.getValue) {
    this.__getValue = options.getValue;
  }

  this.__createIndex();
};

CustomIndex.Prototype = function() {

  this.__add = function(key, value) {
    if (!this.data[key]) {
      this.data[key] = [];
    }
    this.data[key].push(value);
  };

  this.__remove = function(key, value) {
    var values = this.data[key];
    if (values) {
      var idx = values.indexOf(value);
      if (idx >= 0) {
        values = values.splice(idx, 1);
      }
      if (values.length === 0) {
        delete this.data[key];
      }
    }
  };

  this.__getKey = function(node, propertyValue) {
    return propertyValue;
  };

  this.__getValue = function(node, propertyValue) {
    /* jshint unused:false */
    return node;
  };

  // Keeps the index up-to-date when the graph changes.
  // --------
  //

  this.onGraphChange = function(op) {

    var self = this;

    var adapter = {
      create: function(node) {
        if (!self.__filter || self.__filter(node)) {
          var key = self.__getKey(node, node[self.__property]);
          if (!key) return;
          var value = self.__getValue(node, node[self.__property]);
          self.__add(key, value);
        }
      },
      delete: function(node) {
        if (!self.filter || self.filter(node)) {
          var key = self.__getKey(node, node[self.__property]);
          if (!key) return;
          var value = self.__getValue(node, node[self.__property]);
          self.__remove(key, value);
        }
      },
      update: function(node, property, newValue, oldValue) {
        if ((self.__property === property) && (!self.__filter || self.__filter(node))) {
          var key = self.__getKey(node, oldValue);
          if (key) {
            self.__remove(key, oldValue);
          }
          key = self.__getKey(node, newValue);
          var value = self.__getValue(node, newValue);
          self.__add(key, value);
        }
      }
    };

    this.__graph.cotransform(adapter, op);
  };

  // Initializes the index
  // --------
  //

  this.__createIndex = function() {
    var nodes = this.__graph.nodes;
    _.each(nodes, function(node) {
      if (!this.__filter || this.__filter(node)) {
          var key = this.__getKey(node, node[this.__property]);
          if (!key) return;
          var value = this.__getValue(node, node[this.__property]);
          this.__add(key, value);
      }
    }, this);
  };

};

CustomIndex.prototype = new CustomIndex.Prototype();

module.exports = CustomIndex;

},{"./graph_index":130,"underscore":273}],129:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;

var Schema = require('./schema');
var Property = require('./property');

var Chronicle = require('substance-chronicle');
var Operator = require('substance-operator');

var PersistenceAdapter = require('./persistence_adapter');
var ChronicleAdapter = require('./chronicle_adapter');
var Index = require('./graph_index');
var CustomIndex = require('./custom_index');
var SimpleIndex = require('./simple_index');
var Migrations = require("./migrations");

var GraphError = errors.define("GraphError");

// Data types registry
// -------------------
// Available data types for graph properties.

var VALUE_TYPES = [
  'object',
  'array',
  'string',
  'number',
  'boolean',
  'date'
];


// Check if composite type is in types registry.
// The actual type of a composite type is the first entry
// I.e., ["array", "string"] is an array in first place.
var isValueType = function (type) {
  if (_.isArray(type)) {
    type = type[0];
  }
  return VALUE_TYPES.indexOf(type) >= 0;
};

// Graph
// =====

// A `Graph` can be used for representing arbitrary complex object
// graphs. Relations between objects are expressed through links that
// point to referred objects. Graphs can be traversed in various ways.
// See the testsuite for usage.
//
// Need to be documented:
// @options (mode,seed,chronicle,store,load,graph)
var Graph = function(schema, options) {
  options = options || {};

  // Initialization
  this.schema = new Schema(schema);

  // Check if provided seed conforms to the given schema
  // Only when schema has an id and seed is provided

  // TODO: IMO it does not make sense to have a schema without id
  // and every seed MUST have a schema
  // We should add that schema in all seeds
  var seed = options.seed;
  if (seed && !seed.schema) {
    console.error("FIXME: a document seed MUST have a schema.");
  }
  if (seed && seed.schema &&
      (seed.schema[0] !== this.schema.id || seed.schema[1] !== this.schema.version)
     ) {
    this.migrate(seed);
  }

  this.objectAdapter = new Graph.ObjectAdapter(this);

  this.nodes = {};
  this.indexes = {};

  this.__mode__ = options.mode || Graph.DEFAULT_MODE;
  this.__seed__ = options.seed;

  // Note: don't init automatically after making persistent
  // as this would delete the persistet graph.
  // Instead, the application has to call `graph.load()` if the store is supposed to
  // contain a persisted graph
  this.isVersioned = !!options.chronicle;
  this.isPersistent = !!options.store;

  // Make chronicle graph
  if (this.isVersioned) {
    this.chronicle = options.chronicle;
    this.chronicle.manage(new Graph.ChronicleAdapter(this));
  }

  // Make persistent graph
  if (this.isPersistent) {
    var nodes = options.store.hash("nodes");
    this.__store__ = options.store;
    this.__nodes__ = nodes;

    if (this.isVersioned) {
      this.__version__ = options.store.hash("__version__");
    }

    this.objectAdapter = new PersistenceAdapter(this.objectAdapter, nodes);
  }

  if (options.load) {
    this.load();
  } else {
    this.init();
  }

  // Populate graph
  if (options.graph) this.merge(options.graph);
};

Graph.Prototype = function() {

  _.extend(this, util.Events);

  var _private = new Graph.Private();

  // Graph manipulation API
  // ======================

  // Add a new node
  // --------------
  // Adds a new node to the graph
  // Only properties that are specified in the schema are taken:
  //     var node = {
  //       id: "apple",
  //       type: "fruit",
  //       name: "My Apple",
  //       color: "red",
  //       val: { size: "big" }
  //     };
  // Create new node:
  //     Data.Graph.create(node);
  // Note: graph create operation should reject creation of duplicate nodes.
  //
  // Arguments:
  //   - node: the new node
  //
  this.create = function(node) {
    var op = Operator.ObjectOperation.Create([node.id], node);
    return this.apply(op);
  };

  // Remove a node
  // -------------
  // Removes a node with given id and key (optional):
  //     Data.Graph.delete(this.graph.get('apple'));
  //
  // Arguments:
  //   - id: the node id
  //
  this.delete = function(id) {
    var node = this.get(id);
    if (node === undefined) {
      throw new GraphError("Could not resolve a node with id "+ id);
    }

    // in case that the returned node is a rich object
    // there should be a serialization method
    if (node.toJSON) {
      node = node.toJSON();
    }

    var op = Operator.ObjectOperation.Delete([id], node);
    return this.apply(op);
  };

  // Update the property
  // -------------------
  //
  // Updates the property with a given operation.
  // Note: the diff has to be given as an appropriate operation.
  // E.g., for string properties diff would be Operator.TextOperation,
  // for arrays it would be Operator.ArrayOperation, etc.
  // For example Substance.Operator:
  //   Data.Graph.create({
  //     id: "fruit_2",
  //     type: "fruit",
  //     name: "Blueberry",
  //     val: { form: { kind: "bar", color: "blue" }, size: "small" },
  //   })
  //   var valueUpdate = Operator.TextOperation.fromOT("bar", [1, -1, "e", 1, "ry"]);
  //   var propertyUpdate = Operator.ObjectOperation.Update(["form", "kind"], valueUpdate);
  //   var nodeUpdate = Data.Graph.update(["fruit_2", "val"], propertyUpdate);
  // Let's get it now:
  //   var blueberry = this.graph.get("fruit_2");
  //   console.log(blueberry.val.form.kind);
  //   = > 'berry'
  //
  // Arguments:
  //   - path: an array used to resolve the property to be updated
  //   - diff: an (incremental) operation that should be applied to the property

  this.update = function(path, diff) {
    var prop = this.resolve(path);
    if (!prop) {
      throw new GraphError("Could not resolve property with path "+JSON.stringify(path));
    }

    if (_.isArray(diff)) {
      if (prop.baseType === "string") {
        diff = Operator.TextOperation.fromSequence(prop.get(), diff);
      } else if (prop.baseType === "array") {
        diff = Operator.ArrayOperation.create(prop.get(), diff);
      } else {
        throw new GraphError("There is no convenient notation supported for this type: " + prop.baseType);
      }
    }

    if (!diff) {
      // if the diff turns out to be empty there will be no operation.
      return;
    }

    var op = Operator.ObjectOperation.Update(path, diff, prop.baseType);
    return this.apply(op);
  };

  // Set the property
  // ----------------
  //
  // Sets the property to a given value:
  // Data.Graph.set(["fruit_2", "val", "size"], "too small");
  // Let's see what happened with node:
  //     var blueberry = this.graph.get("fruit_2");
  //     console.log(blueberry.val.size);
  //     = > 'too small'
  //
  // Arguments:
  //   - path: an array used to resolve the property to be updated
  //   - diff: an (incremental) operation that should be applied to the property
  //
  this.set = function(path, newValue, userData) {
    var prop = this.resolve(path);
    if (!prop) {
      throw new GraphError("Could not resolve property with path "+JSON.stringify(path));
    }
    var oldValue = prop.get();
    // Note: Operator.ObjectOperation.Set will clone the values
    var op = Operator.ObjectOperation.Set(path, oldValue, newValue);
    if (userData) op.data = userData;

    return this.apply(op);
  };

  // Pure graph manipulation
  // -----------------------
  //
  // Only applies the graph operation without triggering e.g., the chronicle.

  this.__apply__ = function(_op, options) {
    //console.log("Graph.__apply__", op);

    // Note: we apply compounds eagerly... i.e., all listeners will be updated after
    // each atomic change.

    Operator.Helpers.each(_op, function(op) {
      if (!(op instanceof Operator.ObjectOperation)) {
        op = Operator.ObjectOperation.fromJSON(op);
      }
      op.apply(this.objectAdapter);

      this.updated_at = new Date();
      this._internalUpdates(op);

      _.each(this.indexes, function(index) {
        // Treating indexes as first class listeners for graph changes
        index.onGraphChange(op);
      }, this);

      // provide the target node which is affected by this operation
      var target;
      if (op.type === "create" || op.type === "delete") {
        target = op.val;
      } else {
        target = this.get(op.path[0]);
      }

      // And all regular listeners in second line
      this.trigger('operation:applied', op, this, target, options);
    }, this);

  };

  this._internalUpdates = function(op) {
    // Treating indexes as first class listeners for graph changes
    Operator.Helpers.each(op, function(_op) {
      _.each(this.indexes, function(index) {
        index.onGraphChange(_op);
      }, this);
    }, this);
  };

  // Apply a command
  // ---------------
  //
  // Applies a graph command
  // All commands call this function internally to apply an operation to the graph
  //
  // Arguments:
  //   - op: the operation to be applied,

  this.apply = function(op, options) {
    this.__apply__(op, options);

    // do not record changes during initialization
    if (!this.__is_initializing__ && this.isVersioned) {
      op.timestamp = new Date();
      this.chronicle.record(util.clone(op));
    }

    return op;
  };

  // Get the node [property]
  // -----------------------
  //
  // Gets specified graph node using id:
  //  var apple = this.graph.get("apple");
  //  console.log(apple);
  //  =>
  //  {
  //    id: "apple",
  //    type: "fruit",
  //    name: "My Apple",
  //    color: "red",
  //    val: { size: "big" }
  //  }
  // or get node's property:
  //  var apple = this.graph.get(["apple","color"]);
  //  console.log(apple);
  //  => 'red'

  this.get = function(path) {
    if (path === undefined || path === null) {
      throw new GraphError("Invalid argument: provided undefined or null.");
    }
    if (!_.isArray(path) && !_.isString(path)) {
      throw new GraphError("Invalid argument path. Must be String or Array");
    }
    if (_.isString(path)) return this.nodes[path];

    var prop = this.resolve(path);
    return prop.get();
  };

  // Query graph data
  // ----------------
  //
  // Perform smart querying on graph
  //     graph.create({
  //       id: "apple-tree",
  //       type: "tree",
  //       name: "Apple tree"
  //     });
  //     var apple = this.graph.get("apple");
  //     apple.set({["apple","tree"], "apple-tree"});
  // let's perform query:
  //     var result = graph.query(["apple", "tree"]);
  //     console.log(result);
  //     => [{id: "apple-tree", type: "tree", name: "Apple tree"}]

  this.query = function(path) {
    var prop = this.resolve(path);

    var type = prop.type;
    var baseType = prop.baseType;
    var val = prop.get();

    // resolve referenced nodes in array types
    if (baseType === "array") {
      return _private.queryArray.call(this, val, type);
    } else if (!isValueType(baseType)) {
      return this.get(val);
    } else {
      return val;
    }
  };

  // Serialize current state
  // -----------------------
  //
  // Convert current graph state to JSON object

  this.toJSON = function() {
    return {
      id: this.id,
      schema: [this.schema.id, this.schema.version],
      nodes: util.deepclone(this.nodes)
    };
  };

  // Check node existing
  // -------------------
  //
  // Checks if a node with given id exists
  //     this.graph.contains("apple");
  //     => true
  //     this.graph.contains("orange");
  //     => false

  this.contains = function(id) {
    return (!!this.nodes[id]);
  };

  // Resolve a property
  // ------------------
  // Resolves a property with a given path

  this.resolve = function(path) {
    return new Property(this, path);
  };

  // Reset to initial state
  // ----------------------
  // Resets the graph to its initial state.
  // Note: This clears all nodes and calls `init()` which may seed the graph.

  this.reset = function() {
    if (this.isPersistent) {
      if (this.__nodes__) this.__nodes__.clear();
    }

    this.init();

    if (this.isVersioned) {
      this.state = Chronicle.ROOT;
    }

    this.trigger("graph:reset");
  };

  // Graph initialization.
  this.init = function() {
    this.__is_initializing__ = true;

    if (this.__seed__) {
      this.nodes = util.clone(this.__seed__.nodes);
    } else {
      this.nodes = {};
    }

    _.each(this.indexes, function(index) {
      index.reset();
    });

    if (this.isPersistent) {
      _.each(this.nodes, function(node, id) {
        this.__nodes__.set(id, node);
      }, this);
    }

    delete this.__is_initializing__;
  };

  this.merge = function(graph) {
    _.each(graph.nodes, function(n) {
      this.create(n);
    }, this);

    return this;
  };

  // View Traversal
  // --------------

  this.traverse = function(view) {
    return _.map(this.getView(view), function(node) {
      return this.get(node);
    }, this);
  };

  // Graph loading.
  // ----------
  //
  // Note: currently this must be called explicitely by the app

  this.load = function() {

    if (!this.isPersistent) {
      console.log("Graph is not persistent.");
      return;
    }

    this.__is_initializing__ = true;

    this.nodes = {};
    this.indexes = {};

    // import persistet nodes
    var keys = this.__nodes__.keys();
    for (var idx = 0; idx < keys.length; idx++) {
      _private.create.call(this, this.__nodes__.get(keys[idx]));
    }

    if (this.isVersioned) {
      this.state = this.__version__.get("state") || "ROOT";
    }

    delete this.__is_initializing__;

    return this;
  };

  // A helper to apply co-transformations
  // --------
  //
  // The provided adapter must conform to the interface:
  //
  //    {
  //      create: function(node) {},
  //      delete: function(node) {},
  //      update: function(node, property, newValue, oldValue) {},
  //    }
  //

  this.cotransform = function(adapter, op) {
    if (op.type === "create") {
      adapter.create.call(adapter, op.val);
    }
    else if (op.type === "delete") {
      adapter.delete.call(adapter, op.val);
    }
    // type = 'update' or 'set'
    else {

      var prop = this.resolve(op.path);
      if (prop === undefined) {
        throw new Error("Key error: could not find element for path " + JSON.stringify(op.path));
      }
      var value = prop.get();

      var oldValue;

      // Attention: this happens when updates and deletions are within one compound
      // The operation gets applied, finally the node is deleted.
      // Listeners are triggered afterwards, so they can not rely on the node being there
      // anymore.
      // However, this is not a problem. We can ignore this update as there will come
      // a deletion anyways.
      if (value === undefined) {
        return;
      }

      if (op.type === "set") {
        oldValue = op.original;
      } else {
        var invertedDiff = Operator.Helpers.invert(op.diff, prop.baseType);
        oldValue = invertedDiff.apply(_.clone(value));
      }

      adapter.update.call(adapter, prop.node, prop.key, value, oldValue);
    }
  };

  this.addIndex = function(name, options) {
    if (this.indexes[name]) {
      return this.indexes[name];
      // throw new GraphError("Index with name " + name + "already exists.");
    }

    // EXPERIMENTAL: refactoring the index API
    // Eventually, simple indexing should be easier and consistent with
    // the currently rather complicated hierarchical index
    var index;
    if (options && options["custom"]) {
      index = new CustomIndex(this, name, options);
    } else if (options && options["simple"]) {
      index = new SimpleIndex(this, name, options);
    } else {
      index = new Index(this, options);
    }
    this.indexes[name] = index;

    return index;
  };

  this.getIndex = function(name) {
    if (!this.indexes[name]) {
      throw new GraphError("No index available with name:"+name);
    }
    return this.indexes[name];
  };

  this.removeIndex = function(name) {
    delete this.indexes[name];
  };

  this.enableVersioning = function(chronicle) {
    if (this.isVersioned) return;
    if (!chronicle) {
      chronicle = Chronicle.create();
    }
    this.chronicle = chronicle;
    this.chronicle.manage(new Graph.ChronicleAdapter(this));
    this.isVersioned = true;
  };

  this.getMigrations = function() {
    return {};
  };

  this.migrate = function(seed) {
    // Try to migrate
    var migrations = new Migrations(this);
    // try {
      return migrations.migrate(seed);
    // } catch (migrationErr) {
    //   throw new GraphError([
    //     "Graph does not conform to schema. Expected: ",
    //     this.schema.id+"@"+this.schema.version,
    //     " Actual: ",
    //     seed.schema[0]+"@"+seed.schema[1]
    //   ].join(''));
    // }
  };

};

// Index Modes
// ----------

Graph.STRICT_INDEXING = 1 << 1;
Graph.DEFAULT_MODE = Graph.STRICT_INDEXING;


// Private Graph implementation
// ============================

Graph.Private = function() {

  var _private = this;

  // Node construction
  // -----------------
  //
  // Safely constructs a new node based on type information
  // Node needs to have a valid type
  // All properties that are not registered, are dropped
  // All properties that don't have a value are replaced using default values for type

  this.createNode = function (schema, node) {
    if (!node.id || !node.type) {
      throw new GraphError("Can not create Node: 'id' and 'type' are mandatory.");
    }

    var type = schema.type(node.type);
    if (!type) {
      throw new GraphError("Type '"+node.type+"' not found in the schema");
    }

    var properties = schema.properties(node.type);
    var freshNode = { type: node.type, id: node.id };

    // Start constructing the fresh node
    _.each(properties, function(p, key) {
      // Find property base type
      var baseType = schema.propertyBaseType(node.type, key);

      // Assign user defined property value or use default value for baseType
      var val = (node[key] !== undefined) ? node[key] : schema.defaultValue(baseType);
      freshNode[key] = util.deepclone(val);
    });

    return freshNode;
  };

  // Create a new node
  // -----------------
  // Safely constructs a new node
  // Checks for node duplication
  // Adds new node to indexes
  this.create = function(node) {
    var newNode = _private.createNode(this.schema, node);
    if (this.contains(newNode.id)) {
      throw new GraphError("Node already exists: " + newNode.id);
    }
    this.nodes[newNode.id] = newNode;
    this.trigger("node:created", newNode);
    return this;
  };

  // Remove a node
  // -----------
  // Deletes node by id, referenced nodes remain untouched
  // Removes node from indexes
  this.delete = function(node) {
    delete this.nodes[node.id];
    this.trigger("node:deleted", node.id);
  };

  this.set = function(path, value) {
    var property = this.resolve(path);
    if (property === undefined) {
      throw new Error("Key error: could not find element for path " + JSON.stringify(path));
    }
    if (!property.type) {
      throw new Error("Could not lookup schema for path " + JSON.stringify(path));
    }
    var oldValue = util.deepclone(property.get());
    property.set(value);
    this.trigger("property:updated", path, null, oldValue, value);
  };

  var _triggerPropertyUpdate = function(path, diff) {
    Operator.Helpers.each(diff, function(op) {
      this.trigger('property:updated', path, op, this);
    }, this);
  };

  this.update = function(path, value, diff) {
    var property = this.resolve(path);
    if (property === undefined) {
      throw new Error("Key error: could not find element for path " + JSON.stringify(path));
    }
    property.set(value);
    _triggerPropertyUpdate.call(this, path, diff);
  };

  this.queryArray = function(arr, type) {
    if (!_.isArray(type)) {
      throw new GraphError("Illegal argument: array types must be specified as ['array'(, 'array')*, <type>]");
    }
    var result, idx;
    if (type[1] === "array") {
      result = [];
      for (idx = 0; idx < arr.length; idx++) {
        result.push(_private.queryArray.call(this, arr[idx], type.slice(1)));
      }
    } else if (!isValueType(type[1])) {
      result = [];
      for (idx = 0; idx < arr.length; idx++) {
        result.push(this.get(arr[idx]));
      }
    } else {
      result = arr;
    }
    return result;
  };

};

Graph.prototype = new Graph.Prototype();

// ObjectOperation Adapter
// ========
//
// This adapter delegates object changes as supported by Operator.ObjectOperation
// to graph methods

Graph.ObjectAdapter = function(graph) {
  this.graph = graph;
};

Graph.ObjectAdapter.Prototype = function() {
  var impl = new Graph.Private();

  // Note: this adapter is used with the OT API only.
  // We do not accept paths to undefined properties
  // and instead throw an error to fail as early as possible.
  this.get = function(path) {
    var prop = this.graph.resolve(path);
    if (prop === undefined) {
      throw new Error("Key error: could not find element for path " + JSON.stringify(path));
    } else {
      return prop.get();
    }
  };

  this.create = function(__, value) {
    // Note: only nodes (top-level) can be created
    impl.create.call(this.graph, value);
  };

  this.set = function(path, value) {
    impl.set.call(this.graph, path, value);
  };

  this.update = function(path, value, diff) {
    impl.update.call(this.graph, path, value, diff);
  };

  this.delete = function(__, value) {
    // Note: only nodes (top-level) can be deleted
    impl.delete.call(this.graph, value);
  };

  this.inplace = function() { return false; };
};

Graph.ObjectAdapter.Prototype.prototype = Operator.ObjectOperation.Object.prototype;
Graph.ObjectAdapter.prototype = new Graph.ObjectAdapter.Prototype();

Graph.Schema = Schema;
Graph.Property = Property;

Graph.PersistenceAdapter = PersistenceAdapter;
Graph.ChronicleAdapter = ChronicleAdapter;
Graph.Index = Index;

// Exports
// ========

module.exports = Graph;

},{"./chronicle_adapter":127,"./custom_index":128,"./graph_index":130,"./migrations":131,"./persistence_adapter":132,"./property":133,"./schema":134,"./simple_index":135,"substance-chronicle":23,"substance-operator":250,"substance-util":268,"underscore":273}],130:[function(require,module,exports){
var _ = require("underscore");
var util = require("substance-util");

// Creates an index for the document applying a given node filter function
// and grouping using a given key function
// --------
//
// - document: a document instance
// - filter: a function that takes a node and returns true if the node should be indexed
// - key: a function that provides a path for scoped indexing (default: returns empty path)
//
// Note: this implementation is rather 'complicated'. It is tailored to the annotation use-case,
// where we want to get all annotations for a specific graph path, e.g., ["text_1", "content"].
// TODO: we should provide a simpler index implementation of other things,
// for example: group nodes by type, map annotations to container (i.e., annotation.path[0]->container).

var Index = function(graph, options) {
  options = options || {};

  this.graph = graph;

  this.nodes = {};
  this.scopes = {};

  if (options.filter) {
    this.filter = options.filter;
  } else if (options.types) {
    this.filter = Index.typeFilter(graph.schema, options.types);
  }

  if (options.property) {
    this.property = options.property;
  }

  this.createIndex();
};

Index.Prototype = function() {

  _.extend(this, util.Events.Listener);

  // Resolves a sub-hierarchy of the index via a given path
  // --------
  //

  var _resolve = function(path) {
    var index = this;
    if (path !== null) {
      for (var i = 0; i < path.length; i++) {
        var id = path[i];
        index.scopes[id] = index.scopes[id] || { nodes: {}, scopes: {} };
        index = index.scopes[id];
      }
    }
    return index;
  };

  var _getKey = function(node) {
    if (!this.property) return null;
    var key = node[this.property] ? node[this.property] : null;
    if (_.isString(key)) key = [key];
    return key;
  };

  // Accumulates all indexed children of the given (sub-)index
  var _collect = function(index) {
    var result = _.extend({}, index.nodes);
    _.each(index.scopes, function(child, name) {
      if (name !== "nodes") {
        _.extend(result, _collect(child));
      }
    });
    return result;
  };

  var _add = function(key, node) {
    var index = _resolve.call(this, key);
    index.nodes[node.id] = node.id;
  };

  var _remove = function(key, node) {
    var index = _resolve.call(this, key);
    delete index.nodes[node.id];
  };

  // Keeps the index up-to-date when the graph changes.
  // --------
  //

  this.onGraphChange = function(op) {

    var self = this;

    var adapter = {
      create: function(node) {
        if (!self.filter || self.filter(node)) {
          var key = _getKey.call(self, node);
          _add.call(self, key, node);
        }
      },
      delete: function(node) {
        if (!self.filter || self.filter(node)) {
          var key = _getKey.call(self, node);
          _remove.call(self, key, node);
        }
      },
      update: function(node, property, newValue, oldValue) {
        if ((self.property === property) && (!self.filter || self.filter(node))) {
          var key = oldValue;
          if (_.isString(key)) key = [key];
          _remove.call(self, key, node);
          key = newValue;
          if (_.isString(key)) key = [key];
          _add.call(self, key, node);
        }
      }
    };

    this.graph.cotransform(adapter, op);
  };

  // Initializes the index
  // --------
  //

  this.createIndex = function() {
    this.reset();

    var nodes = this.graph.nodes;
    _.each(nodes, function(node) {
      if (!this.filter || this.filter(node)) {
        var key = _getKey.call(this, node);
        _add.call(this, key, node);
      }
    }, this);
  };

  // Collects all indexed nodes using a given path for scoping
  // --------
  //

  this.get = function(path) {
    if (arguments.length === 0) {
      path = null;
    } else if (_.isString(path)) {
      path = [path];
    }

    var index = _resolve.call(this, path);
    var result;

    // EXPERIMENTAL: do we need the ability to retrieve indexed elements non-recursively
    // for now...
    // if so... we would need an paramater to prevent recursion
    // E.g.:
    //     if (shallow) {
    //       result = index.nodes;
    //     }
    result = _collect(index);

    _.each(result, function(id) {
      result[id] = this.graph.get(id);
    }, this);

    return result;
  };

  // EXPERIMENTAL: sometimes we want to get groups of nodes, where this.property
  // is used for grouping.
  // Note: this works only for non-array properties.
  this.getGroups = function() {
    var result = {};

    _.each(this.scopes, function(__, groupId) {
      var nodes = this.get(groupId);
      result[groupId] = Object.keys(nodes);
    }, this);

    return result;
  };

  this.reset = function() {
    this.nodes = {};
    this.scopes = {};
  };

  this.dispose = function() {
    this.stopListening();
  };
};

Index.prototype = new Index.Prototype();

Index.typeFilter = function(schema, types) {
  return function(node) {
    var typeChain = schema.typeChain(node.type);
    for (var i = 0; i < types.length; i++) {
      if (typeChain.indexOf(types[i]) >= 0) {
        return true;
      }
    }
    return false;
  };
};

module.exports = Index;

},{"substance-util":268,"underscore":273}],131:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");

var MigrationError = util.errors.define("MigrationError", -1);

// Migration support for Data.Graphs
// =================================
//
// A Graph instance can provide migrations to be able to open older document
// versions by transforming them into the current one.
// For that, `graph.getMigrations()` should return a map of migration functions.
// A migration function takes a json object of the previous version and returns
// a transformed object.
//
// Example:
//
// function v010000_v020000(v1_data) {}
//   var migrator = new Migrator(v1_data);
//   migrator.removeNodes({"type": 'mynode'});
//   migrator.renameNodeType('old_type', 'new_type');
//   return migrator.getResult();
// }
//
// Article.protoype.getMigrations = function() {
//   return {
//    "2.0.0": v010000_v020000
//   };
// }
//
// Note:

var Migrations = function(graph) {
  Array.call(this);
  var self = this;

  this.graph = graph;
  _.each(graph.getMigrations(), function(migrationFunction, versionStr) {
    self.push({
      version: Migrations.versionFromString(versionStr),
      process: migrationFunction
    });
  });

  // sort the version semantically
  this.sort(Migrations.compareMigrations);
};

Migrations.Prototype = function() {

  // lookup the migration by version string
  this.findIndex = function(versionStr) {
    var pattern = {
      version: Migrations.versionFromString(versionStr)
    };
    for (var i = this.length - 1; i >= 0; i--) {
      if (Migrations.compareMigrations(pattern, this[i]) === 0) {
        return i;
      }
    }
    return -1;
  };


  this.migrate = function(data) {
    var migrator = new Migrations.Migrator(data);

    if (migrator.getVersion() === this.graph.schema.version) {
      return;
    }

    // look for the given version
    var idx = this.findIndex(migrator.getVersion());
    if (idx < 0) {
      throw new MigrationError("No migration found for version" + migrator.getVersion());
    }

    // we apply all subsequent migrations
    for (idx = idx + 1; idx < this.length; idx++) {
      var nextMigration = this[idx];
      var nextVersionStr = nextMigration.version.join(".");
      console.log("Migrating", this.graph.schema.id+"@"+migrator.getVersion(), "->", this.graph.schema.id+"@"+nextVersionStr);
      nextMigration.process(migrator);
      migrator.setVersion();
    }

    // return the migrator to allow to do something with it, e.g., display problems...
    return migrator;
  };
};

Migrations.Prototype.prototype = Array.prototype;
Migrations.prototype = new Migrations.Prototype();

var versionFromString = function(versionStr) {
  var arr = versionStr.split(".");
  return arr.map(function(s) { return parseInt(s, 10); });
};

var compareMigrations = function(a, b) {
  var v1 = a.version;
  var v2 = b.version;
  for (var i = 0; i < 3; i++) {
    if (v1[i] < v2[i]) return -1;
    if (v1[i] > v2[i]) return 1;
  }
  return 0;
};

var Migrator = function(data) {
  this.data = data;
  this.warnings = [];
};

Migrator.Prototype = function() {

  this.getVersion = function() {
    return this.data.schema[1];
  };

  this.setVersion = function(version) {
    this.data.schema[1] = version;
  };

  this.removeType = function(nodeType) {
    throw new MigrationError("Not yet implemented", nodeType);
  };

  this.renameType = function(nodeType, newType) {
    throw new MigrationError("Not yet implemented", nodeType, newType);
  };

  this.removeProperty = function(nodeType, propertyName) {
    throw new MigrationError("Not yet implemented", nodeType, propertyName);
  };

  this.renameProperty = function(nodeType, propertyName, newPropertyName) {
    throw new MigrationError("Not yet implemented", nodeType, propertyName, newPropertyName);
  };

  this.addProperty = function(nodeType, propertyName, defaultValue) {
    _.each(this.data.nodes, function(n) {
      if (n.type === nodeType) {
        n[propertyName] = defaultValue;
      }
    }, this);
  };

  this.reportWarning = function(msg, data) {
    this.warnings.push({
      message: msg,
      data: data
    });
  };
};
Migrator.prototype = new Migrator.Prototype();

Migrations.MigrationError = MigrationError;
Migrations.versionFromString = versionFromString;
Migrations.compareMigrations = compareMigrations;
Migrations.Migrator = Migrator;

module.exports = Migrations;

},{"substance-util":268,"underscore":273}],132:[function(require,module,exports){
"use strict";

var Operator = require('substance-operator');

var PersistenceAdapter = function(delegate, nodes) {
  this.delegate = delegate;
  this.nodes = nodes;
};

PersistenceAdapter.Prototype = function() {

  this.get = function(path) {
    return this.delegate.get(path);
  };

  this.create = function(__, value) {
    this.delegate.create(__, value);
    this.nodes.set(value.id, value);
  };

  this.set = function(path, value) {
    this.delegate.set(path, value);
    // TODO: is it ok to store the value as node???
    var nodeId = path[0];
    var updated = this.delegate.get([nodeId]);
    this.nodes.set(nodeId, updated);
  };

  this.delete = function(__, value) {
    this.delegate.delete(__, value);
    this.nodes.delete(value.id);
  };

  this.inplace = function() {
    return false;
  };
};
PersistenceAdapter.Prototype.prototype = Operator.ObjectOperation.Object.prototype;
PersistenceAdapter.prototype = new PersistenceAdapter.Prototype();

module.exports = PersistenceAdapter;

},{"substance-operator":250}],133:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var Property = function(graph, path) {
  if (!path) {
    throw new Error("Illegal argument: path is null/undefined.");
  }

  this.graph = graph;
  this.schema = graph.schema;

  // Note: if you specifiy an invalid path, e.g., to a non-existing property
  // then this.resolve() will return `undefined`.
  // In cases of write-access (e.g., update, set) we need to make sure to fail instantly with an error,
  // to avoid entering other more complicated places with an invalid state.
  var resolved = this.resolve(path);
  if (resolved !== undefined) {
    _.extend(this, resolved);
  } else {
    return undefined;
  }
};

Property.Prototype = function() {

  this.resolve = function(path) {
    var node = this.graph;
    var parent = node;
    var type = "graph";

    var key;
    var value;

    var idx = 0;
    for (; idx < path.length; idx++) {

      // TODO: check if the property references a node type
      if (type === "graph" || this.schema.types[type] !== undefined) {
        // remember the last node type
        parent = this.graph.get(path[idx]);

        if (parent === undefined) {
          return undefined;
        }

        node = parent;
        type = this.schema.properties(parent.type);
        value = node;
        key = undefined;
      } else {
        if (parent === undefined) {
          return undefined;
        }
        key = path[idx];
        var propName = path[idx];
        type = type[propName];
        value = parent[key];

        if (idx < path.length-1) {
          parent = parent[propName];
        }
      }
    }

    return {
      node: node,
      parent: parent,
      type: type,
      key: key,
      value: value
    };

  };

  this.get = function() {
    if (this.key !== undefined) {
      return this.parent[this.key];
    } else {
      return this.node;
    }
  };

  this.set = function(value) {
    if (this.key !== undefined) {
      this.parent[this.key] = this.schema.parseValue(this.baseType, value);
    } else {
      throw new Error("'set' is only supported for node properties.");
    }
  };

};
Property.prototype = new Property.Prototype();
Object.defineProperties(Property.prototype, {
  baseType: {
    get: function() {
      if (_.isArray(this.type)) return this.type[0];
      else return this.type;
    }
  },
  path: {
    get: function() {
      return [this.node.id, this.key];
    }
  }
});

module.exports = Property;

},{"underscore":273}],134:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");


// Data.Schema
// ========
//
// Provides a schema inspection API

var Schema = function(schema) {
  _.extend(this, schema);
};

Schema.Prototype = function() {

  // Return Default value for a given type
  // --------
  //

  this.defaultValue = function(valueType) {
    if (valueType === "object") return {};
    if (valueType === "array") return [];
    if (valueType === "string") return "";
    if (valueType === "number") return 0;
    if (valueType === "boolean") return false;
    if (valueType === "date") return new Date();

    return null;
    // throw new Error("Unknown value type: " + valueType);
  };

  // Return type object for a given type id
  // --------
  //

  this.parseValue = function(valueType, value) {
    if (value === null) {
      return value;
    }

    if (_.isString(value)) {
      if (valueType === "object") return JSON.parse(value);
      if (valueType === "array") return JSON.parse(value);
      if (valueType === "string") return value;
      if (valueType === "number") return parseInt(value, 10);
      if (valueType === "boolean") {
        if (value === "true") return true;
        else if (value === "false") return false;
        else throw new Error("Can not parse boolean value from: " + value);
      }
      if (valueType === "date") return new Date(value);

      // all other types must be string compatible ??
      return value;

    } else {
      if (valueType === 'array') {
        if (!_.isArray(value)) {
          throw new Error("Illegal value type: expected array.");
        }
        value = util.deepclone(value);
      }
      else if (valueType === 'string') {
        if (!_.isString(value)) {
          throw new Error("Illegal value type: expected string.");
        }
      }
      else if (valueType === 'object') {
        if (!_.isObject(value)) {
          throw new Error("Illegal value type: expected object.");
        }
        value = util.deepclone(value);
      }
      else if (valueType === 'number') {
        if (!_.isNumber(value)) {
          throw new Error("Illegal value type: expected number.");
        }
      }
      else if (valueType === 'boolean') {
        if (!_.isBoolean(value)) {
          throw new Error("Illegal value type: expected boolean.");
        }
      }
      else if (valueType === 'date') {
        value = new Date(value);
      }
      else {
        throw new Error("Unsupported value type: " + valueType);
      }
      return value;
    }
  };

  // Return type object for a given type id
  // --------
  //

  this.type = function(typeId) {
    return this.types[typeId];
  };

  // For a given type id return the type hierarchy
  // --------
  //
  // => ["base_type", "specific_type"]

  this.typeChain = function(typeId) {
    var type = this.types[typeId];
    if (!type) {
      throw new Error('Type ' + typeId + ' not found in schema');
    }

    var chain = (type.parent) ? this.typeChain(type.parent) : [];
    chain.push(typeId);
    return chain;
  };

  this.isInstanceOf = function(type, parentType) {
    var typeChain = this.typeChain(type);
    if (typeChain && typeChain.indexOf(parentType) >= 0) {
      return true;
    } else {
      return false;
    }
  };

  // Provides the top-most parent type of a given type.
  // --------
  //

  this.baseType = function(typeId) {
    return this.typeChain(typeId)[0];
  };

  // Return all properties for a given type
  // --------
  //

  this.properties = function(type) {
    type = _.isObject(type) ? type : this.type(type);
    var result = (type.parent) ? this.properties(type.parent) : {};
    _.extend(result, type.properties);
    return result;
  };

  // Returns the full type for a given property
  // --------
  //
  // => ["array", "string"]

  this.propertyType = function(type, property) {
    var properties = this.properties(type);
    var propertyType = properties[property];
    if (!propertyType) throw new Error("Property not found for" + type +'.'+property);
    return _.isArray(propertyType) ? propertyType : [propertyType];
  };

  // Returns the base type for a given property
  // --------
  //
  //  ["string"] => "string"
  //  ["array", "string"] => "array"

  this.propertyBaseType = function(type, property) {
    return this.propertyType(type, property)[0];
  };
};

Schema.prototype = new Schema.Prototype();

module.exports = Schema;

},{"substance-util":268,"underscore":273}],135:[function(require,module,exports){
var _ = require("underscore");
var CustomIndex = require("./custom_index");

var SimpleIndex = function(graph, name, options) {
  options = options || {};
  CustomIndex.call(this, graph, name, options);
};

SimpleIndex.Prototype = function() {
  this.__add = function(key, value) {
    this.data[key] = value;
  };
  this.__remove = function(key, value) {
    delete this.data[key];
  };
};

SimpleIndex.Prototype.prototype = CustomIndex.prototype;
SimpleIndex.prototype = new SimpleIndex.Prototype();

module.exports = SimpleIndex;

},{"./custom_index":128,"underscore":273}],136:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var Document = require('./src/document');
Document.Annotator = require('./src/annotator');
Document.Cursor = require('./src/cursor');
Document.Selection = require('./src/selection');
Document.Container = require('./src/container');
Document.Component = require('./src/component');
Document.Session = require('./src/document_session');
Document.NodeViewFactory = require('./src/node_view_factory');
Document.DocumentRenderer = require('./src/document_renderer');

module.exports = Document;

},{"./src/annotator":137,"./src/component":138,"./src/container":140,"./src/cursor":141,"./src/document":142,"./src/document_renderer":143,"./src/document_session":144,"./src/node_view_factory":147,"./src/selection":148,"underscore":273}],137:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Document = require("./document");
var Operator = require("substance-operator");

var _getConfig = function(doc) {
  // Note: this is rather experimental
  // It is important to inverse the control over the annotation behavior,
  // i.e., which annotations exist and how they should be handled
  var annotationBehavior = doc.getAnnotationBehavior();
  if (!annotationBehavior) {
    throw new Error("No Annotation behavior specified.");
  }
  annotationBehavior.expansion = annotationBehavior || {};
  annotationBehavior.expansion["annotation_fragment"] = {
    left: function(fragment) {
      return !fragment.isFirst();
    },
    right: function(fragment) {
      return !fragment.isLast();
    }
  };
  annotationBehavior.split.push('annotation_fragment');
  return annotationBehavior;
};

// A class that provides helpers to manage a document's annotations.
// --------
//
// Note: the provided document is used to retrieve the annotation behavior and to initialize an annotation index.
//
var Annotator = function(doc) {
  this.config = _getConfig(doc);
  this.document = doc;
};

Annotator.Prototype = function() {

  // Updates all annotations according to a given operation.
  // --------
  //
  // The provided operation is an ObjectOperation which has been applied already or should be applied afterwards.
  //
  // Depending on the operation's `path` and the impact on an annotations range
  // there are the following cases:
  // 1. op='update', path==a.path: update the range following the rules given in the configuration
  // 2. op='delete', path[0]==a.path[0]: the annotation gets deleted
  // 3. op='set', path==a.path: the annotation gets deleted as the referenced property has been reset
  //
  this.update = function(op, options) {
    options = options || {};
    var path = options.path || op.path;
    var index = this.document.getIndex("annotations");
    var annotations = index.get(path);
    _.each(annotations, function(a) {
      _update(this, a, op, options);
    }, this);
  };

  // Copy annotations in the given selection.
  // --------
  // This is the pendant to the writer's copy method.
  // Partially selected annotations may not get copied depending on the
  // annotation type, for others, new annotation fragments would be created.

  this.copy = function(/*selection*/) {
    throw new Error("FIXME: this must be updated considering the other API changes.");

    // var ranges = _getRanges(this, selection);

    // // get all affected annotations
    // var annotations = this.getAnnotations(session, selection);
    // var result = [];

    // _.each(annotations, function(annotation) {

    //   // TODO: determine if an annotation would be split by the given selection.
    //   var range = ranges[annotation.path[0]];
    //   var isPartial = (range[0] > annotation.range[0] || range[1] < annotation.range[1]);

    //   var newAnnotation;
    //   if (isPartial) {
    //     // for the others create a new fragment (depending on type) and truncate the original
    //     if (this.isSplittable(annotation.type)) {
    //       newAnnotation = util.clone(annotation);
    //       // make the range relative to the selection
    //       newAnnotation.id = util.uuid();
    //       newAnnotation.range = [Math.max(0, annotation.range[0] - range[0]), annotation.range[1] - range[0]];
    //       result.push(newAnnotation);
    //     }
    //   } else {
    //     // add totally included ones
    //     // TODO: need more control over uuid generation
    //     newAnnotation = util.clone(annotation);
    //     newAnnotation.id = util.uuid();
    //     newAnnotation.range = [newAnnotation.range[0] - range[0], newAnnotation.range[1] - range[0]];
    //     result.push(newAnnotation);
    //   }

    // }, this);

    // return result;
  };

  this.paste = function(/*annotations, newNodeId, offset*/) {
    throw new Error("FIXME: this must be updated considering the other API changes.");
    // for (var i = 0; i < annotations.length; i++) {
    //   var annotation = annotations[i];
    //   if (newNodeId !== undefined) {
    //     annotation.path = _.clone(annotation.path);
    //     annotation.path[0] = newNodeId;
    //   }
    //   if (offset !== undefined) {
    //     annotation.range[0] += offset;
    //     annotation.range[1] += offset;
    //   }
    //   this.create(annotation);
    // }
  };

  // A helper to implement an editor which can break or join nodes.
  // --------
  // TODO: this seems to be very tailored to text nodes. Refactor this when needed.
  //
  this.transferAnnotations = function(node, charPos, newNode, offset) {
    offset = offset || 0;

    var annotations = _nodeAnnotationsByRange(this, node, {start: charPos});
    _.each(annotations, function(annotation) {

      var isInside = (charPos > annotation.range[0] || charPos[1] < annotation.range[1]);
      var newRange;

      // 1. if the cursor is inside an annotation it gets either split or truncated
      if (isInside) {
        // create a new annotation fragment if the annotation is splittable
        if (this.isSplittable(annotation.type)) {
          var splitAnnotation = util.clone(annotation);
          splitAnnotation.range = [offset, offset + annotation.range[1] - charPos];
          splitAnnotation.id = util.uuid();
          splitAnnotation.path[0] = newNode.id;
          this.document.create(splitAnnotation);
        }
        // in either cases truncate the first part
        newRange =_.clone(annotation.range);
        newRange[1] = charPos;

        // if the fragment has a zero range now, delete it
        if (newRange[1] === newRange[0]) {
          this.document.delete(annotation.id);
        }
        // ... otherwise update the range
        else {
          this.document.set([annotation.id, "range"], newRange);
        }
      }

      // 2. if the cursor is before an annotation then simply transfer the annotation to the new node
      else {
        // Note: we are preserving the annotation so that anything which is connected to the annotation
        // remains valid.
        var newPath = _.clone(annotation.path);
        newPath[0] = newNode.id;
        newRange = [offset + annotation.range[0] - charPos, offset + annotation.range[1] - charPos];

        this.document.set([annotation.id, "path"], newPath);
        this.document.set([annotation.id, "range"], newRange);

        if (annotation.type === "annotation_fragment") {
          var multiAnno = this.document.get(annotation.annotation_id);
          newPath = _.clone(multiAnno.startPath);
          newPath[0] = newNode.id;
          this.document.set([multiAnno.id, "startPath"], newPath);
        }
      }
    }, this);
  };

  this.getAnnotationsForNode = function(nodeId) {
    return this.index.get(nodeId);
  };

  // Provides all annotations that correspond to a given selection.
  // --------
  // TODO: we could do a minor optimization, as it happens that the same query is performed multiple times.
  //
  this.getAnnotations = function(sel, options) {
    if (!(sel instanceof Document.Selection)) {
      throw new Error("API has changed: now getAnnotations() takes only a selection.");
    }

    var annotations = [];
    var ranges = sel.getRanges();
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      var annos = _annotationsByRange(this, this.document, range, options);
      annotations = annotations.concat(annos);
    }
    // console.log("Annotator.getAnnotations():", sel, annotations);
    return annotations;
  };

  // Returns true if two annotation types are mutually exclusive
  // ---------
  // Currently there is a built-in mechanism which considers two annotations
  // exclusive if they belong to the same group.
  //
  this.isExclusive = function(type1, type2) {
    return this.config.groups[type1] === this.config.groups[type2];
  };

  // Tell if an annotation can be split or should be truncated only.
  // --------
  //
  // E.g. when cutting a selection or inserting a new node existing annotations
  // may be affected. In some cases (e.g., `emphasis` or `strong`) it is wanted
  // that a new annotation of the same type is created for the cut fragment.
  //
  this.isSplittable = function(type) {
    return this.config.split.indexOf(type) >= 0;
  };


  // Updates a single annotation according to a given operation.
  // --------
  //
  var _update = function(self, annotation, op, options) {
    var path = options.path || op.path;

    // only apply the transformation on annotations with the same property
    // Note: currently we only have annotations on the `content` property of nodes
    if (!_.isEqual(annotation.path, path)) return;

    if (op.type === "update") {
      // Note: these are implicit transformations, i.e., not triggered via annotation controls
      var expandLeft = false;
      var expandRight = false;

      var expandSpec = self.config.expansion[annotation.type];
      if (expandSpec) {
        if (expandSpec.left) expandLeft =  expandSpec.left(annotation);
        if (expandSpec.right) expandRight = expandSpec.right(annotation);
      }

      var newRange = util.clone(annotation.range);
      var changed = Operator.TextOperation.Range.transform(newRange, op.diff, expandLeft, expandRight);
      if (changed) {
        if (newRange[0] === newRange[1]) {
          self.document.delete(annotation.id);
        } else {
          self.document.set([annotation.id, "range"], newRange, {"incremental": true});
        }
        if (annotation.type === "annotation_fragment") {
          var multiAnno = annotation.getAnnotation();
          if (annotation.isFirst() && multiAnno.startCharPos !== newRange[0]) {
            self.document.set([annotation.annotation_id, "startCharPos"], newRange[0]);
          } else if (annotation.isLast() && multiAnno.endCHarPos !== newRange[1]) {
            self.document.set([annotation.annotation_id, "endCharPos"], newRange[1]);
          }
        }
      }
    }
    // if somebody has reset the property we must delete the annotation
    else if (op.type === "delete" || op.type === "set") {
      self.document.delete(annotation.id);
    }
  };

  // Checks if an annotation overlaps with a given range
  // --------
  //
  var __isOverlap = function(self, anno, range, options) {
    var sStart = range.start;
    var sEnd = range.end;
    var aStart = anno.range[0];
    var aEnd = anno.range[1];

    var expandLeft = false;
    var expandRight = false;

    if (options && options[anno.type]) {
      expandLeft = options[anno.type].left || false;
      expandRight = options[anno.type].right || false;
    } else {
      // NOTE: it seems that it is not the best idea to use the predefined
      // inclusion rules within the isOverlap function.
      // Instead, sometimes the desire is for a much more dynamic/custom control (using options)
      var expandSpec = self.config.expansion[anno.type];
      if (expandSpec) {
        if (expandSpec.left) expandLeft =  expandSpec.left(anno);
        if (expandSpec.right) expandRight = expandSpec.right(anno);
      }
    }

    var overlap;
    if (expandRight) {
      overlap = (aEnd >= sStart);
    } else {
      overlap = (aEnd > sStart);
    }

    // Note: it is allowed to leave range.end undefined
    if (_.isNumber(sEnd)) {
      if (expandLeft) {
        overlap = overlap && (aStart <= sEnd);
      } else {
        overlap = overlap && (aStart < sEnd);
      }
    }

    return overlap;
  };

  var _annotationsByRange = function(self, doc, range, options) {
    var result = [];
    var component = range.component;
    var annotations;
    var index = doc.getIndex("annotations");

    // Note: If a component displays a referenced property (e.g., Cover.title)
    // IMO it makes more sense to attach annotations to the referencing path instead of the original path.
    // E.g., ["cover", "title"] instead of ["document", "title"]
    annotations = index.get(component.path);

    if (component.alias) {
      // HACK: component.alias and component.path are not used consistently yet
      // so we use both for now
      annotations = _.extend(annotations, index.get(component.alias));
    }

    _.each(annotations, function(a) {
      if (__isOverlap(self, a, range, options)) {
        result.push(a);
      }
    });
    return result;
  };

  var _nodeAnnotationsByRange = function(self, node, range) {
    var result = [];
    var index = self.document.getIndex("annotations");
    var annotations = index.get(node.id);
    _.each(annotations, function(a) {
      if (__isOverlap(self, a, range)) {
        result.push(a);
      }
    });
    return result;
  };
};

Annotator.Prototype.prototype = util.Events;
Annotator.prototype = new Annotator.Prototype();

Annotator.isOnNodeStart = function(a) {
  return a.range[0] === 0;
};

Annotator.isTrue = function() {
  return true;
};

// A helper to decide whether a graph operation affects annotations of a given node
// --------
// E.g., this is used by node views to detect annotation changes and to update the view accordingly.
//

var _isInstanceOf = function(doc, node, type) {
  var schema = doc.getSchema();
  return schema.isInstanceOf(node.type, type);
};


Annotator.changesAnnotations = function(doc, op, path) {
  var anno;
  if (op.type === "delete") {
    anno = op.val;
  } else {
    anno = doc.get(op.path[0]);
  }
  var result = false;

  if (_isInstanceOf(doc, anno, "annotation")) {
    // any annotation operation with appropriate path
    if (_.isEqual(path, anno.path)) {
      result = true;
    }
    // ... or those who are changing the path to that
    else if (op.type === "set" && op.path[1] === "path" && (_.isEqual(path, op.original)|| _.isEqual(path, op.val))) {
      result = true;
    }
  }

  return result;
};

// A static helper to create a document index for annotations
Annotator.createIndex = function(doc) {
  return doc.addIndex("annotations", {types: ["annotation"], property: "path"});
};

module.exports = Annotator;

},{"./document":142,"substance-operator":250,"substance-util":268,"underscore":273}],138:[function(require,module,exports){
"use strict";

var Component = function(root, path, options) {
  options = options || {};

  if (!root || !path) {
    throw new Error("Inclomplete arguments for Component");
  }

  // each component belongs to a document node
  // the node is the one which is included in the container
  // and represents the root node which produced this component.
  this.root = root;

  // each component is bound to a specific graph property
  // e.g., ['text_1', 'content']
  this.path = path;

  // position of the component in the flattened list of components
  // This is essentially used to address a component e.g., to set the cursor
  // or to apply changes.
  this.pos = null;

  // TODO: IMO this should be removed as it can be retrieved via the container
  this.rootPos = null;


  // to identify the component within a node
  this.name = options.name;

  // a component can be used in a composite.
  // for composites we use a similar path pattern which however
  // does not correspond to real graph paths.
  // E.g. a figure 'fig_1' could have a node as caption 'caption_1'.
  // The path to the text content would be ['caption_1', 'content']
  // In the view it has the path ['fig_1', 'caption', 'content']
  this.alias = options.alias;

  if (options.length) {
    this.__getLength__ = options.length;
  }

};

Component.Protoype = function() {

  this.__getLength__ = function() {
    throw new Error("This is abstract and must be overridden");
  };

  this.getLength = function() {
    return this.length;
  };

  this.clone = function() {
    var ClonedComponent = function() {};
    ClonedComponent.prototype = this;
    return new ClonedComponent();
  };

};
Component.prototype = new Component.Protoype();

Object.defineProperties(Component.prototype, {
  "length": {
    get: function() {
      return this.__getLength__.call(this);
    }
  },

  // TODO: this are deprecated. I added just to make the refactoring step smaller
  "nodePos": {
    get: function() {
      return this.rootPos;
    },
    set: function() {
      throw new Error("DEPRECATED");
    }
  },
  "node": {
    get: function() {
      console.log("DEPRECATED: please use component.root instead");
      return this.root;
    },
    set: function() {
      throw new Error("DEPRECATED");
    }
  }

});

module.exports = Component;

},{}],139:[function(require,module,exports){
"use strict";

function ComponentSelection(component, start, end) {
  this.component = component;
  this.start = start;
  this.end = end;
}

ComponentSelection.Prototype = function() {

  this.getLength = function() {
    return this.end - this.start;
  };

  // Returns true if the selection includes the end of the component
  // --------
  //

  this.isRightBound = function() {
    return this.end === this.component.length;
  };

  // Returns true if the selection includes the begin of the component
  // --------
  //

  this.isLeftBound = function() {
    return this.start === 0;
  };

  // Returns true if the selection includes the full component
  // --------
  //

  this.isFull = function() {
    return this.isLeftBound() && this.isRightBound();
  };

  // Returns true if the selection does include the component only partially
  // --------
  //

  this.isPartial = function() {
    return !this.isFull();
  };

};
ComponentSelection.prototype = new ComponentSelection.Prototype();

module.exports = ComponentSelection;

},{}],140:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");

var util = require("substance-util");
var errors = util.errors;
var ContainerError = errors.define("ContainerError");

// The container must be much more view oriented as the actual visualized components depend very much on the
// used renderers.

var __id__ = 0;

var Container = function(document, name, surfaceProvider) {
  this.document = document;
  this.name = name;
  this.__id__ = __id__++;

  var viewNode = this.document.nodes[name];
  if (viewNode instanceof Container) {
    // HACK fixing an issue with creating a container for transactions
    viewNode = {
      type: "container",
      id: viewNode.id,
      nodes: viewNode.nodes
    }
    // throw new ContainerError("ViewNode is already wrapped as Container: " + name);
  }
  // TODO: get rid of 'view' as node type... instead use 'container'
  if (!viewNode || !viewNode.nodes) {
    throw new ContainerError("Illegal argument: no view with name " + name);
  }

  // TODO: rename this.view to this.node, which is less confusing
  this.__viewNode = viewNode;
  this.__components = null;
  this.__children = null;
  this.__updater = null;

  this.surfaceProvider = surfaceProvider || new Container.DefaultNodeSurfaceProvider(document);

  // EXPERIMENTAL: as this container rebuilds lazily it is ok no to initialize upfront
  // this.rebuild();

  this.listenTo(this.document, "operation:applied", this.update);
};

Container.Prototype = function() {

  _.extend(this, util.Events);

  this.rebuild = function() {
    // console.log("Container.rebuild", this.name);
    var __components = [];
    var __children = {};
    var __updater = [];

    var rootNodes = this.__viewNode.nodes;

    // TODO: we have a problem with doc-simulation here.
    // Nodes are duplicated for simulation. Not so the references in the components.
    for (var i = 0; i < rootNodes.length; i++) {
      var id = rootNodes[i];
      var nodeSurface = this.surfaceProvider.getNodeSurface(id);
      if (!nodeSurface) {
        throw new ContainerError("Aaaaah! no surface available for node " + id);
      }

      if (nodeSurface.update) {
        __updater.push(nodeSurface.update.bind(nodeSurface));
      }

      var components = nodeSurface.components;
      if (!components) {
        throw new ContainerError("Node Surface did not provide components: " + nodeSurface.node.type);
      }
      __children[id] = [];
      for (var j = 0; j < components.length; j++) {
        var component = components[j].clone();
        component.surface.detachView();
        component.pos = __components.length;
        component.rootPos = i;
        __children[id].push(component);
        __components.push(component);
      }
    }
    this.__components = __components;
    this.__children = __children;
    this.__updater = __updater;
  };

  this.getComponents = function() {
    if (!this.__components) {
      this.rebuild();
    }
    return this.__components;
  };

  this.lookup = function(path) {
    var components = this.getComponents();
    for (var i = 0; i < components.length; i++) {
      var component = components[i];
      // a node surface can register an alias for a component
      if (component.alias && _.isEqual(component.alias, path)) {
        return component;
      }
      if (_.isEqual(component.path, path)) {
        return component;
      }
    }

    console.error("Could not find a view component for path " + JSON.stringify(path));

    return null;
  };

  this.getNodes = function(idsOnly) {
    var nodeIds = this.__viewNode.nodes;
    if (idsOnly) {
      return _.clone(nodeIds);
    }
    else {
      var result = [];
      for (var i = 0; i < nodeIds.length; i++) {
        result.push(this.document.get(nodeIds[i]));
      }
      return result;
    }
  };

  this.update = function(op) {
    var path = op.path;
    var needRebuild = (!this.__components || path[0] === this.__viewNode.id);

    // Note: we let the NodeSurfaces in invalidate the container
    // TODO: this could be done more efficiently.
    // This strategy means that every container iterates through all
    // surfaces on *each* graph operation.
    // One way to solve this efficiently would be to add an invalidate()
    // that runs with a timeout=0.
    // This however comes with extra listeners and hard to control order of
    // observer calls.
    if (!needRebuild) {
      for (var i = 0; i < this.__updater.length; i++) {
        if (this.__updater[i](op)) {
          needRebuild = true;
          break;
        }
      }
    }
    if (needRebuild) this.rebuild();
  };

  this.getLength = function(pos) {
    var components = this.getComponents();
    if (pos === undefined) {
      return components.length;
    } else {
      return components[pos].length;
    }
  };

  this.getRootNodeFromPos = function(pos) {
    if (!this.__components) this.rebuild();
    return this.__components[pos].root;
  };

  this.getNodePos = function(pos) {
    if (!this.__components) this.rebuild();
    var id = this.__components[pos].root.id;
    return this.__viewNode.nodes.indexOf(id);
  };

  // This is used to find the containing node of a reference target.
  // E.g., an annotation might point to ['caption_2', 'content'] which is actually
  // contained by the 'figure_1' on the top-level.
  this.lookupRootNode = function(path) {
    var components = this.getComponents();
    for (var i = 0; i < components.length; i++) {
      var component = components[i];
      if ( (component.alias && _.isEqual(path, component.alias)) || _.isEqual(path, component.path) ) {
        return component.root;
      }
    }
    console.error("Could not find a root node for the given path:" + path);
    return null;
  };

  this.getComponent = function(pos) {
    var components = this.getComponents();
    return components[pos];
  };

  this.last = function() {
    var components = this.getComponents();
    return components[components.length-1];
  };

  this.getNodeComponents = function(nodeId) {
    var result = this.__children[nodeId];
    if (!result) {
      throw new ContainerError("Node is not in this container:"+nodeId);
    }
    return result;
  };

  this.dispose = function() {
    console.error("Typically we do not want this, as a container is bound to the life-time of a document.")
    this.stopListening();
  };

  // Creates a container for a given document
  // --------
  // This named constructor is used to create Container instance with the
  // same setup (name, surface provider, etc.) for a another document instance.
  // This is particularly used for creating manipulation sessions.
  //
  this.createContainer = function(doc) {
    // HACK: I want to tie the Containers to the document directly
    // i.e., to make sure that this exact instance is used, not one created by document.get('content').
    // However this seems overengineered... Do we really need the ability to control the node-surface factory?
    // If not, the whole would be obsolete.
    var container = new Container(doc, this.name, this.surfaceProvider.createCopy(doc));
    container.__components = this.__components;
    container.__children = this.__children;
    container.__updater = this.__updater;

    doc.nodes[this.name] = container;
    return container;
  };

  // Returns the first position after a given node.
  // if the node is the last in the container it will set
  this.after = function(nodeId) {
    var comps = this.getNodeComponents(nodeId);
    var lastComp = comps[comps.length-1];
    if (this.__components.length - 1 === lastComp.pos) {
      return [lastComp.pos, lastComp.length];
    } else {
      return [lastComp.pos+1, 0];
    }
  };

  this.first = function(nodeId) {
    var comps = this.getNodeComponents(nodeId);
    return [comps[0].pos, 0];
  };

  this.getLastCoor = function() {
    var lastComp = this.__components[this.__components.length-1];
    return [lastComp.pos, lastComp.length];
  };

  this.toJSON = function() {
    return util.clone(this.__viewNode);
  };
};

Container.prototype = _.extend(new Container.Prototype(), util.Events.Listener);

Object.defineProperties(Container.prototype, {
  "id": {
    get: function() { return this.__viewNode.id; }
  },
  "type": {
    get: function() { return this.__viewNode.type; }
  },
  "nodes": {
    get: function() { return this.__viewNode.nodes; },
    set: function(val) { this.__viewNode.nodes = val; }
  }
});

Container.DefaultNodeSurfaceProvider = require("./node_surface_provider");
Container.ContainerError = ContainerError;

module.exports = Container;

},{"./node_surface_provider":146,"substance-util":268,"underscore":273}],141:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;

var CursorError = errors.define("CursorError");

// Document.Selection.Cursor
// ================
//

var Cursor = function(container, pos, charPos, view) {
  this.container = container;
  this.view = view || 'content';

  this.pos = pos;
  this.charPos = charPos;

  if (pos !== null && !_.isNumber(pos)) {
    throw new CursorError("Illegal argument: expected pos as number");
  }

  if (charPos !== null && !_.isNumber(charPos)) {
    throw new CursorError("Illegal argument: expected charPos as number");
  }
};


Cursor.Prototype = function() {

  this.toJSON = function() {
    return [this.pos, this.charPos];
  };

  this.copy = function() {
    return new Cursor(this.container, this.pos, this.charPos, this.view);
  };

  this.isValid = function() {
    if (this.pos === null || this.charPos === null) return false;
    if (this.pos < 0 || this.charPos < 0) return false;

    // var l = this.container.getLength(this.pos);
    // if (this.charPos >= l) return false;

    return true;
  };

  this.isRightBound = function() {
    return this.charPos === this.container.getLength(this.pos);
  };

  this.isLeftBound = function() {
    return this.charPos === 0;
  };

  this.isEndOfDocument = function() {
    return this.isRightBound() && this.pos === this.container.getLength()-1;
  };

  this.isBeginOfDocument = function() {
    return this.isLeftBound() && this.pos === 0;
  };

  // Return previous node boundary for a given node/character position
  // --------
  //

  this.prevNode = function() {
    if (!this.isLeftBound()) {
      this.charPos = 0;
    } else if (this.pos > 0) {
      this.pos -= 1;
      this.charPos = this.container.getLength(this.pos);
    }
  };

  // Return next node boundary for a given node/character position
  // --------
  //

  this.nextNode = function() {
    if (!this.isRightBound()) {
      this.charPos = this.container.getLength(this.pos);
    } else if (this.pos < this.container.getLength()-1) {
      this.pos += 1;
      this.charPos = 0;
    }
  };

  // Return previous occuring word for a given node/character position
  // --------
  //

  this.prevWord = function() {
    throw new Error("Not implemented");
  };

  // Return next occuring word for a given node/character position
  // --------
  //

  this.nextWord = function() {
    throw new Error("Not implemented");
  };

  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.nextChar = function() {
    // Last char in paragraph
    if (this.isRightBound()) {
      if (this.pos < this.container.getLength()-1) {
        this.pos += 1;
        this.charPos = 0;
      }
    } else {
      this.charPos += 1;
    }
  };


  // Return next char, for a given node/character position
  // --------
  //
  // Useful when navigating over paragraph boundaries

  this.prevChar = function() {
    if (this.charPos<0) throw new CursorError('Invalid char position');

    if (this.isLeftBound()) {
      if (this.pos > 0) {
        this.pos -= 1;
        this.charPos = this.container.getLength(this.pos);
      }
    } else {
      this.charPos -= 1;
    }
  };

  // Move
  // --------
  //
  // Useful helper to find char,word and node boundaries
  //
  //     find('right', 'char');
  //     find('left', 'word');
  //     find('left', 'node');

  this.move = function(direction, granularity) {
    if (direction === "left") {
      if (granularity === "word") {
        this.prevWord();
      } else if (granularity === "char") {
        this.prevChar();
      } else if (granularity === "node") {
        this.prevNode();
      }
    } else {
      if (granularity === "word") {
        this.nextWord();
      } else if (granularity === "char") {
        this.nextChar();
      } else if (granularity === "node") {
        this.nextNode();
      }
    }
  };

  this.set = function(pos, charPos) {
    if (pos !== null && !_.isNumber(pos)) {
      throw new CursorError("Illegal argument: expected pos as number");
    }

    if (charPos !== null && !_.isNumber(charPos)) {
      throw new CursorError("Illegal argument: expected charPos as number");
    }

    if (pos !== null) {
      if(!_.isNumber(pos)) {
        throw new CursorError("Illegal argument: expected pos as number");
      }
      // var n = this.container.getLength();
      // if (pos < 0 || pos >= n) {
      //   throw new CursorError("Invalid node position: " + pos);
      // }

      // var l = this.container.getLength(pos);
      // if (charPos < 0 || charPos > l) {
      //   throw new CursorError("Invalid char position: " + charPos);
      // }
    }

    this.pos = pos;
    this.charPos = charPos;
  };

  this.position = function() {
    return [this.pos, this.charPos];
  };
};

Cursor.prototype = new Cursor.Prototype();

module.exports = Cursor;

},{"substance-util":268,"underscore":273}],142:[function(require,module,exports){
"use strict";

// Substance.Document 0.5.0
// (c) 2010-2013 Michael Aufreiter
// Substance.Document may be freely distributed under the MIT license.
// For all details and documentation:
// http://interior.substance.io/modules/document.html


// Import
// ========

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;
var Data = require("substance-data");
var Operator = require("substance-operator");
var Container = require("./container");

// Module
// ========

var DocumentError = errors.define("DocumentError");

// Document
// --------
//
// A generic model for representing and transforming digital documents

var Document = function(options) {
  Data.Graph.call(this, options.schema, options);

  // Temporary store for file data
  // Used by File Nodes for storing file contents either as blobs or strings
  this.fileData = {};

  this.addIndex("annotations", {
    types: ["annotation"],
    property: "path"
  });

  // Index for supplements
  this.addIndex("files", {
    types: ["file"]
  });


};

// Default Document Schema
// --------

Document.schema = {
  // Static indexes
  "indexes": {
  },

  "types": {
    // Specific type for substance documents, holding all content elements
    "content": {
      "properties": {
      }
    },

    // Note: we switch to 'container' as 'view' is confusing in presence of Application.View
    // TODO: remove 'view'... make sure to have migrations in place
    "container": {
      "properties": {
        "nodes": ["array", "content"]
      }
    },
    "view": {
      "properties": {
        "nodes": ["array", "content"]
      }
    }
  }
};


Document.Prototype = function() {
  var __super__ = util.prototype(this);

  this.getIndex = function(name) {
    return this.indexes[name];
  };

  this.getSchema = function() {
    return this.schema;
  };

  this.create = function(node) {
    __super__.create.call(this, node);
    return this.get(node.id);
  };

  // Delegates to Graph.get but wraps the result in the particular node constructor
  // --------
  //

  this.get = function(path) {
    var node = __super__.get.call(this, path);

    if (!node) return node;

    // Wrap all nodes in an appropriate Node instance
    var nodeSpec = this.nodeTypes[node.type];
    var NodeType = (nodeSpec !== undefined) ? nodeSpec.Model : null;
    if (NodeType && !(node instanceof NodeType)) {
      node = new NodeType(node, this);
      this.nodes[node.id] = node;
    }

    // wrap containers (~views) into Container instances
    // TODO: get rid of the 'view' type... it is misleading in presence of Application.Views.
    if ((node.type === "view" || node.type === "container") && !(node instanceof Container)) {
      node = new Container(this, node.id);
      this.nodes[node.id] = node;
    }

    return node;
  };

  // Serialize to JSON
  // --------
  //
  // The command is converted into a sequence of graph commands

  this.toJSON = function() {
    var res = __super__.toJSON.call(this);
    res.id = this.id;
    return res;
  };

  // Hide elements from provided view
  // --------
  //

  this.hide = function(viewId, nodes) {
    var view = this.get(viewId);

    if (!view) {
      throw new DocumentError("Invalid view id: "+ viewId);
    }

    if (_.isString(nodes)) {
      nodes = [nodes];
    }

    var indexes = [];
    _.each(nodes, function(n) {
      var i = view.nodes.indexOf(n);
      if (i>=0) indexes.push(i);
    }, this);

    if (indexes.length === 0) return;

    indexes = indexes.sort().reverse();
    indexes = _.uniq(indexes);

    var ops = _.map(indexes, function(index) {
      return Operator.ArrayOperation.Delete(index, view.nodes[index]);
    });

    var op = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));

    return this.apply(op);
  };

  // HACK: it is not desired to have the comments managed along with the editorially document updates
  // We need an approach with multiple Chronicles instead.
  this.comment = function(comment) {
    var id = util.uuid();
    comment.id = id;
    comment.type = "comment";
    var op = Operator.ObjectOperation.Create([comment.id], comment);
    return this.__apply__(op);
  };

  this.annotate = function(anno, data) {
    anno.id = anno.type + "_" + util.uuid();
    _.extend(anno, data);
    this.create(anno);
  };

  // Adds nodes to a view
  // --------
  //

  this.show = function(viewId, nodes, target) {
    if (target === undefined) target = -1;

    var view = this.get(viewId);
    if (!view) {
      throw new DocumentError("Invalid view id: " + viewId);
    }

    if (_.isString(nodes)) {
      nodes = [nodes];
    }

    var l = view.nodes.length;

    // target index can be given as negative number (as known from python/ruby)
    target = Math.min(target, l);
    if (target<0) target = Math.max(0, l+target+1);

    var ops = [];
    for (var idx = 0; idx < nodes.length; idx++) {
      var nodeId = nodes[idx];
      if (this.nodes[nodeId] === undefined) {
        throw new DocumentError("Invalid node id: " + nodeId);
      }
      ops.push(Operator.ArrayOperation.Insert(target + idx, nodeId));
    }

    if (ops.length > 0) {
      var update = Operator.ObjectOperation.Update([viewId, "nodes"], Operator.ArrayOperation.Compound(ops));
      return this.apply(update);
    }
  };

  // Start simulation, which conforms to a transaction (think databases)
  // --------
  //

  this.startSimulation = function() {
    // TODO: this should be implemented in a more cleaner and efficient way.
    // Though, for now and sake of simplicity done by creating a copy
    var self = this;
    var simulation = this.clone();
    var ops = [];
    simulation.ops = ops;

    var __apply__ = simulation.apply;

    simulation.apply = function(op) {
      ops.push(op);
      op = __apply__.call(simulation, op);
      return op;
    };

    simulation.save = function(data) {

      // HACK: write back all binaries that have been created on the simulation doc
      // we do that before we apply the operations so that listeners can access the
      // data
      // TODO: when the composer is feature complete we need to refactor the
      // transaction stuff
      _.each(simulation.fileData, function(data, key) {
        self.fileData[key] = data;
      });

      var _ops = [];
      for (var i = 0; i < ops.length; i++) {
        if (ops[i].type !== "compound") {
          _ops.push(ops[i]);
        } else {
          _ops = _ops.concat(ops[i].ops);
        }
      }
      if (_ops.length === 0) {
        // nothing has been recorded
        return;
      }
      var compound = Operator.ObjectOperation.Compound(_ops);
      if (data) compound.data = _.clone(data);
      self.apply(compound);

    };

    simulation.simulation = true;
    return simulation;
  };

  this.fromSnapshot = function(data, options) {
    return Document.fromSnapshot(data, options);
  };

  this.newInstance = function() {
    return new Document({ "schema": this.schema });
  };

  this.uuid = function(type) {
    return type + "_" + util.uuid();
  };

  this.clone = function() {
    var doc = new this.constructor();
    doc.schema = this.schema;
    doc.nodes = {};
    _.each(this.nodes, function(node) {
      doc.nodes[node.id] = node.toJSON();
    });
    // TODO: maybe we need indexes too?
    _.each(doc.indexes, function(index) {
      index.createIndex();
    });
    return doc;
  };
};

Document.Prototype.prototype = Data.Graph.prototype;
Document.prototype = new Document.Prototype();

Document.fromSnapshot = function(data, options) {
  options = options || {};
  options.seed = data;
  return new Document(options);
};


Document.DocumentError = DocumentError;

// Export
// ========

module.exports = Document;

},{"./container":140,"substance-data":126,"substance-operator":250,"substance-util":268,"underscore":273}],143:[function(require,module,exports){
"use strict";

var NodeViewFactory = require("./node_view_factory");
var _ = require("underscore");

var DocumentRenderer = function(document, viewName, options) {
  NodeViewFactory.call(this, document);

  this.viewName = viewName;
  this.options = options || {};
  this.nodeViews = {};
};

DocumentRenderer.Prototype = function() {

  var __super__ = NodeViewFactory.prototype;

  // Note: it is important to recreate a view to be able to dispose child views
  // and not having to reuse all the time.
  this.createView = function(node, overwrite) {
    if (this.nodeViews[node.id] && !overwrite) {
      return this.nodeViews[node.id];
    } else if (this.nodeViews[node.id] && overwrite) {
      this.nodeViews[node.id].dispose();
    }
    var nodeView = __super__.createView.call(this, node);
    this.nodeViews[node.id] = nodeView;
    return nodeView;
  };

  this.getView = function(nodeId) {
    if (this.nodeViews[nodeId]) {
      return this.nodeViews[nodeId];
    }
    var node = this.document.get(nodeId);
    return this.createView(node);
  };

  // Render it
  // --------
  //

  this.render = function() {
    _.each(this.nodeViews, function(nodeView) {
      nodeView.dispose();
    });

    var frag = window.document.createDocumentFragment();

    var nodeIds = this.document.get(this.viewName).nodes;
    _.each(nodeIds, function(id) {
      var node = this.document.get(id);
      var view = this.createView(node);
      frag.appendChild(view.render().el);

      // Lets you customize the resulting DOM sticking on the el element
      // Example: Lens focus controls
      if (this.options.afterRender) {
        this.options.afterRender(this.document, view);
      }
    }, this);

    return frag;
  };

};

DocumentRenderer.Prototype.prototype = NodeViewFactory.prototype;
DocumentRenderer.prototype = new DocumentRenderer.Prototype();

module.exports = DocumentRenderer;

},{"./node_view_factory":147,"underscore":273}],144:[function(require,module,exports){
"use strict";

var Annotator = require("./annotator");
var Selection = require("./selection");

// DocumentSession
// ========
// A document session bundles
// - `document`: a Document instance,
// - `container`: a Container instance which manages a specific document view node
// - `annotator`: an Annotator instance which provides an API to manage annotations
// - `selection`: a Selection instance which represents a current selection state
//
// Note: as the Container is the most complex instance (e.g., it depends on a SurfaceProvider)
// you have to create it and pass it as an argument to create a session.
//
var DocumentSession = function(container) {
  this.document = container.document;
  this.container = container;
  this.annotator = new Annotator(this.document);
  this.selection = new Selection(this.container);
};

DocumentSession.Prototype = function() {

  // TODO: this is used *very* often and is implemented *very* naive.
  // There's a great potential for optimization here
  this.startSimulation = function() {
    var doc = this.document.startSimulation();
    var annotator = new Annotator(doc);
    var container = this.container.createContainer(doc);
    var sel = new Selection(container, this.selection);
    // Note: we save the old and new selection along with
    // the operation created by the simulation
    var data = {};
    if (!sel.isNull()) {
      data["before"] = {
        "container": this.container.name,
        "sel": sel.toJSON()
      };
    }
    return {
      document: doc,
      view: container.name,
      selection: sel,
      annotator: annotator,
      container: container,
      dispose: function() {
        // TODO: remove... nothing to dispose...
      },
      save: function() {
        data["after"] = {
          "container": this.container.name,
          "sel": sel.toJSON()
        };
        doc.save(data);
        this.dispose();
      }
    };
  };

  this.dispose = function(){
    // TODO: remove... nothing to dispose...
  };

};
DocumentSession.prototype = new DocumentSession.Prototype();

Object.defineProperties(DocumentSession.prototype, {
  "view": {
    get: function() {
      return this.container.name;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  }
});

module.exports = DocumentSession;

},{"./annotator":137,"./selection":148}],145:[function(require,module,exports){
"use strict";

function NodeSelection(node, nodeComponents, ranges) {
  this.node = node;
  this.nodeComponents = nodeComponents;
  this.ranges = ranges;
}

NodeSelection.Prototype = function() {

  // Note: this checks if a node is fully selected via a heuristic:
  // if the selection has enough components to cover the full node and the first and last components
  // are fully selected, then the node is considered as fully selected.
  this.isFull = function() {
    if (this.ranges.length === this.nodeComponents.length &&
      this.ranges[0].isFull() && this.ranges[this.ranges.length-1].isFull()) {
      return true;
    }
    return false;
  };

  this.isPartial = function() {
    return !this.isFull();
  };

};
NodeSelection.prototype = new NodeSelection.Prototype();

module.exports = NodeSelection;

},{}],146:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");

var NodeSurfaceProvider = function(doc) {
  this.document = doc;
  this.nodeTypes = this.document.nodeTypes;
  this.nodeSurfaces = {};

  this.listenTo(this.document, "operation:applied", this.onGraphUpdate);
};

NodeSurfaceProvider.Prototype = function() {

  // ATTENTION: the caching here needs invalidation!
  // I.e., what happens if you delete a node and create an instance with the same id?
  // then the cache must be invalidated and deliver a new node surface on next request.
  this.onGraphUpdate = function(op) {
    if (op.type === "delete") {
      delete this.nodeSurfaces[op.path[0]];
    }
  }

  this.getNodeSurface = function(node_or_nodeId) {
    var nodeId, node;
    if (_.isString(node_or_nodeId)) {
      nodeId = node_or_nodeId;
    } else {
      node = node_or_nodeId;
      nodeId = node.id;
    }


    if (!this.nodeSurfaces[nodeId]) {
      node = node || this.document.get(nodeId);
      this.nodeSurfaces[nodeId] = this.createNodeSurface(node);
    }

    return this.nodeSurfaces[nodeId];
  };

  this.createNodeSurface = function(node) {
      var nodeSurface;
      if (!node) return null;

      var NodeSurface = this.nodeTypes[node.type].Surface;
      if (NodeSurface) {
        // Note: passing this provider ot allow nesting/delegation
        nodeSurface = new NodeSurface(node, this);
      } else {
        // console.log("No surface available for node type", node.type,". Using Stub.");
        nodeSurface = new NodeSurfaceProvider.EmptySurface(node);
      }

      return nodeSurface;
  };

  // Creates a copy of this provider for a given document.
  // --------
  // This is as a named constructor for establishing a manipulation simulation session.
  //
  this.createCopy = function(document) {
    // Note: As this method is mainly used to implement document simulations,
    //   we must not copy the node surface instances as they contain a reference
    //   to the actual node.
    return new NodeSurfaceProvider(document);
  };

};
NodeSurfaceProvider.Prototype.prototype = util.Events;
NodeSurfaceProvider.prototype = new NodeSurfaceProvider.Prototype();

NodeSurfaceProvider.EmptySurface = function(node) {
  this.node = node;
  this.view = null;
  this.components = [];
};

module.exports = NodeSurfaceProvider;

},{"substance-util":268,"underscore":273}],147:[function(require,module,exports){
"use strict";

var NodeViewFactory = function(doc) {
  this.document = doc;
  this.nodeTypes = doc.nodeTypes;
};

NodeViewFactory.Prototype = function() {

  // Create a node view
  // --------
  //

  this.createView = function(node, options) {
    var NodeView = this.nodeTypes[node.type].View;
    if (!NodeView) {
      throw new Error('Node type "'+node.type+'" not supported');
    }
    // Note: passing the renderer to the node views
    // to allow creation of nested views
    var nodeView = new NodeView(node, this, options);

    // we connect the listener here to avoid to pass the document itself into the nodeView
    nodeView.listenTo(this.document, "operation:applied", nodeView.onGraphUpdate);

    return nodeView;
  };

};

NodeViewFactory.prototype = new NodeViewFactory.Prototype();

module.exports = NodeViewFactory;

},{}],148:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");
var errors = util.errors;
var Cursor = require("./cursor");
var ComponentSelection = require("./component_selection");
var NodeSelection = require("./node_selection");

var SelectionError = errors.define("SelectionError");


// Document.Selection
// ================
//
// A selection refers to a sub-fragment of a Substance.Document. It holds
// start/end positions for component and character offsets as well as a direction.
//
//     {
//       start: [COMP_POS, CHAR_POS]
//       end: [COMP_POS, CHAR_POS]
//       direction: "left"|"right"
//     }
//
// COMP_POS: Component offset in the document (0 = first component)
// CHAR_POS: Character offset within a component (0 = first char)
//
// Example
// --------
//
// Consider a document `doc` consisting of 3 paragraphs.
//
//           0 1 2 3 4 5 6
//     -------------------
//     P0  | a b c d e f g
//     -------------------
//     P1: | h i j k l m n
//     -------------------
//     P2: | o p q r s t u
//
//
// Create a selection operating on that document.
//     var sel = new Substance.Document.Selection(container);
//
//     sel.set({
//       start: [0, 4],
//       end: [1, 2],
//       direction: "right"
//     });
//
// This call results in the following selection:
//
//           0 1 2 3 4 5 6
//     -------------------
//     P0  | a b c d > > >
//     -------------------
//     P1: | > > > k l m n
//     -------------------
//     P2: | o p q r s t u
//

var Selection = function(container, selection) {
  this.container = container;

  this.start = null;
  this.__cursor = new Cursor(container, null, null);

  if (selection) this.set(selection);
};

Selection.Prototype = function() {

  // Get copy of selection
  // --------
  //

  this.copy = function() {
    var copy = new Selection(this.container);
    if (!this.isNull()) copy.set(this);
    return copy;
  };


  // Set selection
  // --------
  //
  // sel: an instanceof Selection
  //      or a document range `{start: [pos, charPos], end: [pos, charPos]}`
  //      or a document position `[pos, charPos]`

  this.set = function(sel, options) {
    if (sel === null) {
      return this.clear();
    }

    var cursor = this.__cursor;
    if (sel instanceof Selection) {
      if (sel.isNull()) {
        this.clear();
        return;
      } else {
        this.start = _.clone(sel.start);
        cursor.set(sel.__cursor.pos, sel.__cursor.charPos);
      }
    } else if (_.isArray(sel)) {
      this.start = _.clone(sel);
      cursor.set(sel[0], sel[1]);
    } else {
      this.start = _.clone(sel.start);
      cursor.set(sel.end[0], sel.end[1]);
    }
    var start = this.start;

    // being hysterical about the integrity of selections
    // var n = this.container.getLength();
    // if (start[0] < 0 || start[0] >= n) {
    //   throw new SelectionError("Invalid component position: " + start[0]);
    // }
    // var l = this.container.getLength(start[0]);
    // if (start[1] < 0 || start[1] > l) {
    //   throw new SelectionError("Invalid char position: " + start[1]);
    // }

    this.trigger('selection:changed', this.range(), options);
    return this;
  };

  this.clear = function(options) {
    this.start = null;
    this.__cursor.set(null, null);
    this.trigger('selection:changed', null, options);
  };

  this.range = function() {
    if (this.isNull()) return null;

    var pos1 = this.start;
    var pos2 = this.__cursor.position();

    if (this.isReverse()) {
      return {
        start: pos2,
        end: pos1
      };
    } else {
      return {
        start: pos1,
        end: pos2
      };
    }
  };

  this.isReverse = function() {
    var cursor = this.__cursor;
    return (cursor.pos < this.start[0]) || (cursor.pos === this.start[0] && cursor.charPos < this.start[1]);
  };

  // Set cursor to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.setCursor = function(pos) {
    this.__cursor.set(pos[0], pos[1]);
    this.start = pos;
    return this;
  };

  // Get the selection's  cursor
  // --------
  //

  this.getCursor = function() {
    return this.__cursor.copy();
  };

  this.getCursorPosition = function() {
    return [this.__cursor.pos, this.__cursor.charPos];
  };

  // Fully selects a the node with the given id
  // --------
  //

  this.selectNode = function(nodeId) {
    var components = this.container.getNodeComponents(nodeId);

    var first = components[0];
    var last = components[components.length-1];

    var l = this.container.getLength(last.pos);
    this.set({
      start: [first.pos, 0],
      end: [last.pos, l]
    });
  };

  // Get predecessor node of a given node pos
  // --------
  //

  this.getPredecessor = function() {
    // NOTE: this can not be fixed as now the container can have components that are not nodes
    throw new Error("Not supported anymore");
  };

  // Get successor node of a given node pos
  // --------
  //

  this.getSuccessor = function() {
    // Can not be fixed.
    throw new Error("Not supported anymore");
  };

  // Check if the given position has a successor
  // --------
  //

  // TODO: is this really necessary? ~> document.hasPredecessor
  this.hasPredecessor = function(pos) {
    return pos > 0;
  };

  // Check if the given node has a successor
  // --------
  //

  // TODO: is this really necessary? ~> document.hasSuccessor
  this.hasSuccessor = function(pos) {
    var l = this.container.getLength();
    return pos < l-1;
  };


  // Collapses the selection into a given direction
  // --------
  //

  this.collapse = function(direction, options) {
    if (direction !== "right" && direction !== "left" && direction !== "start" && direction !== "cursor") {
      throw new SelectionError("Invalid direction: " + direction);
    }

    if (this.isCollapsed() || this.isNull()) return;

    if (direction === "start") {
      this.__cursor.set(this.start[0], this.start[1]);

    } else if (direction === "cursor") {
      this.start[0] = this.__cursor.pos;
      this.start[1] = this.__cursor.charPos;

    } else {
      var range = this.range();

      if (this.isReverse()) {
        if (direction === 'left') {
          this.start = range.start;
        } else {
          this.__cursor.set(range.end[0], range.end[1]);
        }
      } else {
        if (direction === 'left') {
          this.__cursor.set(range.start[0], range.start[1]);
        } else {
          this.start = range.end;
        }
      }
    }

    this.trigger('selection:changed', this.range(), options);
  };

  // move selection to position
  // --------
  //
  // Convenience for placing the single cusor where start=end

  this.move = function(direction, granularity, options) {

    // moving an expanded selection by char collapses the selection
    // and sets the cursor to the boundary of the direction
    if (!this.isCollapsed() && granularity === "char") {
      this.collapse(direction);
    }
    // otherwise the cursor gets moved (together with start)
    else {
      this.__cursor.move(direction, granularity);
      this.start = this.__cursor.position();
    }

    this.trigger('selection:changed', this.range(), options);
  };

  // Expand current selection
  // ---------
  //
  // Selections keep the direction as a state
  // They can either be right-bound or left-bound
  //

  this.expand = function(direction, granularity, options) {
    // expanding is done by moving the cursor
    this.__cursor.move(direction, granularity);

    this.trigger('selection:changed', this.range(), options);
  };

  // JSON serialization
  // --------
  //

  this.toJSON = function() {
    var data = null;

    if (!this.isNull()) {
      if (this.isCollapsed()) {
        data = this.__cursor.toJSON();
      } else {
        data = {
          start: _.clone(this.start),
          end: this.__cursor.toJSON()
        };
      }
    }

    return data;
  };


  // Derives Range objects for the selection
  // --------
  //

  this.getRanges = function() {
    if (this.isNull()) return [];

    var ranges = [];
    var sel = this.range();

    for (var i = sel.start[0]; i <= sel.end[0]; i++) {
      var startChar = 0;
      var endChar = null;

      // in the first coponent search only in the trailing part
      if (i === sel.start[0]) {
        startChar = sel.start[1];
      }

      // in the last component search only in the leading part
      if (i === sel.end[0]) {
        endChar = sel.end[1];
      }

      if (!_.isNumber(endChar)) {
        endChar = this.container.getLength(i);
      }

      var component = this.container.getComponent(i);
      ranges.push(new ComponentSelection(component, startChar, endChar));
    }
    return ranges;
  };

  // Gets ranges grouped by nodes
  // ----

  this.getNodeSelections = function() {
    if (this.isNull()) return [];

    var nodeSelections = [];
    var sel = this.range();
    var current = null;

    for (var pos = sel.start[0]; pos <= sel.end[0]; pos++) {

      var component = this.container.getComponent(pos);
      var startChar = 0;
      var endChar = component.length;

      if (!current || current.node !== component.root) {
        var node = component.root;
        var nodeComponents = this.container.getNodeComponents(node.id);
        current = new NodeSelection(node, nodeComponents, []);
        nodeSelections.push(current);
      }

      // the first component has a specific startChar
      if (pos === sel.start[0]) {
        startChar = sel.start[1];
      }
      // the last node has a specific endChar
      else if (pos === sel.end[0]) {
        endChar = sel.end[1];
      }

      current.ranges.push(new ComponentSelection(component, startChar, endChar));
    }

    return nodeSelections;
  };

  // Returns start component offset
  // --------
  //

  this.startPos = function() {
    return this.isReverse() ? this.__cursor.pos : this.start[0];
  };

  // Returns end component offset
  // --------
  //

  this.endPos = function() {
    return this.isReverse() ? this.start[0] : this.__cursor.pos;
  };

  // Returns the the node id a given component position belongs to
  // --------
  //

  this.getNodeByComponentPos = function(pos) {
    return this.container.getComponent(pos).root;
  };

  // Get root node of first selected component
  // --------
  //

  this.getStartNode = function() {
    return this.getNodeByComponentPos(this.start[0]);
  };

  // Get root node of last selected component
  // --------
  //

  this.getEndNode = function() {
    return this.getNodeByComponentPos(this.end[0]);
  };

  // Get corresponding root nodes for all selected components
  // --------
  //

  this.getNodes = function() {
    if (this.isNull()) return [];

    var startPos = this.startPos();
    var endPos = this.endPos();
    var nodes = [];
    for (var i = startPos; i <= endPos; i++) {
      nodes.push(this.getNodeByComponentPos(i));
    }
    return nodes;
  };

  // Returns start char offset within a component
  // --------
  //

  this.startChar = function() {
    return this.isReverse() ? this.__cursor.charPos : this.start[1];
  };

  // Returns end char offset within a component
  // --------
  //

  this.endChar = function() {
    return this.isReverse() ? this.start[1] : this.__cursor.charPos;
  };

  // No selection
  // --------
  //
  // Returns true if there's just a single cursor not a selection spanning
  // over 1+ characters

  this.isNull = function() {
    return this.start === null;
  };


  // Collapsed
  // --------
  //
  // Returns true if there's just a single cursor not a selection spanning
  // over 1+ characters

  this.isCollapsed = function() {
    return !this.isNull() && this.start[0] === this.__cursor.pos && this.start[1] === this.__cursor.charPos;
  };


  // Multinode
  // --------
  //
  // Returns true if the selection refers to multiple nodes

  this.hasMultipleNodes = function() {
    return !this.isNull() && (this.startPos() !== this.endPos());
  };

  // Get Text
  // --------
  //
  // Get text of current selection

  this.getText = function() {
    // TODO: make work for multinode selections too
    if (this.isNull() || this.hasMultipleNodes()) return "";

    var component = this.container.getComponent(this.start[0]); //.node;

    var content = this.container.document.get(component.path);
    if (content !== undefined) {
      return content.substring(this.startChar(), this.endChar());
    } else {
      console.error("FIXME: expecting text node but got: ", node);
      return ""
    }
  };
};

Selection.Prototype.prototype = util.Events;
Selection.prototype = new Selection.Prototype();

Object.defineProperties(Selection.prototype, {
  cursor: {
    get: function() {
      return this.__cursor.copy();
    },
    set: function() { throw "immutable property"; }
  }
});

Selection.SelectionError = SelectionError;

// Export
// ========

module.exports = Selection;

},{"./component_selection":139,"./cursor":141,"./node_selection":145,"substance-util":268,"underscore":273}],149:[function(require,module,exports){
"use strict";

module.exports = {
  "node": require("./src/node"),
  "text": require("./src/text"),
  "document": require("./src/document"),
  "container": require("./src/container"),
  "heading": require("./src/heading"),
  "blockquote": require("./src/blockquote"),
  "code_block": require("./src/code_block"),

  "figure": require("./src/figure"),
  "contributor": require("./src/contributor"),
  "interview_subject": require("./src/interview_subject"),
  "cover": require("./src/cover"),
  "citation": require("./src/citation"),
  "annotation": require("./src/annotation"),
  "emphasis": require("./src/emphasis"),
  "strong": require("./src/strong"),
  "subscript": require("./src/subscript"),
  "superscript": require("./src/superscript"),
  "code": require("./src/code"),
  "web_resource": require("./src/web_resource"),
  "video": require("./src/video"),
  "audio": require("./src/audio"),
  "web_page": require("./src/web_page"),
  "list_item": require("./src/list_item"),

  "issue": require("./src/issue"),
  "remark": require("./src/remark"),
  "error": require("./src/error"),
  "file": require("./src/file"),
  "license": require("./src/license"),

  "publication_info": require("./src/publication_info"),

  "figure_reference": require("./src/figure_reference"),
  "citation_reference": require("./src/citation_reference"),
  "cross_reference": require("./src/cross_reference"),
  "remark_reference": require("./src/remark_reference"),
  "error_reference": require("./src/error_reference"),

  // Multi-Node annotation support
  "multi_annotation": require("./src/multi_annotation"),
  "annotation_fragment": require("./src/annotation_fragment"),

  // Archivist nodes
  "location_reference": require("./src/location_reference"),
  "person_reference": require("./src/person_reference"),
  "definition_reference": require("./src/definition_reference"),
  "subject_reference": require("./src/subject_reference")
};
},{"./src/annotation":152,"./src/annotation_fragment":155,"./src/audio":157,"./src/blockquote":160,"./src/citation":163,"./src/citation_reference":165,"./src/code":167,"./src/code_block":170,"./src/container":172,"./src/contributor":175,"./src/cover":178,"./src/cross_reference":180,"./src/definition_reference":182,"./src/document":184,"./src/emphasis":186,"./src/error":189,"./src/error_reference":191,"./src/figure":193,"./src/figure_reference":195,"./src/file":197,"./src/heading":200,"./src/interview_subject":201,"./src/issue":204,"./src/license":207,"./src/list_item":209,"./src/location_reference":212,"./src/multi_annotation":214,"./src/node":216,"./src/person_reference":221,"./src/publication_info":223,"./src/remark":226,"./src/remark_reference":229,"./src/strong":231,"./src/subject_reference":233,"./src/subscript":235,"./src/superscript":237,"./src/text":239,"./src/video":243,"./src/web_page":245,"./src/web_resource":247}],150:[function(require,module,exports){
"use strict";

var DocumentNode = require('../node/node');
var _ = require('underscore');

var Annotation = function(node, document) {
  DocumentNode.call(this, node, document);
};

// Type definition
// --------

Annotation.type = {
  "id": "annotation",
  "properties": {
    "path": ["array", "string"], // -> e.g. ["text_1", "content"]
    "range": "object"
  }
};


// This is used for the auto-generated docs
// -----------------
//

Annotation.description = {
  "name": "Annotation",
  "remarks": [
    "Abstract type for all available annotations"
  ],
  "properties": {
    "path": "References node and property in the graph.",
    "range": "Tuple describing start and end character offset."
  }
};


// Example Annotation
// -----------------
//

Annotation.example = {
  "type": "emphasis",
  "id": "emphasis_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

Annotation.Prototype = function() {

  this.getContent = function() {
    var content = this.document.get(this.path);
    if (content) {
      var range = this.range;
      return content.substring(range[0], range[1]);
    } else {
      console.error("FIXME: this annotation references a deleted node", this, this.path);
      return "N/A"
    }
  };
};

Annotation.Prototype.prototype = DocumentNode.prototype;
Annotation.prototype = new Annotation.Prototype();
Annotation.prototype.constructor = Annotation;

Annotation.prototype.defineProperties();

module.exports = Annotation;

},{"../node/node":217,"underscore":273}],151:[function(require,module,exports){
"use strict";

// EXPERIMENTAL
// Together with inline-elements, this needs to refactored in future.
// In Lens we have managed to render annotations using the view factory.
// This way, we can provide custom implementations for
// different annotations:
// - Text annotations: as it is currently; provides a container element which
//   is filled by the fragmenter
// - Inline elements: are not nested and are rendered without descending

var AnnotationView = function(node, viewFactory) {
  this.node = node;
  this.viewFactory = viewFactory;
  this.el = this.createElement();
};

AnnotationView.Prototype = function() {

  this.elementType = 'span';

  this.createElement = function() {
    var el = window.document.createElement(this.elementType);
    el.dataset.id = this.node.id;
    el.classList.add('annotation');
    el.classList.add(this.node.type);
    return el;
  };

  this.render = function() {
    return this;
  };

  this.appendChild = function(content) {
    this.el.appendChild(content);
  };

};

AnnotationView.prototype = new AnnotationView.Prototype();
AnnotationView.prototype.constructor = AnnotationView;

module.exports = AnnotationView;

},{}],152:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./annotation"),
  View: require('./annotation_view')
};

},{"./annotation":150,"./annotation_view":151}],153:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var AnnotationFragment = function(node, document) {
  Annotation.call(this, node, document);
};

AnnotationFragment.type = {
  "id": "annotation_fragment",
  "parent": "annotation",
  "properties": {
    "annotation_id": "string",
    "fragment_number": "number"
  }
};

AnnotationFragment.Prototype = function() {
  // internal nodes do not get serialized
  this.isInternal = true;

  this.isFirst = function() {
    return this.properties.fragment_number === 0;
  };

  this.isLast = function() {
    return this.properties.fragment_number === this.getAnnotation().numberOfFragments - 1;
  };

  this.getAnnotation = function() {
    if (!this.annotation) {
      this.annotation = this.document.get(this.annotation_id);
    }
    return this.annotation;
  };
};

AnnotationFragment.Prototype.prototype = Annotation.prototype;
AnnotationFragment.prototype = new AnnotationFragment.Prototype();
AnnotationFragment.prototype.constructor = AnnotationFragment;

AnnotationFragment.prototype.defineProperties();

module.exports = AnnotationFragment;

},{"../annotation/annotation":150}],154:[function(require,module,exports){
"use strict";

var $$ = require("substance-application").$$;

var AnnotationView = require('../annotation/annotation_view');

var AnnotationFragmentView = function() {
  AnnotationView.apply(this, arguments);

  this.content = window.document.createElement('span');
};

AnnotationFragmentView.Prototype = function() {
  var __super__ = AnnotationView.prototype;

  this.createElement = function() {
    var el = __super__.createElement.call(this);
    var annotation = this.node.document.get(this.node.annotation_id);
    el.classList.add(annotation.type);
    el.classList.add(this.node.id);
    el.dataset.annotationId = annotation.id;
    return el;
  };

  this.render = function() {
    this.el.innerHTML = "";
    this.el.appendChild(this.content);
    return this;
  };

  this.appendChild = function(child) {
    this.content.appendChild(child);
  };
};
AnnotationFragmentView.Prototype.prototype = AnnotationView.prototype;
AnnotationFragmentView.prototype = new AnnotationFragmentView.Prototype();
AnnotationFragmentView.Prototype.constructor = AnnotationFragmentView;

module.exports = AnnotationFragmentView;

},{"../annotation/annotation_view":151,"substance-application":10}],155:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./annotation_fragment"),
  View: require('./annotation_fragment_view')
};

},{"./annotation_fragment":153,"./annotation_fragment_view":154}],156:[function(require,module,exports){
"use strict";

var DocumentNode = require("../node/node");
var _ = require("underscore");

var Audio = function(node, document) {
  DocumentNode.call(this, node, document);
};

Audio.type = {
  "id": "audio",
  "parent": "content",
  "properties": {
    "files": ["array", "file"],
    "caption": "paragraph"
  }
};

Audio.description = {
  "name": "Audio",
  "remarks": [
    "A web video."
  ],
  "properties": {
    "files": "An array of different video files (MP3, WAV)",
    "caption": "A reference to a paragraph that describes the audio piece",
  }
};

// Example Audio
// -----------------
//

Audio.example = {
  "id": "audio",
  "label": "Audio",
  "files": ["song1.mp3"],
  "caption": "text_1"
};

Audio.Prototype = function() {

  this.hasCaption = function() {
    return (!!this.properties.caption);
  };

  this.getCaption = function() {
    if (this.properties.caption) return this.document.get(this.properties.caption);
  };

  this.getAudioFiles = function() {
    return _.map(this.properties.files, function(audioId) {
      return this.document.get(audioId);
    }, this);
  };
};

Audio.Prototype.prototype = DocumentNode.prototype;
Audio.prototype = new Audio.Prototype();
Audio.prototype.constructor = Audio;

Audio.prototype.defineProperties();


module.exports = Audio;

},{"../node/node":217,"underscore":273}],157:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./audio')
};

},{"./audio":156}],158:[function(require,module,exports){
"use strict";

var Text = require("../text/text_node");

var Blockquote = function(node, document) {
  Text.call(this, node, document);
};

// Type definition
// -----------------
//

Blockquote.type = {
  "id": "blockquote",
  "parent": "content",
  "properties": {
    "source_id": "string",
    "content": "string",
    "level": "number"
  }
};

// Example Blockquote
// -----------------
//

Blockquote.example = {
  "type": "blockquote",
  "id": "blockquote_1",
  "content": "Introduction"
};

// This is used for the auto-generated docs
// -----------------
//

Blockquote.description = {
  "name": "Blockquote",
  "remarks": [
    "Denotes a blockquote."
  ],
  "properties": {
    "content": "Blockquote content"
  }
};

Blockquote.Prototype = function() {
  this.splitInto = 'paragraph';
};

Blockquote.Prototype.prototype = Text.prototype;
Blockquote.prototype = new Blockquote.Prototype();
Blockquote.prototype.constructor = Blockquote;

Blockquote.prototype.defineProperties();

module.exports = Blockquote;

},{"../text/text_node":240}],159:[function(require,module,exports){
"use strict";

var TextView = require('../text/text_view');

// Substance.Blockquote.View
// ==========================================================================

var BlockquoteView = function(node) {
  TextView.call(this, node);
  this.$el.addClass('blockquote');
};

BlockquoteView.Prototype = function() {
  var __super__ = TextView.prototype;

  this.onNodeUpdate = function(op) {
    __super__.onNodeUpdate.call(this, op);
  };
};

BlockquoteView.Prototype.prototype = TextView.prototype;
BlockquoteView.prototype = new BlockquoteView.Prototype();

module.exports = BlockquoteView;

},{"../text/text_view":242}],160:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./blockquote"),
  View: require("./blockquote_view"),
  Surface: require("../text/text_surface")
};

},{"../text/text_surface":241,"./blockquote":158,"./blockquote_view":159}],161:[function(require,module,exports){
var DocumentNode = require('../node/node');

// Citation
// -----------------
//

var Citation = function(node, document) {
  DocumentNode.call(this, node, document);
};

// Type definition
// -----------------
//

Citation.type = {
  "id": "article_citation", // type name
  "parent": "content",
  "properties": {
    "source_id": "string",
    "title": "string",
    "label": "string",
    "authors": ["array", "string"],
    "doi": "string",
    "source": "string",
    "volume": "string",
    "publisher_name": "string",
    "publisher_location": "string",
    "fpage": "string",
    "lpage": "string",
    "year": "string",
    "citation_urls": ["array", "string"]
  }
};

Citation.description = {
  "name": "Citation",
  "remarks": [
    "A journal citation.",
    "This element can be used to describe all kinds of citations."
  ],
  "properties": {
    "title": "The article's title",
    "label": "Optional label (could be a number for instance)",
    "doi": "DOI reference",
    "source": "Usually the journal name",
    "volume": "Issue number",
    "publisher_name": "Publisher Name",
    "publisher_location": "Publisher Location",
    "fpage": "First page",
    "lpage": "Last page",
    "year": "The year of publication",
    "citation_urls": "A list of links for accessing the article on the web"
  }
};

// Example Citation
// -----------------
//

Citation.example = {
  "id": "article_nature08160",
  "type": "article_citation",
  "label": "5",
  "title": "The genome of the blood fluke Schistosoma mansoni",
  "authors": [
    "M Berriman",
    "BJ Haas",
    "PT LoVerde"
  ],
  "doi": "http://dx.doi.org/10.1038/nature08160",
  "source": "Nature",
  "volume": "460",
  "fpage": "352",
  "lpage": "8",
  "year": "1984",
  "citation_urls": [
    "http://www.ncbi.nlm.nih.gov/pubmed/19606141"
  ]
};


Citation.Prototype = function() {
  // Returns the citation URLs if available
  // Falls back to the DOI url
  // Always returns an array;
  this.urls = function() {
    return this.properties.citation_urls.length > 0 ? this.properties.citation_urls
                                                    : [this.properties.doi];
  };
};

Citation.Prototype.prototype = DocumentNode.prototype;
Citation.prototype = new Citation.Prototype();
Citation.prototype.constructor = Citation;

// Generate getters
// --------

Citation.prototype.defineProperties();

// Property aliases
// ----

Object.defineProperties(Citation.prototype, {
  "header": {
    get: function() { return this.properties.title; },
    set: function() { throw new Error("This is a read-only alias property."); }
  }
});

module.exports = Citation;

},{"../node/node":217}],162:[function(require,module,exports){
"use strict";

var NodeView = require("../node").View;
var TextView = require("../text").View;

var $$ = require("substance-application").$$;

// Citation.View
// ==========================================================================


var CitationView = function(node) {
  NodeView.call(this, node);

  this.$el.attr({id: node.id});
  this.$el.addClass('citation');
};


CitationView.Prototype = function() {

  this.render = function() {
    NodeView.prototype.render.call(this);

    var frag = document.createDocumentFragment(),
        node = this.node;

    // Note: delegating to TextView to inherit annotation support
    this.titleView = new TextView(this.node, this.viewFactory, {property: "title"});
    frag.appendChild(this.titleView.render().el);

    // Resource body
    // --------
    //
    // Wraps all resource details

    var bodyEl = $$('.resource-body');

    // Add Authors
    // -------

    this.authorEls = [];
    var authorsEl = $$('.authors');
    for (var i = 0; i < node.authors.length; i++) {
      var author = node.authors[i];
      this.authorEls.push($$('span.author', {
        text: author
      }));
      authorsEl.appendChild(this.authorEls[i]);
      authorsEl.appendChild(document.createTextNode(" "));
    }
    bodyEl.appendChild(authorsEl);

    // Add Source
    // -------
    var source = [];

    if (node.source && node.volume) {
      source.push([node.source, node.volume].join(', ')+": ");
    }

    if (node.fpage && node.lpage) {
      source.push([node.fpage, node.lpage].join('-')+", ");
    }

    if (node.publisher_name && node.publisher_location) {
      source.push([node.publisher_name, node.publisher_location].join(', ')+", ");
    }

    if (node.year) {
      source.push(node.year);
    }

    this.sourceEl = $$('.source', {
      html: source.join(''),
    });
    bodyEl.appendChild(this.sourceEl);

    // Add DOI (if available)
    // -------

    if (node.doi) {
      this.doiEl = $$('.doi', {
        children: [
          $$('b', {text: "DOI: "}),
          $$('a', {
            href: node.doi,
            target: "_new",
            text: node.doi
          })
        ]
      });
      bodyEl.appendChild(this.doiEl);
    }

    frag.appendChild(bodyEl);

    this.content.appendChild(frag);

    return this;
  };

  this.dispose = function() {
    NodeView.dispose.call(this);
    this.titleView.dispose();
  };
};

CitationView.Prototype.prototype = NodeView.prototype;
CitationView.prototype = new CitationView.Prototype();
CitationView.prototype.constructor = CitationView;

module.exports = CitationView;

},{"../node":216,"../text":239,"substance-application":10}],163:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./citation'),
  View: require('./citation_view')
};

},{"./citation":161,"./citation_view":162}],164:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var CitationReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

CitationReference.type = {
  "id": "citation_reference",
  "parent": "annotation",
  "properties": {
    "target": "citation"
  }
};

// This is used for the auto-generated docs
// -----------------
//

CitationReference.description = {
  "name": "CitationReference",
  "remarks": [
    "References a range in a text-ish node and references a citation."
  ],
  "properties": {
  }
};


// Example CitationReference annotation
// -----------------
//

CitationReference.example = {
  "type": "citation_reference_1",
  "id": "citation_reference_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

CitationReference.Prototype = function() {};

CitationReference.Prototype.prototype = Annotation.prototype;
CitationReference.prototype = new CitationReference.Prototype();
CitationReference.prototype.constructor = CitationReference;

CitationReference.prototype.defineProperties();

module.exports = CitationReference;

},{"../annotation/annotation":150}],165:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./citation_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./citation_reference":164}],166:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var Code = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

Code.type = {
  "id": "code",
  "parent": "annotation",
  "properties": {
  }
};


// This is used for the auto-generated docs
// -----------------
//

Code.description = {
  "name": "Code",
  "remarks": [
    "References a range in a text-ish node and tags it as subscript"
  ],
  "properties": {
  }
};


// Example Code annotation
// -----------------
//

Code.example = {
  "type": "code_1",
  "id": "code_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

Code.Prototype = function() {};

Code.Prototype.prototype = Annotation.prototype;
Code.prototype = new Code.Prototype();
Code.prototype.constructor = Code;

module.exports = Code;

},{"../annotation/annotation":150}],167:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./code")
};

},{"./code":166}],168:[function(require,module,exports){
"use strict";

var Text = require("../text/text_node");

var CodeBlock = function(node, document) {
  Text.call(this, node, document);
};

// Type definition
// --------

CodeBlock.type = {
  "id": "code_block",
  "parent": "content",
  "properties": {
    "source_id": "string",
    "content": "string"
  }
};

CodeBlock.config = {
  "zoomable": true
};

// This is used for the auto-generated docs
// -----------------
//

CodeBlock.description = {
  "name": "CodeBlock",
  "remarks": [
    "Text in a codeblock is displayed in a fixed-width font, and it preserves both spaces and line breaks"
  ],
  "properties": {
    "content": "Content",
  }
};


// Example Formula
// -----------------
//

CodeBlock.example = {
  "type": "code_block",
  "id": "code_block_1",
  "content": "var text = \"Sun\";\nvar op1 = Operator.TextOperation.Delete(2, \"n\");\ntext = op2.apply(op1.apply(text));\nconsole.log(text);",
};

CodeBlock.Prototype = function() {};

CodeBlock.Prototype.prototype = Text.prototype;
CodeBlock.prototype = new CodeBlock.Prototype();
CodeBlock.prototype.constructor = CodeBlock;

CodeBlock.prototype.defineProperties();

module.exports = CodeBlock;


},{"../text/text_node":240}],169:[function(require,module,exports){
"use strict";

var TextView = require('../text/text_view');

// Substance.CodeBlock.View
// ==========================================================================

var CodeBlockView = function(node) {
  TextView.call(this, node);

  this.$el.addClass('content-node code-block');
};

CodeBlockView.Prototype = function() {};

CodeBlockView.Prototype.prototype = TextView.prototype;
CodeBlockView.prototype = new CodeBlockView.Prototype();

module.exports = CodeBlockView;

},{"../text/text_view":242}],170:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./code_block"),
  View: require("./code_block_view"),
  Surface: require("../text/text_surface")
};

},{"../text/text_surface":241,"./code_block":168,"./code_block_view":169}],171:[function(require,module,exports){
"use strict";

var DocumentNode = require('../node/node');

var ContainerNode = function(node, document) {
  DocumentNode.call(this, node, document);
};

ContainerNode.type = {
  "id": "container",
  "properties": {
    "nodes": ["array", "content"]
  }
};

ContainerNode.Prototype = function() {};

ContainerNode.Prototype.prototype = DocumentNode.prototype;
ContainerNode.prototype = new ContainerNode.Prototype();
ContainerNode.prototype.constructor = ContainerNode;

ContainerNode.prototype.defineProperties();

module.exports = ContainerNode;

},{"../node/node":217}],172:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./container_node")
};

},{"./container_node":171}],173:[function(require,module,exports){
var _ = require('underscore');
var DocumentNode = require('../node/node');

// Substance.Contributor
// -----------------
//

var Contributor = function(node, doc) {
  DocumentNode.call(this, node, doc);
};


// Type definition
// -----------------
//

Contributor.type = {
  "id": "contributor",
  "parent": "content",
  "properties": {
    "source_id": "string",
    "name": "string", // full author name
    "role": "string",
    "description": "string",
    "image": "file", // optional
    "email": "string",
    "contribution": "string"
  }
};

// This is used for the auto-generated docs
// -----------------
//

Contributor.description = {
  "name": "Contributor",
  "remarks": [
    "Describes an article contributor such as an author or editor.",
  ],
  "properties": {
    "name": "Full name.",
  }
};

// Example Video
// -----------------
//

Contributor.example = {
  "id": "contributor_1",
  "type": "contributor",
  "role": "author",
  "name": "John Doe",
  "email": "a@b.com",
  "description": "Revising the article, data cleanup"
};

Contributor.Prototype = function() {
  this.getAffiliations = function() {
    return _.map(this.properties.affiliations, function(affId) {
      return this.document.get(affId);
    }, this);
  };

  this.getBlob = function() {
    if (!this.properties.image) return null;
    var file = this.document.get(this.properties.image);
    if (!file) return null;
    return file.getBlob();
  };

  // Depending on wheter there is a blob it returns either the blob url or a regular image url
  // --------
  // 

  this.getUrl = function() {
    var blob = this.getBlob();
    if (blob) {
      return window.URL.createObjectURL(blob);
    } else {
      return this.properties.image_url;
    }
  };
};

Contributor.Prototype.prototype = DocumentNode.prototype;
Contributor.prototype = new Contributor.Prototype();
Contributor.prototype.constructor = Contributor;

Contributor.prototype.defineProperties();

// Property aliases
// ----

Object.defineProperties(Contributor.prototype, {
  "header": {
    get: function() { return this.properties.name; },
    set: function() { throw new Error("This is a read-only alias property."); }
  }
});

module.exports = Contributor;

},{"../node/node":217,"underscore":273}],174:[function(require,module,exports){
"use strict";

var NodeView = require("../node").View;
var $$ = require("substance-application").$$;
var TextView = require("../text/text_view");

// Substance.Contributor.View
// ==========================================================================

var ContributorView = function(node) {
  NodeView.call(this, node);

  this.$el.attr({id: node.id});
  this.$el.addClass("content-node contributor");
};

ContributorView.Prototype = function() {

  // Render it
  // --------
  //

  this.render = function() {
    NodeView.prototype.render.call(this);


    // Contributor role
    // -------

    this.roleEl = $$('.contributor-role', {text: this.node.role});
    this.content.appendChild(this.roleEl);

    // Name element (used as a header for the resource card)
    // -------

    this.nameView = new TextView(this.node, this.viewFactory, {property: "name"});
    this.content.appendChild(this.nameView.render().el);

    // Resource Body
    // -------
    //
    // Wraps all the contents of the resource card

    var body = $$('.resource-body');

    // Image
    // -------

    this.imgEl = $$('img');
    this.updateImage();

    this.imageEl = $$('.image', {
      contenteditable: false,
      children: [
        this.imgEl
      ],
      'data-path': this.node.id+'.image'
    });

    body.appendChild(this.imageEl);

    // Description
    // -------

    this.descriptionView = new TextView(this.node, this.viewFactory, {property: "description"});
    body.appendChild(this.descriptionView.render().el);


    // Contribution
    // -------

    // if (this.node.contribution) {
    //   body.appendChild($$('.label', {text: 'Contribution'}));
    //   this.contribEl = $$('.contribution.node-property', {text: this.node.contribution, "data-path": "contribution"});
    //   body.appendChild(this.contribEl);
    // }

    this.content.appendChild(body);

    return this;
  };

  this.updateImage = function() {
    var url = this.node.getUrl() || "styles/contributor-image-placeholder.png";
    this.imgEl.setAttribute("src", url);
  };

  this.dispose = function() {
    NodeView.prototype.dispose.call(this);
    this.nameView.dispose();
    this.descriptionView.dispose();
  };
};

ContributorView.Prototype.prototype = NodeView.prototype;
ContributorView.prototype = new ContributorView.Prototype();

module.exports = ContributorView;

},{"../node":216,"../text/text_view":242,"substance-application":10}],175:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./contributor"),
  View: require("./contributor_view")
};

},{"./contributor":173,"./contributor_view":174}],176:[function(require,module,exports){
var _ = require('underscore');
var DocumentNode = require('../node/node');

// Cover
// -----------------
//

var Cover = function(node, doc) {
  DocumentNode.call(this, node, doc);
};

// Type definition
// -----------------
//

Cover.type = {
  "id": "cover",
  "parent": "content",
  "properties": {
    "source_id": "string",
    "image": "string"
  }
};


// This is used for the auto-generated docs
// -----------------
//

Cover.description = {
  "name": "Cover",
  "remarks": [
    "Virtual view on the title and authors of the paper."
  ],
  "properties": {

  }
};

// Example Cover
// -----------------
//

Cover.example = {
  "id": "cover",
  "type": "cover",
  "image": "http://example.com/image.png"
};

Cover.Prototype = function() {

  // TODO: We should discuss if it is really desirable to have document manipulation
  // in a model class
  // TODO: this should be transactional
  this.deleteImage = function() {
    // Delete image file
    this.document.delete(this.properties.image);
    this.document.set([this.id, "image"], "");
  };

  // TODO: Use File.getBlob() instead

  this.getBlob = function() {
    if (!this.properties.image) return null;
    var file = this.document.get(this.properties.image);
    if (!file) return null;
    return file.getBlob();
  };

  // Depending on wheter there is a blob it returns either the blob url or a regular image url
  // --------
  //

  this.getUrl = function() {
    var blob = this.getBlob();
    if (blob) {
      return window.URL.createObjectURL(blob);
    } else {
      return this.properties.image_url;
    }
  };

};

Cover.Prototype.prototype = DocumentNode.prototype;
Cover.prototype = new Cover.Prototype();
Cover.prototype.constructor = Cover;

Cover.prototype.defineProperties();

// Property aliases
// --------

Object.defineProperties(Cover.prototype, {
  "title": {
    get: function() {
      return this.document.title;
    },
    set: function(title) {
      this.document.title = title;
    }
  },
  "abstract": {
    get: function() {
      return this.document.abstract;
    },
    set: function(abstract) {
      this.document.abstract = abstract;
    }
  }
});

module.exports = Cover;

},{"../node/node":217,"underscore":273}],177:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var $$ = require("substance-application").$$;
var NodeView = require("../node/node_view");
var TextView = require("../text/text_view");
var Annotator = require("substance-document").Annotator;

// Lens.Cover.View
// ==========================================================================

var CoverView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  this.$el.attr({id: node.id});
  this.$el.addClass("content-node cover");
};

CoverView.Prototype = function() {

  this.render = function() {
    NodeView.prototype.render.call(this);

    if (this.node.document.published_on) {
      this.content.appendChild($$('.published-on', {
        contenteditable: false,
        html: new Date(this.node.document.published_on).toDateString()
      }));
    }

    // TODO: this could be more convenient e.g., by passing a list of classes to be set
    this.titleView =  new TextView(this.node, this.viewFactory, {property: "title"});
    this.content.appendChild(this.titleView.render().el);
    this.titleView.el.classList.add("title");

    this.authorsEl = $$('.authors');

    this.renderAuthors();
    this.content.appendChild(this.authorsEl);

    return this;
  };

  this.dispose = function() {
    NodeView.dispose.call(this);
    this.titleView.dispose();
  };

  this.renderAuthors = function() {
    this.authorsEl.innerHTML = "";

    var authors = this.node.document.getAuthors();
    _.each(authors, function(a) {
      var authorEl = $$('a.toggle-author', {
        id: "toggle_"+a.id,
        href: "#",
        text: a.name,
        'data-id': a.id,
      });

      this.authorsEl.appendChild(authorEl);
    }, this);
  };

  this.onGraphUpdate = function(op) {
    // Call super handler and return if that has processed the operation already
    if (NodeView.prototype.onGraphUpdate.call(this, op)) {
      return true;
    }

    if (_.isEqual(op.path, ["document","title"])) {
      this.titleView.renderContent();
      return true;
    } else if (_.isEqual(op.path, ["document", "authors"])) {
      this.renderAuthors();
    }

    // Otherwise deal with annotation changes
    // Note: the annotations do not get attached to ["document", "title"],
    // as it seems strange to annotate a property which is used in such an indirect way
    if (Annotator.changesAnnotations(this.node.document, op, ["cover", "title"])) {
      //console.log("Rerendering TextView due to annotation update", op);
      this.titleView.renderContent();
      return true;
    }
  };
};

CoverView.Prototype.prototype = NodeView.prototype;
CoverView.prototype = new CoverView.Prototype();

module.exports = CoverView;

},{"../node/node_view":219,"../text/text_view":242,"substance-application":10,"substance-document":136,"underscore":273}],178:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./cover'),
  View: require('./cover_view')
};

},{"./cover":176,"./cover_view":177}],179:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var CrossReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

CrossReference.type = {
  "id": "cross_reference",
  "parent": "annotation",
  "properties": {
    "target": "content"
  }
};


// This is used for the auto-generated docs
// -----------------
//

CrossReference.description = {
  "name": "CrossReference",
  "remarks": [
    "References a range in a text-ish node and references a content node."
  ],
  "properties": {

  }
};


// Example CrossReference annotation
// -----------------
//

CrossReference.example = {
  "type": "cross_reference_1",
  "id": "cross_reference_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

CrossReference.Prototype = function() {};

CrossReference.Prototype.prototype = Annotation.prototype;
CrossReference.prototype = new CrossReference.Prototype();
CrossReference.prototype.constructor = CrossReference;

CrossReference.prototype.defineProperties();

module.exports = CrossReference;

},{"../annotation/annotation":150}],180:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./cross_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./cross_reference":179}],181:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var DefinitionReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

DefinitionReference.type = {
  "id": "definition_reference",
  "parent": "annotation",
  "properties": {
    "target": "string"
  }
};

// This is used for the auto-generated docs
// -----------------
//

DefinitionReference.description = {
  "name": "DefinitionReference",
  "remarks": [
    "References a range in a text-ish node and references a location node."
  ],
  "properties": {
  }
};


// Example DefinitionReference annotation
// -----------------
//

DefinitionReference.example = {
  "id": "definition_reference_1",
  "type": "definition_reference",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

DefinitionReference.Prototype = function() {};

DefinitionReference.Prototype.prototype = Annotation.prototype;
DefinitionReference.prototype = new DefinitionReference.Prototype();
DefinitionReference.prototype.constructor = DefinitionReference;

DefinitionReference.prototype.defineProperties();

module.exports = DefinitionReference;

},{"../annotation/annotation":150}],182:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./definition_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./definition_reference":181}],183:[function(require,module,exports){
var _ = require('underscore');
var AbstractNode = require('../node/node');

// DocumentNode
// -----------------
//

var DocumentNode = function(node, doc) {
  AbstractNode.call(this, node, doc);
};

// Type definition
// -----------------
//

DocumentNode.type = {
  "id": "document",
  "parent": "content",
  "properties": {
    "views": ["array", "view"],
    "guid": "string",
    "creator": "string",
    "authors": ["array", "contributor"],
    "project": "string",
    "location": "string",
    "place": "place",
    "duration": "string",
    "license": "license",
    "title": "string",
    "timemarks": "object",
    "abstract": "string",
    "abstract_en": "string", // english abstract
    "created_at": "date",
    "updated_at": "date",
    "published_on": "date", // should be part of the main type?
    "meta": "object"
  }
};


// This is used for the auto-generated docs
// -----------------
//

DocumentNode.description = {
  "name": "document",
  "remarks": [
    "A node containing meta information for a document."
  ],
  "properties": {
  }
};

// Example DocumentNode
// -----------------
//

DocumentNode.example = {
};

DocumentNode.Prototype = function() {
};

DocumentNode.Prototype.prototype = AbstractNode.prototype;
DocumentNode.prototype = new DocumentNode.Prototype();
DocumentNode.prototype.constructor = DocumentNode;

DocumentNode.prototype.defineProperties();


module.exports = DocumentNode;

},{"../node/node":217,"underscore":273}],184:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./document_node')
};

},{"./document_node":183}],185:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var Emphasis = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

Emphasis.type = {
  "id": "emphasis",
  "parent": "annotation",
  "properties": {
  }
};


// This is used for the auto-generated docs
// -----------------
//

Emphasis.description = {
  "name": "Emphasis",
  "remarks": [
    "References a range in a text-ish node and tags it as emphasized"
  ],
  "properties": {
  }
};


// Example Emphasis annotation
// -----------------
//

Emphasis.example = {
  "type": "emphasis",
  "id": "emphasis_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

Emphasis.Prototype = function() {};

Emphasis.Prototype.prototype = Annotation.prototype;
Emphasis.prototype = new Emphasis.Prototype();
Emphasis.prototype.constructor = Emphasis;

module.exports = Emphasis;


},{"../annotation/annotation":150}],186:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./emphasis"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./emphasis":185}],187:[function(require,module,exports){
"use strict";

var Issue = require('../issue/issue');

var ErrorNode = function(node, document) {
  Issue.call(this, node, document);
};

// Type definition
// --------

ErrorNode.type = {
  "id": "error",
  "parent": "issue",
  "properties": {
  }
};


// This is used for the auto-generated docs
// -----------------
//

ErrorNode.description = {
  "name": "Error",
  "remarks": [
    "References a range in a text-ish node and tags it as emphasized"
  ],
  "properties": {
  }
};


// Example Error annotation
// -----------------
//

ErrorNode.example = {
  "type": "error",
  "id": "error_1",
  "title": "Hi I am an a error",
  "description": "An error, yes."
};

ErrorNode.Prototype = function() {};

ErrorNode.Prototype.prototype = Issue.prototype;
ErrorNode.prototype = new ErrorNode.Prototype();
ErrorNode.prototype.constructor = ErrorNode;

module.exports = ErrorNode;

},{"../issue/issue":205}],188:[function(require,module,exports){
"use strict";

var IssueView = require("../issue/issue_view");

var ErrorView = function(node, viewFactory) {
  IssueView.call(this, node, viewFactory);
};

ErrorView.Prototype = function() {

};

ErrorView.Prototype.prototype = IssueView.prototype;
ErrorView.prototype = new ErrorView.Prototype();

module.exports = ErrorView;

},{"../issue/issue_view":206}],189:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./error"),
  View: require("./error_view")
};

},{"./error":187,"./error_view":188}],190:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var ErrorReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

ErrorReference.type = {
  "id": "error_reference",
  "parent": "annotation",
  "properties": {
    "target": "error"
  }
};

// This is used for the auto-generated docs
// -----------------
//

ErrorReference.description = {
  "name": "ErrorReference",
  "remarks": [
    "References a range in a text-ish node and references an error"
  ],
  "properties": {
    "target": "Referenced error id"
  }
};


// Example ErrorReference annotation
// -----------------
//

ErrorReference.example = {
  "type": "error_reference_1",
  "id": "error_reference_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ],
  "target": "error_1"
};

ErrorReference.Prototype = function() {};

ErrorReference.Prototype.prototype = Annotation.prototype;
ErrorReference.prototype = new ErrorReference.Prototype();
ErrorReference.prototype.constructor = ErrorReference;

ErrorReference.prototype.defineProperties();

module.exports = ErrorReference;

},{"../annotation/annotation":150}],191:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./error_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./error_reference":190}],192:[function(require,module,exports){
"use strict";

var DocumentNode = require("../node/node");

var Figure = function(node, document) {
  DocumentNode.call(this, node, document);
};

Figure.type = {
  "id": "figure",
  "parent": "content",
  "properties": {
    "image": "file",
    "caption": "paragraph"
  }
};

Figure.description = {
  "name": "Figure",
  "remarks": [
    "A figure holding an image, a label and a caption."
  ],
  "properties": {
    "image": "File id that has the image data",
    "caption": "A reference to a paragraph that describes the figure",
  }
};

// Example Figure
// -----------------
//

Figure.example = {
  "id": "figure_1",
  "image": "figure_1.png",
  "caption": "paragraph_1"
};

Figure.Prototype = function() {

  this.deleteImage = function() {
    // Delete image file
    this.document.delete(this.properties.image);
    this.document.set([this.id, "image"], "");
  };

  this.hasCaption = function() {
    return (!!this.properties.caption);
  };

  this.getCaption = function() {
    if (this.properties.caption) return this.document.get(this.properties.caption);
  };

  this.getBlob = function() {
    if (!this.properties.image) return null;
    var file = this.document.get(this.properties.image);
    if (!file) return null;
    return file.getBlob();
  };

  // Depending on wheter there is a blob it returns either the blob url or a regular image url
  // --------
  //

  this.getUrl = function() {
    var blob = this.getBlob();
    if (blob) {
      // FIXME: fix Safari support. First we must use window.webkitURL instead
      // Secondly, the Blob does not work the same as in Chrom.
      var URL = window.URL;
      return URL.createObjectURL(blob);
    } else {
      return this.properties.image_url;
    }
  };
};

Figure.Prototype.prototype = DocumentNode.prototype;
Figure.prototype = new Figure.Prototype();
Figure.prototype.constructor = Figure;

Figure.prototype.defineProperties();

// Property aliases:
// ----

Object.defineProperties(Figure.prototype, {
  // Used as a resource header
  header: {
    get: function() { return this.properties.label; },
    set: function() { throw new Error("This is a read-only alias property."); }
  }
});

// a factory method to create nodes more conveniently
// Supported
//  - id: unique id
//  - url: a relative path or a web URL
//  - caption: a string used as caption
Figure.create = function(data) {

  var result = {};

  var figId = data.id;
  var figure = {
    id: figId,
    type: "figure"
  };

  if (data.caption) {
    var captionId = "caption_" + data.id;
    var caption = {
      id: captionId,
      type: "text",
      content: data.caption
    };
    result[captionId] = caption;
    figure.caption = captionId;
  }

  result[figId] = figure;
  return result;
};

module.exports = Figure;

},{"../node/node":217}],193:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./figure')
};

},{"./figure":192}],194:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var FigureReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

FigureReference.type = {
  "id": "figure_reference",
  "parent": "annotation",
  "properties": {
    "target": "figure"
  }
};

// This is used for the auto-generated docs
// -----------------
//

FigureReference.description = {
  "name": "FigureReference",
  "remarks": [
    "References a range in a text-ish node and references a figure"
  ],
  "properties": {
    "target": "Referenced figure id"
  }
};


// Example FigureReference annotation
// -----------------
//

FigureReference.example = {
  "type": "figure_reference_1",
  "id": "figure_reference_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

FigureReference.Prototype = function() {};

FigureReference.Prototype.prototype = Annotation.prototype;
FigureReference.prototype = new FigureReference.Prototype();
FigureReference.prototype.constructor = FigureReference;

FigureReference.prototype.defineProperties();

module.exports = FigureReference;

},{"../annotation/annotation":150}],195:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./figure_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./figure_reference":194}],196:[function(require,module,exports){
"use strict";

var DocumentNode = require("../node/node");
var _ = require("underscore");


var File = function(node, document) {
  DocumentNode.call(this, node, document);
};


File.type = {
  "id": "file",
  "parent": "content",
  "properties": {
    "version": "number",
    "content_type": "string" // content mime type
  }
};


File.description = {
  "name": "File",
  "remarks": [
    "A file is a file is a file."
  ],
  "properties": {
    "content_type": "Content MIME type",
    "version": "File version, gets incremented every time the file content changes."
  }
};

// Example File
// -----------------
//

File.example = {
  "id": "figure1.png",
  "version": 1,
  "content_type": "image/png"
};


File.Prototype = function() {

  this.isText = function() {
    return _.include(["application/json", "text/css", "text/plain", "text/html"], this.properties.content_type);
  };

  this.isBinary = function() {
    return !this.isText();
  };

  this.isJSON = function() {
    return this.properties.content_type === "application/json";
  };

  this.getData = function(version) {
    var dataKey = this.properties.id+".v"+(version || this.properties.version);
    return this.document.fileData[dataKey];
  };

  this.getSize = function() {
    var data = this.getData();
    if (this.isJSON()) {
      return JSON.stringify(data).length;
    } else if (this.isBinary()) {
      // Just making sure we don't run into a NaN scenario
      return data.byteLength || data.length || 0;
    } else {
      return data.length;
    }
  };

  this.getBlob = function(version) {
    var data = this.getData(version);
    return new window.Blob([data], {type: this.properties.content_type});
  };

  // Set the data for a given version
  // ------------
  // This is used to attach data to the file node for a specific version
  // If version is not given, the 'version' property is used
  //
  this.setData = function(data, version) {
    version = version || this.properties.version;

    var dataKey = this.properties.id+".v"+version;
    // First create the data in our temporary data store
    if (this.isJSON()) {
      this.document.fileData[dataKey] = JSON.parse(data);
    } else if (this.isText()) {
      this.document.fileData[dataKey] = data;
    } else { // Binary data
      this.document.fileData[dataKey] = data; // new Blob([data], {type: this.properties.content_type});
    }
  };

  // Assigns a data object from the temporary data store
  this.updateData = function(data) {
    var version = this.properties.version;
    version = version ? version + 1 : 1;
    this.setData(data, version);
    // Note: a node view displaying the file (e.g. figure) should listen to
    // this change
    this.document.set([this.properties.id, "version"], version);
  };
};



File.Prototype.prototype = DocumentNode.prototype;
File.prototype = new File.Prototype();
File.prototype.constructor = File;

File.prototype.defineProperties();

module.exports = File;
},{"../node/node":217,"underscore":273}],197:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./file")
};

},{"./file":196}],198:[function(require,module,exports){
"use strict";

var Text = require("../text/text_node");

var Heading = function(node, document) {
  Text.call(this, node, document);
};

// Type definition
// -----------------
//

Heading.type = {
  "id": "heading",
  "parent": "content",
  "properties": {
    "source_id": "string",
    "content": "string",
    "level": "number"
  }
};

// Example Heading
// -----------------
//

Heading.example = {
  "type": "heading",
  "id": "heading_1",
  "content": "Introduction",
  "level": 1
};

// This is used for the auto-generated docs
// -----------------
//


Heading.description = {
  "name": "Heading",
  "remarks": [
    "Denotes a section or sub section in your article."
  ],
  "properties": {
    "content": "Heading content",
    "level": "Heading level. Ranges from 1..4"
  }
};

Heading.Prototype = function() {
  this.splitInto = 'paragraph';
};

Heading.Prototype.prototype = Text.prototype;
Heading.prototype = new Heading.Prototype();
Heading.prototype.constructor = Heading;

Heading.prototype.defineProperties();

module.exports = Heading;

},{"../text/text_node":240}],199:[function(require,module,exports){
"use strict";

var TextView = require('../text/text_view');

// Substance.Heading.View
// ==========================================================================

var HeadingView = function(node) {
  TextView.call(this, node);
  this.$el.addClass('heading');

  this._level = this.node.level;
  this.$el.addClass('level-'+this._level);
};

HeadingView.Prototype = function() {
  var __super__ = TextView.prototype;

  this.onNodeUpdate = function(op) {
    __super__.onNodeUpdate.call(this, op);
    if (op.path[1] === "level") {
      this.$el.removeClass('level-'+this._level);

      this._level = this.node.level;
      this.$el.addClass('level-'+this._level);
    }
  };

};

HeadingView.Prototype.prototype = TextView.prototype;
HeadingView.prototype = new HeadingView.Prototype();

module.exports = HeadingView;

},{"../text/text_view":242}],200:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./heading"),
  View: require("./heading_view"),
  Surface: require("../text/text_surface")
};

},{"../text/text_surface":241,"./heading":198,"./heading_view":199}],201:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./interview_subject"),
  View: require("./interview_subject_view")
};

},{"./interview_subject":202,"./interview_subject_view":203}],202:[function(require,module,exports){
var _ = require('underscore');
var DocumentNode = require('../node/node');


// Substance.InterviewSubject
// -----------------
//

var InterviewSubject = function(node, doc) {
  DocumentNode.call(this, node, doc);
};


// Type definition
// -----------------
//

InterviewSubject.type = {
  "id": "interview_subject",
  "parent": "content",
  "properties": {
    "source_id": "string",
    "name": "string", // full subject name
    "role": "string",
    "description": "string",
    "forced_labor": "string",
    "categories": ["array", "string"],
    "prisons": ["array", "location"],
    "movement": ["array", "object"],
    "image": "file", // optional
    "email": "string",
    "contribution": "string"
  }
};


InterviewSubject.Prototype = function() {

  this.getBlob = function() {
    if (!this.properties.image) return null;
    var file = this.document.get(this.properties.image);
    if (!file) return null;
    return file.getBlob();
  };

  // Depending on wheter there is a blob it returns either the blob url or a regular image url
  // --------
  // 

  this.getUrl = function() {
    var blob = this.getBlob();
    if (blob) {
      return window.URL.createObjectURL(blob);
    } else {
      return this.properties.image_url;
    }
  };
};

InterviewSubject.Prototype.prototype = DocumentNode.prototype;
InterviewSubject.prototype = new InterviewSubject.Prototype();
InterviewSubject.prototype.constructor = InterviewSubject;

InterviewSubject.prototype.defineProperties();

// Property aliases
// ----

// Object.defineProperties(InterviewSubject.prototype, {
//   "header": {
//     get: function() { return this.properties.name; },
//     set: function() { throw new Error("This is a read-only alias property."); }
//   }
// });

module.exports = InterviewSubject;

},{"../node/node":217,"underscore":273}],203:[function(require,module,exports){
"use strict";

var NodeView = require("../node").View;
var $$ = require("substance-application").$$;
var TextView = require("../text/text_view");
var ArrayOperation = require("substance-operator").ArrayOperation;
var _ = require("underscore");

// Substance.InterviewSubject.View
// ==========================================================================

var InterviewSubjectView = function(node) {
  NodeView.call(this, node);

  this.$el.attr({id: node.id});
  this.$el.addClass("content-node contributor interview-subject");
};

InterviewSubjectView.Prototype = function() {

  // Render it
  // --------
  //

  this.render = function() {
    NodeView.prototype.render.call(this);

    // Contributor role
    // -------

    this.roleEl = $$('.contributor-role', {text: this.node.role});
    this.content.appendChild(this.roleEl);

    // Name element (used as a header for the resource card)
    // -------

    this.nameView = new TextView(this.node, this.viewFactory, {property: "name"});
    this.content.appendChild(this.nameView.render().el);

    // Resource Body
    // -------
    //
    // Wraps all the contents of the resource card

    var body = $$('.resource-body');

    // Image
    // -------

    this.imgEl = $$('img');
    this.updateImage();

    this.imageEl = $$('.image', {
      contenteditable: false,
      children: [
        this.imgEl
      ],
      'data-path': this.node.id+'.image'
    });


    // body.appendChild(this.imageEl);

    // Description
    // -------

    body.appendChild($$('.label', {text: 'Biography'}));
    this.descriptionView = new TextView(this.node, this.viewFactory, {property: "description"});
    body.appendChild(this.descriptionView.render().el);

    // Forced Labor
    // -------

    body.appendChild($$('.label', {text: 'Forced labor'}));
    this.forcedLaborEl = $$('.forced-labor.node-property', {text: this.node.forced_labor});
    body.appendChild(this.forcedLaborEl);

    // Categories
    // -------

    body.appendChild($$('.label', {text: 'Categories'}));
    this.categoriesEl = $$('.categories.node-property', {text: this.node.categories.join(', ')});
    body.appendChild(this.categoriesEl);

    // Prisons
    // -------

    body.appendChild($$('.label', {text: 'Prisons'}));
    this.prisonsEl = $$('.prisons.node-property', {text: this.node.prisons.join(', ')});
    body.appendChild(this.prisonsEl);

    // Movement
    // -------

    body.appendChild($$('.label', {text: 'Movement'}));
    this.movementEl = $$('.movement-entries');
    
    // Add entries
    _.each(this.node.movement, function(movementEntry) {
      var movementEntry = $$('.movement-entry', {
        children: [
          $$('.location-name', {text: movementEntry.location}),
          $$('input.density', {value: movementEntry.density}),
          $$('.remove', {html: '<i class="icon-remove-sign"/>' })
        ]
      });
      this.movementEl.appendChild(movementEntry);

    }, this);

    body.appendChild(this.movementEl);
    
    // manipulate movement data
    this.content.appendChild(body);

    return this;
  };

  this.addMovementEntry = function() {
    // Alternatively rewrite whole array
    // this.node.document.set([this.node.id, "movement"], [{"location": "foo", "density": 2}]);

    // var arrayOp = ["+", 2, {"location": "foo", "density": 2}];
    var arrayOp = ArrayOperation.Push(this.node.movement, {"location": "foo", "density": 2});
    this.node.document.update([this.node.id, "movement"], arrayOp);

    console.log('le movement AFTER:', this.node.movement);
  };

  this.updateImage = function() {
    var url = this.node.getUrl() || "styles/contributor-image-placeholder.png";
    this.imgEl.setAttribute("src", url);
  };

  this.dispose = function() {
    NodeView.prototype.dispose.call(this);
    this.nameView.dispose();
    this.descriptionView.dispose();
  };
};

InterviewSubjectView.Prototype.prototype = NodeView.prototype;
InterviewSubjectView.prototype = new InterviewSubjectView.Prototype();

module.exports = InterviewSubjectView;

},{"../node":216,"../text/text_view":242,"substance-application":10,"substance-operator":250,"underscore":273}],204:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./issue"),
  View: require("./issue_view")
};

},{"./issue":205,"./issue_view":206}],205:[function(require,module,exports){
"use strict";

var DocumentNode = require('../node/node');

var Issue = function(node, document) {
  DocumentNode.call(this, node, document);
};

// Type definition
// --------

Issue.type = {
  "id": "issue",
  "properties": {
    "title": "string",
    "description": "string", // should be a reference to a text node?
    "creator": "string",
    "created_at": "date" // should be date
  }
};


// This is used for the auto-generated docs
// -----------------
//

Issue.description = {
  "name": "Issue",
  "remarks": [
    "References a range in a text-ish node and tags it as subscript"
  ],
  "properties": {
    "title": "Issue Title",
    "description": "More verbose issue description",
    "creator": "Issue creator",
    "created_at": "Date and time of issue creation."
  }
};


// Example Issue annotation
// -----------------
//

Issue.example = {
  "abstract": "type"
};

Issue.Prototype = function() {

  this.hasDescription = function() {
    return (!!this.properties.caption);
  };

  this.getDescription = function() {
    if (this.properties.description) return this.document.get(this.properties.description);
  };

  this.getReferences = function() {
    var references = this.document.getIndex('references');
    if (references) {
      return references.get(this.properties.id);
    } else {
      console.error("No index for references.")
      return [];
    }
  };

};

Issue.Prototype.prototype = DocumentNode.prototype;
Issue.prototype = new Issue.Prototype();
Issue.prototype.constructor = Issue;

Issue.prototype.defineProperties();

module.exports = Issue;

},{"../node/node":217}],206:[function(require,module,exports){
"use strict";

var $$ = require ("substance-application").$$;
var NodeView = require("../node/node_view");
var TextView = require("../text/text_view");


// Substance.Issue.View
// ==========================================================================

var IssueView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  // This class is shared among all issue subtypes (errors, remarks)
  this.$el.addClass('issue');
};

IssueView.Prototype = function() {

  var __super__ = NodeView.prototype;

  this._updateTitle = function() {
    if (this.ref) {
      this.titleTextEl.innerHTML = this.ref.getContent();
    } else {
      this.titleTextEl.innerHTML = "";
    }
  };

  // Rendering
  // =============================
  //

  this.render = function() {
    NodeView.prototype.render.call(this);

    //Note: we decided to render the text of the reference instead of
    //the title property
    var titleViewEl = $$('div.issue-title-wrapper')
    this.titleTextEl = $$('.text.title', {
      children: [$$('span.title-annotation', {text: "meeh"})]
    })
    titleViewEl.appendChild(this.titleTextEl);
    // this.content.appendChild(titleViewEl);

    // Creator and date
    // --------

    var creator = $$('div.creator', {
      text: (this.node.creator || "Anonymous") + ", " + jQuery.timeago(new Date(this.node.created_at)),
      contenteditable: false // Make sure this is not editable!
    });

    // labelView.el.appendChild(creator);

    this.descriptionView = new TextView(this.node, this.viewFactory, {property: "description"});
    this.content.appendChild(this.descriptionView.render().el);

    var refs = this.node.getReferences();
    var refIds = Object.keys(refs);
    if (refIds.length > 0) {
      this.ref = refs[refIds[0]];
      this._updateTitle()
    }

    return this;
  };

  this.dispose = function() {
    NodeView.dispose.call(this);
    this.descriptionView.dispose();
  };

  this.onNodeUpdate = function(op) {
    if (op.path[1] === "description") {
      this.descriptionView.onNodeUpdate(op);
      return true;
    } else {
      return false;
    }
  };

  this.onGraphUpdate = function(op) {
    if (__super__.onGraphUpdate.call(this, op)) {
      return true;
    }
    // Hack: lazily detecting references to this issue
    // by *only* checking 'create' ops with an object having this node as target
    else if (op.type === "create" && op.val["target"] === this.node.id) {
      this.ref = this.node.document.get(op.val.id);
      this._updateTitle();
      return true;
    }
    // ... the same in inverse direction...
    else if (op.type === "delete" && op.val["target"] === this.node.id) {
      this.ref = null;
      this._updateTitle();
      return true;
    }
    else if (this.ref && op.path[0] === this.ref.id) {
      this._updateTitle();
      return true;
    } else {
      return false;
    }
  };

};


IssueView.Prototype.prototype = NodeView.prototype;
IssueView.prototype = new IssueView.Prototype();

module.exports = IssueView;

},{"../node/node_view":219,"../text/text_view":242,"substance-application":10}],207:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./license')
};

},{"./license":208}],208:[function(require,module,exports){
"use strict";

var DocumentNode = require('../node/node');
var _ = require('underscore');

var License = function(node, document) {
  DocumentNode.call(this, node, document);
};

// Type definition
// --------

License.type = {
  "id": "license",
  "properties": {
    "name": "string",
    "code": "string",
    "version": "string",
    "description": "string",
    "url": "string"
  }
};

// This is used for the auto-generated docs
// -----------------
//

License.description = {
  "name": "License",
  "remarks": [
    "Describes the content license used by the document"
  ],
  "properties": {
    "name": "License name",
    "code": "Coded license name, e.g. cc-by",
    "version": "License version",
    "description": "Text describing the license",
    "url": "URL for more information about the license"
  }
};


License.Prototype = function() {

};

License.available_licenses = {
  "none": {
    "id": "license",
    "type": "license",
    "name": "None",
    "code": "none",
    "description": "No license is attached to this article.",
    "version": "1.0",
    "url": ""
  },
  "public-domain": {
    "id": "license",
    "type": "license",
    "name": "Public Domain",
    "code": "public-domain",
    "description": "This work has been identified as being free of known restrictions under copyright law, including all related and neighboring rights. You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.",
    "version": "1.0",
    "url": "http://creativecommons.org/publicdomain/mark/1.0/"
  },
  "cc-by": {
    "id": "license",
    "type": "license",
    "name": "Creative Commons Attribution License",
    "code": "cc-by",
    "version": "3.0",
    "description": "This article is distributed under the terms of the Creative Commons Attribution License, which permits unrestricted use and redistribution provided that the original author and source are credited.",
    "url": "http://creativecommons.org/licenses/by/3.0/us/"
  },
  "gutenberg": {
    "id": "license",
    "type": "license",
    "name": "Project Gutenberg License",
    "code": "gutenberg",
    "version": "1.0",
    "description": "This article is distributed under the terms of the Project Gutenberg License.",
    "url": "http://www.gutenberg.org/wiki/Gutenberg:The_Project_Gutenberg_License"
  }
};

License.Prototype.prototype = DocumentNode.prototype;
License.prototype = new License.Prototype();
License.prototype.constructor = License;

License.prototype.defineProperties();

module.exports = License;

},{"../node/node":217,"underscore":273}],209:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./list_item"),
  View: require("./list_item_view"),
  Surface: require("../text/text_surface")
};

},{"../text/text_surface":241,"./list_item":210,"./list_item_view":211}],210:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var TextNode = require('../text/text_node');

var ListItem = function(node, document) {
  TextNode.call(this, node, document);
};

ListItem.type = {
  "id": "list_item",
  "parent": "content",
  "properties": {
    "level": "number",
    "content": "string"
  }
};


// This is used for the auto-generated docs
// -----------------
//

ListItem.description = {
  "name": "ListItem",
  "remarks": [
    "ListItems have a level of nesting."
  ],
  "properties": {
    "level": "Specifies the indentation level",
    "content": "The item's content",
  }
};


// Example Formula
// -----------------
//

ListItem.example = {
  "type": "list_item",
  "id": "list_item_1",
  "level": 1,
  "content": "This is item 1"
};

ListItem.Prototype = function() {
};

ListItem.Prototype.prototype = TextNode.prototype;;
ListItem.prototype = new ListItem.Prototype();
ListItem.prototype.constructor = ListItem;

ListItem.prototype.defineProperties();

module.exports = ListItem;

},{"../text/text_node":240,"underscore":273}],211:[function(require,module,exports){
"use strict";

var TextView = require("../text/text_view");
var _ = require("underscore");
var $$ = require("substance-application").$$;

// Substance.Image.View
// ==========================================================================

var ListItemView = function(node, viewFactory) {
  TextView.call(this, node);

  this._level = this.node.level;
  this.$el.addClass('level-'+this._level);
};

ListItemView.Prototype = function() {
  var __super__ = TextView.prototype;

  this.onNodeUpdate = function(op) {
    __super__.onNodeUpdate.call(this, op);
    if (op.path[1] === "level") {
      this.$el.removeClass('level-'+this._level);

      this._level = this.node.level;
      this.$el.addClass('level-'+this._level);
    }
  };

  this.dispose = function() {
    __super__.dispose.call(this);
  };

};

ListItemView.Prototype.prototype = TextView.prototype;
ListItemView.prototype = new ListItemView.Prototype();

module.exports = ListItemView;

},{"../text/text_view":242,"substance-application":10,"underscore":273}],212:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./location_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./location_reference":213}],213:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var LocationReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

LocationReference.type = {
  "id": "location_reference",
  "parent": "annotation",
  "properties": {
    "target": "string"
  }
};

// This is used for the auto-generated docs
// -----------------
//

LocationReference.description = {
  "name": "LocationReference",
  "remarks": [
    "References a range in a text-ish node and references a location node."
  ],
  "properties": {
  }
};


// Example LocationReference annotation
// -----------------
//

LocationReference.example = {
  "id": "location_reference_1",
  "type": "location_reference",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

LocationReference.Prototype = function() {};

LocationReference.Prototype.prototype = Annotation.prototype;
LocationReference.prototype = new LocationReference.Prototype();
LocationReference.prototype.constructor = LocationReference;

LocationReference.prototype.defineProperties();

module.exports = LocationReference;

},{"../annotation/annotation":150}],214:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./multi_annotation")
};

},{"./multi_annotation":215}],215:[function(require,module,exports){
"use strict";

var DocumentNode = require('../node/node');

var MultiAnnotation = function(node, document) {
  DocumentNode.call(this, node, document);
  this.numberOfFragments = 0;
  this.fragmentIds = [];
  // this.addFragments();
};

// Type definition
// --------

MultiAnnotation.type = {
  "id": "annotation",
  "properties": {
    "container": "string",
    "startPath": ["array", "string"],
    "startCharPos": "number",
    "endPath": ["array", "string"],
    "endCharPos": "number"
  }
};

MultiAnnotation.Prototype = function() {

  this.removeFragments = function(tx) {
    var doc = tx ? tx.document : this.document;
    for (var i = 0; i < this.fragmentIds.length; i++) {
      var fragId = this.fragmentIds[i];
      var frag = doc.get(fragId);
      doc.apply({ "type": "delete", "path": [fragId], "val": frag });
    }
  };

  this.addFragments = function(tx) {
    var doc;
    if (tx) {
      doc = tx.document;
    } else {
      doc = this.document;
    }
    var container = doc.get(this.container);
    var annotationId = this.id;
    var startComp = container.lookup(this.startPath);
    var endComp = container.lookup(this.endPath);
    var start = startComp.pos;
    var end = endComp.pos;
    this.fragmentIds = [];
    this.numberOfFragments = end-start+1;
    for (var i = start; i <= end; i++) {
      var fragNumber = (i-start);
      var fragId = annotationId+"_"+fragNumber;
      // HACK: with our cloning via toJSON on transaction, this gets called too often
      // and we need to 'reuse' the existing fragment
      var frag = doc.get(fragId);
      if (!frag) {
        var comp, startCharPos, endCharPos;
        startCharPos = 0;
        if (i === start) {
          comp = startComp;
          startCharPos = this.startCharPos;
          if (i === end) {
            endCharPos = this.endCharPos;
          } else {
            endCharPos = comp.getLength();
          }
        } else if ( i === end ) {
          comp = endComp;
          endCharPos = this.endCharPos;
        } else {
          comp = container.getComponent(i);
          endCharPos = comp.getLength();
        }
        var annotationFragment = {
          "type": "annotation_fragment",
          "id": fragId,
          "annotation_id": annotationId,
          "path": comp.path,
          "range": [startCharPos, endCharPos],
          "fragment_number": fragNumber
        };
        doc.apply({ "type": "create", "path": [fragId], "val": annotationFragment });
      }
      this.fragmentIds.push(fragId);
    }
  };

  this.update = function(tx) {
    this.removeFragments(tx);
    this.addFragments(tx);
  };

};

MultiAnnotation.Prototype.prototype = DocumentNode.prototype;
MultiAnnotation.prototype = new MultiAnnotation.Prototype();
MultiAnnotation.prototype.constructor = MultiAnnotation;

MultiAnnotation.prototype.defineProperties();

module.exports = MultiAnnotation;

},{"../node/node":217}],216:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./node"),
  View: require("./node_view"),
  Surface: require("./node_surface")
};

},{"./node":217,"./node_surface":218,"./node_view":219}],217:[function(require,module,exports){
"use strict";

var _ = require("underscore");

// Substance.DocumentNode
// -----------------

var DocumentNode = function(node, document) {
  this.document = document;
  this.properties = node;
};

// Type definition
// --------
//

DocumentNode.type = {
  "parent": "content",
  "properties": {
  }
};

DocumentNode.Prototype = function() {

  this.toJSON = function() {
    return _.clone(this.properties);
  };

  this.getAnnotations = function() {
    return this.document.getIndex("annotations").get(this.properties.id);
  };

  this.isInstanceOf = function(type) {
    var schema = this.document.getSchema();
    return schema.isInstanceOf(this.type, type);
  };

  this.defineProperties = function(readonly) {
    if (!this.hasOwnProperty("constructor")) {
      throw new Error("Constructor property is not set. E.g.: MyNode.prototype.constructor = MyNode;");
    }
    var NodeClass = this.constructor;
    DocumentNode.defineAllProperties(NodeClass, readonly);
  };
};

DocumentNode.prototype = new DocumentNode.Prototype();
DocumentNode.prototype.constructor = DocumentNode;

DocumentNode.defineProperties = function(NodePrototype, properties, readonly) {
  _.each(properties, function(name) {
    var spec = {
      get: function() {
        return this.properties[name];
      }
    };
    if (!readonly) {
      spec["set"] = function(val) {
        this.properties[name] = val;
        return this;
      };
    }
    Object.defineProperty(NodePrototype, name, spec);
  });
};

DocumentNode.defineAllProperties = function(NodeClass, readonly) {
  DocumentNode.defineProperties(NodeClass.prototype, Object.keys(NodeClass.type.properties), readonly);
};

DocumentNode.defineProperties(DocumentNode.prototype, ["id", "type"]);

module.exports = DocumentNode;

},{"underscore":273}],218:[function(require,module,exports){
"use strict";

var SurfaceComponent = require("./surface_component");

// Node.Surface
// ========
//
// A NodeSurface describes the structure of a node view and takes care of
// selection mapping.
// It is an adapter to Substance.Surface. Particularly, Substance.Document.Container needs
// this to establish the Model coordinate system.
//
// A Model coordinate is a tuple `(nodePos, charPos)` which describes a position in
// a document's view.
// As nodes can be rendered very arbitrarily and also hierarchically, the Container creates
// a flattened sequence of components.
//
// For instance, consider a Figure node which basicallly consists of three components: label, image, and caption.
// In the `content` view the Figure node is registered e.g., as `figure_1`.
// The container would expand this (roughly) to [ [`figure1`, `label`], [`figure1`, `image`], [`caption1`] ].
// I.e., it expands the single node into a flat representation of its sub-components.
// We call this representation the surface of a node.
//
// There are several kinds of components: nodes, properties, and others.
// If a node does not have any sub-components it has a node-component as its surface.
// If a component that represents a node's property is provided by the property-component.
// For all other cases we introduced a custom component type.
//
// The Container uses the Node surfaces for building a Document coordinate domain.
// The main Surface uses Node surfaces to compute mappings between DOM coordinates to Document coordinates, and vice versa.

var __id__ = 0;

var NodeSurface = function(node, surfaceProvider) {
  this.__id__ = __id__++;

  this.node = node;
  this.surfaceProvider = surfaceProvider;

  // To be able to use the surface for selection mapping a view instance
  // must be attached
  this.view = null;

  this.components = [];
};

NodeSurface.Prototype = function() {

  this.hasView = function() {
    return (this.view !== null);
  };

  this.attachView = function(view) {
    this.view = view;
  };

  this.detachView = function() {
    this.view = null;
  };

  // Retrieves the corresponding character position for the given DOM position.
  // --------
  //

  this.getCharPosition = function(el, offset) {
    if (!this.view) {
      throw new Error("No view attached.");
    }

    var charPos = this.__getCharPosition__(el, offset);
    // console.log("Cover.View: getCharPosition()", charPos);
    return charPos;
  };

  // Retrieves the corresponding DOM position for a given character.
  // --------
  //

  this.getDOMPosition = function(charPos) {
    if (!this.view) {
      throw new Error("No view attached.");
    }

    var range = this.__getDOMPosition__(charPos);
    // console.log("Cover.View: getDOMPosition()", range);
    return range;
  };

  this.__getCharPosition__ = function(el, offset) {
    var range = window.document.createRange();
    range.setStart(el, offset);

    var charPos = 0;

    for (var i = 0; i < this.components.length; i++) {
      var component = this.components[i];

      var cmpStart = range.compareBoundaryPoints(0, component.getRange());

      // console.log("Comparing boundaries for", component.label, "START", cmpStart);
      if (cmpStart < 0) {
        break;
      }

      var cmpEnd = range.compareBoundaryPoints(3, component.getRange());
      // console.log("Comparing boundaries for", component.label, "END", cmpEnd);

      // the cursor is within this component
      if (cmpEnd < 0) {
        charPos = offset;
      } else {
        charPos = component.length;
      }
    }

    return charPos;
  };

  this.__getDOMPosition__ = function(charPos) {
    var l, component;
    for (var i = 0; i < this.components.length; i++) {
      component = this.components[i];

      l = component.getLength();

      if (charPos<l) {
        return component.mapCharPos(charPos);
      } else {
        charPos -= l;
      }
    }
    return component.mapCharPos(l);
  };

  this.__createRange__ = function(el) {
    var range = window.document.createRange();
    range.selectNode(el);
    return range;
  };

};
NodeSurface.prototype = new NodeSurface.Prototype();

NodeSurface.SurfaceComponent = SurfaceComponent;

module.exports = NodeSurface;

},{"./surface_component":220}],219:[function(require,module,exports){
"use strict";

var View = require("substance-application").View;
var _ = require("underscore");

var __node_view_counter__ = 0;

var NodeView = function(node, viewFactory) {
  this.__id__ = __node_view_counter__++;

  View.call(this);

  this.node = node;
  this.viewFactory = viewFactory;

  this.$el.addClass('content-node').addClass(node.type.replace("_", "-"));
  this.$el.attr('id', this.node.id);
};

NodeView.Prototype = function() {

  // Rendering
  // --------
  //
  this.render = function() {
    // TODO: if we have a problem here currently
    // In ListView, it seems that the item views are disposed when rerendered,
    // but the new views are not connected properly
    this.disposeChildViews();

    this.el.innerHTML = "";
    this.content = window.document.createElement("DIV");
    this.content.classList.add("content");
    this.el.appendChild(this.content);
    return this;
  };

  this.dispose = function() {
    this.stopListening();
    this.disposeChildViews();
  };

  this.disposeChildViews = function() {
    if (this.childViews) {
      _.each(this.childViews, function(view) {
        if (view) view.dispose();
      });
    }
  };

  // A general graph update listener that dispatches
  // to `this.onNodeUpdate(op)`
  // --------
  //

  this.onGraphUpdate = function(op, target, options) {
    /* jshint unused:false */
    if(op.path[0] === this.node.id && (op.type === "update" || op.type === "set") ) {
      this.onNodeUpdate(op);
      return true;
    } else {
      return false;
    }
  };

  // Callback to get noticed about updates applied to the underlying node.
  // --------
  //

  this.onNodeUpdate = function(/*op*/) {
    // do nothing by default
  };

  this.onFocus = function() {
    // console.log("focussed node view", this.__id__);
  };

  this.onBlur = function() {
    // console.log("blurred node view", this.__id__);
  };

  this.later = function(f) {
    var self = this;
    window.setTimeout(function() {
      f.call(self);
    }, 0);
  };

};

NodeView.Prototype.prototype = View.prototype;
NodeView.prototype = new NodeView.Prototype();

module.exports = NodeView;

},{"substance-application":10,"underscore":273}],220:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Component = require("substance-document").Component;

var __createRange__ = function(el) {
  var range = window.document.createRange();
  range.selectNode(el);
  return range;
};

function SurfaceComponent(nodeSurface, root, path, options) {
  Component.call(this, root, path, options);

  this.surface = nodeSurface;
  this.__range__ = null;
  this.__el__ = null;

  if (options) {
    if (options.element) {
      this.__getElement__ = options.element;
    }

    if (options.mapCharPos) {
      this.__mapCharPos__ = options.mapCharPos;
    }
  }
};

SurfaceComponent.Prototype = function() {

  /**
   * Returns the DOM element associated with this component.
   *
   * A sub-class must provide an implementation.
   */
  this.__getElement__ = function() {
    throw new Error("This method is abstract and must be overridden");
  };

  /**
   * Implementation of the character position mapper.
   *
   * Returns an array [el, offset].
   */
  this.__mapCharPos__ = function(/*charPos*/) {
    throw new Error("This method is abstract and must be overridden");
  };

  /**
   * Maps a character position to a pair of (DOM element, offset).
   */
  this.mapCharPos = function(charPos) {
    return this.__mapCharPos__.call(this, charPos);
  };


  /**
   * Legacy method for accessing the length property.
   */
  this.getElement = function() {
    return this.el;
  };

  /**
   * Legacy method for accessing the range property.
   */
  this.getRange = function() {
    return this.range;
  };
};

SurfaceComponent.Prototype.prototype = Component.prototype;
SurfaceComponent.prototype = new SurfaceComponent.Prototype();

Object.defineProperties(SurfaceComponent.prototype, {
  "range": {
    get: function() {
      if (!this.__range__) {
        this.__range__ = __createRange__(this.el);
      }
      return this.__range__;
    }
  },
  "el": {
      get: function() {
      if (!this.__el__) {
        this.__el__ = this.__getElement__.call(this);
        if (!this.__el__) {
          throw new Error("You tried to access a component which has not been rendered!");
        }
      }
      return this.__el__;
    }
  }
});

module.exports = SurfaceComponent;

},{"substance-document":136,"underscore":273}],221:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./person_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./person_reference":222}],222:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var PersonReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

PersonReference.type = {
  "id": "location_reference",
  "parent": "annotation",
  "properties": {
    "target": "string"
  }
};

// This is used for the auto-generated docs
// -----------------
//

PersonReference.description = {
  "name": "PersonReference",
  "remarks": [
    "References a range in a text-ish node and references a person node."
  ],
  "properties": {
  }
};


// Example PersonReference annotation
// -----------------
//

PersonReference.example = {
  "id": "person_reference_1",
  "type": "person_reference",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

PersonReference.Prototype = function() {};

PersonReference.Prototype.prototype = Annotation.prototype;
PersonReference.prototype = new PersonReference.Prototype();
PersonReference.prototype.constructor = PersonReference;

PersonReference.prototype.defineProperties();

module.exports = PersonReference;

},{"../annotation/annotation":150}],223:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./publication_info"),
  View: require("./publication_info_view")
};

},{"./publication_info":224,"./publication_info_view":225}],224:[function(require,module,exports){
var _ = require('underscore');
var DocumentNode = require('../node/node');
var License = require("../license/license");

// Substance.PublicationInfo
// -----------------
//

var PublicationInfo = function(node, doc) {
  DocumentNode.call(this, node, doc);
};

// Type definition
// -----------------
//

PublicationInfo.type = {
  "id": "publication_info",
  "parent": "content",
  "properties": {

  }
};

// This is used for the auto-generated docs
// -----------------
//

PublicationInfo.description = {
  "name": "PublicationInfo",
  "remarks": [
    "Describes an article contributor such as an author or editor.",
  ],
  "properties": {
    "name": "Full name.",
  }
};

// Example Video
// -----------------
//

PublicationInfo.example = {
  "id": "publication_info",
  "type": "publication_info",
  "description": "Revising the article, data cleanup"
};

PublicationInfo.Prototype = function() {

  this.getLicense = function() {
    var license = this.document.get('license');
    return license ? license.code : null;
  };

  this.setLicense = function(code) {
    this.document.delete("license");
    this.document.create(License.available_licenses[code]);
  };

};

PublicationInfo.Prototype.prototype = DocumentNode.prototype;
PublicationInfo.prototype = new PublicationInfo.Prototype();
PublicationInfo.prototype.constructor = PublicationInfo;

PublicationInfo.prototype.defineProperties();

// Property aliases
// ----


module.exports = PublicationInfo;

},{"../license/license":208,"../node/node":217,"underscore":273}],225:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var NodeView = require("../node").View;
var $$ = require("substance-application").$$;
var License = require("../license").Model;


// Substance.Contributor.View
// ==========================================================================

var PublicationInfoView = function(node) {
  NodeView.call(this, node);

  this.$el.attr({id: node.id});
  this.$el.addClass("content-node publication-info");

  this.$el.on('change', "#license", _.bind(this.updateLicense, this));
  this.$el.on('change', "#published_on", _.bind(this.updatePublicationDate, this));
};

PublicationInfoView.Prototype = function() {

  this.updatePublicationDate = function(e) {
    var text = this.$('#published_on');
    console.log('Published_on', text);
  };

  this.updateLicense = function(e) {
    var license = this.$('#license').val();
    this.node.setLicense(license);
  };

  // Render it
  // --------
  //

  this.render = function() {
    NodeView.prototype.render.call(this);

    // Resource Body
    // -------
    //
    // Wraps all the contents of the resource card

    var body = $$('.resource-body', {contenteditable: false});

    var formattedDates = {
      "created_at": new Date(this.node.document.created_at).toDateString(),
      "updated_at": jQuery.timeago(new Date(this.node.document.updated_at)),
      "published_on": new Date(this.node.document.published_on).toDateString()
    };

    // Project
    // -------

    var projectEl = $$('.project', {
      children: [
        $$('.label', {text: "Project"}),
        $$('.value', {html: this.node.document.project})
      ]
    });

    body.appendChild(projectEl);


    // Location
    // -------

    var locationEl = $$('.location', {
      children: [
        $$('.label', {text: "Location"}),
        $$('.value', {html: this.node.document.location})
      ]
    });

    body.appendChild(locationEl);

    // Place
    // -------

    var placeEl = $$('.place', {
      children: [
        $$('.label', {text: "Place"}),
        $$('.value', {html: this.node.document.place})
      ]
    });

    body.appendChild(placeEl);

    // Interview type
    // -------

    var interviewTypeEl = $$('.place', {
      children: [
        $$('.label', {text: "Interview type"}),
        $$('.value', {html: "Video"})
      ]
    });

    body.appendChild(interviewTypeEl);

    // Interview duration
    // -------

    var interviewDurationEl = $$('.place', {
      children: [
        $$('.label', {text: "Duration"}),
        $$('.value', {html: this.node.interview_duration})
      ]
    });

    body.appendChild(interviewDurationEl);

    // Keywords
    // ------- 

    var keyWordSelector = $$('input#interview_keywords', {
      style: "width: 300px",
      children: [
      ]
    });

    var keywordsEl = $$('.keywords', {
      children: [
        $$('.label', {text: "Keywords"}),
        keyWordSelector
      ]
    });

    body.appendChild(keywordsEl);

    // Activate select box
    $(keyWordSelector).select2({
      tags:["Cat", "Dog", "Rhinozeros"],
      placeholder: "Enter keywords"
    });

    // Credits
    // -------

    // var creditsEl = $$('.credits', {
    //   children: [
    //     $$('.label', {text: "Credits"}),
    //     $$('.credits', {html: "Interview by Daniel Beilinson Cover photo by John Foo"})
    //   ]
    // });

    // body.appendChild(creditsEl);

    // var license = $$('.license', {
    //   children: [
    //     $$('.label', {text: "Choose License"}),
    //     $$('select#license', {
    //       children: _.map(License.available_licenses, function(l) {
    //         var attrs = {value: l.code, text: l.name};
    //         if (this.node.getLicense() === l.code) attrs["selected"] = "selected";
    //         return $$('option', attrs);
    //       }, this)
    //     })
    //   ]
    // });

    // body.appendChild(license);


    var dates = $$('.dates', {
      html: [
        'This article was created on <b>',
        formattedDates["created_at"],
        '</b> and published on <b>',
        formattedDates["published_on"],
        '</b>. Last update was made ',
        '<span class="updated-at"><b>'+formattedDates["updated_at"]+'</b></span>.'
      ].join('')
    });

    body.appendChild(dates);

    this.content.appendChild(body);



    return this;
  };

  this.updateModificationDate = function() {
    var dat = jQuery.timeago(new Date(this.node.document.updated_at));
    this.$('.updated-at').html(dat);
  };

  this.onGraphUpdate = function(op) {
    // Call super handler and return if that has processed the operation already
    if (NodeView.prototype.onGraphUpdate.call(this, op)) {
      return true;
    }
    // When published date has changed, rerender
    if (_.isEqual(op.path, ["document","published_on"])) {
      this.render();
      return true;
    } else {
      this.updateModificationDate();
      return true;
    }
  };

  this.dispose = function() {
    NodeView.prototype.dispose.call(this);
  };
};

PublicationInfoView.Prototype.prototype = NodeView.prototype;
PublicationInfoView.prototype = new PublicationInfoView.Prototype();

module.exports = PublicationInfoView;

},{"../license":207,"../node":216,"substance-application":10,"underscore":273}],226:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./remark"),
  View: require("./remark_view")
};

},{"./remark":227,"./remark_view":228}],227:[function(require,module,exports){
"use strict";

var Issue = require('../issue/issue');

var Remark = function(node, document) {
  Issue.call(this, node, document);
};

// Type definition
// --------

Remark.type = {
  "id": "remark",
  "parent": "issue",
  "properties": {
  }
};

// This is used for the auto-generated docs
// -----------------
//

Remark.description = {
  "name": "Remark",
  "remarks": [
    "References a range in a text-ish node and tags it as emphasized"
  ],
  "properties": {
  }
};

// Example Remark annotation
// -----------------
//

Remark.example = {
  "type": "remark",
  "id": "remark_1",
  "title": "Can you explain?",
  "description": "I don't get the argument here."
};

Remark.Prototype = function() {};

Remark.Prototype.prototype = Issue.prototype;
Remark.prototype = new Remark.Prototype();
Remark.prototype.constructor = Remark;

module.exports = Remark;

},{"../issue/issue":205}],228:[function(require,module,exports){
"use strict";

var IssueView = require("../issue/issue_view");

var RemarkView = function(node, viewFactory) {
  IssueView.call(this, node, viewFactory);
};

RemarkView.Prototype = function() {

};

RemarkView.Prototype.prototype = IssueView.prototype;
RemarkView.prototype = new RemarkView.Prototype();

module.exports = RemarkView;

},{"../issue/issue_view":206}],229:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./remark_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./remark_reference":230}],230:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var RemarkReference = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

RemarkReference.type = {
  "id": "remark_reference",
  "parent": "annotation",
  "properties": {
    "target": "remark"
  }
};

// This is used for the auto-generated docs
// -----------------
//

RemarkReference.description = {
  "name": "RemarkReference",
  "remarks": [
    "References a range in a text-ish node and references a remark"
  ],
  "properties": {
    "target": "Referenced remark id"
  }
};


// Example RemarkReference annotation
// -----------------
//

RemarkReference.example = {
  "type": "remark_reference_1",
  "id": "remark_reference_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

RemarkReference.Prototype = function() {};

RemarkReference.Prototype.prototype = Annotation.prototype;
RemarkReference.prototype = new RemarkReference.Prototype();
RemarkReference.prototype.constructor = RemarkReference;

RemarkReference.prototype.defineProperties();

module.exports = RemarkReference;

},{"../annotation/annotation":150}],231:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./strong"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./strong":232}],232:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var Strong = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

Strong.type = {
  "id": "strong",
  "parent": "annotation",
  "properties": {
  }
};


// This is used for the auto-generated docs
// -----------------
//

Strong.description = {
  "name": "Strong",
  "remarks": [
    "References a range in a text-ish node and tags it as strong emphasized"
  ],
  "properties": {
  }
};


// Example Strong annotation
// -----------------
//

Strong.example = {
  "type": "strong",
  "id": "strong_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

Strong.Prototype = function() {};

Strong.Prototype.prototype = Annotation.prototype;
Strong.prototype = new Strong.Prototype();
Strong.prototype.constructor = Strong;

module.exports = Strong;

},{"../annotation/annotation":150}],233:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./subject_reference"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./subject_reference":234}],234:[function(require,module,exports){
"use strict";

var MultiAnnotation = require('../multi_annotation/multi_annotation');

var SubjectReference = function(node, document) {
  MultiAnnotation.call(this, node, document);
};

// Type definition
// --------

SubjectReference.type = {
  "id": "subject_reference",
  "parent": "multi_annotation",
  "properties": {
    "target": ["array", "string"]
  }
};

SubjectReference.Prototype = function() {};

SubjectReference.Prototype.prototype = MultiAnnotation.prototype;
SubjectReference.prototype = new SubjectReference.Prototype();
SubjectReference.prototype.constructor = SubjectReference;

SubjectReference.prototype.defineProperties();

module.exports = SubjectReference;

},{"../multi_annotation/multi_annotation":215}],235:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./subscript"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./subscript":236}],236:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var Subscript = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

Subscript.type = {
  "id": "subscript",
  "parent": "annotation",
  "properties": {
  }
};


// This is used for the auto-generated docs
// -----------------
//

Subscript.description = {
  "name": "Subscript",
  "remarks": [
    "References a range in a text-ish node and tags it as subscript"
  ],
  "properties": {
  }
};


// Example Subscript annotation
// -----------------
//

Subscript.example = {
  "type": "subscript",
  "id": "subscript_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};

Subscript.Prototype = function() {};

Subscript.Prototype.prototype = Annotation.prototype;
Subscript.prototype = new Subscript.Prototype();
Subscript.prototype.constructor = Subscript;

module.exports = Subscript;

},{"../annotation/annotation":150}],237:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./superscript"),
  View: require('../annotation/annotation_view')
};

},{"../annotation/annotation_view":151,"./superscript":238}],238:[function(require,module,exports){
"use strict";

var Annotation = require('../annotation/annotation');

var Superscript = function(node, document) {
  Annotation.call(this, node, document);
};

// Type definition
// --------

Superscript.type = {
  "id": "superscript",
  "parent": "annotation",
  "properties": {
  }
};


// This is used for the auto-generated docs
// -----------------
//

Superscript.description = {
  "name": "Superscript",
  "remarks": [
    "References a range in a text-ish node and tags it as strong emphasized"
  ],
  "properties": {
  }
};


// Example Superscript annotation
// -----------------
//

Superscript.example = {
  "type": "strong",
  "id": "superscript_1",
  "path": [
    "text_54",
    "content"
  ],
  "range": [
    85,
    95
  ]
};


Superscript.Prototype = function() {};

Superscript.Prototype.prototype = Annotation.prototype;
Superscript.prototype = new Superscript.Prototype();
Superscript.prototype.constructor = Superscript;

module.exports = Superscript;

},{"../annotation/annotation":150}],239:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./text_node"),
  View: require("./text_view"),
  Surface: require("./text_surface")
};

},{"./text_node":240,"./text_surface":241,"./text_view":242}],240:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var SRegExp = require("substance-regexp");
var Operator = require('substance-operator');
var ObjectOperation = Operator.ObjectOperation;
var TextOperation = Operator.TextOperation;
var DocumentNode = require("../node/node");

// Substance.Text
// -----------------
//

var Text = function(node, document) {
  DocumentNode.call(this, node, document);
};


Text.type = {
  "id": "text",
  "parent": "content",
  "properties": {
    "source_id": "string",
    "content": "string"
  }
};


// This is used for the auto-generated docs
// -----------------
//

Text.description = {
  "name": "Text",
  "remarks": [
    "A simple text fragement that can be annotated. Usually text nodes are combined in a paragraph.",
  ],
  "properties": {
    "source_id": "Text element source id",
    "content": "Content"
  }
};


// Example Paragraph
// -----------------
//

Text.example = {
  "type": "paragraph",
  "id": "paragraph_1",
  "content": "Lorem ipsum dolor sit amet, adipiscing elit.",
};


Text.Prototype = function() {

  this.getChangePosition = function(op) {
    if (op.path[1] === "content") {
      var lastChange = Operator.Helpers.last(op.diff);
      if (lastChange.isInsert()) {
        return lastChange.pos+lastChange.getLength();
      } else if (lastChange.isDelete()) {
        return lastChange.pos;
      }
    }
    return -1;
  };

  this.getLength = function() {
    return this.properties.content.length;
  };

  this.insertOperation = function(charPos, text) {
    return ObjectOperation.Update([this.properties.id, "content"],
      TextOperation.Insert(charPos, text));
  };

  this.deleteOperation = function(startChar, endChar) {
    var content = this.properties.content;
    return ObjectOperation.Update([this.properties.id, "content"],
      TextOperation.Delete(startChar, content.substring(startChar, endChar)),
      "string");
  };

  this.prevWord = function(charPos) {

    var content = this.properties.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\b\w/g).match(content);
    var prevBounds = _.select(wordBounds, function(m) {
      return m.index < charPos;
    }, this);

    // happens if there is some leading non word stuff
    if (prevBounds.length === 0) {
      return 0;
    } else {
      return _.last(prevBounds).index;
    }
  };

  this.nextWord = function(charPos) {
    var content = this.properties.content;

    // Matches all word boundaries in a string
    var wordBounds = new SRegExp(/\w\b/g).match(content.substring(charPos));

    // at the end there might be trailing stuff which is not detected as word boundary
    if (wordBounds.length === 0) {
      return content.length;
    }
    // before, there should be some boundaries
    else {
      var nextBound = wordBounds[0];
      return charPos + nextBound.index + 1;
    }
  };

  this.canJoin = function(other) {
    return (other instanceof Text);
  };

  this.join = function(doc, other) {
    var pos = this.properties.content.length;
    var text = other.content;

    doc.update([this.id, "content"], [pos, text]);
    var annotations = doc.getIndex("annotations").get(other.id);

    _.each(annotations, function(anno) {
      doc.set([anno.id, "path"], [this.properties.id, "content"]);
      doc.set([anno.id, "range"], [anno.range[0]+pos, anno.range[1]+pos]);
    }, this);
  };

  this.isBreakable = function() {
    return true;
  };

  this.break = function(doc, pos) {
    var tail = this.properties.content.substring(pos);

    // 1. Create a new node containing the tail content
    var newNode = this.toJSON();
    // letting the textish node override the type of the new node
    // e.g., a 'heading' breaks into a 'paragraph'
    newNode.type = this.splitInto ? this.splitInto : this.properties.type;
    newNode.id = doc.uuid(this.properties.type);
    newNode.content = tail;
    doc.create(newNode);

    // 2. Move all annotations
    var annotations = doc.getIndex("annotations").get(this.properties.id);
    _.each(annotations, function(annotation) {
      if (annotation.range[0] >= pos) {
        doc.set([annotation.id, "path"], [newNode.id, "content"]);
        doc.set([annotation.id, "range"], [annotation.range[0]-pos, annotation.range[1]-pos]);
      }
    });

    // 3. Trim this node's content;
    doc.update([this.properties.id, "content"], TextOperation.Delete(pos, tail));

    // return the new node
    return newNode;
  };

};

Text.Prototype.prototype = DocumentNode.prototype;
Text.prototype = new Text.Prototype();
Text.prototype.constructor = Text;

Text.prototype.defineProperties();

module.exports = Text;

},{"../node/node":217,"substance-operator":250,"substance-regexp":259,"underscore":273}],241:[function(require,module,exports){
"use strict";

var NodeSurface = require("../node/node_surface");
var SurfaceComponent = require("../node/surface_component");

var TextSurface = function(node, surfaceProvider, options) {
  NodeSurface.call(this, node, surfaceProvider);
  options = options || {};
  var self = this;

  this.property = options.property || "content";

  if (self.node[self.property] === undefined) {
    throw new Error("Illegal property", self.node, self.property);
  }

  // default implementation for component.length
  options.length = options.length || function() {
    return self.node[self.property].length;
  };

  var component = new SurfaceComponent(this, options.root || node, [node.id, self.property], options);

  if (options.property) {
    // HACK: this does not work for arbitrarily nested views
    component.__getElement__ = function() {
      return self.view.childViews[self.property].el;
    };
  } else {
    component.__getElement__ = function() {
      return self.view.el;
    };
  }

  this.components.push(component);
};

// This surface has not been refactored. We simply override the default implementation
// and use the existing implementation.
TextSurface.Prototype = function() {

  this.getCharPosition = function(el, offset) {
    if (!this.view) {
      throw new Error("No view attached.");
    }

    // Bootstrapping: cases that happened with empty text node.
    // In these cases we return charPos = 0
    if (this.view._fragments.length === 0) {
      return 0;
    }

    // This one occurs with empty nodes and after softbreaks in otherwise empty nodes
    // i.e., the selection anchor is the the parentElement
    if (el === this.view._fragments[0].el.parentElement) {
      if (offset === 0) {
        // console.log("TextSurface.getCharPosition() HACK2: 0");
        return 0;
      } else {
        // console.log("TextSurface.getCharPosition() HACK2: ", this.components[0].length);
        return this.components[0].length;
      }
    }

    // Otherwise find the correct TEXT element
    var frag;
    for (var i = 0; i < this.view._fragments.length; i++) {
      var f = this.view._fragments[i];
      if (f.el === el) {
        frag = f;
        break;
      }
    }

    if (!frag) {
      console.error("TextSurface.getCharPosition(): Could not lookup text element.", el);
      throw new Error("Could not lookup text element.");
    }

    var charPos = frag.charPos + offset;

    // console.log("TextSurface.getCharPosition(): ", charPos);
    return charPos;
  };

  // Returns the corresponding DOM element position for the given character
  // --------
  //
  // A DOM position is specified by a tuple of element and offset.
  // In the case of text nodes it is a TEXT element.

  this.getDOMPosition = function(charPos) {
    if (!this.view) {
      throw new Error("No view attached.");
    }
    var result = this.view._lookupPostion(charPos);
    var frag = result[0];
    var offset = result[1];

    var range = window.document.createRange();
    range.setStart(frag.el, offset);
    return range;
  };

  this.getComponent = function() {
    return this.components[0];
  };
};
TextSurface.Prototype.prototype = NodeSurface.prototype;
TextSurface.prototype = new TextSurface.Prototype();

// A helper which turned out to be useful for editable textish properties
// --------
// The node view must provide a corresponding view under `childViews[property]`

TextSurface.textProperty = function(nodeSurface, property, options) {
  options = options || {};

  // propagate the root node
  options.root = options.root || nodeSurface.node;
  options.name = property;

  var node = nodeSurface.node;

  if (options.path) {
    node = nodeSurface.node.document.get(options.path[0]);
    options.alias = [nodeSurface.node.id, property];
  } else {
    options.property = property;
  }

  var propertySurface = new TextSurface(node, nodeSurface.surfaceProvider, options);
  var propertyComponent = propertySurface.components[0];
  return propertyComponent;
};

module.exports = TextSurface;

},{"../node/node_surface":218,"../node/surface_component":220}],242:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Fragmenter = require("substance-util").Fragmenter;
var Annotator = require("substance-document").Annotator;

var NodeView = require("../node").View;

function _getAnnotationBehavior(doc) {
  var annotationBehavior = doc.getAnnotationBehavior();
  if (!annotationBehavior) {
    throw new Error("Missing AnnotationBehavior.");
  }
  return annotationBehavior;
}

var __id__ = 0;

var TextView = function(node, viewFactory, options) {
  NodeView.call(this, node, viewFactory, options);
  options = options || {};

  // NOTE: left for debugging purposes
  this.__id__ = __id__++;
  // console.log("Creating text view...", this.__id__);

  this.property = options.property || "content";
  this.propertyPath = options.propertyPath || [this.node.id, this.property];

  this.$el.addClass('content-node text');

  if (node.type === "text") {
    this.$el.addClass("text-node");
  }

  // If TextView is used to display a custom property,
  // we don't have an id. Only full-fledged text nodes
  // have id's.
  if (options.property) {
    // Note: currently NodeView sets the id. In this mode the must not be set
    // as we are displaying a textish property of a node, not a text node.
    // IMO it is ok to have the id set by default, as it is the 99% case.
    this.$el.removeAttr('id');
    this.$el.removeClass('content-node');
    this.$el.addClass(options.property);
  }

  this.$el.attr('data-path', this.property);

  this._annotations = {};
  this.annotationBehavior = _getAnnotationBehavior(node.document);

  // Note: due to (nested) annotations this DOM node is fragmented
  // into several child nodes which contain a primitive DOM TextNodes.
  // We wrap each of these nodes into a Fragment object.
  // A Fragment object offers the chance to override things like the
  // interpreted length or the manipulation behavior.
  this._fragments = [];
};

var _findTextEl;

TextView.Prototype = function() {

  var __super__ = NodeView.prototype;
  // Rendering
  // =============================
  //

  this.render = function(enhancer) {
    __super__.render.call(this, enhancer);

    this.renderContent();

    return this;
  };

  this.renderContent = function() {
    // console.log("TextView.renderContent", this.__id__);
    this.content.innerHTML = "";
    this._annotations = this.node.document.getIndex("annotations").get(this.propertyPath);
    this.renderWithAnnotations(this._annotations);

    // EXPERIMENTAL: trying to fix some issues that we think other implementations handle
    // with a trailing <br>
    var br = window.document.createElement("BR");
    this.content.appendChild(br);

    var text = this.getText();
    // console.log("TextView.renderContent() add empty?", this.__id__, this.propertyPath, text.length);
    if (text.length === 0 && !this.__hasFocus) {
      this.content.classList.add('empty');
    }
  };

  this.onBlur = function() {
    var text = this.getText();
    this.__hasFocus = false;
    if (!text || text.length === 0) {
      this.content.classList.add('empty');
    } else {
      this.content.classList.remove('empty');
    }
  };

  this.onFocus = function() {
    // console.log("TextView.onFocus", this.__id__, this.propertyPath);
    this.__hasFocus = true;
    this.content.classList.remove('empty');
  };

  this.insert = function(pos, str) {
    // console.log("TextView.insert",pos, str, this.__id__);
    var result = this._lookupPostion(pos);
    var frag = result[0];
    var textNode = frag.el;
    var offset = result[1];

    var text = textNode.textContent;
    text = text.substring(0, offset) + str + text.substring(offset);
    textNode.textContent = text;

    // update the cached fragment positions
    for (var i = frag.index+1; i < this._fragments.length; i++) {
      this._fragments[i].charPos += str.length;
    }
  };

  this.delete = function(pos, length) {
    // console.log("TextView.delete", pos, length, this.__id__);
    if (length === 0) {
      console.log("FIXME: received empty deletion which could be avoided.");
      return;
    }

    var result = this._lookupPostion(pos, "delete");
    var frag = result[0];
    var textNode = frag.el;
    var offset = result[1];

    var text = textNode.textContent;

    // can not do this incrementally if it is a greater delete
    if (offset+length > text.length) {
      this.renderContent();
      return;
    }

    text = text.substring(0, offset) + text.substring(offset+length);
    textNode.textContent = text;

    // update the cached fragment positions
    for (var i = frag.index+1; i < this._fragments.length; i++) {
      this._fragments[i].charPos -= length;
    }
  };

  // Lookup a fragment for the given position.
  // ----
  // For insertions, the annotation level is considered on annotation boundaries,
  // i.e., if the annotation is exclusive, then the outer element/fragment is returned.
  // For deletions the annotation exclusivity is not important
  // i.e., the position belongs to the next fragment
  this._lookupPostion = function(pos, is_delete) {
    var frag, l;
    for (var i = 0; i < this._fragments.length; i++) {
      frag = this._fragments[i];
      l = frag.getLength();

      // right in the middle of a fragment
      if (pos < l) {
        return [frag, pos];
      }
      // the position is not within this fragment
      else if (pos > l) {
        pos -= l;
      }
      // ... at the boundary we consider the element's level
      else {
        var next = this._fragments[i+1];
        // if the element level of the next fragment is lower then we put the cursor there
        if (next && next.level < frag.level || is_delete) {
          return [next, 0];
        }
        // otherwise we leave the cursor in the current fragment
        else {
          return [frag, l];
        }
      }
    }
    return [frag, l];
  };

  this.onNodeUpdate = function(op) {
    if (_.isEqual(op.path, this.propertyPath)) {
      // console.log("Updating text view: ", op);
      if (op.type === "update") {
        var update = op.diff;
        if (update.isInsert()) {
          this.insert(update.pos, update.str);
          return true;
        } else if (update.isDelete()) {
          this.delete(update.pos, update.str.length);
          return true;
        }
      } else if (op.type === "set") {
        this.renderContent();
        return true;
      }
    }
    return false;
  };

  this.onGraphUpdate = function(op, graph, target, options) {
    // chronicled operations need to be rendered non-incrementally
    if(options && options["chronicle"]) {
      // console.log("non incremental update as it is a chronicled op");
      this.renderContent();
      return true;
    }

    // Call super handler and return if that has processed the operation already
    if (__super__.onGraphUpdate.call(this, op)) {
      return true;
    }

    if (_.isEqual(op.path, this.propertyPath)) {
      this.onNodeUpdate(op);
      return true;
    }

    // Otherwise deal with annotation changes
    if (Annotator.changesAnnotations(this.node.document, op, this.propertyPath)) {
      if (op.type === "create" || op.type === "delete" ||
          op.path[1] === "path" || op.path[1] === "range") {

        // NOTE: the last condition applies to all annotation range updates
        // However, due to the incremental nature of this implementation
        // it is not necessary to trigger a full rerender when content has been
        // changed incrementally.
        if (op.data && op.data["incremental"]) {
          // console.log("... change is incremental");
          return false;
        }

        // console.log("Rerendering TextView due to annotation update", op);
        this.renderContent();
        return true;
      }
    }

    return false;
  };

  this.createAnnotationView = function(entry) {
    var annotation = this.node.document.get(entry.id);
    var AnnotationView = this.viewFactory.getNodeViewClass(annotation);
    var annotationView = new AnnotationView(annotation, this.viewFactory);
    return annotationView;
  };

  this.getText = function() {
    return this.node.document.get(this.propertyPath);
  };

  this.renderWithAnnotations = function(annotations) {
    var self = this;
    var text = this.getText();
    var fragment = window.document.createDocumentFragment();

    // this splits the text and annotations into smaller pieces
    // which is necessary to generate proper HTML.
    var fragmenter = new Fragmenter(this.annotationBehavior.levels);

    this._fragments = [];

    var _entry = null;
    var _index = 0;
    var _charPos = 0;
    var _level  = 0;

    fragmenter.onText = function(context, text) {
      var el = window.document.createTextNode(text);

      // Note: we create the data structures to allow lookup fragments
      // for coordinate mapping and incremental changes
      // TODO: to override the Fragment behavior we would need to override this
      self._fragments.push(new TextView.DefaultFragment(el, _index++, _charPos, _level));
      _charPos += text.length;
      context.appendChild(el);
    };

    fragmenter.onEnter = function(entry, parentContext) {
      _entry = entry;
      _level++;
      var annotationView = self.createAnnotationView(entry);
      parentContext.appendChild(annotationView.render().el);
      return annotationView;
    };

    fragmenter.onExit = function() {
      _level--;
    };

    // this calls onText and onEnter in turns...
    fragmenter.start(fragment, text, annotations);

    // set the content
    this.content.innerHTML = "";
    this.content.appendChild(fragment);
  };

  // Free the memory
  // --------

  this.dispose = function() {
    this.stopListening();
  };
};

TextView.Prototype.prototype = NodeView.prototype;
TextView.prototype = new TextView.Prototype();

var _unshiftAll = function(arr, other) {
  for (var i = 0; i < other.length; i++) {
    arr.unshift(other[i]);
  }
};

_findTextEl = function(el, pos) {
  var childNodes = [];
  _unshiftAll(childNodes, el.childNodes);

  while(childNodes.length) {
    var next = childNodes.shift();
    if (next.nodeType === window.Node.TEXT_NODE) {
      var t = next.textContent;
      if (t.length >= pos) {
        return [next, pos];
      } else {
        pos -= t.length;
      }
    } else {
      _unshiftAll(childNodes, next.childNodes);
    }
  }
};

TextView.Fragment = function(el, index, charPos, level) {
  this.el = el;

  // the position in the fragments array
  this.index = index;

  this.charPos = charPos;

  // Note: the level is used to determine the behavior at element boundaries.
  // Basiscally, for character positions at the boundaries, a manipulation is done
  // in the node with lower level.
  this.level = level;

};

TextView.Fragment.Prototype = function() {
  this.getLength = function() {
    throw new Error("This method is abstract");
  };
};
TextView.Fragment.prototype = new TextView.Fragment.Prototype();

TextView.DefaultFragment = function() {
  TextView.Fragment.apply(this, arguments);
};
TextView.DefaultFragment.Prototype = function() {
  this.getLength = function() {
    return this.el.length;
  };
};
TextView.DefaultFragment.Prototype.prototype = TextView.Fragment.prototype;
TextView.DefaultFragment.prototype = new TextView.DefaultFragment.Prototype();

module.exports = TextView;

},{"../node":216,"substance-document":136,"substance-util":268,"underscore":273}],243:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./video')
};

},{"./video":244}],244:[function(require,module,exports){
"use strict";

var DocumentNode = require("../node/node");
var _ = require("underscore");

var Video = function(node, document) {
  DocumentNode.call(this, node, document);
};

Video.type = {
  "id": "video",
  "parent": "content",
  "properties": {
    "poster": ["file"],
    "files": ["array", "file"],
    "caption": "paragraph"
  }
};

Video.description = {
  "name": "Video",
  "remarks": [
    "A web video."
  ],
  "properties": {
    "poster": "Video placeholder",
    "files": "An array of different video files (MP4, OGV)",
    "caption": "A reference to a paragraph that describes the video",
  }
};


// Example Video
// -----------------
//

Video.example = {
  "id": "video",
  "label": "Video",
  "files": ["video1.mp4"],
  "caption": "text_1"
};

Video.Prototype = function() {

  this.hasCaption = function() {
    return (!!this.properties.caption);
  };

  this.getCaption = function() {
    if (this.properties.caption) return this.document.get(this.properties.caption);
  };


  this.getVideoFiles = function() {
    return _.map(this.properties.files, function(videoId) {
      return this.document.get(videoId);
    }, this);
  };

};

Video.Prototype.prototype = DocumentNode.prototype;
Video.prototype = new Video.Prototype();
Video.prototype.constructor = Video;

Video.prototype.defineProperties();


module.exports = Video;

},{"../node/node":217,"underscore":273}],245:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require('./web_page')
};

},{"./web_page":246}],246:[function(require,module,exports){
"use strict";

var DocumentNode = require("../node/node");

var WebPage = function(node, document) {
  DocumentNode.call(this, node, document);
};

WebPage.type = {
  "id": "webpage",
  "parent": "content",
  "properties": {
    "file": "file",
    "width": "string",
    "height": "string",
    "caption": "paragraph"
  }
};

WebPage.description = {
  "name": "WebPage",
  "remarks": [
    "A webpage wraps an HTML site."
  ],
  "properties": {
    "file": "File id that has the html",
    "caption": "A reference to a paragraph that describes the figure",
  }
};

// Example WebPage
// -----------------
//

WebPage.example = {
  "id": "web_page",
  "label": "Webpage",
  "file": "web_page_1.html",
  "caption": "text_1"
};

WebPage.Prototype = function() {

  this.hasCaption = function() {
    return (!!this.properties.caption);
  };

  this.getCaption = function() {
    if (this.properties.caption) return this.document.get(this.properties.caption);
  };

  this.getHTML = function() {
    if (!this.properties.file) return "";
    var file = this.document.get(this.properties.file);
    if (!file) return "";
    return file.getData();
  };

  // this.getBlob = function() {
  //   if (!this.properties.file) return null;
  //   var file = this.document.get(this.properties.file);
  //   if (!file) return null;
  //   return file.getBlob();
  // };

  // Depending on wheter there is a blob it returns either the blob url or a regular image url
  // --------
  // 

  // this.getUrl = function() {
  //   var blob = this.getBlob();
  //   if (blob) {
  //     return window.URL.createObjectURL(blob);
  //   } else {
  //     return this.properties.image_url;
  //   }
  // };
};

WebPage.Prototype.prototype = DocumentNode.prototype;
WebPage.prototype = new WebPage.Prototype();
WebPage.prototype.constructor = WebPage;

WebPage.prototype.defineProperties();


module.exports = WebPage;

},{"../node/node":217}],247:[function(require,module,exports){
"use strict";

module.exports = {
  Model: require("./web_resource"),
  View: require("./web_resource_view")
};

},{"./web_resource":248,"./web_resource_view":249}],248:[function(require,module,exports){
"use strict";

var DocumentNode = require('../node/node');

var WebResource = function(node, document) {
  DocumentNode.call(this, node, document);
};

// Type definition
// --------

WebResource.type = {
  "id": "webresource",
  "properties": {
    "title": "string",
    "description": "string", // should be a reference to a text node?
    "url": "string"
  }
};

// This is used for the auto-generated docs
// -----------------
//

WebResource.description = {
  "name": "WebResource",
  "remarks": [
    "A WebResource"
  ],
  "properties": {
    "title": "Webpage title",
    "description": "More verbose WebResource description, if available",
    "url": "WebResource URL"
  }
};


// Example WebResource annotation
// -----------------
//

WebResource.example = {
  "abstract": "type"
};

WebResource.Prototype = function() {

  this.hasDescription = function() {
    return (!!this.properties.caption);
  };

  this.getDescription = function() {
    if (this.properties.description) return this.document.get(this.properties.description);
  };

  this.getReferences = function() {
    var references = this.document.getIndex('references');
    if (references) {
      return references.get(this.properties.id);
    } else {
      console.error("No index for references.")
      return [];
    }
  };
};

WebResource.Prototype.prototype = DocumentNode.prototype;
WebResource.prototype = new WebResource.Prototype();
WebResource.prototype.constructor = WebResource;

WebResource.prototype.defineProperties();

module.exports = WebResource;

},{"../node/node":217}],249:[function(require,module,exports){
"use strict";

var $$ = require ("substance-application").$$;
var NodeView = require("../node/node_view");
var TextView = require("../text/text_view");


// Substance.Webresource.View
// ==========================================================================

var WebResourceView = function(node, viewFactory) {
  NodeView.call(this, node, viewFactory);

  // This class is shared among all link subtypes
  this.$el.addClass('web-resource');
};

WebResourceView.Prototype = function() {

  var __super__ = NodeView.prototype;

  this._updateTitle = function() {
    console.log('updating..');
    if (this.ref) {
      this.titleTextEl.innerHTML = this.ref.getContent();
    } else {
      this.titleTextEl.innerHTML = "";
    }
  };

  // Rendering
  // =============================
  //

  this.render = function() {
    NodeView.prototype.render.call(this);

    //Note: we decided to render the text of the reference instead of
    //the title property

    var titleViewEl = $$('div.issue-title-wrapper')
    this.titleTextEl = $$('.text.title', {
      children: [$$('span.title-annotation', {text: "meeh"})]
    });
    titleViewEl.appendChild(this.titleTextEl);

    // var titleViewEl = $$('div.link-title-wrapper')
    // this.titleTextEl = $$('.text.title', {
    //   children: [$$('span.title-annotation', {text: "asdfsd"})]
    // })

    // titleViewEl.appendChild(this.titleTextEl);
    // this.content.appendChild(titleViewEl);

    this.urlView = new TextView(this.node, this.viewFactory, {property: "url"});
    this.content.appendChild(this.urlView.render().el);

    this.descriptionView = new TextView(this.node, this.viewFactory, {property: "description"});
    this.content.appendChild(this.descriptionView.render().el);

    var refs = this.node.getReferences();
    var refIds = Object.keys(refs);
    if (refIds.length > 0) {
      this.ref = refs[refIds[0]];
      this._updateTitle()
    }

    return this;
  };

  this.dispose = function() {
    NodeView.prototype.dispose.call(this);
    this.descriptionView.dispose();
  };

  this.onNodeUpdate = function(op) {
    if (op.path[1] === "description") {
      this.descriptionView.onNodeUpdate(op);
      return true;
    } else {
      return false;
    }
  };

  this.onGraphUpdate = function(op) {
    if (__super__.onGraphUpdate.call(this, op)) {
      return true;
    }
    // Hack: lazily detecting references to this link
    // by *only* checking 'create' ops with an object having this node as target
    else if (op.type === "create" && op.val["target"] === this.node.id) {
      this.ref = this.node.document.get(op.val.id);
      this._updateTitle();
      return true;
    }
    // ... the same in inverse direction...
    else if (op.type === "delete" && op.val["target"] === this.node.id) {
      this.ref = null;
      this._updateTitle();
      return true;
    }
    else if (this.ref && op.path[0] === this.ref.id) {
      this._updateTitle();
      return true;
    } else {
      return false;
    }
  };
};


WebResourceView.Prototype.prototype = NodeView.prototype;
WebResourceView.prototype = new WebResourceView.Prototype();

module.exports = WebResourceView;

},{"../node/node_view":219,"../text/text_view":242,"substance-application":10}],250:[function(require,module,exports){
"use strict";

module.exports = {
  Operation: require('./src/operation'),
  Compound: require('./src/compound'),
  ArrayOperation: require('./src/array_operation'),
  TextOperation: require('./src/text_operation'),
  ObjectOperation: require('./src/object_operation'),
  Helpers: require('./src/operation_helpers')
};

},{"./src/array_operation":251,"./src/compound":252,"./src/object_operation":253,"./src/operation":254,"./src/operation_helpers":255,"./src/text_operation":256}],251:[function(require,module,exports){
"use strict";

// Import
// ========

var _ = require('underscore');
var util   = require('substance-util');
var errors = util.errors;
var Operation = require('./operation');
var Compound = require('./compound');

var NOP = "NOP";
var DEL = "delete";
var INS = "insert";
var MOV = 'move';

// ArrayOperations can be used to describe changes to arrays by operations.
// ========
//
// Insertions
// --------
//
// An insertion is specified by
//    {
//      type: '+',
//      val:  <value>,
//      pos:  <position>
//    }
// or shorter:
//    ['+', <value>, <position>]
//
//
// Deletions
// --------
//
// A deletion is in the same way as Insertions but with '-' as type.
//
//    ['-', <value>, <position>]
//
// The value must be specified too as otherwise the operation would not be invertible.
//
var Move;

var ArrayOperation = function(options) {

  if (options.type === undefined) {
    throw new errors.OperationError("Illegal argument: insufficient data.");
  }

  // Insert: '+', Delete: '-', Move: '>>'
  this.type = options.type;

  if (this.type === NOP) return;

  // the position where to apply the operation
  this.pos = options.pos;

  // the string to delete or insert
  this.val = options.val;

  // Move operations have a target position
  this.target = options.target;

  // sanity checks
  if(this.type !== NOP && this.type !== INS && this.type !== DEL && this.type !== MOV) {
    throw new errors.OperationError("Illegal type.");
  }

  if (this.type === INS || this.type === DEL) {
    if (this.pos === undefined || this.val === undefined) {
      throw new errors.OperationError("Illegal argument: insufficient data.");
    }
    if (!_.isNumber(this.pos) && this.pos < 0) {
      throw new errors.OperationError("Illegal argument: expecting positive number as pos.");
    }
  } else if (this.type === MOV) {
    if (this.pos === undefined || this.target === undefined) {
      throw new errors.OperationError("Illegal argument: insufficient data.");
    }
    if (!_.isNumber(this.pos) && this.pos < 0) {
      throw new errors.OperationError("Illegal argument: expecting positive number as pos.");
    }
    if (!_.isNumber(this.target) && this.target < 0) {
      throw new errors.OperationError("Illegal argument: expecting positive number as target.");
    }
  }
};

ArrayOperation.fromJSON = function(data) {
  if (_.isArray(data)) {
    if (data[0] === MOV) {
      return new Move(data[1], data[2]);
    } else {
      return new ArrayOperation(data);
    }
  }
  if (data.type === MOV) {
    return Move.fromJSON(data);
  } else if (data.type === Compound.TYPE) {
    var ops = [];
    for (var idx = 0; idx < data.ops.length; idx ++) {
      ops.push(ArrayOperation.fromJSON(data.ops[idx]));
    }
    return ArrayOperation.Compound(ops, data.data);
  }
  else  {
    return new ArrayOperation(data);
  }
};

ArrayOperation.Prototype = function() {

  this.clone = function() {
    return new ArrayOperation(this);
  };

  this.apply = function(array) {

    if (this.type === NOP) {
      return array;
    }

    var adapter = (array instanceof ArrayOperation.ArrayAdapter) ? array : new ArrayOperation.ArrayAdapter(array);

    // Insert
    if (this.type === INS) {
      adapter.insert(this.pos, this.val);
    }
    // Delete
    else if (this.type === DEL) {
      adapter.delete(this.pos, this.val);
    }
    else {
      throw new errors.OperationError("Illegal state.");
    }
    return array;
  };

  this.invert = function() {
    var data = this.toJSON();

    if (this.type === INS) data.type = DEL;
    else if (this.type === DEL) data.type = INS;
    else if (this.type === NOP) data.type = NOP;
    else {
      throw new errors.OperationError("Illegal state.");
    }

    return new ArrayOperation(data);
  };

  this.hasConflict = function(other) {
    return ArrayOperation.hasConflict(this, other);
  };

  this.toJSON = function() {
    var result = {
      type: this.type,
    };

    if (this.type === NOP) return result;

    result.pos = this.pos;
    result.val = this.val;

    return result;
  };

  this.isInsert = function() {
    return this.type === INS;
  };

  this.isDelete = function() {
    return this.type === DEL;
  };

  this.isNOP = function() {
    return this.type === NOP;
  };

  this.isMove = function() {
    return this.type === MOV;
  };

};
ArrayOperation.Prototype.prototype = Operation.prototype;
ArrayOperation.prototype = new ArrayOperation.Prototype();

var _NOP = 0;
var _DEL = 1;
var _INS = 2;
var _MOV = 4;

var CODE = {};
CODE[NOP] = _NOP;
CODE[DEL] = _DEL;
CODE[INS] = _INS;
CODE[MOV] = _MOV;

var _hasConflict = [];

_hasConflict[_DEL | _DEL] = function(a,b) {
  return a.pos === b.pos;
};

_hasConflict[_DEL | _INS] = function() {
  return false;
};

_hasConflict[_INS | _INS] = function(a,b) {
  return a.pos === b.pos;
};

/*
  As we provide Move as quasi atomic operation we have to look at it conflict potential.

  A move is realized as composite of Delete and Insert.

  M / I: ( -> I / I conflict)

    m.s < i && m.t == i-1
    else i && m.t == i

  M / D: ( -> D / D conflict)

    m.s === d

  M / M:

    1. M/D conflict
    2. M/I conflict
*/

var hasConflict = function(a, b) {
  if (a.type === NOP || b.type === NOP) return false;
  var caseId = CODE[a.type] | CODE[b.type];

  if (_hasConflict[caseId]) {
    return _hasConflict[caseId](a,b);
  } else {
    return false;
  }
};

var transform0;

function transform_insert_insert(a, b, first) {

  if (a.pos === b.pos) {
    if (first) {
      b.pos += 1;
    } else {
      a.pos += 1;
    }
  }
  // a before b
  else if (a.pos < b.pos) {
    b.pos += 1;
  }

  // a after b
  else  {
    a.pos += 1;
  }

}

function transform_delete_delete(a, b) {

  // turn the second of two concurrent deletes into a NOP
  if (a.pos === b.pos) {
    b.type = NOP;
    a.type = NOP;
    return;
  }

  if (a.pos < b.pos) {
    b.pos -= 1;
  } else {
    a.pos -= 1;
  }

}

function transform_insert_delete(a, b) {

  // reduce to a normalized case
  if (a.type === DEL) {
    var tmp = a;
    a = b;
    b = tmp;
  }

  if (a.pos <= b.pos) {
    b.pos += 1;
  } else {
    a.pos -= 1;
  }

}

function transform_move(a, b, check, first) {
  if (a.type !== MOV) return transform_move(b, a, check, !first);

  var del = {type: DEL, pos: a.pos};
  var ins = {type: INS, pos: a.target};

  var options = {inplace: true, check:check};

  if (b.type === DEL && a.pos === b.pos) {
    a.type = NOP;
    b.pos = a.target;

  } else if (b.type === MOV && a.pos === b.pos) {
    if (first) {
      b.pos = a.target;
      a.type = NOP;
    } else {
      a.pos = b.target;
      b.type = NOP;
    }
  } else {

    if (first) {
      transform0(del, b, options);
      transform0(ins, b, options);
    } else {
      transform0(b, del, options);
      transform0(b, ins, options);
    }

    a.pos = del.pos;
    a.target = ins.pos;

  }
}

transform0 = function(a, b, options) {

  options = options || {};

  if (options.check && hasConflict(a, b)) {
    throw Operation.conflict(a, b);
  }

  if (!options.inplace) {
    a = util.clone(a);
    b = util.clone(b);
  }

  if (a.type === NOP || b.type === NOP)  {
    // nothing to transform
  }
  else if (a.type === INS && b.type === INS)  {
    transform_insert_insert(a, b, true);
  }
  else if (a.type === DEL && b.type === DEL) {
    transform_delete_delete(a, b, true);
  }
  else if (a.type === MOV || b.type === MOV) {
    transform_move(a, b, options.check, true);
  }
  else {
    transform_insert_delete(a, b, true);
  }

  return [a, b];
};

var __apply__ = function(op, array) {
  if (_.isArray(op)) {
    if (op[0] === MOV) {
      op = new Move(op[1], op[2]);
    } else {
      op = new ArrayOperation(op);
    }
  } else if (!(op instanceof ArrayOperation)) {
    op = ArrayOperation.fromJSON(op);
  }
  return op.apply(array);
};

ArrayOperation.transform = Compound.createTransform(transform0);
ArrayOperation.hasConflict = hasConflict;

ArrayOperation.perform = __apply__;
// DEPRECATED: use ArrayOperation.perform
ArrayOperation.apply = __apply__;

// Note: this is implemented manually, to avoid the value parameter
// necessary for Insert and Delete
var Move = function(source, target) {

  this.type = MOV;
  this.pos = source;
  this.target = target;

  if (!_.isNumber(this.pos) || !_.isNumber(this.target) || this.pos < 0 || this.target < 0) {
    throw new errors.OperationError("Illegal argument");
  }
};

Move.Prototype = function() {

  this.clone = function() {
    return new Move(this.pos, this.target);
  };

  this.apply = function(array) {
    if (this.type === NOP) return array;

    var adapter = (array instanceof ArrayOperation.ArrayAdapter) ? array : new ArrayOperation.ArrayAdapter(array);

    var val = array[this.pos];
    adapter.move(val, this.pos, this.target);

    return array;
  };

  this.invert = function() {
    return new Move(this.target, this.pos);
  };

  this.toJSON = function() {
    return {
      type: MOV,
      pos: this.pos,
      target: this.target
    };
  };

};
Move.Prototype.prototype = ArrayOperation.prototype;
Move.prototype = new Move.Prototype();

Move.fromJSON = function(data) {
  return new Move(data.pos, data.target);
};


// classical LCSS, implemented inplace and using traceback trick
var lcss = function(arr1, arr2) {
  var i,j;
  var L = [0];

  for (i = 0; i < arr1.length; i++) {
    for (j = 0; j < arr2.length; j++) {
      L[j+1] = L[j+1] || 0;
      if (_.isEqual(arr1[i], arr2[j])) {
        L[j+1] = Math.max(L[j+1], L[j]+1);
      } else {
        L[j+1] = Math.max(L[j+1], L[j]);
      }
    }
  }

  var seq = [];
  for (j = arr2.length; j >= 0; j--) {
    if (L[j] > L[j-1]) {
      seq.unshift(arr2[j-1]);
    }
  }

  return seq;
};


// Factory methods
// -------
//
// Note: you should use these methods instead of manually define
// an operation. This is allows us to change the underlying implementation
// without breaking your code.


ArrayOperation.Insert = function(pos, val) {
  return new ArrayOperation({type:INS, pos: pos, val: val});
};


// Factory methods
// -------
//
// Deletes an element from an array
// When array is provided value is looked up
// When pos is given, element at that position gets removed

ArrayOperation.Delete = function(posOrArray, val) {
  var pos = posOrArray;
  if (_.isArray(pos)) {
    pos = pos.indexOf(val);
  }
  if (pos < 0) return new ArrayOperation({type: NOP});
  return new ArrayOperation({type:DEL, pos: pos, val: val});
};

ArrayOperation.Move = function(pos1, pos2) {
  return new Move(pos1, pos2);
};

ArrayOperation.Push = function(arr, val) {
  var index = arr.length;
  return ArrayOperation.Insert(index, val);
};

ArrayOperation.Pop = function(arr) {
  // First we need to find a way to return values
  var index = arr.length-1;
  return ArrayOperation.Delete(index, arr[index]);
};


// Creates a compound operation that transforms the given oldArray
// into the new Array
ArrayOperation.Update = function(oldArray, newArray) {

  // 1. Compute longest common subsequence
  var seq = lcss(oldArray, newArray);

  // 2. Iterate through the three sequences and generate a sequence of
  //    retains, deletes, and inserts

  var a = seq;
  var b = oldArray;
  var c = newArray;
  var pos1, pos2, pos3;
  pos1 = 0;
  pos2 = 0;
  pos3 = 0;

  seq = [];

  while(pos2 < b.length || pos3 < c.length) {
    if (a[pos1] === b[pos2] && b[pos2] === c[pos3]) {
      pos1++; pos2++; pos3++;
      seq.push(1);
    } else if (a[pos1] === b[pos2]) {
      seq.push(['+', c[pos3++]]);
    } else {
      seq.push(['-', b[pos2++]]);
    }
  }

  // 3. Create a compound for the computed sequence

  return ArrayOperation.Sequence(seq);
};

ArrayOperation.Compound = function(ops, data) {
  // do not create a Compound if not necessary
  if (ops.length === 1 && !data) return ops[0];
  else return new Compound(ops, data);
};

// Convenience factory method to create an operation that clears the given array.
// --------
//

ArrayOperation.Clear = function(arr) {
  var ops = [];
  for (var idx = 0; idx < arr.length; idx++) {
    ops.push(ArrayOperation.Delete(0, arr[idx]));
  }
  return ArrayOperation.Compound(ops);
};



// Convenience factory method to create an incremental complex array update.
// --------
//
// Example:
//  Input:
//    [1,2,3,4,5,6,7]
//  Sequence:
//    [2, ['-', 3], 2, ['+', 8]]
//  Output:
//    [1,2,4,5,8,6,7]
//
// Syntax:
//
//  - positive Number: skip / retain
//  - tuple ['-', <val>]: delete element at current position
//  - tuple ['+', <val>]: insert element at current position

ArrayOperation.Sequence = function(seq) {
  var pos = 0;
  var ops = [];

  for (var idx = 0; idx < seq.length; idx++) {
    var s = seq[idx];

    if (_.isNumber(s) && s > 0) {
      pos += s;
    } else {
      if (s[0] === "+") {
        ops.push(ArrayOperation.Insert(pos, s[1]));
        pos+=1;
      } else if (s[0] === "-") {
        ops.push(ArrayOperation.Delete(pos, s[1]));
      } else {
        throw new errors.OperationError("Illegal operation.");
      }
    }
  }

  return new Compound(ops);
};

ArrayOperation.create = function(array, spec) {
  var type = spec[0];
  var val, pos;
  if (type === INS || type === "+") {
    pos = spec[1];
    val = spec[2];
    return ArrayOperation.Insert(pos, val);
  } else if (type === DEL || type === "-") {
    pos = spec[1];
    val = array[pos];
    return ArrayOperation.Delete(pos, val);
  } else if (type === MOV || type === ">>") {
    pos = spec[1];
    var target = spec[2];
    return ArrayOperation.Move(pos, target);
  } else {
    throw new errors.OperationError("Illegal specification.");
  }
};

var ArrayAdapter = function(arr) {
  this.array = arr;
};

ArrayAdapter.prototype = {
  insert: function(pos, val) {
    if (this.array.length < pos) {
      throw new errors.OperationError("Provided array is too small.");
    }
    this.array.splice(pos, 0, val);
  },

  delete: function(pos, val) {
    if (this.array.length < pos) {
      throw new errors.OperationError("Provided array is too small.");
    }
    if (!_.isEqual(this.array[pos],val)) {
      throw new errors.OperationError("Unexpected value at position " + pos + ". Expected " + val + ", found " + this.array[pos]);
    }
    this.array.splice(pos, 1);
  },

  move: function(val, pos, to) {
    if (this.array.length < pos) {
      throw new errors.OperationError("Provided array is too small.");
    }
    this.array.splice(pos, 1);

    if (this.array.length < to) {
      throw new errors.OperationError("Provided array is too small.");
    }
    this.array.splice(to, 0, val);
  }
};
ArrayOperation.ArrayAdapter = ArrayAdapter;

ArrayOperation.NOP = NOP;
ArrayOperation.DELETE = DEL;
ArrayOperation.INSERT = INS;
ArrayOperation.MOVE = MOV;

// Export
// ========

module.exports = ArrayOperation;

},{"./compound":252,"./operation":254,"substance-util":268,"underscore":273}],252:[function(require,module,exports){
"use strict";

// Import
// ========

var util   = require('substance-util');
var Operation = require('./operation');

// Module
// ========

var COMPOUND = "compound";

var Compound = function(ops, data) {
  this.type = COMPOUND;
  this.ops = ops;
  this.alias = undefined;
  this.data = data;

  if (!ops || ops.length === 0) {
    throw new Operation.OperationError("No operations given.");
  }
};

Compound.Prototype = function() {

  this.clone = function() {
    var ops = [];
    for (var idx = 0; idx < this.ops.length; idx++) {
      ops.push(util.clone(this.ops[idx]));
    }
    return new Compound(ops, util.clone(this.data));
  };

  this.apply = function(obj) {
    for (var idx = 0; idx < this.ops.length; idx++) {
      obj = this.ops[idx].apply(obj);
    }
    return obj;
  };

  this.invert = function() {
    var ops = [];
    for (var idx = 0; idx < this.ops.length; idx++) {
      // reverse the order of the inverted atomic commands
      ops.unshift(this.ops[idx].invert());
    }
    return new Compound(ops, this.data);
  };

  this.toJSON = function() {
    var result = {
      type: COMPOUND,
      ops: this.ops,
    };
    if (this.alias) result.alias = this.alias;
    if (this.data) result.data = this.data;
    return result;
  };

};
Compound.Prototype.prototype = Operation.prototype;
Compound.prototype = new Compound.Prototype();

Compound.TYPE = COMPOUND;

// Transforms a compound and another given change inplace.
// --------
//

var compound_transform = function(a, b, first, check, transform0) {
  var idx;

  if (b.type === COMPOUND) {
    for (idx = 0; idx < b.ops.length; idx++) {
      compound_transform(a, b.ops[idx], first, check, transform0);
    }
  }

  else {
    for (idx = 0; idx < a.ops.length; idx++) {
      var _a, _b;
      if (first) {
        _a = a.ops[idx];
        _b = b;
      } else {
        _a = b;
        _b = a.ops[idx];
      }
      transform0(_a, _b, {inplace: true, check: check});
    }
  }
};

// A helper to create a transform method that supports Compounds.
// --------
//

Compound.createTransform = function(primitive_transform) {
  return function(a, b, options) {
    options = options || {};
    if(a.type === COMPOUND || b.type === COMPOUND) {
      if (!options.inplace) {
        a = util.clone(a);
        b = util.clone(b);
      }
      if (a.type === COMPOUND) {
        compound_transform(a, b, true, options.check, primitive_transform);
      } else if (b.type === COMPOUND) {
        compound_transform(b, a, false, options.check, primitive_transform);
      }
      return [a, b];
    } else {
      return primitive_transform(a, b, options);
    }

  };
};

// Export
// ========

module.exports = Compound;

},{"./operation":254,"substance-util":268}],253:[function(require,module,exports){
"use strict";

// Import
// ========

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;
var Operation = require('./operation');
var Compound = require('./compound');
var TextOperation = require('./text_operation');
var ArrayOperation = require('./array_operation');

var NOP = "NOP";
var CREATE = "create";
var DELETE = 'delete';
var UPDATE = 'update';
var SET = 'set';

var ObjectOperation = function(data) {

  this.type = data.type;
  this.path = data.path;

  if (this.type === CREATE || this.type === DELETE) {
    this.val = data.val;
  }

  // Updates can be given as value or as Operation (Text, Array)
  else if (this.type === UPDATE) {
    if (data.diff !== undefined) {
      this.diff = data.diff;
      this.propertyType = data.propertyType;
    } else {
      throw new errors.OperationError("Illegal argument: update by value or by diff must be provided");
    }
  }

  else if (this.type === SET) {
    this.val = data.val;
    this.original = data.original;
  }

  this.data = data.data;
};

ObjectOperation.fromJSON = function(data) {
  if (data.type === Compound.TYPE) {
    var ops = [];
    for (var idx = 0; idx < data.ops.length; idx++) {
      ops.push(ObjectOperation.fromJSON(data.ops[idx]));
    }
    return ObjectOperation.Compound(ops, data.data);

  } else {
    var op = new ObjectOperation(data);
    if (data.type === "update") {
      switch (data.propertyType) {
      case "string":
        op.diff = TextOperation.fromJSON(op.diff);
        break;
      case "array":
        op.diff = ArrayOperation.fromJSON(op.diff);
        break;
      default:
        throw new Error("Don't know how to deserialize this operation:" + JSON.stringify(data));
      }
    }
    return op;
  }
};

ObjectOperation.Prototype = function() {

  this.clone = function() {
    return new ObjectOperation(this);
  };

  this.isNOP = function() {
    if (this.type === NOP) return true;
    else if (this.type === UPDATE) return this.diff.isNOP();
  };

  this.apply = function(obj) {
    if (this.type === NOP) return obj;

    // Note: this allows to use a custom adapter implementation
    // to support other object like backends
    var adapter = (obj instanceof ObjectOperation.Object) ? obj : new ObjectOperation.Object(obj);

    if (this.type === CREATE) {
      // clone here as the operations value must not be changed
      adapter.create(this.path, util.clone(this.val));
      return obj;
    }

    var val = adapter.get(this.path);

    if (this.type === DELETE) {
      // TODO: maybe we could tolerate such deletes
      if (val === undefined) {
        throw new errors.OperationError("Property " + JSON.stringify(this.path) + " not found.");
      }
      adapter.delete(this.path, val);
    }

    else if (this.type === UPDATE) {
      if (this.propertyType === 'object') {
        val = ObjectOperation.apply(this.diff, val);
        if(!adapter.inplace()) adapter.update(this.path, val, this.diff);
      }
      else if (this.propertyType === 'array') {
        val = ArrayOperation.apply(this.diff, val);
        if(!adapter.inplace()) adapter.update(this.path, val, this.diff);
      }
      else if (this.propertyType === 'string') {
        val = TextOperation.apply(this.diff, val);
        adapter.update(this.path, val, this.diff);
      }
      else {
        throw new errors.OperationError("Unsupported type for operational update.");
      }
    }

    else if (this.type === SET) {
      // clone here as the operations value must not be changed
      adapter.set(this.path, util.clone(this.val));
    }

    else {
      throw new errors.OperationError("Illegal state.");
    }

    return obj;
  };

  this.invert = function() {

    if (this.type === NOP) {
      return { type: NOP };
    }

    var result = new ObjectOperation(this);

    if (this.type === CREATE) {
      result.type = DELETE;
    }

    else if (this.type === DELETE) {
      result.type = CREATE;
    }

    else if (this.type === UPDATE) {
      var invertedDiff;
      if (this.propertyType === 'string') {
        invertedDiff = TextOperation.fromJSON(this.diff).invert();
      }
      else if (this.propertyType === 'array') {
        invertedDiff = ArrayOperation.fromJSON(this.diff).invert();
      }
      result.diff = invertedDiff;
      result.propertyType = this.propertyType;
    }

    else if (this.type === SET) {
      result.val = this.original;
      result.original = this.val;
    }

    else {
      throw new errors.OperationError("Illegal state.");
    }

    return result;
  };

  this.hasConflict = function(other) {
    return ObjectOperation.hasConflict(this, other);
  };

  this.toJSON = function() {

    if (this.type === NOP) {
      return {
        type: NOP
      };
    }

    var data = {
      type: this.type,
      path: this.path,
      data: this.data
    };

    if (this.type === CREATE || this.type === DELETE) {
      data.val = this.val;
    }

    else if (this.type === UPDATE) {
      data.diff = this.diff;
      data.propertyType = this.propertyType;
    }

    else if (this.type === SET) {
      data.val = this.val;
      data.original = this.original;
    }

    return data;
  };

};
ObjectOperation.Prototype.prototype = Operation.prototype;
ObjectOperation.prototype = new ObjectOperation.Prototype();

ObjectOperation.Object = function(obj) {
  this.obj = obj;
};

ObjectOperation.Object.Prototype = function() {

  function resolve(self, obj, path, create) {
    var item = obj;
    var idx = 0;
    for (; idx < path.length-1; idx++) {
      if (item === undefined) {
        throw new Error("Key error: could not find element for path " + JSON.stringify(self.path));
      }

      if (item[path[idx]] === undefined && create) {
        item[path[idx]] = {};
      }

      item = item[path[idx]];
    }
    return {parent: item, key: path[idx]};
  }

  this.get = function(path) {
    var item = resolve(this, this.obj, path);
    return item.parent[item.key];
  };

  this.create = function(path, value) {
    var item = resolve(this, this.obj, path, true);
    if (item.parent[item.key] !== undefined) {
      throw new errors.OperationError("Value already exists. path =" + JSON.stringify(path));
    }
    item.parent[item.key] = value;
  };

  // Note: in the default implementation we do not need the diff
  this.update = function(path, value /*, diff*/) {
    this.set(path, value);
  };

  this.set = function(path, value) {
    var item = resolve(this, this.obj, path);
    item.parent[item.key] = value;
  };

  this.delete = function(path) {
    var item = resolve(this, this.obj, path);
    delete item.parent[item.key];
  };

  this.inplace = function() {
    return true;
  };

};
ObjectOperation.Object.prototype = new ObjectOperation.Object.Prototype();


var hasConflict = function(a, b) {
  if (a.type === NOP || b.type === NOP) return false;

  return _.isEqual(a.path, b.path);
};

var transform_delete_delete = function(a, b) {
  // both operations have the same effect.
  // the transformed operations are turned into NOPs
  a.type = NOP;
  b.type = NOP;
};

var transform_create_create = function() {
  // TODO: maybe it would be possible to create an differntial update that transforms the one into the other
  // However, we fail for now.
  throw new errors.OperationError("Can not transform two concurring creates of the same property");
};

var transform_delete_create = function(a, b, flipped) {
  if (a.type !== DELETE) {
    return transform_delete_create(b, a, true);
  }

  if (!flipped) {
    a.type = NOP;
  } else {
    a.val = b.val;
    b.type = NOP;
  }
};

var transform_delete_update = function(a, b, flipped) {
  if (a.type !== DELETE) {
    return transform_delete_update(b, a, true);
  }

  var op;
  if (b.propertyType === 'string') {
    op = TextOperation.fromJSON(b.diff);
  } else if (b.propertyType === 'array') {
    op = ArrayOperation.fromJSON(b.diff);
  }

  // (DELETE, UPDATE) is transformed into (DELETE, CREATE)
  if (!flipped) {
    a.type = NOP;
    b.type = CREATE;
    b.val = op.apply(a.val);
  }
  // (UPDATE, DELETE): the delete is updated to delete the updated value
  else {
    a.val = op.apply(a.val);
    b.type = NOP;
  }

};

var transform_create_update = function() {
  // it is not possible to reasonably transform this.
  throw new errors.OperationError("Can not transform a concurring create and update of the same property");
};

var transform_update_update = function(a, b) {

  // Note: this is a conflict the user should know about

  var op_a, op_b, t;
  if (b.propertyType === 'string') {
    op_a = TextOperation.fromJSON(a.diff);
    op_b = TextOperation.fromJSON(b.diff);
    t = TextOperation.transform(op_a, op_b, {inplace: true});
  } else if (b.propertyType === 'array') {
    op_a = ArrayOperation.fromJSON(a.diff);
    op_b = ArrayOperation.fromJSON(b.diff);
    t = ArrayOperation.transform(op_a, op_b, {inplace: true});
  } else if (b.propertyType === 'object') {
    op_a = ObjectOperation.fromJSON(a.diff);
    op_b = ObjectOperation.fromJSON(b.diff);
    t = ObjectOperation.transform(op_a, op_b, {inplace: true});
  }

  a.diff = t[0];
  b.diff = t[1];
};

var transform_create_set = function(a, b, flipped) {
  if (a.type !== CREATE) return transform_create_set(b, a, true);

  if (!flipped) {
    a.type = NOP;
    b.original = a.val;
  } else {
    a.type = SET;
    a.original = b.val;
    b.type = NOP;
  }

};

var transform_delete_set = function(a, b, flipped) {
  if (a.type !== DELETE) return transform_delete_set(b, a, true);

  if (!flipped) {
    a.type = NOP;
    b.type = CREATE;
    b.original = undefined;
  } else {
    a.val = b.val;
    b.type = NOP;
  }

};

var transform_update_set = function() {
  throw new errors.OperationError("Can not transform update/set of the same property.");
};

var transform_set_set = function(a, b) {
  a.type = NOP;
  b.original = a.val;
};

var _NOP = 0;
var _CREATE = 1;
var _DELETE = 2;
var _UPDATE = 4;
var _SET = 8;

var CODE = {};
CODE[NOP] =_NOP;
CODE[CREATE] = _CREATE;
CODE[DELETE] = _DELETE;
CODE[UPDATE] = _UPDATE;
CODE[SET] = _SET;

var __transform__ = [];
__transform__[_DELETE | _DELETE] = transform_delete_delete;
__transform__[_DELETE | _CREATE] = transform_delete_create;
__transform__[_DELETE | _UPDATE] = transform_delete_update;
__transform__[_CREATE | _CREATE] = transform_create_create;
__transform__[_CREATE | _UPDATE] = transform_create_update;
__transform__[_UPDATE | _UPDATE] = transform_update_update;
__transform__[_CREATE | _SET   ] = transform_create_set;
__transform__[_DELETE | _SET   ] = transform_delete_set;
__transform__[_UPDATE | _SET   ] = transform_update_set;
__transform__[_SET    | _SET   ] = transform_set_set;

var transform = function(a, b, options) {

  options = options || {};

  var conflict = hasConflict(a, b);

  if (options.check && conflict) {
    throw Operation.conflict(a, b);
  }

  if (!options.inplace) {
    a = util.clone(a);
    b = util.clone(b);
  }

  // without conflict: a' = a, b' = b
  if (!conflict) {
    return [a, b];
  }

  __transform__[CODE[a.type] | CODE[b.type]](a,b);

  return [a, b];
};

ObjectOperation.transform = Compound.createTransform(transform);
ObjectOperation.hasConflict = hasConflict;

var __apply__ = function(op, obj) {
  if (!(op instanceof ObjectOperation)) {
    op = ObjectOperation.fromJSON(op);
  }
  return op.apply(obj);
};

// TODO: rename to "exec" or perform
ObjectOperation.apply = __apply__;

ObjectOperation.Create = function(path, val) {
  return new ObjectOperation({type: CREATE, path: path, val: val});
};

ObjectOperation.Delete = function(path, val) {
  return new ObjectOperation({type: DELETE, path: path, val: val});
};

function guessPropertyType(op) {

  if (op instanceof Compound) {
    return guessPropertyType(op.ops[0]);
  }
  if (op instanceof TextOperation) {
    return "string";
  }
  else if (op instanceof ArrayOperation) {
    return  "array";
  }
  else {
    return "other";
  }
}

ObjectOperation.Update = function(path, diff, propertyType) {
  propertyType = propertyType || guessPropertyType(diff);

  return new ObjectOperation({
    type: UPDATE,
    path: path,
    diff: diff,
    propertyType: propertyType
  });
};

ObjectOperation.Set = function(path, oldVal, newVal) {
  return new ObjectOperation({
    type: SET,
    path: path,
    val: util.clone(newVal),
    original: util.clone(oldVal)
  });
};

ObjectOperation.Compound = function(ops, data) {
  if (ops.length === 0) return null;
  else return new Compound(ops, data);
};

// TODO: this can not deal with cyclic references
var __extend__ = function(obj, newVals, path, deletes, creates, updates) {
  var keys = Object.getOwnPropertyNames(newVals);

  for (var idx = 0; idx < keys.length; idx++) {
    var key = keys[idx];
    var p = path.concat(key);

    if (newVals[key] === undefined && obj[key] !== undefined) {
      deletes.push(ObjectOperation.Delete(p, obj[key]));

    } else if (_.isObject(newVals[key])) {

      // TODO: for now, the structure must be the same
      if (!_.isObject(obj[key])) {
        throw new errors.OperationError("Incompatible arguments: newVals must have same structure as obj.");
      }
      __extend__(obj[key], newVals[key], p, deletes, creates, updates);

    } else {
      if (obj[key] === undefined) {
        creates.push(ObjectOperation.Create(p, newVals[key]));
      } else {
        var oldVal = obj[key];
        var newVal = newVals[key];
        if (!_.isEqual(oldVal, newVal)) {
          updates.push(ObjectOperation.Set(p, oldVal, newVal));
        }
      }
    }
  }
};

ObjectOperation.Extend = function(obj, newVals) {
  var deletes = [];
  var creates = [];
  var updates = [];
  __extend__(obj, newVals, [], deletes, creates, updates);
  return ObjectOperation.Compound(deletes.concat(creates).concat(updates));
};

ObjectOperation.NOP = NOP;
ObjectOperation.CREATE = CREATE;
ObjectOperation.DELETE = DELETE;
ObjectOperation.UPDATE = UPDATE;
ObjectOperation.SET = SET;

// Export
// ========

module.exports = ObjectOperation;

},{"./array_operation":251,"./compound":252,"./operation":254,"./text_operation":256,"substance-util":268,"underscore":273}],254:[function(require,module,exports){
"use strict";

// Import
// ========

var util   = require('substance-util');
var errors   = util.errors;

var OperationError = errors.define("OperationError", -1);
var Conflict = errors.define("Conflict", -1);

var Operation = function() {};

Operation.Prototype = function() {

  this.clone = function() {
    throw new Error("Not implemented.");
  };

  this.apply = function() {
    throw new Error("Not implemented.");
  };

  this.invert = function() {
    throw new Error("Not implemented.");
  };

  this.hasConflict = function() {
    throw new Error("Not implemented.");
  };

};

Operation.prototype = new Operation.Prototype();

Operation.conflict = function(a, b) {
  var conflict = new errors.Conflict("Conflict: " + JSON.stringify(a) +" vs " + JSON.stringify(b));
  conflict.a = a;
  conflict.b = b;
  return conflict;
};

Operation.OperationError = OperationError;
Operation.Conflict = Conflict;

// Export
// ========

module.exports = Operation;

},{"substance-util":268}],255:[function(require,module,exports){
"use strict";

var TextOperation = require("./text_operation");
var ArrayOperation = require("./array_operation");

var Helpers = {};

Helpers.last = function(op) {
  if (op.type === "compound") {
    return op.ops[op.ops.length-1];
  }
  return op;
};

// Iterates all atomic operations contained in a given operation
// --------
//
// - op: an Operation instance
// - iterator: a `function(op)`
// - context: the `this` context for the iterator function
// - reverse: if present, the operations are iterated reversely

Helpers.each = function(op, iterator, context, reverse) {
  if (op.type === "compound") {
    var l = op.ops.length;
    for (var i = 0; i < l; i++) {
      var child = op.ops[i];
      if (reverse) {
        child = op.ops[l-i-1];
      }
      if (child.type === "compound") {
        if (Helpers.each(child, iterator, context, reverse) === false) {
          return false;
        }
      }
      else {
        if (iterator.call(context, child) === false) {
          return false;
        }
      }
    }
    return true;
  } else {
    return iterator.call(context, op);
  }
};

Helpers.invert = function(op, type) {
  switch (type) {
  case "string":
    return TextOperation.fromJSON(op).invert();
  case "array":
    return ArrayOperation.fromJSON(op).invert();
  default:
    throw new Error("Don't know how to invert this operation.");
  }
};

// Flattens a list of ops, i.e., extracting any ops from compounds
Helpers.flatten = function(ops) {
  var flat = [];
  ops = ops.slice(0);
  while(ops.length > 0) {
    var op = ops.shift();
    if (op.type !== "compound") {
      flat.push(op);
    } else {
      ops = [].concat(op.ops, ops);
    }
  }
  return flat;
};

module.exports = Helpers;

},{"./array_operation":251,"./text_operation":256}],256:[function(require,module,exports){
"use strict";

// Import
// ========

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;
var Operation = require('./operation');
var Compound = require('./compound');


var INS = "+";
var DEL = "-";

var TextOperation = function(options) {

  // if this operation should be created using an array
  if (_.isArray(options)) {
    options = {
      type: options[0],
      pos: options[1],
      str: options[2]
    };
  }

  if (options.type === undefined || options.pos === undefined || options.str === undefined) {
    throw new errors.OperationError("Illegal argument: insufficient data.");
  }

  // '+' or '-'
  this.type = options.type;

  // the position where to apply the operation
  this.pos = options.pos;

  // the string to delete or insert
  this.str = options.str;

  // sanity checks
  if(!this.isInsert() && !this.isDelete()) {
    throw new errors.OperationError("Illegal type.");
  }
  if (!_.isString(this.str)) {
    throw new errors.OperationError("Illegal argument: expecting string.");
  }
  if (!_.isNumber(this.pos) && this.pos < 0) {
    throw new errors.OperationError("Illegal argument: expecting positive number as pos.");
  }
};

TextOperation.fromJSON = function(data) {

  if (data.type === Compound.TYPE) {
    var ops = [];
    for (var idx = 0; idx < data.ops.length; idx++) {
      ops.push(TextOperation.fromJSON(data.ops[idx]));
    }
    return TextOperation.Compound(ops,data.data);

  } else {
    return new TextOperation(data);
  }
};

TextOperation.Prototype = function() {

  this.clone = function() {
    return new TextOperation(this);
  };

  this.isNOP = function() {
    return this.type === "NOP" || this.str.length === 0;
  };

  this.isInsert = function() {
    return this.type === INS;
  };

  this.isDelete = function() {
    return this.type === DEL;
  };

  this.getLength = function() {
    return this.str.length;
  };

  this.apply = function(str) {
    if (this.isEmpty()) return str;

    var adapter = (str instanceof TextOperation.StringAdapter) ? str : new TextOperation.StringAdapter(str);

    if (this.type === INS) {
      adapter.insert(this.pos, this.str);
    }
    else if (this.type === DEL) {
      adapter.delete(this.pos, this.str.length);
    }
    else {
      throw new errors.OperationError("Illegal operation type: " + this.type);
    }

    return adapter.get();
  };

  this.invert = function() {
    var data = {
      type: this.isInsert() ? '-' : '+',
      pos: this.pos,
      str: this.str
    };
    return new TextOperation(data);
  };

  this.hasConflict = function(other) {
    return TextOperation.hasConflict(this, other);
  };

  this.isEmpty = function() {
    return this.str.length === 0;
  };

  this.toJSON = function() {
    return {
      type: this.type,
      pos: this.pos,
      str: this.str
    };
  };

};
TextOperation.Prototype.prototype = Operation.prototype;
TextOperation.prototype = new TextOperation.Prototype();

var hasConflict = function(a, b) {

  // Insert vs Insert:
  //
  // Insertions are conflicting iff their insert position is the same.

  if (a.type === INS && b.type === INS)  return (a.pos === b.pos);

  // Delete vs Delete:
  //
  // Deletions are conflicting if their ranges overlap.

  if (a.type === DEL && b.type === DEL) {
    // to have no conflict, either `a` should be after `b` or `b` after `a`, otherwise.
    return !(a.pos >= b.pos + b.str.length || b.pos >= a.pos + a.str.length);
  }

  // Delete vs Insert:
  //
  // A deletion and an insertion are conflicting if the insert position is within the deleted range.

  var del, ins;
  if (a.type === DEL) {
    del = a; ins = b;
  } else {
    del = b; ins = a;
  }

  return (ins.pos >= del.pos && ins.pos < del.pos + del.str.length);
};

// Transforms two Insertions
// --------

function transform_insert_insert(a, b, first) {

  if (a.pos === b.pos) {
    if (first) {
      b.pos += a.str.length;
    } else {
      a.pos += b.str.length;
    }
  }

  else if (a.pos < b.pos) {
    b.pos += a.str.length;
  }

  else {
    a.pos += b.str.length;
  }

}

// Transform two Deletions
// --------
//

function transform_delete_delete(a, b, first) {

  // reduce to a normalized case
  if (a.pos > b.pos) {
    return transform_delete_delete(b, a, !first);
  }

  if (a.pos === b.pos && a.str.length > b.str.length) {
    return transform_delete_delete(b, a, !first);
  }


  // take out overlapping parts
  if (b.pos < a.pos + a.str.length) {
    var s = b.pos - a.pos;
    var s1 = a.str.length - s;
    var s2 = s + b.str.length;

    a.str = a.str.slice(0, s) + a.str.slice(s2);
    b.str = b.str.slice(s1);
    b.pos -= s;
  } else {
    b.pos -= a.str.length;
  }

}

// Transform Insert and Deletion
// --------
//

function transform_insert_delete(a, b) {

  if (a.type === DEL) {
    return transform_insert_delete(b, a);
  }

  // we can assume, that a is an insertion and b is a deletion

  // a is before b
  if (a.pos <= b.pos) {
    b.pos += a.str.length;
  }

  // a is after b
  else if (a.pos >= b.pos + b.str.length) {
    a.pos -= b.str.length;
  }

  // Note: this is a conflict case the user should be noticed about
  // If applied still, the deletion takes precedence
  // a.pos > b.pos && <= b.pos + b.length
  else {
    var s = a.pos - b.pos;
    b.str = b.str.slice(0, s) + a.str + b.str.slice(s);
    a.str = "";
  }

}

var transform0 = function(a, b, options) {

  options = options || {};

  if (options.check && hasConflict(a, b)) {
    throw Operation.conflict(a, b);
  }

  if (!options.inplace) {
    a = util.clone(a);
    b = util.clone(b);
  }

  if (a.type === INS && b.type === INS)  {
    transform_insert_insert(a, b, true);
  }
  else if (a.type === DEL && b.type === DEL) {
    transform_delete_delete(a, b, true);
  }
  else {
    transform_insert_delete(a,b);
  }

  return [a, b];
};

var __apply__ = function(op, array) {
  if (_.isArray(op)) {
    op = new TextOperation(op);
  }
  else if (!(op instanceof TextOperation)) {
    op = TextOperation.fromJSON(op);
  }
  return op.apply(array);
};

TextOperation.transform = Compound.createTransform(transform0);
TextOperation.apply = __apply__;

var StringAdapter = function(str) {
  this.str = str;
};
StringAdapter.prototype = {
  insert: function(pos, str) {
    if (this.str.length < pos) {
      throw new errors.OperationError("Provided string is too short.");
    }
    this.str = this.str.slice(0, pos) + str + this.str.slice(pos);
  },

  delete: function(pos, length) {
    if (this.str.length < pos + length) {
      throw new errors.OperationError("Provided string is too short.");
    }
    this.str = this.str.slice(0, pos) + this.str.slice(pos + length);
  },

  get: function() {
    return this.str;
  }
};

TextOperation.Insert = function(pos, str) {
  return new TextOperation(["+", pos, str]);
};

TextOperation.Delete = function(pos, str) {
  return new TextOperation(["-", pos, str]);
};

TextOperation.Compound = function(ops, data) {
  // do not create a Compound if not necessary
  if (ops.length === 1 && !data) return ops[0];
  else return new Compound(ops, data);
};

// Converts from a given a sequence in the format of Tim's lib
// which is an array of numbers and strings.
// 1. positive number: retain a number of characters
// 2. negative number: delete a string with the given length at the current position
// 3. string: insert the given string at the current position

TextOperation.fromOT = function(str, ops) {

  var atomicOps = []; // atomic ops

  // iterating through the sequence and bookkeeping the position
  // in the source and destination str
  var srcPos = 0,
      dstPos = 0;

  if (!_.isArray(ops)) {
    ops = _.toArray(arguments).slice(1);
  }

  _.each(ops, function(op) {
    if (_.isString(op)) { // insert chars
      atomicOps.push(TextOperation.Insert(dstPos, op));
      dstPos += op.length;
    } else if (op<0) { // delete n chars
      var n = -op;
      atomicOps.push(TextOperation.Delete(dstPos, str.slice(srcPos, srcPos+n)));
      srcPos += n;
    } else { // skip n chars
      srcPos += op;
      dstPos += op;
    }
  });

  if (atomicOps.length === 0) {
    return null;
  }

  return TextOperation.Compound(atomicOps);
};

TextOperation.fromSequence = TextOperation.fromOT;

// A helper class to model Text selections and to provide an easy way
// to bookkeep changes by other applied TextOperations
var Range = function(range) {
  if (_.isArray(range)) {
    this.start = range[0];
    this.length = range[1];
  } else {
    this.start = range.start;
    this.length = range.length;
  }
};

// Transforms a given range tuple (offset, length) in-place.
// --------
//

var range_transform = function(range, textOp, expandLeft, expandRight) {

  var changed = false;

  // handle compound operations
  if (textOp.type === Compound.TYPE) {
    for (var idx = 0; idx < textOp.ops.length; idx++) {
      var op = textOp.ops[idx];
      range_transform(range, op);
    }
    return;
  }


  var start, end;

  if (_.isArray(range)) {
    start = range[0];
    end = range[1];
  } else {
    start = range.start;
    end = start + range.length;
  }

  // Delete
  if (textOp.type === DEL) {
    var pos1 = textOp.pos;
    var pos2 = textOp.pos+textOp.str.length;

    if (pos1 <= start) {
      start -= Math.min(pos2-pos1, start-pos1);
      changed = true;
    }
    if (pos1 <= end) {
      end -= Math.min(pos2-pos1, end-pos1);
      changed = true;
    }

  } else if (textOp.type === INS) {
    var pos = textOp.pos;
    var l = textOp.str.length;

    if ( (pos < start) ||
         (pos === start && !expandLeft) ) {
      start += l;
      changed = true;
    }

    if ( (pos < end) ||
         (pos === end && expandRight) ) {
      end += l;
      changed = true;
    }
  }

  if (changed) {
    if (_.isArray(range)) {
      range[0] = start;
      range[1] = end;
    } else {
      range.start = start;
      range.length = end - start;
    }
  }

  return changed;
};

Range.Prototype = function() {

  this.clone = function() {
    return new Range(this);
  };

  this.toJSON = function() {
    var result = {
      start: this.start,
      length: this.length
    };
    // if (this.expand) result.expand = true;
    return result;
  };

  this.transform = function(textOp, expand) {
    return range_transform(this.range, textOp, expand);
  };

};
Range.prototype = new Range.Prototype();

Range.transform = function(range, op, expandLeft, expandRight) {
  return range_transform(range, op, expandLeft, expandRight);
};

Range.fromJSON = function(data) {
  return new Range(data);
};

TextOperation.StringAdapter = StringAdapter;
TextOperation.Range = Range;
TextOperation.INSERT = INS;
TextOperation.DELETE = DEL;

// Export
// ========

module.exports = TextOperation;

},{"./compound":252,"./operation":254,"substance-util":268,"underscore":273}],257:[function(require,module,exports){
"use strict";

var Outline = require('./outline');

module.exports = Outline;

},{"./outline":258}],258:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var $ = window.$;
var View = require("substance-application").View;
var $$ = require("substance-application").$$;

// Lens.Outline
// ==========================================================================
//
// Takes a surface, which is projected to a minimap

var Outline = function(surface) {
  View.call(this);

  this.surface = surface;

  // Initial view state, telling which node is selected and which are highlighted
  this.state = {
    selectedNode: null,
    highlightedNodes: []
  };

  this.$el.addClass('lens-outline');

  _.bindAll(this, 'mouseDown', 'mouseUp', 'mouseMove', 'updateVisibleArea');

  // Mouse event handlers
  // --------

  this.$el.mousedown(this.mouseDown);

  $(window).mousemove(this.mouseMove);
  $(window).mouseup(this.mouseUp);
};

Outline.Prototype = function() {

  // Render Document Outline
  // -------------
  //
  // Renders outline and calculates bounds

  this.render = function() {
    var that = this;
    var totalHeight = 0;

    var fragment = window.document.createDocumentFragment();
    this.visibleArea = $$('.visible-area');
    fragment.appendChild(this.visibleArea);


    // Initial Calculations
    // --------

    var contentHeight = this.surface.$('.nodes').height();
    var panelHeight = this.surface.$el.height();

    var factor = (contentHeight / panelHeight);
    this.factor = factor;

    // Content height is smaller as the panel height, we don't need a scrollbar
    if (panelHeight >= contentHeight) {
      this.$el.addClass('needless');
      this.el.innerHTML = "";
      return this;
    }

    // Render nodes
    // --------
    /*
    var container = this.surface.getContainer();
    var nodes = container.getNodes();

    _.each(nodes, function(node) {
      var dn = this.surface.$('#'+node.id);
      var height = dn.outerHeight(true) / factor;

      // Outline node construction
      var $node = $('<div class="node">')
        .attr({
          id: 'outline_'+node.id,
        })
        .css({
          "position": "absolute",
          "height": height-1,
          "top": totalHeight
        })
        .addClass(node.type)
        // .append('<div class="arrow">');
      fragment.appendChild($node[0]);
      totalHeight += height;
    }, this);
    */

    // Init scroll pos
    var scrollTop = that.surface.$el.scrollTop();

    that.el.innerHTML = "";
    that.el.appendChild(fragment);
    that.updateVisibleArea(scrollTop);

    return this;
  };


  // Update visible area
  // -------------
  //
  // Should get called from the user when the content area is scrolled

  this.updateVisibleArea = function(scrollTop) {
    var targetWidth = this.surface.$el.height() / this.factor;
    $(this.visibleArea).css({
      // TODO: add correction to top: so handle works on lower bound
      "top": scrollTop / this.factor,
      "height": Math.max(targetWidth, 20)
    });
  };


  // Update Outline
  // -------------
  //
  // Usage:
  //
  // outline.update({
  //   selectedNodes: ["node_14"],
  //   highlightedNodes: []
  // })

  this.update = function(state) {
    this.render();

    _.extend(this.state, state);

    // Backward compatibility
    var selectedNodes = state.selectedNodes || [state.selectedNode];

    // Reset
    this.$('.node').removeClass('selected').removeClass('highlighted');

    // HACK: !!!
    this.$el.removeClass('figures').removeClass('citations').removeClass('errors').removeClass('remarks').removeClass('links').removeClass('citations');

    // Set context
    this.$el.addClass(state.context);

    // Mark selected nodes
    _.each(selectedNodes, function(node) {
      this.$('#outline_' + node).addClass('selected');
    }, this);

    // Mark highlighted nodes
    _.each(state.highlightedNodes, function(n) {
      this.$('#outline_'+n).addClass('highlighted');
    }, this);
  };


  // Handle Mouse down event
  // -----------------
  //

  this.mouseDown = function(e) {
    this._mouseDown = true;
    var y = e.pageY;

    if (e.target !== this.visibleArea) {
      // Jump to mousedown position
      this.offset = $(this.visibleArea).height()/2;
      this.mouseMove(e);
    } else {
      this.offset = y - $(this.visibleArea).position().top;
    }

    e.preventDefault();
    e.stopPropagation();
  };

  // Handle Mouse Up
  // -----------------
  //
  // Mouse lifted, no scroll anymore

  this.mouseUp = function() {
    this._mouseDown = false;
  };

  // Handle Scroll
  // -----------------
  //
  // Handle scroll event
  // .visible-area handle

  this.mouseMove = function(e) {
    if (this._mouseDown) {
      var y = e.pageY;
      // find offset to visible-area.top
      var scroll = (y - this.offset)*this.factor;
      this.surface.$el.scrollTop(scroll);
    }
  };
};

Outline.Prototype.prototype = View.prototype;
Outline.prototype = new Outline.Prototype();

module.exports = Outline;

},{"substance-application":10,"underscore":273}],259:[function(require,module,exports){
"use strict";

module.exports = require("./src/regexp");

},{"./src/regexp":260}],260:[function(require,module,exports){
"use strict";

// Substanc.RegExp.Match
// ================
//
// Regular expressions in Javascript they way they should be.

var Match = function(match) {
  this.index = match.index;
  this.match = [];

  for (var i=0; i < match.length; i++) {
    this.match.push(match[i]);
  }
};

Match.Prototype = function() {

  // Returns the capture groups
  // --------
  //

  this.captures = function() {
    return this.match.slice(1);
  };

  // Serialize to string
  // --------
  //

  this.toString = function() {
    return this.match[0];
  };
};

Match.prototype = new Match.Prototype();

// Substance.RegExp
// ================
//

var RegExp = function(exp) {
  this.exp = exp;
};

RegExp.Prototype = function() {

  this.match = function(str) {
    if (str === undefined) throw new Error('No string given');
    
    if (!this.exp.global) {
      return this.exp.exec(str);
    } else {
      var matches = [];
      var match;
      // Reset the state of the expression
      this.exp.compile(this.exp);

      // Execute until last match has been found

      while ((match = this.exp.exec(str)) !== null) {
        matches.push(new Match(match));
      }
      return matches;
    }
  };
};

RegExp.prototype = new RegExp.Prototype();

RegExp.Match = Match;


// Export
// ========

module.exports = RegExp;

},{}],261:[function(require,module,exports){
"use strict";

var Surface = require("./src/surface");
Surface.SurfaceController = require("./src/surface_controller");
Surface.EditableSurface = require("./src/editable_surface");
Surface.EditorController = require("./src/editor_controller");

module.exports = Surface;
},{"./src/editable_surface":262,"./src/editor_controller":263,"./src/surface":264,"./src/surface_controller":265}],262:[function(require,module,exports){
"use strict";

var util = require("substance-util");
var Surface = require("./surface");
var Keyboard = require("substance-commander").ChromeKeyboard;
var MutationObserver = window.MutationObserver;

var MutationObserver;

if (!window.MutationObserver) {
  if (window.WebKitMutationObserver) {
    MutationObserver = window.WebKitMutationObserver;
  }
} else {
  MutationObserver = window.MutationObserver;
}

// The EditableSurface is an editable Surface
// --------
// Don't look too close at this code. It is ugly. Yes. It is.

var __id__ = 0;

var EditableSurface = function(docCtrl, renderer, options) {
  Surface.call(this, docCtrl, renderer);

  this.__id__ = __id__++;

  options = options || {};
  var keymap = options.keymap;
  if (!keymap) {
    console.error("WARNING: no keymap specified.");
  }
  this.keyboard = new Keyboard(keymap);
  this.editorCtrl = docCtrl;
  this.el.spellcheck = false;

  // to be able to handle deadkeys correctly we need a DOMMutationObserver
  // that allows us to revert DOM pollution done by contenteditable.
  // It is not possible to implement deadkey ourselves. When we stop propagation of keypress
  // for deadkeys we do not receive text input or even a keyup
  // (which would contain the actual keycode of the deadkey)
  this._domChanges = [];
  this._hasDeadKey = false;

  this._initEditor(options);
  this.activate();
};

EditableSurface.Prototype = function() {

  // Override the dispose method to bind extra disposing stuff
  // --------
  // TODO: we should really consider to make this an independet class instead of a mix-in
  // and let the surface call the dispose explicitely

  var __dispose__ = this.dispose;
  this.dispose = function() {
    __dispose__.call(this);
    this.deactivate();
  };

  this.revertDOMChanges = function() {
    // console.log("Reverting DOM changes...", this._domChanges);
    var change = this._domChanges[0];
    change.el.textContent = change.oldValue;
    this._domChanges = [];
  };

  this.onTextInput = function(e) {
    var self = this;

    //console.log("EditableSurface onTextInput", e);
    var text = e.data;

    if (!e.data && self._hasDeadKey) {
      // skip
      // console.log("skipping _hasDeadKey", e, self._domChanges);
      return;
    }

    else if (e.data) {
      if (self._hasDeadKey) {
        // console.log("(", self.__id__, ") Handling deadkey", self._domChanges);
        self._hasDeadKey = false;
        self.revertDOMChanges();
        self.renderSelection();
      }

      // console.log("(", self.__id__, ") TextInput", text);
      // NOTE: this timeout brought problems with handling
      // deadkeys together with other cancelling input (e.g., backspace, return)
      // window.setTimeout(function() {
        try {
          self.updateSelection();
          self.editorCtrl.write(text);
        } catch (err) {
          self.editorCtrl.trigger("error", err);
        }
        // make sure there are no dom changes from this manipulation
        self._domChanges = [];
      // }, 0);
    }

    self._domChanges = [];
    e.preventDefault();
    e.stopPropagation();
  };


  this._initEditor = function(options) {
    var self = this;
    var keyboard = this.keyboard;
    var editorCtrl = this.editorCtrl;

    this._onModelSelectionChanged = this.onModelSelectionChanged.bind(this);
    this._onTextInput = this.onTextInput.bind(this);

    // Use `options.setBindings(editableSurface)` to register custom keyboard bindings.
    if (options.registerBindings) {
      options.registerBindings(this, keyboard, editorCtrl);
    }

    keyboard.setDefaultHandler("keypress", function(e) {
      // console.log("EditableSurface keypress", e, keyboard.describeEvent(e));
      try {
        editorCtrl.write(String.fromCharCode(e.which));
      } catch (err) {
        editorCtrl.trigger("error", err);
        util.printStackTrace(err);
      }
      e.preventDefault();
      e.stopPropagation();
    });

    keyboard.setDefaultHandler("keyup", function(e) {
      // console.log("EditableSurface keyup", e, keyboard.describeEvent(e));
      e.preventDefault();
      e.stopPropagation();
      self._domChanges = [];
    });

    keyboard.bind("special", "keydown", function(/*e*/) {
      // Note: this gets called twice: once for the deadkey and a second time
      // for the associated character
      if (!self._hasDeadKey) {
        // console.log("...special", e);
        self._hasDeadKey = true;
        self._domChanges = [];
      }
    });

    this._mutationObserver = new MutationObserver(function(mutations) {
      if (!self._hasDeadKey) {
        return;
      }
      mutations.forEach(function(mutation) {
        var entry = {
          mutation: mutation,
          el: mutation.target,
          value: mutation.target.textContent,
          oldValue: mutation.oldValue
        };
        // console.log("Recording mutation:", entry);
        self._domChanges.push(entry);
      });
    });


    // Handle selection changes
    // -------

    this._onMouseup = this.onMouseup.bind(this);
    this._onMousedown = this.onMousedown.bind(this);

    keyboard.pass("selection");
    keyboard.bind("selection", "keydown", function() {
      // Note: this is essential for the 'collaboration' with contenteditable
      // Whenever the selection is changed due to keyboard input
      // we just register an update which will be executed after
      // the contenteditable has processed the key.
      window.setTimeout(function() {
        self.updateSelection();
      });
    });
  };

  this.onMousedown = function(e) {
    if (e.target.isContentEditable) {
      this.__selecting = true;
    }
  };

  this.onMouseup = function(e) {
    if (!this.__selecting) {
      return;
    }
    this.__selecting = false;
    var self = this;

    // NOTE: this is important to let the content-editable
    // do the window selection update first
    // strangely, it works almost without it, and is necessary only for one case
    // when setting the cursor into an existing selection (??).
    window.setTimeout(function() {
      // Note: this method implements a try-catch guard triggering an error event
      self.updateSelection(e);
    });

    e.stopPropagation();
  };

  // Updates the window selection whenever the model selection changes
  // --------
  // TODO: we should think about how this could be optimized.
  // ATM, a window selection change, e.g., when moving the cursor,
  // triggers a model selection update, which in turn triggers a window selection update.
  // The latter would not be necessary in most cases.
  this.onModelSelectionChanged = function(range, options) {
    // Note: this method implements a try-catch guard triggering an error event
    this.renderSelection(range, options);
  };

  // Initialization
  // --------

  this.activate = function() {
    var el = this.el;

    // enables selection handling
    this.editorCtrl.session.selection.on("selection:changed", this._onModelSelectionChanged);
    el.addEventListener("mousedown", this._onMousedown, false);
    window.document.addEventListener("mouseup", this._onMouseup, false);

    // text input
    el.addEventListener("textInput", this._onTextInput, false);
    el.addEventListener("input", this._onTextInput, false);

    // activates MutationObserver to handle deadkeys
    var _mutationObserverConfig = { subtree: true, characterData: true, characterDataOldValue: true };
    this._mutationObserver.observe(el, _mutationObserverConfig);

    // activates keyboard bindings
    this.keyboard.connect(el);

    el.setAttribute("contenteditable", "true");
  };

  this.deactivate = function() {
    var el = this.el;

    // disables selection handling
    this.editorCtrl.session.selection.off("selection:changed", this._onModelSelectionChanged);
    el.removeEventListener("mousedown", this._onMousedown, false);
    window.document.removeEventListener("mouseup", this._onMouseup, false);

    // text input
    el.removeEventListener("textInput", this._onTextInput, false);
    el.removeEventListener("input", this._onTextInput, false);

    // disables MutationObserver to handle deadkeys
    this._mutationObserver.disconnect();

    // disable keyboard bindings
    this.keyboard.disconnect();

    el.setAttribute("contenteditable", "true");
  };

};

EditableSurface.Prototype.prototype = Surface.prototype;
EditableSurface.prototype = new EditableSurface.Prototype();

module.exports = EditableSurface;

},{"./surface":264,"substance-commander":32,"substance-util":268}],263:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");
var SurfaceController = require("./surface_controller");

var errors = util.errors;
var EditingError = errors.define("EditingError");


// A Controller that makes Nodes and a Document.Container editable
// ========
//
// This editor is tailored to a very simple use-case: documents that consist only
// of Text, Headings, and Lists. These nodes are presented in a flow and
// editing is similar as it is known from GDocs or Microsoft Word,
// and not structurally as in earlier Substance versions
// or known from other Web-based editors (e.g. medium.com).
// By providing a custom factory for Node editors it is possible
// to control what and how the content is editable.

var EditorController = function(documentSession, editorFactory) {
  this.session = documentSession;
  this.editorFactory = editorFactory;
  this.editors = {};
};

EditorController.Prototype = function() {

  _.extend(this, util.Events);

  this.isEditor = function() {
    return true;
  };

  this.dispose = function() {
    this.session.dispose();
  };

  // Insert text at the current position
  // --------
  // The selection must not be null otherwise an EditingError is thrown.

  this.write = function(text) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      throw new EditingError("Can not write, the current position is not valid.");
    }
    // var timer = util.startTimer();

    var session = this.startTransaction();
    // console.log("EditorController.write(): Time for creating transaction", timer.stop());

    if (this._write(session, text)) {
      session.save();
      // console.log("EditorController.write(): Time applying change", timer.stop());
      selection.set(session.selection);
      this._afterEdit();
      // console.log("EditorController.write(): Time for aftermath", timer.stop());
    }

    // console.log("EditorController.write(): total time", timer.total());
  };

  // Delete current selection
  // --------
  //

  this.delete = function(direction) {
    var session = this.startTransaction();
    var sel = session.selection;

    // Note: ignoring an invalid selection
    if (sel.isNull()) return;

    if (sel.isCollapsed()) {
      sel.expand(direction, "char");
    }

    if (_deleteSelection(this, session)) {
      session.save();
      this.session.selection.set(sel);
      this._afterEdit();
    }
  };

  // Insert a break at the current position
  // --------
  // executed when pressing RETURN within a node.

  this.breakNode = function() {
    var selection = this.session.selection;
    if (selection.isNull()) {
      console.error("Can not break, as no position has been selected.");
      return;
    }
    var session = this.startTransaction();

    if (_breakNode(this, session)) {
      session.save();
      selection.set(session.selection);
      this._afterEdit();
    }
  };

  // Behaviors triggered by using `tab` and `shift+tab`.
  // --------
  //
  // Headings and List items can change the level. Text nodes insert a certain amount of spaces.
  //
  // Arguments:
  //  - `direction`: `right` or `left` (default: `right`)
  //

  this.indent = function(direction) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      console.error("Nothing is selected.");
      return;
    }

    if (selection.hasMultipleNodes()) {
      console.error("Indenting Multi-Node selection is not supported yet.");
      return;
    }

    var session = this.startTransaction();
    var sel = session.selection;

    var cursor = sel.getCursor();
    var pos = cursor.pos;

    var node = session.container.getRootNodeFromPos(pos);
    var component = session.container.getComponent(pos);
    var editor = _getEditor(this, node);

    if (!editor.canIndent(session, component, direction)) {
      console.log("Can not indent at the given position.");
      return;
    }

    editor.indent(session, component, direction);
    session.save();
    this._afterEdit();
  };

  // Copy the current selection
  // --------
  //
  // Returns the cutted content as a new document

  this.copy = function() {
    var selection = this.session.selection;

    if (selection.isNull()) {
      return null;
    }

    var nodeSelections = selection.getNodeSelections();
    var content = this.session.document.newInstance();
    var editor;

    for (var i = 0; i < nodeSelections.length; i++) {
      var nodeSelection = nodeSelections[i];
      editor = _getEditor(this, nodeSelection.node);
      // do not copy empty nodes
      if (nodeSelection.ranges.length > 0 && nodeSelection.ranges[0].getLength() > 0) {
        editor.copy(nodeSelection, content);
      }
    }

    return content;
  };

  // Cut current selection from document
  // --------
  //

  this.cut = function() {
    console.log("I am sorry. Currently disabled.");
  };

  // Paste content from clipboard at current position
  // --------
  //

  this.paste = function(content, plainText) {
    if (this.session.selection.isNull()) {
      console.error("Can not paste, as no position has been selected.");
      return;
    }

    var session = this.startTransaction();
    var doc = session.document;
    var container = session.container;
    var selection = session.selection;

    // it is rather tricky to specify when to break and join after paste
    // TODO: specify several usecases and design the implementation

    // For now a rather stupid version (no joining)

    // TODO: what to do with nodes that implement a soft-break instead of a break?
    // E.g., CodeBlock, ListItem?
    if (!selection.isCollapsed()) {
      if (!_deleteSelection(this, session)) {
        console.log("Could not delete the selected content");
        return false;
      }
    }

    // if we can't break at the current position we fall back to plain text
    var beforePos = session.selection.cursor.pos;
    var beforeCharPos = session.selection.cursor.charPos;
    if (!_breakNode(this, session)) {
      if (!this._write(session, plainText)) {
        console.error("Can not paste at the given position.");
        return;
      } else {
        selection.set([beforePos, beforeCharPos + plainText.length]);
        session.save();
        this.selection.set(selection);
        return;
      }
    }

    // pruning empty nodes created by the _breakNode above
    // TODO: IMO it is not possible to implement this in a generalized way
    // Instead the node editors should be involved in that.
    var afterPos = selection.cursor.pos;
    var after = container.getComponent(afterPos);
    // Attention: for inserting we need the node position (in contrast to component position)
    var insertPos = after.rootPos;
    if (after.length === 0) {
      doc.hide(container.name, after.root.id);
      doc.delete(after.root.id);
      after = null;
    }
    var before = container.getComponent(beforePos);
    if (before.length === 0) {
      doc.hide(container.name, before.root.id);
      doc.delete(before.root.id);
      before = null;
      insertPos--;
    }

    // transfer nodes from content document
    // TODO: transfer annotations
    var nodeIds = content.get("content").nodes;
    var annoIndex = content.getIndex('annotations');
    var insertedNodes = [];
    for (var i = 0; i < nodeIds.length; i++) {
      var nodeId = nodeIds[i];
      var node = content.get(nodeId).toJSON();
      // create a new id if the node exists already
      if (doc.get(nodeId)) {
        node.id = util.uuid(node.type);
      }
      doc.create(node);
      doc.show(container.name, node.id, insertPos++);
      insertedNodes.push(node);

      // EXPERIMENTAL also transfer annotations
      // what about nodes that are referenced by annotations?
      // TODO: we need to solve this properly in substance-next
      var annos = annoIndex.get(nodeId);
      for (var id in annos) {
        var anno = annos[id];
        if (node.id !== nodeId) {
          anno.path[0] = node.id;
        }
        if (doc.get(anno.id)) {
          anno.id = util.uuid(anno.type);
        }
        doc.create(anno.toJSON());
      }
    }

    var newCursor;
    if (insertedNodes.length > 0) {
      var first = insertedNodes[0];
      var last = _.last(insertedNodes);
      var insertedComponents = container.getNodeComponents(last.id);
      var lastComponent = _.last(insertedComponents);
      newCursor = [lastComponent.pos, lastComponent.length];
      if (after && last.type === after.root.type) {
        _join(this, session, doc.get(last.id), after.root);
      }
      if (before && first.type === before.root.type) {
        if (insertedNodes.length > 1 && before) {
          newCursor[1] += before.getLength();
        } else {
          newCursor[1] = lastComponent.getLength();
        }
        newCursor[0]--;
        _join(this, session, before.root, doc.get(first.id));
      }
    } else {
      // cancel everything if no content was inserted
      return;
    }
    selection.set(newCursor);
    session.save();
    this.session.selection.set(selection);
  };

  this.undo = function() {
    if (!this.session.document.chronicle) return;
    var op = this.session.document.chronicle.rewind();

    if (op && op.data) {
      var data = op.data.before;
      if (data.container === this.session.container.name) {
        this.session.selection.set(data.sel);
      }
    }
  };

  this.redo = function() {
    if (!this.session.document.chronicle) return;
    var op = this.session.document.chronicle.forward();

    if (op && op.data) {
      var data = op.data.after;
      if (data.container === this.session.container.name) {
        this.session.selection.set(data.sel);
      }
    }
  };

  // Create an annotation of given type for the current selection
  // --------
  //
  this.annotate = function(type, data) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      throw new Error("Nothing selected.");
    }
    if (selection.hasMultipleNodes()) {
      throw new Error("Can only annotate within a single node/component.");
    }
    if (selection.isCollapsed()) {
      // nothing to do
      return;
    }
    var session = this.startTransaction();
    this._annotate(session, type, data);
    session.save();
    this.session.selection.set(session.selection);
    this._afterEdit();
  };

  this.toggleAnnotation = function(type, data) {
    var annos = this.session.annotator.getAnnotations(this.session.selection);
    var anno = null;
    for(var id in annos) {
      if (annos.hasOwnProperty(id)) {
        if (annos[id].type === type) {
          anno = annos[id];
          break;
        }
      }
    }
    if (!anno) {
      this.annotate(type, data);
    } else {
      this.deleteAnnotation(anno.id);
    }
  };

  // This deactivates an annotation
  // ----
  //
  this.deleteAnnotation = function(nodeId) {
    var doc = this.session.document;
    var annotation = doc.get(nodeId);
    var component = this.session.container.lookup(annotation.path);

    doc.delete(nodeId);
    // To allow easy toggling back we will set the selection
    // to the annotated range afterwards.
    this.session.selection.set({
      start: [component.pos, annotation.range[0]],
      end:   [component.pos, annotation.range[1]]
    });

    this._afterEdit();
  };

  // TODO: there is a canInsertNode+insertNode API provided by the ViewEditor which should be used here.
  this.canInsertNode = function() {
    var selection = this.session.selection;
    var container = this.session.container;

    if (selection.isNull()) {
      return false;
    }

    var cursorPos = selection.range().start;
    var pos = cursorPos[0];
    var charPos = cursorPos[1];

    var component = container.getComponent(pos);
    var node = component.root;
    var editor = _getEditor(this, node);

    return editor.canBreak(this.session, component, charPos);
  };

  // TODO: there is a canInsertNode+insertNode API provided by the ViewEditor which should be used here.
  this.insertNode = function(type, data) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      throw new Error("Selection is null!");
    }

    var session = this.startTransaction();

    var newNode = {
      id: type + "_" +util.uuid(),
      type: type
    };
    if (data) {
      _.extend(newNode, data);
    }

    if (_insertNode(this, session, newNode)) {
      session.save();
      this.session.selection.set(session.selection);
      this._afterEdit();
    }
  };

  this.changeType = function(newType, data) {
    // console.log("EditorController.changeType()", newType, data);
    var selection = this.session.selection;
    if (selection.isNull()) {
      console.error("Nothing selected.");
      return;
    }
    if (selection.hasMultipleNodes()) {
      console.error("Can not switch type of multiple nodes.");
      return;
    }

    var session = this.startTransaction();

    if (this._changeType(session, newType, data)) {
      session.save();
      this.session.selection.set(session.selection);

      this._afterEdit();
    }
  };

  this._changeType = function(session, newType, data) {

    var pos = session.selection.start[0];
    var component = session.container.getComponent(pos);
    var node = component.root;
    var editor = _getEditor(this, node);

    if (!editor.canChangeType(session, node, newType)) {
      return false;
    }

    editor.changeType(session, node, component, newType, data);
    this.ensureLastNode(session);

    return true;
  };

  this.select = function(mode) {
    var selection = this.session.selection;
    if (selection.isNull()) {
      console.error("Nothing selected.");
      return;
    }

    var container = this.session.container;
    var pos = selection.cursor.pos;
    var component = container.getComponent(pos);

    if (mode === "all") {
      var components = container.getNodeComponents(component.root.id);
      var first = components[0];
      var last = components[components.length-1];
      selection.set({start: [first.pos, 0], end: [last.pos, last.length]});
    } else {
      console.error("Unsupported selection mode:", mode);
    }
  };

  this.focus = function() {
    this.session.selection.set(this.session.selection);
  };

  this.startTransaction = function() {
    return this.session.startSimulation();
  };

  var _insertNode = function(self, session, newNode) {
      var sel = session.selection;

      // if the selection is expanded then delete first
      // Note: this.__deleteSelection collapses the session cursor.
      if (!sel.isCollapsed()) {
        if (!_deleteSelection(self, session)) {
          console.log("Could not delete the selected content");
          return false;
        }
      }

      // HACK: trying to solve an issue with insertNode,
      // which delegates to _breakNode.
      // However, these two cases are not the same when the cursor is at the end of
      // Note: need to update the charPos as the deletion may have changed the cursor
      var cursor = sel.getCursor();
      var pos = cursor.pos;
      var charPos = cursor.charPos;
      var component = session.container.getComponent(pos);

      var cursorPos, nodePos;

      // Note: we have a special treatment here for the case that the cursor is at the end
      // of a component.
      // Then no node-break is necessary and the new node can be inserted right
      // after the current
      if (charPos < component.length) {
        var couldBreak = _breakNode(self, session);
        if (!couldBreak) {
          return false;
        }
        cursorPos = sel.range().start;
        nodePos = session.container.getNodePos(cursorPos[0]);
      } else {
        cursorPos = sel.range().start;
        nodePos = session.container.getNodePos(cursorPos[0]) + 1;
      }

      session.document.create(newNode);
      session.document.show(session.view, newNode.id, nodePos);

      self.ensureLastNode(session);

      // set the cursor after the inserted node
      sel.set(session.container.after(newNode.id));

      return true;
  };

  this._insertNode = function(session, newNode) {
    return _insertNode(this, session, newNode);
  };

  // HACK: this should be created dynamically...
  var _allowedActions = [
    {
      action: "createNode",
      type: "heading",
      data: {
        level: 1
      }
    },
    {
      action: "createNode",
      type: "figure",
      data: {
      }
    },
    {
      action: "createNode",
      type: "code_block",
      data: {
      }
    }
  ];

  util.freeze(_allowedActions);

  this.getAllowedActions = function() {
    // TODO: When cursor is within a figure caption, do not allow
    // figure insertion etc.
    if (this.canInsertNode()) {
      return _allowedActions;
    } else {
      return [];
    }
  };

  this.ensureLastNode = function(session) {
    var viewEditor = _getEditor(this, {type: "view", id: session.container.name});
    if (viewEditor.ensureLastNode) viewEditor.ensureLastNode(session);
  };


  // Private/Internal functions
  // ........

  this._annotate = function(session, type, data) {
    var selRange = session.selection.range();
    var pos = selRange.start[0];
    var range = [selRange.start[1], selRange.end[1]];

    var node = session.container.getRootNodeFromPos(pos);
    var component = session.container.getComponent(pos);
    var editor = _getEditor(this, node);

    if (!editor.canAnnotate(session, component, type, range)) {
      console.log("Can not annotate component", component);
      return;
    }
    editor.annotate(session, component, type, range, data);

    session.selection.set(selRange);
  };

  this._afterEdit = function() {
    var doc = this.session.document;
    // setting a 'master' reference to the current state
    if (doc.chronicle) {
      doc.chronicle.mark("master");
    }
    this.trigger("document:edited");
  };

  var _getEditor = function(self, node) {
    if (!self.editors[node.id]) {
      self.editors[node.id] = self.editorFactory.createEditor(node);
    }
    return self.editors[node.id];
  };

  this._write = function(session, text) {
    var sel = session.selection;
    var self = this;

    // if the selection is expanded then delete first
    // Note: this.__deleteSelection collapses the session cursor.
    if (!sel.isCollapsed()) {
      if (!_deleteSelection(self, session)) {
        console.log("Could not delete the selected content");
        return false;
      }
    }

    var cursor = sel.getCursor();
    var pos = cursor.pos;
    var charPos = cursor.charPos;

    var node = session.container.getRootNodeFromPos(pos);
    var component = session.container.getComponent(pos);
    var editor = _getEditor(self, node);

    if (!editor.canInsertContent(session, component, charPos)) {
      console.log("Can not insert at the given position.");
      return false;
    }

    // Ask for an operation and abort if no operation is given.
    editor.insertContent(session, component, charPos, text);

    // update the cursor
    sel.set([pos, charPos + text.length]);

    return true;
  };

  var _breakNode = function(self, session) {
    var sel = session.selection;
    var cursorPos = sel.range().start;
    var pos = cursorPos[0];
    var charPos = cursorPos[1];

    var component = session.container.getComponent(pos);
    var node = session.container.getRootNodeFromPos(pos);

    // Get the editor and ask for permission to break the node at the given position
    var editor = _getEditor(self, node);
    if (!editor.canBreak(session, component, charPos)) {
      return false;
    }

    // if the selection is expanded then delete first
    // Note: this.__deleteSelection collapses the session cursor.
    if (!sel.isCollapsed()) {
      if (!_deleteSelection(self, session)) {
        console.log("Could not delete the selected content");
        return false;
      }
    }

    // Note: need to update the charPos as the deletion may have changed the cursor
    charPos = sel.getCursor().charPos;

    // Let the editor apply operations to break the node
    editor.breakNode(session, component, charPos);

    return true;
  };

  var _deleteSelection = function(self, session) {
    var sel = session.selection;

    // after deleting the cursor shall be
    // at the left bound of the selection
    var newPos = sel.range().start;
    var success;

    if (sel.hasMultipleNodes()) {
      success = _deleteMulti(self, session);
    } else {
      var pos = sel.start[0];
      var component = session.container.getComponent(pos);
      success = _deleteSingle(self, session, component);
    }

    if (!success) {
      return false;
    }

    self.ensureLastNode(session);

    // Edge case: if the tail of the document is selected and all nodes
    // are selected fully, the old position does not exist afterwards
    // and the updated last position must be selected
    if (session.container.getLength() <= newPos[0]) {
      sel.set(session.container.getLastCoor());
    } else {
      sel.set(newPos);
    }

    return true;
  };

  var _deleteSingle = function(self, session, component) {
    var sel = session.selection;
    var node = session.container.getRootNodeFromPos(component.pos);

    var startChar = sel.startChar();
    var endChar = sel.endChar();
    var editor = _getEditor(self, node);

    // Check if the editor allows to delete
    if (!editor.canDeleteContent(session, component, startChar, endChar)) {
      console.log("Can not delete content", node.type, startChar, endChar);
      return false;
    }

    editor.deleteContent(session, component, startChar, endChar);
    return true;
  };

  // Note: with the new `component` concept we have to address this in a different way.
  // I.e., a node might be represented by multiple components and not all of them are selected.
  // If a node is fully selected then we can try to delete it from the view,
  // otherwise the node must support partial deletion.
  // TODO: try to stream-line this implementation.
  var _deleteMulti = function(self, session) {
    var container = session.container;

    var i, r, node, nodeSelection;
    // collect information about deletions during the check
    var cmds = [];
    var viewEditor = _getEditor(self, {type: "view", id: container.name});

    var nodeSelections = session.selection.getNodeSelections();
    var first = nodeSelections[0];
    var last = nodeSelections[nodeSelections.length-1];

    // Preparation: check that all deletions can be applied and
    // prepare commands for an easy deletion
    for (i = 0; i < nodeSelections.length; i++) {
      nodeSelection = nodeSelections[i];
      node = nodeSelection.node;
      var canDelete;
      var editor;


      // if it is a full selection schedule a command to delete the node
      var isFull = nodeSelection.isFull();

      // HACK: if the last is an empty node it will show always as fully selected
      // In that case it should remain only if the first one is fully selected.
      if (isFull && nodeSelection === last && first.isFull() &&
          nodeSelection.ranges.length === 1 &&
          nodeSelection.ranges[0].component.length === 0) {
        isFull = false;
      }

      if (isFull) {
        editor = viewEditor;
        canDelete = editor.canDeleteNode(session, node);
        cmds.push({type: "node", editor: editor, node: node});

        if (!canDelete) {
          // TODO: we need add a mechanism to provide a feedback about that, e.g., so that the UI can display some
          // kind of messsage
          console.log("Can't delete node:", node);
          return false;
        }
      }
      // otherwise schedule a command for trimming the node for each of the
      // node's component.
      else {
        editor = _getEditor(self, node);

        for (var j=0; j<nodeSelection.ranges.length; j++) {
          r = nodeSelection.ranges[j];
          canDelete = editor.canDeleteContent(session, r.component, r.start, r.end);
          cmds.push({type: "content", editor: editor, range: r});

          if (!canDelete) {
            console.log("Can't delete component:", r.component);
            return false;
          }
        }
      }
    }

    // If the first and the last selected node have been partially selected
    // then we will try to join these nodes
    var doJoin = (first && first.isPartial() &&
                  last && last.isPartial());

    // Perform the deletions

    // ATTENTION: we have to perform the deletions in inverse order so that the node positions remain valid
    for (i = cmds.length - 1; i >= 0; i--) {
      var cmd = cmds[i];

      if (cmd.type === "content") {
        r = cmd.range;
        cmd.editor.deleteContent(session, r.component, r.start, r.end);
      } else {
        node = cmd.node;
        cmd.editor.deleteNode(session, node);
        // TODO: in theory it might be possible that nodes are referenced somewhere else
        // however, we do not yet consider such situations and delete the node instantly
        session.document.delete(node.id);
      }
    }

    // ATTENTION: after this point the range objects are invalid as some components may have been deleted

    // Perform a join
    if (doJoin) {
      _join(self, session, first.node, last.node);
    }

    return true;
  };

  var _join = function(self, session, first, second) {

    var nodeEditor = _getEditor(self, first);
    var viewEditor = _getEditor(self, {type: "view", id: session.container.name});

    if (!nodeEditor.canJoin(session, first, second)) {
      return false;
    }

    if (!viewEditor.canDeleteNode(session, second)) {
      return false;
    }

    nodeEditor.join(session, first, second);
    viewEditor.deleteNode(session, second);
    session.document.delete(second.id);

    return true;
  };

};

EditorController.Prototype.prototype = SurfaceController.prototype;
EditorController.prototype = new EditorController.Prototype();


Object.defineProperties(EditorController.prototype, {
  "selection": {
    get: function() {
      return this.session.selection;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "annotator": {
    get: function() {
      return this.session.annotator;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "container": {
    get: function() {
      return this.session.container;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "document": {
    get: function() {
      return this.session.document;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "view": {
    get: function() {
      // TODO: 'view' is not very accurate as it is actually the name of a view node
      // Beyond that 'view' as a node type is also confusing considering the Views.
      // console.log("TODO: rename this property.");
      return this.session.container.name;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  }
});

EditorController.EditingError = EditingError;
module.exports = EditorController;

},{"./surface_controller":265,"substance-util":268,"underscore":273}],264:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var $ = window.$;

var View = require("substance-application").View;
var util = require("substance-util");

// Note: Surface errors have codes between 500-599
var SurfaceError = util.errors.define("SurfaceError", 500);
var SelectionError = util.errors.define("SelectionError", 501, SurfaceError);

// Substance.Surface
// ==========================================================================

var Surface = function(docCtrl, renderer) {
  View.call(this);

  // Rename docCtrl to surfaceCtrl ?
  this.docCtrl = docCtrl;
  this.renderer = renderer;
  this.document = docCtrl.session.document;

  // Pull out the registered nodetypes on the written article
  this.nodeTypes = this.document.nodeTypes;
  this.nodeViews = this.renderer.nodeViews;

  this.$el.addClass('surface');

  this.listenTo(this.document, "property:updated", this.onUpdateView);
  this.listenTo(this.document, "graph:reset", this.reset);

  // bind a DOM blur handler so that we can fire a node blur event
  this.$el.blur(this.onBlur.bind(this));

  this.__lastFocussed = null;
};


Surface.Prototype = function() {

  var _selectionOptions = { "source": "surface" };

  // Private helpers
  // ---------------

  var _extractPath = function(el) {
    var path = [];
    var current = el;

    while(current) {

      // if available extract a path fragment
      if (current.getAttribute) {
        // Stop when we find an element which has been made read-only
        if (current.getAttribute("contenteditable") === "false") {
          return null;
        }

        // if there is a path attibute we collect it
        var p = current.getAttribute("data-path");
        if (p) path.unshift(p);
      }

      // node-views
      if ($(current).is(".content-node")) {
        var id = current.getAttribute("id");
        if (!id) {
          throw new Error("Every element with class 'content-node' must have an 'id' attribute.");
        }
        path.unshift(id);

        // STOP here
        return path;
      }

      current = current.parentElement;
    }

    return null;
  };

  var _mapDOMCoordinates = function(el, offset) {
    var pos, charPos;

    var container = this.docCtrl.container;

    // extract a path by looking for ".content-node" and ".node-property"
    var elementPath = _extractPath(el);

    if (!elementPath) {
      return null;
    }

    // get the position from the container
    var component = container.lookup(elementPath);
    if (!component) return null;

    // TODO rethink when it is a good time to attach the view to the node surface
    // FIXME: here we have a problem now. The TextSurface depends on the TextView
    // which can not be retrieved easily.
    if (!component.surface.hasView()) {
      this._attachViewToNodeSurface(component);
    }
    if (!component.surface.hasView()) {
      throw new Error("NodeView.attachView() must propagate down to child views.");
    }

    pos = component.pos;
    charPos = component.surface.getCharPosition(el, offset);

    return [pos, charPos];
  };

  this.getCoordinateForPosition = function(range) {
    return _mapDOMCoordinates.call(this, range.startContainer, range.startOffset);
  };

  // Read out current DOM selection and update selection in the model
  // ---------------

  this.updateSelection = function(/*e*/) {
    // console.log("Surface.updateSelection()", this.docCtrl.container.name);

    try {
      var wSel = window.getSelection();

      // HACK: sometimes it happens that the selection anchor node is undefined.
      // Try to understand and fix someday.
      if (wSel.anchorNode === null) {
        // invalid selection.
        // This happens if you click something strange
        // Decided to take the user serious and invalidate the selection
        this.clearModelSelection();
        return;
      }

      // Set selection to the cursor if clicked on the cursor.
      if ($(wSel.anchorNode.parentElement).is(".cursor")) {
        this.docCtrl.selection.collapse("cursor", _selectionOptions);
        return;
      }

      var wRange = wSel.getRangeAt(0);
      var wStartPos;
      var wEndPos;

      // Note: there are three different cases:
      // 1. selection started at startContainer (regular)
      // 2. selection started at endContainer (reverse)
      // 3. selection done via double click (anchor in different to range boundaries)
      // In cases 1. + 3. the range is used as given, in case 2. reversed.

      wStartPos = [wRange.startContainer, wRange.startOffset];
      wEndPos = [wRange.endContainer, wRange.endOffset];

      if (wRange.endContainer === wSel.anchorNode && wRange.endOffset === wSel.anchorOffset) {
        var tmp = wStartPos;
        wStartPos = wEndPos;
        wEndPos = tmp;
      }

      // Note: we clear the selection whenever we can not map the window selection
      // to model coordinates.

      var startPos = _mapDOMCoordinates.call(this, wStartPos[0], wStartPos[1]);
      if (!startPos) {
        // console.log("Surface.updateSelection(): no valid start position. Clearing the selection");
        wSel.removeAllRanges();
        this.clearModelSelection();
        return;
      }

      var endPos;
      if (wRange.collapsed) {
        endPos = startPos;
      } else {
        endPos = _mapDOMCoordinates.call(this, wEndPos[0], wEndPos[1]);
        if (!endPos) {
          // console.log("Surface.updateSelection(): no valid end position. Clearing the selection");
          wSel.removeAllRanges();
          this.clearModelSelection();
          return;
        }
      }

      try {
        this._emitFocusAndBlur(startPos[0] === endPos[0], startPos[0]);
      } catch (err) {
        console.error(err);
      }

      // console.log("Surface.updateSelection()", startPos, endPos);
      this.docCtrl.selection.set({start: startPos, end: endPos}, _selectionOptions);

    } catch (error) {
      // On errors clear the selection and report
      console.error(error);
      util.printStackTrace(error);

      var err = new SelectionError("Could not map to model cordinates.", error);
      this.clearModelSelection();
      this.docCtrl.trigger("error", err);
    }
  };


  // Renders the current selection
  // --------
  //

  var _mapModelCoordinates = function(pos) {
    var container = this.docCtrl.container;
    var component = container.getComponent(pos[0]);
    return this.getPositionFromComponent(component, pos[1]);
  };

  this.getPositionFromCoordinate = function(path, offset) {
    var container = this.docCtrl.container;
    var component = container.lookup(path);
    return this.getPositionFromComponent(component, offset);
  };

  this.getPositionFromComponent = function(component, offset) {
    // TODO rethink when it is a good time to attach the view to the node surface
    if (!component.surface.hasView()) {
      this._attachViewToNodeSurface(component);
    }
    var wCoor = component.surface.getDOMPosition(offset);
    return wCoor;
  };

  this._attachViewToNodeSurface = function(component) {
    var nodeId = component.root.id;
    var topLevelSurface = component.surface.surfaceProvider.getNodeSurface(nodeId);
    var topLevelView = this.nodeViews[nodeId];
    topLevelSurface.attachView(topLevelView);
  };

  // HACK: putting this in renderSelection before the cycle guard
  // did lead to some strange infinite recursion
  // so this method is used from both places updateSelection and renderSelection
  this._emitFocusAndBlur = function(is_collapsed, pos) {
    if (is_collapsed) {
      var component = this.docCtrl.container.getComponent(pos);
      if (!component.surface.hasView()) {
        this._attachViewToNodeSurface(component);
      }
      var nodeView = component.surface.view;
      if (nodeView !== this.__lastFocussedView) {
        if (this.__lastFocussedView) this.__lastFocussedView.onBlur();
        nodeView.onFocus();
        this.__lastFocussedView = nodeView;
      }
    } else if (this.__lastFocussedView) {
      this.__lastFocussedView.onBlur();
      this.__lastFocussedView = null;
    }
  };

  this.onBlur = function() {
    if (this.__lastFocussedView) {
      this.__lastFocussedView.onBlur();
      this.__lastFocussedView = null;
    }
  };

  this.renderSelection = function(range, options) {
    // console.log("Surface.renderSelection()", this.docCtrl.container.name);

    try {

      var sel = this.docCtrl.selection;
      if (sel.isCollapsed()) {
        var cursorPos = sel.getCursorPosition();
        try {
          this._emitFocusAndBlur("is-collapsed", cursorPos[0]);
        } catch (err) {
          console.error(err);
        }
      } else {
        this._emitFocusAndBlur();
      }

      if (options && (options["source"] === "surface" || options["silent"] === true)){
        this.scrollToCursor();
        return;
      }

      var wSel = window.getSelection();
      // console.log("Clearing window selection.");
      wSel.removeAllRanges();

      if (sel.isNull()) {
        return;
      }

      var wRange = window.document.createRange();
      var wStartPos = _mapModelCoordinates.call(this, sel.start);
      wRange.setStart(wStartPos.startContainer, wStartPos.startOffset);

      // TODO: is there a better way to manipulate the current selection?
      // console.log("Setting window selection.");
      wSel.addRange(wRange);

      // Move the caret to the end position
      // Note: this is the only way to get reversed selections.
      if (!sel.isCollapsed()) {
        var wEndPos = _mapModelCoordinates.call(this, [sel.cursor.pos, sel.cursor.charPos]);
        wSel.extend(wEndPos.endContainer, wEndPos.endOffset);
      }

      this.scrollToCursor();

    } catch (error) {
      console.error(error);
      util.printStackTrace(error);

      // On errors clear the selection and report
      var err = new SelectionError("Could not map to DOM cordinates.", error);

      this.clearModelSelection();
      this.docCtrl.trigger("error", err);
    }
  };

  this.clearModelSelection = function() {
    // leave a mark that the surface will not handle the returning selection update
    this.docCtrl.selection.clear(_selectionOptions);
  };

  this.scrollToCursor = function() {
    var sel = this.docCtrl.selection;

    // Not exactly beautiful but ensures the cursor stays in view
    // E.g. when hitting enter on the lower document bound
    if (sel.isCollapsed()) {
      var that = this;

      // Wait for next DOM iteration
      window.setTimeout(function() {
        // Look up parent node if startContainer is a text node
        var topCorrection = $(that.el).offset().top;
        var wSel = window.getSelection();

        // avoid errors due to non existing DOM selection.
        if (wSel.rangeCount === 0 ) {
          return;
        }

        var range = wSel.getRangeAt(0);
        var bounds = range.getClientRects()[0];

        if (!bounds) {
          // This happens when the cursor is in an empty node
          // However, that is not a problem as we can use the container then
          var $content = $(range.startContainer).parents('.content');
          // do not proceed if the cursor is not in a node view
          if ($content.length === 0) return;
          bounds = $content.offset();
        }

        var topOffset = bounds.top - topCorrection;
        var surfaceHeight = $(that.el).height();

        var scrollTop = $(that.el).scrollTop();
        var lineHeight = 50;

        var targetScroll;
        if (topOffset>surfaceHeight) {
          targetScroll = scrollTop + topOffset - surfaceHeight + lineHeight;
          $(that.el).scrollTop(targetScroll);
          // console.log("Scrolling to", targetScroll);
        } else if (topOffset < 0) {
          targetScroll = scrollTop + topOffset - 3*lineHeight;
          $(that.el).scrollTop(targetScroll);
          // console.log("Scrolling to", targetScroll);
        } else {
          // console.log("Not scrolling ...", topOffset, surfaceHeight);
        }
      // NOTE: 0 millis was not enough sometimes. However, 5 millis is probably not the solution
      // E.g., after inserting an image, it would be necessary to wait for it being loaded...
      }, 5);
    }
  };

  // Render it
  // --------
  //
  // input.image-files
  // .controls
  // .nodes
  //   .content-node.paragraph
  //   .content-node.heading
  //   ...
  // .cursor

  this.render = function() {

    // var controls = window.document.createElement('div');
    // controls.className = "controls";
    var nodes = window.document.createElement('div');
    nodes.className = "nodes";

    // var cursor = window.document.createElement('div');
    // cursor.className = "cursor";

    // this.el.appendChild(controls);
    this.el.appendChild(nodes);
    // this.el.appendChild(cursor);

    // Actual content goes here
    // --------
    //
    // We get back a document fragment from the renderer

    nodes.appendChild(this.renderer.render());

    // TODO: fixme
    this.$('input.image-files').hide();
    this.$cursor = this.$('.cursor');
    this.$cursor.hide();

    // keep the nodes for later access
    this._nodesEl = nodes;

    return this;
  };

  this.reset = function() {
    _.each(this.nodeViews, function(nodeView) {
      nodeView.dispose();
    });
    this.render();
  };

  // Cleanup view before removing it
  // --------
  //

  this.dispose = function() {
    this.stopListening();
    _.each(this.nodeViews, function(n) {
      n.dispose();
    }, this);
    if (this.keyboard) this.keyboard.disconnect(this.el);
  };

  // HACK: used by outline
  // TODO: meditate on the Surface's API
  this.getContainer = function() {
    return this.docCtrl.container;
  };

  // TODO: we could factor this out into something like a ContainerView?

  function insertOrAppend(container, pos, el) {
    var childs = container.childNodes;
    if (pos < childs.length) {
      var refNode = childs[pos];
      container.insertBefore(el, refNode);
    } else {
      container.appendChild(el);
    }
  }

  this.onUpdateView = function(path, diff) {
    if (path.length !== 2 || path[0] !== this.docCtrl.session.container.name || path[1] !== "nodes") return;

    var nodeId, node;
    var container = this._nodesEl;

    var children, el;

    if (diff.isInsert()) {
      // Create a view and insert render it into the nodes container element.
      nodeId = diff.val;
      node = this.document.get(nodeId);

      if (this.nodeTypes[node.type]) {
        // TODO: createView is misleading as returns a cached instance
        // or creates a new one
        var nodeView = this.renderer.createView(node);
        this.nodeViews[nodeId] = nodeView;
        el = nodeView.render().el;
        insertOrAppend(container, diff.pos, el);
      }
    }
    else if (diff.isDelete()) {
      // Dispose the view and remove its element from the nodes container
      nodeId = diff.val;
      if (this.nodeViews[nodeId]) {
        this.nodeViews[nodeId].dispose();
      }
      delete this.nodeViews[nodeId];
      children = container.children;
      container.removeChild(children[diff.pos]);
    }
    else if (diff.isMove()) {
      children = container.children;
      el = children[diff.pos];
      container.removeChild(el);
      insertOrAppend(container, diff.target, el);
    } else if (diff.type === "NOP") {
    } else {
      throw new Error("Illegal state.");
    }
  };

  this.getNodeView = function(nodeId) {
    return this.renderer.getView(nodeId);
  };

};

_.extend(Surface.Prototype, util.Events.Listener);

Surface.Prototype.prototype = View.prototype;
Surface.prototype = new Surface.Prototype();

Object.defineProperties(Surface.prototype, {
  "name": {
    get: function() {
      return this.docCtrl.session.container.name;
    }
  }
});

module.exports = Surface;

},{"substance-application":10,"substance-util":268,"underscore":273}],265:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var util = require("substance-util");


// A Controller that makes Nodes and a Document.Container readable and selectable
// ========
//
// This is a just stripped down version of the EditorController
// TODO: Let EditorController derive from SurfaceController? Oliver, thoughts?

var SurfaceController = function(documentSession) {
  this.session = documentSession;
};

SurfaceController.Prototype = function() {
  _.extend(this, util.Events);

  this.isEditor = function() {
    return false;
  };
};

SurfaceController.prototype = new SurfaceController.Prototype();

Object.defineProperties(SurfaceController.prototype, {
  "selection": {
    get: function() {
      return this.session.selection;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "annotator": {
    get: function() {
      return this.session.annotator;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "container": {
    get: function() {
      return this.session.container;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "document": {
    get: function() {
      return this.session.document;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  },
  "view": {
    get: function() {
      // TODO: 'view' is not very accurate as it is actually the name of a view node
      // Beyond that 'view' as a node type is also confusing considering the Views.
      console.error("TODO: rename this property.");
      return this.session.container.name;
    },
    set: function() {
      throw new Error("Immutable.");
    }
  }
});

module.exports = SurfaceController;

},{"substance-util":268,"underscore":273}],266:[function(require,module,exports){
"use strict";

var TOC = require("./toc_view");

module.exports = TOC;
},{"./toc_view":267}],267:[function(require,module,exports){
"use strict";

var View = require("substance-application").View;
var $$ = require("substance-application").$$;
var _ = require("underscore");

// Substance.TOC.View
// ==========================================================================

var TOCView = function(docCtrl) {
  View.call(this);
  this.docCtrl = docCtrl;

  this.$el.addClass("toc");
};

TOCView.Prototype = function() {

  // Renderer
  // --------

  this.render = function() {
    this.el.innerHTML = "";

    // TODO: we can do this efficiently using an Index
    this.headings = _.filter(this.docCtrl.container.getNodes(), function(node) {
      return node.type === "heading";
    });

    

    if (this.headings.length > 0) {
      _.each(this.headings, function(heading) {
        this.el.appendChild($$('a.heading-ref.level-'+heading.level, {
          id: "toc_"+heading.id,
          text: heading.content,
          "sbs-click": "jumpToNode("+heading.id+")"
        }));
      }, this);
    } else {
      this.el.appendChild($$('.toc-placeholder', {html: 'Add structure to your article using headings.'}));
    }


    return this;
  };

  // Renderer
  // --------
  //

  this.setActiveNode = function(nodeId) {
    this.$('.heading-ref.active').removeClass('active');
    this.$('#toc_'+nodeId).addClass('active');
  };

};

TOCView.Prototype.prototype = View.prototype;
TOCView.prototype = new TOCView.Prototype();

module.exports = TOCView;

},{"substance-application":10,"underscore":273}],268:[function(require,module,exports){
"use strict";

var util = require("./src/util");

util.async = require("./src/async");
util.errors = require("./src/errors");
util.Fragmenter = require('./src/fragmenter');

module.exports = util;

},{"./src/async":269,"./src/errors":270,"./src/fragmenter":271,"./src/util":272}],269:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var util = require("./util.js");

// Helpers for Asynchronous Control Flow
// --------

var async = {};

function callAsynchronousChain(options, cb) {
  var _finally = options["finally"] || function(err, data) { cb(err, data); };
  _finally = _.once(_finally);
  var data = options.data || {};
  var functions = options.functions;

  if (!_.isFunction(cb)) {
    return cb("Illegal arguments: a callback function must be provided");
  }

  var index = 0;
  var stopOnError = (options.stopOnError===undefined) ? true : options.stopOnError;
  var errors = [];

  function process(data) {
    var func = functions[index];

    // stop if no function is left
    if (!func) {
      if (errors.length > 0) {
        return _finally(new Error("Multiple errors occurred.", data));
      } else {
        return _finally(null, data);
      }
    }

    // A function that is used as call back for each function
    // which does the progression in the chain via recursion.
    // On errors the given callback will be called and recursion is stopped.
    var recursiveCallback = _.once(function(err, data) {
      // stop on error
      if (err) {
        if (stopOnError) {
          return _finally(err, null);
        } else {
          errors.push(err);
        }
      }

      index += 1;
      process(data);
    });

    // catch exceptions and propagat
    try {
      if (func.length === 0) {
        func();
        recursiveCallback(null, data);
      }
      else if (func.length === 1) {
        func(recursiveCallback);
      }
      else {
        func(data, recursiveCallback);
      }
    } catch (err) {
      console.log("util.async caught error:", err);
      util.printStackTrace(err);
      _finally(err);
    }
  }

  // start processing
  process(data);
}

// Calls a given list of asynchronous functions sequentially
// -------------------
// options:
//    functions:  an array of functions of the form f(data,cb)
//    data:       data provided to the first function; optional
//    finally:    a function that will always be called at the end, also on errors; optional

async.sequential = function(options, cb) {
  // allow to call this with an array of functions instead of options
  if(_.isArray(options)) {
    options = { functions: options };
  }
  callAsynchronousChain(options, cb);
};

function asynchronousIterator(options) {
  return function(data, cb) {
    // retrieve items via selector if a selector function is given
    var items = options.selector ? options.selector(data) : options.items;
    var _finally = options["finally"] || function(err, data) { cb(err, data); };
    _finally = _.once(_finally);

    // don't do nothing if no items are given
    if (!items) {
      return _finally(null, data);
    }

    var isArray = _.isArray(items);

    if (options.before) {
      options.before(data);
    }

    var funcs = [];
    var iterator = options.iterator;

    // TODO: discuss convention for iterator function signatures.
    // trying to achieve a combination of underscore and node.js callback style
    function arrayFunction(item, index) {
      return function(data, cb) {
        if (iterator.length === 2) {
          iterator(item, cb);
        } else if (iterator.length === 3) {
          iterator(item, index, cb);
        } else {
          iterator(item, index, data, cb);
        }
      };
    }

    function objectFunction(value, key) {
      return function(data, cb) {
        if (iterator.length === 2) {
          iterator(value, cb);
        } else if (iterator.length === 3) {
          iterator(value, key, cb);
        } else {
          iterator(value, key, data, cb);
        }
      };
    }

    if (isArray) {
      for (var idx = 0; idx < items.length; idx++) {
        funcs.push(arrayFunction(items[idx], idx));
      }
    } else {
      for (var key in items) {
        funcs.push(objectFunction(items[key], key));
      }
    }

    //console.log("Iterator:", iterator, "Funcs:", funcs);
    var chainOptions = {
      functions: funcs,
      data: data,
      finally: _finally,
      stopOnError: options.stopOnError
    };
    callAsynchronousChain(chainOptions, cb);
  };
}

// Creates an each-iterator for util.async chains
// -----------
//
//     var func = util.async.each(items, function(item, [idx, [data,]] cb) { ... });
//     var func = util.async.each(options)
//
// options:
//    items:    the items to be iterated
//    selector: used to select items dynamically from the data provided by the previous function in the chain
//    before:   an extra function called before iteration
//    iterator: the iterator function (item, [idx, [data,]] cb)
//       with item: the iterated item,
//            data: the propagated data (optional)
//            cb:   the callback

// TODO: support only one version and add another function
async.iterator = function(options_or_items, iterator) {
  var options;
  if (arguments.length == 1) {
    options = options_or_items;
  } else {
    options = {
      items: options_or_items,
      iterator: iterator
    };
  }
  return asynchronousIterator(options);
};

async.each = function(options, cb) {
  // create the iterator and call instantly
  var f = asynchronousIterator(options);
  f(null, cb);
};

module.exports = async;

},{"./util.js":272,"underscore":273}],270:[function(require,module,exports){
"use strict";

var util = require('./util');

var errors = {};

// The base class for Substance Errors
// -------
// We have been not so happy with the native error as it is really poor with respect to
// stack information and presentation.
// This implementation has a more usable stack trace which is rendered using `err.printStacktrace()`.
// Moreover, it provides error codes and error chaining.
var SubstanceError = function(message, rootError) {

  // If a root error is given try to take over as much information as possible
  if (rootError) {
    Error.call(this, message, rootError.fileName, rootError.lineNumber);

    if (rootError instanceof SubstanceError) {
      this.__stack = rootError.__stack;
    } else if (rootError.stack) {
      this.__stack = util.parseStackTrace(rootError);
    } else {
      this.__stack = util.callstack(1);
    }

  }

  // otherwise create a new stacktrace
  else {
    Error.call(this, message);
    this.__stack = util.callstack(1);
  }

  this.message = message;
};

SubstanceError.Prototype = function() {

  this.name = "SubstanceError";
  this.code = -1;

  this.toString = function() {
    return this.name+":"+this.message;
  };

  this.toJSON = function() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack
    };
  };

  this.printStackTrace = function() {
    util.printStackTrace(this);
  };
};

SubstanceError.Prototype.prototype = Error.prototype;
SubstanceError.prototype = new SubstanceError.Prototype();

Object.defineProperty(SubstanceError.prototype, "stack", {
  get: function() {
    var str = [];
    for (var idx = 0; idx < this.__stack.length; idx++) {
      var s = this.__stack[idx];
      str.push(s.file+":"+s.line+":"+s.col+" ("+s.func+")");
    }
    return str.join("\n");
  },
  set: function() { throw new Error("SubstanceError.stack is read-only."); }
});

errors.SubstanceError = SubstanceError;


var createSubstanceErrorSubclass = function(parent, name, code) {
  return function(message) {
    parent.call(this, message);
    this.name = name;
    this.code = code;
  };
};

errors.define = function(className, code, parent) {
  if (!className) throw new SubstanceError("Name is required.");
  if (code === undefined) code = -1;

  parent = parent || SubstanceError;
  var ErrorClass = createSubstanceErrorSubclass(parent, className, code);
  var ErrorClassPrototype = function() {};
  ErrorClassPrototype.prototype = parent.prototype;
  ErrorClass.prototype = new ErrorClassPrototype();
  ErrorClass.prototype.constructor = ErrorClass;

  errors[className] = ErrorClass;
  return ErrorClass;
};

module.exports = errors;

},{"./util":272}],271:[function(require,module,exports){
"use strict";

var _ = require('underscore');

var ENTER = 1;
var EXIT = -1;

// Fragmenter
// --------
//
// An algorithm that is used to fragment overlapping structure elements
// following a priority rule set.
// E.g., we use this for creating DOM elements for annotations. The annotations
// can partially be overlapping. However this is not allowed in general for DOM elements
// or other hierarchical structures.
//
// Example: For the Annotation use casec consider a 'comment' spanning partially
// over an 'emphasis' annotation.
// 'The <comment>quick brown <bold>fox</comment> jumps over</bold> the lazy dog.'
// We want to be able to create a valid XML structure:
// 'The <comment>quick brown <bold>fox</bold></comment><bold> jumps over</bold> the lazy dog.'
//
// For that one would choose
//
//     {
//        'comment': 0,
//        'bold': 1
//     }
//
// as priority levels.
// In case of structural violations as in the example, elements with a higher level
// would be fragmented and those with lower levels would be preserved as one piece.
//
// TODO: If a violation for nodes of the same level occurs an Error should be thrown.
// Currently, in such cases the first element that is opened earlier is preserved.

var Fragmenter = function() {
};

Fragmenter.Prototype = function() {

  // This is a sweep algorithm wich uses a set of ENTER/EXIT entries
  // to manage a stack of active elements.
  // Whenever a new element is entered it will be appended to its parent element.
  // The stack is ordered by the annotation types.
  //
  // Examples:
  //
  // - simple case:
  //
  //       [top] -> ENTER(idea1) -> [top, idea1]
  //
  //   Creates a new 'idea' element and appends it to 'top'
  //
  // - stacked ENTER:
  //
  //       [top, idea1] -> ENTER(bold1) -> [top, idea1, bold1]
  //
  //   Creates a new 'bold' element and appends it to 'idea1'
  //
  // - simple EXIT:
  //
  //       [top, idea1] -> EXIT(idea1) -> [top]
  //
  //   Removes 'idea1' from stack.
  //
  // - reordering ENTER:
  //
  //       [top, bold1] -> ENTER(idea1) -> [top, idea1, bold1]
  //
  //   Inserts 'idea1' at 2nd position, creates a new 'bold1', and appends itself to 'top'
  //
  // - reordering EXIT
  //
  //       [top, idea1, bold1] -> EXIT(idea1)) -> [top, bold1]
  //
  //   Removes 'idea1' from stack and creates a new 'bold1'
  //

  // Orders sweep events according to following precedences:
  //
  // 1. pos
  // 2. EXIT < ENTER
  // 3. if both ENTER: ascending level
  // 4. if both EXIT: descending level

  var _compare = function(a, b) {
    if (a.pos < b.pos) return -1;
    if (a.pos > b.pos) return 1;

    if (a.mode < b.mode) return -1;
    if (a.mode > b.mode) return 1;

    if (a.mode === ENTER) {
      if (a.level < b.level) return -1;
      if (a.level > b.level) return 1;
    }

    if (a.mode === EXIT) {
      if (a.level > b.level) return -1;
      if (a.level < b.level) return 1;
    }

    return 0;
  };

  var extractEntries = function(annotations) {
    var entries = [];
    _.each(annotations, function(a) {
      // use a weak default level when not given
      var l = a.constructor.level || 1000;
      entries.push({ pos : a.range[0], mode: ENTER, level: l, id: a.id, type: a.type });
      entries.push({ pos : a.range[1], mode: EXIT, level: l, id: a.id, type: a.type });
    });
    return entries;
  };

  this.onText = function(/*context, text*/) {};

  // should return the created user context
  this.onEnter = function(/*entry, parentContext*/) {
    return null;
  };

  this.onExit = function(/*entry, parentContext*/) {};

  this.enter = function(entry, parentContext) {
    return this.onEnter(entry, parentContext);
  };

  this.exit = function(entry, parentContext) {
    this.onExit(entry, parentContext);
  };

  this.createText = function(context, text) {
    this.onText(context, text);
  };

  this.start = function(rootContext, text, annotations) {
    var entries = extractEntries.call(this, annotations);
    entries.sort(_compare.bind(this));

    var stack = [{context: rootContext, entry: null}];

    var pos = 0;

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];

      // in any case we add the last text to the current element
      this.createText(stack[stack.length-1].context, text.substring(pos, entry.pos));

      pos = entry.pos;
      var level = 1;

      var idx;

      if (entry.mode === ENTER) {
        // find the correct position and insert an entry
        for (; level < stack.length; level++) {
          if (entry.level < stack[level].entry.level) {
            break;
          }
        }
        stack.splice(level, 0, {entry: entry});
      }
      else if (entry.mode === EXIT) {
        // find the according entry and remove it from the stack
        for (; level < stack.length; level++) {
          if (stack[level].entry.id === entry.id) {
            break;
          }
        }
        for (idx = level; idx < stack.length; idx++) {
          this.exit(stack[idx].entry, stack[idx-1].context);
        }
        stack.splice(level, 1);
      }

      // create new elements for all lower entries
      for (idx = level; idx < stack.length; idx++) {
        stack[idx].context = this.enter(stack[idx].entry, stack[idx-1].context);
      }
    }

    // Finally append a trailing text node
    this.createText(rootContext, text.substring(pos));
  };

};
Fragmenter.prototype = new Fragmenter.Prototype();
Fragmenter.prototype.constructor = Fragmenter;

module.exports = Fragmenter;

},{"underscore":273}],272:[function(require,module,exports){
"use strict";

var _ = require('underscore');

// Module
// ====

var util = {};

// UUID Generator
// -----------------

/*!
Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/

util.uuid = function (prefix, len) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split(''),
      uuid = [],
      radix = 16,
      idx;
  len = len || 32;

  if (len) {
    // Compact form
    for (idx = 0; idx < len; idx++) uuid[idx] = chars[0 | Math.random()*radix];
  } else {
    // rfc4122, version 4 form
    var r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (idx = 0; idx < 36; idx++) {
      if (!uuid[idx]) {
        r = 0 | Math.random()*16;
        uuid[idx] = chars[(idx == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
  }
  return (prefix ? prefix : "") + uuid.join('');
};

// creates a uuid function that generates counting uuids
util.uuidGen = function(defaultPrefix) {
  var id = 1;
  defaultPrefix = (defaultPrefix !== undefined) ? defaultPrefix : "uuid_";
  return function(prefix) {
    prefix = prefix || defaultPrefix;
    return prefix+(id++);
  };
};


// Events
// ---------------

// Taken from Backbone.js
//
// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback
// functions to an event; `trigger`-ing an event fires all callbacks in
// succession.
//
//     var object = {};
//     _.extend(object, util.Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//

// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Backbone events have 3 arguments).
var triggerEvents = function(events, args) {
  var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
  switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
  }
};

// Regular expression used to split event strings.
var eventSplitter = /\s+/;

// Implement fancy features of the Events API such as multiple event
// names `"change blur"` and jQuery-style event maps `{change: action}`
// in terms of the existing API.
var eventsApi = function(obj, action, name, rest) {
  if (!name) return true;

  // Handle event maps.
  if (typeof name === 'object') {
    for (var key in name) {
      obj[action].apply(obj, [key, name[key]].concat(rest));
    }
    return false;
  }

  // Handle space separated event names.
  if (eventSplitter.test(name)) {
    var names = name.split(eventSplitter);
    for (var i = 0, l = names.length; i < l; i++) {
      obj[action].apply(obj, [names[i]].concat(rest));
    }
    return false;
  }

  return true;
};

util.Events = {

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on: function(name, callback, context) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
    this._events =  this._events || {};
    var events = this._events[name] || (this._events[name] = []);
    events.push({callback: callback, context: context, ctx: context || this});
    return this;
  },

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, it will be removed.
  once: function(name, callback, context) {
    if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
    var self = this;
    var once = _.once(function() {
      self.off(name, once);
      callback.apply(this, arguments);
    });
    once._callback = callback;
    return this.on(name, once, context);
  },

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off: function(name, callback, context) {
    var retain, ev, events, names, i, l, j, k;
    if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
    if (!name && !callback && !context) {
      this._events = {};
      return this;
    }

    names = name ? [name] : _.keys(this._events);
    for (i = 0, l = names.length; i < l; i++) {
      name = names[i];
      events = this._events[name];
      if (events) {
        this._events[name] = retain = [];
        if (callback || context) {
          for (j = 0, k = events.length; j < k; j++) {
            ev = events[j];
            if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                (context && context !== ev.context)) {
              retain.push(ev);
            }
          }
        }
        if (!retain.length) delete this._events[name];
      }
    }

    return this;
  },

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger: function(name) {
    if (!this._events) return this;
    var args = Array.prototype.slice.call(arguments, 1);
    if (!eventsApi(this, 'trigger', name, args)) return this;
    var events = this._events[name];
    var allEvents = this._events.all;
    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, arguments);
    return this;
  },

  triggerLater: function() {
    var self = this;
    var _arguments = arguments;
    window.setTimeout(function() {
      self.trigger.apply(self, _arguments);
    }, 0);
  },

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening: function(obj, name, callback) {
    var listeners = this._listeners;
    if (!listeners) return this;
    var deleteListener = !name && !callback;
    if (typeof name === 'object') callback = this;
    if (obj) (listeners = {})[obj._listenerId] = obj;
    for (var id in listeners) {
      listeners[id].off(name, callback, this);
      if (deleteListener) delete this._listeners[id];
    }
    return this;
  }

};

var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

// Inversion-of-control versions of `on` and `once`. Tell *this* object to
// listen to an event in another object ... keeping track of what it's
// listening to.
_.each(listenMethods, function(implementation, method) {
  util.Events[method] = function(obj, name, callback) {
    var listeners = this._listeners || (this._listeners = {});
    var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
    listeners[id] = obj;
    if (typeof name === 'object') callback = this;
    obj[implementation](name, callback, this);
    return this;
  };
});

// Aliases for backwards compatibility.
util.Events.bind   = util.Events.on;
util.Events.unbind = util.Events.off;

util.Events.Listener = {

  listenTo: function(obj, name, callback) {
    if (!_.isFunction(callback)) {
      throw new Error("Illegal argument: expecting function as callback, was: " + callback);
    }

    // initialize container for keeping handlers to unbind later
    this._handlers = this._handlers || [];

    obj.on(name, callback, this);

    this._handlers.push({
      unbind: function() {
        obj.off(name, callback);
      }
    });

    return this;
  },

  stopListening: function() {
    if (this._handlers) {
      for (var i = 0; i < this._handlers.length; i++) {
        this._handlers[i].unbind();
      }
    }
  }

};

util.propagate = function(data, cb) {
  if(!_.isFunction(cb)) {
    throw "Illegal argument: provided callback is not a function";
  }
  return function(err) {
    if (err) return cb(err);
    cb(null, data);
  };
};

// shamelessly stolen from backbone.js:
// Helper function to correctly set up the prototype chain, for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
var ctor = function(){};
util.inherits = function(parent, protoProps, staticProps) {
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ parent.apply(this, arguments); };
  }

  // Inherit class (static) properties from parent.
  _.extend(child, parent);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  // Add static properties to the constructor function, if supplied.
  if (staticProps) _.extend(child, staticProps);

  // Correctly set child's `prototype.constructor`.
  child.prototype.constructor = child;

  // Set a convenience property in case the parent's prototype is needed later.
  child.__super__ = parent.prototype;

  return child;
};

// Util to read seed data from file system
// ----------

util.getJSON = function(resource, cb) {
  if (typeof window === 'undefined' || typeof nwglobal !== 'undefined') {
    var fs = require('fs');
    var obj = JSON.parse(fs.readFileSync(resource, 'utf8'));
    cb(null, obj);
  } else {
    //console.log("util.getJSON", resource);
    var $ = window.$;
    $.getJSON(resource)
      .done(function(obj) { cb(null, obj); })
      .error(function(err) { cb(err, null); });
  }
};

util.prototype = function(that) {
  /*jshint proto: true*/ // supressing a warning about using deprecated __proto__.
  return Object.getPrototypeOf ? Object.getPrototypeOf(that) : that.__proto__;
};

util.inherit = function(Super, Self) {
  var super_proto = _.isFunction(Super) ? new Super() : Super;
  var proto;
  if (_.isFunction(Self)) {
    Self.prototype = super_proto;
    proto = new Self();
  } else {
    var TmpClass = function(){};
    TmpClass.prototype = super_proto;
    proto = _.extend(new TmpClass(), Self);
  }
  return proto;
};

util.pimpl = function(pimpl) {
  var Pimpl = function(self) {
    this.self = self;
  };
  Pimpl.prototype = pimpl;
  return function(self) { self = self || this; return new Pimpl(self); };
};

util.parseStackTrace = function(err) {
  var SAFARI_STACK_ELEM = /([^@]*)@(.*):(\d+)/;
  var CHROME_STACK_ELEM = /\s*at ([^(]*)[(](.*):(\d+):(\d+)[)]/;

  var idx;
  var stackTrace = err.stack.split('\n');

  // parse the stack trace: each line is a tuple (function, file, lineNumber)
  // Note: unfortunately this is interpreter specific
  // safari: "<function>@<file>:<lineNumber>"
  // chrome: "at <function>(<file>:<line>:<col>"

  var stack = [];
  for (idx = 0; idx < stackTrace.length; idx++) {
    var match = SAFARI_STACK_ELEM.exec(stackTrace[idx]);
    if (!match) match = CHROME_STACK_ELEM.exec(stackTrace[idx]);
    var entry;
    if (match) {
      entry = {
        func: match[1],
        file: match[2],
        line: match[3],
        col: match[4] || 0
      };
      if (entry.func === "") entry.func = "<anonymous>";
    } else {
      entry = {
        func: "",
        file: stackTrace[idx],
        line: "",
        col: ""
      };
    }
    stack.push(entry);
  }

  return stack;
};

util.callstack = function(k) {
  var err;
  try { throw new Error(); } catch (_err) { err = _err; }
  var stack = util.parseStackTrace(err);
  k = k || 0;
  return stack.splice(k+1);
};

util.stacktrace = function (err) {
  var stack = (arguments.length === 0) ? util.callstack().splice(1) : util.parseStackTrace(err);
  var str = [];
  _.each(stack, function(s) {
    str.push(s.file+":"+s.line+":"+s.col+" ("+s.func+")");
  });
  return str.join("\n");
};

util.printStackTrace = function(err, N) {
  if (!err.stack) return;

  var stack;

  // Substance errors have a nice stack already
  if (err.__stack !== undefined) {
    stack = err.__stack;
  }
  // built-in errors have the stack trace as one string
  else if (_.isString(err.stack)) {
    stack = util.parseStackTrace(err);
  }
  else return;

  N = N || stack.length;
  N = Math.min(N, stack.length);

  for (var idx = 0; idx < N; idx++) {
    var s = stack[idx];
    console.log(s.file+":"+s.line+":"+s.col, "("+s.func+")");
  }
};

// computes the difference of obj1 to obj2
util.diff = function(obj1, obj2) {
  var diff;
  if (_.isArray(obj1) && _.isArray(obj2)) {
    diff = _.difference(obj2, obj1);
    // return null in case of equality
    if (diff.length === 0) return null;
    else return diff;
  }
  if (_.isObject(obj1) && _.isObject(obj2)) {
    diff = {};
    _.each(Object.keys(obj2), function(key) {
      var d = util.diff(obj1[key], obj2[key]);
      if (d) diff[key] = d;
    });
    // return null in case of equality
    if (_.isEmpty(diff)) return null;
    else return diff;
  }
  if(obj1 !== obj2) return obj2;
};

// Deep-Clone a given object
// --------
// Note: this is currently done via JSON.parse(JSON.stringify(obj))
//       which is in fact not optimal, as it depends on `toJSON` implementation.
util.deepclone = function(obj) {
  if (obj === undefined) return undefined;
  if (obj === null) return null;
  return JSON.parse(JSON.stringify(obj));
};

// Clones a given object
// --------
// Calls obj's `clone` function if available,
// otherwise clones the obj using `util.deepclone()`.
util.clone = function(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (_.isFunction(obj.clone)) {
    return obj.clone();
  }
  return util.deepclone(obj);
};

util.freeze = function(obj) {
  var idx;
  if (_.isObject(obj)) {
    if (Object.isFrozen(obj)) return obj;

    var keys = Object.keys(obj);
    for (idx = 0; idx < keys.length; idx++) {
      var key = keys[idx];
      obj[key] = util.freeze(obj[key]);
    }
    return Object.freeze(obj);
  } else if (_.isArray(obj)) {
    var arr = obj;
    for (idx = 0; idx < arr.length; idx++) {
      arr[idx] = util.freeze(arr[idx]);
    }
    return Object.freeze(arr);
  } else {
    return obj; // Object.freeze(obj);
  }
};

util.later = function(f, context) {
  return function() {
    var _args = arguments;
    window.setTimeout(function() {
      f.apply(context, _args);
    }, 0);
  };
};


// Returns true if a string doesn't contain any real content

util.isEmpty = function(str) {
  return !str.match(/\w/);
};

// Create a human readable, but URL-compatible slug from a string

util.slug = function(str) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  var to   = "aaaaeeeeiiiioooouuuunc------";
  for (var i=0, l=from.length ; i<l ; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
};


util.getReadableFileSizeString = function(fileSizeInBytes) {

    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
};

util.getProp = function ( obj, path ) {
  var i, retval = obj;
  for ( i = 0; i < path.length; i++ ) {
    if ( retval === undefined || retval === null ) {
      // Trying to access a property of undefined or null causes an error
      return undefined;
    }
    retval = retval[path[i]];
  }
  return retval;
};

var Timer = function() {
  this.startTime = Date.now();
  this.lastStop = this.startTime;
};

Timer.prototype.stop = function() {
  var endTime = Date.now();
  var elapsedTime = endTime - this.lastStop;
  this.lastStop = endTime;
  return elapsedTime;
};

Timer.prototype.total = function() {
  var endTime = Date.now();
  var elapsedTime = endTime - this.startTime;
  return elapsedTime;
};

util.startTimer = function() {
  return new Timer();
};

// Export
// ====

module.exports = util;

},{"fs":1,"underscore":273}],273:[function(require,module,exports){
//     Underscore.js 1.7.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.7.0';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var createCallback = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  _.iteratee = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return createCallback(value, context, argCount);
    if (_.isObject(value)) return _.matches(value);
    return _.property(value);
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    if (obj == null) return obj;
    iteratee = createCallback(iteratee, context);
    var i, length = obj.length;
    if (length === +length) {
      for (i = 0; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    if (obj == null) return [];
    iteratee = _.iteratee(iteratee, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length),
        currentKey;
    for (var index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index = 0, currentKey;
    if (arguments.length < 3) {
      if (!length) throw new TypeError(reduceError);
      memo = obj[keys ? keys[index++] : index++];
    }
    for (; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== + obj.length && _.keys(obj),
        index = (keys || obj).length,
        currentKey;
    if (arguments.length < 3) {
      if (!index) throw new TypeError(reduceError);
      memo = obj[keys ? keys[--index] : --index];
    }
    while (index--) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    predicate = _.iteratee(predicate, context);
    _.some(obj, function(value, index, list) {
      if (predicate(value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    predicate = _.iteratee(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(_.iteratee(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    if (obj == null) return true;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    if (obj == null) return false;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (obj.length !== +obj.length) obj = _.values(obj);
    return _.indexOf(obj, target) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = obj && obj.length === +obj.length ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = low + high >>> 1;
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return obj.length === +obj.length ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = _.iteratee(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    for (var i = 0, length = input.length; i < length; i++) {
      var value = input[i];
      if (!_.isArray(value) && !_.isArguments(value)) {
        if (!strict) output.push(value);
      } else if (shallow) {
        push.apply(output, value);
      } else {
        flatten(value, shallow, strict, output);
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = _.iteratee(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i];
      if (isSorted) {
        if (!i || seen !== value) result.push(value);
        seen = value;
      } else if (iteratee) {
        var computed = iteratee(value, i, array);
        if (_.indexOf(seen, computed) < 0) {
          seen.push(computed);
          result.push(value);
        }
      } else if (_.indexOf(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true, []));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(slice.call(arguments, 1), true, true, []);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function(array) {
    if (array == null) return [];
    var length = _.max(arguments, 'length').length;
    var results = Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var idx = array.length;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var Ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      Ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (_.isObject(result)) return result;
      return self;
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = hasher ? hasher.apply(this, arguments) : key;
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed before being called N times.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      } else {
        func = null;
      }
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    if (!_.isObject(obj)) return obj;
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (hasOwnProperty.call(source, prop)) {
            obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj, iteratee, context) {
    var result = {}, key;
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      iteratee = createCallback(iteratee, context);
      for (key in obj) {
        var value = obj[key];
        if (iteratee(value, key, obj)) result[key] = value;
      }
    } else {
      var keys = concat.apply([], slice.call(arguments, 1));
      obj = new Object(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (key in obj) result[key] = obj[key];
      }
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    if (!_.isObject(obj)) return obj;
    for (var i = 1, length = arguments.length; i < length; i++) {
      var source = arguments[i];
      for (var prop in source) {
        if (obj[prop] === void 0) obj[prop] = source[prop];
      }
    }
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (
      aCtor !== bCtor &&
      // Handle Object.create(x) cases
      'constructor' in a && 'constructor' in b &&
      !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
        _.isFunction(bCtor) && bCtor instanceof bCtor)
    ) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size, result;
    // Recursively compare objects and arrays.
    if (className === '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size === b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      size = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      result = _.keys(b).length === size;
      if (result) {
        while (size--) {
          // Deep compare each member
          key = keys[size];
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
  if (typeof /./ !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    var pairs = _.pairs(attrs), length = pairs.length;
    return function(obj) {
      if (obj == null) return !length;
      obj = new Object(obj);
      for (var i = 0; i < length; i++) {
        var pair = pairs[i], key = pair[0];
        if (pair[1] !== obj[key] || !(key in obj)) return false;
      }
      return true;
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = createCallback(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? object[property]() : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],274:[function(require,module,exports){
"use strict";

var ArchivistDocumentFactory = require("./archivist_document_factory");
var SAMPLE = require('../data/sample');
var Metadata = require('./metadata');

var ArchivistBackend = function() {
  this.documentFactory = new ArchivistDocumentFactory();
  this.metadata = Metadata.instance();
};

ArchivistBackend.Prototype = function() {

  // Returns an empty document
  this.newDocument = function() {
    return this.documentFactory.createEmptyDoc();
  };

  // Use the backend here
  // /api/documents/$docid
  this.open =  function(path, cb) {
    var self = this;
    var doc;

    // First load metadata
    // All available metadata objects are fetched in one go,
    // and assigned to a .metadata property on the doc
    // that way we can work with them synchronously in the app/panels
    this.metadata.load(function(err) {
      $.getJSON("/api/documents/"+path, function(data) {
        console.log('version fetched:', data.__v);
        doc = self.documentFactory.createFromJSON(data);
        // HACK: monkey patching the document to provide resources
        // ... TODO we could add a dedicated namespace for external
        //     resources within the document.
        doc.version = data.__v;
        doc.metadata = self.metadata;

        cb(null, doc);
      });
    });
  };

  this.save = function(doc, path, cb) {
    var self = this;
    var json = doc.toJSON();
    json.__v = doc.version;

    console.log('local version:', doc.version);
    console.log('local subjectDBVersion:', doc.metadata.subjectDBVersion);

    $.ajax({
      type: "PUT",
      url: "/api/documents/"+path,
      contentType: "application/json",
      data: JSON.stringify(json),
      success: function(data) {
        // Remember new document version
        console.log('new documentVersion: ', data.documentVersion);
        console.log('new subjectDBVersion: ', data.subjectDBVersion);
        doc.version = data.documentVersion;

        if (doc.metadata.subjectDBVersion !== data.subjectDBVersion) {
          console.log('outdated subjects metadata.. loading again from server');

          self.metadata.load(function(err) {
            if (err) return cb(err);
            doc.trigger('metadata:updated');
            cb(null);
          });
        } else {
          cb(null);  
        }
      },
      error: function(err) {
        cb(err.responseText);
      }
    });
  };

  // Read from Arraybuffer
  // -----------
  //
  // Used by Composer, when files are dropped

  this.readFromArrayBuffer = function(data, cb) {
    // we could implement
    console.error('TODO: handle dropped file');
    cb("Not implemented yet.");
  };
};

ArchivistBackend.prototype = new ArchivistBackend.Prototype();

module.exports = ArchivistBackend;

},{"../data/sample":8,"./archivist_document_factory":275,"./metadata":277}],275:[function(require,module,exports){
"use strict";

var Composer = require('substance-composer');
var EditableArticle = Composer.EditableArticle;
var Chronicle = require("substance-chronicle");
var Document = require("substance-document");
var util = require("substance-util");

var archivistNodeTypes = require('./nodes');

var SCHEMA_ID = "archivist-interview";
var SCHEMA_VERSION = "0.1.0";

// Creates fresh documents
// ----------
//

var ArchivistDocumentFactory = function() {
};

ArchivistDocumentFactory.Prototype = function() {

  this.createFromJSON = function(jsonDoc) {
    var schema = util.deepclone(Document.schema);
    schema.id = SCHEMA_ID;
    schema.version = SCHEMA_VERSION;
    var doc = EditableArticle.fromSnapshot(jsonDoc, {
      schema: schema,
      nodeTypes: archivistNodeTypes,
      chronicle: Chronicle.create()
    });
    return doc;
  };

  this.createEmptyDoc = function() {
    return ArchivistDocumentFactory.createEmptyDoc();
  };

};

ArchivistDocumentFactory.createEmptyDoc = function() {
  var docId = util.uuid();

  var seed = {
    "id": docId,
    "schema": [SCHEMA_ID, SCHEMA_VERSION],
    "nodes": {
      "document": {
        "id": "document",
        "type": "document",
        "views": [
          "content",
          "citations",
          "remarks",
          "info"
        ],
        "license": "licence", // really needed?
        "guid": docId,
        "creator": "",
        "title": "Untitled",
        "authors": [],
        "abstract": "",
        "created_at": new Date().toJSON(),
        "updated_at": new Date().toJSON(),
        "published_on": new Date().toJSON()
      },
      "cover": {
        "id": "cover",
        "type": "cover",
        "authors": []
      },
      "content": {
        "type": "view",
        "id": "content",
        "nodes": ["cover", "text1"]
      },
      "citations": {
        "type": "view",
        "id": "citations",
        "nodes": []
      },
      "remarks": {
        "type": "view",
        "id": "remarks",
        "nodes": []
      },
      "info": {
        "type": "view",
        "id": "info",
        "nodes": ["publication_info", "interview_subject", "interview_conductor", "interview_operator", "interview_sound_operator"]
      },
      "text1": {
        "type": "text",
        "id": "text1",
        "content": ""
      },
      "publication_info": {
        "id": "publication_info",
        "type": "publication_info"
      },
      "interview_subject": {
        "type": "interview_subject",
        "id": "interview_subject",
        "name": "The Interviewed",
        "role": "Interview Subject",
        "forced_labor": "intracamp work; earthworks (construction of barracks); digging tunnels for military factories",
        "categories": ["Ost arbeiter", "Cocentration camp worker"],
        "prisons": ["location_komorn"],
        "movement": [
          {
            "location": "location_danzig",
            "density": 33
          },
          {
            "location": "location_komorn",
            "density": 67
          }
        ],
        "description": "",
        "image": "",
      },
      "interview_conductor": {
        "type": "contributor",
        "id": "interview_conductor",
        "source_id": "",
        "name": "Daniel Beilinson",
        "role": "Interview Conductor",
        "description": "",
        "image": "",
      },
      "interview_operator": {
        "type": "contributor",
        "id": "interview_operator",
        "source_id": "",
        "name": "Oliver Buchtala",
        "role": "Operator",
        "description": "",
        "image": "",
      },
      "interview_sound_operator": {
        "type": "contributor",
        "id": "interview_sound_operator",
        "source_id": "",
        "name": "Michael Aufreiter",
        "role": "Sound Operator",
        "description": "",
        "image": "",
      },
      "license": {
        "id": "license",
        "type": "license",
        "name": "None",
        "code": "none",
        "description": "",
        "version": "1.0",
        "url": ""
      }
    }
  };

  var doc = new EditableArticle({
    seed: seed,
    nodeTypes: archivistNodeTypes,
    chronicle: Chronicle.create()
  });

  return doc;
};

ArchivistDocumentFactory.prototype = new ArchivistDocumentFactory.Prototype();
ArchivistDocumentFactory.prototype.constructor = ArchivistDocumentFactory;

module.exports = ArchivistDocumentFactory;

},{"./nodes":279,"substance-chronicle":23,"substance-composer":37,"substance-document":136,"substance-util":268}],276:[function(require,module,exports){

"use strict";

var ArchivistBackend = require("./archivist_backend");
var Composer = require('substance-composer');
var WebShell = Composer.WebShell;

var ArchivistShell = function() {
  WebShell.call(this, new ArchivistBackend(this));
};

ArchivistShell.Prototype = function() {
};

ArchivistShell.Prototype.prototype = WebShell.prototype;
ArchivistShell.prototype = new ArchivistShell.Prototype();
ArchivistShell.prototype.constructor = ArchivistShell;

module.exports = ArchivistShell;

},{"./archivist_backend":274,"substance-composer":37}],277:[function(require,module,exports){
var util = require("substance-util");
var path = require("path");
var _ = require("underscore");

var Metadata = function() {
  // this.locations = require("../data/locations");
  // this.persons = require("../data/persons");
  // this.definitions = require("../data/definitions");
  // this.importSubjects();
};

Metadata.Prototype = function() {

  this.load = function(cb) {
    var self = this;
    $.getJSON("/api/metadata", function(metadata) {
      console.log('subjectDBVersion', metadata.subjectDBVersion);
      self.subjectDBVersion = metadata.subjectDBVersion,
      self.importSubjects(metadata.subjects);
      cb(null);
    });
  };

  this.importSubjects = function(subjectsData) {
    this.subjects = {};
    _.each(subjectsData, function(subject) {
      this.subjects[subject.id] = subject;
    }, this);
  };

  // this.getLocations = function() {
  //   return this.locations;
  // };

  // this.getPersons = function() {
  //   return this.persons;
  // };

  // this.getDefinitions = function() {
  //   return this.definitions;
  // };

  this.getSubjects = function() {
    return this.subjects;
  };
};

Metadata.prototype = new Metadata.Prototype();

var __instance__ = null;
Metadata.instance = function() {
  if (!__instance__) __instance__ = new Metadata();
  return __instance__;
};

module.exports = Metadata;

},{"path":2,"substance-util":268,"underscore":273}],278:[function(require,module,exports){
var util = require("substance-util");
var path = require("path");
var fs = require("fs");
var _ = require("underscore");

// TODO: fetch data from REST API instead of using these fixtures.

var MetadataService = function() {
  this.locations = require("../data/locations");
  this.persons = require("../data/persons");
  this.definitions = require("../data/definitions");
  this.importSubjects();
};

MetadataService.Prototype = function() {

  this.importSubjects = function() {
    var subjects = require("../data/subjects");
    this.subjects = {};
    _.each(subjects, function(subject) {
      this.subjects[subject.id] = subject;
    }, this);
  };

  this.getLocations = function() {
    return this.locations;
  };

  this.getPersons = function() {
    return this.persons;
  };

  this.getDefinitions = function() {
    return this.definitions;
  };

  this.getSubjects = function() {
    return this.subjects;
  };

};

MetadataService.prototype = new MetadataService.Prototype();

var __instance__ = null;
MetadataService.instance = function() {
  if (!__instance__) __instance__ = new MetadataService();
  return __instance__;
};

module.exports = MetadataService;

},{"../data/definitions":5,"../data/locations":6,"../data/persons":7,"../data/subjects":9,"fs":1,"path":2,"substance-util":268,"underscore":273}],279:[function(require,module,exports){
module.exports = {

};

},{}],280:[function(require,module,exports){
"use strict";
var EntityPanelController = require("../entity_panel_controller");

var DefinitionsView = require("./definitions_view");
var _ = require("underscore");
var util = require("substance-util");


// Definitions.Controller
// -----------------
//

var DefinitionsController = function(doc, writerCtrl) {
  EntityPanelController.call(this, doc, writerCtrl);
};

DefinitionsController.Prototype = function() {

  this.createView = function() {
    if (!this.view) {
      this.view = new DefinitionsView(this);
    }
    return this.view;
  };

  this.getEntities = function() {
    return this.metadataService.getDefinitions();
  };
};

DefinitionsController.Prototype.prototype = EntityPanelController.prototype;
DefinitionsController.prototype = new DefinitionsController.Prototype();

module.exports = DefinitionsController;

},{"../entity_panel_controller":284,"./definitions_view":282,"substance-util":268,"underscore":273}],281:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Panel = require("substance-composer").Panel;

var DefinitionsController = require("./definitions_controller");

var DefinitionsPanel = function() {
  Panel.call(this, 'definitions');
};

DefinitionsPanel.Prototype = function() {

  this.createController = function(doc, writerCtrl) {
    return new DefinitionsController(doc, writerCtrl);
  };
};

DefinitionsPanel.Prototype.prototype = Panel.prototype;
DefinitionsPanel.prototype = new DefinitionsPanel.Prototype();
DefinitionsPanel.prototype.constructor = DefinitionsPanel;

module.exports = DefinitionsPanel;
},{"./definitions_controller":280,"substance-composer":37,"underscore":273}],282:[function(require,module,exports){
var EntityPanelView = require('../entity_panel_view');


var DefinitionsView = function(controller) {
  EntityPanelView.call(this, controller, {
    entityType: "definition",
    name: 'definitions',
    label: 'Definitions',
    title: 'Definitions',
    type: 'resource',
    icon: 'icon-book'
  });
};

DefinitionsView.Prototype = function() {

  this.renderEntity = function(def) {
    var $def = $('<div>').addClass('definition entity').attr("data-id", def.id);

    // Name
    $def.append($('<div>').addClass('definition-title').html(def.title));

    // Biography
    $def.append($('<div>').addClass('definition-description').html(def.description));

    return $def;
  };
};


DefinitionsView.Prototype.prototype = EntityPanelView.prototype;
DefinitionsView.prototype = new DefinitionsView.Prototype();
DefinitionsView.prototype.constructor = DefinitionsView;

module.exports = DefinitionsView;

},{"../entity_panel_view":285}],283:[function(require,module,exports){
module.exports = require("./definitions_panel");

},{"./definitions_panel":281}],284:[function(require,module,exports){
"use strict";
var PanelController = require("substance-composer").PanelController;

var MetadataService = require('../metadata_service');
var _ = require("underscore");
var util = require("substance-util");

// EntityPanelController
// -----------------
//

var EntityPanelController = function(doc, writerCtrl) {
  PanelController.call(this, doc, writerCtrl);
  this.state = {id: "initialized"};
  this.metadataService = MetadataService.instance();
};

EntityPanelController.Prototype = function() {

  this.createView = function() {

  };

  this.initialize = function(newState, cb) {
    cb(null);
  };

  this.getEntities = function() {
    throw new Error("this method is abstract");
  };

  this.transition = function(newState, cb) {
    // Nothing to do here
    cb(null);
  };

  // Trigger view transition on state change
  // -----------------
  //

  this.afterTransition = function(oldState) {
    this.view.transition(oldState);
  };
};

EntityPanelController.Prototype.prototype = PanelController.prototype;
EntityPanelController.prototype = new EntityPanelController.Prototype();
EntityPanelController.prototype.constructor = EntityPanelController;

module.exports = EntityPanelController;

},{"../metadata_service":278,"substance-composer":37,"substance-util":268,"underscore":273}],285:[function(require,module,exports){
var PanelView = require('substance-composer').PanelView;
var _ = require("underscore");

var EntityPanelView = function(controller, options) {
  PanelView.call(this, controller, {
    name: options.name,
    label: options.label,
    title: options.title,
    type: options.type,
    icon: options.icon
  });

  this.entityType = options.entityType;
  this.writerCtrl = this.controller.writerCtrl;
  this.$el.addClass('entities');
  this.$el.on('click', '.select-entity', _.bind(this.selectEntity, this));
};

EntityPanelView.Prototype = function() {

  this.selectEntity = function(e) {
    var entityId = $(e.currentTarget).attr("data-id");
    var tagEntityWorkfow = this.writerCtrl.workflows["tag_entity"];
    tagEntityWorkfow.endWorkflow(entityId, this.entityType);
    e.preventDefault();
  };

  this.render = function() {
    this.renderEntities();
    return this;
  };

  // Render entity
  // ----------------
  
  this.renderEntity = function() {
    throw new Error("this method is abstract");
  };

  // Render all available entities
  // ----------------

  this.renderEntities = function() {
    this.$entities = $('<div>').addClass('entities');

    _.each(this.controller.getEntities(), function(entity) {
      var $entity = this.renderEntity(entity);
      // Select Entity button (only shown during workflow)
      var $selectButton = $('<a>').addClass('select-entity').attr({"data-id": entity.id}).html('Select');
      $entity.append($selectButton);
      this.$entities.append($entity);
    }, this);

    this.$el.append(this.$entities);

    // List referenced (mentioned) entities
    this.updateView({mode: "list"});
  };

  this.updateView = function(viewState) {
    var self = this;
    this.$el.removeClass('select-mode').removeClass('list-mode');
    this.$el.addClass(viewState.mode+'-mode');

    var entityEls = this.$('.entity');
    entityEls.each(function() {
      var entityId = this.getAttribute("data-id");
      var entityRefs = self.writerCtrl.referenceIndex.get(entityId);
      if (Object.keys(entityRefs).length === 0) {
        $(this).addClass('unreferenced');
      } else {
        $(this).removeClass('unreferenced');
      }

      if (entityId === viewState.selectedResource) {
        $(this).addClass('active');
      }
    });
  };

  this.focusResource = function(entityId) {
    this.$('.entity.active').removeClass('active');
    var $entity = this.$('.entity[data-id='+entityId+']');
    $entity.addClass('active');
  };
};


EntityPanelView.Prototype.prototype = PanelView.prototype;
EntityPanelView.prototype = new EntityPanelView.Prototype();
EntityPanelView.prototype.constructor = EntityPanelView;

module.exports = EntityPanelView;
},{"substance-composer":37,"underscore":273}],286:[function(require,module,exports){
module.exports = require("./locations_panel");

},{"./locations_panel":288}],287:[function(require,module,exports){
"use strict";
var EntityPanelController = require("../entity_panel_controller");

var LocationsView = require("./locations_view");
var _ = require("underscore");
var util = require("substance-util");


// Locations.Controller
// -----------------
//

var LocationsController = function(doc, writerCtrl) {
  EntityPanelController.call(this, doc, writerCtrl);
};

LocationsController.Prototype = function() {

  this.createView = function() {
    if (!this.view) {
      this.view = new LocationsView(this);
    }
    return this.view;
  };

  this.getEntities = function() {
    return this.metadataService.getLocations();
  };
};

LocationsController.Prototype.prototype = EntityPanelController.prototype;
LocationsController.prototype = new LocationsController.Prototype();

module.exports = LocationsController;

},{"../entity_panel_controller":284,"./locations_view":289,"substance-util":268,"underscore":273}],288:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Panel = require("substance-composer").Panel;

var LocationsController = require("./locations_controller");

var LocationsPanel = function() {
	Panel.call(this, 'locations');
};

LocationsPanel.Prototype = function() {

  this.createController = function(doc, writerCtrl) {
    return new LocationsController(doc, writerCtrl);
  };

};
LocationsPanel.Prototype.prototype = Panel.prototype;
LocationsPanel.prototype = new LocationsPanel.Prototype();
LocationsPanel.prototype.constructor = LocationsPanel;

module.exports = LocationsPanel;
},{"./locations_controller":287,"substance-composer":37,"underscore":273}],289:[function(require,module,exports){
var EntityPanelView = require('../entity_panel_view');


var LocationsView = function(controller) {
  EntityPanelView.call(this, controller, {
    entityType: "location",
    name: 'locations',
    label: 'Locations',
    title: 'Locations',
    type: 'resource',
    icon: 'icon-location-arrow'
  });
};

LocationsView.Prototype = function() {

  this.renderEntity = function(loc) {
    var $loc = $('<div>').addClass('location entity').attr("data-id", loc.id);

    // Location type
    $loc.append($('<div>').addClass('location-type').addClass(loc.location_type).html(loc.location_type));

    // Name
    $loc.append($('<div>').addClass('location-name').html([loc.name, loc.country].join(', ')));

    // Synonyms
    $loc.append($('<div>').addClass('location-synonyms').html(loc.synonyms.join(', ')));
    
    if (loc.location_type === "prison") {
      // Prison type
      $loc.append($('<div>').addClass('prison-type').html(loc.prison_type.join(', ')));

      // Nearest locality
      $loc.append($('<div>').addClass('nearest-locality').html("Nearest locality: "+ loc.nearest_locality));
    } else {
      // Current name
      $loc.append($('<div>').addClass('current-name').html("Current name: "+ loc.current_name));
    }

    return $loc;
  };
};


LocationsView.Prototype.prototype = EntityPanelView.prototype;
LocationsView.prototype = new LocationsView.Prototype();
LocationsView.prototype.constructor = LocationsView;

module.exports = LocationsView;

},{"../entity_panel_view":285}],290:[function(require,module,exports){
module.exports = require("./metadata_panel");

},{"./metadata_panel":292}],291:[function(require,module,exports){
"use strict";
var NodesPanelController = require("substance-composer").NodesPanelController;

var _ = require("underscore");
var util = require("substance-util");
var MetadataView = require("./metadata_view");

// MetadataController
// -----------------
//

var MetadataController = function(doc, writerCtrl) {
  NodesPanelController.call(this, doc, writerCtrl);
  this.state = {id: "initialized"};
};

MetadataController.Prototype = function() {

  // Get Nodes for panel
  // -----------------
  // 
  // // This is called by NodesPanelView.build

  this.getNodes = function() {
    var nodes = [];

    // Get data from info view (=container) node
    var infoNode = this.document.get('info');

    _.each(infoNode.nodes, function(nodeId) {
      nodes.push(this.document.get(nodeId));
    }, this);
    
    return nodes;
  };


  this.createView = function() {
    if (!this.view) {
      this.view = new MetadataView(this, this.createViewFactory());
    }
    return this.view;
  };

  this.initialize = function(newState, cb) {
    cb(null);
  };

  this.transition = function(newState, cb) {
    // Nothing to do here
    cb(null);
  };

  // Trigger view transition on state change
  // -----------------
  //

  this.afterTransition = function(oldState) {
    this.view.transition(oldState);
  };
};

MetadataController.Prototype.prototype = NodesPanelController.prototype;
MetadataController.prototype = new MetadataController.Prototype();
MetadataController.prototype.constructor = MetadataController;

module.exports = MetadataController;

},{"./metadata_view":293,"substance-composer":37,"substance-util":268,"underscore":273}],292:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Panel = require("substance-composer").Panel;
var MetadataController = require("./metadata_controller");

var MetadataPanel = function() {
	Panel.call(this, 'metadata');
};

MetadataPanel.Prototype = function() {

  this.createController = function(doc, writerCtrl) {
    return new MetadataController(doc, writerCtrl);
  };
};

MetadataPanel.Prototype.prototype = Panel.prototype;
MetadataPanel.prototype = new MetadataPanel.Prototype();
MetadataPanel.prototype.constructor = MetadataPanel;

module.exports = MetadataPanel;
},{"./metadata_controller":291,"substance-composer":37,"underscore":273}],293:[function(require,module,exports){
var NodesPanelView = require('substance-composer').NodesPanelView;
var _ = require("underscore");

var MetadataView = function(controller, viewFactory) {
  NodesPanelView.call(this, controller, viewFactory, {
    name: "metadata",
    label: "Info",
    title: "Info",
    type: "resource",
    icon: "icon-info"
  });

  this.writerCtrl = this.controller.writerCtrl;
  this.$el.addClass('metadata-panel');
};

MetadataView.Prototype = function() {

  this.focusResource = function(entityId) {
    // this.$('.entity.active').removeClass('active');
    // var $entity = this.$('.entity[data-id='+entityId+']');
    // $entity.addClass('active');
  };
};

MetadataView.Prototype.prototype = NodesPanelView.prototype;
MetadataView.prototype = new MetadataView.Prototype();
MetadataView.prototype.constructor = MetadataView;

module.exports = MetadataView;
},{"substance-composer":37,"underscore":273}],294:[function(require,module,exports){
module.exports = require("./persons_panel");

},{"./persons_panel":296}],295:[function(require,module,exports){
"use strict";
var EntityPanelController = require("../entity_panel_controller");

var PersonsView = require("./persons_view");
var _ = require("underscore");
var util = require("substance-util");


// Locations.Controller
// -----------------
//

var PersonsController = function(doc, writerCtrl) {
  EntityPanelController.call(this, doc, writerCtrl);
};

PersonsController.Prototype = function() {

  this.createView = function() {
    if (!this.view) {
      this.view = new PersonsView(this);
    }
    return this.view;
  };

  this.getEntities = function() {
    return this.metadataService.getPersons();
  };
};

PersonsController.Prototype.prototype = EntityPanelController.prototype;
PersonsController.prototype = new PersonsController.Prototype();

module.exports = PersonsController;

},{"../entity_panel_controller":284,"./persons_view":297,"substance-util":268,"underscore":273}],296:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Panel = require("substance-composer").Panel;

var PersonsController = require("./persons_controller");

var PersonsPanel = function() {
	Panel.call(this, 'persons');
};

PersonsPanel.Prototype = function() {
  this.createController = function(doc, writerCtrl) {
    return new PersonsController(doc, writerCtrl);
  };
};

PersonsPanel.Prototype.prototype = Panel.prototype;
PersonsPanel.prototype = new PersonsPanel.Prototype();
PersonsPanel.prototype.constructor = PersonsPanel;

module.exports = PersonsPanel;
},{"./persons_controller":295,"substance-composer":37,"underscore":273}],297:[function(require,module,exports){
var EntityPanelView = require('../entity_panel_view');

var PersonsView = function(controller) {
  EntityPanelView.call(this, controller, {
    entityType: "person",
    name: 'persons',
    label: 'Persons',
    title: 'Persons',
    type: 'resource',
    icon: 'icon-user'
  });
};

PersonsView.Prototype = function() {

  this.renderEntity = function(person) {
    var $person = $('<div>').addClass('person entity').attr("data-id", person.id);

    // Name
    $person.append($('<div>').addClass('person-name').html(person.name));

    // Biography
    $person.append($('<div>').addClass('person-bio').html(person.bio));

    return $person;
  };
};

PersonsView.Prototype.prototype = EntityPanelView.prototype;
PersonsView.prototype = new PersonsView.Prototype();
PersonsView.prototype.constructor = PersonsView;

module.exports = PersonsView;

},{"../entity_panel_view":285}],298:[function(require,module,exports){
module.exports = require("./subjects_panel");

},{"./subjects_panel":300}],299:[function(require,module,exports){
"use strict";
var PanelController = require("substance-composer").PanelController;
var SubjectsView = require("./subjects_view");
var _ = require("underscore");


// A simple tree implementation
// -------------

var Tree = function(nodes) {
  this.nodes = nodes;
  this.buildIndexes();
};

Tree.Prototype = function() {

  this.buildIndexes = function() {
    // Build a map of parents referencing their kids
    this.parentIndex = {};
    _.each(this.nodes, function(node) {
      var parent = node.parent || "root";
      if (!this.parentIndex[parent]) {
        this.parentIndex[parent] = [ node ];
      } else {
        this.parentIndex[parent].push(node);
      }
    }, this);
  };

  // Get a node by id
  this.get = function(id) {
    return this.nodes[id];
  };

  // Get children nodes for a given node using our parentIndex
  this.getChildren = function(nodeId) {
    return this.parentIndex[nodeId] || [];
  };

  // Get parent node for a given nodeId
  this.getParent = function(nodeId) {
    var node = this.nodes[nodeId];
    return this.nodes[node.parent];
  };

  // Walk the tree
  this.walkTree = function(fn, ctx) {
    var self = this;
    if (!ctx) ctx = this;

    function _walkTree(rootNode, fn, ctx) {
      if (rootNode !== "root") {
        fn.call(ctx, rootNode);  
      }

      _.each(self.getChildren(rootNode.id), function(child) {
        _walkTree(child, fn, ctx);
      });
    }

    return _walkTree("root", fn, ctx);
  };
};

Tree.prototype = new Tree.Prototype();

var SubjectsController = function(doc, writerCtrl) {
  PanelController.call(this, doc, writerCtrl);

  this.updateSubjects();
  this.writerCtrl.document.on('metadata:updated', _.bind(this.updateSubjects, this));
};

SubjectsController.Prototype = function() {

  this.updateSubjects = function() {
    var subjects = this.writerCtrl.document.metadata.getSubjects();

    this.tree = new Tree(subjects);

    // updating subjectsview if available
    if (this.view) {
      this.view.updateView();
    }
  };

  this.createView = function() {
    if (!this.view) {
      this.view = new SubjectsView(this);
    }
    return this.view;
  };

  // Used by: SubjectsView.renderList()

  this.getAllReferencedSubjects = function() {
    var doc = this.document;
    var subjectReferences = doc.getIndex("multi_annotations").get("content");
    var availableSubjects = this.getSubjects();

    var subjects = []; // The result

    _.each(subjectReferences, function(subjectRef) {
      _.each(subjectRef.target, function(subjectId) {
        if (availableSubjects[subjectId]) {
          subjects.push(availableSubjects[subjectId]);
        }
      }, this);
    }, this);

    return subjects;
  };

  // Retrieve all referenced subjects for a given subjectReferenceId
  // Used by: SubjectsView.renderShow()

  this.getReferencedSubjects = function(subjectReferenceId) {
    var annotation = this.document.get(subjectReferenceId);
    // just to make sure
    if (!annotation) return [];
    var availableSubjects = this.getSubjects();

    var referencedSubjects = [];
    _.each(annotation.target, function(subjectId) {
      if (availableSubjects[subjectId]) {
        referencedSubjects.push(availableSubjects[subjectId]);
      }
    });
    return referencedSubjects;
  };

  this.getSubjects = function() {
    var doc = this.document;
    var subjects = doc.metadata.getSubjects();
    return subjects;
  };

  this.getSubjectsTree = function() {
    var tree = this.tree;

    function getChildren(parentId) {
      var res = [];
      var nodes = tree.getChildren(parentId);
      if (nodes.length === 0) return res; // exit condition

      _.each(nodes, function(node) {
        var entry = {
          id: node.id,
          text: node.name,
          children: getChildren(node.id) // get children for subj
        };
        res.push(entry);
      });
      return res;
    }

    return getChildren("root");
  };

  this.getFullPathForSubject = function(subjectId) {
    var tree = this.tree;
    var res = [];

    function getParent(nodeId) {
      var node = tree.get(nodeId);
      var parent = tree.getParent(nodeId);
      if (parent) getParent(parent.id);

      res.push(node.name);
      return res;
    }
    return getParent(subjectId);
  };
};


SubjectsController.Prototype.prototype = PanelController.prototype;
SubjectsController.prototype = new SubjectsController.Prototype();

module.exports = SubjectsController;

},{"./subjects_view":301,"substance-composer":37,"underscore":273}],300:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Panel = require("substance-composer").Panel;
var SubjectsController = require("./subjects_controller");

var SubjectsPanel = function() {
	Panel.call(this, 'subjects');
};

SubjectsPanel.Prototype = function() {
  this.createController = function(doc, writerCtrl) {
    return new SubjectsController(doc, writerCtrl);
  };
};

SubjectsPanel.Prototype.prototype = Panel.prototype;
SubjectsPanel.prototype = new SubjectsPanel.Prototype();
SubjectsPanel.prototype.constructor = SubjectsPanel;

module.exports = SubjectsPanel;
},{"./subjects_controller":299,"substance-composer":37,"underscore":273}],301:[function(require,module,exports){
var PanelView = require('substance-composer').PanelView;
var $$ = require("substance-application").$$;
var _ = require("underscore");

var SubjectsView = function(controller) {
  PanelView.call(this, controller, {
    name: 'subjects',
    label: 'Subjects',
    title: 'Subjects',
    type: 'resource',
    icon: 'icon-tag'
  });

  // Shortcut for writerCtrl
  this.writerCtrl = this.controller.writerCtrl;

  this.$el.addClass('entities subjects');
  this.$el.on('click', '.confirm-selection', _.bind(this.confirmSelection, this));
  this.$el.on('click', '.edit-subject-reference', _.bind(this.enableSelection, this));
  this.$el.on('click', '.delete-subject-reference', _.bind(this.deleteSubjectReference, this));
  this.$el.on('click', '.cancel-edit', _.bind(this.cancelEdit, this));


};

SubjectsView.Prototype = function() {

  this.cancelEdit = function() {
    var state = this.writerCtrl.state;
    // TODO: delete if there are no subjects assigned
    this.writerCtrl.switchState({
      id: "main",
      contextId: "subjects",
      subjectReferenceId: state.subjectReferenceId
    }, {"no-scroll": true});
  };

  this.deleteSubjectReference = function(e) {
    if (e) e.preventDefault();
    var state = this.writerCtrl.state;
    var doc = this.writerCtrl.document;
    var subjectReferenceId = state.subjectReferenceId;

    var frags = doc.getAnnotationFragments(subjectReferenceId);

    _.each(frags, function(frag) {
      doc.delete(frag.id);
    }, this);

    doc.delete(subjectReferenceId);

    this.writerCtrl.switchState({
      id: "main",
      contextId: "subjects"
    }, {"no-scroll": true});
  };

  // We enable subject selection when the user requests it
  this.enableSelection = function(e) {
    e.preventDefault();
    var state = this.writerCtrl.state;

    this.writerCtrl.switchState({
      id: "main",
      contextId: "subjects",
      subjectReferenceId: state.subjectReferenceId,
      mode: "select"
    }, {"no-scroll": true});
  };

  this.confirmSelection = function(e) {
    e.preventDefault();

    var subjectIds = $(this.treeView).jstree().get_selected();
    var state = this.writerCtrl.state;
    var doc = this.writerCtrl.document;

    var annotationId = state.subjectReferenceId;
    doc.set([annotationId, "target"], subjectIds);

    this.writerCtrl.contentCtrl._afterEdit();
    
    this.writerCtrl.switchState({
      id: "main",
      contextId: "subjects",
      subjectReferenceId: annotationId,
      mode: "show"
    }, {updateRoute: true, replace: true});


  };

  this.updateView = function(viewState) {
    // Remember view state
    if (viewState) {
      this.viewState = viewState;
    }

    this.el.innerHTML = "";

    if (this.viewState.mode === 'select') {
      this.renderSelectMode();
    } else if (this.viewState.mode === 'show') {
      this.renderShowMode();
    } else { // default is list mode
      this.renderListMode();
    }
  };

  this.renderShowMode = function() {
    this.el.innerHTML = '';

    // Gather nodes
    var subjects = this.controller.getReferencedSubjects(this.viewState.subjectReferenceId);

    this.headerEl = $$('.header', {text: "Annotated text"});
    this.actionsEl = $$('.actions');
    this.actionsEl.appendChild($$('a.action.edit-subject-reference', {href: "#", text: "Edit"}));
    this.actionsEl.appendChild($$('a.action.delete-subject-reference', {href: "#", text: "Delete"}));
    this.headerEl.appendChild(this.actionsEl);

    this.el.appendChild(this.headerEl);
    this.renderSubjectsList(subjects);
  };

  this.renderSubjectsList = function(subjects) {
    this.subjectsEl = $$('.subjects.entities');

    _.each(subjects, function(subject) {
      var fullPath = this.controller.getFullPathForSubject(subject.id);
      

      var subjectEl = $$('.subject.entity', {
        children: [ $$('.subject-name', {text: fullPath.join(' > ') })]
      });
      this.subjectsEl.appendChild(subjectEl);
    }, this);

    this.el.appendChild(this.subjectsEl);
  };

  this.renderListMode = function() {
    this.el.innerHTML = '';
    var subjects = this.controller.getAllReferencedSubjects();
    this.headerEl = $$('.header', {text: subjects.length + " subjects annotated in this interview"});
    this.el.appendChild(this.headerEl);
    this.renderSubjectsList(subjects);
  };

  // Shows a tree to select from available
  this.renderSelectMode = function() {
    var state = this.writerCtrl.state;
    var doc = this.writerCtrl.document;
    var annotation = doc.get(state.subjectReferenceId);

    this.headerEl = $$('.header', {text: "Please choose relevant subjects"});
    this.el.appendChild(this.headerEl);
    this.actionsEl = $$('.actions');
    this.actionsEl.appendChild($$('a.action.confirm-selection', {href: "#", text: "Save"}));

    if (!annotation.target || annotation.target.length === 0) {
      this.actionsEl.appendChild($$('a.action.delete-subject-reference', {href: "#", text: "Cancel"}));  
    }

    // this.actionsEl.appendChild($$('a.action.cancel-edit', {href: "#", text: "Cancel"}));
    this.headerEl.appendChild(this.actionsEl);

    // Used for add and edit workflow
    this.availableSubjects = $$('.available-subjects');
    var treeView = this.treeView = $$('.tree-view');

    // Attach extra stuff
    this.availableSubjects.appendChild(this.treeView);

    // TreeView for selecting a subject
    // --------------

    var subjectsTree = this.controller.getSubjectsTree();

    $(this.treeView).jstree({
      "checkbox" : {
        // "keep_selected_style" : false,
        // "cascade": "up+down",
        "three_state": false
      },
      "plugins" : ["checkbox"],
      'core' : {
        'data' : subjectsTree
      }
    });

    if (state.subjectReferenceId) { // always?
      // Set currently selected subjects
      _.delay(function() {
        
        _.each(annotation.target, function(subjectId) {
          $('.jstree').jstree('select_node', subjectId);
        }, this);
      }, 200, this);
    }

    this.el.appendChild(this.availableSubjects);
  };

  this.render = function() {
    this.renderListMode();
    return this;
  };
};

SubjectsView.Prototype.prototype = PanelView.prototype;
SubjectsView.prototype = new SubjectsView.Prototype();
SubjectsView.prototype.constructor = SubjectsView;

module.exports = SubjectsView;

},{"substance-application":10,"substance-composer":37,"underscore":273}],302:[function(require,module,exports){
var DefinitionTool = function() {
  this.name = "definition";
  this.title = "Definition";
  this.icon = "icon-book";
  this.action = "select-definition";
};

DefinitionTool.Prototype = function() {

  this.isActive = function(ctrl) {
    return !!ctrl.getActiveAnnotationByType("definition_reference");
  };

  this.isEnabled = function(ctrl) {
    var editor = ctrl.getCurrentEditor();
    if (!editor) return false;
    if (editor.view !== "content") return false;
    
    var sel = editor.selection;
    return !sel.isCollapsed();
  };

  this.handleToggle = function(ctrl) {
    var activeAnnotation = ctrl.getActiveAnnotationByType("definition_reference");
    if (activeAnnotation) {
      ctrl.deleteAnnotation(activeAnnotation);
    } else {
      ctrl.workflows["tag_entity"].beginWorkflow("definition");
    }
  };
};

DefinitionTool.Prototype.prototype = DefinitionTool.prototype;
DefinitionTool.prototype = new DefinitionTool.Prototype();
DefinitionTool.prototype.constructor = DefinitionTool;

module.exports = DefinitionTool;

},{}],303:[function(require,module,exports){
var LocationTool = function() {
  this.name = "location";
  this.title = "Location";
  this.icon = "icon-location-arrow";
  this.action = "select-location";
};

LocationTool.Prototype = function() {

  this.isActive = function(ctrl) {
    return !!ctrl.getActiveAnnotationByType("location_reference");
  };

  this.isEnabled = function(ctrl) {
    var editor = ctrl.getCurrentEditor();
    if (!editor) return false;
    if (editor.view !== "content") return false;
    
    var sel = editor.selection;
    return !sel.isCollapsed();
  };

  this.handleToggle = function(ctrl) {
    var activeAnnotation = ctrl.getActiveAnnotationByType("location_reference");
    if (activeAnnotation) {
      ctrl.deleteAnnotation(activeAnnotation);
    } else {
      console.log('TODO Begin tag location workflow');
      ctrl.workflows["tag_entity"].beginWorkflow("location");
    }
  };
};

LocationTool.Prototype.prototype = LocationTool.prototype;
LocationTool.prototype = new LocationTool.Prototype();
LocationTool.prototype.constructor = LocationTool;

module.exports = LocationTool;

},{}],304:[function(require,module,exports){
var PersonTool = function() {
  this.name = "person";
  this.title = "Person";
  this.icon = "icon-user";
  this.action = "select-person";
};

PersonTool.Prototype = function() {

  this.isActive = function(ctrl) {
    return !!ctrl.getActiveAnnotationByType("person_reference");
  };

  this.isEnabled = function(ctrl) {
    var editor = ctrl.getCurrentEditor();
    if (!editor) return false;
    if (editor.view !== "content") return false;
    
    var sel = editor.selection;
    return !sel.isCollapsed();
  };

  this.handleToggle = function(ctrl) {
    var activeAnnotation = ctrl.getActiveAnnotationByType("person_reference");
    if (activeAnnotation) {
      ctrl.deleteAnnotation(activeAnnotation);
    } else {
      ctrl.workflows["tag_entity"].beginWorkflow("person");
    }
  };
};

PersonTool.Prototype.prototype = PersonTool.prototype;
PersonTool.prototype = new PersonTool.Prototype();
PersonTool.prototype.constructor = PersonTool;

module.exports = PersonTool;

},{}],305:[function(require,module,exports){
var SubjectTool = function() {
  this.name = "subject";
  this.title = "Subject";
  this.icon = "icon-tag";
  this.action = "select-subject";
};

SubjectTool.Prototype = function() {

  this.isActive = function(ctrl) {
    return !!ctrl.getActiveAnnotationByType("subject_reference");
  };

  this.isEnabled = function(ctrl) {
    var editor = ctrl.getCurrentEditor();
    if (!editor) return false;
    if (editor.view !== "content") return false;
    
    var sel = editor.selection;
    return !sel.isCollapsed();
  };

  this.handleToggle = function(ctrl) {
    var activeAnnotation = ctrl.getActiveAnnotationByType("subject_reference");
    if (activeAnnotation) {
      ctrl.deleteAnnotation(activeAnnotation);
    } else {
      ctrl.workflows["tag_subject"].beginWorkflow();
    }
  };
};

SubjectTool.Prototype.prototype = SubjectTool.prototype;
SubjectTool.prototype = new SubjectTool.Prototype();
SubjectTool.prototype.constructor = SubjectTool;

module.exports = SubjectTool;

},{}],306:[function(require,module,exports){
"use strict";

var _ = require("underscore");
var Workflow = require("substance-composer").Workflow;

var TagEntity = function() {
  Workflow.apply(this, arguments);

  this.handlers = [];
};

TagEntity.Prototype = function() {

  // Register handlers that trigger the workflow
  // ---------------
  // 
  // not used here since workflow is triggered by LocationTool

  this.registerHandlers = function() {
  };

  this.unRegisterHandlers = function() {
  };

  this.handlesStateUpdate = true;

  // Update view relevant state
  // ---------------

  this.handleStateUpdate = function(state, oldState, stateInfo) {
    var contextId = state.contextId;

    var entityPanel = this.writerView.panelViews[contextId];

    // Show all available locations and make them selectable
    if (state.id === "tagentity") {
      entityPanel.updateView({mode: "select"});
      return true;
    }

    // View only referenced locations
    if (oldState.id === "tagentity") {
      entityPanel.updateView({mode: "list"});
      this.writerView.focusResource();
      return true;
    }

    // When ever there's a state transition to the locations panel, refresh the list
    // of tagged locations
    // if (state.id === "locations") {
    //   entityPanel.updateView({mode: "select"});
    //   return true;
    // }

    return false; // Not handled here
  };

  // Add location reference
  // ---------------

  this.beginWorkflow = function(entityType) {
    var doc = this.writerCtrl.document;
    var currentSession = this.writerCtrl.currentSession;
    var recoverSha = doc.state;

    if (!currentSession) {
      console.error("Workflow 'beginAddLocation': nothing selected.");
      return false;
    }
    var container = currentSession.container;
    var selection = currentSession.selection;

    if (selection.isNull()) {
      throw new Error("Selection is null.");
    }

    var containerId = currentSession.container.id;
    var cursor = selection.getCursor();
    var node = container.getRootNodeFromPos(cursor.pos);
    var charPos = cursor.charPos;

    this.writerCtrl.switchState({
      id: "tagentity",
      contextId: entityType+"s",
      containerId: containerId,
      nodeId: node.id,
      recover: recoverSha,
      // Note: app states can only contain string variables
      charPos: ""+charPos
    }, {"no-scroll": true});
  };

  // nodeId or null if cancelled
  this.endWorkflow = function(entityId, entityType) {
    var editorCtrl = this.writerCtrl.contentCtrl;
    editorCtrl.addReference(entityType+"_reference", {target: entityId});
    // Note: this will trigger an implicit state change via selection change.
    editorCtrl.focus();
  };
};

TagEntity.Prototype.prototype = Workflow.prototype;
TagEntity.prototype = new TagEntity.Prototype();

module.exports = TagEntity;

},{"substance-composer":37,"underscore":273}],307:[function(require,module,exports){
"use strict";

var Workflow = require("substance-composer").Workflow;

var TagSubject = function() {
  Workflow.apply(this, arguments);
  this.handlers = [];
};

TagSubject.Prototype = function() {

  // Register handlers that trigger the workflow
  // ---------------
  //
  // not used here since workflow is triggered by LocationTool

  this.registerHandlers = function() {
  };

  this.unRegisterHandlers = function() {
  };

  this.handlesStateUpdate = true;

  // Update view relevant state
  // ---------------

  this.handleStateUpdate = function(state, oldState, stateInfo) {
    var subjectsPanel = this.writerView.panelViews["subjects"];

    console.log('handling state update...');
    // Show all available subjects and make them selectable
    // if (state.id === "tagsubject") {
    //   subjectsPanel.updateView({
    //     mode: "select",
    //     subjectReferenceId: state.subjectReferenceId
    //   });
    //   return true;
    // }

    // View only referenced subjects
    // if (oldState.id === "tagsubject") {
    //   subjectsPanel.updateView({mode: "list"});
    //   this.writerView.focusResource();
    //   return true;
    // }

    // Display subjects that have been assigned to a particular subject reference
    // TODO: this should actually not live here as it has nothing to do with the tag_subject workflow
    // IDEA: Allow panels to define state change behavior
    if (state.id === "main" && state.subjectReferenceId) {
      var mode = state.mode || "show";

      subjectsPanel.updateView({
        mode: mode,
        subjectReferenceId: state.subjectReferenceId
      });

      this.writerView.contentView.annotationBar.update();
      return true;
    } else if (oldState.subjectReferenceId && !state.subjectReferenceId) {
      this.writerView.contentView.annotationBar.update();
    }

    // In all other cases have the panel in list mode
    subjectsPanel.updateView({mode: "list"});

    return false; // Not handled here
  };

  // Add location reference
  // ---------------

  this.beginWorkflow = function() {
    var doc = this.writerCtrl.document;
    var currentSession = this.writerCtrl.currentSession;
    var recoverSha = doc.state;

    if (!currentSession) {
      return false;
    }
    var container = currentSession.container;
    var selection = currentSession.selection;

    if (selection.isNull()) {
      throw new Error("Selection is null.");
    }

    var containerId = currentSession.container.id;
    var cursor = selection.getCursor();
    var node = container.getRootNodeFromPos(cursor.pos);
    var charPos = cursor.charPos;

    // Create subject annotation
    var editorCtrl = this.writerCtrl.contentCtrl;
    var state = this.writerCtrl.state;

    var annotationId = editorCtrl.addMultiAnnotation("subject_reference", {target: [], container: "content"});

    // Transition to highlight the subjectReference we just created
    this.writerCtrl.switchState({
      id: "main",
      contextId: "subjects",
      subjectReferenceId: annotationId,
      mode: "select"
    }, {updateRoute: true, replace: true});

    this.endWorkflow();
  };

  // nodeId or null if cancelled
  this.endWorkflow = function(entityIds) {
    // No longer needed
  };
};

TagSubject.Prototype.prototype = Workflow.prototype;
TagSubject.prototype = new TagSubject.Prototype();

module.exports = TagSubject;

},{"substance-composer":37}]},{},[4]);
