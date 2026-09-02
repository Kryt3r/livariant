!include "LogicLib.nsh"
!include "FileFunc.nsh"

!macro NSIS_HOOK_POSTINSTALL
  ClearErrors
  ${GetOptions} $CMDLINE "/UPDATE" $0

  ; Automatic updates must not replace the user's first-install language seed.
  ; The in-app language preference remains authoritative once it exists.
  ${If} ${Errors}
    CreateDirectory "$APPDATA\Livariant"

    ${If} $LANGUAGE == ${LANG_GERMAN}
      FileOpen $0 "$APPDATA\Livariant\installer-language.txt" w
      FileWrite $0 "de"
      FileClose $0
    ${Else}
      FileOpen $0 "$APPDATA\Livariant\installer-language.txt" w
      FileWrite $0 "en"
      FileClose $0
    ${EndIf}
  ${EndIf}
!macroend
