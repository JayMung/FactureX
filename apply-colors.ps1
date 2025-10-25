# Script d'application automatique du Design System FactureX
# Remplace emerald par green dans tous les fichiers TSX

Write-Host "Application du Design System FactureX..." -ForegroundColor Cyan
Write-Host ""

$sourceDir = "C:\Users\jkmun\dyad-apps\FactureX\src"
$filesProcessed = 0
$replacementsMade = 0

# Liste des remplacements à effectuer
$replacements = @{
    'emerald-50' = 'green-50'
    'emerald-100' = 'green-100'
    'emerald-200' = 'green-200'
    'emerald-300' = 'green-300'
    'emerald-400' = 'green-400'
    'emerald-500' = 'green-500'
    'emerald-600' = 'green-500'
    'emerald-700' = 'green-600'
    'emerald-800' = 'green-700'
    'emerald-900' = 'green-900'
}

# Fonction pour remplacer dans un fichier
function Replace-InFile {
    param (
        [string]$FilePath
    )
    
    $content = Get-Content $FilePath -Raw -Encoding UTF8
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($key in $replacements.Keys) {
        $oldValue = $key
        $newValue = $replacements[$key]
        $matches = ([regex]::Matches($content, [regex]::Escape($oldValue))).Count
        
        if ($matches -gt 0) {
            $content = $content -replace [regex]::Escape($oldValue), $newValue
            $fileReplacements += $matches
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content $FilePath -Value $content -Encoding UTF8 -NoNewline
        return $fileReplacements
    }
    
    return 0
}

# Traiter tous les fichiers TSX et JSX
$files = Get-ChildItem -Path $sourceDir -Include "*.tsx","*.jsx" -Recurse

Write-Host "Fichiers trouves: $($files.Count)" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $count = Replace-InFile -FilePath $file.FullName
    
    if ($count -gt 0) {
        $filesProcessed++
        $replacementsMade += $count
        Write-Host "OK $($file.Name): $count remplacement(s)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Termine!" -ForegroundColor Green
Write-Host "Fichiers modifies: $filesProcessed" -ForegroundColor Yellow
Write-Host "Remplacements effectues: $replacementsMade" -ForegroundColor Yellow
Write-Host ""
Write-Host "Verifiez avec: npm run dev" -ForegroundColor Cyan
