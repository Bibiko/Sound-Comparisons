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
    With issue #210 I've been able to reduce a big chunk of complexity that was lingering in this code,
    by taking a more declarative approach with translationTableDescription.php.
    Therefore I could remove most of the TranslationProviders,
    especially all depending on DynamicTranslationProvider.
  */
  require_once('providers/TranslationProvider.php');
  require_once('providers/StaticTranslationProvider.php');
  require_once('providers/StudyTitleTranslationProvider.php');
  require_once('translationTableProjection.php');
  //FOO BELOW
  class Translation {
    private static $providers = array();
    private static function initProviders(){
      if(count(self::$providers) === 0){
        $dbConnection = Config::getConnection();
        foreach(array(
          new StaticTranslationProvider($dbConnection)
        , new StudyTitleTranslationProvider($dbConnection)
        ) as $p) self::$providers[$p->getName()] = $p;
      }
    }
    /**
      Following a similar pattern as with the providers, we have the projections.
      They shall replace most providers.
    */
    private static $projections = array();
    private static function initProjections(){
      if(count(self::$projections) === 0){
        $all = TranslationTableProjection::projectAll();
        if($all instanceof Exception){
          throw $all;
        }else foreach($all->projectColumns() as $colPrj){
          self::$projections[$colPrj->getId()] = $colPrj;
        }
      }
    }
    private static $providerGroups = array(
      'General'               => '/^StaticTranslationProvider$/'//TODO no Projection
    , 'Studies'               => '/^StudyTranslationProvider$/'//Has projection!
    , 'Study title'           => '/^StudyTitleTranslationProvider$/'//TODO no Projection!
    , 'Families'              => '/^FamilyTranslationProvider$/'//Has projection!
    , 'Language status types' => '/^LanguageStatusTypesTranslationProvider-/'//Has projection!
    , 'Meaning sets'          => '/^MeaningGroupsTranslationProvider$/'//Has projection!
    , 'Words'                 => '/^WordsTranslationProvider-/'//Has projection!
    , 'Regions'               => '/^RegionsTranslationProvider-/'//Has projection!
    , 'Region languages'      => '/^RegionLanguagesTranslationProvider-/'//Has projection!
    , 'Superscripts'          => '/^TranscrSuperscriptInfoTranslationProvider-/'//Has projection!
    , 'Lender languages'      => '/^TranscrSuperscriptLenderLgsTranslationProvider-/'//Has projection!
    , 'Spelling languages'    => '/^LanguagesTranslationProvider-Languages_-Trans_SpellingRfcLangName$/'//Has projection, overly specific!
    , 'Contributors'          => '/^ContributorCategoriesTranslationProvider-/'//Has projection!
    );
    /**
      @param $imagePath String
      @return $imagePath String
      Removes leading '../' from the $imagePath.
    */
    public static function sanitizeImagePath($imagePath){
      return preg_replace('/^(\.\.\/)*/', '', $imagePath);
    }
    /**
      @param translationName
      @param browserMatch
      @param imagePath
      @param rfcLanguage
      @param active
      @return translationId
    */
    public static function createTranslation($translationName, $browserMatch, $imagePath, $rfcLanguage, $active){
      $dbConnection    = Config::getConnection();
      $translationName = $dbConnection->escape_string($translationName);
      $browserMatch    = $dbConnection->escape_string($browserMatch);
      $imagePath       = self::sanitizeImagePath($dbConnection->escape_string($imagePath));
      $rfcLanguage     = ($rfcLanguage == '') ? 'NULL' : $dbConnection->escape_string($rfcLanguage);
      $active          = $dbConnection->escape_string($active);
      $query = "INSERT INTO Page_Translations"
        ."(TranslationName, BrowserMatch, ImagePath, RfcLanguage, Active)"
        ." VALUES ('$translationName', '$browserMatch', '$imagePath', $rfcLanguage, $active)";
      $dbConnection->query($query);
      return $dbConnection->insert_id;
    }
    /**
      @param translationId
      @return Bool
    */
    public static function deleteTranslation($translationId){
      $dbConnection  = Config::getConnection();
      $translationId = $dbConnection->escape_string($translationId);
      //Prevent deletion on default language:
      if($translationId == '1') return false;
      foreach(array(
        "DELETE FROM Page_DynamicTranslation WHERE TranslationId = $translationId"
      , "DELETE FROM Page_StaticTranslation  WHERE TranslationId = $translationId"
      , "DELETE FROM Page_Translations       WHERE TranslationId = $translationId"
      ) as $q)
        $dbConnection->query($q);
      return true;
    }
    /**
      @param $ps [String] of Providernames
      @param $study String of the study to use
      @param $translationId The TranslationId to use
      @return array that maps names of providers to their offsets.
    */
    public static function offsets($ps, $study, $translationId = 1){
      self::initProviders();
      self::initProjections();
      $dbConnection = Config::getConnection();
      $study = $dbConnection->escape_string($study);
      $tId   = $dbConnection->escape_string($translationId);
      $ret   = array();
      foreach($ps as $p){
        if(array_key_exists($p, self::$projections)){
          $ret[$p] = self::$projections[$p]->offsets($tId);
        }else if(array_key_exists($p, self::$providers)){
          $ret[$p] = self::$providers[$p]->offsets($tId, $study);
        }
      }
      return $ret;
    }
    /**
      @param $providers [String] of Providernames
      @param $study String of the study to use
      @param $translationId The TranslationId to use
      @param $offset The offset to use
      @return array that maps providers to their page
    */
    public static function page($ps, $study, $translationId, $offset){
      self::initProviders();
      self::initProjections();
      $dbConnection = Config::getConnection();
      $study  = $dbConnection->escape_string($study);
      $tId    = $dbConnection->escape_string($translationId);
      $offset = $dbConnection->escape_string($offset);
      $ret    = array();
      foreach($ps as $p){
        if(array_key_exists($p, self::$projections)){
          $prj = self::$projections[$p];
          if($study !== null){
            $s = $prj->getStudy();
            if($s !== null){
              if($s !== $study){ continue; }
            }
          }
          $ret[$p] = $prj->page($tId, $offset);
        }else if(array_key_exists($p, self::$providers)){
          $ret[$p] = self::$providers[$p]->page($tId, $study, $offset);
        }
      }
      return $ret;
    }
    /**
      @param $ps [String] of Providernames
      @param $study String of the study to use
      @param $translationId The TranslationId to use
      @return array that maps providers to their content
      This method is just a shortcut that passes an offset of -1 to self::page.
      The offset of -1 is declared to function as 'do not page'.
      This way, pageAll ommits paging without doing more SQL queries than page,
      just returning more data.
    */
    public static function pageAll($ps, $study, $translationId){
      return self::page($ps, $study, $translationId, -1);
    }
    /**
      @param [$providerGroups] array of GroupName => Regex
      @return array of GroupName => [ProviderNames]
      Builds a mapping of ProviderGroups to Provider Names.
    */
    public static function providers($providerGroups = null){
      self::initProviders();
      self::initProjections();
      $addNonProviders = false;
      if($providerGroups === null){ // Too long for default parameter .)
        $providerGroups = self::$providerGroups;
        $addNonProviders = true;
      }
      $ret = array();
      foreach($providerGroups as $group => $regex){
        $projections = TranslationColumnProjection::filterCategoryRegex(self::$projections, $regex);
        if(count($projections) !== 0){
          $ret[$group] = __($projections)->map(function($p){
            return $p->getId();
          });
        }else{
          $ret[$group] = __(array_keys(self::$providers))->filter(function($k) use ($regex){
            return preg_match($regex, $k);
          });
        }
      }
      if($addNonProviders){
        //Adding non providers (underscore prefix):
        $ret['_dependsOnStudy'] = array(
          'Region languages'   => true
        , 'Regions'            => true
        , 'Spelling languages' => true
        , 'Words'              => true
        );
      }
      return $ret;
    }
    /***/
    public static function generalProviders($pGroups = null){
      $ret = array();
      $pgs = self::providers($pGroups);
      foreach(array_keys($pgs) as $p){
        if($p === '_dependsOnStudy') continue;
        if(!array_key_exists($p, $pgs['_dependsOnStudy'])){
          $ret[$p] = $pgs[$p];
        }
      }
      return $ret;
    }
    /***/
    public static function studyProviders($pGroups = null){
      $ret = array();
      $pgs = self::providers($pGroups);
      foreach(array_keys($pgs) as $p){
        if($p === '_dependsOnStudy') continue;
        if(array_key_exists($p, $pgs['_dependsOnStudy'])){
          $ret[$p] = $pgs[$p];
        }
      }
      return $ret;
    }
    /**
      @param $translationId TranslationId to search for
      @param $searchText Text to search for
      @param [$searchAll = false] option to search all translations
      @return $matches
      Delivers matches as produced by all providers.
    */
    public static function search($translationId, $searchText, $searchAll = false){
      self::initProviders();
      self::initProjections();
      $dbConnection  = Config::getConnection();
      $translationId = $dbConnection->escape_string($translationId);
      $searchText    = $dbConnection->escape_string($searchText);
      $matches = array();
      foreach(self::$providers as $p){
        $ms = $p->search($translationId, $searchText, $searchAll);
        $matches = array_merge($matches, $ms);
      }
      foreach(self::$projections as $p){
        $ms = $p->search($translationId, $searchText);
        $matches = array_merge($matches, $ms);
      }
      return $matches;
    }
    /**
      @return [String] of all Names in the Studies table
    */
    public static function studies(){
      return DataProvider::getStudies();
    }
    /**
      @return [[Field => Value]] All entries, accessible by their fieldnames.
      Fetches the complete Page_Translations table.
    */
    public static function translations(){
      $ret = array();
      $q   = 'SELECT * FROM Page_Translations ORDER BY TranslationName';
      $set = Config::getConnection()->query($q);
      while($row = $set->fetch_assoc())
        array_push($ret, $row);
      return $ret;
    }
    /**
      @param $translationId
      @param $payload The payload that determines what will be updated.
      @param $update The update value to write
      @param $provider The Provider to perform the update to
      @return Bool true on success
    */
    public static function update($translationId, $payload, $update, $provider){
      //Removing leading/trailing whitespace:
      $update = ltrim(rtrim($update));
      //Saving $update:
      self::initProviders();
      self::initProjections();
      $translationId = Config::getConnection()->escape_string($translationId);
      //Checking providers:
      if(array_key_exists($provider, self::$providers)){
        $p = self::$providers[$provider];
        $p->update($translationId, $payload, $update);
        return true;
      }
      //Checking projections:
      $regex = '/^'.preg_quote($provider, '/').'$/';
      $projections = TranslationColumnProjection::filterCategoryRegex(self::$projections, $regex);
      if(count($projections) !== 0){
        current($projections)->update($translationId, $payload, $update);
        return true;
      }
      Config::error("Unsupported Provider: $provider");
      return false;
    }
    /**
      @param $req
      @param $desc description
    */
    public static function updateDescription($req, $desc){
      //Removing leading/trailing whitespace:
      $desc = ltrim(rtrim($desc));
      //Saving description:
      $dbConnection = Config::getConnection();
      $req  = $dbConnection->escape_string($req);
      $desc = $dbConnection->escape_string($desc);
      if(!session_mayEdit($dbConnection)) return;
      $q = "UPDATE Page_StaticDescription "
         . "SET Description = '$desc' "
         . "WHERE Req = '$req'";
      $dbConnection->query($q);
    }
    /**
      @param $translationId
      @param $translationName
      @param $browserMatch
      @param $imagePath
      @param $rfcLanguage
      @param $active
    */
    public static function updateTranslation($translationId, $translationName, $browserMatch, $imagePath, $rfcLanguage, $active){
      $dbConnection    = Config::getConnection();
      $translationId   = $dbConnection->escape_string($translationId);
      $translationName = $dbConnection->escape_string($translationName);
      $browserMatch    = $dbConnection->escape_string($browserMatch);
      $imagePath       = self::sanitizeImagePath($dbConnection->escape_string($imagePath));
      $rfcLanguage     = $dbConnection->escape_string($rfcLanguage);
      $active          = $dbConnection->escape_string($active);
      $query = "UPDATE Page_Translations SET"
        ." TranslationName = '$translationName'"
        .", BrowserMatch = '$browserMatch'"
        .", ImagePath = '$imagePath'"
        .", RfcLanguage = $rfcLanguage"
        .", Active = $active"
        ." WHERE TranslationId = $translationId";
      $dbConnection->query($query);
    }
    /**
      Since we don't have a RfcLanguages nor a Languages view anymore,
      this is going to be a little more complicated:
      We need to iterate all Languages_<study> tables,
      and select all RfcLanguages from them.
      @return array LanguageIx => ShortName
    */
    public static function getRfcLanguages(){
      $dbConnection = Config::getConnection();
      $set = $dbConnection->query('SELECT Name FROM Studies');
      $studies = array();
      while($r = $set->fetch_row()){
        array_push($studies, $r[0]);
      }
      $ret = array();
      foreach($studies as $study){
        $q = "SELECT ShortName, LanguageIx FROM Languages_$study "
           . "WHERE LanguageIx = ANY ("
           . "SELECT DISTINCT RfcLanguage FROM Languages_$study "
           . "WHERE RfcLanguage IS NOT NULL)";
        $set = $dbConnection->query($q);
        if($set === false){
          //May fail if a studies entry exists but no Lanugage_$study table…
          Config::error("Problem with query: $q", false, false);
        }else while($r = $set->fetch_row()){
          $ret[$r[1]] = $r[0];
        }
      }
      return $ret;
    }
    /**
      @param $translationId
      @return $missing [[ Description => [Req => String, Description => String]
                       ,  Original => String
                       ,  Translation => [TranslationId => $translationId
                          , Translation => String, Payload => String, TranslationProvider => String]
                       ]]
      Returns an empty Array if $translationId === 1,
      because there cannot be missing translations in the source translation.
      Otherwise returns entries where $missing[*]['Translation']['Translation'] === ''.
    */
    public static function getMissingTranslations($translationId){
      $missing = array();
      if($translationId != 1){
        //Function to filter for missing Translations:
        $filter = function($missing, $ps, $s) use ($translationId){
          $pages = array_values(Translation::pageAll($ps, $s, $translationId));
          foreach($pages as $page){
            foreach($page as $t){
              $orig = $t['Original'];
              if($orig === null || $orig === '')
                continue;
              $trans = $t['Translation']['Translation'];
              if($trans === null || $trans === ''){
                array_push($missing, $t);
              }
            }
          }
          return $missing;
        };
        //Filtering through generalProviders:
        $gProviders = static::generalProviders();
        foreach($gProviders as $ps){
          $missing = $filter($missing, $ps, '');
        }
        //Filtering through studyProviders:
        $studies = static::studies();
        $sProviders = static::studyProviders();
        foreach($sProviders as $ps){
          foreach($studies as $study){
            $missing = $filter($missing, $ps, $study);
          }
        }
      }
      return $missing;
    }
    /**
      @param $translationId
      @return $changed [[ Description => [Req => String, Description => String]
                       ,  Original => String
                       ,  Translation => [TranslationId => $translationId
                          , Translation => String, Payload => String, TranslationProvider => String]
                       ]]
      Returns an empty Array if $translationId === 1,
      because there cannot be changed translations in the source translation.
      Otherwise returns entries where translation 1 has a newer change than $translationId.
    */
    public static function getChangedTranslations($translationId){
      $changed = array();
      if($translationId !== 1){
        $static = StaticTranslationProvider::getChanged($translationId);
        $dynamic = TranslationTableProjection::getChanged($translationId);
        $changed = array_merge($static, $dynamic);
      }
      return $changed;
    }
    /**
      @param $category String
      @return $description array('Req' => String, 'Description' => String) || array()
      Given a $category this method fetches the description text that belongs to it.
    */
    public static function categoryToDescription($category){
      //Checking projections:
      $regex = '/^'.preg_quote($category, '/').'$/';
      $projections = TranslationColumnProjection::filterCategoryRegex(self::$projections, $regex);
      if(count($projections) !== 0){
        $desc = current($projections)->getDescription();
        if($desc instanceof Exception){
          Config::error(''.$desc);
          return array();
        }
        return $desc;
      }
      //Checking provider edge case:
      if(array_key_exists($category, self::$providers)){
        if($category === 'StudyTitleTranslationProvider'){
          return TranslationProvider::getDescription('dt_studyTitle_trans');
        }else{
          Config::error("Unexpected case in Translation::categoryToDescription for $category");
        }
      }
      return array();
    }
  }
