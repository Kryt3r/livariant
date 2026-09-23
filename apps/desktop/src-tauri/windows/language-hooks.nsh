!include "LogicLib.nsh"
!include "FileFunc.nsh"

!macro NSIS_HOOK_PREINSTALL
  ; Keep the ordinary Desktop installation separate from the persistent protected
  ; bootstrap source so uninstalling the app does not delete Guardian bootstrap state.
  StrCpy $INSTDIR "$PROGRAMFILES64\Livariant\Desktop"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ClearErrors
  ${GetOptions} $CMDLINE "/UPDATE" $0

  ; Automatic updates must not replace the user's first-install language seed.
  ; Keep this check immediately after GetOptions so later installer work cannot
  ; overwrite the NSIS error flag that distinguishes first install from update.
  ${If} ${Errors}
    ReadEnvStr $R0 "ProgramData"
    ${If} $R0 == ""
      MessageBox MB_ICONSTOP "Livariant could not resolve the Windows ProgramData directory for the installer language seed."
      Abort "ProgramData is unavailable."
    ${EndIf}
    CreateDirectory "$R0\Livariant"

    ${If} $LANGUAGE == ${LANG_GERMAN}
      FileOpen $0 "$R0\Livariant\installer-language.txt" w
      FileWrite $0 "de"
      FileClose $0
    ${Else}
      FileOpen $0 "$R0\Livariant\installer-language.txt" w
      FileWrite $0 "en"
      FileClose $0
    ${EndIf}
  ${EndIf}

  ; Keep the installed Desktop at the fixed per-machine root. Protected Stage A
  ; is intentionally NOT executed inside NSIS: it is a separate explicit UAC flow
  ; started by Project Knowledge after installation so installer completion remains bounded.
  StrCmp "$INSTDIR" "$PROGRAMFILES64\Livariant\Desktop" stage_a_root_ok 0
    MessageBox MB_ICONSTOP "Livariant requires the fixed per-machine path $PROGRAMFILES64\Livariant\Desktop."
    Abort "Unsafe Livariant installation root."
  stage_a_root_ok:

!macroend
