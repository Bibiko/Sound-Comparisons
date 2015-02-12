/* global WordlistFilter: true */
"use strict";
/**
  Controls the filter box and mitigates it's effects.
*/
var WordlistFilter = Backbone.View.extend({
  storage: {
    content:    'wordlistfilter_content'
  , inputId:    'wordlistfilter_inputId'
  , selectedId: 'wordlistfilter_selectedId'
  }
  /***/
, initialize: function(){
    App.pageState.on('change:pageView', this.clearStorage, this);
  }
/*
  This fullfills the works of initialize, but may also be called later on.
  The point is, that almost everything related to initialization may change,
  as parts of the page will be replaced on navigation.
*/
, reinitialize: function(){
    if(window.App.studyWatcher.studyChanged()){
      this.clearStorage();
    }else{
      $(App.storage[this.storage.selectedId]).addClass('selected');
      $(App.storage[this.storage.inputId]).val(App.storage[this.storage.content] || '');
    }
    //Checking if we can filter the languageTable aswell:
    this.hasLanguageTable = App.pageState.isPageView('l');
    //Binding events:
    var t = this;
    $('#SpellingFilter').keyup(function(){ t.spellingFilter(); });
    $('#PhoneticFilter').keyup(function(){ t.phoneticFilter(); });
    $('#FilterAddMultiWords').click(function(){ t.pathfinder(true); });
    $('#FilterRefreshMultiWords').click(function(){ t.pathfinder(false); });
    $('#FilterClearMultiWords').click(function(){
      (function(r){
        var fragment = r.linkCurrent({config: r.getConfig(), words: []});
        r.navigate(fragment);
        App.study.trackLinks(fragment);
      })(App.router);
    });
    //Initial triggers:
    if($('#SpellingFilter').val() !== ''){
      this.spellingFilter();
    }
    if($('#PhoneticFilter').val() !== ''){
      this.phoneticFilter();
    }
    this.updateCount();
  }
, clearStorage: function(){
    _.each(_.values(this.storage), function(k){
      delete App.storage[k];
    });
    return this;
  }
, setStorage: function(selectedId, inputId, content){
    App.storage[this.storage.selectedId] = selectedId || '';
    App.storage[this.storage.inputId]    = inputId    || '';
    App.storage[this.storage.content]    = content    || '';
    return this;
  }
, chkInput: function(input){
    if(input === ''){
      $('#FilterSpelling').removeClass('selected');
      $('#FilterPhonetic').removeClass('selected');
      this.clearStorage();
    }
    return this;
  }
  //Extends the input string so that it matches IPA Symbols.
, enhanceIPA: function(input){
    if(input === null || typeof(input) === 'undefined' || input === '')
      return input;
    var vMust  = 'iyɨʉɯuɪʏʊeøɘɵɤoəɛœɜɞʌɔæɐaɶɑɒɚɝ'; // All from vowels section
    var vMay   = '˥˦˧˨˩↓↑↗↘̋́̄̀̏᷈᷅᷄̂̌ˈˌːˑ̆|‖.‿̃˔̟̹̜̠̝˕˞̞̰̤̥̈̽';           // All from tone
    var cMain  = 'pbtdʈɖɟɟkɡqɢʔmɱnɳɲŋɴʙrʀⱱɾɽɸβfvθðszʃʒʂʐçʝxɣχʁħʕhɦɬɮʋɹɻjɰlɭʎʟɫ'; // All from consonants main
    var cOther = 'ʼɓɗʄɠʛʘǀǃǂǁʍʡʬ¡wɕʭǃ¡ɥʑʪʜɺʫʢɧʩ'; // All from consonants other 
    var cAdditional = 'ː'; // ː from vowels
    var cNasal  = 'mɱnɳɲŋɴ'; // From consonants all in nasal row.
    var vNasal  = '̃'; // ~ from vowels nasalised
    var fMain   = 'ɸβfvθðszʃʒʂʐçʝxɣχʁħʕhɦɬɮ'; // [Lateral-]Fricative from consonants main
    var fOther  = 'ɕʑɧ'; // Selection from consonants other
    var stMain  = 'pbtdʈɖɟɟkɡqɢʔ'; // All in plosive from consonants main
    var stOther = 'ɓɗʄɠʛʘǀǃǂǁ'; // All in voiced, imposives and clicks from consonants other
    //Replacing the input:
    input = input.replace(/V/g,     '[' + vMust + '][' + vMay + ']*'); // vowels
    input = input.replace(/C/g,     '[' + cMain + cOther + cAdditional + ']'); // consonants
    input = input.replace(/N/g,     '[' + cNasal + vNasal + ']'); // nasal
    input = input.replace(/FL/g,    '[ɬɮʋɹɻjɰ]'); // All from lateral {friccative, approx.}
    input = input.replace(/R/g,     '[ʋɹɻʀʁχrɾⱱ˞]'); // Selection by Paul
    input = input.replace(/A/g,     '(tʃ|ts|tθ|ʈʂ|dʒ|dz|dð|ɖʐ|pf|bβ|kx|ɡɣ)'); // affricate
    input = input.replace(/F/g,     '[' + fMain + fOther + ']'); // fricative, lateral friccative
    input = input.replace(/(S|T)/g, '[' + stMain + stOther + ']');
    input = input.toLowerCase();
    return input;
  }
//Projection from the LanguageTable to a filterSet
, getLanguageTableSet: function(useTranscriptions){
    //If ¬useTranscriptions we use words to filter on.
    var set = $('#languageTable td.transcription').map(function(i, e){
      return { target: $(e)
             , text:   useTranscriptions ? $('div.transcription', e).text()
                                         : $('.color-word', e).text()
      };
    });
    return set;
  }
//Updating the count of filtered words:
, updateCount: function(){
    var c = $('ul.wordList li:visible').size();
    $('#FilterFoundMultiWords').text(c);
    if(c === 0){
      var i = $('#PhoneticFilter');
      if(i.val() === '')
        i = $('#SpellingFilter');
      if(i.val() === '')
        return;
      i.addClass('filterempty');
    }else{
      $('#PhoneticFilter, #SpellingFilter').removeClass('filterempty');
    }
    return this;
  }
//The magic filter function:
, filter: function(set, input){
    //General rewriting of input:
    if(typeof(input) === 'string'){
      input = input.replace(/^#/, '^');
      input = input.replace(/#$/, '$');
    }
    //Filtering the set against the input:
    $(set).each(function(i, e){
      var word = e.text.toLowerCase();
      if(word.search(input) >= 0)
        e.target.show();
      else
        e.target.hide();
    });
    return this.updateCount();
  }
, spellingFilter: function(){
    $('#PhoneticFilter').val('');
    $('#FilterPhonetic').removeClass('selected');
    $('#FilterSpelling').addClass('selected');
    var v =  $('#SpellingFilter').val();
    var input = (!_.isEmpty(v)) ? v.toLowerCase() : '';
    this.setStorage('#FilterSpelling', '#SpellingFilter', input);
    var elems = $('ul.wordList .color-word').map(function(i, e){
      return {text: $(e).text(), target: $(e).closest('li')};
    });
    this.filter(elems, input);
    if(this.hasLanguageTable){
      this.filter(this.getLanguageTableSet(false), input);
      App.views.renderer.model.languageView.redraw();
    }
    return this.chkInput(input);
  }
, phoneticFilter: function(){
    $('#SpellingFilter').val('');
    $('#FilterSpelling').removeClass('selected');
    $('#FilterPhonetic').addClass('selected');
    var input = $('#PhoneticFilter').val();
    this.setStorage('#FilterPhonetic', '#PhoneticFilter', input);
    var elems = $('ul.wordList .p50:nth-child(2)').map(function(i, e){
      var element = $(e)
        , string  = element.text()
        , matches = string.match(/\s*\[\s*([^\s]*)\s*\]\s*/);
      if(matches.length <= 1){
        console.log('WordlistFilter.phoneticFilter() could not find any matches for string:\n\t'+string);
        return null;
      }
      return {text: matches[1], target: element.closest('li')};
    });
    this.filter(elems, this.enhanceIPA(input));
    if(this.hasLanguageTable){
      this.filter(this.getLanguageTableSet(true), input);
      App.views.renderer.model.languageView.redraw();
    }
    return this.chkInput(input);
  }
//The function that leads the way:
, pathfinder: function(keep){
    var words = keep ? App.wordCollection.getSelected() : []
      , wIds  = {};
    //Finding currently visible words:
    $('ul.wordList li:visible').each(function(){
      if($(this).parent().hasClass('selected'))
        return;
      var wId = $('.color-word', this).attr('data-wordId');
      wIds[wId] = true;
    });
    //Adding to words:
    App.wordCollection.each(function(w){
      if(w.getId() in wIds){
        words.push(w);
      }
    });
    //Updating fragment:
    (function(r){
      var fragment = r.linkCurrent({config: r.getConfig(), words: words});
      r.navigate(fragment);
      App.study.trackLinks(fragment);
    })(App.router);
  }
});
