@echo off
echo ABJAD -> GitHub (login haddii loo baahdo, kadib repo + Pages)
wsl.exe -e bash -lc "cd \"$HOME/abjad\" && (gh auth status >/dev/null 2>&1 || gh auth login) && ./push-github.sh"
echo.
pause
