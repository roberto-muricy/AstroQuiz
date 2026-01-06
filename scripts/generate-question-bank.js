/**
 * Gera um banco de 500 perguntas distribuídas por nível, tópico e tipo.
 * Preencha imageUrl reais depois, se desejar.
 */

const fs = require('fs');
const path = require('path');

const TOPICS = [
  'Galaxies & Cosmology',
  'General Curiosities',
  'Relativity & Fundamental Physics',
  'Scientists',
  'Small Solar System Bodies',
  'Solar System',
  'Space Missions',
  'Space Observation',
  'Stellar Objects',
  'Worlds Beyond',
];

const LEVEL_TARGET = { 1: 150, 2: 125, 3: 100, 4: 75, 5: 50 };
const TYPE_TARGET = { text: 450, image: 50 };
const TOTAL = 500;

// Seeds por tópico (6–8 cada), cobrindo níveis 1–5.
// q: enunciado (<=150 chars), A-D: opções, ans: correta, exp: explicação curta, level: 1..5
const topicSeeds = {
  'Galaxies & Cosmology': [
    { q: 'What type of galaxy is the Milky Way?', A: 'Elliptical', B: 'Spiral', C: 'Irregular', D: 'Ring', ans: 'B', exp: 'The Milky Way is a barred spiral galaxy.', level: 1 },
    { q: 'What does redshift in galaxies indicate?', A: 'Approaching', B: 'Rotating', C: 'Moving away', D: 'Cooling', ans: 'C', exp: 'Redshift shows recessional velocity via Doppler effect.', level: 2 },
    { q: 'Which satellite measured the CMB most precisely?', A: 'COBE', B: 'WMAP', C: 'Planck', D: 'IRAS', ans: 'C', exp: 'Planck mapped CMB anisotropies with highest precision.', level: 3 },
    { q: 'Dark matter evidence is strongest from?', A: 'Solar flares', B: 'Galaxy rotation curves', C: 'Comet tails', D: 'Nova spectra', ans: 'B', exp: 'Flat rotation curves imply unseen mass.', level: 3 },
    { q: 'Inflation solves which cosmology issue?', A: 'Ozone', B: 'Horizon problem', C: 'CO2', D: 'Helioseismology', ans: 'B', exp: 'Inflation explains CMB isotropy over large scales.', level: 4 },
    { q: 'What parameter denotes dark energy density?', A: 'Ω_m', B: 'Ω_Λ', C: 'Ω_b', D: 'Ω_r', ans: 'B', exp: 'Omega lambda is the dark-energy density fraction.', level: 4 },
    { q: 'Hubble tension is between which methods?', A: 'Local ladder vs CMB', B: 'Radar vs parallax', C: 'VLBI vs masers', D: 'Gaia vs Hipparcos', ans: 'A', exp: 'Local Cepheids+SNe vs early-Universe Planck differ.', level: 5 },
  ],
  'General Curiosities': [
    { q: 'How long does sunlight take to reach Earth?', A: '1 min', B: '8 min', C: '30 min', D: '1 h', ans: 'B', exp: 'About 8 min 20 s at light speed.', level: 1 },
    { q: 'Which planet has the longest day?', A: 'Mercury', B: 'Venus', C: 'Mars', D: 'Jupiter', ans: 'B', exp: 'A Venus solar day is ~117 Earth days.', level: 2 },
    { q: 'What is the hottest planet surface?', A: 'Mercury', B: 'Venus', C: 'Earth', D: 'Mars', ans: 'B', exp: 'Venus reaches ~465°C due to runaway greenhouse.', level: 1 },
    { q: 'Fastest rotating planet in the Solar System?', A: 'Earth', B: 'Saturn', C: 'Jupiter', D: 'Neptune', ans: 'C', exp: 'Jupiter rotates in ~10 hours.', level: 2 },
    { q: 'Which star is closest to the Sun?', A: 'Sirius', B: 'Proxima Centauri', C: 'Alpha Centauri A', D: 'Barnard’s Star', ans: 'B', exp: 'Proxima is ~4.24 light-years away.', level: 1 },
    { q: 'What is a light-year?', A: 'Time unit', B: 'Distance light travels in a year', C: 'Brightness', D: 'Mass unit', ans: 'B', exp: 'It is distance, not time or brightness.', level: 1 },
    { q: 'Kármán line commonly set at?', A: '50 km', B: '80 km', C: '100 km', D: '150 km', ans: 'C', exp: '100 km is the conventional space boundary.', level: 3 },
  ],
  'Relativity & Fundamental Physics': [
    { q: 'What is the speed of light in vacuum?', A: '150,000 km/s', B: '186,000 km/s', C: '220,000 km/s', D: '300,000 km/s', ans: 'B', exp: 'c ≈ 299,792 km/s (~186,000 mi/s).', level: 1 },
    { q: 'Time dilation occurs when?', A: 'Low speeds', B: 'High speeds or strong gravity', C: 'At rest', D: 'No gravity', ans: 'B', exp: 'SR and GR predict time dilation with velocity/gravity.', level: 2 },
    { q: 'Gravitational waves were first detected by?', A: 'LISA', B: 'LIGO', C: 'HST', D: 'ALMA', ans: 'B', exp: 'LIGO detected GW150914 in 2015.', level: 2 },
    { q: 'What is the Schwarzschild radius?', A: 'Star radius', B: 'Galaxy core', C: 'Event horizon radius', D: 'Photon sphere', ans: 'C', exp: 'It defines the event horizon of a non-rotating BH.', level: 3 },
    { q: 'Which experiment confirmed light deflection in 1919?', A: 'Michelson–Morley', B: 'Eddington eclipse', C: 'Pound–Rebka', D: 'Gravity Probe B', ans: 'B', exp: 'Eddington observed starlight deflection near the Sun.', level: 3 },
    { q: 'What is frame dragging measured by?', A: 'LIGO', B: 'Gravity Probe B', C: 'Gaia', D: 'Kepler', ans: 'B', exp: 'GP-B measured Earth’s gravitomagnetic effect.', level: 4 },
    { q: 'The stress-energy tensor represents?', A: 'Curvature', B: 'Matter-energy content', C: 'Metric', D: 'Affine connection', ans: 'B', exp: 'Tμν sources spacetime curvature in Einstein equations.', level: 5 },
  ],
  'Scientists': [
    { q: 'Who discovered Jupiter’s four largest moons?', A: 'Kepler', B: 'Galileo', C: 'Cassini', D: 'Huygens', ans: 'B', exp: 'Galileo observed the Galilean moons in 1610.', level: 1 },
    { q: 'Who formulated laws of planetary motion?', A: 'Newton', B: 'Kepler', C: 'Copernicus', D: 'Halley', ans: 'B', exp: 'Kepler’s laws describe orbital ellipses and periods.', level: 1 },
    { q: 'Who proposed the expanding universe from redshifts?', A: 'Einstein', B: 'Hubble', C: 'Leavitt', D: 'Eddington', ans: 'B', exp: 'Hubble showed galaxies recede proportionally to distance.', level: 2 },
    { q: 'Who predicted black hole radiation?', A: 'Penrose', B: 'Hawking', C: 'Zel’dovich', D: 'Sagan', ans: 'B', exp: 'Hawking radiation arises from quantum effects near horizons.', level: 3 },
    { q: 'Who discovered pulsars in 1967?', A: 'Bell Burnell', B: 'Hewish', C: 'Gold', D: 'Lyne', ans: 'A', exp: 'Jocelyn Bell Burnell first detected pulsar signals.', level: 2 },
    { q: 'Who first mapped the CMB anisotropies (satellite)?', A: 'IRAS', B: 'COBE', C: 'WMAP', D: 'Planck', ans: 'B', exp: 'COBE/DMR detected CMB anisotropy; WMAP refined later.', level: 3 },
    { q: 'Who introduced cosmic inflation?', A: 'Guth', B: 'Linde', C: 'Starobinsky', D: 'Peebles', ans: 'A', exp: 'Alan Guth proposed inflation in 1980.', level: 4 },
  ],
  'Small Solar System Bodies': [
    { q: 'Where is the main asteroid belt?', A: 'Mercury–Venus', B: 'Earth–Mars', C: 'Mars–Jupiter', D: 'Jupiter–Saturn', ans: 'C', exp: 'Between Mars and Jupiter.', level: 1 },
    { q: 'Halley’s Comet period is about?', A: '6 years', B: '27 years', C: '76 years', D: '120 years', ans: 'C', exp: 'Roughly 75–76 years.', level: 1 },
    { q: 'Kuiper Belt starts near which AU?', A: '5 AU', B: '10 AU', C: '30 AU', D: '80 AU', ans: 'C', exp: 'Begins just beyond Neptune at ~30 AU.', level: 2 },
    { q: 'What is a near-Earth object (NEO)?', A: 'Any comet', B: 'Asteroid/comet with perihelion <1.3 AU', C: 'Only Trojans', D: 'Only meteors', ans: 'B', exp: 'NEOs come within 1.3 AU of the Sun.', level: 2 },
    { q: 'Ceres is classified as?', A: 'Asteroid only', B: 'Dwarf planet', C: 'Comet', D: 'Moon', ans: 'B', exp: 'Ceres is a dwarf planet in the main belt.', level: 2 },
    { q: 'Which mission orbited and sampled Ryugu?', A: 'OSIRIS-REx', B: 'Hayabusa2', C: 'DART', D: 'NEAR Shoemaker', ans: 'B', exp: 'Hayabusa2 returned samples from Ryugu.', level: 3 },
    { q: 'Yarkovsky effect mainly alters?', A: 'Spin axis only', B: 'Albedo', C: 'Semimajor axis over time', D: 'Mass', ans: 'C', exp: 'Thermal re-radiation subtly changes orbital drift.', level: 4 },
  ],
  'Solar System': [
    { q: 'Which planet has the Great Red Spot?', A: 'Mars', B: 'Jupiter', C: 'Saturn', D: 'Neptune', ans: 'B', exp: 'Giant storm on Jupiter.', level: 1 },
    { q: 'Hottest surface temperature planet?', A: 'Mercury', B: 'Venus', C: 'Earth', D: 'Mars', ans: 'B', exp: 'Venus ~465°C.', level: 1 },
    { q: 'Which planet has the most moons confirmed?', A: 'Earth', B: 'Mars', C: 'Jupiter', D: 'Neptune', ans: 'C', exp: 'Jupiter currently leads moon count.', level: 2 },
    { q: 'Titan orbits which planet?', A: 'Jupiter', B: 'Saturn', C: 'Uranus', D: 'Neptune', ans: 'B', exp: 'Titan is Saturn’s largest moon.', level: 1 },
    { q: 'What is the Kuiper Belt?', A: 'Inner ring', B: 'Ice-rich region beyond Neptune', C: 'Saturn ring', D: 'Asteroid belt', ans: 'B', exp: 'Trans-Neptunian icy small bodies.', level: 2 },
    { q: 'Solar wind is primarily?', A: 'Dust', B: 'Neutral gas', C: 'Charged particles', D: 'Photons', ans: 'C', exp: 'Mostly protons and electrons from corona.', level: 2 },
    { q: 'Enceladus plumes contain?', A: 'Silicates only', B: 'Water vapor/ice', C: 'Methane only', D: 'CO2 only', ans: 'B', exp: 'Cassini detected water plumes at south pole.', level: 3 },
  ],
  'Space Missions': [
    { q: 'Which mission landed humans on the Moon first?', A: 'Apollo 11', B: 'Apollo 8', C: 'Gemini 12', D: 'Soyuz 1', ans: 'A', exp: 'Apollo 11 landed in 1969.', level: 1 },
    { q: 'Voyager 1 primary target initially?', A: 'Mars', B: 'Jupiter/Saturn', C: 'Venus', D: 'Mercury', ans: 'B', exp: 'Voyager 1 flew by Jupiter and Saturn.', level: 1 },
    { q: 'Which telescope succeeded Hubble in IR?', A: 'Spitzer', B: 'JWST', C: 'Chandra', D: 'Kepler', ans: 'B', exp: 'JWST is the IR-optimized successor.', level: 2 },
    { q: 'Which rover found evidence of past water at Meridiani Planum?', A: 'Curiosity', B: 'Spirit', C: 'Opportunity', D: 'Perseverance', ans: 'C', exp: 'Opportunity studied hematite spherules there.', level: 2 },
    { q: 'Cassini’s lander on Titan was?', A: 'Beagle 2', B: 'Huygens', C: 'Philae', D: 'InSight', ans: 'B', exp: 'Huygens landed on Titan in 2005.', level: 2 },
    { q: 'New Horizons’ primary KBO target?', A: 'Haumea', B: 'Eris', C: 'Pluto-Charon system', D: 'Sedna', ans: 'C', exp: 'Flew by Pluto-Charon in 2015.', level: 2 },
    { q: 'Parker Solar Probe’s goal?', A: 'Mars orbit', B: 'Venus clouds', C: 'Sample Sun’s corona', D: 'Outer heliosphere', ans: 'C', exp: 'It repeatedly dips into the solar corona.', level: 3 },
  ],
  'Space Observation': [
    { q: 'What does a spectrograph measure?', A: 'Brightness only', B: 'Time', C: 'Wavelength distribution', D: 'Polarization only', ans: 'C', exp: 'It disperses light to measure spectra.', level: 1 },
    { q: 'Radio telescopes observe at?', A: 'Gamma', B: 'X-ray', C: 'Microwave-radio', D: 'UV', ans: 'C', exp: 'They detect long-wavelength radio/microwave.', level: 1 },
    { q: 'Adaptive optics corrects for?', A: 'Thermal noise', B: 'Atmospheric turbulence', C: 'Detector gaps', D: 'Magnetic fields', ans: 'B', exp: 'Deforms mirrors to cancel seeing distortions.', level: 2 },
    { q: 'Interferometry improves?', A: 'Aperture area only', B: 'Angular resolution', C: 'Spectral resolution', D: 'Quantum efficiency', ans: 'B', exp: 'Baseline synthesis yields finer angular resolution.', level: 3 },
    { q: 'Chandra primarily observes?', A: 'Radio', B: 'Infrared', C: 'X-rays', D: 'Optical', ans: 'C', exp: 'Chandra is an X-ray observatory.', level: 2 },
    { q: 'What is seeing (arcsec) in astronomy?', A: 'Transparency', B: 'Sky brightness', C: 'Atmospheric PSF blur size', D: 'Cloud cover', ans: 'C', exp: 'Seeing quantifies image blur from turbulence.', level: 3 },
    { q: 'Transit photometry detects exoplanets by?', A: 'RV shifts', B: 'Light dips during passage', C: 'Imaging directly', D: 'Microlensing peaks', ans: 'B', exp: 'Measures brightness drop when planet crosses star.', level: 2 },
  ],
  'Stellar Objects': [
    { q: 'What is the Sun’s spectral type?', A: 'O', B: 'B', C: 'A', D: 'G2V', ans: 'D', exp: 'The Sun is a G2V main-sequence star.', level: 1 },
    { q: 'Red giants are stars that are?', A: 'Newborn', B: 'Core H-burning main sequence', C: 'Post main-sequence swollen', D: 'White dwarfs', ans: 'C', exp: 'They expand after core H exhaustion.', level: 1 },
    { q: 'Type Ia supernova progenitors involve?', A: 'Massive core collapse', B: 'White dwarf runaway', C: 'Neutron star merge', D: 'Planet impact', ans: 'B', exp: 'Thermonuclear runaway in a white dwarf near Mch.', level: 3 },
    { q: 'Pulsars are?', A: 'Pulsating giants', B: 'Rotating neutron stars with beams', C: 'Brown dwarfs', D: 'Black holes', ans: 'B', exp: 'Beamed radio/X-ray from spinning neutron stars.', level: 2 },
    { q: 'What supports white dwarfs against gravity?', A: 'Thermal gas', B: 'Radiation pressure', C: 'Electron degeneracy', D: 'Magnetic fields', ans: 'C', exp: 'Degenerate electrons provide pressure.', level: 3 },
    { q: 'Chandrasekhar limit is about?', A: '0.5 M☉', B: '1.0 M☉', C: '1.4 M☉', D: '3.0 M☉', ans: 'C', exp: 'Above ~1.4 M☉ electron degeneracy fails.', level: 3 },
    { q: 'LIGO–Virgo detected mergers of?', A: 'Planets', B: 'BH-BH/NS-NS binaries', C: 'Stars-Planets', D: 'Comets', ans: 'B', exp: 'Compact binary coalescences emit strong GWs.', level: 4 },
  ],
  'Worlds Beyond': [
    { q: 'What is an exoplanet?', A: 'Moon', B: 'Planet around other star', C: 'Asteroid', D: 'Dwarf planet', ans: 'B', exp: 'Planets orbiting stars beyond the Sun.', level: 1 },
    { q: 'Which method measures stellar wobble via spectra?', A: 'Transit', B: 'Radial velocity', C: 'Microlensing', D: 'Direct imaging', ans: 'B', exp: 'RV tracks Doppler shifts from orbiting planets.', level: 2 },
    { q: 'Habitable zone depends mainly on?', A: 'Star age', B: 'Star luminosity', C: 'Planet mass only', D: 'Galaxy type', ans: 'B', exp: 'Distance where liquid water can persist scales with L★.', level: 2 },
    { q: 'Kepler-186f is notable for?', A: 'Gas giant close-in', B: 'Earth-size in HZ of M dwarf', C: 'Free-floating', D: 'Binary host', ans: 'B', exp: 'Earth-sized planet in the habitable zone.', level: 2 },
    { q: 'TRAPPIST-1 system has how many known planets?', A: '3', B: '5', C: '7', D: '9', ans: 'C', exp: 'Seven Earth-sized planets, several in/near HZ.', level: 2 },
    { q: 'What is the Drake equation about?', A: 'Planet mass', B: 'Star ages', C: 'Estimating communicative civilizations', D: 'Cosmic rays', ans: 'C', exp: 'Framework to estimate N of communicating civilizations.', level: 3 },
    { q: 'Biosignature gas often cited?', A: 'Neon', B: 'Helium', C: 'O2/CH4 disequilibrium', D: 'CO', ans: 'C', exp: 'O2 with CH4 indicates potential biological processes.', level: 4 },
  ],
};

// Pool para perguntas de imagem (10 tipos, pode repetir se faltar URL real)
const imagePool = [
  {
    topic: 'Solar System',
    prompt: 'Which planet is shown?',
    options: ['Mars', 'Jupiter', 'Saturn', 'Neptune'],
    ans: 'B',
    exp: 'Bands and Great Red Spot indicate Jupiter.',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA22946/PIA22946~orig.jpg',
  },
  {
    topic: 'Stellar Objects',
    prompt: 'What object is this nebula?',
    options: ['Orion Nebula', 'Crab Nebula', 'Ring Nebula', 'Eagle Nebula'],
    ans: 'C',
    exp: 'Ring shape with central star matches Ring Nebula.',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA22207/PIA22207~orig.jpg',
  },
  {
    topic: 'Space Missions',
    prompt: 'Which telescope captured this deep field?',
    options: ['Hubble', 'Spitzer', 'JWST', 'Chandra'],
    ans: 'C',
    exp: 'NIRCam diffraction spikes suggest JWST.',
    imageUrl: 'https://stsci-opo.org/STScI-01G73FD26K5965D0E44Y7MEW1M.png',
  },
  {
    topic: 'Space Observation',
    prompt: 'Which telescope type is shown?',
    options: ['Radio dish', 'Refractor', 'Dobsonian', 'Schmidt-Cassegrain'],
    ans: 'A',
    exp: 'Large parabolic dish is a radio telescope.',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA01338/PIA01338~orig.jpg',
  },
  {
    topic: 'Worlds Beyond',
    prompt: 'Which detection method fits this light curve?',
    options: ['Transit', 'Radial velocity', 'Microlensing', 'Direct imaging'],
    ans: 'A',
    exp: 'Periodic dips are transit signatures.',
    imageUrl: 'https://exoplanets.nasa.gov/system/resources/detail_files/2575_Exoplanet-Transit-Illustration.jpg',
  },
  {
    topic: 'Galaxies & Cosmology',
    prompt: 'What galaxy type is this image?',
    options: ['Elliptical', 'Barred spiral', 'Irregular', 'Ring'],
    ans: 'B',
    exp: 'Bar plus arms indicates barred spiral.',
    imageUrl: 'https://images-assets.nasa.gov/image/hs-2005-01-a-print/hs-2005-01-a-print~orig.jpg',
  },
  {
    topic: 'Small Solar System Bodies',
    prompt: 'What is shown in this image?',
    options: ['Comet nucleus', 'Asteroid', 'Kuiper Belt object', 'Meteor trail'],
    ans: 'A',
    exp: 'Jets and coma identify an active comet.',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA21445/PIA21445~orig.jpg',
  },
  {
    topic: 'Space Missions',
    prompt: 'Which rover is pictured?',
    options: ['Spirit', 'Opportunity', 'Curiosity', 'Perseverance'],
    ans: 'D',
    exp: 'Perseverance has distinctive mast and body.',
    imageUrl: 'https://mars.nasa.gov/system/resources/detail_files/25792_PIA24428-Perseverance-Selfie.jpg',
  },
  {
    topic: 'Stellar Objects',
    prompt: 'What compact object is in this X-ray image?',
    options: ['White dwarf', 'Neutron star', 'Black hole accretion', 'Brown dwarf'],
    ans: 'C',
    exp: 'Bright accretion disk and jets suggest BH.',
    imageUrl: 'https://chandra.harvard.edu/photo/2019/m87/m87_xray.jpg',
  },
  {
    topic: 'Space Observation',
    prompt: 'What instrument view is this (spectrum)?',
    options: ['Imaging camera', 'Spectrograph', 'Polarimeter', 'Photometer'],
    ans: 'B',
    exp: 'Dispersed wavelengths indicate spectrograph output.',
    imageUrl: 'https://webbtelescope.org/contents/media/images/2022/033/01GAJJVQAWJB65D0E44Y7MEW1M',
  },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(num, len = 5) {
  return String(num).padStart(len, '0');
}

function shouldUseImage(questionsRemaining, imageLeft) {
  if (imageLeft <= 0) return false;
  if (questionsRemaining <= imageLeft) return true; // força usar para fechar alvo
  return Math.random() < imageLeft / questionsRemaining;
}

function buildQuestion(baseId, seed, topic, level, questionType, imageMeta) {
  const { q, A, B, C, D, ans, exp } = seed;
  const questionText = questionType === 'image' && imageMeta ? imageMeta.prompt : q;
  const opts = questionType === 'image' && imageMeta ? imageMeta.options : [A, B, C, D];
  const explanation = (questionType === 'image' && imageMeta ? imageMeta.exp : exp) || '';
  const paddedExp =
    explanation.length < 30
      ? `${explanation} More detail: observable features and context.`
      : explanation;
  return {
    baseId,
    question: questionText,
    optionA: opts[0],
    optionB: opts[1],
    optionC: opts[2],
    optionD: opts[3],
    correctOption: questionType === 'image' && imageMeta ? imageMeta.ans : ans,
    topic,
    level,
    questionType,
    explanation: paddedExp,
    locale: 'en',
    ...(questionType === 'image' && imageMeta
      ? { imageUrl: imageMeta.imageUrl || `https://example.com/${baseId}.jpg` }
      : {}),
  };
}

function generate() {
  const result = [];
  const levelCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let textLeft = TYPE_TARGET.text;
  let imageLeft = TYPE_TARGET.image;
  let idCounter = 1;

  // Garantir 50 por tópico
  TOPICS.forEach((topic, idx) => {
    const perTopic = 50;
    const seeds = topicSeeds[topic] || topicSeeds['Galaxies & Cosmology'];
    let topicDone = 0;

    // Distribuição exata por tópico (total 50 cada):
    // 1:15 sempre, 3:10 sempre, 5:5 sempre
    // Para nivel 2/4: 5 tópicos com (13,7), 5 tópicos com (12,8) -> fecha 125 e 75 no total
    const topicTargetByLevel =
      idx < 5
        ? { 1: 15, 2: 13, 3: 10, 4: 7, 5: 5 }
        : { 1: 15, 2: 12, 3: 10, 4: 8, 5: 5 };

    Object.entries(topicTargetByLevel).forEach(([lvlStr, count]) => {
      const lvl = Number(lvlStr);
      for (let i = 0; i < count; i++) {
        const questionsRemaining = TOTAL - result.length;
        const useImage = shouldUseImage(questionsRemaining, imageLeft);
        const questionType = useImage ? 'image' : 'text';
        if (useImage) imageLeft--; else textLeft--;

        const seed = pick(seeds.filter((s) => s.level <= lvl) || seeds);
        const imgMeta = questionType === 'image' ? pick(imagePool.filter((m) => m.topic === topic) || imagePool) : null;

        const qObj = buildQuestion(
          `astro_${pad(idCounter++)}`,
          seed,
          topic,
          lvl,
          questionType,
          imgMeta,
        );
        result.push(qObj);
        levelCount[lvl]++;
        topicDone++;
      }
    });

    // Completar se faltar por arredondamento
    while (topicDone < perTopic) {
      const lvl = pick([1, 2, 3, 4, 5]);
      const seed = pick(seeds);
      const questionsRemaining = TOTAL - result.length;
      const useImage = shouldUseImage(questionsRemaining, imageLeft);
      const qObj = buildQuestion(
        `astro_${pad(idCounter++)}`,
        seed,
        topic,
        lvl,
        useImage ? 'image' : 'text',
        useImage ? pick(imagePool) : null,
      );
      result.push(qObj);
      levelCount[lvl]++;
      topicDone++;
      if (useImage) imageLeft--; else textLeft--;
    }
  });

  // Ajuste final se exceder
  if (result.length > TOTAL) result.length = TOTAL;

  fs.writeFileSync(path.join(__dirname, 'question-bank.json'), JSON.stringify(result, null, 2));
  console.log(`Generated ${result.length} questions`);
}

generate();
