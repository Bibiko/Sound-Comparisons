<?php
/**
  Below code aims to get rid of MagicQuotes madness in older php versions.
  See http://www.php.net/manual/en/security.magicquotes.disabling.php
  Notice that we've also disabled magic quotes in the .htaccess file.
*/
if(get_magic_quotes_gpc()){
  $process = array(&$_GET, &$_POST, &$_COOKIE, &$_REQUEST);
  while(list($key, $val) = each($process)){
    foreach ($val as $k => $v){
      unset($process[$key][$k]);
      if(is_array($v)){
        $process[$key][stripslashes($k)] = $v;
        $process[] = &$process[$key][stripslashes($k)];
      }else{
        $process[$key][stripslashes($k)] = stripslashes($v);
      }
    }
  }
  unset($process);
}
/**
  The ConfigBase class aims to provide basic methods to the Config class,
  so that the Config can focus on providing login data for the database,
  and nothing more.
*/
abstract class ConfigBase {
  protected static $dbConnection = null;
  protected static $collator     = null;
  protected static $mustache     = null;
  /*
    This is the way that all parts of the website will use in the future to log their errors.
    A possible improvement will be, to let this forward to a nice error page.
  */
  public static function error($msg){
  //$rand = substr(str_shuffle('0123456789abcdefghijklmnopqrstuvwxyz'),0,5);
    error_log($msg);
    if(Config::$debug) die($msg);
  }
  /**
    @return collator [Collator]
    This method requires the php5-intl package.
  */
  public static function getCollator(){
    if(self::$collator === false)
      return null;
    if(is_null(self::$collator)){
      if(class_exists('\\Collator')){
        self::$collator = new \Collator(Config::$locale);
      }else{
        self::$collator = false;
        return null;
      }
    }
    return self::$collator;
  }
  /***/
  public static function getMustache(){
    if(is_null(self::$mustache)){
      require_once 'extern/mustache.php';
      self::$mustache = new Mustache_Engine(array(
        'charset' => 'UTF-8'
      , 'loader'  => new Mustache_Loader_FilesystemLoader(
          dirname(__FILE__).'/templates'
        , array('extension' => 'html')
        )
      ));
    }
    return self::$mustache;
  }
  /***/
  public static function getTemplateInfo(){
    $ret   = array();
    $sums  = `md5sum templates/*.html`;
    $lines = explode("\n", $sums);
    foreach($lines as $l){
      $x = explode('  ', $l);
      if(count($x) !== 2)
        continue;
      $ret[$x[0]] = $x[1];
    }
    return json_encode($ret);
  }
}
?>
