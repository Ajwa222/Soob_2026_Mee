/**
 * Saudi Riyal (SAR) currency symbol component.
 *
 * Renders the SAR symbol using a custom font (saudi-riyal class defined in index.css).
 * The character '\xEA' maps to the Riyal glyph in the loaded font.
 */
const SarSymbol = ({ className = '' }: { className?: string }) => (
  <span className={`saudi-riyal ${className}`}>{'\xEA'}</span>
);

export default SarSymbol;
