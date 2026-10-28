export type ReportReason = {
  label: string;
  message: string;
};

export const PRODUCT_REPORT_REASONS: ReportReason[] = [
  { label: "Produit interdit ou illegal", message: "Ce produit semble interdit, illegal ou contraire aux regles de la plateforme." },
  { label: "Arnaque ou fausse annonce", message: "Cette annonce semble trompeuse ou pourrait constituer une tentative d’arnaque." },
  { label: "Produit contrefait", message: "Ce produit semble contrefait ou utilise une marque sans autorisation." },
  { label: "Informations fausses", message: "Le prix, la description ou les informations de cette annonce semblent faux." },
  { label: "Contenu offensant", message: "Cette annonce contient un contenu offensant, violent ou inapproprie." },
  { label: "Autre", message: "Je souhaite signaler cette annonce pour une autre raison." },
];

export const USER_REPORT_REASONS: ReportReason[] = [
  { label: "Arnaque ou comportement frauduleux", message: "Ce compte semble avoir un comportement frauduleux ou tente de m’arnaquer." },
  { label: "Harcèlement ou comportement abusif", message: "Ce compte me harcele, me menace ou adopte un comportement abusif." },
  { label: "Fausse identite", message: "Ce compte semble utiliser une fausse identite ou usurper l’identite d’une autre personne." },
  { label: "Contenu inapproprie", message: "Ce compte publie ou partage un contenu inapproprie." },
  { label: "Autre", message: "Je souhaite signaler ce compte pour une autre raison." },
];
