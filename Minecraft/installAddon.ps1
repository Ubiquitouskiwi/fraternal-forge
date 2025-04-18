# Check for project parameter
param([string]$project="")

$MINECRAFT_DEVELOPMENT_BEHAVIOR_PACK_FOLDER = "development_behavior_packs"
$MINECRAFT_DEVELOPMENT_RESOURCE_PACK_FOLDER = "development_resource_packs"
$MINECRAFT_MAIN_FOLDER = Join-Path -Path $env:LOCALAPPDATA -ChildPath "Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang"
$MINECRAFT_PRERELEASE_FOLDER = Join-Path -Path $env:LOCALAPPDATA -ChildPath  "Packages\Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe\LocalState\games\com.mojang"
$minecraftFolder = $MINECRAFT_MAIN_FOLDER

$MINECRAFT_ADDON_PROJECTS_ROOT = $PSScriptRoot
$projectLocalPath = Join-Path -Path $MINECRAFT_ADDON_PROJECTS_ROOT -ChildPath $project

# Check for project parameter
if ($project -eq "") {
    Write-Host "No project name specified"
    Exit
}

# Check if project  name supplied exists in local git repo
if (-Not (Test-Path -Path $projectLocalPath)) {
    Write-Host "Project name supplied doesnt exist in local git repo"
    Exit
}

# Check alternative minecraft prerelease folder
if (-Not (Test-Path -Path $minecraftFolder)) {
    Write-Host "Couldn't find minecraft main release install folder"
    if (-Not (Test-Path -Path $MINECRAFT_PRERELEASE_FOLDER)) {
        Write-Host "Minecraft install cannot be found on computer."
        Exit
    }
    Write-Host "Main release folder not found. switched to prelease folder"

    $minecraftFolder = $MINECRAFT_PRERELEASE_FOLDER
} 

$projectInstallResourcePath = Join-Path -Path $minecraftFolder -ChildPath (Join-Path -Path $MINECRAFT_DEVELOPMENT_RESOURCE_PACK_FOLDER -ChildPath  "$($project)_resource_pack")
$projectInstallBehaviorPath = Join-Path -Path $minecraftFolder -ChildPath (Join-Path -Path $project -ChildPath $MINECRAFT_DEVELOPMENT_BEHAVIOR_PACK_FOLDER)

# Check if addon already installed in mincraft install folder

Copy-Item -Path (Join-Path -Path $projectLocalPath -ChildPath (Join-Path -Path "resource_pack" -ChildPath "*")) -Destination (Join-Path -Path $projectInstallResourcePath -ChildPath "$($project)_resource_pack") -Recurse -Force
Copy-Item -Path (Join-Path -Path $projectLocalPath -ChildPath (Join-Path -Path "resource_pack" -ChildPath "*")) -Destination (Join-Path -Path $projectInstallBehaviorPath -ChildPath "$($project)_resource_pack") -Recurse -Force