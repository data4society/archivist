var Backbone = require('backbone'),
    $ = require('jquery');

var MainMenu = Backbone.View.extend({
  manage: true,
  events: {
    'click li:not(.active)': 'goToInternal'
  },
  initialize: function() {
    var self = this;
    self.render();
  },
  template: '#mainmenu',
  goToInternal: function(e) {
    e.preventDefault()
    Backbone.middle.trigger("goTo", e.currentTarget.dataset.url)
  },
  serialize: function() {
    return { items: this.collection };
  }
});
exports.mainMenu = MainMenu

var ContextMenu = Backbone.View.extend({
  manage: true,
  className: "context-toolbar animate",
  events: {
    'click .btn': '_run'
  },
  initialize: function() {
    var self = this;
    self.render();
    self.collection.on("reset", function(col, prev){
      self.prev = prev.previousModels;
      self.render();
    });
    self.collection.on("restore", self.restore, self);
  },
  template: '#contextmenu',
  serialize: function() {
    return { items: this.collection };
  },
  restore: function() {
    this.collection.reset(this.prev);
  },
  _run: function(e) {
    e.preventDefault();
    var view = this.layout.parentView.getView(''),
        fn = e.currentTarget.dataset.fn;

    view[fn]();
  },
  close: function() {
    this.remove();
    this.unbind();
  }
});
exports.contextMenu = ContextMenu;