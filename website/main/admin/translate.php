<?php
  require_once 'common.php';
  /*Login check and procedure*/
  if(!session_validate($dbConnection))
    header('LOCATION: index.php');
  if(!session_mayTranslate($dbConnection))
    header('LOCATION: index.php');
?>
<!DOCTYPE HTML>
<html>
  <?php
    $title   = "Translate all the things!";
    $jsFiles = array('jquery.iframe-post-form.js'
                    ,'autoresize.jquery.js'
                    ,'dynamicTranslation.js'
                    ,'translate.js'
                    ,'TranslationSearch/Match.js'
                    ,'TranslationSearch/Search.js'
                    ,'TranslationSearch/SearchInput.js'
                    ,'TranslationSearch/SearchInputRow.js'
                    ,'TranslationSearch/DescriptionView.js'
                    ,'Translation.js'
                    );
    require_once 'head.php';
  ?>
  <body><?php
    require_once 'topmenu.php';
    ?><div id="contentArea">
      <div id="Translations">
        <form class="form-horizontal">
          <legend>Editing translations:</legend>
          <div class="control-group">
            <label class="control-label" for="existingTranslations">Translation to edit:</label>
            <div class="controls">
              <select name="existingTranslations" id="Translation_Select">
                <option class="default" selected="selected">none</option>
              </select>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label" for="translationName">Translation name:</label>
            <div class="controls">
              <input name="translationName" id="Translations_Name" type="text">
            </div>
          </div>
          <div class="control-group">
            <label class="control-label" for="browsermatch">Browsermatch:</label>
            <div class="controls">
              <input name="browsermatch" id="Translations_Browsermatch" type="text">
            </div>
          </div>
          <div class="control-group">
            <label class="control-label" for="flag">Flag:</label>
            <div class="controls">
              <img id="Translations_ImagePath" src="">
              <a href="#flagChooser" name="flag" id="Translations_flagSelect" class="btn" role="button" data-toggle="modal"
                title="Can be used to pick a Flag for a Translation.">Select</a>
            </div>
            <div id="flagChooser" class="modal hide fade">
              <div class="modal-header">
                Click the desired Flag.
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
              </div>
              <div class="modal-body"><?php
                  $imgDir = '../img/flags';                  
                  $files  = scandir("$imgDir");
                  foreach($files as $f){
                    if(preg_match('/^[^_]*\.png$/', $f))
                      echo "<img src='$imgDir/$f' class='btn' style='width:16px; height: 11px;'>";
                  }
              ?></div>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label" for="referenceLanguage">Reference language:</label>
            <div class="controls">
              <select name="referenceLanguage" id="Translations_RfcLanguage">
                <option class="default" selected="selected" value="null">none</option><?php
                  $query = 'SELECT ShortName, LanguageIx FROM Languages '
                         . 'WHERE LanguageIx = ANY (SELECT RfcLanguage FROM RfcLanguages)';
                  $set = mysql_query($query, $dbConnection);
                  while($r = mysql_fetch_row($set)){
                    $id = $r[1];
                    $shortName = $r[0];
                    echo "<option value='$id'>$shortName</option>";
                  }
              ?></select>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label" for="translationActive">Active:</label>
            <div class="controls">
              <input name="translationActive" id="Translations_Active" type="checkbox">
            </div>
          </div>
          <div class="control-group">
            <div class="controls form-inline">
              <button id="Translations_Create" type="button" class="btn"
                title="Will create a new Translation in the database.">Create</button>
              <button id="Translations_Update" type="button" class="btn"
                title="Will save your current Translationdata to the database.">Update</button>
              <button id="Translations_Delete" type="button" class="btn"
                title="Will delete your currently selected Translation.">Delete</button>
            </div>
          </div>
        </form>
        <form class="form-inline">
          <legend>With selected translation:</legend>
          <button id="Translations_Translate" class="btn" type="button"
            title="Static content is single words or sentences placed on the website that don't change."
            >Translate static content</button>
          <button id="Translations_TranslateDynamic" class="btn" type="button"
            title="Dynamic content is words, languages, regions, etc."
            >Translate dynamic content</button>
          <button id="Translations_TranslateSearch" class="btn" type="button"
            title="Enter a string to translate and magic will happen.">Translation by search</button>
          <button id="Translations_Export" class="btn" type="button"
            title="Get an .sql script to insert static and dynamic translations."
            >Export all translations</button>
        </form>
      </div>
      <div id="StaticTranslations" class="hide">
        <table id="StaticTable" class="table">
          <tr>
            <th>Description</th>
            <th>Original content</th>
            <th>Translation</th>
            <th>Action
              <button id="Translations_Translate_SaveAll" type="button" class="btn">Save all</button>
            </th>
          </tr>
        </table>
      </div>
      <div id="DynamicTranslations" class="hide">
        <form id="DynamicTranslations_SuffixList" class="form-inline">
          <legend>Category to translate:</legend>
        </form>
        <form id="DynamicTranslations_StudyList" class="form-inline">
          <legend>Study to translate:</legend>
        </form>
        <form id="DynamicTranslations_PageList" class="form-inline">
          <legend>Page to display:</legend>
        </form>
        <table id="DynamicTranslations_Table" class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Original</th>
              <th class="action">
                Translation
                <button id="DynamicTranslations_SaveAll" class="btn">Save all</button>
                <img src="js/ajax-loader.gif" class="hide"/>
              </th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div id="SearchTranslations" class="hide">
        <form class="form-inline">
          <legend>Translation by search:</legend>
          <label>Enter the source text:
            <input id="SearchTranslationInput" type="text" placeholder="Search text">
          </label>
          <button id="SearchTranslationButton" class="btn"><i class="icon-search"></i>Search</button>
        </form>
        <table class="table table-bordered">
          <thead><tr>
            <th>Description:</th>
            <th>Text that matched:</th>
            <th>Original:</th>
            <th>Translation:</th>
          </tr></thead>
          <tbody><tr class="info">
            <td colspan="4">
              Nothing searched, nothing found.
            </td>
          <tr></tbody>
        </table>
      </div>
    </div>
  </body>
</html>
