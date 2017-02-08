<?php
//Setting memory_limit to 512M, to aid #97:
ini_set('memory_limit', 400000000);
//Parsing cli args, if necessary/possible:
if(php_sapi_name() === 'cli'){
  if(!isset($_GET)){
    $_GET = array();
  }
  if(count($argv) > 0){
    for($i = 1; $i < count($argv); $i++){
      switch($argv[$i]){
        case 'global':
          $_GET['global'] = true;
        break;
        case 'study':
          $_GET[$argv[$i]] = $argv[$i+1];
          $i++;
        break;
      }
    }
  }
}
//Setup:
chdir(__DIR__);
require_once('dataProvider.php');
require_once('cacheProvider.php');
chdir('..');
require_once('config.php');
/*
  For the site to do as much as possible in the browser, it's crucial to have a data representation in JSON,
  so that we can use and manipulate stuff in JavaScript with ease.
  After reading http://alistapart.com/article/application-cache-is-a-douchebag I came to the conclusion,
  that ApplicationCache is not what we want for our dynamic content,
  but we'll stick with our current practise of storing stuff in localStorage.
  However, since the main data that shall be provided by this file
  may be bigger than fits localStorage, we choose a different route:
  1.: We offer a list of studies, and also global data applying to each study.
  2.: Each study can be fetched separately.
  3.: JavaScript will tack a timestamp on each study,
      so that we can drop older studies from localStorage,
      in case that we're running out of space.
  4.: The data for each study thus consists of the following things:
      - Name and basic data for the study itself
      - A list of Families in the Study
      - A list of Regions per Family
      - A list of Languages per Region
      - A list of Words per Study
      - A list of Transcriptions per pair of Word and Language
      - Defaults for the Study
*/
if(array_key_exists('global',$_GET)){
  echo Config::toJSON(array(
    'studies' => DataProvider::getStudiesForDisplay()
  , 'global'  => DataProvider::getGlobal()
  ));
}else if(array_key_exists('study',$_GET)){
  if(CacheProvider::hasCache($_GET['study'])){
    echo CacheProvider::getCache($_GET['study']);
  }else{
    $ret = DataProvider::getStudyChunk($_GET['study']);
    //Done:
    $data = json_encode($ret);
    echo $data;
    CacheProvider::setCache($_GET['study'], $data);
  }
}else{
  echo json_encode(array(
    'lastUpdate'  => DataProvider::getLastImport()
  , 'Description' => 'Add a global parameter to fetch global data, '
                   . 'and add a study parameter to fetch a study.'
  ));
}
