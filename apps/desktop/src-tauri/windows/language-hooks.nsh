!include "LogicLib.nsh"
!include "FileFunc.nsh"

!macro NSIS_HOOK_POSTINSTALL
  ClearErrors
  ${GetOptions} $CMDLINE "/UPDATE" $0

  ; Automatic updates must not replace the user's first-install language seed.
  ; Keep this check immediately after GetOptions so later installer work cannot
  ; overwrite the NSIS error flag that distinguishes first install from update.
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

  ; The Desktop installer is also the release-bound Stage-A carrier. Stage A is
  ; allowed only from the fixed per-machine installation root.
  StrCmp "$INSTDIR" "$PROGRAMFILES64\Livariant" stage_a_root_ok 0
    MessageBox MB_ICONSTOP "Livariant protected setup requires the fixed per-machine path $PROGRAMFILES64\Livariant."
    Abort "Unsafe Livariant installation root for protected setup."
  stage_a_root_ok:

  ; Existing protected bootstrap state is never silently replaced by normal app
  ; install/update. Fresh machines get exact bundled Stage-A material once.
  IfFileExists "C:\Program Files\Livariant\Bootstrap\v1\bootstrap-release.json" stage_a_done 0
    nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\runtime\protected-bootstrap-assets\desktop-stage-a.ps1"'
    Pop $1
    Pop $2
    StrCmp $1 "0" stage_a_done 0
      MessageBox MB_ICONSTOP "Livariant protected Stage-A setup failed.$\r$\n$\r$\n$2"
      Abort "Protected Stage-A setup failed."
  stage_a_done:

!macroend
