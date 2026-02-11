/**
 * csv-export.ts — Utilitaire d'export CSV production-grade
 *
 * Centralise la logique d'export CSV pour éviter la duplication
 * dans useBulkOperations et useExtendedBulkOperations.
 */

/** Options de configuration pour l'export CSV */
export interface CsvExportOptions {
  /** Nom du fichier (sans extension). Un timestamp sera ajouté automatiquement. */
  filename: string;
  /** Séparateur de colonnes (défaut: ',') */
  separator?: string;
  /** Inclure un BOM UTF-8 pour compatibilité Excel (défaut: true) */
  bom?: boolean;
}

/**
 * Échappe une valeur CSV selon RFC 4180.
 * Entoure de guillemets si la valeur contient un séparateur, des guillemets ou un saut de ligne.
 */
function escapeCsvValue(value: string, separator: string): string {
  if (
    value.includes(separator) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convertit un tableau de données en chaîne CSV.
 *
 * @param headers - En-têtes de colonnes
 * @param rows - Lignes de données (chaque ligne = tableau de strings)
 * @param separator - Séparateur (défaut: ',')
 * @returns Chaîne CSV formatée
 */
export function toCsvString(
  headers: string[],
  rows: string[][],
  separator: string = ','
): string {
  const escapedHeaders = headers.map((h) => escapeCsvValue(h, separator));
  const escapedRows = rows.map((row) =>
    row.map((cell) => escapeCsvValue(cell ?? '', separator)).join(separator)
  );

  return [escapedHeaders.join(separator), ...escapedRows].join('\n');
}

/**
 * Exporte des données en fichier CSV et déclenche le téléchargement.
 *
 * @param headers - En-têtes de colonnes
 * @param rows - Lignes de données (chaque ligne = tableau de strings)
 * @param options - Options d'export (filename, separator, bom)
 *
 * @example
 * ```ts
 * exportToCsv(
 *   ['Nom', 'Téléphone', 'Ville'],
 *   clients.map(c => [c.nom, c.telephone, c.ville]),
 *   { filename: 'clients-export' }
 * );
 * ```
 */
export function exportToCsv(
  headers: string[],
  rows: string[][],
  options: CsvExportOptions
): void {
  const { filename, separator = ',', bom = true } = options;

  const csvContent = toCsvString(headers, rows, separator);

  // BOM UTF-8 pour que Excel interprète correctement les accents
  const blobContent = bom ? `\uFEFF${csvContent}` : csvContent;

  const blob = new Blob([blobContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.csv`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fullFilename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exporte des données en fichier texte et déclenche le téléchargement.
 * Utile pour les exports de contacts, logs, etc.
 *
 * @param content - Contenu texte à exporter
 * @param filename - Nom du fichier (sans extension)
 */
export function exportToText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.txt`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fullFilename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
