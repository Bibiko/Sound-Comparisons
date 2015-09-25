<?php
require_once('translationTableDescription.php');
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
    @return $this->allProjection TranslationTableProjection
    Builds an instance of TranslationTableProjection that projects
    to the complete description as ggiven by TranslationTableDescription.
  */
  public static function projectAll(){
    if($this->allProjection === null){
      $this->allProjection = new TranslationTableProjection();
      $this->allProjection->descriptions = TranslationTableDescription::getTableDescriptions();
    }
    return $this->allProjection;
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
  private $descriptions = array();
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
    //Helper function:
    $fetchAll = function($q){
      $ret = array();
      $set = Config::getConnection()->query($q);
      if($set !== false){
        while($r = $set->fetch_row()){
          array_push($ret, $r);
        }
      }
      return $ret;
    };
    //Finding wanted cases:
    $ret = array();
    foreach($this->descriptions as $tableName => $desc){
      foreach($desc['columns'] as $column){
        //Fetching Description:
        $req = $column['description'];
        $q = "SELECT Req, Description FROM Page_StaticDescription "
           . "WHERE Req = '$req' LIMIT 1";
        $description = array();
        foreach($fetchAll($q) as $row){//foreach acts as if
          $description['Req'] = $row[0];
          $description['Description'] = $row[1];
        }
        //Fetching original entries:
        $columnName = $column['columnName'];
        $fieldSelect = $column['fieldSelect'];
        $q = "SELECT $columnName, $fieldSelect FROM $tableName";
        $originals = $fetchAll($q);// [[columnName, fieldSelect]]
        //Searching changed translations:
        foreach($originals as $row){
          //Potential entry for $ret:
          $original = $row[0];
          $entry = array(
            'Description' => $description
          , 'Original' => $original
          );
          //$fieldSelect setup:
          $fieldSelect = $row[1];
          if($desc['dependsOnStudy'] === true){
            $fieldSelect = implode('-', array($desc['study'], $fieldSelect));
          }
          //Fetching translation:
          $category = $column['category'];
          $q = "SELECT $fieldSelect, Trans FROM Page_DynamicTranslation "
             . "WHERE TranslationId = $tId "
             . "AND Category = '$category' "
             . "AND Field = '$fieldSelect' "
             . "AND Trans != '$original' "
             . "LIMIT 1";
          foreach($fetchAll($q) as $tRow){//foreach acts as if
            $entry['Translation'] = array(
              'TranslationId' => $tId
            , 'Translation' => $tRow[1]
            , 'Payload' => $tRow[0]
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
    @return $projections [TranslationTableProjection]
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
        $projection = new TranslationTableProjection();
        $projection->descriptions = array($tableName => array($column));
        array_push($projections, $projection);
      }
    }
    return $projections;
  }
  /**
    @param $tId TranslationId
    @param $payload String fieldSelect value from description
    @param $update String new value for translation entry
    @return $this TranslationTableProjection || Exception
    Build after the preimage of TranslationProvider.update(…)
    This method updates the translation for a TranslationTableProjection on a single column.
    Should the projection have more than a single column,
    an Exception will be returned.
    All given parameters will be escaped by this method.
  */
  public function update($tId, $payload, $update){
    //Check if projection is on single column:
    if(count($this->descriptions) !== 1){
      return new Exception('Projection on other than a single table in TranslationTableProjection.update()');
    }
    foreach($this->descriptions as $tableName as $desc){
      if(count($desc['columns']) !== 1){
        return new Exception('Projection on other than a single column in TranslationTableProjection.update()');
      }
      foreach($desc['columns'] as $column){
        //Sanitize input:
        $db       = Config::getConnection();
        $tId      = $db->escape_string($tId);
        $payload  = $db->escape_string($payload);
        $update   = $db->escape_string($update);
        $category = $column['category'];
        $qs = array(
          "DELETE FROM Page_DynamicTranslation "
        . "WHERE TranslationId = $tId "
        . "AND Category = '$category' "
        . "AND Field = '$payload'"
        , "INSERT INTO Page_DynamicTranslation (TranslationId, Category, Field, Trans) "
        . "VALUES ($tId, '$category', '$payload', '$update')"
        , "UPDATE Page_Translations SET lastChangeDynamic = CURRENT_TIMESTAMP() WHERE TranslationId = $tId"
        );
        foreach($qs as $q){
          $db->query($q);
        }
      }
    }
    return $this;
  }
}
