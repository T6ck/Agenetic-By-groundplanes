!macro customWelcomePage
  !insertmacro skipPageIfUpdated
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Agenetic"
  !define MUI_WELCOMEPAGE_TEXT "Set up Agenetic by Groundplanes, your local workspace for research and AI agents.$\r$\n$\r$\nSelect Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend
