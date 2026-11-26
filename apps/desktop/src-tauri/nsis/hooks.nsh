!macro NSIS_HOOK_PREINSTALL
  ; EngineSupervisor now terminates all child node/browser processes cleanly on exit.
  ; Clean any stale engine directory before extracting updated resources.
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
