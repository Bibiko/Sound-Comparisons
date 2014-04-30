<?php
  /**
    This script creates a dump of the static and dynamic translations,
    so that they can easily be inserted into the db of another machine.
  */
  /* Setup and session verification */
  chdir('..');
  require_once 'common.php';
  session_validate()     or Config::error('403 Forbidden');
  session_mayTranslate() or Config::error('403 Forbidden');
  /* The helpful esc function */
  $esc = function($s) use ($dbConnection){
    return "'".$dbConnection->escape_string($s)."'";
  };
  /* Setting the right headers for a download: */
  $filename = 'translations_'.date('Y-m-d h:i', time()).'.sql';
  header("Pragma: public");
  header("Expires: 0");
  header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
  header("Content-Type: application/force-download");
  header("Content-Type: application/octet-stream");
  header("Content-Type: application/download");
  header("Content-Disposition: attachment;filename={$filename}");
  header("Content-Transfer-Encoding: binary");
  /* The Table class */
  class Table {
    public  $dbConnection;// Set from the outside
    private $select;      // Query String to fetch from table
    private $mkTuple;     // Function to transform a tuple into a String
    private $buildInsert; // Function to transform a tuplestring into an insert statement
    public function __construct($s,$m,$b){
      $this->select      = $s;
      $this->mkTuple     = $m;
      $this->buildInsert = $b;
    }
    public function run(){
      $mkT = $this->mkTuple;
      $ts  = array();
      $set = $this->dbConnection->query($this->select);
      while($r = $set->fetch_row())
        array_push($ts, $mkT($r));
      if(count($ts) === 0) return '';
      $bIn = $this->buildInsert;
      return $bIn(implode(',', $ts));
    }
  }
  /* Tables to be dumped */
  $tables = array(
    new Table(
      'SELECT TranslationId, TranslationName, BrowserMatch, ImagePath, Active, RfcLanguage FROM Page_Translations'
    , function($r) use ($esc){
        $tid = $r[0];
        $tn  = $esc($r[1]);
        $bm  = $esc($r[2]);
        $ip  = $esc($r[3]);
        $a   = $r[4];
        $rl  = is_null($r[5]) ? 'NULL' : $r[5];
        return "($tid,$tn,$bm,$ip,$a,$rl)";
      }
    , function($s){return "INSERT IGNORE INTO Page_Translations VALUES $s;\n";}
    )
  , new Table(
      'SELECT Req, Description FROM Page_StaticDescription'
    , function($r) use ($esc){return '('.$esc($r[0]).','.$esc($r[1]).')';}
    , function($s){return "INSERT IGNORE INTO Page_StaticDescription VALUES $s;\n";}
    )
  , new Table(
      'SELECT TranslationId, Req, Trans, IsHtml FROM Page_StaticTranslation'
    , function($r) use ($esc){return '('.$r[0].','.$esc($r[1]).','.$esc($r[2]).','.$r[3].')';}
    , function($s){return "INSERT IGNORE INTO Page_StaticTranslation VALUES $s;\n";}
    )
  , new Table(
      'SELECT TranslationId, Category, Field, Trans, Time FROM Page_DynamicTranslation'
    , function($r) use ($esc){return '('.$r[0].','.$esc($r[1]).','.$esc($r[2]).','.$esc($r[3]).','.$esc($r[4]).')';}
    , function($s){return "INSERT IGNORE INTO Page_DynamicTranslation VALUES $s;\n";}
    )
  );
  /* The dumping of tables */
  echo "SET AUTOCOMMIT=0;\nSET FOREIGN_KEY_CHECKS=0;\n";
  foreach(array('Page_DynamicTranslation'
               ,'Page_StaticDescription'
               ,'Page_StaticTranslation'
               ,'Page_Translations') as $t)
    echo "DELETE FROM $t;\n";
  foreach($tables as $t){
    $t->dbConnection = $dbConnection;
    echo $t->run();
  }
  echo "SET FOREIGN_KEY_CHECKS=1;\nCOMMIT;\nSET AUTOCOMMIT=1;\n";
?>
