"use strict";
/* global App */
/* eslint-disable no-console */
define(['underscore','backbone','models/Study','models/Word','models/Language','QueryString'], function(_, Backbone, Study, Word, Language, QueryString){
  /**
    The Sanitizer provides means to sanitize options such as used by the Linker.
  */
  return Backbone.Router.extend({
    /**
      @param suffixes [String]
      @param o Object
      @param pvk String, PageViewKey
      A proxy for the other sanitize methods.
      It chains all sanitize methods with the given suffixes,
      threading the given object trough all of them,
      to finally return the sanitized version.
    */
    sanitize: function(suffixes, o, pvk){
      if(_.isEmpty(pvk) || !_.isString(pvk)){
        console.log('Router.sanitize() called without PageViewKey!');
        pvk = App.pageState.getPageViewKey();
      }
      o = o || {};
      _.each(suffixes, function(s){
        var key = 'sanitize'+s;
        if(key in this){
          o = this[key](o, pvk);
        }else{
          console.log('Router.sanitize() cannot sanitize with key: '+key);
        }
      }, this);
      return o;
    }
    /**
      @param o Object to sanitize language field for
      @param pvk pageViewKey to sanitize with
      @return o Object
      Ignores pvk parameter, because it doesn't deal with selections.
    */
  , sanitizeLanguage: function(o){
      if(!('language' in o)){
        o.language = App.languageCollection.getChoice();
      }
      if(o.language instanceof Language){
        o.language = o.language.getKey();
      }
      o.language = this.sanitizeString(o.language);
      return o;
    }
    /**
      @param o Object to sanitize languages for
      @param [pvk pageViewKey] to sanitize with
      @return o Object
      After sanitizeLanguages, the following shall hold:
      * 'languages' in o
      * o.shortSelections === true → o.languages ∈ {'Lgs_All','Lgs_Sln','Lgs_None'}
      * o.shortSelections !== true → o.languages ∈ [String]
    */
  , sanitizeLanguages: function(o, pvk){
      if(!('languages' in  o)){
        o.languages = App.languageCollection.getSelected(pvk);
      }
      if(o.languages instanceof Backbone.Collection){
        o.languages = o.languages.models;
      }
      if(_.isArray(o.languages)){
        if(o.shortSelections === true){
          var selCount = o.languages.length;
          if(selCount === 0){
            o.languages = 'Lgs_None';
          }else if(selCount === App.languageCollection.length){
            o.languages = 'Lgs_All';
          }else{
            o.languages = 'Lgs_Sln';
          }
        }else{
          var ls = _.map(o.languages, function(l){
            if(_.isString(l)) return l;
            return l.getKey();
          }, this);
          o.languages = this.sanitizeArray(ls);
        }
      }else{
        o.languages = 'Lgs_Sln';
      }
      return o;
    }
    /**
      @param o Object to sanitize study for
      @param pvk pageViewKey to sanitize with
      @return o Object
      Ignores pvk parameter, because it doesn't deal with selections.
    */
  , sanitizeStudy: function(o){
      if(!('study' in o)){
        o.study = App.study;
      }
      if(o.study instanceof Study){
        o.study = o.study.getId();
      }
      if(!_.isString(o.study)){
        throw 'Sanitizer.sanitizeStudy() with unexpected study: '+o.study+' in '+JSON.stringify(o);
      }
      o.study = this.sanitizeString(o.study);
      return o;
    }
    /**
      @param o Object to sanitize word for
      @param pvk pageViewKey to sanitize with
      @return o Object
      Ignores pvk parameter, because it doesn't deal with selections.
    */
  , sanitizeWord: function(o){
      if(!('word' in o)){
        o.word = App.wordCollection.getChoice();
      }
      if(o.word instanceof Word){
        o.word = o.word.getKey();
      }
      o.word = this.sanitizeString(o.word);
      return o;
    }
    /**
      @param o Object to sanitize words for
      @param [pvk pageViewKey] to sanitize with
      @return o Object
      After sanitizeWords, the following shall hold:
      o.words ∈ {'Wds_All','Wds_Sln','Wds_None'}
      * 'words' in o
      * o.shortSelections === true → o.words ∈ {'Wds_All','Wds_Sln','Wds_None'}
      * o.shortSelections !== true → o.words ∈ [String]
    */
  , sanitizeWords: function(o, pvk){
      if(!('words' in o)){
        o.words = App.wordCollection.getSelected(pvk);
      }
      if(o.words instanceof Backbone.Collection){
        o.words = o.words.models;
      }
      if(_.isArray(o.words)){
        if(o.shortSelections === true){
          var selCount = o.words.length;
          if(selCount === 0){
            o.words = 'Wds_None';
          }else if(selCount === App.wordCollection.length){
            o.words = 'Wds_All';
          }else{
            o.words = 'Wds_Sln';
          }
        }else{
          var ws = _.map(o.words, function(w){
            if(_.isString(w)) return w;
            return w.getKey();
          }, this);
          o.words = this.sanitizeArray(ws);
        }
      }else{
        o.words = 'Wds_Sln';
      }
      return o;
    }
    /**
      @param o Object to sanitize config for
      @param pvk pageViewKey to sanitize with
      @return o Object
      Makes sure a valid o.siteLanguage is set.
    */
  , sanitizeSiteLanguage: function(o){
      //Function to set siteLanguage to currently choosen one:
      var setBM = function(){
        o.siteLanguage = App.translationStorage.getBrowserMatch();
      };
      //Making sure siteLanguage is set:
      if(!('siteLanguage' in o)){ setBM(); }
      //Making sure siteLanguage is a string:
      if(!_.isString(o.siteLanguage)){ setBM(); }
      //Sanitizing o.siteLanguage:
      o.siteLanguage = this.sanitizeString(o.siteLanguage);
      return o;
    }
    /**
      @param o Object to sanitize config for
      @param pvk pageViewKey to sanitize with
      @return o Object
      Ignores pvk parameter, because it doesn't deal with selections.
    */
  , sanitizeConfig: function(o){
      if('config' in o){
        if(o.config !== null){
          var keys = _.keys(o.config).sort()
            , vals = [];
          _.each(keys, function(k){
            var v = o.config[k];
            if(_.isArray(v)){
              v = this.sanitizeArray(_.filter(v, _.isString));
            }else{
              if(!_.isString(v)) v = ''+v;
              v = encodeURIComponent(v);
            }
            vals.push(encodeURIComponent(k)+'='+v);
          }, this);
          o.config = '?'+vals.join('&');
        }
      }else{
        o.config = null;
      }
      return o;
    }
    /**
      @param a [String] to encode
      @return arr String ',' delimited, encoded fields.
    */
  , sanitizeArray: function(a){
      var arr = _.map(a, encodeURIComponent).join();
      return arr === '' ? ' ' : arr;
    }
    /**
      @param s String to encode
      @return s encoded String
    */
  , sanitizeString: function(s){
      if(!_.isString(s)) return '';
      return encodeURIComponent(s);
    }
    /**
      @param c String
      @return config Object
      Parses a given config String c to return the config object.
      This should be the exact antipart to sanitizeConfig, so that the following two rules hold:
      sanitizeConfig(parseConfig(s)) === s, parseConfig(sanitizeConfig(config)) === config
      Note that these rules don't hold exactly, because we don't care about [,&] in keys/values,
      and values may only be String || [String].
    */
  , parseConfig: function(c){
      var ret = {}
        , qs  = new QueryString(c)
        , isArray = {meaningGroups: '', regions: '', families: ''};
      _.each(qs.keys(), function(k){
        var v = qs.value(k);
        if(k in isArray){
          v = this.parseArray(v);
        }
        ret[k] = v;
      }, this);
      return ret;
    }
    /***/
  , parseArray: function(c){
      if(!_.isString(c)) return [];
      if(c === ' ')      return [];
      return _.map(c.split(','), decodeURIComponent);
    }
    /***/
  , parseString: function(s){
      if(!_.isString(s)) return '';
      return decodeURIComponent(s);
    }
  });
});
