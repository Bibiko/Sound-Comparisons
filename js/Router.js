"use strict";
/**
  The router for our application.
  See http://backbonetutorials.com/what-is-a-router for basic info.
  The Router extends the Linker to gain different methods to create links that match its routes.
  The classes {Sanitizer,Configurator,Linker} where once part of the Router,
  but are now separated due to their different tasks and the want for shorter source files.
*/
var Router = Linker.extend({
  routes: {
    //Basic routes for pageViews:
    ":study/map/:word/:languages":                      "mapView"
  , ":study/map/:word/":                                "mapView"
  , ":study/map/:word":                                 "mapView"
  , ":study/map//":                                     "mapView"
  , ":study/map/":                                      "mapView"
  , ":study/map":                                       "mapView"
  , ":study/word/:word":                                "wordView"
  , ":study/word/":                                     "wordView"
  , ":study/word":                                      "wordView"
  , ":study/language/:language":                        "languageView"
  , ":study/language/":                                 "languageView"
  , ":study/language":                                  "languageView"
  , ":study/languagesXwords/:languages/:words":         "languageWordView"
  , ":study/languagesXwords/:languages/":               "languageWordView"
  , ":study/languagesXwords/:languages":                "languageWordView"
  , ":study/languagesXwords//:words":                   "languageWordView_" // Flipped parameters
  , ":study/languagesXwords//":                         "languageWordView"
  , ":study/languagesXwords/":                          "languageWordView"
  , ":study/languagesXwords":                           "languageWordView"
  , ":study/wordsXlanguages/:words/:languages":         "wordLanguageView"
  , ":study/wordsXlanguages/:words/":                   "wordLanguageView"
  , ":study/wordsXlanguages/:words":                    "wordLanguageView"
  , ":study/wordsXlanguages//:languages":               "wordLanguageView_" // Flipped parameters
  , ":study/wordsXlanguages//":                         "wordLanguageView"
  , ":study/wordsXlanguages/":                          "wordLanguageView"
  , ":study/wordsXlanguages":                           "wordLanguageView"
    //pageView routes with config info (config routes):
  , ":study/map/:word/:languages/*config":              "mapViewConfig"
  , ":study/word/:word/*config":                        "wordViewConfig"
  , ":study/language/:language/*config":                "languageViewConfig"
  , ":study/languagesXwords/:languages/:words/*config": "languageWordViewConfig"
  , ":study/wordsXlanguages/:words/:languages/*config": "wordLanguageViewConfig"
    //Various other routes:
  , 'whoAreWe':                                         "contributorView"
  , 'whoAreWe/:initials':                               "contributorView"
    //Route for missing implementations of links:
  , "FIXME":                                            "missingRoute"
  , "FIXME/*infos":                                     "missingRoute"
    //ShortLinks:
  , ":shortLink":                                       "shortLink"
    //Catch all route:
  , "*actions":                                         "defaultRoute"
  }
, initialize: function(){
    //The Router looks for missing routes itself:
    this.on('route:missingRoute', function(infos){
      if(infos){
        console.log('Router found missing route with infos: '+infos);
      }else{
        console.log('Router found missing route.');
      }
      App.views.renderer.render();
    }, this);
    /**
      The Router acts as a proxy in that it processes all config routes,
      and afterwards triggers the basic routes.
    */
    var configRoutes = ["mapView", "wordView", "languageView", "languageWordView", "wordLanguageView"];
    _.each(configRoutes, function(r){
      var c = r+'Config';
      this.on('route:'+c, function(){
        //Process configuration:
        this.configure(_.last(arguments));
        //Triger non config route:
        var forward = _.take(arguments, arguments.length - 1);
        forward.unshift('route:'+r);
        this.trigger.apply(this, forward);
      }, this);
    }, this);
    /**
      The Router handles shortLinks and triggers navigating them.
      We don't want the URL to change, but we'd like the router to act as if it changed.
      https://stackoverflow.com/questions/17334465/backbone-js-routing-without-changing-url
    */
    this.on('route:shortLink', function(shortLink){
      var slMap = App.dataStorage.getShortLinksMap();
      if(shortLink in slMap){
        var url = slMap[shortLink]
          , matches = url.match(/^[^#]*#(.+)$/);
        if(matches){
          var fragment = matches[1];
          Backbone.history.loadUrl(fragment);
        }
      }else{
        console.log('Could not route shortLink: '+shortLink);
        App.views.renderer.render();
      }
    }, this);
    /**
      We should at least render on defaultRoute.
    */
    this.on('route:defaultRoute', function(r){
      console.log('Router.defaultRoute('+r+')');
      App.views.renderer.render();
    }, this);
  }
});
