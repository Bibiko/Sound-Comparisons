<?php
  /**
    The StaticTranslationProvider provides search and update
    facilities for the static translation.
  */
  require_once('TranslationProvider.php');
  class StaticTranslationProvider extends TranslationProvider{
    public function search($tId, $searchText, $searchAll = false){
      $ret = array();
      $q = "SELECT Req, Trans, TranslationId FROM Page_StaticTranslation "
         . "WHERE Trans LIKE '%$searchText%'";
      if(!$searchAll){
        $q .= " AND (TranslationId = $tId OR TranslationId = 1)";
      }
      $set = $this->dbConnection->query($q);
      while($r = $set->fetch_row()){
        $payload = $r[0];
        $match   = $r[1];
        $matchId = $r[2];
        $description = TranslationProvider::getDescription($payload);
        $q = "SELECT Trans FROM Page_StaticTranslation "
           . "WHERE TranslationId = 1 AND Req = '$payload'";
        $original = $this->dbConnection->query($q)->fetch_row();
        $q = "SELECT Trans FROM Page_StaticTranslation "
           . "WHERE TranslationId = $tId AND Req = '$payload'";
        $translation = $this->dbConnection->query($q)->fetch_row();
        array_push($ret, array(
          'Description' => $description
        , 'Match'       => $match
        , 'MatchId'     => $matchId
        , 'Original'    => $original[0]
        , 'Translation' => array(
            'TranslationId'       => $tId
          , 'Translation'         => $translation[0]
          , 'Payload'             => $payload
          , 'TranslationProvider' => $this->getName()
          )
        ));
      }
      return $ret;
    }
    public function update($tId, $payload, $update){
      $db      = $this->dbConnection;
      $payload = $db->escape_string($payload);
      $update  = $db->escape_string($update);
      $qs = array(
        "DELETE FROM Page_StaticTranslation WHERE Req = '$payload' AND TranslationId = $tId"
      , "INSERT INTO Page_StaticTranslation(TranslationId, Req, Trans) VALUES ($tId, '$payload', '$update')"
      , "UPDATE Page_Translations SET lastChangeStatic = CURRENT_TIMESTAMP() WHERE TranslationId = $tId"
      );
      foreach($qs as $q)
        $db->query($q);
    }
    public function offsets($tId, $study){
      $q = "SELECT COUNT(*) FROM Page_StaticTranslation WHERE TranslationId = 1";
      $r = $this->querySingleRow($q);
      return $this->offsetsFromCount(current($r));
    }
    public function page($tId, $study, $offset){
      $ret = array();
      $o = ($offset == -1) ? '' : " LIMIT 30 OFFSET $offset";
      $q = "SELECT Req, Trans FROM Page_StaticTranslation WHERE TranslationId = 1$o";
      foreach($this->fetchRows($q) as $r){
        $payload = $r[0];
        $description = TranslationProvider::getDescription($payload);
        $q = "SELECT Trans FROM Page_StaticTranslation "
           . "WHERE TranslationId = $tId AND Req = '$payload'";
        $translation = $this->dbConnection->query($q)->fetch_row();
        array_push($ret, array(
          'Description' => $description
        , 'Original'    => $r[1]
        , 'Translation' => array(
            'TranslationId'       => $tId
          , 'Translation'         => $translation[0]
          , 'Payload'             => $payload
          , 'TranslationProvider' => $this->getName()
          )
        ));
      }
      return $ret;
    }
    /***/
    public static function getChanged($tId){
      $ret = array();
      if($tId !== 1){
        $q = "SELECT Req, Trans FROM Page_StaticTranslation WHERE TranslationId = 1";
        foreach(DataProvider::fetchAll($q) as $r){
          $req = $r['Req'];
          $q = "SELECT Trans FROM Page_StaticTranslation WHERE "
             . "Req = '$req' AND TranslationId = $tId AND Time < ("
             . "SELECT Time FROM Page_StaticTranslation "
             . "WHERE Req = '$req' AND TranslationId = 1)";
          foreach(DataProvider::fetchAll($q) as $x){
            array_push($ret, array(
              'Description' => TranslationProvider::getDescription($req)
            , 'Original'    => $r['Trans']
            , 'Translation' => array(
                'TranslationId'       => $tId
              , 'Translation'         => $x['Trans']
              , 'Payload'             => $req
              , 'TranslationProvider' => 'StaticTranslationProvider'
              )
            ));
          }
        }
      }
      return $ret;
    }
  }
