import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

const LIMIT = Number.parseInt(process.env.EAFC26_IMPORT_LIMIT ?? '20000', 10);
const OUT_PATH = path.join('public', 'playmanager', 'data', 'eafc26-all-players.json');
const EA_FC26_FEATURE = '673949514334208000';
const EA_FC26_RATINGS_URL = 'https://www.ea.com/games/ea-sports-fc/ratings?gender=0';
const TALENT_11_REFERENCE_VALUE = 66_500_000;
const TALENT_11_TARGET_VALUE = 80_000_000;

const COUNTRY_MAP = {
  "Argentina": "ar",
  "Brazil": "br",
  "France": "fr",
  "Spain": "es",
  "England": "en",
  "Germany": "de",
  "Italy": "it",
  "Netherlands": "nl",
  "Holland": "nl",
  "Portugal": "pt",
  "Belgium": "be",
  "Norway": "no",
  "Georgia": "ge",
  "Egypt": "eg",
  "Uruguay": "uy",
  "Croatia": "hr",
  "Colombia": "co",
  "Senegal": "sn",
  "Morocco": "ma",
  "Poland": "pl",
  "Denmark": "dk",
  "Sweden": "se",
  "Switzerland": "ch",
  "Austria": "at",
  "Ukraine": "ua",
  "Scotland": "gb",
  "Wales": "gb",
  "Northern Ireland": "gb",
  "Republic of Ireland": "ie",
  "Turkey": "tr",
  "Nigeria": "ng",
  "Algeria": "dz",
  "Ivory Coast": "ci",
  "Cameroon": "cm",
  "Ghana": "gh",
  "Mali": "ml",
  "Tunisia": "tn",
  "Japan": "jp",
  "Korea Republic": "kr",
  "United States": "us",
  "Mexico": "mx",
  "Canada": "ca",
  "Australia": "au",
  "New Zealand": "nz",
  "Greece": "gr",
  "Czech Republic": "cz",
  "Romania": "ro",
  "Hungary": "hu",
  "Slovakia": "sk",
  "Slovenia": "si",
  "Albania": "al",
  "Bosnia and Herzegovina": "ba",
  "Montenegro": "me",
  "North Macedonia": "mk",
  "Bulgaria": "bg",
  "Iceland": "is",
  "Finland": "fi",
  "Russia": "ru",
  "Serbia": "rs",
  "South Africa": "za",
  "Ecuador": "ec",
  "Paraguay": "py",
  "Venezuela": "ve",
  "Chile": "cl",
  "Peru": "pe",
  "Bolivia": "bo",
  "Costa Rica": "cr",
  "Honduras": "hn",
  "Panama": "pa",
  "Jamaica": "jm",
  "Iran": "ir",
  "Saudi Arabia": "sa",
  "United Arab Emirates": "ae",
  "Qatar": "qa",
  "Uzbekistan": "uz",
  "China PR": "cn",
  "Iraq": "iq",
  "Syria": "sy",
  "Jordan": "jo",
  "Armenia": "am",
  "Azerbaijan": "az",
  "Kazakhstan": "kz",
  "Cyprus": "cy",
  "Israel": "il",
  "Kosovo": "xk"
};

const LATIN_TO_GEORGIAN = {
  sh: 'შ',
  ch: 'ჩ',
  ts: 'ც',
  dz: 'ძ',
  gh: 'ღ',
  kh: 'ხ',
  j: 'ჯ',
  zh: 'ჟ',
  ph: 'ფ',
  th: 'თ',
  qu: 'კვ',
  a: 'ა',
  b: 'ბ',
  c: 'კ',
  d: 'დ',
  e: 'ე',
  f: 'ფ',
  g: 'გ',
  h: 'ჰ',
  i: 'ი',
  k: 'კ',
  l: 'ლ',
  m: 'მ',
  n: 'ნ',
  o: 'ო',
  p: 'პ',
  q: 'ქ',
  r: 'რ',
  s: 'ს',
  t: 'ტ',
  u: 'უ',
  v: 'ვ',
  w: 'ვ',
  x: 'ქს',
  y: 'ი',
  z: 'ზ',
};

const GEORGIAN_EXCEPTIONS = {
  "messi": "მესი",
  "lionel messi": "ლიონელ მესი",
  "cristiano ronaldo": "კრიშტიანუ რონალდუ",
  "ronaldo": "რონალდუ",
  "c. ronaldo": "კრიშტიანუ რონალდუ",
  "c. ronaldo dos santos aveiro": "კრიშტიანუ რონალდუ",
  "mbappe": "მბაპე",
  "kylian mbappe": "კილიან მბაპე",
  "haaland": "ჰოლანდი",
  "erling haaland": "ერლინგ ჰოლანდი",
  "bellingham": "ბელინგემი",
  "jude bellingham": "ჯუდ ბელინგემი",
  "vinicius jr.": "ვინი ჯრ.",
  "vini jr.": "ვინი ჯრ.",
  "vinicius junior": "ვინისიუს ჟუნიორი",
  "vinicius jose de oliveira junior": "ვინისიუს ჟუნიორი",
  "de bruyne": "დე ბრუინი",
  "kevin de bruyne": "კევინ დე ბრუინი",
  "kane": "კეინი",
  "harry kane": "ჰარი კეინი",
  "odegaard": "ოდეგორი",
  "martin odegaard": "მარტინ ოდეგორი",
  "donnarumma": "დონარუმა",
  "gianluigi donnarumma": "ჯანლუიჯი დონარუმა",
  "alisson": "ალისონი",
  "alisson ramses becker": "ალისონი",
  "ruben dias": "რუბენ დიაში",
  "ruben santos gato alves dias": "რუბენ დიაში",
  "ederson": "ედერსონი",
  "ederson santana de moraes": "ედერსონი",
  "bernardo silva": "ბერნარდო სილვა",
  "bernardo mota carvalho e silva": "ბერნარდო სილვა",
  "neymar jr": "ნეიმარ ჯრ.",
  "neymar da silva santos jr.": "ნეიმარი",
  "bruno fernandes": "ბრუნო ფერნანდესი",
  "bruno miguel borges fernandes": "ბრუნო ფერნანდესი",
  "marquinhos": "მარკინიოსი",
  "marcos aoas correa": "მარკინიოსი",
  "gabriel": "გაბრიელი",
  "gabriel dos s. magalhaes": "გაბრიელ მაგალიაესი",
  "rodrygo": "როდრიგო",
  "rodrygo silva de goes": "როდრიგო სილვა დე გოესი",
  "joao cancelo": "ჟოაუ კანსელუ",
  "joao pedro cavaco cancelo": "ჟოაუ კანსელუ",
  "rafael leao": "რაფაელ ლეაუ",
  "rafael da conceicao leao": "რაფაელ ლეაუ",
  "grimaldo": "გრიმალდო",
  "alejandro grimaldo garcia": "ალეხანდრო გრიმალდო",
  "carvajal": "კარვახალი",
  "daniel carvajal ramos": "დანიელ კარვახალი",
  "pedri": "პედრი",
  "pedro gonzalez lopez": "პედრი",
  "bremer": "ბრემერი",
  "gleison bremer silva nascimento": "ბრემერი",
  "unai simon": "უნაი სიმონი",
  "unai simon mendibil": "უნაი სიმონი",
  "eder militao": "ედერ მილიტაუ",
  "eder gabriel militao": "ედერ მილიტაუ",
  "bruno guimaraes": "ბრუნო გიმარაესი",
  "bruno guimaraes moura": "ბრუნო გიმარაესი",
  "vitinha": "ვიტინია",
  "vitor machado ferreira": "ვიტინია",
  "mikel merino": "მიკელ მერინო",
  "mikel merino zazon": "მიკელ მერინო",
  "palhinha": "პალინია",
  "joao maria palhinha goncalves": "ჟოაუ პალინია",
  "diogo jota": "დიოგუ ჟოტა",
  "diogo jose teixeira da silva": "დიოგუ ჟოტა",
  "nico williams": "ნიკო უილიამსი",
  "nicholas williams arthuer": "ნიკო უილიამსი",
  "iago aspas": "იაგო ასპასი",
  "iago aspas juncal": "იაგო ასპასი",
  "gavi": "გავი",
  "pablo martin paez gavira": "გავი",
  "lewandowski": "ლევანდოვსკი",
  "robert lewandowski": "რობერტ ლევანდოვსკი",
  "salah": "სალაჰი",
  "mohamed salah": "მოჰამედ სალაჰი",
  "kvaratskhelia": "კვარაცხელია",
  "khvicha kvaratskhelia": "ხვიჩა კვარაცხელია",
  "mamardashvili": "მამარდაშვილი",
  "giorgi mamardashvili": "გიორგი მამარდაშვილი",
  "mikautadze": "მიქაუტაძე",
  "georges mikautadze": "ჟორჟ მიქაუტაძე",
  "kiteishvili": "კიტეიშვილი",
  "otar kiteishvili": "ოთარ კიტეიშვილი",
  "davitashvili": "დავითაშვილი",
  "zuriko davitashvili": "ზურიკო დავითაშვილი",
  "chakvetadze": "ჩაკვეტაძე",
  "giorgi chakvetadze": "გიორგი ჩაკვეტაძე",
  "lobzhanidze": "ლობჟანიძე",
  "saba lobzhanidze": "საბა ლობჟანიძე",
  "zivzivadze": "ზივზივაძე",
  "budu zivzivadze": "ბუდუ ზივზივაძე",
  "kashia": "კაშია",
  "guram kashia": "გურამ კაშია",
  "kakabadze": "კაკაბაძე",
  "otar kakabadze": "ოთარ კაკაბაძე",
  "dvali": "დვალი",
  "lasha dvali": "ლაშა დვალი",
  "gvelesiani": "გველესიანი",
  "giorgi gvelesiani": "გიორგი გველესიანი",
  "kochorashvili": "ქოჩორაშვილი",
  "giorgi kochorashvili": "გიორგი ქოჩორაშვილი",
  "lochoshvili": "ლოჩოშვილი",
  "luka lochoshvili": "ლუკა ლოჩოშვილი",
  "altunashvili": "ალთუნაშვილი",
  "sandro altunashvili": "სანდრო ალთუნაშვილი",
  "mekvabishvili": "მექვაბიშვილი",
  "anzor mekvabishvili": "ანზორ მექვაბიშვილი",
  "sigua": "სიგუა",
  "gabriel sigua": "გაბრიელ სიგუა",
  "kvekveskiri": "კვეკვესკირი",
  "nika kvekveskiri": "ნიკა კვეკვესკირი",
  "shengelia": "შენგელია",
  "levan shengelia": "ლევან შენგელია",
  "loria": "ლორია",
  "giorgi loria": "გიორგი ლორია",
  "tsitaishvili": "წიტაიშვილი",
  "giorgi tsitaishvili": "გიორგი წიტაიშვილი",
  "gocholeishvili": "გოჩოლეიშვილი",
  "giorgi gocholeishvili": "გიორგი გოჩოლეიშვილი",
  "sazonov": "საზონოვი",
  "saba sazonov": "საბა საზონოვი",
  "azarovi": "აზაროვი",
  "irakli azarovi": "ირაკლი აზაროვი",
  "volkovi": "ვოლკოვი",
  "davyt volkovi": "დავით ვოლკოვი",
  "kvilitaia": "ქვილითაია",
  "giorgi kvilitaia": "გიორგი ქვილითაია",
  "rodrigo hernandez cascante": "როდრიგო ერნანდეს კასკანტე",
  "rodrigo hernandez": "როდრიგო ერნანდესი",
  "rodri": "როდრი",
  "lamine yamal": "ლამინ იამალი",
  "ilkay gundogan": "ილქაი გიუნდოგანი",
  "manuel neuer": "მანუელ ნოიერი",
  "thomas muller": "თომას მიულერი",
  "leroy sane": "ლეროი სანე",
  "joshua kimmich": "ჯოშუა კიმიხი",
  "alphonso davies": "ალფონსო დეივისი",
  "jamal musiala": "ჯამალ მუსიალა",
  "florian wirtz": "ფლორიან ვირცი",
  "granit xhaka": "გრანიტ ჯაკა",
  "jeremie frimpong": "ჯერემი ფრიმპონგი",
  "alejandro grimaldo": "ალეხანდრო გრიმალდო",
  "luka modric": "ლუკა მოდრიჩი",
  "marcelo": "მარსელო"
};

function cleanLatinName(name) {
  if (!name) return '';
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function transliterateLatinToGeorgian(value) {
  if (!value) return '';
  let normalized = value
    .trim()
    .replace(/ue/gi, 'iu')
    .replace(/oe/gi, 'io')
    .replace(/ae/gi, 'ae')
    .replace(/ü/gi, 'iu')
    .replace(/ö/gi, 'io')
    .replace(/ä/gi, 'ae')
    .replace(/ß/gi, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  normalized = normalized.replace(/ck/g, 'k');
  normalized = normalized.replace(/c(?=[iey])/g, 's');

  let out = '';
  for (let i = 0; i < normalized.length; i += 1) {
    const two = normalized.slice(i, i + 2);
    const three = normalized.slice(i, i + 3);

    if (three === 'sch') {
      out += 'შ';
      i += 2;
      continue;
    }

    if (LATIN_TO_GEORGIAN[two]) {
      out += LATIN_TO_GEORGIAN[two];
      i += 1;
      continue;
    }

    const ch = normalized[i];
    if (LATIN_TO_GEORGIAN[ch]) {
      out += LATIN_TO_GEORGIAN[ch];
      continue;
    }

    if (ch === '-' || ch === '\'' || ch === '’') {
      out += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      out += ' ';
    }
  }

  return out
    .replace(/([აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function transliterateWord(word) {
  if (!word) return '';
  const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, "");
  const lower = cleanWord.toLowerCase();
  
  if (GEORGIAN_EXCEPTIONS[lower]) {
    return GEORGIAN_EXCEPTIONS[lower];
  }
  
  if (lower === 'jr') return 'ჯრ';
  if (lower === 'sr') return 'სრ';
  if (lower === 'de') return 'დე';
  if (lower === 'di') return 'დი';
  if (lower === 'da') return 'და';
  if (lower === 'do') return 'დო';
  if (lower === 'du') return 'დუ';
  if (lower === 'del') return 'დელ';
  if (lower === 'van') return 'ვან';
  if (lower === 'von') return 'ფონ';
  if (lower === 'al') return 'ალ';
  if (lower === 'el') return 'ელ';
  if (lower === 'la') return 'ლა';
  
  let finalWord = cleanWord;
  if (lower.endsWith('ic')) {
    finalWord = cleanWord.slice(0, -2) + 'ich';
  } else if (lower.endsWith('ici')) {
    finalWord = cleanWord.slice(0, -3) + 'ichi';
  }

  const transliterated = transliterateLatinToGeorgian(finalWord);
  if (!transliterated) return word;

  const endsWithConsonant = /[bcdfghjklmnpqrstvwxyz]$/i.test(finalWord);
  const alreadyEndsInVowel = /[აეიოუი]$/.test(transliterated);
  
  return endsWithConsonant && !alreadyEndsInVowel ? `${transliterated}ი` : transliterated;
}

function transliterateFullName(fullName) {
  if (!fullName) return '';
  const cleanName = cleanLatinName(fullName);
  const lowerFull = cleanName.toLowerCase();
  if (GEORGIAN_EXCEPTIONS[lowerFull]) {
    return GEORGIAN_EXCEPTIONS[lowerFull];
  }
  const words = cleanName.split(/\s+/).filter(Boolean);
  return words.map(w => transliterateWord(w)).join(' ');
}

function talentFromOverall(overall) {
  if (overall >= 88) return 10;
  if (overall >= 84) return 9;
  if (overall >= 80) return 8;
  if (overall >= 76) return 7;
  if (overall >= 72) return 6;
  if (overall >= 68) return 5;
  if (overall >= 64) return 4;
  if (overall >= 60) return 3;
  if (overall >= 56) return 2;
  return 1;
}

function applyRealPlayerTalentRule(age, overall, talent) {
  if (age < 20 && overall >= 80) return 11;
  if (age <= 20 && overall <= 79) {
    const bonus = overall >= 70 ? 3 : overall >= 60 ? 2 : 1;
    return Math.min(11, talent + bonus);
  }
  return talent;
}

function baseValueGel(overall) {
  const minOvr = 40;
  const topOvr = 91;
  const minValue = 100_000;
  const topValue = 100_000_000;
  const safeOvr = Math.min(topOvr, Math.max(minOvr, Math.trunc(overall)));
  const progress = (safeOvr - minOvr) / (topOvr - minOvr);
  const value = minValue + (topValue - minValue) * Math.pow(progress, 5);
  return Math.round(value / 50_000) * 50_000;
}

function applyTalent11ValueRule(value, talent) {
  if (talent < 11) return value;
  return Math.round((value * (TALENT_11_TARGET_VALUE / TALENT_11_REFERENCE_VALUE)) / 50_000) * 50_000;
}

function ageFromBirthdate(birthdate) {
  if (!birthdate) return 18;
  const parsed = new Date(birthdate);
  if (Number.isNaN(parsed.getTime())) return 18;

  const now = new Date();
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - parsed.getUTCMonth();
  const dayDiff = now.getUTCDate() - parsed.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return Math.max(15, age);
}

async function writeDataset(players) {
  const content = `${JSON.stringify(players, null, 2)}\n`;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await fs.writeFile(OUT_PATH, content, 'utf8');
      return;
    } catch (error) {
      if (attempt === 6) throw error;
      console.warn(`Dataset file is busy; retrying (${attempt}/6)...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('Missing DATABASE_URL in .env.local');
  }

  console.log("Fetching players from EA Sports FC ratings API...");
  const players = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  const usedNormalizedNames = new Set();

  while (hasMore && players.length < LIMIT) {
    const url = `https://drop-api.ea.com/rating/ea-sports-fc?locale=en&gender=0&limit=${limit}&offset=${offset}`;
    console.log(`Fetching offset: ${offset}...`);
    try {
      // EA serves the current FC 26 ratings only when this feature context matches
      // the official ratings page. Without it, the endpoint falls back to old data.
      const res = await fetch(url, {
        headers: {
          'drop-referrer': EA_FC26_RATINGS_URL,
          'x-feature': EA_FC26_FEATURE,
        },
      });
      if (!res.ok) {
        throw new Error(`EA API returned status ${res.status}`);
      }
      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const item of data.items) {
        const englishFullName = item.firstName + ' ' + item.lastName;
        let normalizedName = normalizeName(englishFullName);
        if (usedNormalizedNames.has(normalizedName)) {
          normalizedName = `${normalizedName}_${item.id}`;
        }
        usedNormalizedNames.add(normalizedName);

        const displayName = transliterateFullName(englishFullName);
        const cardDisplayName = transliterateFullName(item.commonName || item.lastName);

        const overall = item.overallRating;
        const age = ageFromBirthdate(item.birthdate);
        const talent = applyRealPlayerTalentRule(age, overall, talentFromOverall(overall));
        const value = applyTalent11ValueRule(baseValueGel(overall), talent);

        // Resolve nationality code
        const nationalityName = item.nationality?.label;
        const nationalityCode = COUNTRY_MAP[nationalityName] || nationalityName?.slice(0, 2).toLowerCase() || 'ge';

        // Parse detailed stats
        let stats = {};
        const posLabel = item.position?.shortLabel || 'CM';
        if (posLabel === 'GK') {
          stats = {
            DIV: item.stats?.gkDiving?.value || 40,
            HAN: item.stats?.gkHandling?.value || 40,
            KIC: item.stats?.gkKicking?.value || 40,
            REF: item.stats?.gkReflexes?.value || 40,
            SPD: item.stats?.def?.value || 40, // GK Speed
            POS: item.stats?.gkPositioning?.value || 40,
          };
        } else {
          stats = {
            PAC: item.stats?.pac?.value || 40,
            SHO: item.stats?.sho?.value || 40,
            PAS: item.stats?.pas?.value || 40,
            DRI: item.stats?.dri?.value || 40,
            DEF: item.stats?.def?.value || 40,
            PHY: item.stats?.phy?.value || 40,
          };
        }

        players.push({
          source_id: String(item.id),
          normalized_name: normalizedName,
          display_name: displayName,
          card_display_name: cardDisplayName,
          position: posLabel,
          age,
          overall,
          potential: overall,
          talent,
          value,
          player_face_url: item.avatarUrl || null,
          nationality_code: nationalityCode,
          stats,
        });
      }
      
      offset += data.items.length;
      
      // limit safety
      if (players.length >= LIMIT) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      console.error(`Error fetching offset ${offset}:`, err);
      console.log("Retrying in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`Fetched ${players.length} players from EA API.`);

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeDataset(players);
  console.log(`Wrote JSON file to ${OUT_PATH}`);

  const sql = postgres(dbUrl);

  const rows = players.map((player) => ({
    normalized_name: player.normalized_name,
    display_name: player.display_name,
    card_display_name: player.card_display_name,
    is_real: true,
    card_image_url: player.player_face_url || null,
    talent: player.talent,
    ea_fc_ovr: player.overall,
    ovr_source: 'ea_fc',
    ovr_base: player.overall,
    ovr_current: player.overall,
    base_transfer_value_gel: player.value,
    current_transfer_value_gel: player.value,
    real_age: player.age,
    age: player.age,
    fatigue: 0,
    morale: 70,
    injury_matches: 0,
    status: 'active',
    owner_id: null,
    nationality_code: player.nationality_code,
    card_stats: player.stats,
    base_card_stats: player.stats,
    primary_position: player.position
  }));

  console.log(`Seeding database with ${rows.length} players using postgres direct client bulk upsert...`);
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const names = chunk.map((row) => row.normalized_name);
    
    const existing = await sql`
      select normalized_name, card_image_url
      from pm_players
      where normalized_name in (${names})
    `;
    const existingByName = new Map((existing ?? []).map((row) => [row.normalized_name, row]));
    
    const upsertRows = chunk.map((row) => {
      const ext = existingByName.get(row.normalized_name);
      return {
        normalized_name: row.normalized_name,
        display_name: row.display_name,
        card_display_name: row.card_display_name,
        is_real: true,
        card_image_url: ext?.card_image_url || row.card_image_url || null,
        talent: row.talent,
        ea_fc_ovr: row.ea_fc_ovr,
        ovr_source: row.ovr_source,
        ovr_base: row.ovr_base,
        ovr_current: row.ovr_current,
        base_transfer_value_gel: row.base_transfer_value_gel,
        current_transfer_value_gel: row.current_transfer_value_gel,
        real_age: row.real_age,
        age: row.age,
        fatigue: 0,
        morale: 70,
        injury_matches: 0,
        status: 'active',
        owner_id: null,
        nationality_code: row.nationality_code,
        card_stats: JSON.stringify(row.card_stats),
        base_card_stats: JSON.stringify(row.base_card_stats),
        primary_position: row.primary_position
      };
    });

    await sql`
      insert into pm_players ${ sql(upsertRows) }
      on conflict (normalized_name) where is_real = true
      do update set
        display_name = excluded.display_name,
        card_display_name = excluded.card_display_name,
        card_image_url = excluded.card_image_url,
        talent = excluded.talent,
        age = excluded.age,
        ea_fc_ovr = excluded.ea_fc_ovr,
        ovr_base = excluded.ovr_base,
        ovr_current = excluded.ovr_current,
        base_transfer_value_gel = excluded.base_transfer_value_gel,
        current_transfer_value_gel = excluded.current_transfer_value_gel,
        real_age = excluded.real_age,
        nationality_code = excluded.nationality_code,
        card_stats = excluded.card_stats,
        base_card_stats = excluded.base_card_stats,
        primary_position = excluded.primary_position
    `;
    
    console.log(`Upserted chunk ${i} to ${i + upsertRows.length}`);
  }

  await sql.end();

  console.log(`Seeded ${rows.length} EAFC26 players into pm_players table successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
