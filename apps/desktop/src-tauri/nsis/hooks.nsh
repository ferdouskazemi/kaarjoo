!macro NSIS_HOOK_PREINSTALL
  ; Gracefully close any running Kaarjoo desktop or sidecar process so files aren't locked
  nsExec::ExecToLog 'taskkill /F /IM kaarjoo-desktop.exe /T'
  Sleep 400
  ; Clean any stale engine directory before extracting updated resources
  RMDir /r "$INSTDIR\engine"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Include WebView2Loader.dll next to the executable when dynamically linked (e.g. gnullvm toolchain)
  ; Path is relative to target/<profile>/nsis/<arch>/installer.nsi
  SetOutPath "$INSTDIR"
  File /nonfatal "..\..\WebView2Loader.dll"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$INSTDIR\WebView2Loader.dll"
!macroend
