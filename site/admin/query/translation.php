<?php
  /**
    The translation methods implemented in this file have grown from the original Translation by Search feature.
    While formerly there was only static translation, which was basically a dictionary,
    I soon discovered, that a more dynamic approach was required,
    where keys could be changed/added/removed while still map to different translations.
    This led to a feature I called Dynamic Translation.
    When working with Dynamic Translation it was discovered,
    that it was quite a problem to find a single translation
    based on a mistake observed on the site.
    This problem led to Translation by Search,
    where different Search Providers allowed to search for a given translation,
    and receive methods to edit it.
    Since Translation by Search and it's Search Providers worked in
    a stable and modular way, I decided to rewrite these Search Providers
    into Translation Providers, which also allow for paging in addition to the usual search procedure.
    In addition to the now completely modular, unified approach to translation,
    the site also got a new JavaScript interface, which uses the methods supplied by this file.
  */
  require_once('translationClass.php');
  //
  chdir('..');
  require_once('common.php');
  session_validate()     or Config::error('403 Forbidden');
  session_mayTranslate() or Config::error('403 Forbidden');
  //Actions:
  switch($_GET['action']){
    /**
      @param $_GET['TranslationName']
      @param $_GET['BrowserMatch']
      @param $_GET['ImagePath']
      @param $_GET['RfcLanguage']
      @param $_GET['Active']
      @returns TranslationId
    */
    case 'createTranslation':
      Translation::createTranslation($_GET['TranslationName'], $_GET['BrowserMatch'], $_GET['ImagePath'], $_GET['RfcLanguage'], $_GET['Active']);
      header('Location: '.$_SERVER['HTTP_REFERER'], 302);
    break;
    /**
      @param TranslationId
      @returns 'OK'|'FAIL'
    */
    case 'deleteTranslation':
      if(Translation::deleteTranslation($_GET['TranslationId'])){
        header('Location: '.$_SERVER['HTTP_REFERER'], 302);
      }else Config::error('FAIL: Cannot delete Translation 1.', false, true);
    break;
    /**
      @param $_GET['Providers'] JSON array of strings
      @param $_GET['Study'] String of the study to use
      @param $_GET['TranslationId'] The TranslationId to use
      Delivers a JSON object that maps names of providers to their offsets.
    */
    case 'offsets':
      $ps = json_decode($_GET['Providers']);
      $tId = array_key_exists('TranslationId', $_GET) ? $_GET['TranslationId'] : 1;
      echo Config::toJSON(Translation::offsets($ps, $_GET['Study'], $tId));
    break;
    /**
      @param $_GET['Providers'] JSON array of strings
      @param $_GET['Study'] String of the study to use
      @param $_GET['TranslationId'] The TranslationId to use
      @param $_GET['Offset'] The offset to use
      Delivers a JSON object that maps names of providers to their pages.
    */
    case 'page':
      $ps = json_decode($_GET['Providers']);
      echo Config::toJSON(Translation::page($ps, $_GET['Study'], $_GET['TranslationId'], $_GET['Offset']));
    break;
    /**
      Builds a mapping of ProviderGroups to Provider Names
      and outputs this as a JSON Object.
    */
    case 'providers':
      echo Config::toJSON(Translation::providers());
    break;
    /**
      @param $_GET['TranslationId'] TranslationId to search for
      @param $_GET['SearchText'] Text to search for
      Delivers matches as produced by all providers.
    */
    case 'search':
      echo Config::toJSON(Translation::search($_GET['TranslationId'], $_GET['SearchText']));
    break;
    /** Returns a JSON array of all Names in the Studies table. */
    case 'studies':
      echo Config::toJSON(Translation::studies());
    break;
    /**
      Fetches the complete Page_Translations table.
      @returns A JSON Array with JSON Objects inside.
        Fields of contained JSON Objects are named as in db.
    */
    case 'translations':
      echo Config::toJSON(Translation::translations());
    break;
    /**
      @param $_GET['TranslationId']
      @param $_GET['Payload'] The payload that determines what will be updated.
      @param $_GET['Update'] The update value to write
      @param $_GET['Provider'] The Provider to perform the update to
    */
    case 'update':
      Translation::update($_GET['TranslationId'], $_GET['Payload'], $_GET['Update'], $_GET['Provider']);
    break;
    /**
      @param Req
      @param Description
    */
    case 'updateDescription':
      Translation::updateDescription($_GET['Req'], $_GET['Description']);
    break;
    /**
      @param TranslationId
      @param TranslationName
      @param BrowserMatch
      @param ImagePath
      @param RfcLanguage
      @param Active
    */
    case 'updateTranslation':
      Translation::updateTranslation($_GET['TranslationId'], $_GET['TranslationName'], $_GET['BrowserMatch'], $_GET['ImagePath'], $_GET['RfcLanguage'], $_GET['Active']);
    break;
  }
