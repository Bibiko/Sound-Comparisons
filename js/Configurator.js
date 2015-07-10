"use strict";
define(['Sanitizer','models/Language'], function(Sanitizer, Language){
  /**
    The Configurator provides means to build configuration such as used by the Linker.
  */
  return Sanitizer.extend({
    /**
      This method shall modify different page settings that can be conveyed via the config routes.
    */
    configure: function(config){
      //Parsing config:
      config = this.parseConfig(config);
      //Configuring different fields:
      if('wordOrder' in config){
        var callMap = { alphabetical: 'wordOrderSetAlphabetical'
                      , logical:      'wordOrderSetLogical'};
        if(config.wordOrder in callMap){
          App.pageState[callMap[config.wordOrder]]();
        }else{
          console.log('Configurator.configure() could not configure wordOrder: '+config.wordOrder);
        }
      }
      if('spLang' in config){
        var spLang = App.languageCollection.find(function(l){
          return l.getKey() === config.spLang;
        }, this);
        App.pageState.setSpLang(spLang);
      }
      if('phLang' in config){
        var phLang = App.languageCollection.find(function(l){
          return l.getKey() === config.phLang;
        }, this);
        App.pageState.setPhLang(phLang);
      }
      if('meaningGroups' in config){
        var mgs = App.meaningGroupCollection.filterKeys(config.meaningGroups);
        App.meaningGroupCollection.setSelected(mgs);
      }
      if('regions' in config){
        var rs = App.regionCollection.filterKeys(config.regions);
        App.regionCollection.setSelected(rs);
      }
      if('families' in config){
        var fs = App.familyCollection.filterKeys(config.families);
        App.familyCollection.setSelected(fs);
      }
      if('translation' in config){
        App.translationStorage.setTranslationId(config.translation);
      }
      if('mapViewIgnoreSelection' in config){
        App.pageState.set({mapViewIgnoreSelection: config.mapViewIgnoreSelection === 'true'});
      }
      if('wordByWord' in config){
        App.pageState.set({wordByWord: config.wordByWord === 'true'});
      }
    }
    /**
      The reverse operation to configure.
      It shall generate an object describing the whole configuration.
    */
  , getConfig: function(pvk){
      pvk = pvk || App.pageState.getPageViewKey();
      var config = {}, ps = App.pageState;
      //wordOrder:
      if(ps.wordOrderIsAlphabetical()){
        config.wordOrder = 'alphabetical';
      }else{
        config.wordOrder = 'logical';
      }
      //spLang:
      var spLang = ps.getSpLang();
      if(spLang){
        config.spLang = spLang.getKey();
      }
      //phLang:
      var phLang = ps.getPhLang();
      if(phLang){
        config.phLang = phLang.getKey();
      }
      //Helper function:
      var getKeys = function(xs){return _.map(xs, function(x){return x.getKey();});};
      //meaningGroups:
      config.meaningGroups = getKeys(App.meaningGroupCollection.getSelected(pvk));
      //regions:
      config.regions = getKeys(App.regionCollection.getSelected(pvk));
      //families:
      config.families = getKeys(App.familyCollection.getSelected(pvk));
      //translation:
      config.translation = App.translationStorage.getTranslationId();
      //mapViewIgnoreSelection:
      config.mapViewIgnoreSelection = ps.get('mapViewIgnoreSelection');
      //wordByWord:
      config.wordByWord = ps.get('wordByWord');
      //done:
      return config;
    }
    /**
      @param calls [Suffix -> Args]
      @param config Object
      @return config' Object
      Takes a calls Object that maps Suffixes to args,
      where Suffix is the match of /configSet(.+)/ for methods of Router,
      and args will be supplied to the Router method as second argument,
      whereas config is the first argument.
      Router:sanitize works in a similar fashion.
    */
  , configSet: function(calls, config){
      config = config || {};
      _.each(calls, function(arg, suffix){
        var method = 'configSet'+suffix;
        if(method in this){
          config = this[method].call(this, config, arg);
        }else{
          console.log('Router:configSet() cannot call method: '+method);
        }
      }, this);
      return config;
    }
    /**
      Builds configuration to set the WordOrder managed by PageState to alphabetical.
    */
  , configSetWordOrderAlphabetical: function(config){
      config = config || {};
      config.wordOrder = 'alphabetical';
      return config;
    }
    /**
      Builds configuration to set the WordOrder managed by PageState to logical.
    */
  , configSetWordOrderLogical: function(config){
      config = config || {};
      config.wordOrder = 'logical';
      return config;
    }
    /**
      Builds configuration to set the spLang to the given spLang.
    */
  , configSetSpLang: function(config, spLang){
      config = config || {};
      if(spLang instanceof Language){
        config.spLang = spLang.getKey();
      }else if(spLang === null){
        config.spLang = null;
      }
      return config;
    }
    /**
      Builds configuration to set the phLang to the given phLang.
    */
  , configSetPhLang: function(config, phLang){
      config = config || {};
      if(phLang instanceof Language){
        config.phLang = phLang.getKey();
      }
      return config;
    }
    /**
      Builds configuration to set the given MeaningGroups as selected.
    */
  , configSetMeaningGroups: function(config, mgs){
      config = config || {};
      var ms = this.configMkKeyArray(mgs);
      if(ms){
        config.meaningGroups = this.sanitizeArray(ms);
      }
      return config;
    }
    /**
      Builds configuration to set the given Regions as selected.
    */
  , configSetRegions: function(config, regions){
      config = config || {};
      var rs = this.configMkKeyArray(regions);
      if(rs){
        config.regions = this.sanitizeArray(rs);
      }
      return config;
    }
    /**
      Builds configuration to set the given Families as selected.
    */
  , configSetFamilies: function(config, families){
      config = config || {};
      var fs = this.configMkKeyArray(families);
      if(fs){
        config.families = this.sanitizeArray(fs);
      }
      return config;
    }
    /***/
  , configSetTranslation: function(config, translationId){
      config = config || {};
      config.translation = translationId;
      return config;
    }
    /***/
  , configSetMapViewIgnoreSelection: function(config, ignore){
      config = config || {};
      config.mapViewIgnoreSelection = ignore ? 'true' : 'false';
      return config;
    }
    /***/
  , configSetWordByWord: function(config, wordByWord){
      config = config || {};
      config.wordByWord = wordByWord ? 'true' : false;
      return config;
    }
    /**
      Helper method to build arrays of keys.
      Backbone.Collection || [Model] -> [String] || null
    */
  , configMkKeyArray: function(ms){
      if(ms instanceof Backbone.Collection){
        ms = ms.models;
      }
      if(_.isArray(ms)){
        return _.map(ms, function(m){
          if(_.isString(m)) return m;
          if(_.isFunction(m.getKey)) return m.getKey();
          console.log(m);
          throw 'Configurator.configMkKeyArray() could not convert correctly.';
        }, this);
      }
      return [];
    }
  });
});
