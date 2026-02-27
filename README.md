# Camera Suite — Maintenance & Pro Forma / Facture

Mini suite front-end (100% HTML/CSS/JS) composée de deux applications :
- **Maintenance caméras** : suivi, état, actions, statistiques, rapport identifié `RM-YYYY-XXX`
- **Pro Forma / Facture** : génération PF/F avec historique, autosave, logo, export **PDF** + **Excel**

## Démo (GitHub Pages)
Après déploiement : `https://emeride7.github.io/camera-suite/`

---

## Fonctionnalités clés

### Maintenance
- CRUD caméras (ajout / édition / suppression)
- Listes configurables (emplacements / problèmes / actions)
- Statistiques (total / bon / pas bon)
- Sauvegarde automatique (localStorage)
- **Rapport** avec identifiant `RM-YYYY-XXX`
- **Transfert vers Pro Forma** : génère des lignes (caméras “Pas Bon”) et ouvre l’app facturation

### Pro Forma / Facture
- Bascule de mode **PRO FORMA** / **FACTURE**
- Numérotation automatique :
  - Pro Forma : `PF-YYYY-XXX`
  - Facture : `F-YYYY-XXX`
- Autosave (brouillon) + Historique (50 documents)
- Autocomplétion (clients + prestations) via datalist
- Export **PDF** (jsPDF + autoTable) et **Excel** (SheetJS)

---

## Architecture

### Structure
