"use strict";
define(['views/render/SubView'], function(SubView){
  return SubView.extend({
    initialize: function(){
      this.model = {};
      //Connecting to the router
      App.router.on('route:wordLanguageView', this.route, this);
      App.router.on('route:wordLanguageView_',
                    function(s,w,l){return this.route(s,l,w);}, this);
    }
    /**
      Method to make it possible to check what kind of PageView this Backbone.View is.
    */
  , getKey: function(){return 'wordsXlanguages';}
    /**
      Function to call non /^update.+/ methods that are necessary for the model, and to setup their callbacks.
    */
  , activate: function(){
      //Setting callbacks to update model:
      App.translationStorage.on('change:translationId', this.buildStatic, this);
      //Building statics the first time:
      this.buildStatic();
    }
    /**
      @return href String 'href="…"'
    */
  , getTransposeLink: function(){
      return 'href="'+App.router.linkLanguageWordView({
        words: App.wordCollection.getSelected()
      , languages: App.languageCollection.getSelected()
      })+'"';
    }
    /**
      Also used for LanguageWordView.buildStatic
    */
  , buildStatic: function(){
      var staticT = App.translationStorage.translateStatic({
        deleteAll:          'tabulator_multi_clear_all'
      , clearWordsText:     'tabulator_multi_clear_words'
      , clearLanguagesText: 'tabulator_multi_clear_languages'
      , transposeTtip:      'tabulator_multi_transpose'
      , tableAlert:         'tabulator_multi_alert'
      });
      var tLink = App.views.renderer.model.wordLanguageView.getTransposeLink();
      staticT.tableAlert = App.translationStorage.placeInTranslation(staticT.tableAlert, [
        '<a class="proxyHideLink" data-name="hidelink_left"><i class="icon-chevron-left"></i></a>'
      , '<a class="proxyHideLink" data-name="hidelink_right"><i class="icon-chevron-right"></i></a>'
      , '<a '+tLink+'><img src="img/transpose.png"></a>'
      ]);
      _.extend(this.model, staticT);
    }
    /***/
  , updateTable: function(){
      //Setup:
      var rBkts = App.regionCollection.getRegionBuckets(App.languageCollection.getSelected())
        , rMap  = rBkts.rMap // RegionId -> Region
        , lMap  = rBkts.lMap // RegionId -> [Language]
        , wBkts = App.meaningGroupCollection.getMeaningGroupBuckets(App.wordCollection.getSelected())
        , mMap  = wBkts.mMap // MgId -> MeaningGroup
        , wMap  = wBkts.wMap // MgId -> [Word]
        , table = {
            clearWordsLink:     'href="'+App.router.linkWordLanguageView({words: []})+'"'
          , clearLanguagesLink: 'href="'+App.router.linkWordLanguageView({languages: []})+'"'
          , transposeLink:      this.getTransposeLink()
          , rows: []
          }, basic;
      /*
        The thead consists of multiple rows: regions, delete and languages, plays.
      */
      //The Regions:
      table.regions = _.map(rMap, function(r, rId){
        return { cspan: lMap[rId].length
               , color: r.getColor()
               , name:  r.getShortName() };
      }, this);
      //The Languages:
      var languages = _.flatten(_.values(lMap));
      if(languages.length === 0){
        table.languages = _.map([1,2,3], function(i){
          return {isFake: true, shortName: App.translationStorage.translateStatic('tabulator_multi_langrow')+' '+i};
        }, this);
      }else{
        basic = _.extend({isFake: false}, App.translationStorage.translateStatic({
          deleteLanguageTtip: 'tabulator_multi_tooltip_removeLanguage'
        , playTtip:           'tabulator_multi_playlang'
        }));
        table.languages = _.map(languages, function(l){
          var remaining = App.languageCollection.getDifference(languages, [l]);
          return _.extend({}, basic, {
            shortName: l.getSuperscript(l.getShortName())
          , ttip:      l.getLongName()
          , link:      'href="'+App.router.linkLanguageView({language: l})+'"'
          , deleteLanguageLink: 'href="'+App.router.linkWordLanguageView({languages: remaining})+'"'
          });
        }, this);
      }
      //thead complete, content for rows:
      //MeaningGroups and Words:
      var meaningGroups = [], words = [];
      if(table.isLogical){
        var clearRow = 3 + (languages.length || 3);
        meaningGroups = _.map(mMap, function(m, mId){
          words.push(wMap[mId]);//We also fill the words:
          return { clearRow: clearRow
                 , name:     m.getName()
                 , rSpan:    wMap[mId].length };
        }, this);
        words = _.flatten(words);
      }else{ // For non logical order:
        words = _.flatten(_.values(wMap));
        words.sort(App.wordCollection.comparator);
      }
      //Helper function for faking Transcriptions:
      var fakeTrans = function(i, j){
        return { fake: _.all([i < 3, j < 3, i === 3 || j === 3]) ? App.translationStorage.translateStatic('tabulator_multi_cell'+i+j) : ''
        };
      };
      //Faking words iff necessary:
      if(words.length === 0){
        words = _.map([0,1,2], function(j){
          var w = { fake: true
                  , trans: App.translationStorage.translateStatic('tabulator_multi_wordcol')+' '+(j+1)
                  , transcriptions: [] }
            , iMax = languages.length || 3;
          //Transcriptions:
          for(var i = 0; i < iMax; i++){
            w.transcriptions.push(fakeTrans(i, j));
          }
          return w;
        }, this);
      }else{//Filling non-fake words with content:
        basic = _.extend({fake: false}, App.translationStorage.translateStatic({
              deleteWordTtip: 'tabulator_multi_tooltip_removeWord'
            , playTtip:       'tabulator_multi_playword'}));
        var spLang = App.pageState.getSpLang()
          , mTtip  = App.translationStorage.translateStatic('tooltip_words_link_mapview');
        words = _.map(words, function(w, j){
          var remaining = App.wordCollection.getDifference(words, [w])
            , word = _.extend({}, basic, {
            link:           'href="'+App.router.linkWordView({word: w})+'"'
          , ttip:           w.getLongName()
          , trans:          w.getModernName()
          , deleteWordLink: 'href="'+App.router.linkWordLanguageView({words: remaining})+'"'
          , maps:           {link: 'href="'+App.router.linkMapView({word: w})+'"', ttip: mTtip}
          });
          //Transcriptions:
          if(languages.length === 0){
            word.transcriptions = _.map([0,1,2], function(i){return fakeTrans(i,j);}, this);
          }else{
            word.transcriptions = _.map(languages, function(l){
              var tr = App.transcriptionMap.getTranscription(l, w);
              return {spelling: tr.getAltSpelling(), phonetic: tr.getPhonetics()};
            }, this);
          }
          return word;
        }, this);
      }
      //Composing the rows:
      _.each(meaningGroups, function(m){
        var count = m.rSpan;
        _.each(_.first(words, count), function(w, i){
          var row = {words: [w]};
          table.rows.push(row);
        }, this);
        words = _.rest(words, count);
      }, this);
      _.each(words, function(w){table.rows.push({words: [w]});}, this);
      //Done:
      _.extend(this.model, table);
    }
    /***/
  , render: function(){
      if(App.pageState.isPageView(this)){
        this.$el.html(App.templateStorage.render('MultitableTransposed', {MultitableTransposed: this.model}));
        this.$el.removeClass('hide');
        //Updating sound related stuff:
        App.views.audioLogic.findAudio(this.$el);
        App.views.playSequenceView.update(this.getKey());
        //Checking if the alert should be shown:
        var t = this;
        window.setTimeout(function(){t.checkAlert();}, 1000);
      }else{
        this.$el.addClass('hide');
      }
    }
  , checkAlert: function(){
      var t = Math.ceil(this.$('table').width())
        , c = Math.ceil($('#contentArea').width())+1;
      if(t > c){
        this.$('div.alert').removeClass('hide');
        //Making sure proxyHideLinks are useful:
        window.App.views.hideLinks.handleProxyHideLinks();
      }
    }
    /***/
  , route: function(siteLanguage, study, words, languages){
      var parse = App.router.parseString;
      study = parse(study);
      console.log('WordLanguageView.route('+study+', '+words+', '+languages+')');
      var t = this;
      //Setting siteLanguage and study:
      this.loadBasic(siteLanguage, study).always(function(){
        var pv = t.getKey();
        //Setting the words:
        App.wordCollection.setSelectedByKey(App.router.parseArray(words),pv);
        //Setting the languages:
        App.languageCollection.setSelectedByKey(App.router.parseArray(languages),pv);
        //Set this pageView as active:
        App.pageState.setPageView(pv);
        //Render:
        App.views.renderer.render();
      });
    }
  });
});
