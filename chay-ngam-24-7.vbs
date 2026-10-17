' Script khoi chay toan bo he thong NHACUALAND chay ngam 24/7 (khong hien cua so đen)
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = currentDir
WshShell.Run "cmd /c """ & currentDir & "\chay-website-va-tunnel.bat""", 0, False
