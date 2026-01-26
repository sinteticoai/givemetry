// Upload services - barrel exports
// CSV Parser
export {
  parseCSV,
  parseCSVStream,
  detectDelimiter,
  detectColumns,
  getRowCount,
  validateCSVStructure,
  getSampleRows,
  type ParseOptions,
  type StreamOptions,
  type ParseError,
  type ParseResult,
  type ValidationError as CSVValidationError,
  type ValidationWarning as CSVValidationWarning,
  type ValidationResult as CSVValidationResult,
} from "./csv-parser";

// Field Mapper
export {
  suggestFieldMapping,
  validateFieldMapping,
  applyFieldMapping,
  normalizeColumnName,
  getRequiredFields,
  getOptionalFields,
  calculateMappingConfidence,
  findBestMatch,
  type FieldMapping,
  type MappingSuggestion,
  type DataType,
  type ValidationResult as FieldMappingValidationResult,
} from "./field-mapper";

// Constituent Processor
export {
  processConstituents,
  findConstituentByExternalId,
  buildConstituentIdMap,
  type ProcessingResult as ConstituentProcessingResult,
  type ProcessingError as ConstituentProcessingError,
  type ProcessingOptions as ConstituentProcessingOptions,
} from "./constituent-processor";

// Gift Processor
export {
  processGifts,
  type ProcessingResult as GiftProcessingResult,
  type ProcessingError as GiftProcessingError,
  type ProcessingOptions as GiftProcessingOptions,
} from "./gift-processor";

// Contact Processor
export {
  processContacts,
  type ProcessingResult as ContactProcessingResult,
  type ProcessingError as ContactProcessingError,
  type ProcessingOptions as ContactProcessingOptions,
} from "./contact-processor";

// Duplicate Detector
export {
  checkForDuplicates,
  batchCheckForDuplicates,
  calculateNameSimilarity,
  stringSimilarity,
  type DuplicateCandidate,
  type DuplicateCheckResult,
  type DuplicateCheckOptions,
} from "./duplicate-detector";

// Incremental Processor
export {
  detectChanges,
  generateRecordHash,
  processIncrementalUpdates,
  summarizeChanges,
  type ChangeDetectionResult,
  type ChangeDetail,
  type IncrementalProcessOptions,
} from "./incremental-processor";
