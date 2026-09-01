!include "LogicLib.nsh"

!macro NSIS_HOOK_POSTINSTALL
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
!macroend
