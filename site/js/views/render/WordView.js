"use strict";
define(['views/render/SubView'], function(SubView){
  return SubView.extend({
    initialize: function(){
      this.model = {};
      //Connecting to the router
      App.router.on('route:wordView', this.route, this);
    }
    /**
      Method to make it possible to check what kind of PageView this Backbone.View is.
    */
  , getKey: function(){return 'word';}
    /**
      Generates the WordHeadline for WordView,
      but might also be used to build the WordHeadline for MapView aswell.
    */
  , updateWordHeadline: function(){
      var word = App.wordCollection.getChoice();
      if(!word){
        console.log('WordView.updateWordHeadline() with no word.');
        return;
      }
      var spLang   = App.pageState.getSpLang()
        , headline = {name: word.getNameFor(spLang)}
        , longName = word.getLongName();
      //Sanitize name:
      if(_.isArray(headline.name))
        headline.name = headline.name.join(', ');
      if(!_.isString(longName)){
        longName = '';
      }
      // temporary solution to process longName
      // in the docs: longName provides additional info _OR_ the complete long form
      //    - logically this doesn't work
      // that's why the following workaround:
      //    - ignore if name == longForm
      //    - if longForm begins with '(' and ends with ')'append longForm to name
      //         otherwise set name = longForm
      longName = longName.trim();
      if (longName !== '') {
        if (spLang !== null){
          headline['stname'] = longName;
        }else{
          headline.name = longName;
        }
      }else{
        if (spLang !== null){
          var st = word.getNameFor(null);
          if (st !== headline.name){
            headline['stname'] = st;
          }
        }
      }
      //MapsLink:
      if(!App.pageState.isPageView('map')){
        headline.mapsLink = {
          link: 'href="'+App.router.linkMapView({word: word})+'"'
        , ttip: App.translationStorage.translateStatic('tooltip_words_link_mapview')
        };
      }
      //ConcepticonLink:
      if(word.get('StudyDefaultConcepticonID') !== '0'){
        headline.concepticonLink = {
          link: 'href="https://concepticon.clld.org/parameters/'+word.get('StudyDefaultConcepticonID')+'" target="_new"'
        , ttip: App.translationStorage.translateStatic('tooltip_words_link_concepticon')
        };
      }
      //Neighbours:
      var withN = function(w){
        return {
          link:  'href="'+App.router.linkCurrent({word: w})+'"'
        , ttip:  w.getLongName()
        , trans: w.getNameFor(spLang)
        };
      };
      //Previous Word:
      headline.prev = $.extend(withN(word.getPrev())
      , {title: App.translationStorage.translateStatic('tabulator_word_prev')});
      //Next Word:
      headline.next = $.extend(withN(word.getNext())
      , {title: App.translationStorage.translateStatic('tabulator_word_next')});
      //Done:
      _.extend(this.model, {wordHeadline: headline});
    }
    /**
      Generates the WordTable for WordView.
    */
  , updateWordTable: function(){
      //The word to use:
      var word = App.wordCollection.getChoice();
      if(!word){
        console.log('WordView.updateWordTable() with no word.');
        return;
      }
      //Words per row:
      var wordCount = 5;
      //Calculating the maximum number of language cols:
      var maxLangCount = _.chain(App.regionCollection.models).map(function(r){
        var c = r.getLanguages().length;
        return (c > wordCount) ? wordCount : c;
      }).max().value();
      //Do we color by family?
      var colorByFamily = App.study.getColorByFamily();
      //Building the table:
      var table = {
        wordHeadlinePlayAll: App.translationStorage.translateStatic('wordHeadline_playAll')
      , rows: []
      };
      //We iterate the tree families->regions->languages and construct rows from that.
      App.familyCollection.each(function(f){
        var family = {rowSpan: 0, name: f.getName()};
        if(colorByFamily) family.color = f.getColor();
        //Regions to deal with:
        var regions = [];
        f.getRegions().each(function(r){
          var region = {name: r.getShortName()}
            , languages = r.getLanguages();
          if(!colorByFamily) region.color = r.getColor();
          //Calculating the rowSpan for the current region:
          region.rowSpan  = _.max([Math.ceil(languages.length / wordCount), 1]);
          family.rowSpan += region.rowSpan;
          //Further handling of languages; lss :: [[LanguageCell]]
          var cellCount = maxLangCount, lss = [], ls = [];
          languages.each(function(l){
            //Swapping ls over to lss:
            if(cellCount === 0){
              lss.push(ls);
              ls = [];
              cellCount = maxLangCount;
            }
            //Generating a LanguageCell:
            var cell = {
              isLanguageCell: true
            , link: 'href="'+App.router.linkLanguageView({language: l})+'"'
            , shortName: l.getSuperscript(l.getShortName())
            , longName:  l.getLongName()
            };
            var t = App.transcriptionMap.getTranscription(l, word)
              , s = (t !== null) ? t.getAltSpelling() : null;
            if(s) cell.spelling = s;
            if(t !== null){
              cell.phonetic = t.getPhonetics();
            }
            //Filling ls:
            ls.push(cell);
            cellCount--;
          }, this);
          //Handling empty languageCells:
          for(;cellCount > 0; cellCount--){ls.push({isLanguageCell: true});}
          lss.push(ls);
          //Filling regions from lss:
          _.each(lss, function(ls, i){
            if(i === 0) ls.unshift(region);
            regions.push(ls);
          }, this);
        }, this);
        //Adding to the rows:
        var row = {cells: []};
        if(parseInt(f.getId()) !== 0) row.spaceRow = true;
        _.each(regions, function(cells, i){
          if(i === 0){
            if(App.familyCollection.length > 1)
            cells.unshift(family);
          }
          row.cells = cells;
          table.rows.push(row);
          row = {cells: []};
        }, this);
      }, this);
      //Done:
      _.extend(this.model, {WordTable: table});
    }
    /***/
  , render: function(){
      if(App.pageState.isPageView(this)){
        this.$el.html(App.templateStorage.render('WordTable', this.model));
        this.$el.removeClass('hide');
        //Updating sound related stuff:
        App.views.audioLogic.findAudio(this.$el);
        App.views.playSequenceView.update(this.getKey());
      }else{
        this.$el.addClass('hide');
      }
    }
    /***/
  , route: function(siteLanguage, study, word){
      var parse = App.router.parseString;
      study = parse(study);
      word = parse(word);
      // if word is missing and first parameter is a valid study
      // then user asked for /:Study/word/:Word
      if((!word || word.length == 0) && !_.contains(App.study.getAllIds(), study)){
        var s = study;
        study = siteLanguage;
        word = s;
        siteLanguage = App.translationStorage.getBrowserMatch();
      }
      console.log('WordView.route('+siteLanguage+', '+study+', '+word+')');
      var t = this;
      //Setting siteLanguage and study:
      this.loadBasic(siteLanguage, study).always(function(){
        //Setting the word:
        App.wordCollection.setChoiceByKey(word);
        //Set this pageView as active:
        App.pageState.setPageView(t.getKey());
        //Render:
        App.views.renderer.render();
      });
    }
  });
});
