/* global App */
/* eslint-disable no-console */
"use strict";
define(['jquery','underscore','backbone'], function($, _, Backbone){
  /***/
  return Backbone.Model.extend({
    initialize: function(){
      //Field to track the first update.
      this._firstUpdate = true;
      //Link map depending on PageView:
      this._linkMap = {}; // StudyName -> PageView -> Fragment
    }
    /**
      The update method is connected by the App,
      to listen on change:study of the window.App.dataStorage.
    */
  , update: function(){
      var ds   = window.App.dataStorage
        , data = ds.get('study');
      if(data && 'study' in data){
        console.log('Study.update()');
        this.set(data.study);
      }
      //Setup is only complete iff the first study:update was performed.
      if(this._firstUpdate === true){
        this._firstUpdate = false;
        App.setupBar.addLoaded();
      }
    }
    /**
      @return ready Boolean
      Returns true if the first update already happened.
    */
  , isReady: function(){
      return !this._firstUpdate;
    }
    /**
      @return id String
      Returns the name of a Study.
    */
  , getId: function(){
      if(this._firstUpdate === true){
        throw {obj: this, msg: 'Study.getId() before first update'};
      }
      return this.get('Name');
    }
    /**
      @return ids [String]
      Returns the ids of all studies.
      In case that the expected data are not found in DataStorage,
      an empty array is returned.
    */
  , getAllIds: function(){
      var g = App.dataStorage.get('global');
      if(g){
        if('studies' in g) return g.studies;
      }
      return [];
    }
    /**
      Returns the name for the current study in the current translation.
      @param field can be used to overwrite the study name, which is helpful to translate other studies.
    */
  , getName: function(field){
      field = field || this.get('Name');
      var category = 'StudyTranslationProvider';
      return window.App.translationStorage.translateDynamic(category, field, field);
    }
    /**
      Returns the title for the current study in the current translation.
      The title is typically composed with website_title_{prefix,suffix} into the page title.
      This composition, however should be done in the according view rather than the study.
    */
  , getTitle: function(){
      var category = 'StudyTitleTranslationProvider'
        , field    = this.get('Name')
        , fallback = this.getName();
      return window.App.translationStorage.translateDynamic(category, field, fallback);
    }
    /**
      Predicate to tell if the families colors should be used for coloring.
    */
  , getColorByFamily: function(){
      return parseInt(this.get('ColorByFamily')) === 1;
    }
    /**
      @param id String
      @return promise Deferred
      Sets the study to the one with the given id.
      Method checks that id is not ∈ {null, 'undefined', ''}
    */
  , setStudy: function(id){
      var def = $.Deferred();
      if(_.any([!_.isString(id), id === 'undefined', _.isEmpty(id)])){
        def.reject('Study.setStudy with invalid id: '+id);
      }else if(id === this.get('Name')){
        def.resolve(); // No change to the study
      }else{ // We need to load the study via DataStorage:
        App.dataStorage.loadStudy(id).done(function(){
          def.resolve(arguments);
        }).fail(function(){
          def.reject(arguments);
        });
      }
      //Hiding Deferred.{reject,resolve}():
      var promise = def.promise();
      //Showing that a study is loaded:
      var state = App.setupBar.pick('loaded','segments');
      if(state.loaded === 0 || state.loaded === state.segments){
        App.views.loadModalView.loadStudy(promise);
      }
      //Done:
      return promise;
    }
    /***/
  , getMapZoomCorners: function(){
      var cs = this.pick('DefaultTopLeftLat','DefaultTopLeftLon','DefaultBottomRightLat','DefaultBottomRightLon');
      return [{lat: cs.DefaultTopLeftLat,     lon: cs.DefaultTopLeftLon}
             ,{lat: cs.DefaultBottomRightLat, lon: cs.DefaultBottomRightLon}];
    }
    /***/
  , getLink: function(name){
      if(name in this._linkMap){
        var map = this._linkMap[name]
          , pv  = App.pageState.getPageViewKey();
        if(pv in map) return map[pv];
      }
      return App.router.linkCurrent({
        study: name
      , language:  ''
      , languages: ''
      , word:      ''
      , words:     ''
      });
    }
    /**
      Updates the link for the current study in the current pageView.
      This way it can be saved in this._linkMap, and be used for getLink.
    */
  , trackLinks: function(fragment){
      var name = this.getId()
        , pv   = App.pageState.getPageViewKey();
      if(!(name in this._linkMap)) this._linkMap[name] = {};
      this._linkMap[name][pv] = fragment;
    }
  });
});
