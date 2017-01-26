"use strict";
/* global App */
define(['underscore','backbone'],function(_, Backbone){
  /**
    This model handles the options associated with the download options given in the TopMenu.
    It is important to track these options, because they're purely client side settings.
  */
  return Backbone.Model.extend({
    defaults: {
      wordByWord: false
    , format:     'mp3'
    }
  , initialize: function(){
      //Reading from storage:
      this.load();
      //Storing on change:
      this.on('change', this.store, this);
    }
  , load: function(){
      var options = {};
      _.each(_.keys(this.defaults), function(k){
        var l = this.storageKey(k);
        if(l in App.storage){
          options[k] = App.storage[l];
        }
      }, this);
      this.set(options);
    }
  , store: function(){
      _.each(_.keys(this.defaults), function(k){
        var l = this.storageKey(k), v = this.get(k);
        App.storage[l] = v;
      }, this);
    }
  , storageKey: function(k){return "DownloadOptions_"+k;}
  });
});
