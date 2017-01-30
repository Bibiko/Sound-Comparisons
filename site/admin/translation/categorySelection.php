<?php
  $translationId = array_key_exists('tId', $_GET) ? $_GET['tId'] : 1;
  $providerGroup = array_key_exists('providers', $_GET) ? $_GET['providers'] : '';
  //Showing the button for a provider:
  $btn = function($p) use ($translationId, $providerGroup){
    $sel = ($p === $providerGroup) ? ' btn-inverse' : '';
    echo "<a href='?action=translation&tId=$translationId&providers=$p' class='btn $sel'>$p</a>";
  };
  $sAll  = array_key_exists('SearchAll', $_GET) ? ' checked="checked"' : '';
  $sText = array_key_exists('SearchText', $_GET) ? ' value="'.$_GET['SearchText'].'"' : '';
?>
<form class="form-inline">
<h3 class="categoryHeadline">General:</h3>
<?php foreach(array_keys(Translation::generalProviders()) as $p){ $btn($p); } ?>
<h3 class="categoryHeadline" style="color: #666;">Study dependant:</h3>
<?php foreach(array_keys(Translation::studyProviders()) as $p){ $btn($p); } ?>
</form>
<form class="form-inline" action="translate.php" method="get">
<h3 class="categoryHeadline">Search:</h3>
<div class="input-append">
  <label class="checkbox">
    all translations
    <input type="checkbox" name="SearchAll"<?php echo $sAll; ?>>
  </label>
  <input type="text" placeholder="search term" name="SearchText" required<?php echo $sText; ?>>
  <button type="submit" class="btn btn-info">
    <i class="icon-search"></i>Search!
  </button>
</div>
<input type="hidden" name="action" value="search">
<input type="hidden" name="tId" value="<?php echo $translationId; ?>">
</form>
<form class="form-inline">
<h3 class="categoryHeadline">Special cases:</h3>
<?php
  $missing = ($_GET['action'] === 'missing') ? ' btn-inverse' : '';
  $changed = ($_GET['action'] === 'changed') ? ' btn-inverse' : '';
  $compareOriginal = ($_GET['action'] === 'compareOriginal') ? ' btn-inverse' : '';
  $mLnk = '?action=missing&tId='.$translationId;
  $cLnk = '?action=changed&tId='.$translationId;
  $oLnk = '?action=compareOriginal&tId='.$translationId;
?>
<a href="<?php echo $mLnk; ?>" class="btn<?php echo $missing; ?>">Missing translations</a>
<a href="<?php echo $cLnk; ?>" class="btn<?php echo $changed; ?>">Changed translations</a>
<a href="<?php echo $oLnk; ?>" class="btn<?php echo $compareOriginal; ?>">Compare Originals</a>
</form>
<?php
  // We leave translationId and providerGroup:
  unset($btn, $sAll, $sText, $missing, $changed, $mLnk, $cLnk);
