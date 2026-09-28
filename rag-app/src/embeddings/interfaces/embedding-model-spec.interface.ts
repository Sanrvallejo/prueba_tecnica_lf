export interface EmbeddingModelSpec {
  dimension: number;
  documentPrefix: string;
  queryPrefix: string;
  /** Máximo de caracteres por texto (prefijo incluido) que acepta el modelo con margen. */
  maxInputChars: number;
  /** Similitud coseno mínima para considerar relevante un chunk; depende del modelo. */
  minScore: number;
}
