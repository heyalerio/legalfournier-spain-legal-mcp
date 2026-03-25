export interface OfficialLegalSource extends Record<string, unknown> {
  authority: string;
  title: string;
  url: string;
  relevance: string;
}

export interface CurrentVerificationFlag extends Record<string, unknown> {
  area: string;
  reason: string;
  check_when: string;
  official_source_hint: string;
}

type OfficialSourceId =
  | "rd1155_non_lucrative"
  | "rd1155_employee"
  | "rd1155_self_employed"
  | "rd1155_long_term"
  | "rd1155_tie"
  | "rd240_residence"
  | "rd240_family_card"
  | "rd240_family_retention"
  | "rd240_permanent"
  | "rd240_document_validity"
  | "ley14_entrepreneur"
  | "ley14_hqp"
  | "ley14_telework"
  | "irpf_art93"
  | "irpf_reg_art113"
  | "irpf_reg_art115"
  | "codigo_civil_art22"
  | "forms_index"
  | "forms_ex15"
  | "forms_ex17"
  | "tasa_790_012";

type VerificationFlagId =
  | "consular_thresholds"
  | "salary_or_income_thresholds"
  | "telework_document_chain"
  | "spanish_market_split"
  | "entrepreneur_approval"
  | "specialist_role_review"
  | "eu_family_facts"
  | "eu_family_right_retention"
  | "eu_permanent_vs_long_term"
  | "continuity_and_absences"
  | "nationality_continuity"
  | "one_year_nationality_basis"
  | "director_related_entity"
  | "tax_entry_path"
  | "tax_deadlines"
  | "office_level_practice"
  | "current_fees";

const OFFICIAL_SOURCES: Record<OfficialSourceId, OfficialLegalSource> = {
  rd1155_non_lucrative: {
    authority: "BOE",
    title: "Real Decreto 1155/2024, arts. 61-63",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099",
    relevance:
      "Primary legal basis for non-lucrative temporary residence under the current foreigners regulation.",
  },
  rd1155_employee: {
    authority: "BOE",
    title: "Real Decreto 1155/2024, arts. 73-81",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099",
    relevance:
      "Primary legal basis for ordinary employee residence and work authorization under the 2024 regulation.",
  },
  rd1155_self_employed: {
    authority: "BOE",
    title: "Real Decreto 1155/2024, arts. 82-90",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099",
    relevance:
      "Primary legal basis for ordinary self-employed residence and work authorization.",
  },
  rd1155_long_term: {
    authority: "BOE",
    title: "Real Decreto 1155/2024, arts. 182-185",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099",
    relevance:
      "Primary legal basis for third-country long-term residence after five years of qualifying residence.",
  },
  rd1155_tie: {
    authority: "BOE",
    title: "Real Decreto 1155/2024, art. 209",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099",
    relevance:
      "Primary legal basis for the foreigner identity card, its request window, and its legal function.",
  },
  rd240_residence: {
    authority: "BOE",
    title: "Real Decreto 240/2007, art. 7",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-4184",
    relevance:
      "Primary legal basis for EU, EEA, and Swiss residence in Spain beyond three months and for related family-member analysis.",
  },
  rd240_family_card: {
    authority: "BOE",
    title: "Real Decreto 240/2007, art. 8",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-4184",
    relevance:
      "Primary legal basis for residence beyond three months with a family-member card under the EU regime.",
  },
  rd240_family_retention: {
    authority: "BOE",
    title: "Real Decreto 240/2007, art. 9",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-4184",
    relevance:
      "Primary legal basis for retention of residence in death, departure, divorce, or similar EU-family status changes.",
  },
  rd240_permanent: {
    authority: "BOE",
    title: "Real Decreto 240/2007, art. 10",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-4184",
    relevance:
      "Primary legal basis for EU permanent residence after five years of continuous legal residence.",
  },
  rd240_document_validity: {
    authority: "BOE",
    title: "Real Decreto 240/2007, arts. 11 y 14",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-4184",
    relevance:
      "Primary legal basis for permanent family-member cards, document validity, and key absence rules under the EU regime.",
  },
  ley14_entrepreneur: {
    authority: "BOE",
    title: "Ley 14/2013, arts. 69-70",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2013-10074",
    relevance:
      "Primary legal basis for entrepreneur residence and the innovation/business-interest framing used in startup-route analysis.",
  },
  ley14_hqp: {
    authority: "BOE",
    title: "Ley 14/2013, art. 71",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2013-10074",
    relevance:
      "Primary legal basis for highly qualified professional residence, including the branch commonly compared with EU Blue Card screening.",
  },
  ley14_telework: {
    authority: "BOE",
    title: "Ley 14/2013, arts. 74 bis y siguientes",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2013-10074",
    relevance:
      "Primary legal basis for international telework and digital nomad screening.",
  },
  irpf_art93: {
    authority: "BOE",
    title: "Ley 35/2006, art. 93",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    relevance:
      "Primary legal basis for Spain's special impatriate regime, including worker, director, entrepreneur, and highly qualified professional entry paths.",
  },
  irpf_reg_art113: {
    authority: "BOE",
    title: "Real Decreto 439/2007, art. 113",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820",
    relevance:
      "Regulatory implementation for the impatriate regime's scope and qualifying conditions.",
  },
  irpf_reg_art115: {
    authority: "BOE",
    title: "Real Decreto 439/2007, arts. 115-116",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820",
    relevance:
      "Regulatory basis for regime duration and the deadline for exercising the option.",
  },
  codigo_civil_art22: {
    authority: "BOE",
    title: "Código Civil, art. 22",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763",
    relevance:
      "Primary legal basis for nationality by residence, including the ten-year, five-year, two-year, and one-year timelines.",
  },
  forms_index: {
    authority: "Ministerio de Inclusión, Seguridad Social y Migraciones",
    title: "Modelos generales de solicitud",
    url: "https://www.inclusion.gob.es/web/migraciones/w/modelos-generales-de-solicitud",
    relevance:
      "Official forms index used for Spanish immigration application templates, including EX-15 and EX-17.",
  },
  forms_ex15: {
    authority: "Ministerio de Inclusión, Seguridad Social y Migraciones",
    title: "Formulario EX-15",
    url: "https://www.inclusion.gob.es/web/migraciones/w/modelos-generales-de-solicitud",
    relevance:
      "Official government form route for NIE-number and certificate requests.",
  },
  forms_ex17: {
    authority: "Ministerio de Inclusión, Seguridad Social y Migraciones",
    title: "Formulario EX-17",
    url: "https://www.inclusion.gob.es/web/migraciones/w/modelos-generales-de-solicitud",
    relevance:
      "Official government form route for TIE issuance, replacement, and renewal workflows.",
  },
  tasa_790_012: {
    authority: "Policía Nacional",
    title: "Modelo 790 Código 012",
    url: "https://sede.policia.gob.es/Tasa790_012/",
    relevance:
      "Official police portal for the immigration fee form commonly used in NIE and TIE procedures.",
  },
};

const VERIFICATION_FLAGS: Record<VerificationFlagId, CurrentVerificationFlag> = {
  consular_thresholds: {
    area: "income benchmarks and consular criteria",
    reason:
      "The legal route is stable, but the filing threshold and document expectations move with current benchmarks and office practice.",
    check_when: "Before relying on a non-lucrative or passive-means filing strategy.",
    official_source_hint:
      "Re-check the current foreigners regulation guidance and the relevant consular checklist at filing time.",
  },
  salary_or_income_thresholds: {
    area: "salary or income thresholds",
    reason:
      "Salary and means benchmarks are not timeless and should not be treated as fixed numbers in an evergreen tool.",
    check_when:
      "Before recommending Blue Card, highly qualified, or any route tied to economic benchmarks.",
    official_source_hint:
      "Confirm the live salary or means rule in the current official filing guidance.",
  },
  telework_document_chain: {
    area: "digital nomad document chain",
    reason:
      "International telework cases depend on a current documentary match between the foreign work relationship and the Spanish filing route.",
    check_when:
      "Before relying on the digital nomad branch for filing-ready advice.",
    official_source_hint:
      "Re-check Ley 14/2013 telework guidance and the current filing checklist.",
  },
  spanish_market_split: {
    area: "Spanish versus foreign market activity",
    reason:
      "Freelance and telework cases can move between routes if Spanish-market activity becomes too central.",
    check_when:
      "When the client serves both Spanish and non-Spanish clients or has mixed work footprints.",
    official_source_hint:
      "Confirm the live route-specific practice and document split at filing time.",
  },
  entrepreneur_approval: {
    area: "innovation and entrepreneur approval",
    reason:
      "Entrepreneur cases depend on a current innovation or business-interest approval process rather than on a timeless abstract definition alone.",
    check_when:
      "Before recommending the entrepreneur branch or treating self-employment as Beckham-compatible through startup logic.",
    official_source_hint:
      "Re-check the current entrepreneur approval process under Ley 14/2013.",
  },
  specialist_role_review: {
    area: "specialist or highly qualified role fit",
    reason:
      "Highly qualified and Blue Card branches depend on the current role profile, evidence set, and in some cases salary conditions.",
    check_when:
      "Before locking in a highly qualified or Blue Card strategy.",
    official_source_hint:
      "Review the current Ley 14/2013 guidance and live filing criteria.",
  },
  eu_family_facts: {
    area: "EU family-member facts",
    reason:
      "An EU family connection can change the whole immigration branch, but only if the specific family facts and residence basis line up.",
    check_when:
      "Whenever a non-EU case mentions an EU spouse, partner, or dependent-family basis.",
    official_source_hint:
      "Check the current EU-family route under Real Decreto 240/2007.",
  },
  eu_family_right_retention: {
    area: "EU family right retention after status change",
    reason:
      "Death, departure, divorce, separation, or registration cancellation can change the family-member analysis even when the card already exists.",
    check_when:
      "When the case involves a break in the family relationship or uncertainty about whether the family route still survives personally.",
    official_source_hint:
      "Review the retention rules in article 9 of Real Decreto 240/2007 before assuming the family route continues unchanged.",
  },
  eu_permanent_vs_long_term: {
    area: "EU permanent residence versus third-country long-term residence",
    reason:
      "A five-year milestone can point to different legal regimes, and the label matters for agents and users.",
    check_when:
      "Whenever the current status is EU registration or an EU-family regime.",
    official_source_hint:
      "Distinguish Real Decreto 240/2007 permanent residence from Real Decreto 1155/2024 long-term residence.",
  },
  continuity_and_absences: {
    area: "continuity and absences",
    reason:
      "Five-year and nationality clocks depend on continuous legal residence, so absences and status changes can break a simple year count.",
    check_when:
      "Before giving a filing-ready answer on long-term residence or nationality timing.",
    official_source_hint:
      "Review the current continuity rules in the applicable residence or nationality source.",
  },
  nationality_continuity: {
    area: "nationality continuity and immediately-prior legal residence",
    reason:
      "Nationality by residence depends on legal, continuous residence immediately before the application, so absences and status gaps need explicit review.",
    check_when:
      "Before giving a filing-ready nationality answer based only on elapsed years.",
    official_source_hint:
      "Re-check article 22 of the Código Civil and the continuity facts before confirming nationality timing.",
  },
  one_year_nationality_basis: {
    area: "one-year nationality exception",
    reason:
      "The one-year nationality track only works if the exact special legal basis is identified and documented.",
    check_when:
      "Whenever a case claims a one-year nationality path.",
    official_source_hint:
      "Confirm the specific article 22 basis in the Código Civil before giving a definitive timeline.",
  },
  director_related_entity: {
    area: "director ownership and related-entity tests",
    reason:
      "Director cases under article 93 are not decided by a simple 25% shortcut alone; entity type and related-party status matter.",
    check_when:
      "Whenever Beckham is being screened through a director or founder-managed company structure.",
    official_source_hint:
      "Re-check article 93 of Ley 35/2006 and the linked regulatory guidance before calling a director case eligible or ineligible.",
  },
  tax_entry_path: {
    area: "Beckham entry-path fit",
    reason:
      "The special tax regime depends on the actual relocation route and work structure, not on tax preference alone.",
    check_when:
      "Before promising access to Beckham or comparing it as if it were automatically available.",
    official_source_hint:
      "Confirm the current qualifying path under article 93 and its implementing regulation.",
  },
  tax_deadlines: {
    area: "Beckham timing and option deadline",
    reason:
      "The regime has a time-sensitive option process and should not be treated as open-ended.",
    check_when:
      "When the answer moves from conceptual comparison into filing steps.",
    official_source_hint:
      "Re-check the current filing deadline and communication process under Real Decreto 439/2007.",
  },
  office_level_practice: {
    area: "office-level appointment practice",
    reason:
      "NIE and TIE appointment labels and office sequencing can vary even when the legal workflow is stable.",
    check_when:
      "Before giving appointment-level instructions for a specific city or office.",
    official_source_hint:
      "Use the stable process first, then confirm the live office workflow and booking category.",
  },
  current_fees: {
    area: "current fees and payment form details",
    reason:
      "Fees and payment mechanics are inherently current-state details and should not be frozen into evergreen answers.",
    check_when:
      "Before telling a user what they need to pay or which receipt version to bring.",
    official_source_hint:
      "Re-check the active Modelo 790 Código 012 flow or other official fee page in use.",
  },
};

export function officialSources(...ids: OfficialSourceId[]): OfficialLegalSource[] {
  return ids.map((id) => OFFICIAL_SOURCES[id]);
}

export function verificationFlags(
  ...ids: VerificationFlagId[]
): CurrentVerificationFlag[] {
  return ids.map((id) => VERIFICATION_FLAGS[id]);
}
