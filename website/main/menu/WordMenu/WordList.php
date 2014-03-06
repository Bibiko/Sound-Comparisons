<?php
/**
  @param $words Word[]
  @param $v ValueManager
  @param $t Translator
  @return wordList String Html
  Builds the WordList for WordMenu.php
*/
function WordMenuBuildWordList($words, $v, $t){
  Stopwatch::start('WordMenuBuildWordList');
  $wordList = "<ul class='wordList'>";
  $multi    = $v->gpv()->isSelection();
  foreach($words as $w){
    $hasWord  = $v->hasWord($w);
    $selected = $hasWord ? ' class="selected"' : '';
    $icon = '';
    $ttip = '';
    $href = '';
    if($multi){
      $icon = $hasWord ? 'icon-check' : 'icon-chkbox-custom';
      $ttip = $hasWord ? $t->st('multimenu_tooltip_del')
                       : $t->st('multimenu_tooltip_add');
      $href = $hasWord ? $v->delWord($w)->link()
                       : $v->addWord($w)->link();
      $icon = "<a title='$ttip' $href><i class='$icon'></i></a>";
    }
    if($v->gpv()->isView('MapView')){
      $href = $v->setWord($w)->link();
    }else{
      $href = $v->gpv()->setView('WordView')->setWord($w)->link();
    }
    $ttip = $w->getLongName();
    if(!$ttip) $ttip = '';
    $phonetics = array('*'.$w->getProtoName());
    if($rf = $v->gwo()->getPhLang()){
      $tr  = Transcription::getTranscriptionForWordLang($w, $rf);
      $phonetics = $tr->getPhonetics($v);
    }
    $trans = $w->getTranslation($v, true, false);
    $cname = $w->getKey();
    $ttip  = ($ttip === '') ? '' : " title='$ttip'";
    $link  = ($href === '') ? $trans : "$icon<a class='color-word wordLinkModernName'$ttip $href>$trans</a>";
    foreach($phonetics as $i => $phonetic){
      $subscript = '';
      if(count($phonetics) > 1){
        $ttip = $t->st('tooltip_subscript_differentVariants');
        $subscript = '<div class="subscript" title="'.$ttip.'">'.($i+1).'</div>';
      }
      $wordList .= "<li$selected>"
                 . "<div class='p50 color-word' data-canonicalName='$cname'>"
                 . "$link$subscript"
                 . "</div><div class='p50'>$phonetic</div></li>";
    }
  }
  Stopwatch::stop('WordMenuBuildWordList');
  return $wordList.'</ul>';
}
?>
