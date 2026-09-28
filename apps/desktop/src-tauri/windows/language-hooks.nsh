!include "LogicLib.nsh"
!include "FileFunc.nsh"

!macro NSIS_HOOK_PREINSTALL
  ; A stale bundled Node process from an earlier Desktop session must not block
  ; replacement of the exact installed runtime. Scope cleanup to the fixed
  ; Livariant executable path only; never kill processes by image name alone.
  nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object -Property ExecutablePath -EQ -Value '$INSTDIR\livariant-node.exe' | Invoke-CimMethod -MethodName Terminate | Out-Null; Start-Sleep -Milliseconds 750; if (Get-CimInstance Win32_Process | Where-Object -Property ExecutablePath -EQ -Value '$INSTDIR\livariant-node.exe') { exit 23 }"`
  Pop $0
  Pop $1
  ${If} $0 != 0
    ${If} $LANGUAGE == ${LANG_GERMAN}
      MessageBox MB_ICONSTOP "Ein laufender Livariant-Hintergrundprozess konnte nicht sicher beendet werden. Bitte schließen Sie Livariant vollständig und versuchen Sie es erneut."
      Abort "Livariant-Hintergrundprozess blockiert die Installation."
    ${Else}
      MessageBox MB_ICONSTOP "A running Livariant background process could not be stopped safely. Please close Livariant completely and try again."
      Abort "Livariant background process is blocking installation."
    ${EndIf}
  ${EndIf}
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

  ; Protected Stage A is intentionally NOT executed inside NSIS. The per-machine
  ; Tauri/NSIS install root is validated again by the native Stage-A launcher before use.

!macroend
