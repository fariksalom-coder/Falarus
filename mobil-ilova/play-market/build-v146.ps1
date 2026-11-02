$ErrorActionPreference = 'Stop'
$appRoot = (Join-Path $PSScriptRoot 'android-v144')
$jdkRoot = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.build-tools\jdk21') -Directory | Select-Object -First 1
if (-not $jdkRoot) { throw 'Java 21 is missing' }
$env:JAVA_HOME = $jdkRoot.FullName
$env:GRADLE_USER_HOME = 'E:\FalaRus-Android-011026\gradle-cache'
$env:ANDROID_USER_HOME = 'E:\FalaRus-Android-011026\android-profile\.android'
$env:ANDROID_HOME = 'E:\FalaRus-Android-011026\sdk'
$taskTemp = Join-Path $PSScriptRoot '.build-tools\temp'
New-Item -ItemType Directory -Force -Path $taskTemp | Out-Null
$env:TEMP = $taskTemp
$env:TMP = $taskTemp
$env:JAVA_TOOL_OPTIONS = "-Duser.home=E:/FalaRus-Android-011026/android-profile -Djava.io.tmpdir=`"$taskTemp`""
Set-Location -LiteralPath $appRoot
& 'C:\Program Files\nodejs\node.exe' node_modules\vite\bin\vite.js build --configLoader runner
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
& 'C:\Program Files\nodejs\node.exe' node_modules\@capacitor\cli\bin\capacitor sync android
if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }
Set-Location -LiteralPath (Join-Path $appRoot 'android')
$gradle = 'C:\Users\User\Documents\Codex\2026-09-22\qa\work\gradle-cache\wrapper\dists\gradle-8.11.1-all\2qik7nd48slq1ooc2496ixf4i\gradle-8.11.1\bin\gradle.bat'
& $gradle assembleRelease bundleRelease --no-daemon --max-workers=2
if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
Copy-Item -LiteralPath (Join-Path $appRoot 'android\app\build\outputs\apk\release\app-release.apk') -Destination (Join-Path $PSScriptRoot 'FalaRus-13.10.26-v146.apk') -Force
Copy-Item -LiteralPath (Join-Path $appRoot 'android\app\build\outputs\bundle\release\app-release.aab') -Destination (Join-Path $PSScriptRoot 'FalaRus-13.10.26-v146.aab') -Force
Write-Output 'Signed APK and AAB copied to the Play market folder.'




