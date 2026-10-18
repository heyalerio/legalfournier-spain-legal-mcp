// ISO 3166 identifiers, sourced from pycountry's ISO database on 2026-10-18.
// https://github.com/pycountry/pycountry/blob/main/src/pycountry/databases/iso3166-1.json
// Translated display names come from Node's bundled Unicode CLDR data.
const CODE_PAIRS = "AW:ABW AF:AFG AO:AGO AI:AIA AX:ALA AL:ALB AD:AND AE:ARE AR:ARG AM:ARM AS:ASM AQ:ATA TF:ATF AG:ATG AU:AUS AT:AUT AZ:AZE BI:BDI BE:BEL BJ:BEN BQ:BES BF:BFA BD:BGD BG:BGR BH:BHR BS:BHS BA:BIH BL:BLM BY:BLR BZ:BLZ BM:BMU BO:BOL BR:BRA BB:BRB BN:BRN BT:BTN BV:BVT BW:BWA CF:CAF CA:CAN CC:CCK CH:CHE CL:CHL CN:CHN CI:CIV CM:CMR CD:COD CG:COG CK:COK CO:COL KM:COM CV:CPV CR:CRI CU:CUB CW:CUW CX:CXR KY:CYM CY:CYP CZ:CZE DE:DEU DJ:DJI DM:DMA DK:DNK DO:DOM DZ:DZA EC:ECU EG:EGY ER:ERI EH:ESH ES:ESP EE:EST ET:ETH FI:FIN FJ:FJI FK:FLK FR:FRA FO:FRO FM:FSM GA:GAB GB:GBR GE:GEO GG:GGY GH:GHA GI:GIB GN:GIN GP:GLP GM:GMB GW:GNB GQ:GNQ GR:GRC GD:GRD GL:GRL GT:GTM GF:GUF GU:GUM GY:GUY HK:HKG HM:HMD HN:HND HR:HRV HT:HTI HU:HUN ID:IDN IM:IMN IN:IND IO:IOT IE:IRL IR:IRN IQ:IRQ IS:ISL IL:ISR IT:ITA JM:JAM JE:JEY JO:JOR JP:JPN KZ:KAZ KE:KEN KG:KGZ KH:KHM KI:KIR KN:KNA KR:KOR KW:KWT LA:LAO LB:LBN LR:LBR LY:LBY LC:LCA LI:LIE LK:LKA LS:LSO LT:LTU LU:LUX LV:LVA MO:MAC MF:MAF MA:MAR MC:MCO MD:MDA MG:MDG MV:MDV MX:MEX MH:MHL MK:MKD ML:MLI MT:MLT MM:MMR ME:MNE MN:MNG MP:MNP MZ:MOZ MR:MRT MS:MSR MQ:MTQ MU:MUS MW:MWI MY:MYS YT:MYT NA:NAM NC:NCL NE:NER NF:NFK NG:NGA NI:NIC NU:NIU NL:NLD NO:NOR NP:NPL NR:NRU NZ:NZL OM:OMN PK:PAK PA:PAN PN:PCN PE:PER PH:PHL PW:PLW PG:PNG PL:POL PR:PRI KP:PRK PT:PRT PY:PRY PS:PSE PF:PYF QA:QAT RE:REU RO:ROU RU:RUS RW:RWA SA:SAU SD:SDN SN:SEN SG:SGP GS:SGS SH:SHN SJ:SJM SB:SLB SL:SLE SV:SLV SM:SMR SO:SOM PM:SPM RS:SRB SS:SSD ST:STP SR:SUR SK:SVK SI:SVN SE:SWE SZ:SWZ SX:SXM SC:SYC SY:SYR TC:TCA TD:TCD TG:TGO TH:THA TJ:TJK TK:TKL TM:TKM TL:TLS TO:TON TT:TTO TN:TUN TR:TUR TV:TUV TW:TWN TZ:TZA UG:UGA UA:UKR UM:UMI UY:URY US:USA UZ:UZB VA:VAT VC:VCT VE:VEN VG:VGB VI:VIR VN:VNM VU:VUT WF:WLF WS:WSM YE:YEM ZA:ZAF ZM:ZMB ZW:ZWE";
const EU_EEA_SWISS = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH".split(" "));
// A territory label is not evidence of its holder's citizenship.
const TERRITORIES = new Set("AW AI AX AS AQ TF BM BQ BV CC CK CW CX FK FO GF GG GI GL GP GS GU HK HM IM IO JE KY MF MO MP MQ MS NC NF NU PF PM PN PR RE SH SJ SX TC TK UM VG VI WF YT".split(" "));
const aliases = new Map<string, string>();
function key(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
for (const pair of CODE_PAIRS.split(" ")) {
  const [alpha2, alpha3] = pair.split(":");
  aliases.set(key(alpha2), alpha2);
  aliases.set(key(alpha3), alpha2);
  for (const language of ["en", "es", "fr", "de", "pt", "it", "ca"]) {
    aliases.set(key(new Intl.DisplayNames([language], {type: "region"}).of(alpha2) ?? alpha2), alpha2);
  }
}
for (const [alias, code] of Object.entries({usa:"US", uk:"GB", britain:"GB", greatbritain:"GB", unitedstatesofamerica:"US", czechrepublic:"CZ", republicofireland:"IE", southkorea:"KR", northkorea:"KP", russia:"RU", turkey:"TR"})) aliases.set(alias, code);
// These short names can describe more than one country.
for (const ambiguous of ["congo", "korea", "america"]) aliases.delete(ambiguous);
export type NationalityClassification = "spanish" | "eu_eea_swiss" | "non_eu" | "unknown";
export function resolveNationality(value: string | undefined): {code?: string; classification: NationalityClassification} {
  if (typeof value !== "string" || !value.trim()) return {classification:"unknown"};
  const code = aliases.get(key(value));
  if (!code || TERRITORIES.has(code)) return {classification:"unknown"};
  return {code, classification: code === "ES" ? "spanish" : EU_EEA_SWISS.has(code) ? "eu_eea_swiss" : "non_eu"};
}
