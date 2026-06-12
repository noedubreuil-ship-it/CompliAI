#!/usr/bin/env python3
"""
Extrait les prompts métier complets (# PROMPT — OUTIL ...) depuis le transcript
agent et les écrit dans lib/ai/prompts/data/*.md

Usage: python3 scripts/extract-tool-prompts-from-transcript.py [path-to.jsonl]
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TRANSCRIPT = (
    Path.home()
    / ".cursor/projects/Users-noedubreuil-projects-compliai/agent-transcripts"
    / "ec0d2832-08d1-48c8-9100-f94ab0789633/ec0d2832-08d1-48c8-9100-f94ab0789633.jsonl"
)
DATA = ROOT / "lib/ai/prompts/data"

# Titre OUTIL "…" → fichier (dernière occurrence utilisateur gagne)
TITLE_TO_FILE: list[tuple[str, str]] = [
    ("RÉSUMÉ D'ARRÊTS ET COMMENTAIRES GUIDÉS", "resume-arrets-etudiants-v2.md"),
    ("QUIZ DE DROIT EUROPÉEN INTERACTIF — ÉTUDIANTS", "quiz-eu-etudiants-v1.md"),
    ("QUIZ DE DROIT EUROPÉEN INTERACTIF", "quiz-eu-etudiants-v1.md"),
    ("RECHERCHE JURISPRUDENTIELLE EUROPÉENNE", "recherche-jurisprudentielle-eu-v1.md"),
    ("SCANNER PAGE WEB (BÊTA)", "scanner-page-web-v1.md"),
    ("SCANNER PAGE WEB", "scanner-page-web-v1.md"),
    ("REGISTRE DES ACTIVITÉS DE TRAITEMENT", "ropa-registre-art30-v1.md"),
    ("CLASSIFIEUR AI ACT", "ai-act-classifier-v1.md"),
    ("DOCUMENTATION TECHNIQUE ART. 11", "art11-annex-iv-v1.md"),
    ("POLITIQUE D'USAGE IA EMPLOYÉS", "employee-policy-ia-v1.md"),
    ("ANALYSE DE CONTRAT TIERS", "third-party-contract-analysis-v1.md"),
    ("FRIA — ÉVALUATION D'IMPACT", "fria-art27-ai-act-v1.md"),
    ("CHECKLIST DE CONFORMITÉ INTERACTIVE", "compliance-checklist-interactive-v1.md"),
    ("SIMULATEUR DE CAS PRATIQUE", "simulateur-cas-pratique-v1.md"),
    ("COMPARATEUR DE LÉGISLATIONS", "comparateur-legislations-eu27-v1.md"),
    ("GÉNÉRATEUR DE CLAUSES CONTRACTUELLES IA", "generateur-clauses-ia-v1.md"),
    ("ANALYSEUR DE DÉCISIONS D'AUTORITÉS", "analyseur-decisions-autorites-v1.md"),
    ("ANALYSEUR DE DÉCISIONS", "analyseur-decisions-autorites-v1.md"),
]

PROMPT_START = re.compile(
    r"#\s*(?:PROMPT\s*—\s*OUTIL|ADDENDUM\s+DÉFINITIF)", re.I
)
PROMPT_END_MARKERS = [
    re.compile(r"^```typescript\s*$", re.M),
    re.compile(r"^\*Prompt Outil.*—\s*v\d", re.M),
]


def extract_prompt_block(text: str) -> str | None:
    m = PROMPT_START.search(text)
    if not m:
        return None
    body = text[m.start() :]
    # Tronquer avant bloc API typescript si présent
    for pat in PROMPT_END_MARKERS:
        em = pat.search(body)
        if em and em.start() > 500:
            body = body[: em.start()].rstrip()
            break
    # Nettoyer fermeture user query
    body = re.sub(r"</user_query>\s*$", "", body).strip()
    if len(body) < 800:
        return None
    return body + "\n"


def match_file(text: str) -> str | None:
    m = re.search(r'OUTIL\s+[«"]\s*([^»"]+)\s*[»"]', text, re.I)
    if m:
        title = m.group(1).strip().upper()
        for needle, fname in TITLE_TO_FILE:
            if needle.upper() in title or title in needle.upper():
                return fname
    if re.search(r"ADDENDUM\s+DÉFINITIF", text, re.I):
        return "jurisprudence-eu-commentaire-addendum-v2.md"
    return None


def main() -> int:
    transcript = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_TRANSCRIPT
    if not transcript.exists():
        print(f"Transcript introuvable: {transcript}", file=sys.stderr)
        return 1

    found: dict[str, str] = {}
    with transcript.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("role") != "user":
                continue
            msg = obj.get("message", {})
            parts = msg.get("content", [])
            if not isinstance(parts, list):
                continue
            for part in parts:
                if part.get("type") != "text":
                    continue
                text = part.get("text", "")
                low = text.lower()
                if (
                    "voici le prompt" not in low
                    and "# prompt — outil" not in low
                    and "# addendum définitif" not in low
                ):
                    continue
                block = extract_prompt_block(text)
                if not block:
                    continue
                fname = match_file(block)
                if fname:
                    found[fname] = block

    DATA.mkdir(parents=True, exist_ok=True)
    for fname, block in sorted(found.items()):
        path = DATA / fname
        path.write_text(block, encoding="utf-8")
        print(f"✓ {fname} ({len(block):,} chars)")

    if found:
        print(f"\n{len(found)} fichier(s) mis à jour dans {DATA}")
    else:
        print("\nAucun prompt extrait — vérifier le transcript.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
