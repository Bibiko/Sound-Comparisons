<?php
  /***/
  function fetchTranslations_LanguageStatusTypes($tid, $study, $offset){
    $descriptions = getDescriptions(array('dt_languageStatusTypes_status'
                                         ,'dt_languageStatusTypes_description'
                                         ,'dt_languageStatusTypes_statusTooltip')
                                   , DB_CONNECTION);
    $values = array();
    $q = "SELECT LanguageStatusType, Status, Description, StatusTooltip FROM LanguageStatusTypes WHERE Description != '' LIMIT ".PAGE_ITEM_LIMIT." OFFSET $offset";
    $set = mysql_query($q, DB_CONNECTION);
    while($r = mysql_fetch_row($set)){
      $lst = $r[0];
      //The basic entry:
      $entry = array(
        $tid        //'TranslationId'
      , 'LanguageStatusTypes' //'TableSuffix'
      , $study      //'Study'
      , $lst        //'Key'
      , array(
          'Status'        => $r[1]
        , 'Description'   => $r[2]
        , 'StatusTooltip' => $r[3]
      ));
      
      //Enritching $entry with existing translations:
      $translation = array();
      $q = "SELECT Trans_Status, Trans_Description, Trans_StatusTooltip "
         . "FROM Page_DynamicTranslation_LanguageStatusTypes "
         . "WHERE TranslationId = $tid AND LanguageStatusType = $lst";
      if($t = mysql_fetch_row(mysql_query($q, DB_CONNECTION))){
        $translation = array(
          'Status'        => $t[0]
        , 'Description'   => $t[1]
        , 'StatusTooltip' => $t[2]
        );
      }
      array_push($entry, $translation, $descriptions);
      array_push($values, $entry);
    }
    return $values;
  }
  /***/
  function saveTranslation_LanguageStatusTypes($tid, $study, $key, $translation){
    $key = $key[0];
    $q = "DELETE FROM Page_DynamicTranslation_LanguageStatusTypes "
       . "WHERE TranslationId = $tid AND LanguageStatusType = $key";
    mysql_query($q, DB_CONNECTION);
    $a = $translation['Status'];
    $b = $translation['Description'];
    $c = $translation['StatusTooltip'];
    $q = "INSERT INTO Page_DynamicTranslation_LanguageStatusTypes(TranslationId, LanguageStatusType, "
       . "Trans_Status, Trans_Description, Trans_StatusTooltip) "
       . "VALUES ($tid,$key,'$a','$b','$c')";
    mysql_query($q, DB_CONNECTION);
  }
?>
