<?php
$dir = getcwd(); chdir(__DIR__);
require_once('translationTableDescription.php');
require_once('translationColumnProjection.php');
require_once('translationClass.php');
require_once('../../query/dataProvider.php');
/**
  Projection from TranslationTableDescription
  to a subset of its tables.
  It aims to provide essentially the same functionality as the DynamicTranslationProvider.
*/
class TranslationTableProjection {
  /**
    Field for memoization of projectAll().
  */
  private static $allProjection = null;
  /**
    @return $this->allProjection TranslationTableProjection || Exception
    Builds instances of TranslationTableProjection for all projections.
  */
  public static function projectAll(){
    if(self::$allProjection === null){
      //Gathering all tables:
      $tables = array();
      foreach(DataProvider::fetchAll('SHOW TABLES') as $row){
        array_push($tables, current($row));
      }
      //Projecting onto all tables:
      self::$allProjection = self::projectTables($tables);
      if(self::$allProjection instanceof Exception){
        $e = self::$allProjection;
        self::$allProjection = null;
        return $e;
      }
    }
    return self::$allProjection;
  }
  /**
    @param $tables [String]
    @return $ret TranslationTableProjection || Exception
    Tries to build an instance of TranslationTableProjection given a number of
    table names.
    May fail and return an Exception if the given $tables don't match any
    table names as described in TranslationTableDescription or if $tables
    is not an array with at least one entry.
  */
  public static function projectTables($tables){
    //Initial sanity checks:
    if(!is_array($tables)){
      return new Exception('$tables is not an array.');
    }
    if(count($tables) === 0){
      return new Exception('$tables is empty.');
    }
    //Searching for table descriptions:
    $descriptions = array();
    foreach(TranslationTableDescription::getTableDescriptions() as $sNameRegex => $desc){
      foreach($tables as $table){
        if(preg_match($sNameRegex, $table, $matches)){
          //Performing implode operation on fieldSelect entries:
          if($desc['dependsOnStudy'] === true){
            $desc['study'] = $matches[1];
          }
          $descriptions[$table] = $desc;
        }
      }
    }
    //Checking again:
    if(count($descriptions) === 0){
      return new Exception('$tables didn\'t match any of the $sNameRegex from TranslationTableDescription.');
    }
    //Produce Projection:
    $ret = new TranslationTableProjection();
    $ret->descriptions = $descriptions;
    return $ret;
  }
  /**
    A ~subset of TranslationTableDescription::getTableDescriptions().
    This will be used to define the functionality
    of a given instance of TranslationTableProjection.
    Structure will be:
    [tableName => [
        columns => [
          columnName => String
        , fieldSelect => String
        , description => String
        , category => String
        ]
      , dependsOnStudy => Boolean
      , study => String
      ]
    ]
    - Iff dependsOnStudy === true, a study field holding the study shall be added.
    - Instead of sNameRegex the outermost keys will directly be table names.
  */
  protected $descriptions = array();
  //Getter for protected $descriptions
  public function getDescriptions(){
    return $this->descriptions;
  }
  /**
    @param $tId Int, TranslationId from the Page_Translations table.
    @return $ret [obj] || Exception
    obj will be arrays resembling JSON objects following this syntax:
    {
      Description: {
        Req: ''
      , Description: ''
      }
    , Match: ''
    , Original: ''
    , Translation: {
        TranslationId: 5
      , Translation: ''
      , Payload: ''
      , TranslationProvider: ''
      }
    }
    Returns all entries where obj.Original !== obj.Translation for the given $tid.
  */
  public function translationNotOriginal($tId){
    if(!is_numeric($tId)){//Sanity check on $tId
      return new Exception('$tId must be numeric!');
    }
    //Finding wanted cases:
    $ret = array();
    foreach($this->descriptions as $tableName => $desc){
      foreach($desc['columns'] as $column){
        //Fetching Description:
        $description = TranslationTableProjection::fetchDescription($column);
        //Fetching original entries:
        $columnName = $column['columnName'];
        $fieldSelect = $column['fieldSelect'];
        $q = "SELECT $columnName AS columnName, $fieldSelect AS fieldSelect "
           . "FROM $tableName";
        $originals = DataProvider::fetchAll($q);//[{columnName:…,fieldSelect:…}]
        //Searching changed translations:
        foreach($originals as $row){
          //Potential entry for $ret:
          $original = $row['columnName'];
          $entry = array(
            'Description' => $description
          , 'Original' => $original
          );
          //$fieldSelect setup:
          $fieldSelect = $row['fieldSelect'];
          if($desc['dependsOnStudy'] === true){
            $fieldSelect = implode('-', array($desc['study'], $fieldSelect));
          }
          //Fetching translation:
          $category = $column['category'];
          $q = "SELECT '$fieldSelect' AS payload, Trans FROM Page_DynamicTranslation "
             . "WHERE TranslationId = $tId "
             . "AND Category = '$category' "
             . "AND Field = '$fieldSelect' "
             . "AND Trans != '$original' "
             . "LIMIT 1";
          foreach(DataProvider::fetchAll($q) as $tRow){//foreach acts as if
            $entry['Translation'] = array(
              'TranslationId' => $tId
            , 'Translation' => $tRow['Trans']
            , 'Payload' => $tRow['payload']
            , 'TranslationProvider' => $category
            );
            array_push($ret, $entry);
          }
        }
      }
    }
    return $ret;
  }
  /**
    @return $projections [TranslationColumnProjection]
    This method provides instances of TranslationTableProjection for each
    column of each table for the current projection.
    This is helpful to adapt TranslationTableProjection to work as a TranslationProvider.
    If combined with projectAll(),
    this method is an easy way to get TranslationTableProjection instances
    for all columns in all tables translated.
  */
  public function projectColumns(){
    $projections = array();
    foreach($this->descriptions as $tableName => $desc){
      foreach($desc['columns'] as $column){
        $projection = new TranslationColumnProjection();
        $cDesc = array(
          'columns' => array($column)
        , 'dependsOnStudy' => $desc['dependsOnStudy']
        );
        if($desc['dependsOnStudy'] === true){
          $cDesc['study'] = $desc['study'];
        }
        $projection->descriptions = array($tableName => $cDesc);
        array_push($projections, $projection);
      }
    }
    return $projections;
  }
  /**
    @param $lambda function($tableName, $desc)
    @return $ret [$lambda()]
    Executes given $lambda with $tableName and corresponding $desc from $descriptions and returns return values of $lambda.
  */
  protected function withTables($lambda){
    $ret = array();
    foreach($this->descriptions as $tableName => $desc){
      array_push($ret, $lambda($tableName, $desc));
    }
    return $ret;
  }
  /**
    @param $column {…} column entry from $descriptions
    @return $description array('Req' => String, 'Description' => String) || Exception
    Fetches the description entry for a given $column from the database.
  */
  public static function fetchDescription($column){
    $req = $column['description'];
    $q = "SELECT Req, Description FROM Page_StaticDescription "
       . "WHERE Req = '$req' LIMIT 1";
    foreach(DataProvider::fetchAll($q) as $row){//foreach acts as if
      return array(
        'Req' => $row['Req']
      , 'Description' => $row['Description']
      );
    }
    return new Exception("Could not fetch Description for \$req='$req'.");
  }
  /**
    @return $id String
    Similar to what TranslationProvider.getName() did,
    this method builds a String to identify a TranslationTableProjection by.
  */
  public function getId(){
    $json = json_encode($this->descriptions);
    return md5($json);
  }
  /**
    @param $tId TranslationId
    @return $ret [[ Description => [Req => String, Description => String]
                 ,  Original => String
                 ,  Translation => [TranslationId => $translationId
                    , Translation => String, Payload => String, TranslationProvider => String]
                 ]]
    Returns entries where the translation has been saved earlier than the english translation.
    These are the cases where it makes sense to review the translation.
    Naturally for ($tId === 1) $ret will be empty.
  */
  public static function getChanged($tId){
    //Sanitizing $tId:
    $tId = is_numeric($tId) ? $tId : 1;
    //$ret to return:
    $ret = array();
    //Changed only occur in $tId !== 1:
    if($tId !== 1){
      $q = 'SELECT Category, Field, Trans '
         . 'FROM Page_DynamicTranslation WHERE TranslationId = 1';
      foreach(DataProvider::fetchAll($q) as $r){
        $c = $r['Category'];
        $f = $r['Field'];
        $q = "SELECT Trans FROM Page_DynamicTranslation "
           . "WHERE Category = '$c' AND Field = '$f' AND TranslationId = $tId "
           . "AND Time < (SELECT Time FROM Page_DynamicTranslation "
           . "WHERE Category = '$c' AND Field = '$f' AND TranslationId = 1)";
        foreach(DataProvider::fetchAll($q) as $x){
          $desc = Translation::categoryToDescription($c);
          array_push($ret, array(
            'Description' => $desc
          , 'Original'    => $r['Trans']
          , 'Translation' => array(
              'TranslationId'       => $tId
            , 'Translation'         => $x['Trans']
            , 'Payload'             => $f
            , 'TranslationProvider' => $c
            )
          ));
        }
      }
    }
    //Done:
    return $ret;
  }
}
