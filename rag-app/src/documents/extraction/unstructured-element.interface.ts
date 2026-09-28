export type ElementType =
  | 'Title'
  | 'NarrativeText'
  | 'ListItem'
  | 'Table'
  | 'Image'
  | 'Header'
  | 'Footer'
  | 'PageNumber'
  | (string & {});

export interface ElementCoordinates {
  points: [number, number][];
  system: string;
  layout_width: number;
  layout_height: number;
}

/** Elemento tal como lo devuelve Unstructured (solo los campos que se usan). */
export interface UnstructuredElement {
  type: ElementType;
  element_id: string;
  text: string;
  metadata: {
    page_number?: number;
    coordinates?: ElementCoordinates;
    text_as_html?: string;
    image_base64?: string;
    image_mime_type?: string;
  };
}
