"use strict";
var HideLinks = Backbone.View.extend({
  initialize: function(){
    this.content = $('#contentArea');
    this.links   = {};
    var view     = this;
    $('a.hidelink').click(function(){
      view.click($(this));
    }).each(function(){
      var t   = $(this)
        , key = t.attr('data-name');
      view.links[key] = t;
    });
    this.loadStates();
    App.pageState.on('change:pageView', this.render, this);
    this.render();
  }
, toggleChevron: function(t){
    if(t.hasClass('icon-chevron-right')){
      t.addClass('icon-chevron-left').removeClass('icon-chevron-right');
    }else if(t.hasClass('icon-chevron-left')){
      t.addClass('icon-chevron-right').removeClass('icon-chevron-left');
    }
  }
, getSpan: function(t){
    for(var i = 1; i <= 12; i++)
      if(t.hasClass('span'+i))
        return i;
    return 0;
  }
, deltaSpan: function(t, d){
    var s = this.getSpan(t); 
    t.removeClass('span'+s).addClass('span'+(s+d));
  }
, click: function(t){
    this.toggleChevron(t.find('i'));
    var target = $(t.data('target'))
      , delta  = this.getSpan(target);
    if(target.is(':visible')){
      target.hide();
      this.deltaSpan(this.content, delta);
    }else{
      target.show();
      this.deltaSpan(this.content, -delta);
    }
    this.saveState(t, !target.is(':visible'));
    //Telling the MapView to adjust:
    if(window.App.views.mapView)
      window.App.views.mapView.adjustCanvasSize();
  }
, saveState: function(t, hidden){
    var key = this.storageKey(t.data('name'));
    localStorage[key] = hidden;
  }
, loadStates: function(){
    _.each(this.links, function(l, name){
      var key = this.storageKey(name);
      if(localStorage[key] === 'true')
        l.trigger('click');
    }, this);
  }
, storageKey: function(id){
    var view = App.pageState.getPageViewKey();
    return 'HideLinks_toggle_'+view+'_'+id;
  }
, render: function(){
    //Making sure, all are hidden or shown, depending on view:
    var pv    = App.pageState.getPageViewKey()
      , hasPv = pv === 'whoAreWe';
    _.each(this.links, function(l, name){
      var key = this.storageKey(name);
      if((!localStorage[key] && hasPv)||(localStorage[key] && !hasPv)){
        l.trigger('click');
      }
    }, this);
  }
});