# Script de test SEO pour FactureX
# Vérifie que toutes les métadonnées sont présentes

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  🔍 Test SEO - FactureX" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Fonction pour vérifier la présence d'une chaîne dans un fichier
function Test-FileContains {
    param (
        [string]$FilePath,
        [string]$Pattern,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        if ($content -match $Pattern) {
            Write-Host "  ✅ $Description" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ❌ $Description" -ForegroundColor Red
            $script:errors++
            return $false
        }
    } else {
        Write-Host "  ❌ Fichier manquant: $FilePath" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

# Fonction pour vérifier l'existence d'un fichier
function Test-FileExistence {
    param (
        [string]$FilePath,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        Write-Host "  ✅ $Description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ $Description" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

# Test 1: Vérification du fichier index.html
Write-Host "📄 Vérification de index.html" -ForegroundColor Yellow
Write-Host ""

Test-FileContains -FilePath "index.html" -Pattern 'property="og:title"' -Description "Open Graph title"
Test-FileContains -FilePath "index.html" -Pattern 'property="og:description"' -Description "Open Graph description"
Test-FileContains -FilePath "index.html" -Pattern 'property="og:image"' -Description "Open Graph image"
Test-FileContains -FilePath "index.html" -Pattern 'property="og:url"' -Description "Open Graph URL"
Test-FileContains -FilePath "index.html" -Pattern 'property="twitter:card"' -Description "Twitter card"
Test-FileContains -FilePath "index.html" -Pattern 'property="twitter:title"' -Description "Twitter title"
Test-FileContains -FilePath "index.html" -Pattern 'property="twitter:image"' -Description "Twitter image"
Test-FileContains -FilePath "index.html" -Pattern 'name="description"' -Description "Meta description"
Test-FileContains -FilePath "index.html" -Pattern '<title>' -Description "Title tag"
Test-FileContains -FilePath "index.html" -Pattern 'rel="canonical"' -Description "Canonical URL"
Test-FileContains -FilePath "index.html" -Pattern 'rel="manifest"' -Description "Manifest link"

Write-Host ""

# Test 2: Vérification des fichiers publics
Write-Host "📁 Vérification des fichiers publics" -ForegroundColor Yellow
Write-Host ""

Test-FileExistence -FilePath "public\og-image.svg" -Description "Image Open Graph (og-image.svg)"
Test-FileExistence -FilePath "public\sitemap.xml" -Description "Sitemap XML"
Test-FileExistence -FilePath "public\robots.txt" -Description "Robots.txt"
Test-FileExistence -FilePath "public\manifest.json" -Description "Manifest PWA"
Test-FileExistence -FilePath "public\favicon.ico" -Description "Favicon"

Write-Host ""

# Test 3: Vérification du robots.txt
Write-Host "🤖 Vérification de robots.txt" -ForegroundColor Yellow
Write-Host ""

Test-FileContains -FilePath "public\robots.txt" -Pattern 'Sitemap:' -Description "Référence au sitemap"
Test-FileContains -FilePath "public\robots.txt" -Pattern 'User-agent:' -Description "User-agent défini"

Write-Host ""

# Test 4: Vérification du sitemap.xml
Write-Host "🗺️  Vérification de sitemap.xml" -ForegroundColor Yellow
Write-Host ""

Test-FileContains -FilePath "public\sitemap.xml" -Pattern '<urlset' -Description "Structure XML valide"
Test-FileContains -FilePath "public\sitemap.xml" -Pattern 'facturex.coccinelledrc.com' -Description "URL du site présente"

Write-Host ""

# Test 5: Vérification du manifest.json
Write-Host "📱 Vérification de manifest.json" -ForegroundColor Yellow
Write-Host ""

Test-FileContains -FilePath "public\manifest.json" -Pattern '"name"' -Description "Nom de l'application"
Test-FileContains -FilePath "public\manifest.json" -Pattern '"theme_color"' -Description "Couleur de thème"
Test-FileContains -FilePath "public\manifest.json" -Pattern '"icons"' -Description "Icônes définies"

Write-Host ""

# Test 6: Vérification des longueurs recommandées
Write-Host "📏 Vérification des longueurs (recommandations)" -ForegroundColor Yellow
Write-Host ""

$indexContent = Get-Content "index.html" -Raw

# Vérifier la longueur du titre
if ($indexContent -match '<title>(.+?)</title>') {
    $titleLength = $matches[1].Length
    if ($titleLength -le 60) {
        Write-Host "  [OK] Longueur du titre: $titleLength caracteres (optimal)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Longueur du titre: $titleLength caracteres (max 60 recommande)" -ForegroundColor Yellow
        $script:warnings++
    }
}

# Vérifier la longueur de la description
if ($indexContent -match 'name="description" content="(.+?)"') {
    $descLength = $matches[1].Length
    if ($descLength -ge 50 -and $descLength -le 160) {
        Write-Host "  [OK] Longueur de la description: $descLength caracteres (optimal)" -ForegroundColor Green
    } elseif ($descLength -lt 50) {
        Write-Host "  [WARN] Longueur de la description: $descLength caracteres (min 50 recommande)" -ForegroundColor Yellow
        $script:warnings++
    } else {
        Write-Host "  [WARN] Longueur de la description: $descLength caracteres (max 160 recommande)" -ForegroundColor Yellow
        $script:warnings++
    }
}

Write-Host ""

# Résumé final
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  📊 Résumé" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "  🎉 Parfait ! Toutes les vérifications sont passées." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Prochaines étapes:" -ForegroundColor White
    Write-Host "  1. Déployez vos changements" -ForegroundColor White
    Write-Host "  2. Attendez 5-10 minutes" -ForegroundColor White
    Write-Host "  3. Testez sur https://developers.facebook.com/tools/debug/" -ForegroundColor White
    Write-Host ""
} elseif ($errors -eq 0) {
    Write-Host "  ✅ Aucune erreur détectée" -ForegroundColor Green
    Write-Host "  ⚠️  $warnings avertissement(s)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Les avertissements sont des recommandations, pas des erreurs bloquantes." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "  ❌ $errors erreur(s) détectée(s)" -ForegroundColor Red
    if ($warnings -gt 0) {
        Write-Host "  ⚠️  $warnings avertissement(s)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "  Veuillez corriger les erreurs avant de déployer." -ForegroundColor Red
    Write-Host ""
}

# Liens utiles
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  🔗 Liens utiles" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Facebook Debugger:" -ForegroundColor White
Write-Host "  https://developers.facebook.com/tools/debug/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Twitter Card Validator:" -ForegroundColor White
Write-Host "  https://cards-dev.twitter.com/validator" -ForegroundColor Cyan
Write-Host ""
Write-Host "  LinkedIn Post Inspector:" -ForegroundColor White
Write-Host "  https://www.linkedin.com/post-inspector/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Google Rich Results:" -ForegroundColor White
Write-Host "  https://search.google.com/test/rich-results" -ForegroundColor Cyan
Write-Host ""

# Ouvrir la page de test dans le navigateur
$openTest = Read-Host "Voulez-vous ouvrir la page de test dans votre navigateur ? (O/N)"
if ($openTest -eq "O" -or $openTest -eq "o") {
    if (Test-Path "test-seo.html") {
        Start-Process "test-seo.html"
        Write-Host ""
        Write-Host "  ✅ Page de test ouverte dans votre navigateur" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  ❌ Fichier test-seo.html introuvable" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Code de sortie
if ($errors -gt 0) {
    exit 1
} else {
    exit 0
}
