"use strict";
/***/
var MapView = Renderer.prototype.SubView.extend({
  /***/
  initialize: function(){
    //Data representation created by update methods:
    this.model = {}; // Notice that we also make heavy use of App.map
    //Map setup:
    this.div = document.getElementById("map_canvas");
    this.map = new google.maps.Map(this.div, App.map.get('mapOptions'));
    this.renderMap();
    //SoundControlView:
    this.soundControlView = new SoundControlView({
      el: this.map, model: this});
    if(typeof(MouseTrackView) !== 'undefined'){
      this.mouseTrackView = new MouseTrackView({
      el: this.map, model: this});
    }
    //Window resize
    var view = this;
    $(window).resize(function(){view.adjustCanvasSize();});
    google.maps.event.addListener(this.map, 'zoom_changed', function(){
      App.map.placeWordOverlays();
    });
    //Handle zooming via mouse on clicking the map:
    google.maps.event.addListener(this.map, 'mousedown', function(){
      view.setScrollWheel(true);
    });
    $('body').on('mousedown', function(e){
      var onMap = $(event.target).parents('#map_canvas').length > 0;
      if(!onMap){
        view.setScrollWheel(false);
      }
    });
    //Connecting to the router
    App.router.on('route:mapView', this.route, this);
  }
  /**
    Method to make it possible to check what kind of PageView this Backbone.View is.
  */
, getKey: function(){return 'map';}
  /***/
, activate: function(){
    //Setting callbacks to update model:
    App.translationStorage.on('change:translationId', this.buildStatic, this);
    //Building statics the first time:
    this.buildStatic();
  }
  /***/
, buildStatic: function(){
    _.extend(this.model, App.translationStorage.translateStatic({
      mapsMenuToggleShow: 'maps_menu_toggleShow'
    , mapsMenuViewAll:    'maps_menu_viewAll'
    , mapsMenuViewLast:   'maps_menu_viewLast'
    , mapsMenuCenterMap:  'maps_menu_centerMap'
    , mapsMenuCoreRegion: 'maps_menu_viewCoreRegion'
    , mapsMenuPlayNs:     'maps_menu_playNs'
    , mapsMenuPlaySn:     'maps_menu_playSn'
    , mapsMenuPlayWe:     'maps_menu_playWe'
    , mapsMenuPlayEw:     'maps_menu_playEw'
    }));
  }
  /**
    We need the same WordHeadline as WordView, so we reuse it for MapView.
    Sadly we still need a proxy function, at least to make sure WordView is already defined.
  */
, updateWordHeadline: function(){
    return WordView.prototype.updateWordHeadline.call(this, arguments);
  }
  /***/
, updateLinks: function(){
    var lc = App.languageCollection;
    _.extend(this.model, {
      viewAll:     'href="'+App.router.linkConfig({MapViewIgnoreSelection: true})+'"'
    , viewLast:    'href="'+App.router.linkConfig({MapViewIgnoreSelection: false})+'"'
    , allSelected: lc.length === lc.getSelected().length
    });
  }
  /***/
, updateMapsData: function(){
    var data = {
      transcriptions: []
    , regionZoom: App.study.getMapZoomCorners()
    }, word = App.wordCollection.getChoice();
    //Iterating languages:
    var languages = App.pageState.get('mapViewIgnoreSelection')
                  ? App.languageCollection.models
                  : App.languageCollection.getSelected();
    _.each(languages, function(l){
      var latlon = l.getLocation();
      if(latlon === null) return;
      var tr = App.transcriptionMap.getTranscription(l, word);
      //Creating psf entries:
      var psf = [];
      if(tr !== null){
        psf = _.map(tr.getPhonetics(), function(p){
          return { phonetic:   p.phonetic
                 , soundfiles: p._srcs };
        }, this);
      }
      //The complete structure:
      data.transcriptions.push({
        altSpelling:        (tr !== null) ? tr.getAltSpelling() : ''
      , translation:        word.getNameFor(l)
      , lat:                latlon[0]
      , lon:                latlon[1]
      , historical:         l.isHistorical() ? 1 : 0
      , phoneticSoundfiles: psf
      , langName:           l.getShortName()
      , languageLink:       'href="'+App.router.linkLanguageView({language: l})+'"'
      , familyIx:           l.getFamilyIx()
      , color:              l.getColor()
      });
    }, this);
    //Done:
    _.extend(this.model, {mapsData: data});
  }
  /***/
, render: function(){
    if(App.pageState.isPageView(this)){
      //Rendering the template:
      this.$el.html(App.templateStorage.render('MapView', {MapView: this.model}));
      //Binding click events:
      this.bindEvents();
      //Updating SoundControlView:
      this.soundControlView.update();
      //Setting mapsData to map model:
      App.map.setModel(this.model.mapsData);
      //Displaying stuff:
      this.$el.removeClass('hide');
      $('#map_canvas').removeClass('hide');
      this.renderMap();
    }else{
      this.$el.addClass('hide');
      $('#map_canvas').addClass('hide');
    }
  }
  /***/
, route: function(study, word, languages){
    console.log('MapView.route('+study+', '+word+', '+languages+')');
    var pv = this.getKey();
    //Setting the study:
    App.study.setStudy(study).always(function(){
      //Setting the word:
      App.wordCollection.setChoiceByKey(word);
      //Setting the languages:
      App.languageCollection.setSelectedByKey(App.router.parseArray(languages));
      //Set this pageView as active:
      App.pageState.setPageView(pv);
      //Render:
      App.views.renderer.render();
    });
  }
  /**
    This method fixes the view level to the regionBounds
    once the study is changed or it is called the first time.
    This method also calls adjustCanvasSize.
  */
, renderMap: function(){
    var first = true;
    this.renderMap = function(){
      (function(t){
        /*
          It would be nice to depend on events rather than a Timeout,
          but events appeared to be rather annoying while this is simple.
        */
        window.setTimeout(function(){
          t.adjustCanvasSize();
          if(first || App.studyWatcher.studyChanged()){
            first = false; t.centerRegion();
          }
        }, 10000);
      })(this);
    }
    return this.renderMap();
  }
  /**
    A method to make sure that the canvas size equals the maximum size possible in the current browser window.
  */
, adjustCanvasSize: function(){
    var canvas = $('#map_canvas')
      , offset = canvas.offset();
    if(canvas.length === 0) return;
    canvas.css('height', window.innerHeight - offset.top - 1 + 'px');
    google.maps.event.trigger(this.map, "resize");
  }
  /**
    Since the render method replaces some elements,
    it makes sense to have a method that binds all events for them,
    so that the event callbacks can easily be setup again.
  */
, bindEvents: function(){
    var t = this;
    _.each({'#map_menu_zoomCenter': 'centerDefault', '#map_menu_zoomCoreRegion': 'centerRegion'}
    , function(mName, tgt){
      this.$(tgt).click(function(){
        t[mName].call(t);
      });
    }, this);
  }
  /**
    Centers the Map on the given default.
  */
, centerDefault: function(){
    this.map.fitBounds(App.map.get('defaultBounds'));
    $('#map_menu_zoomCenter').addClass('selected');
    $('#map_menu_zoomCoreRegion').removeClass('selected');
  }
  /**
    Centers the Map on the given region.
  */
, centerRegion: function(){
    this.map.fitBounds(App.map.get('regionBounds'));
    $('#map_menu_zoomCoreRegion').addClass('selected');
    $('#map_menu_zoomCenter').removeClass('selected');
  }
  /**
    Fills a PlaySequence with currently displayed entries from the map in the given direction.
  */
, fillPSeq: function(direction, playSequence){
    var wos = App.map.sortWordOverlays(direction);
    _.chain(wos).filter(function(wo){
      var view = wo.get('view');
      if(wo.get('added') && view)
        return view.onScreen();
      return false;
    }).each(function(wo){
      playSequence.add(wo.getAudio());
    });
  }
  /**
    A method to compute a BoundingBox for the div that the map_canvas belongs to, relative to the browser viewport.
    The algorithm to do so comes from http://stackoverflow.com/questions/211703/is-it-possible-to-get-the-position-of-div-within-the-browser-viewport-not-withi
  */
, getBBox: function(){
    var e = this.div, offset = {x:0,y:0};
    //We traverse the parents of e to accumulate it's offsets:
    while(e){
      offset.x += e.offsetLeft;
      offset.y += e.offsetTop;
      e = e.offsetParent;
    }
    //We factor in the current scroll positions/page offsets:
    if(document.documentElement && (document.documentElement.scrollTop || document.documentElement.scrollLeft)){
      offset.x -= document.documentElement.scrollLeft;
      offset.y -= document.documentElement.scrollTop;
    }else if (document.body && (document.body.scrollTop || document.body.scrollLeft)){
      offset.x -= document.body.scrollLeft;
      offset.y -= document.body.scrollTop;
    }else if (window.pageXOffset || window.pageYOffset){
      offset.x -= window.pageXOffset;
      offset.y -= window.pageYOffset;
    }
    //We complete the representation of our BBox:
    e = $(this.div);
    return {
      x1: offset.x
    , y1: offset.y
    , x2: offset.x + e.width()
    , y2: offset.y + e.height()
    , w:  e.width()
    , h:  e.height()
    };
  }
  /**
    Per default, the map doesn't care for the scroll wheel,
    but this functions allows us to change that.
  */
, setScrollWheel: function(use){
    return this.map.setOptions({scrollwheel: use});
  }
});