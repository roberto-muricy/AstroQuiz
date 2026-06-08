/**
 * Image Credits
 * Créditos e licenças das imagens usadas nas perguntas com imagem.
 * Mantido em sincronia com as perguntas q_img_* no backend.
 */

export type LicenseCode = 'pd' | 'ccby4' | 'ccbysa4' | 'ccbysa3' | 'cc0';

export interface ImageCredit {
  id: string;
  subject: { pt: string; en: string; es: string; fr: string };
  author: string;
  license: LicenseCode;
}

// Rótulos de licença (os nomes CC são universais; "domínio público" é traduzido na tela)
export const LICENSE_LABEL: Record<Exclude<LicenseCode, 'pd'>, string> = {
  ccby4: 'CC BY 4.0',
  ccbysa4: 'CC BY-SA 4.0',
  ccbysa3: 'CC BY-SA 3.0',
  cc0: 'CC0',
};

export const IMAGE_CREDITS: ImageCredit[] = [
  { id: 'q_img_001', subject: { pt: 'Terra (Blue Marble)', en: 'Earth (Blue Marble)', es: 'Tierra (Blue Marble)', fr: 'La Terre (Blue Marble)' }, author: 'NASA / Apollo 17', license: 'pd' },
  { id: 'q_img_002', subject: { pt: 'Cometa NEOWISE', en: 'Comet NEOWISE', es: 'Cometa NEOWISE', fr: 'Comète NEOWISE' }, author: 'Palonitor (Wikimedia Commons)', license: 'ccbysa4' },
  { id: 'q_img_003', subject: { pt: 'Sol (SDO)', en: 'Sun (SDO)', es: 'Sol (SDO)', fr: 'Soleil (SDO)' }, author: 'NASA/SDO', license: 'pd' },
  { id: 'q_img_004', subject: { pt: 'Eclipse solar total', en: 'Total solar eclipse', es: 'Eclipse solar total', fr: 'Éclipse solaire totale' }, author: 'NASA / Carla Thomas', license: 'pd' },
  { id: 'q_img_005', subject: { pt: 'Aurora (ISS)', en: 'Aurora (ISS)', es: 'Aurora (ISS)', fr: 'Aurore (ISS)' }, author: 'NASA (ISS Expedition 23)', license: 'pd' },
  { id: 'q_img_006', subject: { pt: 'Rover Perseverance', en: 'Perseverance rover', es: 'Rover Perseverance', fr: 'Rover Perseverance' }, author: 'NASA/JPL-Caltech', license: 'pd' },
  { id: 'q_img_007', subject: { pt: 'Pilares da Criação', en: 'Pillars of Creation', es: 'Pilares de la Creación', fr: 'Piliers de la Création' }, author: 'NASA, ESA, Hubble Heritage Team (STScI/AURA)', license: 'pd' },
  { id: 'q_img_008', subject: { pt: 'Buraco negro (M87)', en: 'Black hole (M87)', es: 'Agujero negro (M87)', fr: 'Trou noir (M87)' }, author: 'Event Horizon Telescope Collaboration', license: 'ccby4' },
  { id: 'q_img_009', subject: { pt: 'Galáxia elíptica (M49)', en: 'Elliptical galaxy (M49)', es: 'Galaxia elíptica (M49)', fr: 'Galaxie elliptique (M49)' }, author: 'NASA / STScI / WikiSky', license: 'pd' },
  { id: 'q_img_010', subject: { pt: 'Nebulosa do Caranguejo', en: 'Crab Nebula', es: 'Nebulosa del Cangrejo', fr: 'Nébuleuse du Crabe' }, author: 'NASA, ESA, J. Hester & A. Loll (ASU)', license: 'pd' },
  { id: 'q_img_011', subject: { pt: 'Eclipse lunar total', en: 'Total lunar eclipse', es: 'Eclipse lunar total', fr: 'Éclipse lunaire totale' }, author: 'Wikimedia Commons', license: 'ccbysa3' },
  { id: 'q_img_012', subject: { pt: 'Diagrama H-R', en: 'H-R diagram', es: 'Diagrama H-R', fr: 'Diagramme H-R' }, author: 'ESO', license: 'ccby4' },
  { id: 'q_img_013', subject: { pt: 'Curva de luz de trânsito', en: 'Transit light curve', es: 'Curva de luz de tránsito', fr: 'Courbe de lumière de transit' }, author: 'NASA', license: 'pd' },
  { id: 'q_img_014', subject: { pt: 'Nebulosa do Anel (M57)', en: 'Ring Nebula (M57)', es: 'Nebulosa del Anillo (M57)', fr: "Nébuleuse de l'Anneau (M57)" }, author: 'NASA, ESA, Hubble', license: 'pd' },
  { id: 'q_img_015', subject: { pt: 'Campo Profundo do Webb', en: "Webb's First Deep Field", es: 'Campo Profundo del Webb', fr: 'Champ profond de Webb' }, author: 'NASA, ESA, CSA, STScI', license: 'pd' },
  { id: 'q_img_016', subject: { pt: 'Teia cósmica', en: 'Cosmic web', es: 'Red cósmica', fr: 'Toile cosmique' }, author: 'Volker Springel / Max Planck Institute for Astrophysics', license: 'ccbysa4' },
  { id: 'q_img_017', subject: { pt: 'Sinal LIGO (GW150914)', en: 'LIGO signal (GW150914)', es: 'Señal LIGO (GW150914)', fr: 'Signal LIGO (GW150914)' }, author: 'Caltech/MIT/LIGO Lab', license: 'cc0' },
];
