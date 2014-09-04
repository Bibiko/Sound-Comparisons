/**
  The TopMenuView will be used by the Renderer.
  The TopMenuView will set it's own model to handle and smartly update it's render data.
*/
TopMenuView = Backbone.View.extend({
  initialize: function(){
    //Setting callbacks to update model:
    App.translationStorage.on('change:translationId', function(){
      this.updateEntries();
      this.updatePageViews();
      this.updateStatic();
      this.updateStudy();
      this.updateTranslations();
    }, this);
    App.study.on('change:Name', this.updateStudy, this);
    //FIXME add missing callbacks
    this.model = {
      formats: ['mp3','ogg']
    };
  }
  /**
    Overwrites the current model with the given one performing a deep merge.
  */
, setModel: function(m){
    this.model = $.extend(true, this.model, m);
  }
  /***/
, updateStatic: function(){
    var staticT = App.translationStorage.translateStatic({
      logoTitle:       'website_logo_hover'
    , pageViewTitle:   'topmenu_views'
    , csvTitle:        'topmenu_download_csv'
    , sndLink:         'export/soundfiles'
    , sndTitle:        'topmenu_download_zip'
    , cogTitle:        'topmenu_download_cogTitle'
    , wordByWord:      'topmenu_download_wordByWord'
    , format:          'topmenu_download_format'
    , soundClickTitle: 'topmenu_soundoptions_tooltip'
    , soundHoverTitle: 'topmenu_soundoptions_hover'
    });
    this.setModel(staticT);
  }
  /***/
, updateStudy: function(){
    var data = {
      currentStudyName: App.study.getName()
    };
    data.studies = _.map(App.study.getAllNames(), function(n){
      return {
        currentStudy: n === data.currentStudyName
      , link: 'href="#FIXME/TopMenuView:updateStudy"' // FIXME implement link building
      , studyName: n
      };
    }, this);
    this.setModel(data);
  }
  /***/
, updatePageViews: function(){
    var hovers = App.translationStorage.translateStatic({
      m:  'topmenu_views_mapview_hover'
    , w:  'topmenu_views_wordview_hover'
    , l:  'topmenu_views_languageview_hover'
    , lw: 'topmenu_views_multiview_hover'
    , wl: 'topmenu_views_multitransposed_hover'
    });
    var names = App.translationStorage.translateStatic({
      m:  'topmenu_views_mapview'
    , w:  'topmenu_views_wordview'
    , l:  'topmenu_views_languageview'
    , lw: 'topmenu_views_multiview'
    , wl: 'topmenu_views_multitransposed'
    });
    var images = {
      m:  'maps.png'
    , w:  '1w.png'
    , l:  '1l.png'
    , lw: 'lw.png'
    , wl: 'wl.png'
    };
    var t = this, produce = function(pageView, key){
      var data = {
        link:    'href="#FIXME/TopMenuView:updatePageViews"' // FIXME implement link building
      , content: t.tColor(key, names[key])
      , title:   hovers[key]
      , img:     images[key]};
      if(false){ //FIXME add active field to data iff necessary.
        data.active = true;
      }
      return data;
    };
    this.setModel({pageViews: [
      produce(null, 'm')
    , produce(null, 'w')
    , produce(null, 'l')
    , produce(null, 'lw')
    , produce(null, 'wl')
    ]});
  }
  /***/
, updateTranslations: function(){
    this.setModel({
      currentFlag: App.translationStorage.getFlag()
    , otherTranslations: _.map(App.translationStorage.getOthers(), function(tId){
        return {
          link: 'href="#FIXME/TopMenuView:updateTranslations"' // FIXME implement link building
        , flag: this.getFlag(tId)
        , name: this.getName(tId)
        };
      }, App.translationStorage)
    });
  }
  /***/
, updateEntries: function(){
    var entries = App.translationStorage.translateStatic([
      { link:  'topmenu_about_furtherinfo_href'
      , about: 'topmenu_about_furtherinfo'}
    , { link:  'topmenu_about_research_href'
      , about: 'topmenu_about_research'}
    , { link:  'topmenu_about_contact_href'
      , about: 'topmenu_about_contact'}
    ]);
    _.each(entries, function(e){e.link = 'href="'+e.link+'"';});
    entries.unshift({
      link:  'href="#FIXME/TopMenuView:updateEntries"' // FIXME implement link building
    , about: App.translationStorage.translateStatic('topmenu_about_whoarewe') 
    });
    this.setModel({aboutEntries: entries});
  }
  /***/
, render: function(){
    console.log('TopMenuView.render()');
    this.$el.html(App.templateStorage.render('TopMenu', {TopMenu: this.model}));
  }
  /**
    Helper method to color strings for updatePageViews.
    @param mode is expected to be an enum like string
    @param content is expected to be a string.
    @return content html string
  */
, tColor: function(mode, content){
    var modes = {
      m:  'color-map'
    , w:  'color-word'
    , l:  'color-language'
    , lw: {c1: 'color-language', c2: 'color-word'}
    , wl: {c1: 'color-word', c2: 'color-language'}
    };
    var color = modes[mode], cType = typeof(color);
    if(cType === 'string'){
      return '<div class="inline '+color+'">'+content+'</div>';
    }else if(cType === 'object'){
      var matches = content.match(/^(.*) [Xx×] (.*)$/)
        , m1 = matches[1], m2 = matches[2];
      return '<div class="inline '+color.c1+'">'+m1+'</div>×<div class="inline '+color.c2+'">'+m2+'</div>';
    }
    console.log('Unexpected behaviour in TopMenuView.tColor() with mode: '+mode);
    return content;
  }
});
