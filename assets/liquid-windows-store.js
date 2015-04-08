/* jshint ignore:start */

/* jshint ignore:end */

define('liquid-windows-store/adapters/application', ['exports', 'ember-data'], function (exports, DS) {

	'use strict';

	exports['default'] = DS['default'].FixtureAdapter.extend({});

});
define('liquid-windows-store/app', ['exports', 'ember', 'ember/resolver', 'ember/load-initializers', 'liquid-windows-store/config/environment'], function (exports, Ember, Resolver, loadInitializers, config) {

  'use strict';

  var App;

  Ember['default'].MODEL_FACTORY_INJECTIONS = true;

  App = Ember['default'].Application.extend({
    modulePrefix: config['default'].modulePrefix,
    podModulePrefix: config['default'].podModulePrefix,
    Resolver: Resolver['default']
  });

  loadInitializers['default'](App, config['default'].modulePrefix);

  exports['default'] = App;

});
define('liquid-windows-store/components/lf-outlet', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

	'use strict';

	exports['default'] = ember_internals.StaticOutlet;

});
define('liquid-windows-store/components/lf-overlay', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  var COUNTER = '__lf-modal-open-counter';

  exports['default'] = Ember['default'].Component.extend({
    tagName: 'span',
    classNames: ['lf-overlay'],

    didInsertElement: function didInsertElement() {
      var body = Ember['default'].$('body');
      var counter = body.data(COUNTER) || 0;
      body.addClass('lf-modal-open');
      body.data(COUNTER, counter + 1);
    },

    willDestroy: function willDestroy() {
      var body = Ember['default'].$('body');
      var counter = body.data(COUNTER) || 0;
      body.data(COUNTER, counter - 1);
      if (counter < 2) {
        body.removeClass('lf-modal-open');
      }
    }
  });

});
define('liquid-windows-store/components/liquid-child', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    classNames: ['liquid-child'],
    attributeBindings: ['style'],
    style: Ember['default'].computed('visible', function () {
      return new Ember['default'].Handlebars.SafeString(this.get('visible') ? '' : 'visibility:hidden');
    }),
    tellContainerWeRendered: Ember['default'].on('didInsertElement', function () {
      this.sendAction('didRender', this);
    })
  });

});
define('liquid-windows-store/components/liquid-container', ['exports', 'ember', 'liquid-fire/growable', 'liquid-windows-store/components/liquid-measured'], function (exports, Ember, Growable, liquid_measured) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend(Growable['default'], {
    classNames: ["liquid-container"],
    classNameBindings: ["liquidAnimating"],

    lockSize: function lockSize(elt, want) {
      elt.outerWidth(want.width);
      elt.outerHeight(want.height);
    },

    unlockSize: function unlockSize() {
      var _this = this;

      var doUnlock = function doUnlock() {
        if (!_this.isDestroyed) {
          _this.set("liquidAnimating", false);
        }
        var elt = _this.$();
        if (elt) {
          elt.css({ width: "", height: "" });
        }
      };
      if (this._scaling) {
        this._scaling.then(doUnlock);
      } else {
        doUnlock();
      }
    },

    startMonitoringSize: Ember['default'].on("didInsertElement", function () {
      this._wasInserted = true;
    }),

    actions: {

      willTransition: function willTransition(versions) {
        if (!this._wasInserted) {
          return;
        }

        // Remember our own size before anything changes
        var elt = this.$();
        this._cachedSize = liquid_measured.measure(elt);

        // And make any children absolutely positioned with fixed sizes.
        for (var i = 0; i < versions.length; i++) {
          goAbsolute(versions[i]);
        }

        // Apply '.liquid-animating' to liquid-container allowing
        // any customizable CSS control while an animating is occuring
        this.set("liquidAnimating", true);
      },

      afterChildInsertion: function afterChildInsertion(versions) {
        var elt = this.$();

        // Measure  children
        var sizes = [];
        for (var i = 0; i < versions.length; i++) {
          if (versions[i].view) {
            sizes[i] = liquid_measured.measure(versions[i].view.$());
          }
        }

        // Measure ourself again to see how big the new children make
        // us.
        var want = liquid_measured.measure(elt);
        var have = this._cachedSize || want;

        // Make ourself absolute
        this.lockSize(elt, have);

        // Make the children absolute and fixed size.
        for (i = 0; i < versions.length; i++) {
          goAbsolute(versions[i], sizes[i]);
        }

        // Kick off our growth animation
        this._scaling = this.animateGrowth(elt, have, want);
      },

      afterTransition: function afterTransition(versions) {
        for (var i = 0; i < versions.length; i++) {
          goStatic(versions[i]);
        }
        this.unlockSize();
      }
    }
  });

  function goAbsolute(version, size) {
    if (!version.view) {
      return;
    }
    var elt = version.view.$();
    var pos = elt.position();
    if (!size) {
      size = liquid_measured.measure(elt);
    }
    elt.outerWidth(size.width);
    elt.outerHeight(size.height);
    elt.css({
      position: "absolute",
      top: pos.top,
      left: pos.left
    });
  }

  function goStatic(version) {
    if (version.view) {
      version.view.$().css({ width: "", height: "", position: "" });
    }
  }

});
define('liquid-windows-store/components/liquid-if', ['exports', 'ember', 'liquid-fire/ember-internals'], function (exports, Ember, ember_internals) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    _yieldInverse: ember_internals.inverseYieldMethod,
    hasInverse: Ember['default'].computed('inverseTemplate', function () {
      return !!this.get('inverseTemplate');
    })
  });

});
define('liquid-windows-store/components/liquid-measured', ['exports', 'liquid-fire/mutation-observer', 'ember'], function (exports, MutationObserver, Ember) {

  'use strict';

  exports.measure = measure;

  exports['default'] = Ember['default'].Component.extend({

    didInsertElement: function didInsertElement() {
      var self = this;

      // This prevents margin collapse
      this.$().css({
        overflow: "auto"
      });

      this.didMutate();

      this.observer = new MutationObserver['default'](function (mutations) {
        self.didMutate(mutations);
      });
      this.observer.observe(this.get("element"), {
        attributes: true,
        subtree: true,
        childList: true,
        characterData: true
      });
      this.$().bind("webkitTransitionEnd", function () {
        self.didMutate();
      });
      // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
      window.addEventListener("unload", function () {
        self.willDestroyElement();
      });
    },

    willDestroyElement: function willDestroyElement() {
      if (this.observer) {
        this.observer.disconnect();
      }
    },

    transitionMap: Ember['default'].inject.service("liquid-fire-transitions"),

    didMutate: function didMutate() {
      // by incrementing the running transitions counter here we prevent
      // tests from falling through the gap between the time they
      // triggered mutation the time we may actually animate in
      // response.
      var tmap = this.get("transitionMap");
      tmap.incrementRunningTransitions();
      Ember['default'].run.next(this, function () {
        this._didMutate();
        tmap.decrementRunningTransitions();
      });
    },

    _didMutate: function _didMutate() {
      var elt = this.$();
      if (!elt || !elt[0]) {
        return;
      }
      this.set("measurements", measure(elt));
    }

  });
  function measure($elt) {
    var width, height;

    // if jQuery sees a zero dimension, it will temporarily modify the
    // element's css to try to make its size measurable. But that's bad
    // for us here, because we'll get an infinite recursion of mutation
    // events. So we trap the zero case without hitting jQuery.

    if ($elt[0].offsetWidth === 0) {
      width = 0;
    } else {
      width = $elt.outerWidth();
    }
    if ($elt[0].offsetHeight === 0) {
      height = 0;
    } else {
      height = $elt.outerHeight();
    }

    return {
      width: width,
      height: height
    };
  }

});
define('liquid-windows-store/components/liquid-modal', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    classNames: ['liquid-modal'],
    currentContext: Ember['default'].computed.oneWay('owner.modalContexts.lastObject'),

    owner: Ember['default'].inject.service('liquid-fire-modals'),

    innerView: Ember['default'].computed('currentContext', function () {
      var self = this,
          current = this.get('currentContext'),
          name = current.get('name'),
          container = this.get('container'),
          component = container.lookup('component-lookup:main').lookupFactory(name);
      Ember['default'].assert('Tried to render a modal using component \'' + name + '\', but couldn\'t find it.', !!component);

      var args = Ember['default'].copy(current.get('params'));

      args.registerMyself = Ember['default'].on('init', function () {
        self.set('innerViewInstance', this);
      });

      // set source so we can bind other params to it
      args._source = Ember['default'].computed(function () {
        return current.get('source');
      });

      var otherParams = current.get('options.otherParams');
      var from, to;
      for (from in otherParams) {
        to = otherParams[from];
        args[to] = Ember['default'].computed.alias('_source.' + from);
      }

      var actions = current.get('options.actions') || {};

      // Override sendAction in the modal component so we can intercept and
      // dynamically dispatch to the controller as expected
      args.sendAction = function (name) {
        var actionName = actions[name];
        if (!actionName) {
          this._super.apply(this, Array.prototype.slice.call(arguments));
          return;
        }

        var controller = current.get('source');
        var args = Array.prototype.slice.call(arguments, 1);
        args.unshift(actionName);
        controller.send.apply(controller, args);
      };

      return component.extend(args);
    }),

    actions: {
      outsideClick: function outsideClick() {
        if (this.get('currentContext.options.dismissWithOutsideClick')) {
          this.send('dismiss');
        } else {
          proxyToInnerInstance(this, 'outsideClick');
        }
      },
      escape: function escape() {
        if (this.get('currentContext.options.dismissWithEscape')) {
          this.send('dismiss');
        } else {
          proxyToInnerInstance(this, 'escape');
        }
      },
      dismiss: function dismiss() {
        var source = this.get('currentContext.source'),
            proto = source.constructor.proto(),
            params = this.get('currentContext.options.withParams'),
            clearThem = {};

        for (var key in params) {
          if (proto[key] instanceof Ember['default'].ComputedProperty) {
            clearThem[key] = undefined;
          } else {
            clearThem[key] = proto[key];
          }
        }
        source.setProperties(clearThem);
      }
    }
  });

  function proxyToInnerInstance(self, message) {
    var vi = self.get('innerViewInstance');
    if (vi) {
      vi.send(message);
    }
  }

});
define('liquid-windows-store/components/liquid-outlet', ['exports', 'ember', 'liquid-fire/ember-internals'], function (exports, Ember, ember_internals) {

	'use strict';

	exports['default'] = Ember['default'].Component.extend(ember_internals.OutletBehavior);

});
define('liquid-windows-store/components/liquid-spacer', ['exports', 'liquid-windows-store/components/liquid-measured', 'liquid-fire/growable', 'ember'], function (exports, liquid_measured, Growable, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend(Growable['default'], {
    enabled: true,

    didInsertElement: function didInsertElement() {
      var child = this.$("> div");
      var measurements = this.myMeasurements(liquid_measured.measure(child));
      this.$().css({
        overflow: "hidden",
        outerWidth: measurements.width,
        outerHeight: measurements.height
      });
    },

    sizeChange: Ember['default'].observer("measurements", function () {
      if (!this.get("enabled")) {
        return;
      }
      var elt = this.$();
      if (!elt || !elt[0]) {
        return;
      }
      var want = this.myMeasurements(this.get("measurements"));
      var have = liquid_measured.measure(this.$());
      this.animateGrowth(elt, have, want);
    }),

    // given our child's outerWidth & outerHeight, figure out what our
    // outerWidth & outerHeight should be.
    myMeasurements: function myMeasurements(childMeasurements) {
      var elt = this.$();
      return {
        width: childMeasurements.width + sumCSS(elt, padding("width")) + sumCSS(elt, border("width")),
        height: childMeasurements.height + sumCSS(elt, padding("height")) + sumCSS(elt, border("height"))
      };
      //if (this.$().css('box-sizing') === 'border-box') {
    }

  });

  function sides(dimension) {
    return dimension === "width" ? ["Left", "Right"] : ["Top", "Bottom"];
  }

  function padding(dimension) {
    var s = sides(dimension);
    return ["padding" + s[0], "padding" + s[1]];
  }

  function border(dimension) {
    var s = sides(dimension);
    return ["border" + s[0] + "Width", "border" + s[1] + "Width"];
  }

  function sumCSS(elt, fields) {
    var accum = 0;
    for (var i = 0; i < fields.length; i++) {
      var num = parseFloat(elt.css(fields[i]), 10);
      if (!isNaN(num)) {
        accum += num;
      }
    }
    return accum;
  }

});
define('liquid-windows-store/components/liquid-versions', ['exports', 'ember', 'liquid-fire/ember-internals'], function (exports, Ember, ember_internals) {

  'use strict';

  var get = Ember['default'].get;
  var set = Ember['default'].set;

  exports['default'] = Ember['default'].Component.extend({
    tagName: "",
    name: "liquid-versions",

    transitionMap: Ember['default'].inject.service("liquid-fire-transitions"),

    appendVersion: Ember['default'].on("init", Ember['default'].observer("value", function () {
      var versions = get(this, "versions");
      var firstTime = false;
      var newValue = get(this, "value");
      var oldValue;

      if (!versions) {
        firstTime = true;
        versions = Ember['default'].A();
      } else {
        oldValue = versions[0];
      }

      // TODO: may need to extend the comparison to do the same kind of
      // key-based diffing that htmlbars is doing.
      if (!firstTime && (!oldValue && !newValue || oldValue === newValue)) {
        return;
      }

      this.notifyContainer("willTransition", versions);
      var newVersion = {
        value: newValue,
        shouldRender: newValue || get(this, "renderWhenFalse")
      };
      versions.unshiftObject(newVersion);

      this.firstTime = firstTime;
      if (firstTime) {
        set(this, "versions", versions);
      }

      if (!newVersion.shouldRender && !firstTime) {
        this._transition();
      }
    })),

    _transition: function _transition() {
      var _this = this;

      var versions = get(this, "versions");
      var transition;
      var firstTime = this.firstTime;
      this.firstTime = false;

      this.notifyContainer("afterChildInsertion", versions);

      transition = get(this, "transitionMap").transitionFor({
        versions: versions,
        parentElement: Ember['default'].$(ember_internals.containingElement(this)),
        use: get(this, "use"),
        // Using strings instead of booleans here is an
        // optimization. The constraint system can match them more
        // efficiently, since it treats boolean constraints as generic
        // "match anything truthy/falsy" predicates, whereas string
        // checks are a direct object property lookup.
        firstTime: firstTime ? "yes" : "no",
        helperName: get(this, "name")
      });

      if (this._runningTransition) {
        this._runningTransition.interrupt();
      }
      this._runningTransition = transition;

      transition.run().then(function (wasInterrupted) {
        // if we were interrupted, we don't handle the cleanup because
        // another transition has already taken over.
        if (!wasInterrupted) {
          _this.finalizeVersions(versions);
          _this.notifyContainer("afterTransition", versions);
        }
      }, function (err) {
        _this.finalizeVersions(versions);
        _this.notifyContainer("afterTransition", versions);
        throw err;
      });
    },

    finalizeVersions: function finalizeVersions(versions) {
      versions.replace(1, versions.length - 1);
    },

    notifyContainer: function notifyContainer(method, versions) {
      var target = get(this, "notify");
      if (target) {
        target.send(method, versions);
      }
    },

    actions: {
      childDidRender: function childDidRender(child) {
        var version = get(child, "version");
        set(version, "view", child);
        this._transition();
      }
    }

  });

});
define('liquid-windows-store/components/liquid-with', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    name: "liquid-with"
  });

});
define('liquid-windows-store/components/lm-container', ['exports', 'ember', 'liquid-fire/tabbable'], function (exports, Ember) {

  'use strict';

  /*
     Parts of this file were adapted from ic-modal

     https://github.com/instructure/ic-modal
     Released under The MIT License (MIT)
     Copyright (c) 2014 Instructure, Inc.
  */

  var lastOpenedModal = null;
  Ember['default'].$(document).on("focusin", handleTabIntoBrowser);

  function handleTabIntoBrowser() {
    if (lastOpenedModal) {
      lastOpenedModal.focus();
    }
  }

  exports['default'] = Ember['default'].Component.extend({
    classNames: ["lm-container"],
    attributeBindings: ["tabindex"],
    tabindex: 0,

    keyUp: function keyUp(event) {
      // Escape key
      if (event.keyCode === 27) {
        this.sendAction();
      }
    },

    keyDown: function keyDown(event) {
      // Tab key
      if (event.keyCode === 9) {
        this.constrainTabNavigation(event);
      }
    },

    didInsertElement: function didInsertElement() {
      this.focus();
      lastOpenedModal = this;
    },

    willDestroy: function willDestroy() {
      lastOpenedModal = null;
    },

    focus: function focus() {
      if (this.get("element").contains(document.activeElement)) {
        // just let it be if we already contain the activeElement
        return;
      }
      var target = this.$("[autofocus]");
      if (!target.length) {
        target = this.$(":tabbable");
      }

      if (!target.length) {
        target = this.$();
      }

      target[0].focus();
    },

    constrainTabNavigation: function constrainTabNavigation(event) {
      var tabbable = this.$(":tabbable");
      var finalTabbable = tabbable[event.shiftKey ? "first" : "last"]()[0];
      var leavingFinalTabbable = finalTabbable === document.activeElement ||
      // handle immediate shift+tab after opening with mouse
      this.get("element") === document.activeElement;
      if (!leavingFinalTabbable) {
        return;
      }
      event.preventDefault();
      tabbable[event.shiftKey ? "last" : "first"]()[0].focus();
    },

    click: function click(event) {
      if (event.target === this.get("element")) {
        this.sendAction("clickAway");
      }
    }
  });

});
define('liquid-windows-store/components/ws-rating', ['exports', 'ember'], function (exports, Ember) {

	'use strict';

	exports['default'] = Ember['default'].Component.extend({});

});
define('liquid-windows-store/controllers/app', ['exports', 'ember'], function (exports, Ember) {

	'use strict';

	exports['default'] = Ember['default'].ObjectController.extend({});

});
define('liquid-windows-store/fixtures/app', ['exports'], function (exports) {

	'use strict';

	exports['default'] = [{DisplayPrice:"Free", id:"9WZDNCRFJB9S", ImageSource:"//store-images.microsoft.com/image/apps.57237.9007199266252569.76d6628e-0402-480b-aadf-cc208db47a94.3e8da3e0-d345-46fb-8c84-d43627c23771", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/word-preview/9wzdncrfjb9s", Rating:{IsProvided:false, AverageRatingPercentage:0, AverageRating:0, TotalRatingsCount:0}, Slotid:1, Title:"Word Preview", Type:"App", Usage:{AggregateTimeSpan:null, AverageRating:null, RatingCount:null, PlayCount:null, PurchaseCount:null, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFHVHM", ImageSource:"//store-images.microsoft.com/image/apps.48117.9007199266247826.ff148981-5b15-4a73-96d8-220b86ea1f43.b2d04673-b014-4dc9-a338-33bfa82b35f6", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/lync/9wzdncrfhvhm", Rating:{IsProvided:true, AverageRatingPercentage:60, AverageRating:3, TotalRatingsCount:1841}, Slotid:2, Title:"Lync", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3, RatingCount:1841, PlayCount:null, PurchaseCount:27026, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFHWKN", ImageSource:"//store-images.microsoft.com/image/apps.8588.9007199266246865.1720f63a-be0a-4a8f-b992-3521a568d90e.60a73923-0209-4d1e-94d0-f3cec64d7724", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/windows-sound-recorder/9wzdncrfhwkn", Rating:{IsProvided:true, AverageRatingPercentage:64, AverageRating:3.2, TotalRatingsCount:336}, Slotid:3, Title:"Windows Sound Recorder", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.2, RatingCount:336, PlayCount:null, PurchaseCount:4642, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ3PR", ImageSource:"//store-images.microsoft.com/image/apps.15072.9007199266246190.28984410-0f17-4f63-93e5-bd5f4cdd695b.1041a5f4-84f2-409c-9999-afada77a336c", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/windows-alarms/9wzdncrfj3pr", Rating:{IsProvided:true, AverageRatingPercentage:74, AverageRating:3.7, TotalRatingsCount:724}, Slotid:4, Title:"Windows Alarms", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.7, RatingCount:724, PlayCount:null, PurchaseCount:7840, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFHVJL", ImageSource:"//store-images.microsoft.com/image/apps.19270.9007199266248565.7d02532a-92d9-42d0-a015-8eced7f61b79.c949c6d9-f193-4ac1-bcd7-698497a6df50", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/onenote/9wzdncrfhvjl", Rating:{IsProvided:true, AverageRatingPercentage:76, AverageRating:3.8, TotalRatingsCount:6993}, Slotid:5, Title:"OneNote", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.8, RatingCount:6993, PlayCount:null, PurchaseCount:39280, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFHVN5", ImageSource:"//store-images.microsoft.com/image/apps.42516.9007199266248474.5f223500-87ac-457b-a080-b1c7e039c25c.fb3245d6-6527-49f0-9073-23359e9927ab", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/windows-calculator/9wzdncrfhvn5", Rating:{IsProvided:true, AverageRatingPercentage:68, AverageRating:3.4, TotalRatingsCount:624}, Slotid:6, Title:"Windows Calculator", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.4, RatingCount:624, PlayCount:null, PurchaseCount:8439, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDHNJ7", ImageSource:"//store-images.microsoft.com/image/apps.49543.9007199266473400.dbfea9be-252c-431f-ad86-683ca145ff30.3b488217-8f26-4313-85c8-96d2fe15fa56", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/comedy-central/9wzdncrdhnj7", Rating:{IsProvided:true, AverageRatingPercentage:62, AverageRating:3.1, TotalRatingsCount:196}, Slotid:7, Title:"Comedy Central", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.1, RatingCount:196, PlayCount:null, PurchaseCount:16874, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDL5N6", ImageSource:"//store-images.microsoft.com/image/apps.48709.9007199266409573.d9a413ea-dd20-4fe2-a27b-1d3ffe5f55f0.c044b57a-d581-4e53-a69f-601777beb5a3", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/nfl-preseason-live/9wzdncrdl5n6", Rating:{IsProvided:true, AverageRatingPercentage:54, AverageRating:2.7, TotalRatingsCount:56}, Slotid:8, Title:"NFL Preseason Live", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:2.7, RatingCount:56, PlayCount:null, PurchaseCount:124, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ223", ImageSource:"//store-images.microsoft.com/image/apps.6292.9007199266242576.9d6811a2-d8af-41a2-93a7-7c946c4feff8.44a50b0a-df1b-4511-a839-b4ec3edc8b1e", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/iheartradio/9wzdncrfj223", Rating:{IsProvided:true, AverageRatingPercentage:74, AverageRating:3.7, TotalRatingsCount:14111}, Slotid:9, Title:"iHeartRadio", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.7, RatingCount:14111, PlayCount:null, PurchaseCount:193958, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ364", ImageSource:"//store-images.microsoft.com/image/apps.4987.9007199266245651.7dc8ecac-3cb6-4a54-9948-459aaebd2617.cb9e2c4c-212f-4fc7-bd4f-680eda67ead9", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/skype/9wzdncrfj364", Rating:{IsProvided:true, AverageRatingPercentage:72, AverageRating:3.6, TotalRatingsCount:399711}, Slotid:10, Title:"Skype", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.6, RatingCount:399711, PlayCount:null, PurchaseCount:383244, RentalCount:null, TrialCount:null}}, {DisplayPrice:"$7.99", id:"9WZDNCRFJ3K1", ImageSource:"//store-images.microsoft.com/image/apps.38845.9007199266246620.16f8766c-9b71-40e8-b5a3-48d6ba20ca78.5e44efe9-a709-4261-84a5-a2451aa738b2", InlineStyle:{}, Price:{Amount:7.99, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/game-dev-tycoon/9wzdncrfj3k1", Rating:{IsProvided:true, AverageRatingPercentage:93.99999, AverageRating:4.7, TotalRatingsCount:2452}, Slotid:11, Title:"Game Dev Tycoon", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:4.7, RatingCount:2452, PlayCount:null, PurchaseCount:4065, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ3L1", ImageSource:"//store-images.microsoft.com/image/apps.33624.9007199266246590.b662b42e-2208-4f79-a7dd-e1780cf96924.d3538fbb-2a79-47b4-86c2-f41529d82665", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/hulu-plus/9wzdncrfj3l1", Rating:{IsProvided:true, AverageRatingPercentage:66, AverageRating:3.3, TotalRatingsCount:11029}, Slotid:12, Title:"Hulu Plus", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.3, RatingCount:11029, PlayCount:null, PurchaseCount:254626, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ4S4", ImageSource:"//store-images.microsoft.com/image/apps.39231.9007199266245235.43248b88-c2cf-49a5-a9e6-46422def216f.cbbc0b7e-fbda-41ff-94e0-13dd14940269", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/metroradio/9wzdncrfj4s4", Rating:{IsProvided:true, AverageRatingPercentage:66, AverageRating:3.3, TotalRatingsCount:878}, Slotid:13, Title:"MetroRadio", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.3, RatingCount:878, PlayCount:null, PurchaseCount:13129, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ51V", ImageSource:"//store-images.microsoft.com/image/apps.12006.9007199266245275.bde8b5f1-5d8a-4895-a46a-5dc7898c8782.bcc5d84d-93b9-4423-8357-1f63003da7ca", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/rhapsody/9wzdncrfj51v", Rating:{IsProvided:true, AverageRatingPercentage:64, AverageRating:3.2, TotalRatingsCount:1116}, Slotid:14, Title:"Rhapsody", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.2, RatingCount:1116, PlayCount:null, PurchaseCount:25511, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJCFX", ImageSource:"//store-images.microsoft.com/image/apps.7484.9007199266251545.a8af6583-85df-4fe2-bf39-7ac4b298278a.fa168735-9fec-43b8-b4db-56d325c03b6a", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/watch-nfl-network/9wzdncrfjcfx", Rating:{IsProvided:true, AverageRatingPercentage:54, AverageRating:2.7, TotalRatingsCount:151}, Slotid:15, Title:"Watch NFL Network", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:2.7, RatingCount:151, PlayCount:null, PurchaseCount:2318, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJV7W", ImageSource:"//store-images.microsoft.com/image/apps.50971.9007199266275298.a929a537-0d41-4d4b-b0a4-9af2ce30fb9e.396c57d5-a12e-47d1-a0b5-8e5d1e40de58", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/fox-now/9wzdncrfjv7w", Rating:{IsProvided:true, AverageRatingPercentage:50, AverageRating:2.5, TotalRatingsCount:356}, Slotid:16, Title:"FOX NOW", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:2.5, RatingCount:356, PlayCount:null, PurchaseCount:49401, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ0V3", ImageSource:"//store-images.microsoft.com/image/apps.8848.9007199266243672.3daf19d4-14c7-430f-819a-a477017307e5.be31e0fc-6876-4ab3-9e39-d9af1e50d899", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/amc-story-sync/9wzdncrfj0v3", Rating:{IsProvided:true, AverageRatingPercentage:78, AverageRating:3.9, TotalRatingsCount:642}, Slotid:17, Title:"AMC Story Sync", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.9, RatingCount:642, PlayCount:null, PurchaseCount:18626, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ124", ImageSource:"//store-images.microsoft.com/image/apps.39676.9007199266243731.c30c7595-8b2c-46b7-9f82-16f35dc19bc4.f2536634-495a-46c9-a9a2-a8fda124fd42", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/songza/9wzdncrfj124", Rating:{IsProvided:true, AverageRatingPercentage:83.99999, AverageRating:4.2, TotalRatingsCount:1821}, Slotid:18, Title:"Songza", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:4.2, RatingCount:1821, PlayCount:null, PurchaseCount:24114, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ218", ImageSource:"//store-images.microsoft.com/image/apps.54688.9007199266242617.30aeb394-3151-4576-8a39-aca0d7924c28.032153a3-7add-4f73-84bf-0d946fd6b19d", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/slacker-radio/9wzdncrfj218", Rating:{IsProvided:true, AverageRatingPercentage:76, AverageRating:3.8, TotalRatingsCount:1858}, Slotid:19, Title:"Slacker Radio", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.8, RatingCount:1858, PlayCount:null, PurchaseCount:39627, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFHW28", ImageSource:"//store-images.microsoft.com/image/apps.48217.9007199266248335.bd670dd3-9285-4bfd-8bc5-d04d3967dc2e.d3180e99-46da-449c-8539-467501ca63e6", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/mintcom-personal-finance/9wzdncrfhw28", Rating:{IsProvided:true, AverageRatingPercentage:86.00001, AverageRating:4.3, TotalRatingsCount:4722}, Slotid:20, Title:"Mint.com Personal Finance", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:4.3, RatingCount:4722, PlayCount:null, PurchaseCount:50074, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDKVWX", ImageSource:"//store-images.microsoft.com/image/apps.65101.9007199266533153.cfc63276-8e54-48da-80c3-605c819a0b1b.872b56af-a61b-4f46-80c0-20279640543b", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/mine-for-facebook/9wzdncrdkvwx", Rating:{IsProvided:true, AverageRatingPercentage:72, AverageRating:3.6, TotalRatingsCount:314}, Slotid:21, Title:"MINE for Facebook", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.6, RatingCount:314, PlayCount:null, PurchaseCount:729, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ2MV", ImageSource:"//store-images.microsoft.com/image/apps.54181.9007199266243307.5df149c3-2579-4b49-acc3-3541d73360bb.128a6d20-22b2-4e05-9917-80f66e935786", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/vimeo/9wzdncrfj2mv", Rating:{IsProvided:true, AverageRatingPercentage:52, AverageRating:2.6, TotalRatingsCount:386}, Slotid:22, Title:"Vimeo", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:2.6, RatingCount:386, PlayCount:null, PurchaseCount:5845, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDBVML", ImageSource:"//store-images.microsoft.com/image/apps.63080.9007199266341475.6066e20e-0a59-46f1-b451-72f1dcb8a1c2.44df1f43-d4e8-4ed3-8d79-1c505c9cef49", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/fox-sports-go/9wzdncrdbvml", Rating:{IsProvided:true, AverageRatingPercentage:36, AverageRating:1.8, TotalRatingsCount:657}, Slotid:23, Title:"FOX Sports GO", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:1.8, RatingCount:657, PlayCount:null, PurchaseCount:73832, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDCTZN", ImageSource:"//store-images.microsoft.com/image/apps.39563.9007199266368321.c0c7aec1-7b28-41b4-a6f3-22dcf5cff37d.0532549b-2f34-4fc9-ae16-e84571cd6c77", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/watch-disney-xd/9wzdncrdctzn", Rating:{IsProvided:true, AverageRatingPercentage:68, AverageRating:3.4, TotalRatingsCount:198}, Slotid:24, Title:"WATCH Disney XD", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.4, RatingCount:198, PlayCount:null, PurchaseCount:60752, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDCV3H", ImageSource:"//store-images.microsoft.com/image/apps.6223.9007199266368510.bac15d7a-f828-407d-8a75-b0dd049aa15b.f68a2d71-3b39-4f9e-8a44-04525a1d68a4", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/watch-disney-channel/9wzdncrdcv3h", Rating:{IsProvided:true, AverageRatingPercentage:72, AverageRating:3.6, TotalRatingsCount:395}, Slotid:25, Title:"WATCH Disney Channel", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.6, RatingCount:395, PlayCount:null, PurchaseCount:129282, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDDSJF", ImageSource:"//store-images.microsoft.com/image/apps.12047.9007199266404330.fe49020f-1b1e-4e4f-9b08-fa05c55f8c7c.e6fbd882-53a3-4711-8834-8dd688423aaa", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/lifetime/9wzdncrddsjf", Rating:{IsProvided:true, AverageRatingPercentage:76, AverageRating:3.8, TotalRatingsCount:248}, Slotid:26, Title:"Lifetime", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.8, RatingCount:248, PlayCount:null, PurchaseCount:27554, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDDSJQ", ImageSource:"//store-images.microsoft.com/image/apps.34324.9007199266404337.aacebe02-6792-41c5-8aa1-5b0cd54e287a.6a4d63fc-8596-4baf-ad2b-30f3d8331885", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/a-e/9wzdncrddsjq", Rating:{IsProvided:true, AverageRatingPercentage:72, AverageRating:3.6, TotalRatingsCount:349}, Slotid:27, Title:"A&E", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.6, RatingCount:349, PlayCount:null, PurchaseCount:29864, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDFG8F", ImageSource:"//store-images.microsoft.com/image/apps.17228.9007199266288266.47744a18-01ad-41ad-972a-22b45e04a326.4e8b5849-4f7d-46ef-b979-f660e54bdfa8", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/vh1/9wzdncrdfg8f", Rating:{IsProvided:true, AverageRatingPercentage:70, AverageRating:3.5, TotalRatingsCount:112}, Slotid:28, Title:"VH1", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.5, RatingCount:112, PlayCount:null, PurchaseCount:9913, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDFMS1", ImageSource:"//store-images.microsoft.com/image/apps.10408.9007199266287154.912efc33-b97b-4059-9be5-d484bf553ad8.3b29268b-69ea-4b85-96f4-ea5c5a1b03df", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/nfl-sunday-ticket/9wzdncrdfms1", Rating:{IsProvided:true, AverageRatingPercentage:70, AverageRating:3.5, TotalRatingsCount:186}, Slotid:29, Title:"NFL Sunday Ticket", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.5, RatingCount:186, PlayCount:null, PurchaseCount:1766, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDJP60", ImageSource:"//store-images.microsoft.com/image/apps.17416.9007199266499023.3b325ca2-82de-4899-9e64-bf4679d493e5.f9e0545c-79e2-4609-93a9-53518cdffc8e", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/cbs-local/9wzdncrdjp60", Rating:{IsProvided:true, AverageRatingPercentage:64, AverageRating:3.2, TotalRatingsCount:140}, Slotid:30, Title:"CBS Local", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.2, RatingCount:140, PlayCount:null, PurchaseCount:10710, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDJPF5", ImageSource:"//store-images.microsoft.com/image/apps.37110.9007199266498584.6f4c4eee-80b7-4f90-b39d-a4f661d541dc.437cdf6f-771d-40e7-94a3-70b8842fdf1e", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/pbs-kids-video/9wzdncrdjpf5", Rating:{IsProvided:true, AverageRatingPercentage:62, AverageRating:3.1, TotalRatingsCount:274}, Slotid:31, Title:"PBS KidS Video", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.1, RatingCount:274, PlayCount:null, PurchaseCount:25652, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDK6JR", ImageSource:"//store-images.microsoft.com/image/apps.22841.9007199266514880.d3337011-79b5-4eda-a862-4c5f86a1896f.5e3b8108-e220-4bd5-ba2b-f2a2357de1dd", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/credit-karma/9wzdncrdk6jr", Rating:{IsProvided:true, AverageRatingPercentage:80, AverageRating:4, TotalRatingsCount:470}, Slotid:32, Title:"Credit Karma", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:4, RatingCount:470, PlayCount:null, PurchaseCount:15881, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDMWM3", ImageSource:"//store-images.microsoft.com/image/apps.955.9007199266462422.01f5d8ad-175d-4e06-b885-b5597fb640c6.c0afbb60-8977-4915-ac5d-b8478ad07fb0", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/cnbc/9wzdncrdmwm3", Rating:{IsProvided:true, AverageRatingPercentage:60, AverageRating:3, TotalRatingsCount:65}, Slotid:33, Title:"CNBC", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3, RatingCount:65, PlayCount:null, PurchaseCount:4285, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDMWMK", ImageSource:"//store-images.microsoft.com/image/apps.53404.9007199266462424.c3005b8d-84af-428d-8e9d-9964c57cc4a7.15a7f417-73ba-4da2-afa9-65436a4b9d4e", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/bravo-now/9wzdncrdmwmk", Rating:{IsProvided:true, AverageRatingPercentage:74, AverageRating:3.7, TotalRatingsCount:87}, Slotid:34, Title:"Bravo Now", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.7, RatingCount:87, PlayCount:null, PurchaseCount:8582, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRDSSX7", ImageSource:"//store-images.microsoft.com/image/apps.17874.9007199266586856.10e74df7-7332-4fed-83aa-75868d23cd14.01227ef1-b3a8-4531-9355-ffb0995e4220", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/viggle/9wzdncrdssx7", Rating:{IsProvided:true, AverageRatingPercentage:90, AverageRating:4.5, TotalRatingsCount:2429}, Slotid:35, Title:"Viggle", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:4.5, RatingCount:2429, PlayCount:null, PurchaseCount:7962, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ0VR", ImageSource:"//store-images.microsoft.com/image/apps.36834.9007199266243636.6b0027ca-29ec-49a5-9ffa-d6bf5e3fd40d.76a8dbd7-81cf-419d-8bda-124b176ca778", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/expedia/9wzdncrfj0vr", Rating:{IsProvided:true, AverageRatingPercentage:52, AverageRating:2.6, TotalRatingsCount:518}, Slotid:36, Title:"Expedia", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:2.6, RatingCount:518, PlayCount:null, PurchaseCount:8086, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ0WG", ImageSource:"//store-images.microsoft.com/image/apps.32480.9007199266243599.31f9679b-0fbd-456f-a946-8fc2e1dbc613.fe636dea-613b-43c6-89b3-c8faa175fe26", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/watch-abc/9wzdncrfj0wg", Rating:{IsProvided:true, AverageRatingPercentage:60, AverageRating:3, TotalRatingsCount:3447}, Slotid:37, Title:"WATCH ABC", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3, RatingCount:3447, PlayCount:null, PurchaseCount:49816, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ519", ImageSource:"//store-images.microsoft.com/image/apps.46823.9007199266245260.e1a2e645-9727-449a-9201-393e112ffd5b.898c85be-c24a-4571-b709-e39525c1f992", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/watchespn/9wzdncrfj519", Rating:{IsProvided:true, AverageRatingPercentage:80, AverageRating:4, TotalRatingsCount:2780}, Slotid:38, Title:"WatchESPN", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:4, RatingCount:2780, PlayCount:null, PurchaseCount:87053, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJBHQ", ImageSource:"//store-images.microsoft.com/image/apps.26929.9007199266252375.566fc8e0-9274-4137-bfc4-4ed1413da9ec.0b7e924c-d05d-418a-9931-50624eecfbbe", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/music-deals/9wzdncrfjbhq", Rating:{IsProvided:true, AverageRatingPercentage:66, AverageRating:3.3, TotalRatingsCount:557}, Slotid:39, Title:"Music Deals", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.3, RatingCount:557, PlayCount:null, PurchaseCount:6337, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJCF6", ImageSource:"//store-images.microsoft.com/image/apps.64600.9007199266251535.45616669-0002-456a-9c6b-014d66764dc3.426c8993-f11c-4dc7-a359-ecf0a857144c", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/history/9wzdncrfjcf6", Rating:{IsProvided:true, AverageRatingPercentage:68, AverageRating:3.4, TotalRatingsCount:394}, Slotid:40, Title:"HISTORY", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.4, RatingCount:394, PlayCount:null, PurchaseCount:36799, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJ13N", ImageSource:"//store-images.microsoft.com/image/apps.52150.9007199266244421.a0058176-a6ba-4585-bfe2-a9aa23445198.59a9390c-12fa-47aa-ab7d-5be33f32353c", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/crackle/9wzdncrfj13n", Rating:{IsProvided:true, AverageRatingPercentage:68, AverageRating:3.4, TotalRatingsCount:2643}, Slotid:41, Title:"Crackle", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.4, RatingCount:2643, PlayCount:null, PurchaseCount:66083, RentalCount:null, TrialCount:null}}, {DisplayPrice:"Free", id:"9WZDNCRFJBJ2", ImageSource:"//store-images.microsoft.com/image/apps.22195.9007199266252381.7e55a2cf-3a1a-4f55-ad0b-7001bb46233f.673c1602-1442-4fa3-858a-2fbd4a57bf8d", InlineStyle:{}, Price:{Amount:0, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/nfl-on-windows-8/9wzdncrfjbj2", Rating:{IsProvided:true, AverageRatingPercentage:66, AverageRating:3.3, TotalRatingsCount:435}, Slotid:42, Title:"NFL on Windows 8", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.3, RatingCount:435, PlayCount:null, PurchaseCount:34307, RentalCount:null, TrialCount:null}}, {DisplayPrice:"$4.99", id:"9WZDNCRDCTFD", ImageSource:"//store-images.microsoft.com/image/apps.24947.9007199266367833.6c933ae5-55a4-42ba-afc1-7e2376273141.10148e43-aa40-458e-a100-5d06e54be3eb", InlineStyle:{}, Price:{Amount:4.99, CurrencyCode:"USD"}, ProductPageUrl:"/en-us/store/apps/disney-checkout-challenge/9wzdncrdctfd", Rating:{IsProvided:true, AverageRatingPercentage:78, AverageRating:3.9, TotalRatingsCount:43}, Slotid:43, Title:"Disney Checkout Challenge", Type:"App", Usage:{AggregateTimeSpan:"AllTime", AverageRating:3.9, RatingCount:43, PlayCount:null, PurchaseCount:89, RentalCount:null, TrialCount:null}}];

});
define('liquid-windows-store/helpers/lf-yield-inverse', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = {
    isHTMLBars: true,
    helperFunction: ember_internals.inverseYieldHelper
  };

});
define('liquid-windows-store/helpers/liquid-bind', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

	'use strict';

	exports['default'] = ember_internals.makeHelperShim("liquid-bind");

});
define('liquid-windows-store/helpers/liquid-if', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = ember_internals.makeHelperShim('liquid-if', function (params, hash, options) {
    hash.helperName = 'liquid-if';
    hash.inverseTemplate = options.inverse;
  });

});
define('liquid-windows-store/helpers/liquid-outlet', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = ember_internals.makeHelperShim("liquid-outlet", function (params, hash) {
    hash._outletName = params[0] || "main";
  });

});
define('liquid-windows-store/helpers/liquid-unless', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = ember_internals.makeHelperShim('liquid-if', function (params, hash, options) {
    hash.helperName = 'liquid-unless';
    hash.inverseTemplate = options.template;
    options.template = options.inverse;
  });

});
define('liquid-windows-store/helpers/liquid-with', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

	'use strict';

	exports['default'] = ember_internals.makeHelperShim("liquid-with");

});
define('liquid-windows-store/helpers/lorem-ipsum', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports.loremIpsum = loremIpsum;

  var originalText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ' + 'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' + 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut ' + 'aliquip ex ea commodo consequat. ' + 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore ' + 'eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, ' + 'sunt in culpa qui officia deserunt mollit anim id est laborum';
  function loremIpsum(params, hash) {
    var text = originalText;

    if (!hash || !hash.length || hash.length < 0) {} else {
      if (hash.length < text.length) {
        text = text.substring(0, hash.length);
      } else {
        var result = '',
            repeatN = hash.length / text.length;

        for (var i = 0; i < repeatN; i++) {
          result += text;
          result += i === repeatN - 1 ? '' : '. ';
        }
        var remainder = hash.length % text.length;
        result += text.substring(0, remainder);
        text = result;
      }
    }

    text += '.';

    return new Ember['default'].Handlebars.SafeString('<p class="lorem_ipsum">' + text + '</p>');
  }

  exports['default'] = Ember['default'].HTMLBars.makeBoundHelper(loremIpsum);

  // return the whole paragraph

});
define('liquid-windows-store/initializers/app-version', ['exports', 'liquid-windows-store/config/environment', 'ember'], function (exports, config, Ember) {

  'use strict';

  var classify = Ember['default'].String.classify;
  var registered = false;

  exports['default'] = {
    name: 'App Version',
    initialize: function initialize(container, application) {
      if (!registered) {
        var appName = classify(application.toString());
        Ember['default'].libraries.register(appName, config['default'].APP.version);
        registered = true;
      }
    }
  };

});
define('liquid-windows-store/initializers/export-application-global', ['exports', 'ember', 'liquid-windows-store/config/environment'], function (exports, Ember, config) {

  'use strict';

  exports.initialize = initialize;

  function initialize(container, application) {
    var classifiedName = Ember['default'].String.classify(config['default'].modulePrefix);

    if (config['default'].exportApplicationGlobal && !window[classifiedName]) {
      window[classifiedName] = application;
    }
  }

  ;

  exports['default'] = {
    name: 'export-application-global',

    initialize: initialize
  };

});
define('liquid-windows-store/initializers/liquid-fire', ['exports', 'liquid-fire/router-dsl-ext'], function (exports) {

  'use strict';

  // This initializer exists only to make sure that the following import
  // happens before the app boots.
  exports['default'] = {
    name: "liquid-fire",
    initialize: function initialize() {}
  };

});
define('liquid-windows-store/initializers/load-fixtures', ['exports', 'liquid-windows-store/config/environment'], function (exports, config) {

  'use strict';

  exports['default'] = {
    name: 'load-fixtures',

    initialize: function initialize(container, app) {
      if (!config['default'].FIXTURES) {
        config['default'].FIXTURES = {};
      }

      if (!config['default'].FIXTURES.enabled) {
        return;
      }

      Object.keys(require._eak_seen).forEach(function (service) {
        var podFixtureRegexp, modelPath, modelInstance, fixturePath, fixtures, isPodFixture;

        podFixtureRegexp = new RegExp(app.podModulePrefix + '/(.*?)/fixture');

        isPodFixture = podFixtureRegexp.test(service);

        if (! ~service.indexOf(app.modulePrefix + '/models/') && !isPodFixture) {
          return;
        }

        modelPath = isPodFixture ? service.replace('/fixture', '/model') : service;
        fixturePath = isPodFixture ? service : service.replace('/models/', '/fixtures/');

        modelInstance = require(modelPath)['default'];

        try {
          fixtures = require(fixturePath)['default'];
        } catch (error) {
          fixtures = [];
        }

        if (fixtures.length) {
          fixtures = Ember.copy(fixtures, true);

          modelInstance.reopenClass({
            FIXTURES: fixtures
          });
        }
      });
    }
  };

});
define('liquid-windows-store/mixins/reset-scroll', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    exports['default'] = Ember['default'].Mixin.create({
        activate: function activate() {
            this._super();
            window.scrollTo(0, 0);
        }
    });

});
define('liquid-windows-store/models/app', ['exports', 'ember-data'], function (exports, DS) {

    'use strict';

    exports['default'] = DS['default'].Model.extend({
        DisplayPrice: DS['default'].attr('string'),
        ImageSource: DS['default'].attr('string'),
        InlineStyle: DS['default'].attr(),
        Price: DS['default'].attr(),
        Rating: DS['default'].attr(),
        Title: DS['default'].attr('string'),
        Type: DS['default'].attr(),
        SlotId: DS['default'].attr('string'),
        Usage: DS['default'].attr(),

        ScreenShot: (function () {
            return 'https://placehold.it/320x240';
        }).property()
    });

});
define('liquid-windows-store/router', ['exports', 'ember', 'liquid-windows-store/config/environment'], function (exports, Ember, config) {

    'use strict';

    var Router = Ember['default'].Router.extend({
        location: config['default'].locationType
    });

    exports['default'] = Router.map(function () {
        this.route('store');
        this.route('pdp', {
            path: '/pdp/:app_id'
        });
    });

});
define('liquid-windows-store/routes/application', ['exports', 'ember'], function (exports, Ember) {

    'use strict';

    exports['default'] = Ember['default'].Route.extend({
        beforeModel: function beforeModel() {
            this.transitionTo('store');
        }
    });

});
define('liquid-windows-store/routes/pdp', ['exports', 'ember', 'liquid-windows-store/mixins/reset-scroll'], function (exports, Ember, ResetScroll) {

    'use strict';

    exports['default'] = Ember['default'].Route.extend(ResetScroll['default'], {
        model: function model(params) {
            console.log('params', params);
            return this.store.find('app', params.app_id);
        }
    });

});
define('liquid-windows-store/routes/store', ['exports', 'ember', 'liquid-windows-store/mixins/reset-scroll'], function (exports, Ember, ResetScroll) {

    'use strict';

    exports['default'] = Ember['default'].Route.extend(ResetScroll['default'], {
        model: function model() {
            return this.store.find('app').then(function (result) {
                if (result) {
                    return result.slice(10, 50);
                } else {
                    return result;
                }
            });
        }
    });

});
define('liquid-windows-store/services/liquid-fire-modals', ['exports', 'liquid-fire/modals'], function (exports, Modals) {

	'use strict';

	exports['default'] = Modals['default'];

});
define('liquid-windows-store/services/liquid-fire-transitions', ['exports', 'liquid-fire/transition-map'], function (exports, TransitionMap) {

	'use strict';

	exports['default'] = TransitionMap['default'];

});
define('liquid-windows-store/templates/application', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, inline = hooks.inline, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        var morph1 = dom.createMorphAt(fragment,2,2,contextualElement);
        var morph2 = dom.createMorphAt(fragment,4,4,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        inline(env, morph0, context, "partial", ["partials/header"], {});
        content(env, morph1, context, "liquid-outlet");
        inline(env, morph2, context, "partial", ["partials/footer"], {});
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-bind', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "version", blockArguments[0]);
            content(env, morph0, context, "version");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "use": get(env, context, "use"), "name": "liquid-bind", "renderWhenFalse": true, "innerClass": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.1",
            blockParams: 1,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement, blockArguments) {
              var dom = env.dom;
              var hooks = env.hooks, set = hooks.set, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              set(env, context, "version", blockArguments[0]);
              content(env, morph0, context, "version");
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "container", blockArguments[0]);
            block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "notify": get(env, context, "container"), "use": get(env, context, "use"), "name": "liquid-bind", "renderWhenFalse": true}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-container", [], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "containerless")], {}, child0, child1);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-container', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        inline(env, morph0, context, "yield", [get(env, context, "this")], {});
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-if', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.1",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("      ");
              dom.appendChild(el0, el1);
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
              content(env, morph0, context, "yield");
              return fragment;
            }
          };
        }());
        var child1 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.1",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("      ");
              dom.appendChild(el0, el1);
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
              content(env, morph0, context, "lf-yield-inverse");
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "valueVersion", blockArguments[0]);
            block(env, morph0, context, "if", [get(env, context, "valueVersion")], {}, child0, child1);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "name": get(env, context, "helperName"), "use": get(env, context, "use"), "renderWhenFalse": get(env, context, "hasInverse"), "innerClass": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          var child0 = (function() {
            return {
              isHTMLBars: true,
              revision: "Ember@1.11.1",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createTextNode("        ");
                dom.appendChild(el0, el1);
                var el1 = dom.createComment("");
                dom.appendChild(el0, el1);
                var el1 = dom.createTextNode("\n");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                var hooks = env.hooks, content = hooks.content;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
                content(env, morph0, context, "yield");
                return fragment;
              }
            };
          }());
          var child1 = (function() {
            return {
              isHTMLBars: true,
              revision: "Ember@1.11.1",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createTextNode("        ");
                dom.appendChild(el0, el1);
                var el1 = dom.createComment("");
                dom.appendChild(el0, el1);
                var el1 = dom.createTextNode("\n");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                var hooks = env.hooks, content = hooks.content;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
                content(env, morph0, context, "lf-yield-inverse");
                return fragment;
              }
            };
          }());
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.1",
            blockParams: 1,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement, blockArguments) {
              var dom = env.dom;
              var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              set(env, context, "valueVersion", blockArguments[0]);
              block(env, morph0, context, "if", [get(env, context, "valueVersion")], {}, child0, child1);
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "container", blockArguments[0]);
            block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "notify": get(env, context, "container"), "name": get(env, context, "helperName"), "use": get(env, context, "use"), "renderWhenFalse": get(env, context, "hasInverse")}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-container", [], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "containerless")], {}, child0, child1);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-measured', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        content(env, morph0, context, "yield");
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-modal', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("div");
            dom.setAttribute(el1,"role","dialog");
            var el2 = dom.createTextNode("\n      ");
            dom.appendChild(el1, el2);
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n    ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element0 = dom.childAt(fragment, [1]);
            var morph0 = dom.createMorphAt(element0,1,1);
            element(env, element0, context, "bind-attr", [], {"class": ":lf-dialog cc.options.dialogClass"});
            element(env, element0, context, "bind-attr", [], {"aria-labelledby": "cc.options.ariaLabelledBy", "aria-label": "cc.options.ariaLabel"});
            inline(env, morph0, context, "view", [get(env, context, "innerView")], {"dismiss": "dismiss"});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 1,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement, blockArguments) {
          var dom = env.dom;
          var hooks = env.hooks, set = hooks.set, block = hooks.block, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          var morph1 = dom.createMorphAt(fragment,2,2,contextualElement);
          dom.insertBoundary(fragment, 0);
          set(env, context, "cc", blockArguments[0]);
          block(env, morph0, context, "lm-container", [], {"action": "escape", "clickAway": "outsideClick"}, child0, null);
          content(env, morph1, context, "lf-overlay");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "liquid-versions", [], {"name": "liquid-modal", "value": get(env, context, "currentContext")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-outlet', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 1,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement, blockArguments) {
          var dom = env.dom;
          var hooks = env.hooks, set = hooks.set, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          set(env, context, "outletStateVersion", blockArguments[0]);
          inline(env, morph0, context, "lf-outlet", [], {"staticState": get(env, context, "outletStateVersion")});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "liquid-with", [get(env, context, "outletState")], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass"), "use": get(env, context, "use"), "name": "liquid-outlet", "containerless": get(env, context, "containerless")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-spacer', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          content(env, morph0, context, "yield");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "liquid-measured", [], {"measurements": get(env, context, "measurements")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-versions', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.1",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              inline(env, morph0, context, "yield", [get(env, context, "version.value")], {});
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            block(env, morph0, context, "liquid-child", [], {"version": get(env, context, "version"), "visible": false, "didRender": "childDidRender", "class": get(env, context, "innerClass")}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 1,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement, blockArguments) {
          var dom = env.dom;
          var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          set(env, context, "version", blockArguments[0]);
          block(env, morph0, context, "if", [get(env, context, "version.shouldRender")], {}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "each", [get(env, context, "versions")], {}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/liquid-with', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "version", blockArguments[0]);
            inline(env, morph0, context, "yield", [get(env, context, "version")], {});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "use": get(env, context, "use"), "name": get(env, context, "name"), "innerClass": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.11.1",
            blockParams: 1,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement, blockArguments) {
              var dom = env.dom;
              var hooks = env.hooks, set = hooks.set, get = hooks.get, inline = hooks.inline;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              set(env, context, "version", blockArguments[0]);
              inline(env, morph0, context, "yield", [get(env, context, "version")], {});
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "container", blockArguments[0]);
            block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "notify": get(env, context, "container"), "use": get(env, context, "use"), "name": get(env, context, "name")}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-container", [], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "containerless")], {}, child0, child1);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/components/ws-rating', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","rating");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","rating-stars");
        var el3 = dom.createTextNode("\n        \n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("ul");
        dom.setAttribute(el3,"class","rating-stars-background");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        \n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("ul");
        dom.setAttribute(el3,"class","rating-stars-value");
        dom.setAttribute(el3,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el3,"style","width: 60%");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        var el5 = dom.createElement("i");
        dom.setAttribute(el5,"class","icon-star");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("span");
        dom.setAttribute(el2,"class","rating-numbers");
        var el3 = dom.createTextNode("(65)");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/partials/-app', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("img");
          dom.setAttribute(el1,"class","cli_image");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, attribute = hooks.attribute;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var attrMorph0 = dom.createAttrMorph(element0, 'src');
          var attrMorph1 = dom.createAttrMorph(element0, 'data-app-id');
          attribute(env, attrMorph0, element0, "src", get(env, context, "app.ImageSource"));
          attribute(env, attrMorph1, element0, "data-app-id", get(env, context, "app.id"));
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","col-1-6");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","slide");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("figure");
        dom.setAttribute(el3,"class","media");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","media-img ratio-1-1 cli_image_container");
        var el5 = dom.createTextNode("\n");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("figcaption");
        dom.setAttribute(el4,"class","media-caption");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h4");
        dom.setAttribute(el5,"class","media-header media-header-clamp-2");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"class","item-block");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","media-subheader");
        var el6 = dom.createTextNode("\n                    \n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","media-price");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element1 = dom.childAt(fragment, [0, 1, 1]);
        var element2 = dom.childAt(element1, [3]);
        var morph0 = dom.createMorphAt(dom.childAt(element1, [1]),1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element2, [1, 1]),0,0);
        var morph2 = dom.createMorphAt(dom.childAt(element2, [5]),1,1);
        var morph3 = dom.createMorphAt(element2,7,7);
        block(env, morph0, context, "link-to", ["pdp", get(env, context, "app")], {}, child0, null);
        content(env, morph1, context, "app.Title");
        content(env, morph2, context, "app.DisplayPrice");
        content(env, morph3, context, "ws-rating");
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/partials/-footer', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","shell-rwd shell-footer");
        dom.setAttribute(el1,"data-bi-area","Footer");
        dom.setAttribute(el1,"data-bi-view","4xLinks");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","shell-footer-wrapper");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","shell-footer-lang");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("h4");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("a");
        dom.setAttribute(el5,"id","locale-picker-link");
        dom.setAttribute(el5,"href","https://unistorefd-int.www.microsoft.com/en-us/store/localepicker");
        dom.setAttribute(el5,"data-bi-name","LocalePicker");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("i");
        dom.setAttribute(el6,"class","shell-icon-globe");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("English (United States)‎\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","shell-footer-copyright");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("ul");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"id","shellmenu_6c3a452e-f353-4d0e-9cd7-927d9a8f8f09");
        dom.setAttribute(el6,"href","http://support.microsoft.com/contactus");
        dom.setAttribute(el6,"class","ctl_footerNavLink");
        dom.setAttribute(el6,"data-bi-name","ContactUs");
        dom.setAttribute(el6,"data-bi-slot","1");
        var el7 = dom.createTextNode("\n                        Contact Us\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"id","shellmenu_c83c192e-e62d-4761-ab0a-2b0c0324a530");
        dom.setAttribute(el6,"href","http://www.microsoft.com/privacystatement/en-us/core/default.aspx");
        dom.setAttribute(el6,"class","ctl_footerNavLink");
        dom.setAttribute(el6,"data-bi-name","Privacy");
        dom.setAttribute(el6,"data-bi-slot","2");
        var el7 = dom.createTextNode("\n                        Privacy & Cookies\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"id","shellmenu_6b5deefa-8f25-4ab3-8c9c-cd1431daedef");
        dom.setAttribute(el6,"href","http://www.microsoft.com/en-us/legal/intellectualproperty/copyright/default.aspx");
        dom.setAttribute(el6,"class","ctl_footerNavLink");
        dom.setAttribute(el6,"data-bi-name","TermsOfUse");
        dom.setAttribute(el6,"data-bi-slot","3");
        var el7 = dom.createTextNode("\n                        Terms of Use\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"id","shellmenu_c8182806-d3ac-416e-836a-4de57b1f4b7a");
        dom.setAttribute(el6,"href","http://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/en-us.aspx");
        dom.setAttribute(el6,"class","ctl_footerNavLink");
        dom.setAttribute(el6,"data-bi-name","Trademarks");
        dom.setAttribute(el6,"data-bi-slot","4");
        var el7 = dom.createTextNode("\n                        Trademarks\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5,"class","ctl_footerCopyright");
        var el6 = dom.createTextNode("\n                    © 2015 Microsoft\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/partials/-header', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"id","shell-header");
        dom.setAttribute(el1,"class","shell-rwd shell-bottomborder shell-header ");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","shell-header-wrapper");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","shell-header-top");
        dom.setAttribute(el3,"data-bi-area","HeaderL0");
        dom.setAttribute(el3,"data-bi-view","L0V1");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","shell-header-brand");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("a");
        dom.setAttribute(el5,"id","srv_shellHeaderMicrosoftLogo");
        dom.setAttribute(el5,"href","http://www.microsoft.com/");
        dom.setAttribute(el5,"title","Microsoft");
        dom.setAttribute(el5,"data-bi-name","BrandLogo");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("img");
        dom.setAttribute(el6,"src","./images/microsoft.png");
        dom.setAttribute(el6,"alt","Microsoft");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("ul");
        dom.setAttribute(el4,"class","shell-header-toggle");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6,"class","shell-header-toggle-search");
        dom.setAttribute(el6,"type","button");
        dom.setAttribute(el6,"data-bi-name","Toggle Search Icon");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-search");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","https://www.microsoftstore.com/store?Action=DisplayPage&Locale=en-us&SiteID=msusa&id=ThreePgCheckoutShoppingCartPage");
        dom.setAttribute(el6,"class","shell-header-toggle-cart");
        dom.setAttribute(el6,"data-bi-name","Toggle Cart");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"id","toggle-shell-icon-cart");
        dom.setAttribute(el7,"class","shell-icon-cart");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6,"class","shell-header-toggle-menu");
        dom.setAttribute(el6,"type","button");
        dom.setAttribute(el6,"data-bi-name","Toggle Menu");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-menu");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","shell-header-actions");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("form");
        dom.setAttribute(el5,"id","srv_shellHeaderSearchForm");
        dom.setAttribute(el5,"class","shell-header-search");
        dom.setAttribute(el5,"action","http://cmsmain.redmond.corp.microsoft.com/en-us/NewSearch/result.aspx");
        dom.setAttribute(el5,"method","GET");
        dom.setAttribute(el5,"autocomplete","off");
        dom.setAttribute(el5,"onsubmit","return window.msCommonShell.onSearch(this)");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("label");
        dom.setAttribute(el6,"for","cli_shellHeaderSearchInput");
        dom.setAttribute(el6,"class","sr-only");
        var el7 = dom.createTextNode("Search Microsoft");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("input");
        dom.setAttribute(el6,"id","cli_shellHeaderSearchInput");
        dom.setAttribute(el6,"type","search");
        dom.setAttribute(el6,"name","q");
        dom.setAttribute(el6,"data-bi-dnt","");
        dom.setAttribute(el6,"placeholder","Search Microsoft Store");
        dom.setAttribute(el6,"maxlength","200");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("input");
        dom.setAttribute(el6,"type","hidden");
        dom.setAttribute(el6,"name","form");
        dom.setAttribute(el6,"data-bi-dnt","");
        dom.setAttribute(el6,"value","apps");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6,"type","submit");
        dom.setAttribute(el6,"title","Search");
        dom.setAttribute(el6,"data-bi-dnt","");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-search");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7,"class","sr-only");
        var el8 = dom.createTextNode("Search");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"id","cli_searchSuggestionsContainer");
        dom.setAttribute(el6,"class","shell-header-search-dropdown-container");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","search-dropdown");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","dropdown-item");
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("ul");
        dom.setAttribute(el9,"id","cli_searchSuggestionsResults");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","shell-header-cart");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","https://www.microsoftstore.com/store?Action=DisplayPage&Locale=en-us&SiteID=msusa&id=ThreePgCheckoutShoppingCartPage");
        dom.setAttribute(el6,"data-bi-name","Shopping Cart");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-cart");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7,"class","sr-only");
        var el8 = dom.createTextNode("Cart");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7,"id","shopping-cart-amount");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("dl");
        dom.setAttribute(el5,"class","shell-header-user");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7,"id","meControl");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","msame_Header msame_unauth");
        dom.setAttribute(el8,"tabindex","0");
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","msame_Header_name msame_TxtTrunc");
        var el10 = dom.createTextNode("Sign in");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","msame_Header_chev");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("ul");
        dom.setAttribute(el3,"class","shell-header-nav");
        dom.setAttribute(el3,"id","srv_shellHeaderNav");
        dom.setAttribute(el3,"data-bi-area","L1");
        dom.setAttribute(el3,"data-bi-view","Hovermenus");
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4,"class","shell-header-dropdown   ");
        dom.setAttribute(el4,"data-navcontainer","shellmenu_6e671bcf-ff2c-4dea-b266-ca6dfbd8961b_NavContainer");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h2");
        dom.setAttribute(el5,"id","shellmenu_6e671bcf-ff2c-4dea-b266-ca6dfbd8961b");
        dom.setAttribute(el5,"class","shell-header-dropdown-label");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","javascript:void(0)");
        dom.setAttribute(el6,"role","menu");
        dom.setAttribute(el6,"data-bi-name","Store");
        dom.setAttribute(el6,"data-bi-slot","1");
        var el7 = dom.createTextNode("\n                Store\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-dropdown");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","shell-header-dropdown-content ");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-mscom-cyan  active ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_a65f20ec-0b2f-43b0-81a8-959e1c904d4d");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Surface\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_672a85f8-3033-4830-bb85-3a611c4584e8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Surface/categoryID.66734700");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Surface_AllSurface");
        var el12 = dom.createTextNode("\n                                All Surface\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_bb87969a-b07f-43de-8ac2-3d0d37e0d01f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/Surface-Pro-3/productID.300190600");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Surface_SurfacePro3");
        var el11 = dom.createTextNode("\n                                Surface Pro 3\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4824c3ae-9e23-4103-acd4-c6c6a3a59c8b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/Surface-2/productID.286867200");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Surface_Surface2");
        var el11 = dom.createTextNode("\n                                Surface 2\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e4b583db-8125-4e38-9589-247b601bc9ad");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Surface-accessories/categoryID.64061900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Surface_SurfaceAccessories");
        var el11 = dom.createTextNode("\n                                Surface accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_540642b6-4bca-4c5d-bdef-d4bf641e10b3");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/edu");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Surface_SurfaceForStudents");
        var el11 = dom.createTextNode("\n                                Surface for students\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Surface/categoryID.66734700");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Surface_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/8e/9f/8e9fb274-c72f-4106-b25f-aeb8596faa79.jpg?n=Store_Surface.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("The tablet that can replace your laptop");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop now");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-orange   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_ca0b2d75-b9e6-4db2-8424-775e9cadf1ce");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Office\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1c5b24aa-9491-447e-9cf6-607d1c26cdea");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Office/categoryID.62684700");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Office_AllOffice");
        var el12 = dom.createTextNode("\n                                All Office\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d8c19b4d-c892-442f-8c4b-99f17f6893b7");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/Office-365-Home/productID.286395000");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Office_Office365Home");
        var el11 = dom.createTextNode("\n                                Office 365 Home\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8eba9dec-fe30-44aa-9357-d106225ff226");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/Office-365-Personal/productID.297833200");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Office_Office365Personal");
        var el11 = dom.createTextNode("\n                                Office 365 Personal\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7cd416b9-7ea3-49a9-a17e-09121da1c73a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/Office-365-University/productID.275549300");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Office_Office365University");
        var el11 = dom.createTextNode("\n                                Office 365 University\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1a584ea2-530e-40e2-b3f1-aa40801be0f2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/business/office");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Office_OfficeForBusiness");
        var el11 = dom.createTextNode("\n                                Office for Business\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d06501e0-bd40-4518-8530-7546ff08f232");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Office-2013/categoryID.68069900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Office_OfficeHomeAndStudent");
        var el11 = dom.createTextNode("\n                                Office Home & Student\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_26d81a45-5e5d-4259-9340-c3780d8223bf");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Office-for-Mac/categoryID.62686000");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Office_OfficeForMac");
        var el11 = dom.createTextNode("\n                                Office for Mac\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_5debadd1-d3f7-429e-af42-9bf62eb4232a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/All-Office-apps/categoryID.62686200");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Office_OfficeApps");
        var el11 = dom.createTextNode("\n                                Office apps\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/Office-365-Home/productID.286395000");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Office_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/88/96/8896e6dc-d34c-4443-b5db-06b7785cfa08.jpg?n=Store_Office.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Find the right Office for you");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop now");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-cyan   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_de198485-f46c-40ad-a024-8a9e572d9a3d");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        PCs & tablets\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_23523c7b-571b-4aaa-8403-0e892ee32573");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Computers/categoryID.62684600");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_PCsAndTablets_AllPCsAndtablets");
        var el12 = dom.createTextNode("\n                                All PCs & tablets\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_02b8fc1a-356a-419e-a740-9585dd47ae8c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Surface/categoryID.66734700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_PCsAndTablets_Surface");
        var el11 = dom.createTextNode("\n                                Surface\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_cb460fe0-f5ca-46ee-a289-ee53faa9a3da");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Laptops/categoryID.62685400");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_PCsAndTablets_Laptops");
        var el11 = dom.createTextNode("\n                                Laptops\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a3207581-e842-4e01-8b0d-735d1ac03df3");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Tablets/categoryID.67092800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_PCsAndTablets_Tablets");
        var el11 = dom.createTextNode("\n                                Tablets\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_72d2aa4e-3d7a-4713-b9a7-985f2d4ca67a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/2-in-1-PCs/categoryID.62685500");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_PCsAndTablets_2in1PCs");
        var el11 = dom.createTextNode("\n                                2 in 1 PCs\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_b27a00cc-db75-4c3d-85ba-149b66bf6d42");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/All-in-ones-and-Desktops/categoryID.62685600");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_PCsAndTablets_AllInOnesAndDesktops");
        var el11 = dom.createTextNode("\n                                All in ones & desktops\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2c791f43-a437-4210-b512-fbfda3445308");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/PC-accessories/categoryID.62687100");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_PCsAndTablets_PCAccessories");
        var el11 = dom.createTextNode("\n                                PC accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Computers/categoryID.62684600");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_PCsAndTablets_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/20/02/200212dd-38c6-4e3d-bd4d-4b9192114f51.jpg?n=Store_PCandtablet.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("New PCs for all your needs");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop now");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-green   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_f948f7f8-813f-424a-aa50-8107f73f8665");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Xbox\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_ebb61768-51cb-41e5-8beb-444e93439ac0");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Xbox/categoryID.62684900");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Xbox_AllXbox");
        var el12 = dom.createTextNode("\n                                All Xbox\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3482e159-f83a-4e32-bde6-dd6f4af06276");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Xbox-One/categoryID.64484500");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox_XboxOne");
        var el11 = dom.createTextNode("\n                                Xbox One\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9ddf303e-8e9e-4fb5-a94e-a763dea4ed49");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Xbox-One-games/categoryID.64724100");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox_XboxOneGames");
        var el11 = dom.createTextNode("\n                                Xbox One games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8c557641-38c3-44b0-b726-b0cfc9cc3931");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Xbox-360/categoryID.64662300");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox_Xbox360");
        var el11 = dom.createTextNode("\n                                Xbox 360\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_30065cf3-e793-4952-95c9-88f98bc944dc");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Xbox-360-games/categoryID.64751500");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox_Xbox360Games");
        var el11 = dom.createTextNode("\n                                Xbox 360 games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9d34f5f6-b308-4884-b08d-88e51c5ac45c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Xbox-Live-and-apps/categoryID.62686700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox_XboxLiveAndApps");
        var el11 = dom.createTextNode("\n                                Xbox Live and apps\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f1673554-a622-442e-aed8-15ca11dfa16b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Pre-order-games/categoryID.67154000");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox_PreOrderGames");
        var el11 = dom.createTextNode("\n                                Pre-order games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_55acd705-7621-4a2e-a096-fd1175f51d4f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/12-Month-Xbox-Music-Pass/productID.258412400");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox_XboxMusicPass");
        var el11 = dom.createTextNode("\n                                Xbox Music Pass\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Pre-order-games/categoryID.67154000");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Xbox_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/be/46/be469fb5-80fd-4214-959a-266bfba80f13.jpg?n=Store_Xbox.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("It's more fun on Xbox One");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop now");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_917ef662-7c35-4e7d-8d80-0b347c151c12");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Windows\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2ae9dd22-16cd-46ca-9404-4bb54d2190eb");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Windows-8/categoryID.62684800");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Windows_AllWindows");
        var el12 = dom.createTextNode("\n                                All Windows\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_dfad5437-160d-4f5a-b3e5-c8d171967837");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Windows-8.1/categoryID.67760800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Windows_Windows81");
        var el11 = dom.createTextNode("\n                                Windows 8.1\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_619d388b-a0cd-4c11-a627-07b7f8279732");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Windows-8.1-Pro/categoryID.67760900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Windows_Windows 81Pro");
        var el11 = dom.createTextNode("\n                                Windows 8.1 Pro\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_963eed1d-d81d-4382-80ff-f915d0d8d9f6");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Windows-8.1-Pro-for-Students/categoryID.67761000");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Windows_Windows81ProForStudents");
        var el11 = dom.createTextNode("\n                                Windows 8.1 Pro for Students\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_64eac2e7-7dc9-4853-9244-b14a88b81abc");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Windows-8.1-Pro-Pack/categoryID.67761100");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Windows_Windows81ProPack");
        var el11 = dom.createTextNode("\n                                Windows 8.1 Pro Pack\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Windows-8.1/categoryID.62684800");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Windows_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/40/a9/40a9e65c-e64b-49c1-a546-104dee84b76f.jpg?n=Store_Windows.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Discover new ways to work and play");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop Windows 8.1");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_4d9e7b8a-1904-4985-a9ee-1ee5f2fcc7a8");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Additional software\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1605cdc5-68b7-4414-99ec-5853e0b7d1a7");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Additional-software/categoryID.62685200");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_AdditionalSoftware_AllAdditionalSoftware");
        var el12 = dom.createTextNode("\n                                All additional software\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a1eaa358-5e30-4b70-b69a-184aa22fef1d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Visual-Studio/categoryID.62687600");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_AdditionalSoftware_VisualStudio");
        var el11 = dom.createTextNode("\n                                Visual Studio\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7966da77-5e30-48aa-8608-278e95e9d3a7");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Visio/categoryID.62687700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_AdditionalSoftware_Visio");
        var el11 = dom.createTextNode("\n                                Visio\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f68cffe3-95b5-4c11-be2e-dcc5e70d7e49");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Project/categoryID.62687800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_AdditionalSoftware_Project");
        var el11 = dom.createTextNode("\n                                Project\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_63e804a1-c082-4e4f-a566-cbe65d0a62a1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Mapping/categoryID.62687900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_AdditionalSoftware_Mapping");
        var el11 = dom.createTextNode("\n                                Mapping\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Additional-software/categoryID.62685200");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_AdditionalSoftware_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/50/b6/50b6206d-8ae0-4430-a2d4-3fdfe64d539b.jpg?n=Store_Software.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("From building apps to reading maps");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop all software");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-blue   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_c730e577-bc59-4ed0-9289-1db44b6efd17");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Accessories\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_24e74719-b043-41f6-8f8f-3d8216ff6ecd");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Accessories/categoryID.62685100");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Accessories_AllAccessories");
        var el12 = dom.createTextNode("\n                                All accessories\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1bfaec5c-876a-45bd-afd6-b3f204fe7d6c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Connected-Home/categoryID.67937100");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Accessories_ConnectedHome");
        var el11 = dom.createTextNode("\n                                Connected home\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9c6a50f7-586f-4c98-9f6d-cf8c0ee7a718");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Fitness-and-health/categoryID.63679900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Accessories_FitnessAndHealth");
        var el11 = dom.createTextNode("\n                                FItness & health\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_64fa2bf4-42a1-46e4-a338-fc5ff64a86da");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Headphones-and-speakers/categoryID.62687500");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Accessories_HeadphonesAndSpeakers");
        var el11 = dom.createTextNode("\n                                Headphones & speakers\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_274b0389-e80c-43da-aa21-9aa8f5c0ba42");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/App-enabled-accessories/categoryID.67096900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Accessories_AppEnabledAccessories");
        var el11 = dom.createTextNode("\n                                App-enabled accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4644d02e-4ed1-496b-9bf6-19ec7d4dd9c4");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Wearable-Technology/categoryID.67937000");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Accessories_WearableTechnology");
        var el11 = dom.createTextNode("\n                                Wearable technology\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_074cfe20-188f-41d7-b07e-65374826e596");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Cameras-and-accessories/categoryID.63679800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Accessories_CamerasAndAccessories");
        var el11 = dom.createTextNode("\n                                Cameras and accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_220f0614-612c-4cd0-9cc8-36cb40250e82");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/PC-accessories/categoryID.62687100");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Accessories_PCAccessories");
        var el11 = dom.createTextNode("\n                                PC accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Accessories/categoryID.62685100");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Accessories_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/ee/d8/eed8ea5a-3a7e-480f-b489-9514f31b8e62.jpg?n=Store_Accessories.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Essential extras to enhance your experience");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop all accessories");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-lighter-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_809d0a72-3102-4e8d-aff9-f04796642de8");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Business\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3fb1e2c7-d0ea-4ce8-8bc8-5f3edf6034fc");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Business/categoryID.68081300");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Business_AllBusiness");
        var el12 = dom.createTextNode("\n                                All business\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_14d0afaa-5222-4b23-b253-7eb9276adb08");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Small-Business-Computers/categoryID.63438200");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Business_SmallBusinessComputers");
        var el11 = dom.createTextNode("\n                                Small business computers\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_422a4f49-8db2-4f34-b2bb-0cfffe98bbbb");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Surface/categoryID.66734700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Business_Surface");
        var el11 = dom.createTextNode("\n                                Surface\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_395881c5-9400-45d5-8852-973e473deba5");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Office/categoryID.63466500");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Business_Office");
        var el11 = dom.createTextNode("\n                                Office\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1fdf672a-e484-4943-9afe-78277c9a28c1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/IT-+-Servers/categoryID.63438400");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Business_ITAndServers");
        var el11 = dom.createTextNode("\n                                IT + Servers\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_dce19e14-bc42-4e25-8b52-c17dae214ab5");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Software/categoryID.63438300");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Business_Software");
        var el11 = dom.createTextNode("\n                                Software\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_ae0b15c5-0815-44b2-abeb-3f63c94483e2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Accessories/categoryID.63466800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Business_Accessories");
        var el11 = dom.createTextNode("\n                                Accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Business/categoryID.68081300");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Business_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/ac/b5/acb5e545-69df-4d2d-b695-4e8d8c6c73d7.jpg?n=Store-Small-Business_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Technology solutions you and your business can count on");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop now");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-red   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_7e89fb8b-49cb-4040-9753-76334c5c9470");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Entertainment\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_413dbd6f-aacb-41f4-9f3b-31101894b5d3");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","https://unistorefd-int.www.microsoft.com/en-us/store/movies-and-tv");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Entertainment_MoviesAndTV");
        var el12 = dom.createTextNode("\n                                Movies & TV\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3340e620-8e3d-41d6-b695-08af0c2783db");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://unistorefd-int.www.microsoft.com/en-us/store/music");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Entertainment_Music");
        var el11 = dom.createTextNode("\n                                Music\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f8135654-20bd-438d-a2b4-c9f8dfb41ea3");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/PC-games/categoryID.62685800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Entertainment_PCGames");
        var el11 = dom.createTextNode("\n                                PC games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/movies-and-tv");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Entertainment_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/85/4a/854acb19-fa13-4afd-bdb5-be76296fa806.jpg?n=Entertainment_Movies_Nav_406x250.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Watch the latest movies and tv");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Visit the Movie & TV Store");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_332276c5-98d5-4fa7-93f3-1702db0fd2d5");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Sale\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7f6463e1-7efa-480d-a1e4-b652af1a6cd9");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/categoryID.67576700");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Sale_AllSales");
        var el12 = dom.createTextNode("\n                                All sales\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8f4299ca-d996-45ad-a4a4-8d64c06b9f7f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/edu");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Sale_EducationStore");
        var el11 = dom.createTextNode("\n                                Education store\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a1f9db7b-dd89-4e06-a5dd-5a662942a124");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Military/categoryID.67817700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Sale_For_Military");
        var el11 = dom.createTextNode("\n                                For military\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7213d3d9-b08f-4c34-bdd7-e8462a4f8abc");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Refurbished/categoryID.64244600");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Sale_Refurbished");
        var el11 = dom.createTextNode("\n                                Refurbished\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/categoryID.67576700");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Sale_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/bf/e2/bfe2d0a8-7463-4698-8cca-b99cae3ae44e.jpg?n=Store_Sale_new_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Take advantage of big savings and special offer");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Shop now");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_603e94a3-7f2f-4b74-b64d-453a788795cd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Apps\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_885b56f7-619f-482e-9495-f89c8f529ba5");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","https://www.microsoft.com/en-us/store/apps");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_AllApps");
        var el12 = dom.createTextNode("\n                                Windows apps\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1f5a6b1e-2311-4407-bd97-783ad381ce04");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/entertainment/xbox-one/live-apps");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_XboxApps");
        var el11 = dom.createTextNode("\n                                Xbox apps\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://windows.microsoft.com/en-us/windows/search#q=top+free&s=Store");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Apps_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/d6/fb/d6fb1a56-be00-464c-9f0d-8a967f0c3b06.jpg?n=Apps_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Discover thousands of great apps and games");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Search Windows apps");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_950b4a41-b03c-4c5a-ace2-852b8d671b60");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Games\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_00824784-7530-4b61-8d1f-a7dfbe760073");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","https://www.microsoft.com/en-us/store/games");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_AllGames");
        var el12 = dom.createTextNode("\n                                Windows games\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_bb3d6cca-30b3-42f0-8b14-026ee01889b1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/games/xbox-one?xr=shellnav");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox One games");
        var el11 = dom.createTextNode("\n                                Xbox One games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1219640d-0ec6-45e2-93fb-b3ab1834882d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/games/xbox-360?xr=shellnav");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Xbox360Games");
        var el11 = dom.createTextNode("\n                                Xbox 360 games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_cb6f915f-7c22-4b4e-af82-1dfd55d3d049");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/PC-games/categoryID.62685800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_PCGames");
        var el11 = dom.createTextNode("\n                                PC games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.xbox.com/en-US/games/xbox-one");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Store_Games_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/a4/8c/a48c380e-d6ee-4a91-9a7f-4dbf9cee7103.jpg?n=Games_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("The best games live on Xbox One");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Learn more");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4,"class","shell-header-dropdown   ");
        dom.setAttribute(el4,"data-navcontainer","shellmenu_c138014a-849c-4872-bc08-818e03c82d47_NavContainer");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h2");
        dom.setAttribute(el5,"id","shellmenu_c138014a-849c-4872-bc08-818e03c82d47");
        dom.setAttribute(el5,"class","shell-header-dropdown-label");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","javascript:void(0)");
        dom.setAttribute(el6,"role","menu");
        dom.setAttribute(el6,"data-bi-name","Explore");
        dom.setAttribute(el6,"data-bi-slot","2");
        var el7 = dom.createTextNode("\n                Explore\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-dropdown");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","shell-header-dropdown-content ");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-mscom-cyan  active ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_f3d6407e-b0b7-4a7d-a589-c89fcb7f5b4e");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Get organized\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_fce9a5bb-bdaf-472d-96fd-c802f75417b8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/en-us/explore/cookies");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","One weekend. 3000 cookies.");
        var el12 = dom.createTextNode("\n                                One weekend. 3000 cookies.\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_60d5c421-5626-4b93-90f1-f3b2bece1b8c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/explore/cookies");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","See how one family pulls off a sweet tradition >");
        var el11 = dom.createTextNode("\n                                See how one family pulls off a sweet tradition >\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoft.com/en-us/explore/cookies");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Exp_GetOrganized_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/5e/eb/5eeba883-3108-45c9-b125-2a9751265414.jpg?n=nav_cookies_01_420x380.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_e4c8ac10-9bf4-4c53-8bfe-e54d52753f79");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Bring friends together\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_010edff9-e909-413b-a095-e37346cd91d5");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/en-us/explore/party");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","One party. Hosted by everyone. ");
        var el12 = dom.createTextNode("\n                                One party. Hosted by everyone.\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2c1e540a-4d43-4bed-84b7-d3ff1ef33e0a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/explore/party");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Create a party with help from friends >");
        var el11 = dom.createTextNode("\n                                Create a party with help from friends >\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoft.com/en-us/explore/party");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Exp_BringFriendsTogether_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/ad/6d/ad6d0afe-ee0a-48a1-ad6f-95f92af869d2.jpg?n=Bring_Friends_02_420x380.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-green   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_9a631936-a307-4497-a9a9-93b891c33b66");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Capture and share\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d1634b69-e7fb-4e3b-9aab-1c0a469aad99");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/en-us/explore/roadtrip");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Three friends. 300 miles.");
        var el12 = dom.createTextNode("\n                                Three friends. 300 miles.\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_efa3ad54-e555-4bce-bd2c-ad7beb885c85");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/explore/roadtrip");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Hit the road with only your phone as a guide >");
        var el11 = dom.createTextNode("\n                                Hit the road with only your phone as a guide >\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoft.com/en-us/explore/roadtrip");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Exp_CaptureAndShare_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/9f/a0/9fa098c8-28cb-4f04-ac9f-ea26b1652cb7.jpg?n=nav_CaptureShare_01_420x380.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4,"class","shell-header-dropdown   ");
        dom.setAttribute(el4,"data-navcontainer","shellmenu_29b038ac-ecfa-44ce-a7e2-e5618f362ba6_NavContainer");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h2");
        dom.setAttribute(el5,"id","shellmenu_29b038ac-ecfa-44ce-a7e2-e5618f362ba6");
        dom.setAttribute(el5,"class","shell-header-dropdown-label");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","javascript:void(0)");
        dom.setAttribute(el6,"role","menu");
        dom.setAttribute(el6,"data-bi-name","Devices");
        dom.setAttribute(el6,"data-bi-slot","3");
        var el7 = dom.createTextNode("\n                Devices\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-dropdown");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","shell-header-dropdown-content ");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-mscom-cyan  active ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_3f56a3b6-da7d-46cb-ba8a-89bf1e7a4d5f");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Surface\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_52b763eb-a49e-44c6-9f0c-97bc268eb137");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/surface/en-us");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Store_Devices_AllSurface");
        var el12 = dom.createTextNode("\n                                All Surface\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_ceeb0e22-98f4-4ceb-9a67-f89f6cdaa5d2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/products/surface-pro-3");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Devices_Surface Pro3");
        var el11 = dom.createTextNode("\n                                Surface Pro 3\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_930140d1-ff8a-4aff-a687-f5c31650a462");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/products/surface-2");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Devices_Surface2");
        var el11 = dom.createTextNode("\n                                Surface 2\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4e754d43-4fdb-4f27-9158-3451998c4b4f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/accessories/home");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Devices_Accessories");
        var el11 = dom.createTextNode("\n                                Accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_66c1d049-0f2c-4ca7-9433-3afa722db705");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/edu");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Devices_SurfaceForStudents");
        var el11 = dom.createTextNode("\n                                Surface for students\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8b31deac-3573-441d-9a78-2cea4ef166be");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Surface/categoryID.66734700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Store_Devices_ShopSurface");
        var el11 = dom.createTextNode("\n                                Shop Surface\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoft.com/surface/en-US/why-surface/overview");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Devices_Surface_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/26/c9/26c9c71d-1e92-47a4-8fd2-b1e9aaea9f36.jpg?n=Devices_Surface_Nav_406x.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("The most productive tablets on the planet");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Learn more");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-cyan   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_b87301fc-5936-4930-a67d-3a660c6d5188");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        PCs & tablets\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e7f1c0e6-47c7-4167-b87c-8a6d96a0eacb");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Computers/categoryID.62684600");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","All PCs & tablets");
        var el12 = dom.createTextNode("\n                                All PCs & tablets\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_683cd64a-9d17-4d1c-aa56-3690c8733853");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Surface");
        var el11 = dom.createTextNode("\n                                Surface\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a07cec46-8783-48b6-8417-981f37de024a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Laptops/categoryID.62685400");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_PCsAndTablets_Laptops");
        var el11 = dom.createTextNode("\n                                Laptops\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_43f7010a-e919-46a9-bd38-4777773ce562");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Tablets/categoryID.67092800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_PCsAndTablets_Tablets");
        var el11 = dom.createTextNode("\n                                Tablets\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e44342ea-21c7-43b0-a9c0-b2c5247c06db");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/2-in-1-PCs/categoryID.62685500");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_PCsAndTablets_2in1s");
        var el11 = dom.createTextNode("\n                                2 in 1s\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a76b1ab9-ca11-4c29-b877-c78164e4b30b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/All-in-ones-and-Desktops/categoryID.62685600");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_PCsAndTablets_AllInOnes ");
        var el11 = dom.createTextNode("\n                                All in ones\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_b07fc464-c5c0-4fb8-8e82-3432c1f72e6c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/categoryID.67899900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_PCsAndTablets_GamingComputers");
        var el11 = dom.createTextNode("\n                                Gaming computers\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_365152be-2362-4bdb-b560-29d3ed549d92");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Computers/categoryID.62684600");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_PCsAndTablets_ShopPCsAndTablets");
        var el11 = dom.createTextNode("\n                                Shop PCs & tablets\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Computers/categoryID.62684600");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Devices_PCsAndTablets_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/8d/61/8d61a028-6fd6-4591-a2fa-00457b30565d.jpg?n=Devices_PCsandTablets_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Get things done and have more fun");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Explore new PCs");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-green   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_7a9c8017-0f51-45fa-b63f-b620fd650d37");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Xbox\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f30ce83b-3ef5-4b48-a0e8-4c95d8da596f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.xbox.com/");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Devices_Xbox_AllXbox");
        var el12 = dom.createTextNode("\n                                All Xbox\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_ab7e561f-2192-4607-af65-334b3affc15d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/xbox-one/meet-xbox-one");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Xbox_XboxOne");
        var el11 = dom.createTextNode("\n                                Xbox One\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4237ea77-766e-4e45-a01e-516083365ebf");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/games/xbox-one");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Xbox_XboxOneGames");
        var el11 = dom.createTextNode("\n                                Xbox One games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_36785e21-665d-412d-850c-1e6b621604da");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/xbox-one/accessories");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Xbox_XboxOneAccessories");
        var el11 = dom.createTextNode("\n                                Xbox One accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3017c205-95f7-4f65-b145-8106ce27d525");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/live");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Xbox_XboxLive");
        var el11 = dom.createTextNode("\n                                Xbox Live\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_494b577d-32f7-4038-86bd-c859a1fbede8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/xbox-360");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Xbox_Xbox360");
        var el11 = dom.createTextNode("\n                                Xbox 360\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_cff0cd66-2b49-40da-af9e-721ebbceb314");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/games/xbox-360");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Xbox_Xbox360Games");
        var el11 = dom.createTextNode("\n                                Xbox 360 games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9f2f111f-0d1f-4a9c-b860-3dc11769b015");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Xbox/categoryID.62684900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Xbox_ShopXbox");
        var el11 = dom.createTextNode("\n                                Shop Xbox\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.xbox.com/en-us");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Devices_Xbox_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/cc/92/cc92d37b-20a8-4c1e-aa3a-5e94afd0804d.jpg?n=Devices_Xbox_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("It's more fun on Xbox One");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Learn more");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-red   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_4df6aa3f-9c2c-45e1-9d14-9dfafc558c4c");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Windows Phone\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f09657b8-9259-4535-8674-c4bcc7a0a065");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.windowsphone.com/en-us");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Devices_WP_AllWindowsPhones");
        var el12 = dom.createTextNode("\n                                All Windows Phones\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_746276d0-43cf-45d9-b349-7b0e2c6078df");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/mobile/phones/all/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_WP_MobileDevices");
        var el11 = dom.createTextNode("\n                                Mobile devices\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_5dd02129-b3ac-4879-b550-184bd0fd9930");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Phone-accessories/categoryID.62687300");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_WP_PhoneAccessories");
        var el11 = dom.createTextNode("\n                                Phone accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_364587f6-1dc1-4dff-9ad3-5444302e057a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/store/overview");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_WP_AppsAndGames");
        var el11 = dom.createTextNode("\n                                Apps & games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d0f7c520-283d-41d1-a9df-4a525e5c2bad");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/features");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_WP_Features");
        var el11 = dom.createTextNode("\n                                Features\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d01e4467-e18f-4619-be32-493dee3bd41e");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Windows-Phone/categoryID.62685000");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_WP_Shop Windows Phone");
        var el11 = dom.createTextNode("\n                                Shop Windows Phone\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.windowsphone.com/en-us");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Devices_WindowsPhone_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/d1/4e/d14e9db6-c166-497d-ad96-10a244bc9289.jpg?n=Devices_WindowsPhone_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("The world's most personal smartphone");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Find yours");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_01f0b539-43a2-4ca4-86ed-1b4696e9540a");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Microsoft Band\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoft.com/Microsoft-Band/en-us");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Devices_MicrosoftBand_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/e4/f7/e4f77cc3-e1d6-499b-9cd0-d37d673512da.jpg?n=Devices_Band_Nav_406x250.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Introducing Microsoft Band");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Learn more");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-cyan   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_bc7ebd98-ae37-4547-a4bc-4cada0d47d4b");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Accessories\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_25ac346d-c0cd-4a39-83d6-c9d964db5510");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Accessories/categoryID.62685100");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Devices_Accessories_AllAccessories");
        var el12 = dom.createTextNode("\n                                All accessories\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2157fe85-5ff1-4bc0-97e3-28be3989e88a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Surface-accessories/categoryID.64061900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Accessories_SurfaceAccessories");
        var el11 = dom.createTextNode("\n                                Surface accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_6e43d47f-c3f6-4fc7-b6e4-87352902510a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Xbox-One-accessories/categoryID.64724300");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Accessories_XboxOneAccessories");
        var el11 = dom.createTextNode("\n                                Xbox One accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_48f91b06-746a-4d65-97ac-5083954e265e");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Xbox-360-accessories/categoryID.62687200");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Accessories_Xbox360Accessories");
        var el11 = dom.createTextNode("\n                                Xbox 360 accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4789ebe4-9bef-437f-8f4c-710a27eb5fb4");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Phone-Accessories/categoryID.64396400");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Accessories_WindowsPhoneAccessories");
        var el11 = dom.createTextNode("\n                                Windows Phone accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2fa5a10f-da28-4050-aa07-c3e5cf2a52d3");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/PC-accessories/categoryID.62687100");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Accessories_PCAccessories");
        var el11 = dom.createTextNode("\n                                PC accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7b7a377e-50ae-4e33-9a16-8cd17937fd99");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/hardware/en-US");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Accessories_MicrosoftHardware");
        var el11 = dom.createTextNode("\n                                Microsoft Hardware\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f6a83c38-7280-4b9c-ba40-e8bacef41e16");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Accessories/categoryID.62685100");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Devices_Accessories_Shop accessories");
        var el11 = dom.createTextNode("\n                                Shop accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Accessories/categoryID.64542900");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Devices_Accessories_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/68/57/6857fe5d-2a33-462c-bef0-739dd099ad43.jpg?n=Devices_Accessories_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Comfort, style, precision");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode(" Shop accessories now");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4,"class","shell-header-dropdown   ");
        dom.setAttribute(el4,"data-navcontainer","shellmenu_a8a20665-a14b-4f78-8541-d10c8de346fe_NavContainer");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h2");
        dom.setAttribute(el5,"id","shellmenu_a8a20665-a14b-4f78-8541-d10c8de346fe");
        dom.setAttribute(el5,"class","shell-header-dropdown-label");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","javascript:void(0)");
        dom.setAttribute(el6,"role","menu");
        dom.setAttribute(el6,"data-bi-name","SoftwareAndApps");
        dom.setAttribute(el6,"data-bi-slot","4");
        var el7 = dom.createTextNode("\n                Software & apps\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-dropdown");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","shell-header-dropdown-content ");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-orange  active ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_fac9a650-ca3c-4aac-a722-4cbd720a36e3");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Office\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_227016eb-7646-4113-9ba3-ab794dd6b4a2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://products.office.com/");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","SoftwareAndApps_Office_AllOffice");
        var el12 = dom.createTextNode("\n                                All Office\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d1dc830d-92f7-4427-bdc8-29478d1b7b27");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/compare-microsoft-office-products");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_OfficeForHome");
        var el11 = dom.createTextNode("\n                                Office for home\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a3dffac6-6ef8-4aa3-9b61-07b997571b56");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/business/office");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_OfficeForBusiness");
        var el11 = dom.createTextNode("\n                                Office for business\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7a7d1ccd-8805-4ddc-8946-636e4d0bdc8a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/student/office-in-education");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_OfficeForStudents");
        var el11 = dom.createTextNode("\n                                Office for students\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f73d992c-11fa-4e59-b236-99e3a1459983");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/mac");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_OfficeForMac");
        var el11 = dom.createTextNode("\n                                Office for Mac\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_732df5cf-f5fe-448f-a8d6-5b22c2b75c10");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/mobile/office");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_OfficAcrossMobileDevices");
        var el11 = dom.createTextNode("\n                                Office across mobile devices\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_510a6f3c-0bb5-4cf2-96ed-70b5dcded617");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/try?WT.mc_id=OAN_ONESTORE-hplink-ofcfreetrials");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_OfficeTrials");
        var el11 = dom.createTextNode("\n                                Office trials\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_252e1082-b71f-4e12-a1a5-2688af759919");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Office/categoryID.62684700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_DownloadOffice");
        var el11 = dom.createTextNode("\n                                Download Office\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/download/office.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_FreeOfficeDownloads");
        var el11 = dom.createTextNode("\n                                Free Office downloads\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://store.office.live.com/Templates?WT.mc.id=OAN_ONESTORE-hplink-downlOfctempl");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_OfficeTemplates");
        var el11 = dom.createTextNode("\n                                Office templates\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Office/categoryID.62684700");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Office_Shop Office");
        var el11 = dom.createTextNode("\n                                Shop Office\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_e8fc5c71-4726-4c7e-b854-f76cd07cadcf");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Windows\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_c6414eb8-e6d7-4e7a-8953-16f4ee66137b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://windows.microsoft.com/en-us/windows/home");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","SoftwareAndApps_Windows_AllWindows");
        var el12 = dom.createTextNode("\n                                All Windows\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_062b3c27-f24c-43dd-9102-b8c467a2db97");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows-8/meet");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Windows_Windows8_1");
        var el11 = dom.createTextNode("\n                                Windows 8.1\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7f179090-5127-4a13-8464-2e426d7c6834");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows-8/compare");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Windows_Compare");
        var el11 = dom.createTextNode("\n                                Compare\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_715c86fd-fc48-4d18-b395-358e8f302440");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/support");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Windows_HelpAndHowTo");
        var el11 = dom.createTextNode("\n                                Help & how-to\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_17ffa054-b146-4f40-a982-c06415e79565");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Windows-8/categoryID.62684800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Windows_DownloadWindows81");
        var el11 = dom.createTextNode("\n                                Download Windows 8.1\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_49c4686c-5a62-4456-b25a-9559b77a9070");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/downloads");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Windows_FreeWindowsDownloads");
        var el11 = dom.createTextNode("\n                                Free Windows downloads\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_33b86c08-098a-4a39-af52-3a3e025efccd");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows-8/apps#Cat=t1");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Windows_Windows81Games");
        var el11 = dom.createTextNode("\n                                Windows 8.1 games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1cb3ddb9-f417-4fb1-868b-a0092540d16e");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Windows-8/categoryID.62684800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_Windows_ShopWindows");
        var el11 = dom.createTextNode("\n                                Shop Windows\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://windows.microsoft.com/en-us/windows/home");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Windows_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/a1/a4/a1a43fa9-52ce-42bb-a44e-2dfc94e99d47.jpg?n=SoftwareandApps_Win_Nav_406x280_EN-US.JPG.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Everything you already love. And a lot more. ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Learn more about Windows");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab    ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_27ad7d3c-2c81-41a7-97ae-ddd65cf2021e");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Other software & services\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f57f28b4-a212-42eb-ae10-3261bbe587b9");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Additional-software/categoryID.62685200");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_AllAdditionalSoftware");
        var el12 = dom.createTextNode("\n                                All additional software\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4c9c5481-334d-4013-9efa-979553b03081");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/microsoft-health/en-us");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_MicrosoftHealth");
        var el11 = dom.createTextNode("\n                                Microsoft Health\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_c646cb88-5de8-4d3d-9976-33f2360f62a6");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/security-essentials-download");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_MicrosoftSecurityEssentials");
        var el11 = dom.createTextNode("\n                                Microsoft Security Essentials\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e46eaa26-7b38-47c0-8a84-3b596eff9f4b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.skype.com/en/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_Skype");
        var el11 = dom.createTextNode("\n                                Skype\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3e463563-2332-4785-912e-3657b0afa303");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/internet-explorer/download-ie");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_InternetExplorer");
        var el11 = dom.createTextNode("\n                                Internet Explorer\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_c984ead7-84d0-4515-861a-89eef7a2cc82");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://onedrive.live.com/about/en-us/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_OneDrive");
        var el11 = dom.createTextNode("\n                                One Drive\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_61c95fcc-2d1d-485c-8b3e-368e29258ee0");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/pdp/Outlook-2013/productID.259322300");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_Outlook");
        var el11 = dom.createTextNode("\n                                Outlook\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_58a00a61-4f23-4a79-a5b3-e7f5a1398af8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.onenote.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_OneNote");
        var el11 = dom.createTextNode("\n                                OneNote\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.bing.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_Bing");
        var el11 = dom.createTextNode("\n                                Bing\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.visualstudio.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_VisualStudio");
        var el11 = dom.createTextNode("\n                                Visual Studio\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/visio/flowchart-software?WT.mc_id=OAN_MSCOM-apps-OfcVisio");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_Visio");
        var el11 = dom.createTextNode("\n                                Visio\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/project/project-and-portfolio-management-software?WT.mc_id=OAN_MSCOM-apps-OfcProject");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_Project");
        var el11 = dom.createTextNode("\n                                Project\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/Mapping/categoryID.62687900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_Mapping");
        var el11 = dom.createTextNode("\n                                Mapping\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://msn.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_MSN");
        var el11 = dom.createTextNode("\n                                MSN\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Additional-software/categoryID.62685200");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherSoftwareAndServices_ShopAdditionalSoftware");
        var el11 = dom.createTextNode("\n                                Shop additional software\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_18ae6aae-1f65-456c-8ebb-a4a6615825f1");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Apps\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_cb106f3d-d027-43be-997c-5512bd11bf7b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","https://www.microsoft.com/en-us/store/apps");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","S_A_AllApps");
        var el12 = dom.createTextNode("\n                                All apps\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f49196f3-0fad-47f1-9bcf-b9fa54699473");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/entertainment/xbox-one/live-apps");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","S_A_XboxApps");
        var el11 = dom.createTextNode("\n                                Xbox apps\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://windows.microsoft.com/en-us/windows/search#q=top+free&s=Store");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","S_A_Apps_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/13/9e/139e3da4-d547-41ae-96a9-b26b844f34d4.jpg?n=SoftwareandApps_Apps_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Discover thousands of great apps and games");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Search Windows apps");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_30f16a86-44d5-461e-911d-9ca0c9934335");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Games\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3047e52f-53fe-46ba-8bb6-584397af330e");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","https://www.microsoft.com/en-us/store/games");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","S_A_AllGames");
        var el12 = dom.createTextNode("\n                                All games\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_548d5a8a-73f5-4e21-b539-9cda12c6fa5d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/games/xbox-one?xr=shellnav");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","S_A_XboxOneGames");
        var el11 = dom.createTextNode("\n                                Xbox One games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_1eb22bf0-2d8e-482a-ae9b-6ef0fb19aeb1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.xbox.com/en-US/games/xbox-360?xr=shellnav");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","S_A_Xbox360Games");
        var el11 = dom.createTextNode("\n                                Xbox 360 games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_54029636-1873-4eb5-b836-e069bf16a17f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/list/PC-games/categoryID.62685800");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","S_A_PCGames");
        var el11 = dom.createTextNode("\n                                PC games\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/games");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","S_A_Games_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/97/c5/97c5a010-ea59-4b66-b262-f0d546bf2a99.jpg?n=SoftwareandApps_Games_Nav_406x280.jpg");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("The best games live on Xbox One");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Learn more");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-mscom-cyan   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_e11652dd-948a-4178-bfdf-fffe6ff9b8da");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Other downloads\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_35e8296d-0f0d-4f28-b7ef-ca15dcbb0047");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/en-us/download/default.aspx?WT.mc_id=ONESTORE_HP_gb_Nav_Downloads");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","SoftwareAndApps_OtherDownloads_OtherDownloads");
        var el12 = dom.createTextNode("\n                                Other downloads\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_589b22b1-8384-4e84-ab0a-f9b1f232b068");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/download/default.aspx?WT.mc_id=ONESTORE_HP_gb_Nav_Downloads");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherDownloads_DownloadCenter");
        var el11 = dom.createTextNode("\n                                Download Center\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a5a32ea6-3f0d-4aa1-b4ea-00edb733d5c7");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/security-essentials-download");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherDownloads_MicrosoftSecurityEssentials");
        var el11 = dom.createTextNode("\n                                Microsoft Security Essentials\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_52a57fd5-ca7b-4c83-a2c6-35260a181ae5");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.update.microsoft.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherDownloads_WindowsUpdateServicePacksAndFxes");
        var el11 = dom.createTextNode("\n                                Windows Update: Service packs & fixes\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_c5cecef9-01ee-439d-9803-b65db6665a57");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/devices-drivers-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherDownloads_DriversSoundPrinterUSBMore");
        var el11 = dom.createTextNode("\n                                Drivers (sound, printer, USB, more)\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_28df30ac-5e31-4c75-a4c1-01eb114107bc");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/hardware/en-us/downloads");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_OtherDownloads_MicrosoftHardwaredrivers");
        var el11 = dom.createTextNode("\n                                Microsoft Hardware drivers\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab    ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_509afb2d-df82-4716-a686-3786ccb29184");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Developer & IT Pro\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e0356825-9b19-470f-bea7-28076eb694b2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://msdn.microsoft.com/en-us/default.aspx");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","SoftwareAndApps_DeveloperAndITPro_MSDN");
        var el12 = dom.createTextNode("\n                                MSDN (Microsoft Developer Network)\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_dd7253c7-7455-45e0-bd48-ac837410c54c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://technet.microsoft.com/en-us/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_DeveloperAndITPro_TechNetForITProfessionals");
        var el11 = dom.createTextNode("\n                                TechNet for IT Professionals\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_74b133c9-ed15-409a-b6d1-fb791233f851");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.visualstudio.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_DeveloperAndITPro_VisualStudio");
        var el11 = dom.createTextNode("\n                                Visual Studio\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f6cb5443-2297-4a26-ba7e-dd7c4190341a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/cat/Developer/categoryID.63433900");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_DeveloperAndITPro_ShopDeveloper");
        var el11 = dom.createTextNode("\n                                Shop developer\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-cyan   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_2a39135e-b952-4709-97de-a8f864afb4d9");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Business & Enterprise\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_70b0e35f-8f29-4096-92d8-fbc521185830");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/en-us/server-cloud/");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_Cloud platform");
        var el12 = dom.createTextNode("\n                                Cloud platform\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_6391ed05-d582-4ad0-b609-91ae88bc54f5");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/server-cloud/solutions/high-availability.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_DataAvailability");
        var el11 = dom.createTextNode("\n                                Data availability\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_16311ff8-7e08-4d9c-b840-3889e8398497");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/server-cloud/audience/business-analytics.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_BusinessAnalytics");
        var el11 = dom.createTextNode("\n                                Business analytics\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a7727de7-a6a9-4f28-bee8-836678262d80");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/dynamics/crm.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_CustomerRelationshipManagement");
        var el11 = dom.createTextNode("\n                                Customer relationship management\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8b6666eb-cac4-4a88-92c9-0609dd9ae35d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/server-cloud/products/enterprise-mobility-suite/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_EnterpriseMobilitySuite");
        var el11 = dom.createTextNode("\n                                Enterprise Mobility Suite\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_ca5ee3f4-7fff-4840-937c-a46ac0974e16");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://www.microsoft.com/en-us/dynamics/erp.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_Enterprise_ResourcPlanning");
        var el11 = dom.createTextNode("\n                                Enterprise resource planning\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9f8bcf75-0d4e-4302-b5c2-26112024ac3d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/enterprise/industry/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_IndustrySolutions");
        var el11 = dom.createTextNode("\n                                Industry solutions\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_26f22ca7-faa8-44bd-af09-0e47a940b97e");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/enterprise/it-trends/social-enterprise/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_SocialAndProductivity");
        var el11 = dom.createTextNode("\n                                Social and productivity\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/business/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_SmallBusinessSolutions");
        var el11 = dom.createTextNode("\n                                Small business solutions\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/publicsector/ww/Pages/index.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_PublicSector");
        var el11 = dom.createTextNode("\n                                Public sector\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/education");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_MicrosoftInEducation");
        var el11 = dom.createTextNode("\n                                Microsoft in Education\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://pinpoint.microsoft.com/?locale=en-US");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_FindAnITExpertPinpoint");
        var el11 = dom.createTextNode("\n                                Find an IT expert (Pinpoint)\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/licensing/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_VolumeLicenscing");
        var el11 = dom.createTextNode("\n                                Volume Licenscing\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://mspartner.microsoft.com/en/us/Pages/index.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessAndEnterprise_ResourcesForMicrosoftPartners");
        var el11 = dom.createTextNode("\n                                Resources for Microsoft Partners\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_e357fb60-867f-459a-a970-b4256e97617d");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Business software & apps\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e763a6e1-9b50-4bc3-8039-3e00ddbcc593");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/en-us/dynamics/default.aspx");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_MicrosoftDynamics");
        var el12 = dom.createTextNode("\n                                Microsoft Dynamics\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e6090122-ef30-47da-8d7e-1f2372f00040");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/powerbi/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_MicrosoftPowerBI");
        var el11 = dom.createTextNode("\n                                Microsoft Power BI\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3f69695c-8b15-4410-85eb-5ec596ea0560");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/server-cloud/products/sql-server/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_Microsoft QLServer");
        var el11 = dom.createTextNode("\n                                Microsoft SQL Server\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_bfbd1361-d7e0-4cbb-80d1-9a7b2d322a8f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/server-cloud/products/windows-server-2012-r2/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_Windows Server");
        var el11 = dom.createTextNode("\n                                Windows Server\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3667eb9b-25c9-41f0-84cc-fb3356c5e29e");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.visualstudio.com/en-us/explore/app-lifecycle-management-vs");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_VisualStudio");
        var el11 = dom.createTextNode("\n                                Visual Studio\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9e99fd50-098a-4afa-834f-68efea413e4a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://azure.microsoft.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_Microsoft Azure");
        var el11 = dom.createTextNode("\n                                Microsoft Azure\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_cd3b0b61-de2d-4ee2-b8b1-fdbd165cc484");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/dynamics/crm-social.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_MicrosoftSocialListening");
        var el11 = dom.createTextNode("\n                                Microsoft Social Listening\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3e6e15f5-2049-49ab-9b4f-869124ef873f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/windowsembedded/en-us/windows-embedded.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_WindowsEmbedded");
        var el11 = dom.createTextNode("\n                                Windows Embedded\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/business/office");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_Office");
        var el11 = dom.createTextNode("\n                                Office\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/server-cloud/products/windows-intune/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_MicrosoftIntune");
        var el11 = dom.createTextNode("\n                                Microsoft Intune\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://onedrive.live.com/about/en-us/business/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_OneDriveForBusiness");
        var el11 = dom.createTextNode("\n                                OneDrive for Business\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/exchange/email");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_Exchange Server");
        var el11 = dom.createTextNode("\n                                Exchange Server\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/Lync/lync-server-2013-features-video-conferencing-and-instant-messaging");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_Lync");
        var el11 = dom.createTextNode("\n                                Lync\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/sharepoint/collaboration");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","SoftwareAndApps_BusinessSoftwareAndApps_SharePoint");
        var el11 = dom.createTextNode("\n                                SharePoint\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4,"class","shell-header-dropdown   ");
        dom.setAttribute(el4,"data-navcontainer","shellmenu_d9cb479a-9f47-44f5-bd54-fccb50b6397c_NavContainer");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h2");
        dom.setAttribute(el5,"id","shellmenu_d9cb479a-9f47-44f5-bd54-fccb50b6397c");
        dom.setAttribute(el5,"class","shell-header-dropdown-label");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","javascript:void(0)");
        dom.setAttribute(el6,"role","menu");
        dom.setAttribute(el6,"data-bi-name","Suppurt_Support");
        dom.setAttribute(el6,"data-bi-slot","5");
        var el7 = dom.createTextNode("\n                Support\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7,"class","shell-icon-dropdown");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","shell-header-dropdown-content ");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple  active ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_3e56408a-567e-470f-a41e-2eec974669b5");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Windows\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f005485d-0bab-439a-951e-022b5984dbaa");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://windows.microsoft.com/en-us/windows/support");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_Windows_AllWindowsSupport");
        var el12 = dom.createTextNode("\n                                All Windows support\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2b30c4c2-27cb-44e2-aab9-41ed595f64e1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_ContactWindowsSalesSupport");
        var el11 = dom.createTextNode("\n                                Contact Windows sales support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_6d40a480-4871-4c74-90ee-32f71964c464");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.microsoft.com/ContactUs/TechnicalSupport?wa=wsignin1.0#gsproductselector/productid/509");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_ContactWindowsGechnicalSupport");
        var el11 = dom.createTextNode("\n                                Contact Windows technical support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4b6c9074-cee9-478f-9134-ed47950b19b8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/tutorial");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_GetStarted");
        var el11 = dom.createTextNode("\n                                Get started\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_23fbd730-0935-4a59-a932-9a3f3e1813d9");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/install-upgrade-activate-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_InstallAndUpgrade");
        var el11 = dom.createTextNode("\n                                Install & upgrade\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_bdfa2a3f-ce76-4449-9ee9-bcbac0003fc3");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/search-touch-mouse-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_SearchTouchAndMouse");
        var el11 = dom.createTextNode("\n                                Search, touch and mouse\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e3432df8-6f62-447e-8a49-6e20d82a5aea");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/personalization-accessibility-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_PersonalizationAndEaseOfAccess");
        var el11 = dom.createTextNode("\n                                Personalization & Ease of Access\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_37a15ded-bf59-4c4f-a847-cd13aa64354a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/security-privacy-accounts-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_SecurityPrivacyAndAccount");
        var el11 = dom.createTextNode("\n                                Security, privacy, & account\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/apps-windows-store-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_AppsAndWindowsStore");
        var el11 = dom.createTextNode("\n                                Apps & Windows Store\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/email-communication-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_EmailAndCommunication");
        var el11 = dom.createTextNode("\n                                Email & communication\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/music-photos-video-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_MusicPhotosVideo");
        var el11 = dom.createTextNode("\n                                Music, photos, video\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/files-folders-storage-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_FilesFoldersAndOnlineStorage");
        var el11 = dom.createTextNode("\n                                Files, folders, & online storage\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/repair-recovery-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_RepairAndRecovery");
        var el11 = dom.createTextNode("\n                                Repair & recovery\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/devices-drivers-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Windows_DevicesAndDrivers");
        var el11 = dom.createTextNode("\n                                Devices & drivers\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-orange   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_b63f8f56-15c2-4a21-b8a5-b2a03a718b4d");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Office\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_433cbcf3-22bd-466a-b8fb-24b3e3fd16d1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","https://support.office.com/en-us");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_Office_AllOfficeSupport");
        var el12 = dom.createTextNode("\n                                All Office support\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_5ab267ca-1a5b-4eae-993c-aab251a53939");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_ContactOfficeSalesSupport");
        var el11 = dom.createTextNode("\n                                Contact Office sales support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_77f03c44-ec4d-4966-b6e6-6fae36050b4c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.microsoft.com/ContactUs/TechnicalSupport?wa=wsignin1.0#gsproductselector/productid/505");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_Contact OfficeTechnicalSupport");
        var el11 = dom.createTextNode("\n                                Contact Office technical support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_108a2796-f4ff-4d25-88c7-77d9c65cd90b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/Office-2013-Quick-Start-Guides-4a8aa04a-f7f3-4a4d-823c-3dbc4b8672a1?WT.mc_id=OAN_ONESTORE-hplink-GS2013");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_GetStarted");
        var el11 = dom.createTextNode("\n                                Get started\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_b32ce54c-73ed-4539-9b6d-f4084b3d82ac");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://products.office.com/en-us/choose-valid-billing-market");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_DownloadBackupAndRestore");
        var el11 = dom.createTextNode("\n                                Download, backup, & restore\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_4c0fd1a0-3f17-4e2a-8f0b-accb6b405228");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/What-s-new-in-Word-2013-3a9a927f-73ad-4ac5-910b-dfb12052d063");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_WordHelp");
        var el11 = dom.createTextNode("\n                                Word help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_5594a5ff-9f8a-4d7b-baef-01bf55270e44");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/What-s-new-in-Outlook-2013-325ffe56-7b07-4ee7-8e64-b38bbbe4731");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_OutlookHelp");
        var el11 = dom.createTextNode("\n                                Outlook help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_91a2cde1-9d01-45fb-b2da-d061eff9e3bb");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/What-s-new-in-Excel-2013-1cbc42cd-bfaf-43d7-9031-5688ef1392fd");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_ExcelHelp");
        var el11 = dom.createTextNode("\n                                Excel help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/What-s-new-in-PowerPoint-2013-1c38822e-0284-4acb-8099-23dc6f3207c5");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_PowerPointHelp");
        var el11 = dom.createTextNode("\n                                PowerPoint help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/What-s-new-in-OneNote-2013-3e8da086-65a8-4972-b6b9-50879b3ce37e");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_OneNoteHelp");
        var el11 = dom.createTextNode("\n                                OneNote help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/What-s-new-in-Access-2013-0ab58e93-e020-4a9f-af6a-8ddb0c84455f");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_AccessHelp");
        var el11 = dom.createTextNode("\n                                Access help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.office.com/en-us/Article/What-s-new-in-Publisher-2013-8a665c00-8497-4f17-8e2a-8fca3da92683");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Office_PublisherHelp");
        var el11 = dom.createTextNode("\n                                Publisher help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-mscom-cyan   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_6f0cd786-0771-4a7c-ae93-82abe63e08fa");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Surface\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d6689b1e-3005-4d55-984b-4190894b583c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/Surface/en-us/support/");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_Surface_AllSurfaceSupport");
        var el12 = dom.createTextNode("\n                                All Surface support\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_00d36f78-3fbf-4a7e-84a4-f034724e9ce8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_Contact SurfaceSalesSupport");
        var el11 = dom.createTextNode("\n                                Contact Surface sales support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9424e04f-ed1d-415b-80dc-10cbfe4c380e");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/contact-us/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_ContactSurfaceTechnicalSupport");
        var el11 = dom.createTextNode("\n                                Contact Surface technical support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_0c4c5974-7b9b-4208-aea1-a7a668fea591");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/Surface/en-us/support/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_PopularSurfaceTopics");
        var el11 = dom.createTextNode("\n                                Popular Surface topics\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_fd57c563-e392-4816-93a8-f00290aef9ee");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/browse/surface-pro-3?category=getting-started");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_SurfacePro3");
        var el11 = dom.createTextNode("\n                                Surface Pro 3\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_0be2c066-f41b-4baa-8cd4-769e844401a0");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/browse/surface-2?category=getting-started");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_Surface2");
        var el11 = dom.createTextNode("\n                                Surface 2\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_57ef4ca3-60a1-4010-834c-33b98aab8a6a");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/browse/surface-pro-2?category=getting-started");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_SurfacePro2");
        var el11 = dom.createTextNode("\n                                Surface Pro 2\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3f820816-55cf-4c11-a9c3-cde649a6bb93");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/browse/surface-windows-8-pro?category=getting-started");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_SurfacePro");
        var el11 = dom.createTextNode("\n                                Surface Pro\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/browse/surface-with-windows-rt?category=getting-started");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_SurfaceRT");
        var el11 = dom.createTextNode("\n                                Surface RT\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/browse/covers-and-keyboard?category=touch");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_CoversAndKeyboards");
        var el11 = dom.createTextNode("\n                                Covers & keyboards\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/surface/en-us/support/browse/accessories?category=adapters");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Surface_Accessories");
        var el11 = dom.createTextNode("\n                                Accessories\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-green   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_3b37ae4b-aede-4ac8-bfa7-1ce55bf3747b");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Xbox\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a4fd3c6e-1113-46c8-9701-6f3edd3f367f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://support.xbox.com/en-us/");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_Xbox_AllXboxSupport");
        var el12 = dom.createTextNode("\n                                All Xbox support\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_77b7cdd7-8943-4b67-b6d5-00287956ac34");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_Contact XboxSalesSupport");
        var el11 = dom.createTextNode("\n                                Contact Xbox sales support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_c0c633fb-5758-48e6-ae80-23683b2d03d1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.xbox.com/en-us/contact-us");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_ContactXboxTechnicalSupport");
        var el11 = dom.createTextNode("\n                                Contact Xbox technical support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_bde788b6-5ea4-4bc6-a1e7-606ad0f77dc4");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.xbox.com/browse/xbox-one");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_XboxOneHelp");
        var el11 = dom.createTextNode("\n                                Xbox One help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_644e90cd-0c67-49f9-b06d-44d375f3d9a6");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.xbox.com/browse/xbox-360");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_Xbox360Help");
        var el11 = dom.createTextNode("\n                                Xbox 360 help\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8b0dee91-bd1d-43ab-95ab-a532f05c5db8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.xbox.com/browse/billing");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_Billing");
        var el11 = dom.createTextNode("\n                                Billing\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_c9e30ef9-9164-4eef-9df9-a63cb11b88c2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.xbox.com/browse/my-account");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_My account");
        var el11 = dom.createTextNode("\n                                My account\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_08167671-033e-44df-b05b-ef7045a957ab");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.xbox.com/browse/xbox-on-other-devices");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_XboxOnOtherDevices");
        var el11 = dom.createTextNode("\n                                Xbox on other devices\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.xbox.com/error-code-lookup");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_ErrorAndStatusCodeSearch");
        var el11 = dom.createTextNode("\n                                Error & status code search\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://myservice.xbox.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_Xbox_Repair");
        var el11 = dom.createTextNode("\n                                Repair\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-red   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_0b4798d2-b2c0-4a4e-97ca-742da54f2a5a");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Windows Phone\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f3eafd56-d191-4a0a-9ec3-3337dce547fb");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.windowsphone.com/en-us/how-to/wp8");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_WindowsPhone_AllWindowsPhoneSupport");
        var el12 = dom.createTextNode("\n                                All Windows Phone support\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8c6c5ef3-9978-474e-be88-5e8872f55088");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_Contact WindowsPhoneSalesSupport");
        var el11 = dom.createTextNode("\n                                Contact Windows Phone sales support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7059aa3a-18af-42b1-a1e3-91836553c130");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/How-to/wp-support");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_ContactWindowsPhoneTechnicalSupport");
        var el11 = dom.createTextNode("\n                                Contact Windows Phone technical support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9c218d92-41d4-4492-b518-28340d823ced");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/basics/get-started-with-windows-phone");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_GetStarted");
        var el11 = dom.createTextNode("\n                                Get started\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d4910c7f-2a3d-4b3a-9f3a-4b3da6e54045");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/mobile/support/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_LumiaPhoneSupport");
        var el11 = dom.createTextNode("\n                                Lumia Phone support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_7eeed518-6fcc-44e8-ab11-89251be733e9");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/accounts-and-billing/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_AccountsPlusBilling");
        var el11 = dom.createTextNode("\n                                Accounts + billing\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_cf9d3a95-991e-483d-b03b-5ed83627cedc");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-US/how-to/wp8/apps/get-apps-from-windows-phone-store");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_AppsAndStore");
        var el11 = dom.createTextNode("\n                                Apps & store\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_e109dd1d-f373-4df0-9d87-3b93487cfa91");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/calling-and-messaging/make-and-receive-phone-calls");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_CallingAndMessaging");
        var el11 = dom.createTextNode("\n                                Calling & messaging\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/connectivity/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_Connectivity");
        var el11 = dom.createTextNode("\n                                Connectivity\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/cortana/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_Cortana");
        var el11 = dom.createTextNode("\n                                Cortana\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/settings-and-personalization/accessibility-on-my-phone");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_SettingsAndPersonalization");
        var el11 = dom.createTextNode("\n                                Settings & personalization\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/email-and-calendar/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_EmailAndCalendar");
        var el11 = dom.createTextNode("\n                                Email & calendar\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/account");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_MicrosoftAccount");
        var el11 = dom.createTextNode("\n                                Microsoft account\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.windowsphone.com/en-us/how-to/wp8/music-and-videos/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_WindowsPhone_MusicAndVideos");
        var el11 = dom.createTextNode("\n                                Music & videos\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-mscom-cyan   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_8be750b8-c430-447d-8f1b-ebd6375446ae");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        By resource\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_b78b8221-72bd-42ad-ac55-ac408557cca1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_ByResource_MicrosoftStoreSupport");
        var el12 = dom.createTextNode("\n                                Microsoft Store support\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_0468ffe2-f7c2-4514-9bfd-ac724433fbae");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.microsoft.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ByResource_MicrosoftSupportHome");
        var el11 = dom.createTextNode("\n                                Microsoft Support Home\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_78a69e4c-0a49-4d71-9959-b74f1cc5e2c9");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/download/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ByResource_DownloadCenter");
        var el11 = dom.createTextNode("\n                                Download Center\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8b8cc7fd-9a87-4fe2-a38e-e461fcddc7bd");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.microsoft.com/contactus/?ws=support&SegNo=2");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ByResource_CallOrChatWithAnswerDesk");
        var el11 = dom.createTextNode("\n                                Call or chat with Answer Desk\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_9aa23692-93f9-47b3-9b2f-f8c72dcfcf54");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://answers.microsoft.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ByResource_AskTheExperts");
        var el11 = dom.createTextNode("\n                                Ask the experts\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-core-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_eb572056-b0f9-494b-aff4-3f84bf3e382d");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Security & updates\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_0705eff8-325f-470c-9b7d-b6bfaaeae187");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/security/default.aspx");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_SecurityAndUpdates_SecurityHome");
        var el12 = dom.createTextNode("\n                                Security Home\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_f592f51f-5c62-4f73-b910-7a8c4e781b18");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-US/windows/products/security-essentials");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SecurityAndUpdates_MicrosoftSecurityEssentials");
        var el11 = dom.createTextNode("\n                                Microsoft Security Essentials\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_88d2cd3e-0595-439b-98ce-fcb6ec379a76");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/service-packs-download");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SecurityAndUpdates_WindowsUpdateServicePacksAndFxes");
        var el11 = dom.createTextNode("\n                                Windows Update: service packs & fixes\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-orange   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_4f743f6b-3dd9-4121-bccc-a09fb3e9cf5b");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Popular topics\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2a7fa762-07fc-4984-9507-7757bfc881f8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoft.com/en-us/search/results.aspx?q=error%20messages");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_PopularTopics_ErrorMessages");
        var el12 = dom.createTextNode("\n                                Error messages\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_480b6860-3c28-4e28-bfa2-db7865b0edbc");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/install-upgrade-activate-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_PopularTopics_InstallUpgradeAndActivateWindows");
        var el11 = dom.createTextNode("\n                                Install, upgrade, & activate (Windows)\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_bd94393e-e7ab-46aa-b34a-d400efd0424f");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://windows.microsoft.com/en-us/windows/devices-drivers-help");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_PopularTopics_DriversSoundPrinterUSBMore");
        var el11 = dom.createTextNode("\n                                Drivers (sound, printer, USB, more)\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_d4b1cde9-2da0-41d4-ad21-34047171234d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/hardware/en-us/downloads");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_PopularTopics_MicrosoftHardwareDriver");
        var el11 = dom.createTextNode("\n                                Microsoft Hardware driver\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a05e7eee-f9ff-4256-a8fa-1cafc209e8d2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoft.com/en-us/download/default.aspx");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_PopularTopics_DownloadCenter");
        var el11 = dom.createTextNode("\n                                Download Center\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-purple   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_043ff5e3-1992-4cd6-bb3d-963fc226c80c");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Sales & orders\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_906f4c41-b439-4f9b-be65-1a4687f9f3eb");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpPage/");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_SalesAndOrders_AllSalesAndOrders");
        var el12 = dom.createTextNode("\n                                All sales & orders\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a6c98d33-9b2b-4f96-966a-d761daf0651c");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_ContactMicrosoftStoreSupport");
        var el11 = dom.createTextNode("\n                                Contact Microsoft Store support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2f0733f3-88f0-4f3d-ab5a-53e198ea1800");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpOrdersShippingPage");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_OrdersAndShipping");
        var el11 = dom.createTextNode("\n                                Orders & shipping\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_08325990-20ba-4ce5-b6c9-198d7f50ef2b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpSoftwareDownloadsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_DownloadInstructions");
        var el11 = dom.createTextNode("\n                                Download instructions\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_bc0f9d5d-0012-46ad-bbe2-926498b91217");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpReturnsRefundsPage");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_RefundReturns");
        var el11 = dom.createTextNode("\n                                Refund/Returns\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a5b8c888-0989-42df-b111-aacd745a6ec9");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpTechnicalSupportPage");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_TechnicalSupport");
        var el11 = dom.createTextNode("\n                                Technical support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_eb354ae2-b906-4904-b2b7-4b1a418e82a5");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpFAQPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_FAQs");
        var el11 = dom.createTextNode("\n                                FAQs\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_3de4c3fe-7d76-4b21-b855-53213349a791");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://answerdesk.microsoftstore.com/msusa/en-us/answerdesk");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_OnlineServices");
        var el11 = dom.createTextNode("\n                                Online services\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list shell-header-dropdown-tab-list-2");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://content.microsoftstore.com/answerdesk");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_InStoreServices");
        var el11 = dom.createTextNode("\n                                In-Store services\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://answerdesk.microsoftstore.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_SalesAndOrders_AnswerDesk");
        var el11 = dom.createTextNode("\n                                Answer Desk\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dl");
        dom.setAttribute(el6,"class","shell-header-dropdown-tab accent-darker-green   ");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dt");
        dom.setAttribute(el7,"id","shellmenu_84311e5b-b592-4724-ab4e-a47739d3a6e6");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-label");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","javascript:void(0)");
        dom.setAttribute(el8,"role","menuitem");
        dom.setAttribute(el8,"data-bi-dnt","");
        var el9 = dom.createTextNode("\n                        Contact us\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("dd");
        dom.setAttribute(el7,"class","shell-header-dropdown-tab-content");
        dom.setAttribute(el7,"data-col","0");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-list ");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_007ad0b4-eb5b-4d65-b28a-1262bdf17949");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h3");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("a");
        dom.setAttribute(el11,"href","http://support.microsoft.com/contactus/?ln=en-us");
        dom.setAttribute(el11,"role","menuitem");
        dom.setAttribute(el11,"data-bi-name","Support_ContactUs_ContactUs");
        var el12 = dom.createTextNode("\n                                Contact us\n                            ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_270d9c00-5e32-456b-b473-f27a3d31935d");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ContactUs_SalesAndSupport");
        var el11 = dom.createTextNode("\n                                Sales & support\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2e4186d6-9ad9-4ab6-a145-4d32d980e1a8");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://www.microsoft.com/en-us/store/locations/find-a-store");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ContactUs_RetailStores");
        var el11 = dom.createTextNode("\n                                Retail stores\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_98c50095-5ee5-4356-b59d-979e84d9be31");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.microsoft.com/contactus/?ln=en-us&ws=support&SegNo=2");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ContactUs_GeneralInquiries");
        var el11 = dom.createTextNode("\n                                General inquiries\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_a8b041ed-d296-4eb5-a81f-73d12374261b");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://support.microsoft.com/gp/customer-service-phone-numbers/en-us");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ContactUs_ContactCustomerServiceWorldwide");
        var el11 = dom.createTextNode("\n                                Contact customer service worldwide\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_2e464593-6fff-443d-8216-0a48fd4681da");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://answers.microsoft.com/");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ContactUs_MicrosoftCommunityForums");
        var el11 = dom.createTextNode("\n                                Microsoft Community forums\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","shellmenu_8a546daa-fda1-4b03-8f38-e1c6e36c09ba");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://support.microsoft.com/contactus/emailcontact.aspx?scid=sw;en;1310&ws=1prcen");
        dom.setAttribute(el10,"role","menuitem");
        dom.setAttribute(el10,"data-bi-name","Support_ContactUs_PrivacyFeedback");
        var el11 = dom.createTextNode("\n                                Privacy feedback\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.microsoftstore.com/store/msusa/en_US/DisplayHelpContactUsPage/");
        dom.setAttribute(el8,"class","shell-header-dropdown-tab-img");
        dom.setAttribute(el8,"data-bi-name","Support_ContactUs_TabImage");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"data-src","https://compass-ssl.microsoft.com/assets/92/b4/92b4fbeb-f818-4ab5-a5a7-e5e3053ce2f4.png?n=Contact_Us.png");
        dom.setAttribute(el9,"alt","");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h4");
        var el10 = dom.createTextNode("Contact sales and customer support");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        var el10 = dom.createTextNode("Available 24/7");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/partials/pdp/-ratings', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","grid fixed");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("section");
        dom.setAttribute(el2,"class","section");
        dom.setAttribute(el2,"id","ratings-reviews");
        dom.setAttribute(el2,"data-bi-area","RatingsReviews");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"data-bi-name","Ratings");
        dom.setAttribute(el3,"data-bi-slot","1");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("header");
        dom.setAttribute(el4,"class","srv_ratings section-header row");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("h3");
        dom.setAttribute(el5,"class","section-title col-1-1");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","https://onestore.dev.microsoft.com/en-us/store/apps/netflix/9wzdncrfj3tj#ratings-reviews");
        var el7 = dom.createTextNode("Ratings and reviews");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            \n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","row row-sm");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","col-1-2");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","panel win-panel-clean");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-heading");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","panel-title body-tight-2");
        var el9 = dom.createTextNode("Average customer rating");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-body");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","srv_ratingsScore win-rating-average");
        var el10 = dom.createTextNode("3.8");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","srv_ratingsStars rating-stars");
        var el10 = dom.createTextNode("\n                                    \n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    \n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 76%");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","win-rating-total");
        var el10 = dom.createTextNode("176,653 ratings");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","col-1-2");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","panel win-panel-clean");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-heading");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","panel-title body-tight-2");
        var el9 = dom.createTextNode("Rating snapshot");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-body");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ol");
        dom.setAttribute(el8,"class","srv_ratingsHistogram win-rating-histogram");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                                    \n                                    5 ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-star");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","progress progress-sm");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","progress-bar");
        dom.setAttribute(el11,"role","progressbar");
        dom.setAttribute(el11,"aria-valuenow","49");
        dom.setAttribute(el11,"aria-valuemin","0");
        dom.setAttribute(el11,"aria-valuemax","100");
        dom.setAttribute(el11,"style","width: 49%;");
        var el12 = dom.createElement("span");
        dom.setAttribute(el12,"class","sr-only");
        var el13 = dom.createTextNode("49%");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    88,178\n                                    \n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                                    \n                                    4 ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-star");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","progress progress-sm");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","progress-bar");
        dom.setAttribute(el11,"role","progressbar");
        dom.setAttribute(el11,"aria-valuenow","17");
        dom.setAttribute(el11,"aria-valuemin","0");
        dom.setAttribute(el11,"aria-valuemax","100");
        dom.setAttribute(el11,"style","width: 17%;");
        var el12 = dom.createElement("span");
        dom.setAttribute(el12,"class","sr-only");
        var el13 = dom.createTextNode("17%");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    30,705\n                                    \n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                                    \n                                    3 ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-star");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","progress progress-sm");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","progress-bar");
        dom.setAttribute(el11,"role","progressbar");
        dom.setAttribute(el11,"aria-valuenow","10");
        dom.setAttribute(el11,"aria-valuemin","0");
        dom.setAttribute(el11,"aria-valuemax","100");
        dom.setAttribute(el11,"style","width: 10%;");
        var el12 = dom.createElement("span");
        dom.setAttribute(el12,"class","sr-only");
        var el13 = dom.createTextNode("10%");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    18,275\n                                    \n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                                    \n                                    2 ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-star");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","progress progress-sm");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","progress-bar");
        dom.setAttribute(el11,"role","progressbar");
        dom.setAttribute(el11,"aria-valuenow","10");
        dom.setAttribute(el11,"aria-valuemin","0");
        dom.setAttribute(el11,"aria-valuemax","100");
        dom.setAttribute(el11,"style","width: 10%;");
        var el12 = dom.createElement("span");
        dom.setAttribute(el12,"class","sr-only");
        var el13 = dom.createTextNode("10%");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    18,879\n                                    \n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createTextNode("\n                                    \n                                    1 ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-star");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","progress progress-sm");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","progress-bar");
        dom.setAttribute(el11,"role","progressbar");
        dom.setAttribute(el11,"aria-valuenow","11");
        dom.setAttribute(el11,"aria-valuemin","0");
        dom.setAttribute(el11,"aria-valuemax","100");
        dom.setAttribute(el11,"style","width: 11%;");
        var el12 = dom.createElement("span");
        dom.setAttribute(el12,"class","sr-only");
        var el13 = dom.createTextNode("11%");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    20,545\n                                    \n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"data-bi-name","Reviews");
        dom.setAttribute(el3,"data-bi-slot","2");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","section-body row");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","col-1-1");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6,"class","btn btn-primary btn-lg");
        dom.setAttribute(el6,"data-toggle","collapse");
        dom.setAttribute(el6,"data-target","#reviewsPagingSection");
        dom.setAttribute(el6,"aria-expanded","true");
        dom.setAttribute(el6,"aria-controls","reviewsPagingSection");
        dom.setAttribute(el6,"data-bi-name","ShowHideReviews");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7,"class","win-button-label-expanded");
        var el8 = dom.createTextNode("\n                        Hide review(s)\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8,"class","icon-chevron-up");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7,"class","win-button-label-collapsed");
        var el8 = dom.createTextNode("\n                        Show review(s)\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8,"class","icon-chevron-down");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","row");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","col-1-1");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"id","ReviewsTop");
        dom.setAttribute(el6,"data-bi-name","ReviewsTop");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"id","reviewsPagingSection");
        dom.setAttribute(el6,"class","panel win-panel-clean collapse in");
        dom.setAttribute(el6,"data-page-size","10");
        dom.setAttribute(el6,"data-max-items","19148");
        dom.setAttribute(el6,"data-service-url","/en-us/store/webapi/reviews?language=en-us&market=us&productId=9wzdncrfj3tj");
        dom.setAttribute(el6,"data-item-range-description-format","{startingIndex}-{endingIndex} of {maxItems} reviews");
        dom.setAttribute(el6,"aria-expanded","true");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-heading");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("p");
        dom.setAttribute(el8,"class","pull-left itemRangeDescription");
        var el9 = dom.createTextNode("\n                                1-10 of 19148 reviews\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        \n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","srv_reviews panel-body");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 20%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    casey · 1/15/2015\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        It's doesn't work for my phone. It's a Nokia Android that has Cortina. I type my password and username name still had a problem shooting the movie.\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (1)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 80%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    crystal · 12/27/2012\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        var el11 = dom.createTextNode("update is sometimes there if you go download app");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        update is there after install another app\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 100%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    Barbara · 7/7/2013\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        var el11 = dom.createTextNode("wild at heart");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        this is a great series for anyone that likes animals and Africa. It has some very funny and sad parts. It's about a family  that moves to Africa and opens a vet hospital. I would rate it 5 stars\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 100%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    chase · 4/19/2013\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        Love it!!\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 100%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    joel · 11/10/2013\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        var el11 = dom.createTextNode("joelamezquita68@yahoo.com");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        mis3lobosviejon\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 20%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    Raul · 2/2/2015\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        Can not sign in.  Bull s#it app\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 40%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    Joshua · 6/29/2013\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        var el11 = dom.createTextNode("love Netflix");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        love having Netflix, but for some reason it keeps locking up now on my laptop. can watch a few minutes of a show and the the picture freezes, the sound continues for a second or two, then it goes to a blue screen and I have to close it out.\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 40%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    Lincoln · 1/13/2015\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        Like the updated UI, but lags after 5-20 minutes of streaming on the Lumia 521...:(\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 60%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    Daniel · 1/7/2015\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        On the Lumia 935. Closed captioning works when it wants to, and even then it works for a sentence and then no more after that. Also videos cut out after about 5 minutes 35 seconds of play time to about 8 minutes. Then super long buffering or backing out and replaying from where you left off. Works, not too well.\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","panel win-panel-line");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-heading");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating rating-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("div");
        dom.setAttribute(el11,"class","rating");
        var el12 = dom.createTextNode("\n                                            ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("div");
        dom.setAttribute(el12,"class","rating-stars");
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-background");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                                \n                                                ");
        dom.appendChild(el12, el13);
        var el13 = dom.createElement("ul");
        dom.setAttribute(el13,"class","rating-stars-value");
        dom.setAttribute(el13,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el13,"style","width: 20%");
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                    ");
        dom.appendChild(el13, el14);
        var el14 = dom.createElement("li");
        var el15 = dom.createElement("i");
        dom.setAttribute(el15,"class","icon-star");
        dom.appendChild(el14, el15);
        dom.appendChild(el13, el14);
        var el14 = dom.createTextNode("\n                                                ");
        dom.appendChild(el13, el14);
        dom.appendChild(el12, el13);
        var el13 = dom.createTextNode("\n                                            ");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                    Joseph · 12/3/2014\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("h5");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-body");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("p");
        dom.setAttribute(el10,"class","has-newline");
        var el11 = dom.createTextNode("\n                                        Sucks.  Unable to contact configuration server.\n                                        \n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","panel-footer");
        var el10 = dom.createTextNode("\n                                    Was this helpful?\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","list-inline");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            Yes (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            No (0)\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createTextNode("\n                                            \n                                        ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        \n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","reviews cli_reviews panel-body");
        dom.setAttribute(el7,"data-bind","foreach: items");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-footer");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("p");
        dom.setAttribute(el8,"class","pull-left itemRangeDescription");
        var el9 = dom.createTextNode("1-10 of 19148 reviews");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8,"class","pager pull-right");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","reviewsPagePrevious");
        dom.setAttribute(el9,"class","disabled");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://onestore.dev.microsoft.com/en-us/store/apps/netflix/9wzdncrfj3tj#ReviewsTop");
        dom.setAttribute(el10,"id","reviewsPagePreviousAnchor");
        dom.setAttribute(el10,"title","Previous");
        dom.setAttribute(el10,"data-bi-name","PreviousSetOfReviews");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("i");
        dom.setAttribute(el11,"class"," icon-chevron-left");
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("span");
        dom.setAttribute(el11,"class","sr-only");
        var el12 = dom.createTextNode("Previous");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        dom.setAttribute(el9,"id","reviewsPageNext");
        dom.setAttribute(el9,"href","#ReviewsTop");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","https://onestore.dev.microsoft.com/en-us/store/apps/netflix/9wzdncrfj3tj#ReviewsTop");
        dom.setAttribute(el10,"id","reviewsPageNextAnchor");
        dom.setAttribute(el10,"title","Next");
        dom.setAttribute(el10,"data-bi-name","NextSetOfReviews");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("span");
        dom.setAttribute(el11,"class","sr-only");
        var el12 = dom.createTextNode("Next");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("i");
        dom.setAttribute(el11,"class","icon-chevron-right");
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/partials/pdp/-relatedapps', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("section");
        dom.setAttribute(el1,"class","grid fixed section ");
        dom.setAttribute(el1,"data-bind","visible: items().length  > 0");
        dom.setAttribute(el1,"data-bi-area","Reco_Related_apps");
        dom.setAttribute(el1,"data-bi-view","1rowX14col");
        dom.setAttribute(el1,"data-bi-source","DisplayCatalog");
        dom.setAttribute(el1,"data-bi-type","4");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("header");
        dom.setAttribute(el2,"class","section-header row");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("h2");
        dom.setAttribute(el3,"class","section-title col-1-1");
        var el4 = dom.createTextNode("Related apps");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","section-header-aside");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","section-header-arrows");
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","button");
        dom.setAttribute(el5,"data-role","none");
        dom.setAttribute(el5,"class","slick-prev slick-disabled");
        dom.setAttribute(el5,"style","display: inline-block;");
        var el6 = dom.createTextNode("Previous");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("button");
        dom.setAttribute(el5,"type","button");
        dom.setAttribute(el5,"data-role","none");
        dom.setAttribute(el5,"class","slick-next");
        dom.setAttribute(el5,"style","display: inline-block;");
        var el6 = dom.createTextNode("Next");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n        ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"data-bind","foreach: items");
        dom.setAttribute(el2,"class","section-carousel carousel-8 slick-initialized slick-slider");
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","slick-list draggable");
        dom.setAttribute(el3,"tabindex","0");
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","slick-track");
        dom.setAttribute(el4,"style","opacity: 1; width: 2100px; transform: translate3d(0px, 0px, 0px);");
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Zappos.com");
        dom.setAttribute(el5,"data-bi-slot","0");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ074");
        dom.setAttribute(el5,"index","0");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/zapposcom/9wzdncrfj074");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Zappos.com");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.50516.9007199266249313.5e977994-df4c-4925-a75e-eb4c4cc6fa70.92dc0704-100c-4ad8-a4db-2d01b2b1b48f");
        dom.setAttribute(el9,"style","background-color: #7299C6");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/zapposcom/9wzdncrfj074");
        var el10 = dom.createTextNode("Zappos.com");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    \n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n                            \n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                            \n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 70%");
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(444)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","mobile.HD Media Player");
        dom.setAttribute(el5,"data-bi-slot","1");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ088");
        dom.setAttribute(el5,"index","1");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/mobilehd-media-player/9wzdncrfj088");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","mobile.HD Media Player");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.62785.9007199266249295.e35d1e31-21a3-45ba-bc5b-7f4e958fde25.cc0668bd-da07-47c9-bdd2-a22b004fd32d");
        dom.setAttribute(el9,"style","background-color: #aa0c70");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/mobilehd-media-player/9wzdncrfj088");
        var el10 = dom.createTextNode("mobile.HD Media Player");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                \n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("$3.49");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n                        \n                        ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        \n                        ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 70%");
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                    ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(454)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Nextgen Reader");
        dom.setAttribute(el5,"data-bi-slot","2");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ262");
        dom.setAttribute(el5,"index","2");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/nextgen-reader/9wzdncrfj262");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Nextgen Reader");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.37575.9007199266242697.48431558-4686-49c0-b87d-447191c07e56.29c70dc1-0806-4e14-b37a-8e89ab0532d9");
        dom.setAttribute(el9,"style","background-color: #008299");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/nextgen-reader/9wzdncrfj262");
        var el10 = dom.createTextNode("Nextgen Reader");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("   \n            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n            \n            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("$2.99");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n                    \n                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                    \n                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 92%");
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(4,602)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n        ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n    ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Engadget");
        dom.setAttribute(el5,"data-bi-slot","4");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFHW2R");
        dom.setAttribute(el5,"index","3");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/engadget/9wzdncrfhw2r");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Engadget");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.30544.9007199266248336.9bea54a2-4b39-4a61-9bc3-0273d118fd52.02338b2c-c916-479e-b1e2-44768cd5c042");
        dom.setAttribute(el9,"style","background-color: #1e82ad");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/engadget/9wzdncrfhw2r");
        var el10 = dom.createTextNode("Engadget");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n        \n        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n                \n                ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                \n                ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 54%");
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n            ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(471)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","RBC Canada");
        dom.setAttribute(el5,"data-bi-slot","5");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ9WD");
        dom.setAttribute(el5,"index","4");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/rbc-canada/9wzdncrfj9wd");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","RBC Canada");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.49084.9007199266251885.3a5f203a-7d54-4f3d-bbc6-54c607fb28b9.bdddeacb-9ab6-451e-8869-ce4a75c7185c");
        dom.setAttribute(el9,"style","background-color: #2B4174");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/rbc-canada/9wzdncrfj9wd");
        var el10 = dom.createTextNode("RBC Canada");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n            \n            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n            \n            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 40%");
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(6)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Bookviser Reader");
        dom.setAttribute(el5,"data-bi-slot","6");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ02G");
        dom.setAttribute(el5,"index","5");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/bookviser-reader/9wzdncrfj02g");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Bookviser Reader");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.35258.9007199266249501.2ee7d9dd-abb2-46e6-9535-0e85f86191e3.6cb68702-3e57-4c5c-b7ad-82bcebad2c17");
        dom.setAttribute(el9,"style","background-color: #95c142");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/bookviser-reader/9wzdncrfj02g");
        var el10 = dom.createTextNode("Bookviser Reader");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n        \n        ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n        \n        ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 86.00001%");
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n            ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n    ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(1,861)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","The Weather Channel");
        dom.setAttribute(el5,"data-bi-slot","7");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFHWSD");
        dom.setAttribute(el5,"index","6");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/the-weather-channel/9wzdncrfhwsd");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n    ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","The Weather Channel");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.9017.9007199266247655.0c7193b7-817d-4d8a-8d3d-c7395a221e39.a97f97ad-6df0-4841-a71b-b8f34754de69");
        dom.setAttribute(el9,"style","background-color: #2D4FCE");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/the-weather-channel/9wzdncrfhwsd");
        var el10 = dom.createTextNode("The Weather Channel");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 72%");
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(16,353)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide slick-active");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Lenovo QuickCast");
        dom.setAttribute(el5,"data-bi-slot","8");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ4MW");
        dom.setAttribute(el5,"index","7");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/lenovo-quickcast/9wzdncrfj4mw");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Lenovo QuickCast");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.40444.9007199266245618.2232af3b-561a-45fa-a536-6f761d3a368b.32f049c1-d351-403d-83de-054141630dc4");
        dom.setAttribute(el9,"style","background-color: #585858");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/lenovo-quickcast/9wzdncrfj4mw");
        var el10 = dom.createTextNode("Lenovo QuickCast");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 78%");
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(14)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","WWE");
        dom.setAttribute(el5,"data-bi-slot","10");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFHZVZ");
        dom.setAttribute(el5,"index","8");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/wwe/9wzdncrfhzvz");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","WWE");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.54867.9007199266248882.588f5c63-bbd5-4a27-953c-465cd749a40a.cabdd30a-3e3a-4fd4-8d50-3863e40be0eb");
        dom.setAttribute(el9,"style","background-color: #222222");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/wwe/9wzdncrfhzvz");
        var el10 = dom.createTextNode("WWE");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 78%");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(1,345)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Endomondo");
        dom.setAttribute(el5,"data-bi-slot","11");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ9WK");
        dom.setAttribute(el5,"index","9");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/endomondo/9wzdncrfj9wk");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Endomondo");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.5287.9007199266251880.cefed4e4-6643-4f2a-a5f5-8c3f6795714a.6287007a-ffd2-42f4-9f4c-ae161bc706fe");
        dom.setAttribute(el9,"style","background-color: #62a101");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/endomondo/9wzdncrfj9wk");
        var el10 = dom.createTextNode("Endomondo");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 68%");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(148)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","RMS Viewer");
        dom.setAttribute(el5,"data-bi-slot","12");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJCC4");
        dom.setAttribute(el5,"index","10");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/rms-viewer/9wzdncrfjcc4");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","RMS Viewer");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.42826.9007199266251597.4c011af0-46e7-4951-a1ce-3ef1395d7738.d21710de-cb62-4b79-b281-178f29689b53");
        dom.setAttribute(el9,"style","background-color: #2C619C");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/rms-viewer/9wzdncrfjcc4");
        var el10 = dom.createTextNode("RMS Viewer");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 52%");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(160)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Nick");
        dom.setAttribute(el5,"data-bi-slot","13");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFHVNC");
        dom.setAttribute(el5,"index","11");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/nick/9wzdncrfhvnc");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Nick");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.62554.9007199266248676.82af975d-7358-432d-a6a9-176162b96fb7.9c820fa5-0d0d-49ba-9ad5-5375cdd27eba");
        dom.setAttribute(el9,"style","background-color: #FFFFFF");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/nick/9wzdncrfhvnc");
        var el10 = dom.createTextNode("Nick");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 74%");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(3,422)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Tube Player");
        dom.setAttribute(el5,"data-bi-slot","14");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJCB2");
        dom.setAttribute(el5,"index","12");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/tube-player/9wzdncrfjcb2");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Tube Player");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.3313.9007199266251629.73a6ab6a-a456-4db8-aecd-074b0aad61b2.1d2711ec-5dfc-4a99-96a3-3bd68fe2da38");
        dom.setAttribute(el9,"style","background-color: #A82400");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/tube-player/9wzdncrfjcb2");
        var el10 = dom.createTextNode("Tube Player");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 72%");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(14)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","slide slick-slide");
        dom.setAttribute(el5,"data-bind","attr: {'data-bi-name': Title, 'data-bi-slot': index, 'data-bi-id': Id}");
        dom.setAttribute(el5,"data-bi-name","Great British Chefs");
        dom.setAttribute(el5,"data-bi-slot","15");
        dom.setAttribute(el5,"data-bi-id","9WZDNCRFJ35H");
        dom.setAttribute(el5,"index","13");
        dom.setAttribute(el5,"style","width: 150px;");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("figure");
        dom.setAttribute(el6,"class","media");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","media-img ratio-1-1");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/great-british-chefs/9wzdncrfj35h");
        dom.setAttribute(el8,"data-bind","attr: { href: Target }");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image");
        dom.setAttribute(el9,"data-bind","attr: { src: Image.ImageUri }, style: { backgroundColor: Image.BgColor }");
        dom.setAttribute(el9,"alt","Great British Chefs");
        dom.setAttribute(el9,"src","//store-images.microsoft.com/image/apps.11605.9007199266245638.f878538b-a6cf-414e-86fc-3cc41735e892.12ee423f-d6ab-4902-83b7-495f1a29b16f");
        dom.setAttribute(el9,"style","background-color: #000000");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("figcaption");
        dom.setAttribute(el7,"class","media-caption");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","media-header media-header-clamp-2");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"class","item-block");
        dom.setAttribute(el9,"data-bind","text: Title, attr: { href: Target }");
        dom.setAttribute(el9,"href","https://onestore.dev.microsoft.com/en-us/store/apps/great-british-chefs/9wzdncrfj35h");
        var el10 = dom.createTextNode("Great British Chefs");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-subheader");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","media-price");
        var el9 = dom.createTextNode("Free");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","rating");
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating-stars");
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-background");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","rating-stars-value");
        dom.setAttribute(el10,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el10,"style","width: 86.00001%");
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","icon-star");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","rating-numbers");
        var el10 = dom.createTextNode("(224)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/partials/store/-categories', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","s-col-12-24 m-col-8-24 l-col-5-24 hidden-xs");
        var el2 = dom.createTextNode("\n            ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","srv_drillin-section section grid fixed");
        dom.setAttribute(el2,"id","Browse");
        var el3 = dom.createTextNode("\n                ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","srv_refine-list refine-list");
        var el4 = dom.createTextNode("\n                    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","refine-list-title h2");
        var el5 = dom.createTextNode("\n                        Refine results\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","srv_XsRefineClose pull-right visible-xs btn btn-default");
        var el6 = dom.createTextNode("X");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n                    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","refine-list-clear");
        var el5 = dom.createTextNode("\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("a");
        dom.setAttribute(el5,"href","./appicons/Category Drill-In.html");
        dom.setAttribute(el5,"data-bi-name","RefineListClear");
        var el6 = dom.createTextNode("Clear filters");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n                    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","panel");
        var el5 = dom.createTextNode("\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","panel-heading");
        dom.setAttribute(el5,"role","tab");
        dom.setAttribute(el5,"id","refine-list-heading-0-0");
        var el6 = dom.createTextNode("\n                            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("h4");
        dom.setAttribute(el6,"class","panel-title");
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"data-toggle","collapse");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#refine-list-0-0");
        dom.setAttribute(el7,"aria-expanded","true");
        dom.setAttribute(el7,"aria-controls","refine-list-0-0");
        dom.setAttribute(el7,"data-bi-name","Cat0");
        dom.setAttribute(el7,"data-bi-slot","1");
        var el8 = dom.createTextNode("\n                                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8,"class","icon-expand");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8,"class","icon-collapse");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                                Category\n                            ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","panel-footer");
        var el6 = dom.createTextNode("\n                            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#");
        var el7 = dom.createTextNode("Business");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"id","refine-list-0-0");
        dom.setAttribute(el5,"class","panel-collapse collapse in");
        dom.setAttribute(el5,"role","tabpanel");
        dom.setAttribute(el5,"aria-labelledby","refine-list-heading-0-0");
        dom.setAttribute(el5,"aria-expanded","true");
        var el6 = dom.createTextNode("\n                            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","list-group");
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/books%20-%20reference?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Books & reference");
        dom.setAttribute(el7,"data-bi-slot","0");
        var el8 = dom.createTextNode("Books & reference");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","./appicons/Category Drill-In.html");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Business");
        dom.setAttribute(el7,"data-bi-slot","1");
        var el8 = dom.createTextNode("Business");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/developer%20tools?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Developer tools");
        dom.setAttribute(el7,"data-bi-slot","2");
        var el8 = dom.createTextNode("Developer tools");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/education?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Education");
        dom.setAttribute(el7,"data-bi-slot","3");
        var el8 = dom.createTextNode("Education");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/entertainment?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Entertainment");
        dom.setAttribute(el7,"data-bi-slot","4");
        var el8 = dom.createTextNode("Entertainment");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/government%20-%20politics?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Government & politics");
        dom.setAttribute(el7,"data-bi-slot","5");
        var el8 = dom.createTextNode("Government & politics");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/health%20-%20fitness?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Health & fitness");
        dom.setAttribute(el7,"data-bi-slot","6");
        var el8 = dom.createTextNode("Health & fitness");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/kids%20-%20family?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Kids & family");
        dom.setAttribute(el7,"data-bi-slot","7");
        var el8 = dom.createTextNode("Kids & family");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/lifestyle?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Lifestyle");
        dom.setAttribute(el7,"data-bi-slot","8");
        var el8 = dom.createTextNode("Lifestyle");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/food%20-%20dining?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Food & dining");
        dom.setAttribute(el7,"data-bi-slot","9");
        var el8 = dom.createTextNode("Food & dining");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/multimedia%20design?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Multimedia design");
        dom.setAttribute(el7,"data-bi-slot","10");
        var el8 = dom.createTextNode("Multimedia design");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/medical?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Medical");
        dom.setAttribute(el7,"data-bi-slot","11");
        var el8 = dom.createTextNode("Medical");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/navigation%20-%20maps?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Navigation & maps");
        dom.setAttribute(el7,"data-bi-slot","12");
        var el8 = dom.createTextNode("Navigation & maps");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/news%20-%20weather?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","News & weather");
        dom.setAttribute(el7,"data-bi-slot","13");
        var el8 = dom.createTextNode("News & weather");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/personal%20finance?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Personal Finance");
        dom.setAttribute(el7,"data-bi-slot","14");
        var el8 = dom.createTextNode("Personal finance");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/personalization?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Personalization");
        dom.setAttribute(el7,"data-bi-slot","15");
        var el8 = dom.createTextNode("Personalisation");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/photo%20-%20video?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Photo & video");
        dom.setAttribute(el7,"data-bi-slot","16");
        var el8 = dom.createTextNode("Photo & video");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/productivity?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Productivity");
        dom.setAttribute(el7,"data-bi-slot","17");
        var el8 = dom.createTextNode("Productivity");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/security?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Security");
        dom.setAttribute(el7,"data-bi-slot","18");
        var el8 = dom.createTextNode("Security");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/shopping?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Shopping");
        dom.setAttribute(el7,"data-bi-slot","19");
        var el8 = dom.createTextNode("Shopping");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/social?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Social");
        dom.setAttribute(el7,"data-bi-slot","20");
        var el8 = dom.createTextNode("Social");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/travel?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Travel");
        dom.setAttribute(el7,"data-bi-slot","21");
        var el8 = dom.createTextNode("Travel");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/utilities%20-%20tools?rank=ProductSearchApps");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Utilities & tools");
        dom.setAttribute(el7,"data-bi-slot","22");
        var el8 = dom.createTextNode("Utilities & tools");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n                    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","panel");
        var el5 = dom.createTextNode("\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","panel-heading");
        dom.setAttribute(el5,"role","tab");
        dom.setAttribute(el5,"id","refine-list-heading-1-0");
        var el6 = dom.createTextNode("\n                            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("h4");
        dom.setAttribute(el6,"class","panel-title");
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"data-toggle","collapse");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#refine-list-1-0");
        dom.setAttribute(el7,"aria-expanded","true");
        dom.setAttribute(el7,"aria-controls","refine-list-1-0");
        dom.setAttribute(el7,"data-bi-name","Cat1");
        dom.setAttribute(el7,"data-bi-slot","2");
        var el8 = dom.createTextNode("\n                                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8,"class","icon-expand");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8,"class","icon-collapse");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                                Subcategory\n                            ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","panel-footer");
        var el6 = dom.createTextNode("\n                            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#");
        var el7 = dom.createTextNode("All");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"id","refine-list-1-0");
        dom.setAttribute(el5,"class","panel-collapse collapse in");
        dom.setAttribute(el5,"role","tabpanel");
        dom.setAttribute(el5,"aria-labelledby","refine-list-heading-1-0");
        dom.setAttribute(el5,"aria-expanded","true");
        var el6 = dom.createTextNode("\n                            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","list-group");
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","./appicons/Category Drill-In.html");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","All");
        dom.setAttribute(el7,"data-bi-slot","0");
        var el8 = dom.createTextNode("All");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=accounting%20-%20finance");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Accounting & finance");
        dom.setAttribute(el7,"data-bi-slot","1");
        var el8 = dom.createTextNode("Accounting & finance");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=collaboration");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Collaboration");
        dom.setAttribute(el7,"data-bi-slot","2");
        var el8 = dom.createTextNode("Collaboration");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=crm");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","CRM");
        dom.setAttribute(el7,"data-bi-slot","3");
        var el8 = dom.createTextNode("CRM");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=data%20-%20analytics");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Data & analytics");
        dom.setAttribute(el7,"data-bi-slot","4");
        var el8 = dom.createTextNode("Data & analytics");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=file%20management");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","File management");
        dom.setAttribute(el7,"data-bi-slot","5");
        var el8 = dom.createTextNode("File management");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=legal%20-%20hr");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Legal & HR");
        dom.setAttribute(el7,"data-bi-slot","6");
        var el8 = dom.createTextNode("Legal & HR");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=inventory%20-%20logistics");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Inventory & logistics");
        dom.setAttribute(el7,"data-bi-slot","7");
        var el8 = dom.createTextNode("Inventory & logistics");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=project%20management");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Project management");
        dom.setAttribute(el7,"data-bi-slot","8");
        var el8 = dom.createTextNode("Project management");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=remote%20desktop");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Remote desktop");
        dom.setAttribute(el7,"data-bi-slot","9");
        var el8 = dom.createTextNode("Remote desktop");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=sales%20-%20marketing");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Sales & marketing");
        dom.setAttribute(el7,"data-bi-slot","10");
        var el8 = dom.createTextNode("Sales & marketing");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=time%20-%20expenses");
        dom.setAttribute(el7,"class","list-group-item");
        dom.setAttribute(el7,"data-bi-name","Time & expenses");
        dom.setAttribute(el7,"data-bi-slot","11");
        var el8 = dom.createTextNode("Time & expenses");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n                ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n        ");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/pdp', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("main");
        dom.setAttribute(el1,"class","body");
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("meta");
        dom.setAttribute(el2,"name","ms.product");
        dom.setAttribute(el2,"content","{\"id\":\"9WZDNCRFJ3TJ\",\"name\":\"Netflix\",\"source\":\"DisplayCatalog\",\"category\":\"Apps\"}");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","srv_itemDetails");
        dom.setAttribute(el2,"data-target","ms-windows-store2://pdp/?productid=9WZDNCRFJ3TJ&referrer=unistoreweb&muid=38331CECDC2A6E95321B1BDCDA2A6E7E&websession=930039844CDF48D1A8ABE23CF353CDDC");
        dom.setAttribute(el2,"data-bi-area","AppDetails");
        dom.setAttribute(el2,"data-bi-view","Desc-BuyOptions-RatingsReviews");
        dom.setAttribute(el2,"data-bi-source","DisplayCatalog");
        dom.setAttribute(el2,"data-bi-product","9WZDNCRFJ3TJ");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","page-header");
        dom.setAttribute(el3,"data-bi-slot","1");
        var el4 = dom.createTextNode("\n    \n    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","grid fixed");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","row");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ol");
        dom.setAttribute(el6,"class","breadcrumb");
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    \n    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","grid fixed");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("section");
        dom.setAttribute(el5,"class","srv_appItemDetailsHeader row");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","m-col-7-24 l-col-9-24 section-gallery");
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment(" Begin One UI Item Template -- Media Browser ");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","srv_mediaBrowser media-browser row");
        dom.setAttribute(el7,"role","tabpanel");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createComment(" Begin One UI Item Template -- Media Browser - Tab Content ");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","tab-content m-col-22-24");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createComment(" Begin One UI Item Template -- Media Browser - Tab Content Item ");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"role","tabpanel");
        dom.setAttribute(el9,"class","tab-pane fade\\ in active");
        dom.setAttribute(el9,"id","media-browser-0");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("img");
        dom.setAttribute(el10,"class","img-responsive");
        dom.setAttribute(el10,"alt","Show detail");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createComment(" Begin One UI Item Template -- Media Browser - Tab Content Item ");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"role","tabpanel");
        dom.setAttribute(el9,"class","tab-pane fade\\");
        dom.setAttribute(el9,"id","media-browser-1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("img");
        dom.setAttribute(el10,"src","./Netflix - Microsoft Store_files/apps.37588.9007199266246365.b28adbd2-8eeb-41d9-b680-44afbcea329d.2ffa100f-4fc6-4e56-913d-ce6a90d8756b");
        dom.setAttribute(el10,"class","img-responsive");
        dom.setAttribute(el10,"alt","Watching a movie on Netflix");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createComment(" Begin One UI Item Template -- Media Browser - Tab Content Item ");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"role","tabpanel");
        dom.setAttribute(el9,"class","tab-pane fade\\");
        dom.setAttribute(el9,"id","media-browser-2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("img");
        dom.setAttribute(el10,"src","./Netflix - Microsoft Store_files/apps.37182.9007199266246365.6b493f19-2402-40d2-8c55-df2d0f0bd0cf.90ac5e21-f46a-47cb-b91a-53e9b61e45f1");
        dom.setAttribute(el10,"class","img-responsive");
        dom.setAttribute(el10,"alt","Home screen");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","m-col-16-24 l-col-14-24 m-col-24-offset-1 l-col-24-offset-1");
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","row");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","xs-col-2-24 s-col-3-24 m-col-6-24 l-col-5-24 cli_image_container");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("img");
        dom.setAttribute(el9,"class","cli_image img-responsive");
        dom.setAttribute(el9,"style","background-color: #FFFFFF");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","xs-col-4-24 s-col-9-24 m-col-18-24 l-col-19-24");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("h1");
        dom.setAttribute(el9,"id","page-title");
        dom.setAttribute(el9,"class","header-small page-heading");
        dom.setAttribute(el9,"itemprop","name");
        var el10 = dom.createComment("");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("a");
        dom.setAttribute(el10,"href","http://www.netflix.com/");
        dom.setAttribute(el10,"target","_blank");
        dom.setAttribute(el10,"data-bi-name","Publisher Site");
        var el11 = dom.createTextNode("Netflix, Inc.");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","rating");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("div");
        dom.setAttribute(el10,"class","rating-stars");
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("ul");
        dom.setAttribute(el11,"class","rating-stars-background");
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("ul");
        dom.setAttribute(el11,"class","rating-stars-value");
        dom.setAttribute(el11,"data-bind","style: { width: RatingPercentage + '%'}");
        dom.setAttribute(el11,"style","width: 76%");
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("li");
        var el13 = dom.createElement("i");
        dom.setAttribute(el13,"class","icon-star");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                            ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("span");
        dom.setAttribute(el10,"class","rating-numbers");
        var el11 = dom.createTextNode("(176,653)");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        var el10 = dom.createTextNode("Age rating: 16+");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","row");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","col-1-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("p");
        dom.setAttribute(el9,"class","description has-newline");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createComment("");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                \n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("section");
        dom.setAttribute(el7,"id","srv_purchaseCTA");
        dom.setAttribute(el7,"class","row");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","srv_addCartContainer col-1-1");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","cli_purchaseOn8x");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("span");
        var el11 = dom.createTextNode("To buy or install this app, go to Windows Store from your Start screen.");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                    ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    \n    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","grid fixed");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","row");
        dom.setAttribute(el5,"data-bi-area","BookMarks");
        dom.setAttribute(el5,"data-bi-view","Title Tabs");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6,"class","nav nav-pills col-1-1 hide-xs show-m");
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7,"role","presentation");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/netflix/9wzdncrfj3tj#app-details");
        dom.setAttribute(el8,"data-bi-name","AppDetails");
        var el9 = dom.createTextNode("App details");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7,"role","presentation");
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://onestore.dev.microsoft.com/en-us/store/apps/netflix/9wzdncrfj3tj#ratings-reviews");
        dom.setAttribute(el8,"data-bi-name","RatingsAndReviews");
        var el9 = dom.createTextNode("Ratings & Reviews");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","grid fixed");
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("section");
        dom.setAttribute(el4,"class","srv_detailsTable section");
        dom.setAttribute(el4,"id","app-details");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("header");
        dom.setAttribute(el5,"class","section-header row");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("h2");
        dom.setAttribute(el6,"class","section-title col-1-1");
        var el7 = dom.createTextNode("Additional information");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("dl");
        dom.setAttribute(el5,"class","metadata-list row");
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Publisher");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("Netflix, Inc.");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Category");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("Entertainment");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Approximate size");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("27.94 MB");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Age rating");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("16+");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Supported processors");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("arm, x64, x86");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Supported Languages");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("English (Canada)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Deutsch");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Français (Canada)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("English (United States)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Dansk");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Español");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Suomi");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Français");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Norsk (Bokmål)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Nederlands");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Português");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Svenska");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("English (United Kingdom)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Nederlands (Nederland)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Suomi (Suomi)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Deutsch (Deutschland)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Norsk, Bokmål (Norge)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Español (México)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Français (France)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Svenska (Sverige)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Português (Brasil)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Dansk (Danmark)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("English");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("Español (España, Alfabetización Internacional)");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Learn more");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","http://www.netflix.com/");
        dom.setAttribute(el8,"target","_blank");
        dom.setAttribute(el8,"data-bi-name","Publisher Uri");
        var el9 = dom.createTextNode("Netflix website");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://contactus.netflix.com/Help");
        dom.setAttribute(el8,"target","_blank");
        dom.setAttribute(el8,"data-bi-name","Support Uri");
        var el9 = dom.createTextNode("Netflix support");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dt");
        dom.setAttribute(el6,"class","metadata-list-title s-col-5-24 m-col-10-24");
        var el7 = dom.createTextNode("\n            Additional Terms");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("dd");
        dom.setAttribute(el6,"class","metadata-list-content s-col-7-24 m-col-14-24");
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        var el8 = dom.createTextNode("\n                ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://signup.netflix.com/PrivacyPolicy");
        dom.setAttribute(el8,"target","_blank");
        dom.setAttribute(el8,"data-bi-name","PrivacyPolicy Uri");
        var el9 = dom.createTextNode("Publisher privacy policy");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n            ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n            ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("hr");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, concat = hooks.concat, attribute = hooks.attribute, content = hooks.content, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [3, 1]);
        var element2 = dom.childAt(element1, [3, 1]);
        var element3 = dom.childAt(element2, [1, 3, 3, 3, 1]);
        var element4 = dom.childAt(element2, [3]);
        var element5 = dom.childAt(element4, [1]);
        var element6 = dom.childAt(element5, [1, 1]);
        var attrMorph0 = dom.createAttrMorph(element1, 'data-bi-name');
        var attrMorph1 = dom.createAttrMorph(element1, 'data-bi-id');
        var attrMorph2 = dom.createAttrMorph(element3, 'src');
        var attrMorph3 = dom.createAttrMorph(element6, 'src');
        var attrMorph4 = dom.createAttrMorph(element6, 'data-app-id');
        var morph0 = dom.createMorphAt(dom.childAt(element5, [3, 1]),0,0);
        var morph1 = dom.createMorphAt(dom.childAt(element4, [3, 1, 1]),1,1);
        var morph2 = dom.createMorphAt(element0,5,5);
        var morph3 = dom.createMorphAt(element0,7,7);
        attribute(env, attrMorph0, element1, "data-bi-name", concat(env, [get(env, context, "Title")]));
        attribute(env, attrMorph1, element1, "data-bi-id", concat(env, [get(env, context, "id")]));
        attribute(env, attrMorph2, element3, "src", concat(env, [get(env, context, "ScreenShot")]));
        attribute(env, attrMorph3, element6, "src", concat(env, [get(env, context, "ImageSource")]));
        attribute(env, attrMorph4, element6, "data-app-id", concat(env, [get(env, context, "id")]));
        content(env, morph0, context, "Title");
        inline(env, morph1, context, "lorem-ipsum", [], {"length": 1200});
        inline(env, morph2, context, "partial", ["partials/pdp/ratings"], {});
        inline(env, morph3, context, "partial", ["partials/pdp/relatedapps"], {});
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/templates/store', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                            ");
            dom.appendChild(el0, el1);
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
            set(env, context, "app", blockArguments[0]);
            inline(env, morph0, context, "partial", ["partials/app"], {"itemController": "app"});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 1,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement, blockArguments) {
          var dom = env.dom;
          var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          set(env, context, "currentModel", blockArguments[0]);
          block(env, morph0, context, "each", [get(env, context, "currentModel")], {}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("main");
        dom.setAttribute(el1,"class","body");
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("br");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","grid fixed");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","row");
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","srv_XsRefineControl hidden xs-col-1-1");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","srv_refine-list refine-list");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","refine-list-title h2");
        var el7 = dom.createTextNode("\n                    Refine results\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","srv_XsRefineClose pull-right visible-xs btn btn-default");
        var el8 = dom.createTextNode("X");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","refine-list-clear");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("a");
        dom.setAttribute(el7,"href","./appicons/Category Drill-In.html");
        dom.setAttribute(el7,"data-bi-name","RefineListClear");
        var el8 = dom.createTextNode("Clear filters");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","panel");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-heading");
        dom.setAttribute(el7,"role","tab");
        dom.setAttribute(el7,"id","refine-list-heading-0-1");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","panel-title");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"data-toggle","collapse");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#refine-list-0-1");
        dom.setAttribute(el9,"aria-expanded","true");
        dom.setAttribute(el9,"aria-controls","refine-list-0-1");
        dom.setAttribute(el9,"data-bi-name","Cat0");
        dom.setAttribute(el9,"data-bi-slot","1");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-expand");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-collapse");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                            Category\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-footer");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#");
        var el9 = dom.createTextNode("Business");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"id","refine-list-0-1");
        dom.setAttribute(el7,"class","panel-collapse collapse in");
        dom.setAttribute(el7,"role","tabpanel");
        dom.setAttribute(el7,"aria-labelledby","refine-list-heading-0-1");
        dom.setAttribute(el7,"aria-expanded","true");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","list-group");
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/books%20-%20reference?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Books & reference");
        dom.setAttribute(el9,"data-bi-slot","0");
        var el10 = dom.createTextNode("Books & reference");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","./appicons/Category Drill-In.html");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Business");
        dom.setAttribute(el9,"data-bi-slot","1");
        var el10 = dom.createTextNode("Business");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/developer%20tools?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Developer tools");
        dom.setAttribute(el9,"data-bi-slot","2");
        var el10 = dom.createTextNode("Developer tools");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/education?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Education");
        dom.setAttribute(el9,"data-bi-slot","3");
        var el10 = dom.createTextNode("Education");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/entertainment?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Entertainment");
        dom.setAttribute(el9,"data-bi-slot","4");
        var el10 = dom.createTextNode("Entertainment");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/government%20-%20politics?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Government & politics");
        dom.setAttribute(el9,"data-bi-slot","5");
        var el10 = dom.createTextNode("Government & politics");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/health%20-%20fitness?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Health & fitness");
        dom.setAttribute(el9,"data-bi-slot","6");
        var el10 = dom.createTextNode("Health & fitness");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/kids%20-%20family?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Kids & family");
        dom.setAttribute(el9,"data-bi-slot","7");
        var el10 = dom.createTextNode("Kids & family");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/lifestyle?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Lifestyle");
        dom.setAttribute(el9,"data-bi-slot","8");
        var el10 = dom.createTextNode("Lifestyle");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/food%20-%20dining?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Food & dining");
        dom.setAttribute(el9,"data-bi-slot","9");
        var el10 = dom.createTextNode("Food & dining");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/multimedia%20design?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Multimedia design");
        dom.setAttribute(el9,"data-bi-slot","10");
        var el10 = dom.createTextNode("Multimedia design");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/medical?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Medical");
        dom.setAttribute(el9,"data-bi-slot","11");
        var el10 = dom.createTextNode("Medical");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/navigation%20-%20maps?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Navigation & maps");
        dom.setAttribute(el9,"data-bi-slot","12");
        var el10 = dom.createTextNode("Navigation & maps");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/news%20-%20weather?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","News & weather");
        dom.setAttribute(el9,"data-bi-slot","13");
        var el10 = dom.createTextNode("News & weather");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/personal%20finance?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Personal Finance");
        dom.setAttribute(el9,"data-bi-slot","14");
        var el10 = dom.createTextNode("Personal finance");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/personalization?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Personalization");
        dom.setAttribute(el9,"data-bi-slot","15");
        var el10 = dom.createTextNode("Personalisation");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/photo%20-%20video?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Photo & video");
        dom.setAttribute(el9,"data-bi-slot","16");
        var el10 = dom.createTextNode("Photo & video");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/productivity?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Productivity");
        dom.setAttribute(el9,"data-bi-slot","17");
        var el10 = dom.createTextNode("Productivity");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/security?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Security");
        dom.setAttribute(el9,"data-bi-slot","18");
        var el10 = dom.createTextNode("Security");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/shopping?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Shopping");
        dom.setAttribute(el9,"data-bi-slot","19");
        var el10 = dom.createTextNode("Shopping");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/social?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Social");
        dom.setAttribute(el9,"data-bi-slot","20");
        var el10 = dom.createTextNode("Social");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/travel?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Travel");
        dom.setAttribute(el9,"data-bi-slot","21");
        var el10 = dom.createTextNode("Travel");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/utilities%20-%20tools?rank=ProductSearchApps");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Utilities & tools");
        dom.setAttribute(el9,"data-bi-slot","22");
        var el10 = dom.createTextNode("Utilities & tools");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","panel");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-heading");
        dom.setAttribute(el7,"role","tab");
        dom.setAttribute(el7,"id","refine-list-heading-1-1");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("h4");
        dom.setAttribute(el8,"class","panel-title");
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"data-toggle","collapse");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#refine-list-1-1");
        dom.setAttribute(el9,"aria-expanded","true");
        dom.setAttribute(el9,"aria-controls","refine-list-1-1");
        dom.setAttribute(el9,"data-bi-name","Cat1");
        dom.setAttribute(el9,"data-bi-slot","2");
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-expand");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-collapse");
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                            Subcategory\n                        ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","panel-footer");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#");
        var el9 = dom.createTextNode("All");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"id","refine-list-1-1");
        dom.setAttribute(el7,"class","panel-collapse collapse in");
        dom.setAttribute(el7,"role","tabpanel");
        dom.setAttribute(el7,"aria-labelledby","refine-list-heading-1-1");
        dom.setAttribute(el7,"aria-expanded","true");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","list-group");
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","./appicons/Category Drill-In.html");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","All");
        dom.setAttribute(el9,"data-bi-slot","0");
        var el10 = dom.createTextNode("All");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=accounting%20-%20finance");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Accounting & finance");
        dom.setAttribute(el9,"data-bi-slot","1");
        var el10 = dom.createTextNode("Accounting & finance");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=collaboration");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Collaboration");
        dom.setAttribute(el9,"data-bi-slot","2");
        var el10 = dom.createTextNode("Collaboration");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=crm");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","CRM");
        dom.setAttribute(el9,"data-bi-slot","3");
        var el10 = dom.createTextNode("CRM");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=data%20-%20analytics");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Data & analytics");
        dom.setAttribute(el9,"data-bi-slot","4");
        var el10 = dom.createTextNode("Data & analytics");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=file%20management");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","File management");
        dom.setAttribute(el9,"data-bi-slot","5");
        var el10 = dom.createTextNode("File management");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=legal%20-%20hr");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Legal & HR");
        dom.setAttribute(el9,"data-bi-slot","6");
        var el10 = dom.createTextNode("Legal & HR");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=inventory%20-%20logistics");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Inventory & logistics");
        dom.setAttribute(el9,"data-bi-slot","7");
        var el10 = dom.createTextNode("Inventory & logistics");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=project%20management");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Project management");
        dom.setAttribute(el9,"data-bi-slot","8");
        var el10 = dom.createTextNode("Project management");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=remote%20desktop");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Remote desktop");
        dom.setAttribute(el9,"data-bi-slot","9");
        var el10 = dom.createTextNode("Remote desktop");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=sales%20-%20marketing");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Sales & marketing");
        dom.setAttribute(el9,"data-bi-slot","10");
        var el10 = dom.createTextNode("Sales & marketing");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&cat2=time%20-%20expenses");
        dom.setAttribute(el9,"class","list-group-item");
        dom.setAttribute(el9,"data-bi-name","Time & expenses");
        dom.setAttribute(el9,"data-bi-slot","11");
        var el10 = dom.createTextNode("Time & expenses");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n            ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4,"class","m-col-16-24 l-col-18-24 l-col-24-offset-1 searchResults");
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("header");
        dom.setAttribute(el5,"class","section-header row");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6,"class","col-1-1");
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("h2");
        dom.setAttribute(el7,"class","section-title");
        var el8 = dom.createTextNode("\n                    Business in App\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7,"class","srv_rank");
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8,"class","inline-block");
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","body-tight form-control-static inline-block");
        var el10 = dom.createTextNode("\n                                Sort by:\n                            ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9,"class","srv_searchRank dropdown form-control-static inline-block");
        dom.setAttribute(el9,"data-bi-area","DrillRank");
        dom.setAttribute(el9,"data-bi-view","dropdown");
        dom.setAttribute(el9,"data-bi-source","DisplayCatalog");
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("button");
        dom.setAttribute(el10,"id","Sort by:");
        dom.setAttribute(el10,"class","btn btn-dropdown");
        dom.setAttribute(el10,"type","button");
        dom.setAttribute(el10,"data-toggle","dropdown");
        dom.setAttribute(el10,"data-bi-name","SearchRankSortBy");
        dom.setAttribute(el10,"aria-haspopup","true");
        dom.setAttribute(el10,"aria-expanded","false");
        dom.setAttribute(el10,"role","button");
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("span");
        dom.setAttribute(el11,"class","body-tight");
        var el12 = dom.createTextNode("\n                                    Relevancy");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("i");
        dom.setAttribute(el12,"class","caret");
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("ul");
        dom.setAttribute(el10,"class","srv_searchRankList dropdown-menu");
        dom.setAttribute(el10,"role","menu");
        dom.setAttribute(el10,"aria-labelledby","Sort by:");
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        dom.setAttribute(el11,"class","body-tight active");
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("a");
        dom.setAttribute(el12,"href","./appicons/Category Drill-In.html");
        dom.setAttribute(el12,"data-key","ProductSearchApps");
        dom.setAttribute(el12,"data-bi-name","ProductSearchApps");
        var el13 = dom.createTextNode("Relevancy");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        dom.setAttribute(el11,"class","body-tight ");
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("a");
        dom.setAttribute(el12,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=TopRatedApps");
        dom.setAttribute(el12,"data-key","TopRatedApps");
        dom.setAttribute(el12,"data-bi-name","TopRatedApps");
        var el13 = dom.createTextNode("Rating");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("li");
        dom.setAttribute(el11,"class","body-tight ");
        var el12 = dom.createTextNode("\n                                        ");
        dom.appendChild(el11, el12);
        var el12 = dom.createElement("a");
        dom.setAttribute(el12,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=NewRisingApps");
        dom.setAttribute(el12,"data-key","NewRisingApps");
        dom.setAttribute(el12,"data-bi-name","NewRisingApps");
        var el13 = dom.createTextNode("Popularity");
        dom.appendChild(el12, el13);
        dom.appendChild(el11, el12);
        var el12 = dom.createTextNode("\n                                    ");
        dom.appendChild(el11, el12);
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                            ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("a");
        dom.setAttribute(el9,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#");
        dom.setAttribute(el9,"class","srv_XsRefineAction visible-xs-inline body-tight form-control-static");
        var el10 = dom.createTextNode("Refine results");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                        ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                    ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5,"class","srv_drillin-results row appicons");
        dom.setAttribute(el5,"data-bi-area","DrillResults");
        dom.setAttribute(el5,"data-bi-view","12rowX6col");
        dom.setAttribute(el5,"data-bi-source","DisplayCatalog");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("nav");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6,"class","srv_pagingBar pagination");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7,"class","active");
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps#");
        dom.setAttribute(el8,"data-bi-name","PagingPageNumber-1");
        var el9 = dom.createTextNode("1 ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"class","sr-only");
        var el10 = dom.createTextNode("(current)");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"class","cli_pageLink");
        dom.setAttribute(el8,"data-bi-name","PagingPageNumber-2");
        dom.setAttribute(el8,"data-skip-items","72");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&s=store&skipItems=72");
        var el9 = dom.createTextNode("2");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"class","cli_pageLink");
        dom.setAttribute(el8,"data-bi-name","PagingPageNumber-3");
        dom.setAttribute(el8,"data-skip-items","144");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&s=store&skipItems=144");
        var el9 = dom.createTextNode("3");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"class","cli_pageLink");
        dom.setAttribute(el8,"data-bi-name","PagingPageNumber-4");
        dom.setAttribute(el8,"data-skip-items","216");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&s=store&skipItems=216");
        var el9 = dom.createTextNode("4");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("a");
        dom.setAttribute(el8,"href","https://unistorefd-int.www.microsoft.com/en-us/store/apps/business?rank=ProductSearchApps&s=store&skipItems=72");
        dom.setAttribute(el8,"class","cli_pageLink");
        dom.setAttribute(el8,"aria-label","Next");
        dom.setAttribute(el8,"data-bi-name","PagingArrowNext");
        dom.setAttribute(el8,"data-skip-items","72");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("span");
        dom.setAttribute(el9,"aria-hidden","true");
        var el10 = dom.createElement("i");
        dom.setAttribute(el10,"class","icon-carousel-right");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, inline = hooks.inline, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 3, 1]);
        var morph0 = dom.createMorphAt(element0,1,1);
        var morph1 = dom.createMorphAt(dom.childAt(element0, [5, 3]),1,1);
        inline(env, morph0, context, "partial", ["partials/store/categories"], {});
        block(env, morph1, context, "liquid-with", [get(env, context, "model")], {}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('liquid-windows-store/tests/adapters/application.jshint', function () {

  'use strict';

  module('JSHint - adapters');
  test('adapters/application.js should pass jshint', function() { 
    ok(true, 'adapters/application.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/app.jshint', function () {

  'use strict';

  module('JSHint - .');
  test('app.js should pass jshint', function() { 
    ok(true, 'app.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/components/ws-rating.jshint', function () {

  'use strict';

  module('JSHint - components');
  test('components/ws-rating.js should pass jshint', function() { 
    ok(true, 'components/ws-rating.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/controllers/app.jshint', function () {

  'use strict';

  module('JSHint - controllers');
  test('controllers/app.js should pass jshint', function() { 
    ok(true, 'controllers/app.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/fixtures/app.jshint', function () {

  'use strict';

  module('JSHint - fixtures');
  test('fixtures/app.js should pass jshint', function() { 
    ok(true, 'fixtures/app.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/helpers/resolver', ['exports', 'ember/resolver', 'liquid-windows-store/config/environment'], function (exports, Resolver, config) {

  'use strict';

  var resolver = Resolver['default'].create();

  resolver.namespace = {
    modulePrefix: config['default'].modulePrefix,
    podModulePrefix: config['default'].podModulePrefix
  };

  exports['default'] = resolver;

});
define('liquid-windows-store/tests/helpers/resolver.jshint', function () {

  'use strict';

  module('JSHint - helpers');
  test('helpers/resolver.js should pass jshint', function() { 
    ok(true, 'helpers/resolver.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/helpers/start-app', ['exports', 'ember', 'liquid-windows-store/app', 'liquid-windows-store/router', 'liquid-windows-store/config/environment'], function (exports, Ember, Application, Router, config) {

  'use strict';



  exports['default'] = startApp;
  function startApp(attrs) {
    var application;

    var attributes = Ember['default'].merge({}, config['default'].APP);
    attributes = Ember['default'].merge(attributes, attrs); // use defaults, but you can override;

    Ember['default'].run(function () {
      application = Application['default'].create(attributes);
      application.setupForTesting();
      application.injectTestHelpers();
    });

    return application;
  }

});
define('liquid-windows-store/tests/helpers/start-app.jshint', function () {

  'use strict';

  module('JSHint - helpers');
  test('helpers/start-app.js should pass jshint', function() { 
    ok(true, 'helpers/start-app.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/mixins/reset-scroll.jshint', function () {

  'use strict';

  module('JSHint - mixins');
  test('mixins/reset-scroll.js should pass jshint', function() { 
    ok(true, 'mixins/reset-scroll.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/models/app.jshint', function () {

  'use strict';

  module('JSHint - models');
  test('models/app.js should pass jshint', function() { 
    ok(true, 'models/app.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/router.jshint', function () {

  'use strict';

  module('JSHint - .');
  test('router.js should pass jshint', function() { 
    ok(true, 'router.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/routes/application.jshint', function () {

  'use strict';

  module('JSHint - routes');
  test('routes/application.js should pass jshint', function() { 
    ok(true, 'routes/application.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/routes/pdp.jshint', function () {

  'use strict';

  module('JSHint - routes');
  test('routes/pdp.js should pass jshint', function() { 
    ok(true, 'routes/pdp.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/routes/store.jshint', function () {

  'use strict';

  module('JSHint - routes');
  test('routes/store.js should pass jshint', function() { 
    ok(true, 'routes/store.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/test-helper', ['liquid-windows-store/tests/helpers/resolver', 'ember-qunit'], function (resolver, ember_qunit) {

	'use strict';

	ember_qunit.setResolver(resolver['default']);

});
define('liquid-windows-store/tests/test-helper.jshint', function () {

  'use strict';

  module('JSHint - .');
  test('test-helper.js should pass jshint', function() { 
    ok(true, 'test-helper.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/transitions.jshint', function () {

  'use strict';

  module('JSHint - .');
  test('transitions.js should pass jshint', function() { 
    ok(true, 'transitions.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/adapters/application-test', ['ember-qunit'], function (ember_qunit) {

  'use strict';

  ember_qunit.moduleFor('adapter:application', 'ApplicationAdapter', {});

  // Replace this with your real tests.
  ember_qunit.test('it exists', function (assert) {
    var adapter = this.subject();
    assert.ok(adapter);
  });

  // Specify the other units that are required for this test.
  // needs: ['serializer:foo']

});
define('liquid-windows-store/tests/unit/adapters/application-test.jshint', function () {

  'use strict';

  module('JSHint - unit/adapters');
  test('unit/adapters/application-test.js should pass jshint', function() { 
    ok(true, 'unit/adapters/application-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/components/ws-rating-test', ['ember-qunit'], function (ember_qunit) {

  'use strict';

  ember_qunit.moduleForComponent('ws-rating', {});

  ember_qunit.test('it renders', function (assert) {
    assert.expect(2);

    // Creates the component instance
    var component = this.subject();
    assert.equal(component._state, 'preRender');

    // Renders the component to the page
    this.render();
    assert.equal(component._state, 'inDOM');
  });

  // Specify the other units that are required for this test
  // needs: ['component:foo', 'helper:bar']

});
define('liquid-windows-store/tests/unit/components/ws-rating-test.jshint', function () {

  'use strict';

  module('JSHint - unit/components');
  test('unit/components/ws-rating-test.js should pass jshint', function() { 
    ok(true, 'unit/components/ws-rating-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/controllers/app-test', ['ember-qunit'], function (ember_qunit) {

  'use strict';

  ember_qunit.moduleFor('controller:app', {});

  // Replace this with your real tests.
  ember_qunit.test('it exists', function (assert) {
    var controller = this.subject();
    assert.ok(controller);
  });

  // Specify the other units that are required for this test.
  // needs: ['controller:foo']

});
define('liquid-windows-store/tests/unit/controllers/app-test.jshint', function () {

  'use strict';

  module('JSHint - unit/controllers');
  test('unit/controllers/app-test.js should pass jshint', function() { 
    ok(true, 'unit/controllers/app-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/mixins/reset-scroll-test', ['ember', 'liquid-windows-store/mixins/reset-scroll', 'qunit'], function (Ember, ResetScrollMixin, qunit) {

  'use strict';

  qunit.module('ResetScrollMixin');

  // Replace this with your real tests.
  qunit.test('it works', function (assert) {
    var ResetScrollObject = Ember['default'].Object.extend(ResetScrollMixin['default']);
    var subject = ResetScrollObject.create();
    assert.ok(subject);
  });

});
define('liquid-windows-store/tests/unit/mixins/reset-scroll-test.jshint', function () {

  'use strict';

  module('JSHint - unit/mixins');
  test('unit/mixins/reset-scroll-test.js should pass jshint', function() { 
    ok(true, 'unit/mixins/reset-scroll-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/models/app-test', ['ember-qunit'], function (ember_qunit) {

  'use strict';

  ember_qunit.moduleForModel('app', {
    // Specify the other units that are required for this test.
    needs: []
  });

  ember_qunit.test('it exists', function (assert) {
    var model = this.subject();
    // var store = this.store();
    assert.ok(!!model);
  });

});
define('liquid-windows-store/tests/unit/models/app-test.jshint', function () {

  'use strict';

  module('JSHint - unit/models');
  test('unit/models/app-test.js should pass jshint', function() { 
    ok(true, 'unit/models/app-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/routes/application-test', ['ember-qunit'], function (ember_qunit) {

  'use strict';

  ember_qunit.moduleFor('route:application', {});

  ember_qunit.test('it exists', function (assert) {
    var route = this.subject();
    assert.ok(route);
  });

  // Specify the other units that are required for this test.
  // needs: ['controller:foo']

});
define('liquid-windows-store/tests/unit/routes/application-test.jshint', function () {

  'use strict';

  module('JSHint - unit/routes');
  test('unit/routes/application-test.js should pass jshint', function() { 
    ok(true, 'unit/routes/application-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/routes/pdp-test', ['ember-qunit'], function (ember_qunit) {

  'use strict';

  ember_qunit.moduleFor('route:pdp', {});

  ember_qunit.test('it exists', function (assert) {
    var route = this.subject();
    assert.ok(route);
  });

  // Specify the other units that are required for this test.
  // needs: ['controller:foo']

});
define('liquid-windows-store/tests/unit/routes/pdp-test.jshint', function () {

  'use strict';

  module('JSHint - unit/routes');
  test('unit/routes/pdp-test.js should pass jshint', function() { 
    ok(true, 'unit/routes/pdp-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/tests/unit/routes/store-test', ['ember-qunit'], function (ember_qunit) {

  'use strict';

  ember_qunit.moduleFor('route:store', {});

  ember_qunit.test('it exists', function (assert) {
    var route = this.subject();
    assert.ok(route);
  });

  // Specify the other units that are required for this test.
  // needs: ['controller:foo']

});
define('liquid-windows-store/tests/unit/routes/store-test.jshint', function () {

  'use strict';

  module('JSHint - unit/routes');
  test('unit/routes/store-test.js should pass jshint', function() { 
    ok(true, 'unit/routes/store-test.js should pass jshint.'); 
  });

});
define('liquid-windows-store/transitions', ['exports'], function (exports) {

    'use strict';

    exports['default'] = function () {
        var duration = 300;

        this.transition(this.fromRoute('store'), this.toRoute('pdp'), this.use('explode', {
            matchBy: 'data-app-id',
            use: ['flyTo', {
                duration: duration
            }]
        }, {
            use: ['toLeft', {
                duration: duration
            }]
        }), this.reverse('explode', {
            matchBy: 'data-app-id',
            use: ['flyTo', {
                duration: duration
            }]
        }, {
            use: ['toRight', {
                duration: duration
            }]
        }));

        this.transition(this.childOf('.appicons'), this.use('explode', {
            matchBy: 'data-app-id',
            use: ['flyTo', {
                duration: duration, easing: [250, 15]
            }]
        }));
    }

});
define('liquid-windows-store/transitions/cross-fade', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';


  exports['default'] = crossFade;
  // BEGIN-SNIPPET cross-fade-definition
  function crossFade() {
    var opts = arguments[0] === undefined ? {} : arguments[0];

    liquid_fire.stop(this.oldElement);
    return liquid_fire.Promise.all([liquid_fire.animate(this.oldElement, { opacity: 0 }, opts), liquid_fire.animate(this.newElement, { opacity: [opts.maxOpacity || 1, 0] }, opts)]);
  } // END-SNIPPET

});
define('liquid-windows-store/transitions/default', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';



  // This is what we run when no animation is asked for. It just sets
  // the newly-added element to visible (because we always start them
  // out invisible so that transitions can control their initial
  // appearance).
  exports['default'] = defaultTransition;
  function defaultTransition() {
    if (this.newElement) {
      this.newElement.css({ visibility: "" });
    }
    return liquid_fire.Promise.resolve();
  }

});
define('liquid-windows-store/transitions/explode', ['exports', 'ember', 'liquid-fire'], function (exports, Ember, liquid_fire) {

  'use strict';



  // Explode is not, by itself, an animation. It exists to pull apart
  // other elements so that each of the pieces can be targeted by
  // animations.

  exports['default'] = explode;

  function explode() {
    var _this = this;

    for (var _len = arguments.length, pieces = Array(_len), _key = 0; _key < _len; _key++) {
      pieces[_key] = arguments[_key];
    }

    var sawBackgroundPiece = false;
    var promises = pieces.map(function (piece) {
      if (piece.matchBy) {
        return matchAndExplode(_this, piece);
      } else if (piece.pick || piece.pickOld || piece.pickNew) {
        return explodePiece(_this, piece);
      } else {
        sawBackgroundPiece = true;
        return runAnimation(_this, piece);
      }
    });
    if (!sawBackgroundPiece) {
      if (this.newElement) {
        this.newElement.css({ visibility: "" });
      }
      if (this.oldElement) {
        this.oldElement.css({ visibility: "hidden" });
      }
    }
    return liquid_fire.Promise.all(promises);
  }

  function explodePiece(context, piece) {
    var childContext = Ember['default'].copy(context);
    var selectors = [piece.pickOld || piece.pick, piece.pickNew || piece.pick];
    var cleanupOld, cleanupNew;

    if (selectors[0] || selectors[1]) {
      cleanupOld = _explodePart(context, "oldElement", childContext, selectors[0]);
      cleanupNew = _explodePart(context, "newElement", childContext, selectors[1]);
      if (!cleanupOld && !cleanupNew) {
        return liquid_fire.Promise.resolve();
      }
    }

    return runAnimation(childContext, piece)["finally"](function () {
      if (cleanupOld) {
        cleanupOld();
      }
      if (cleanupNew) {
        cleanupNew();
      }
    });
  }

  function _explodePart(context, field, childContext, selector) {
    var child, childOffset, width, height, newChild;
    var elt = context[field];
    childContext[field] = null;
    if (elt && selector) {
      child = elt.find(selector);
      if (child.length > 0) {
        childOffset = child.offset();
        width = child.outerWidth();
        height = child.outerHeight();
        newChild = child.clone();

        // Hide the original element
        child.css({ visibility: "hidden" });

        // If the original element's parent was hidden, hide our clone
        // too.
        if (elt.css("visibility") === "hidden") {
          newChild.css({ visibility: "hidden" });
        }
        newChild.appendTo(elt.parent());
        newChild.outerWidth(width);
        newChild.outerHeight(height);
        var newParentOffset = newChild.offsetParent().offset();
        newChild.css({
          position: "absolute",
          top: childOffset.top - newParentOffset.top,
          left: childOffset.left - newParentOffset.left,
          margin: 0
        });

        // Pass the clone to the next animation
        childContext[field] = newChild;
        return function cleanup() {
          newChild.remove();
          child.css({ visibility: "" });
        };
      }
    }
  }

  function animationFor(context, piece) {
    var name, args, func;
    if (!piece.use) {
      throw new Error("every argument to the 'explode' animation must include a followup animation to 'use'");
    }
    if (Ember['default'].isArray(piece.use)) {
      name = piece.use[0];
      args = piece.use.slice(1);
    } else {
      name = piece.use;
      args = [];
    }
    if (typeof name === "function") {
      func = name;
    } else {
      func = context.lookup(name);
    }
    return function () {
      return liquid_fire.Promise.resolve(func.apply(this, args));
    };
  }

  function runAnimation(context, piece) {
    return new liquid_fire.Promise(function (resolve, reject) {
      animationFor(context, piece).apply(context).then(resolve, reject);
    });
  }

  function matchAndExplode(context, piece) {
    if (!context.oldElement) {
      return liquid_fire.Promise.resolve();
    }

    var hits = Ember['default'].A(context.oldElement.find("[" + piece.matchBy + "]").toArray());
    return liquid_fire.Promise.all(hits.map(function (elt) {
      return explodePiece(context, {
        pick: "[" + piece.matchBy + "=" + Ember['default'].$(elt).attr(piece.matchBy) + "]",
        use: piece.use
      });
    }));
  }

});
define('liquid-windows-store/transitions/fade', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';


  exports['default'] = fade;

  // BEGIN-SNIPPET fade-definition
  function fade() {
    var _this = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    var firstStep;
    var outOpts = opts;
    var fadingElement = findFadingElement(this);

    if (fadingElement) {
      // We still have some older version that is in the process of
      // fading out, so out first step is waiting for it to finish.
      firstStep = liquid_fire.finish(fadingElement, 'fade-out');
    } else {
      if (liquid_fire.isAnimating(this.oldElement, 'fade-in')) {
        // if the previous view is partially faded in, scale its
        // fade-out duration appropriately.
        outOpts = { duration: liquid_fire.timeSpent(this.oldElement, 'fade-in') };
      }
      liquid_fire.stop(this.oldElement);
      firstStep = liquid_fire.animate(this.oldElement, { opacity: 0 }, outOpts, 'fade-out');
    }
    return firstStep.then(function () {
      return liquid_fire.animate(_this.newElement, { opacity: [opts.maxOpacity || 1, 0] }, opts, 'fade-in');
    });
  }

  function findFadingElement(context) {
    for (var i = 0; i < context.older.length; i++) {
      var entry = context.older[i];
      if (liquid_fire.isAnimating(entry.element, 'fade-out')) {
        return entry.element;
      }
    }
    if (liquid_fire.isAnimating(context.oldElement, 'fade-out')) {
      return context.oldElement;
    }
  }
  // END-SNIPPET

});
define('liquid-windows-store/transitions/flex-grow', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';


  exports['default'] = flexGrow;
  function flexGrow(opts) {
    liquid_fire.stop(this.oldElement);
    return liquid_fire.Promise.all([liquid_fire.animate(this.oldElement, { 'flex-grow': 0 }, opts), liquid_fire.animate(this.newElement, { 'flex-grow': [1, 0] }, opts)]);
  }

});
define('liquid-windows-store/transitions/fly-to', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';



  exports['default'] = flyTo;
  function flyTo() {
    var _this = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    if (!this.newElement) {
      return liquid_fire.Promise.resolve();
    } else if (!this.oldElement) {
      this.newElement.css({ visibility: '' });
      return liquid_fire.Promise.resolve();
    }

    var oldOffset = this.oldElement.offset();
    var newOffset = this.newElement.offset();

    var motion = {
      translateX: newOffset.left - oldOffset.left,
      translateY: newOffset.top - oldOffset.top,
      outerWidth: this.newElement.outerWidth(),
      outerHeight: this.newElement.outerHeight()
    };

    this.newElement.css({ visibility: 'hidden' });
    return liquid_fire.animate(this.oldElement, motion, opts).then(function () {
      _this.newElement.css({ visibility: '' });
    });
  }

});
define('liquid-windows-store/transitions/move-over', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';



  exports['default'] = moveOver;

  function moveOver(dimension, direction, opts) {
    var _this = this;

    var oldParams = {},
        newParams = {},
        firstStep,
        property,
        measure;

    if (dimension.toLowerCase() === 'x') {
      property = 'translateX';
      measure = 'width';
    } else {
      property = 'translateY';
      measure = 'height';
    }

    if (liquid_fire.isAnimating(this.oldElement, 'moving-in')) {
      firstStep = liquid_fire.finish(this.oldElement, 'moving-in');
    } else {
      liquid_fire.stop(this.oldElement);
      firstStep = liquid_fire.Promise.resolve();
    }

    return firstStep.then(function () {
      var bigger = biggestSize(_this, measure);
      oldParams[property] = bigger * direction + 'px';
      newParams[property] = ['0px', -1 * bigger * direction + 'px'];

      return liquid_fire.Promise.all([liquid_fire.animate(_this.oldElement, oldParams, opts), liquid_fire.animate(_this.newElement, newParams, opts, 'moving-in')]);
    });
  }

  function biggestSize(context, dimension) {
    var sizes = [];
    if (context.newElement) {
      sizes.push(parseInt(context.newElement.css(dimension), 10));
      sizes.push(parseInt(context.newElement.parent().css(dimension), 10));
    }
    if (context.oldElement) {
      sizes.push(parseInt(context.oldElement.css(dimension), 10));
      sizes.push(parseInt(context.oldElement.parent().css(dimension), 10));
    }
    return Math.max.apply(null, sizes);
  }

});
define('liquid-windows-store/transitions/scale', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';



  exports['default'] = scale;
  function scale() {
    var _this = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    return liquid_fire.animate(this.oldElement, { scale: [0.2, 1] }, opts).then(function () {
      return liquid_fire.animate(_this.newElement, { scale: [1, 0.2] }, opts);
    });
  }

});
define('liquid-windows-store/transitions/scroll-then', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = function (nextTransitionName, options) {
    var _this = this;

    for (var _len = arguments.length, rest = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      rest[_key - 2] = arguments[_key];
    }

    Ember['default'].assert('You must provide a transition name as the first argument to scrollThen. Example: this.use(\'scrollThen\', \'toLeft\')', 'string' === typeof nextTransitionName);

    var el = document.getElementsByTagName('html');
    var nextTransition = this.lookup(nextTransitionName);
    if (!options) {
      options = {};
    }

    Ember['default'].assert('The second argument to scrollThen is passed to Velocity\'s scroll function and must be an object', 'object' === typeof options);

    // set scroll options via: this.use('scrollThen', 'ToLeft', {easing: 'spring'})
    options = Ember['default'].merge({ duration: 500, offset: 0 }, options);

    // additional args can be passed through after the scroll options object
    // like so: this.use('scrollThen', 'moveOver', {duration: 100}, 'x', -1);

    return window.$.Velocity(el, 'scroll', options).then(function () {
      nextTransition.apply(_this, rest);
    });
  }

});
define('liquid-windows-store/transitions/to-down', ['exports', 'liquid-windows-store/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "y", 1, opts);
  }

});
define('liquid-windows-store/transitions/to-left', ['exports', 'liquid-windows-store/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "x", -1, opts);
  }

});
define('liquid-windows-store/transitions/to-right', ['exports', 'liquid-windows-store/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "x", 1, opts);
  }

});
define('liquid-windows-store/transitions/to-up', ['exports', 'liquid-windows-store/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "y", -1, opts);
  }

});
/* jshint ignore:start */

/* jshint ignore:end */

/* jshint ignore:start */

define('liquid-windows-store/config/environment', ['ember'], function(Ember) {
  var prefix = 'liquid-windows-store';
/* jshint ignore:start */

try {
  var metaName = prefix + '/config/environment';
  var rawConfig = Ember['default'].$('meta[name="' + metaName + '"]').attr('content');
  var config = JSON.parse(unescape(rawConfig));

  return { 'default': config };
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

/* jshint ignore:end */

});

if (runningTests) {
  require("liquid-windows-store/tests/test-helper");
} else {
  require("liquid-windows-store/app")["default"].create({"name":"liquid-windows-store","version":"0.0.0.40c06df9"});
}

/* jshint ignore:end */
//# sourceMappingURL=liquid-windows-store.map