-- Étendre les doc_type autorisés pour generated_documents (outils additionnels).
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
    'web_scan',
    'comparateur',
    'quiz',
    'resume-arret',
    'recherche-jurisprudentielle',
    'analyse-decision'
  )
);

