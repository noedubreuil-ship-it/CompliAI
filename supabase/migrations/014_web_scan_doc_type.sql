-- Autoriser le type de document scanner page web (bêta) dans generated_documents.
ALTER TABLE generated_documents DROP CONSTRAINT IF EXISTS generated_documents_doc_type_check;
ALTER TABLE generated_documents ADD CONSTRAINT generated_documents_doc_type_check CHECK (
  doc_type IN (
    'dpia',
    'ropa',
    'fria',
    'checklist',
    'employee_policy',
    'policy',
    'contract',
    'art11_technical',
    'ai_act_classification',
    'jurisprudence_analysis',
    'investor_report',
    'web_scan'
  )
);
