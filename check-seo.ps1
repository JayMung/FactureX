# Script de verification SEO pour FactureX
# Verifie que toutes les metadonnees sont presentes

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test SEO - FactureX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0

# Fonction pour verifier la presence d'une chaine dans un fichier
function Test-FileContains {
    param (
        [string]$FilePath,
        [string]$Pattern,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        if ($content -match $Pattern) {
            Write-Host "  [OK] $Description" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  [ERREUR] $Description" -ForegroundColor Red
            $script:errors++
            return $false
        }
    } else {
        Write-Host "  [ERREUR] Fichier manquant: $FilePath" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

# Fonction pour verifier l'existence d'un fichier
function Test-FileExistence {
    param (
        [string]$FilePath,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        Write-Host "  [OK] $Description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  [ERREUR] $Description" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

# Test 1: Verification du fichier index.html
Write-Host "Verification de index.html" -ForegroundColor Yellow
Write-Host ""

Test-FileContains -FilePath "index.html" -Pattern 'property="og:title"' -Description "Open Graph title"
Test-FileContains -FilePath "index.html" -Pattern 'property="og:description"' -Description "Open Graph description"
Test-FileContains -FilePath "index.html" -Pattern 'property="og:image"' -Description "Open Graph image"
Test-FileContains -FilePath "index.html" -Pattern 'property="og:url"' -Description "Open Graph URL"
Test-FileContains -FilePath "index.html" -Pattern 'property="twitter:card"' -Description "Twitter card"
Test-FileContains -FilePath "index.html" -Pattern 'name="description"' -Description "Meta description"
Test-FileContains -FilePath "index.html" -Pattern 'rel="canonical"' -Description "Canonical URL"

Write-Host ""

# Test 2: Verification des fichiers publics
Write-Host "Verification des fichiers publics" -ForegroundColor Yellow
Write-Host ""

Test-FileExistence -FilePath "public\og-image.svg" -Description "Image Open Graph"
Test-FileExistence -FilePath "public\sitemap.xml" -Description "Sitemap XML"
Test-FileExistence -FilePath "public\robots.txt" -Description "Robots.txt"
Test-FileExistence -FilePath "public\manifest.json" -Description "Manifest PWA"

Write-Host ""

# Resultat final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resultat" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($errors -eq 0) {
    Write-Host "  Parfait ! Toutes les verifications sont passees." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Prochaines etapes:" -ForegroundColor White
    Write-Host "  1. Deployez vos changements" -ForegroundColor White
    Write-Host "  2. Attendez 5-10 minutes" -ForegroundColor White
    Write-Host "  3. Testez sur Facebook Debugger" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  $errors erreur(s) detectee(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Veuillez corriger les erreurs avant de deployer." -ForegroundColor Red
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Code de sortie
if ($errors -gt 0) {
    exit 1
} else {
    exit 0
}
