!include "LogicLib.nsh"
!include "FileFunc.nsh"

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

  ; Protected Stage A is intentionally NOT executed inside NSIS. The per-machine
  ; Tauri/NSIS install root is validated again by the native Stage-A launcher before use.

!macroend
